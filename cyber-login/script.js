// Initialize Lucide Icons
lucide.createIcons();

// Create floating particles
const particlesContainer = document.getElementById('particles');
const particleCount = 30;

for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random size
    const size = Math.random() * 4 + 1;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Random position
    particle.style.left = `${Math.random() * 100}vw`;
    
    // Random animation duration and delay
    const duration = Math.random() * 15 + 10;
    const delay = Math.random() * 20;
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `-${delay}s`;
    
    // Random opacity
    particle.style.opacity = Math.random() * 0.4 + 0.1;
    
    particlesContainer.appendChild(particle);
}

// Form Submission handling
const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const btn = e.target.querySelector('.login-btn');
    const originalText = btn.innerText;
    
    // Subtle loading effect
    btn.innerText = 'AUTHENTICATING...';
    btn.style.opacity = '0.7';
    btn.style.pointerEvents = 'none';
    
    setTimeout(() => {
        // Here you would normally redirect or handle logic
        console.log('Login attempt intercepted.');
        btn.innerText = 'ACCESS GRANTED';
        btn.style.background = 'linear-gradient(135deg, #008b00, #00ff00)';
        btn.style.boxShadow = '0 0 25px rgba(0, 255, 0, 0.6)';
        
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'all';
            btn.style.background = '';
            btn.style.boxShadow = '';
            alert('Welcome, Agent.');
        }, 1000);
    }, 1500);
});

// Input focus sound effect simulation (visual only)
const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('focus', () => {
        // We could add a subtle UI sound here if requested
    });
});
