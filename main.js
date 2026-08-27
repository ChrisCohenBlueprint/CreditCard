// ============================================================
// GOLD SPARKLE PARTICLE SYSTEM
// ============================================================
(function() {
  const canvas = document.getElementById('sparkle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const GOLD_COLORS = ['#ffd700', '#f5c542', '#d4af37', '#ffe066', '#ffc200', '#fff0a0'];
  const PARTICLE_COUNT = 80;
  let particles = [];
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function randomBetween(a, b) { return a + Math.random() * (b - a); }

  function createParticle() {
    const size = randomBetween(1, 4);
    return {
      x: randomBetween(0, W),
      y: randomBetween(0, H),
      size,
      baseSize: size,
      color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
      alpha: randomBetween(0.1, 0.8),
      speedX: randomBetween(-0.3, 0.3),
      speedY: randomBetween(-0.5, -0.1), // drift upward slowly
      twinkleSpeed: randomBetween(0.005, 0.02),
      twinklePhase: randomBetween(0, Math.PI * 2),
      // Some particles are 4-pointed star shapes
      isStar: Math.random() > 0.5,
    };
  }

  function drawStar(ctx, x, y, size, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 3;
    ctx.beginPath();
    // 4-pointed star
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const outerX = x + Math.cos(angle) * size * 2;
      const outerY = y + Math.sin(angle) * size * 2;
      const innerAngle = angle + Math.PI / 4;
      const innerX = x + Math.cos(innerAngle) * size * 0.5;
      const innerY = y + Math.sin(innerAngle) * size * 0.5;
      if (i === 0) ctx.moveTo(outerX, outerY);
      else ctx.lineTo(outerX, outerY);
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawDot(ctx, x, y, size, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 4;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(createParticle());
  }

  let animFrame;
  function animate() {
    ctx.clearRect(0, 0, W, H);
    const now = Date.now() * 0.001;

    particles.forEach(p => {
      // Twinkle
      const twinkle = 0.5 + 0.5 * Math.sin(now / p.twinkleSpeed + p.twinklePhase);
      const currentAlpha = p.alpha * twinkle;
      const currentSize = p.baseSize * (0.7 + 0.3 * twinkle);

      if (p.isStar) {
        drawStar(ctx, p.x, p.y, currentSize, currentAlpha, p.color);
      } else {
        drawDot(ctx, p.x, p.y, currentSize, currentAlpha, p.color);
      }

      // Move
      p.x += p.speedX;
      p.y += p.speedY;

      // Wrap around edges
      if (p.y < -10) p.y = H + 10;
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
    });

    animFrame = requestAnimationFrame(animate);
  }
  animate();
})();

// Simple Tracker Stub
const Tracker = {
  logEvent: (eventName, data = {}) => {
    console.log(`[TRACKING] Event: ${eventName}`, data);
    // In a real scenario, this would post to an analytics API
    // fetch('https://analytics-api.example.com/track', { ... })
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const app = document.getElementById('app');
  const mainCard = document.getElementById('main-card');
  const eventCards = document.querySelectorAll('.event-card');
  const modal = document.getElementById('email-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const emailForm = document.getElementById('email-form');
  const emailInput = document.getElementById('email-input');
  const modalEventName = document.getElementById('modal-event-name');
  const successBadge = document.getElementById('success-badge');
  
  // State
  let selectedCardEvent = null;

  // Parallax 3D Hover Effect
  const cardGlare = document.querySelector('.card-glare');
  mainCard.addEventListener('mousemove', (e) => {
    if (app.classList.contains('state-flipped')) return; // Disable hover tilt after flip
    
    const rect = mainCard.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element.
    const y = e.clientY - rect.top;  // y position within the element.
    
    // Calculate rotation limits (max 15 degrees)
    const xPct = (x / rect.width) - 0.5;
    const yPct = (y / rect.height) - 0.5;
    
    const rotateY = xPct * 30; // Max 15deg left/right
    const rotateX = -yPct * 30; // Max 15deg up/down
    
    mainCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    
    // Move glare
    if (cardGlare) {
      cardGlare.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.4) 0%, transparent 60%)`;
    }
  });

  mainCard.addEventListener('mouseleave', () => {
    if (app.classList.contains('state-flipped')) return;
    mainCard.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    if (cardGlare) {
      cardGlare.style.background = `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 0%, transparent 60%)`;
    }
  });

  // Track initial page load
  Tracker.logEvent('page_view', { path: '/' });

  // Handle Main Card Tap
  mainCard.addEventListener('click', () => {
    // Only process if it hasn't been flipped/shrunk yet
    if (!app.classList.contains('state-flipped')) {
      Tracker.logEvent('card_tapped');
      
      // Step 1: Flip
      app.classList.add('state-flipped');
      
      // Step 2: Shrink and reveal events after a short delay
      setTimeout(() => {
        app.classList.add('state-shrunk');
        Tracker.logEvent('card_shrunk_and_events_revealed');
      }, 1000); // Wait 1 second for flip to complete
    }
  });

  // Handle Event Card Click
  eventCards.forEach(card => {
    card.addEventListener('click', (e) => {
      selectedCardEvent = e.currentTarget.getAttribute('data-event');
      Tracker.logEvent('event_selected', { event_name: selectedCardEvent });
      
      // Update modal title dynamically with the event name
      if (modalEventName) {
        modalEventName.textContent = `Lubricant Expo ${selectedCardEvent}`;
      }

      // Show Modal
      modal.classList.remove('hidden');
    });
  });

  // Handle Modal Close
  closeModalBtn.addEventListener('click', () => {
    Tracker.logEvent('modal_closed');
    modal.classList.add('hidden');
    selectedCardEvent = null;
  });

  // Handle Email Submission
  emailForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const btn = emailForm.querySelector('.submit-btn');
    const btnText = btn.querySelector('.btn-text');
    
    // 1. Loading State
    btn.classList.add('loading');
    
    // Simulate network request
    setTimeout(() => {
      Tracker.logEvent('email_submitted', { 
        event_name: selectedCardEvent,
        email: email 
      });

      // 2. Success State & Confetti
      btn.classList.remove('loading');
      const originalText = btnText.textContent;
      btnText.textContent = 'Success!';
      btn.style.background = '#10b981'; // Green
      
      // Fire confetti burst
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#689ABB', '#700907', '#ffffff']
        });
      }

      // Show persistent success badge
      if (successBadge) {
        successBadge.classList.remove('hidden');
        setTimeout(() => successBadge.classList.add('hidden'), 6000);
      }

      // Reset after delay
      setTimeout(() => {
        modal.classList.add('hidden');
        emailForm.reset();
        btnText.textContent = originalText;
        btn.style.background = '';
        selectedCardEvent = null;
      }, 2000);
      
    }, 1500); // 1.5 seconds loading simulation
  });
});
