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
    
    Tracker.logEvent('email_submitted', { 
      event_name: selectedCardEvent,
      email: email // Note: in production, be mindful of PII logging
    });

    // Simulate success
    const btn = emailForm.querySelector('.submit-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Success!';
    btn.style.backgroundColor = '#10b981'; // Green

    setTimeout(() => {
      modal.classList.add('hidden');
      // Reset form
      emailForm.reset();
      btn.textContent = originalText;
      btn.style.backgroundColor = '';
      selectedCardEvent = null;
    }, 2000);
  });
});
