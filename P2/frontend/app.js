// El navegador nunca lee el JWT directamente: viaja en cookies httpOnly y solo
// necesitamos `credentials: 'include'` para que se envíen/reciban automáticamente.

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Error ${res.status}`);
  }
  return data;
}

// ---------- Página de login/registro ----------
const tabs = document.querySelectorAll('.tab');
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
  });
});

const loginForm = document.getElementById('login-form');
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';
  const formData = new FormData(loginForm);
  try {
    await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    window.location.href = 'dashboard.html';
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

const registerForm = document.getElementById('register-form');
registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('register-error');
  errorEl.textContent = '';
  const formData = new FormData(registerForm);
  try {
    await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    window.location.href = 'dashboard.html';
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// ---------- Página de confirmación (dashboard) ----------
async function loadDashboard() {
  const welcome = document.getElementById('welcome');
  try {
    const { user } = await api('/auth/me');
    welcome.textContent = `Bienvenido/a, ${user.name}.`;
    document.getElementById('user-info').innerHTML = `
      <dt>Correo</dt><dd>${user.email}</dd>
      <dt>Rol</dt><dd>${user.role}</dd>
    `;
  } catch {
    window.location.href = 'index.html';
  }
}

document.getElementById('test-route1')?.addEventListener('click', () => testRoute('route1'));
document.getElementById('test-route2')?.addEventListener('click', () => testRoute('route2'));

async function testRoute(route) {
  const resultEl = document.getElementById('route-result');
  resultEl.textContent = 'Consultando...';
  try {
    const data = await api(`/protected/${route}`);
    resultEl.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    resultEl.textContent = `Denegado: ${err.message}`;
  }
}

document.getElementById('logout')?.addEventListener('click', async () => {
  await api('/auth/logout', { method: 'POST' });
  window.location.href = 'index.html';
});

if (document.body.contains(document.getElementById('welcome'))) {
  loadDashboard();
}
