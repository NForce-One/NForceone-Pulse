const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let mouseX = 0;
let mouseY = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX / canvas.width;
  mouseY = e.clientY / canvas.height;
});

class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 3 + 1;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.speedY = (Math.random() - 0.5) * 0.3;
    this.opacity = Math.random() * 0.5 + 0.1;
    this.pulse = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.01 + Math.random() * 0.02;
    this.color = Math.random() > 0.7 ? '255, 26, 26' : '255, 255, 255';
    this.life = 0;
    this.maxLife = Math.random() * 600 + 400;
  }

  update() {
    this.pulse += this.pulseSpeed;
    this.x += this.speedX + Math.sin(this.pulse * 0.5) * 0.1;
    this.y += this.speedY + Math.cos(this.pulse * 0.3) * 0.1;
    this.life++;

    if (this.x < 0 || this.x > canvas.width ||
        this.y < 0 || this.y > canvas.height ||
        this.life > this.maxLife) {
      this.reset();
      this.life = 0;
    }
  }

  draw() {
    const pulseOpacity = 0.5 + 0.5 * Math.sin(this.pulse);
    const currentOpacity = this.opacity * pulseOpacity;
    const glowSize = this.size * 4;

    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
    grad.addColorStop(0, `rgba(${this.color}, ${currentOpacity * 0.8})`);
    grad.addColorStop(0.3, `rgba(${this.color}, ${currentOpacity * 0.2})`);
    grad.addColorStop(1, `rgba(${this.color}, 0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.color}, ${currentOpacity * 0.9})`;
    ctx.fill();
  }
}

for (let i = 0; i < 120; i++) {
  particles.push(new Particle());
}

const connectionDistance = 120;

function drawConnections() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < connectionDistance) {
        const opacity = (1 - dist / connectionDistance) * 0.12;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(255, 26, 26, ${opacity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => p.update());
  particles.forEach(p => p.draw());
  drawConnections();

  const gradX = mouseX * canvas.width;
  const gradY = mouseY * canvas.height;
  const glowGrad = ctx.createRadialGradient(gradX, gradY, 0, gradX, gradY, 400);
  glowGrad.addColorStop(0, 'rgba(255, 26, 26, 0.015)');
  glowGrad.addColorStop(1, 'rgba(255, 26, 26, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  requestAnimationFrame(animate);
}

animate();

// Tilt effect on login card
const card = document.querySelector('.login-card');
const container = document.querySelector('.main-container');

container.addEventListener('mousemove', (e) => {
  const rect = container.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  const rotateX = ((y - centerY) / centerY) * -6;
  const rotateY = ((x - centerX) / centerX) * 6;

  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
});

container.addEventListener('mouseleave', () => {
  card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)';
  card.style.transition = 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
});

container.addEventListener('mouseenter', () => {
  card.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)';
});

// Password toggle
const toggleBtn = document.querySelector('.toggle-password');
const passwordInput = document.getElementById('password');

if (toggleBtn && passwordInput) {
  toggleBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;

    const svg = toggleBtn.querySelector('svg');
    if (type === 'text') {
      svg.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
        <path d="M14.12 14.12a3 3 0 11-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      `;
    } else {
      svg.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      `;
    }
  });
}

// ================= REAL LOGIN API =================
const API_BASE = 'https://nforce-timetracker-api.vercel.app/api';

const form = document.getElementById('loginForm');
const authButton = document.querySelector('.auth-button');
const emailInput = document.getElementById('email');
const passwordInputField = document.getElementById('password');
const errorDiv = document.createElement('div');
errorDiv.className = 'error-message';
errorDiv.style.cssText = `
  color: #ff4444;
  font-size: 0.8rem;
  text-align: center;
  padding: 8px;
  border: 1px solid rgba(255, 68, 68, 0.3);
  border-radius: 8px;
  background: rgba(255, 68, 68, 0.08);
  display: none;
  margin-top: 8px;
`;
form.insertBefore(errorDiv, form.querySelector('.form-options'));

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.style.display = 'none';

    const email = emailInput.value.trim();
    const password = passwordInputField.value.trim();

    if (!email || !password) {
      showError('Please enter email and password');
      return;
    }

    authButton.disabled = true;
    authButton.innerHTML = `
      <span class="button-text">INITIALIZING...</span>
      <span class="button-glow"></span>
    `;

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      authButton.innerHTML = `
        <span class="button-text">ACCESS GRANTED</span>
        <span class="button-glow"></span>
      `;
      authButton.style.background = 'linear-gradient(135deg, #00cc00, #00ff00)';

      setTimeout(() => {
        window.location.href = data.user.role === 'ADMIN'
          ? 'https://nforce-timetracker.vercel.app/'
          : data.user.role === 'MANAGER'
          ? 'https://nforce-timetracker.vercel.app/approvals'
          : 'https://nforce-timetracker.vercel.app/timesheet';
      }, 800);

    } catch (err) {
      showError(err.message);
      authButton.disabled = false;
      authButton.innerHTML = `
        <span class="button-text">AUTHENTICATE</span>
        <span class="button-glow"></span>
      `;

      const inputs = form.querySelectorAll('input');
      inputs.forEach(input => {
        input.style.borderColor = 'rgba(255, 26, 26, 0.3)';
        input.style.boxShadow = '0 0 15px rgba(255, 26, 26, 0.1)';
        setTimeout(() => {
          input.style.borderColor = '';
          input.style.boxShadow = '';
        }, 1500);
      });
    }
  });
}

function showError(message) {
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}
