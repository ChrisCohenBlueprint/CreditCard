const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const { createApp, ensureIndexes } = require('../server');

let mongod, client, db, server, base;

before(async () => {
  mongod = await MongoMemoryServer.create();
  client = await MongoClient.connect(mongod.getUri());
  db = client.db('test');
  await ensureIndexes(db);
  server = createApp(db).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await client.close();
  await mongod.stop();
});

const post = (path, body) => fetch(base + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

test('records a known click event', async () => {
  const res = await post('/api/track', { type: 'event_selected', event_name: 'Europe', session_id: 's1', path: '/' });
  assert.equal(res.status, 204);
  const doc = await db.collection('events').findOne({ session_id: 's1' });
  assert.equal(doc.type, 'event_selected');
  assert.equal(doc.event_name, 'Europe');
  assert.ok(doc.created_at instanceof Date);
});

test('rejects unknown click event types', async () => {
  const res = await post('/api/track', { type: 'drop_table', session_id: 's2' });
  assert.equal(res.status, 400);
  assert.equal(await db.collection('events').countDocuments({ session_id: 's2' }), 0);
});

test('saves a claim, normalising the email', async () => {
  const res = await post('/api/claim', { email: '  Jane@Example.com ', event_name: 'Middle East', consent: true, session_id: 's3' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, duplicate: false });
  const doc = await db.collection('claims').findOne({ email: 'jane@example.com' });
  assert.equal(doc.event_name, 'Middle East');
  assert.equal(doc.consent, true);
});

test('a repeat claim for the same show is a success, not a second record', async () => {
  const res = await post('/api/claim', { email: 'jane@example.com', event_name: 'Middle East', consent: true });
  assert.deepEqual(await res.json(), { ok: true, duplicate: true });
  assert.equal(await db.collection('claims').countDocuments({ email: 'jane@example.com', event_name: 'Middle East' }), 1);
});

test('the same email can claim a different show', async () => {
  const res = await post('/api/claim', { email: 'jane@example.com', event_name: 'Europe', consent: true });
  assert.deepEqual(await res.json(), { ok: true, duplicate: false });
});

test('claims are rejected without consent, a valid email or a real show', async () => {
  for (const body of [
    { email: 'a@b.com', event_name: 'Europe', consent: false },
    { email: 'not-an-email', event_name: 'Europe', consent: true },
    { email: 'a@b.com', event_name: 'Mars', consent: true },
  ]) {
    const res = await post('/api/claim', body);
    assert.equal(res.status, 400);
    assert.equal((await res.json()).ok, false);
  }
  assert.equal(await db.collection('claims').countDocuments({ email: 'a@b.com' }), 0);
});

test('serves the page but not the server source or package files', async () => {
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await fetch(base + '/assets/logo-europe.png')).status, 200);
  for (const path of ['/server.js', '/package.json', '/.env', '/.git/config']) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
});
