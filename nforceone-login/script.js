// Ambient Light Movement
const ambientLight = document.getElementById('ambientLight');

document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    
    // Slow follow effect
    ambientLight.style.setProperty('--x', `${x}%`);
    ambientLight.style.setProperty('--y', `${y}%`);
});

// Calm Particles Generation
const particlesContainer = document.getElementById('particles');
const particleCount = 15; // Low density for calm feel

for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    const size = Math.random() * 100 + 50; // Larger blurred blobs
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    particle.style.top = `${Math.random() * 100}vh`;
    particle.style.left = `${Math.random() * 100}vw`;
    
    const duration = Math.random() * 20 + 15;
    const delay = Math.random() * 20;
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `-${delay}s`;
    
    particlesContainer.appendChild(particle);
}

// Form Interaction
const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const btn = e.target.querySelector('.btn-submit');
    const originalContent = btn.innerHTML;
    
    btn.style.opacity = '0.6';
    btn.innerHTML = '<span>Verifying...</span>';
    
    setTimeout(() => {
        btn.innerHTML = '<span>Access Granted</span>';
        btn.style.background = 'linear-gradient(135deg, rgba(0, 100, 0, 0.6), rgba(0, 200, 0, 0.4))';
        btn.style.boxShadow = '0 15px 30px rgba(0, 255, 0, 0.1)';
        
        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.style.opacity = '1';
            btn.style.background = '';
            btn.style.boxShadow = '';
            alert('Welcome to NFORCEONE.');
        }, 1500);
    }, 2000);
});
