// Serves the landing page and records clicks + offer claims in MongoDB.
//
// Env:
//   MONGODB_URI  – Atlas connection string (required)
//   MONGODB_DB   – database name (default "creditcard")
//   PORT         – set by Render

const path = require('path');
const express = require('express');
const { MongoClient } = require('mongodb');

const SHOWS = ['Middle East', 'North America', 'Europe'];

// Click events the page is allowed to send. Anything else is dropped so the
// collection can't be filled with arbitrary junk from a public endpoint.
const EVENT_TYPES = new Set([
  'page_view',
  'card_tapped',
  'card_shrunk_and_events_revealed',
  'event_selected',
  'visit_website_clicked',
  'modal_closed',
  'email_submitted',
]);

// Deliberately loose: the browser's type="email" check already ran, this just
// stops obvious garbage. Real verification is the discount email itself.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '4kb' }));

  const events = db.collection('events');
  const claims = db.collection('claims');

  app.post('/api/track', async (req, res) => {
    const { type, event_name, session_id, path: pagePath } = req.body || {};
    if (!EVENT_TYPES.has(type)) return res.status(400).json({ ok: false, error: 'unknown event type' });

    await events.insertOne({
      type,
      event_name: SHOWS.includes(event_name) ? event_name : undefined,
      session_id: str(session_id, 64),
      path: str(pagePath, 200),
      referrer: str(req.get('referer'), 500),
      user_agent: str(req.get('user-agent'), 300),
      created_at: new Date(),
    });
    res.status(204).end();
  });

  app.post('/api/claim', async (req, res) => {
    const { email, event_name, consent, session_id } = req.body || {};
    const cleanEmail = str(email, 254)?.toLowerCase();

    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }
    if (!SHOWS.includes(event_name)) {
      return res.status(400).json({ ok: false, error: 'Please choose a show.' });
    }
    if (consent !== true) {
      return res.status(400).json({ ok: false, error: 'Please tick the box to agree to be contacted.' });
    }

    // One claim per email per show. A repeat is still a success for the
    // visitor — they already have the offer — so don't surface it as an error.
    const now = new Date();
    const result = await claims.updateOne(
      { email: cleanEmail, event_name },
      {
        $setOnInsert: { email: cleanEmail, event_name, created_at: now },
        $set: { consent: true, consent_at: now, session_id: str(session_id, 64), last_seen_at: now },
      },
      { upsert: true }
    );
    res.json({ ok: true, duplicate: result.upsertedCount === 0 });
  });

  // Lets Render (and us) confirm the server can actually reach MongoDB.
  app.get('/api/health', async (req, res) => {
    try {
      await db.command({ ping: 1 });
      res.json({ ok: true, db: db.databaseName });
    } catch (err) {
      console.error('Health check failed:', err.message);
      res.status(503).json({ ok: false, error: 'database unreachable' });
    }
  });

  // Unknown API routes get JSON, not the landing page.
  app.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'not found' }));

  // Only the public files — never server.js, package.json, .env or .git.
  const root = __dirname;
  app.use('/assets', express.static(path.join(root, 'assets')));
  app.use('/public', express.static(path.join(root, 'public')));
  for (const file of ['index.html', 'style.css', 'main.js']) {
    app.get(`/${file}`, (req, res) => res.sendFile(path.join(root, file)));
  }
  app.get('/', (req, res) => res.sendFile(path.join(root, 'index.html')));

  app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);
    res.status(err.type === 'entity.parse.failed' ? 400 : 500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  });

  return app;
}

async function ensureIndexes(db) {
  await db.collection('claims').createIndex({ email: 1, event_name: 1 }, { unique: true });
  await db.collection('claims').createIndex({ created_at: -1 });
  await db.collection('events').createIndex({ type: 1, created_at: -1 });
  await db.collection('events').createIndex({ session_id: 1 });
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }
  // Fail fast with a clear message rather than hanging for 30s on the
  // usual culprits: Atlas Network Access not allowing Render, or a bad password.
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
  } catch (err) {
    console.error('Could not connect to MongoDB. Check the password in MONGODB_URI and that Atlas Network Access allows 0.0.0.0/0.');
    console.error(err.message);
    process.exit(1);
  }
  const db = client.db(process.env.MONGODB_DB || 'creditcard');
  await ensureIndexes(db);

  const port = process.env.PORT || 3000;
  createApp(db).listen(port, () => console.log(`Listening on ${port}`));
}

if (require.main === module) main();

module.exports = { createApp, ensureIndexes };
