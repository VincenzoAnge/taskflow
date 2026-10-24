// Funzioni usate da tutte le pagine

const CATEGORIES = ['Web', 'Mobile', 'Dati', 'Gioco', 'Altro'];
const STATUS_LABELS = { todo: 'Da fare', doing: 'In corso', done: 'Completato' };
const STATUS_COLORS = { todo: 'secondary', doing: 'primary', done: 'success' };
const PRIORITY_LABELS = { low: 'Bassa', medium: 'Media', high: 'Alta' };
const PRIORITY_COLORS = { low: 'secondary', medium: 'warning', high: 'danger' };

// --- Sessione (il token JWT è salvato nel localStorage) ---

function getToken() {
  return localStorage.getItem('taskflow_token');
}

function getUser() {
  const user = localStorage.getItem('taskflow_user');
  return user ? JSON.parse(user) : null;
}

function saveSession(token, user) {
  localStorage.setItem('taskflow_token', token);
  localStorage.setItem('taskflow_user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('taskflow_token');
  localStorage.removeItem('taskflow_user');
  window.location.href = '/login.html';
}

// Le pagine private chiamano questa funzione per mandare al login chi non ha il token
function requireLogin() {
  if (!getToken()) {
    window.location.href = '/login.html';
  }
}

// --- Chiamate alle API ---

async function api(path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' };
  if (getToken()) {
    headers.Authorization = 'Bearer ' + getToken();
  }

  const response = await fetch('/api' + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json();

  if (!json.success) {
    // token scaduto, utente non più valido o account bloccato: si torna al login
    const sessionInvalid = response.status === 401 || json.message === 'Account bloccato';
    if (sessionInvalid && getToken()) {
      logout();
    }
    throw new Error(json.message);
  }
  return json.data;
}

// --- Utilità per la grafica ---

// Evita che il testo inserito dagli utenti venga interpretato come HTML
function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('it-IT');
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function showToast(message, type = 'primary') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0`;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body"></div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  toast.querySelector('.toast-body').textContent = message;
  container.appendChild(toast);

  toast.addEventListener('hidden.bs.toast', () => toast.remove());
  new bootstrap.Toast(toast, { delay: 4000 }).show();
}

// Navbar uguale in tutte le pagine
function renderNavbar() {
  const user = getUser();
  const path = window.location.pathname;

  const link = (href, icon, text) => `
    <li class="nav-item">
      <a class="nav-link ${path === href ? 'active fw-semibold' : ''}" href="${href}">
        <i class="bi ${icon}"></i> ${text}
      </a>
    </li>`;

  let links = link('/explore.html', 'bi-compass', 'Esplora');
  let right = `
    <a href="/login.html" class="btn btn-outline-primary btn-sm me-2">Accedi</a>
    <a href="/register.html" class="btn btn-primary btn-sm">Registrati</a>`;

  if (user) {
    links = link('/dashboard.html', 'bi-grid', 'Dashboard') + links;
    if (user.role === 'admin') {
      links += link('/admin.html', 'bi-shield-lock', 'Admin');
    }
    right = `
      <span class="text-muted small me-3"><i class="bi bi-person-circle"></i> ${esc(user.name)}</span>
      <button id="logoutBtn" class="btn btn-outline-secondary btn-sm">Esci</button>`;
  }

  const navbar = document.getElementById('navbar');
  navbar.className = 'navbar navbar-expand-lg bg-white border-bottom';
  navbar.innerHTML = `
    <div class="container">
      <a class="navbar-brand fw-bold text-primary" href="/">
        <i class="bi bi-kanban"></i> TaskFlow
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav me-auto">${links}</ul>
        <div class="d-flex align-items-center">${right}</div>
      </div>
    </div>`;

  if (user) {
    document.getElementById('logoutBtn').addEventListener('click', logout);
  }
}

// Card di un progetto, usata in dashboard, esplora e home
function projectCard(project) {
  const technologies = (project.technologies || [])
    .map((t) => `<span class="badge text-bg-light border">${esc(t)}</span>`)
    .join(' ');
  const cover = project.coverImage
    ? `<img src="${esc(project.coverImage)}" alt="" onerror="this.remove()">`
    : '';
  const owner = project.owner && project.owner.name ? `<i class="bi bi-person"></i> ${esc(project.owner.name)}` : '';
  const visibilityIcon = project.visibility === 'private' ? 'bi-lock' : 'bi-globe';
  const archived = project.archived ? '<span class="badge text-bg-warning">Archiviato</span>' : '';

  return `
    <div class="col">
      <a href="/project.html?id=${project._id}" class="text-decoration-none text-reset">
        <div class="card project-card">
          <div class="project-cover">${esc(project.title.charAt(0).toUpperCase())}${cover}</div>
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <h5 class="card-title mb-0">${esc(project.title)}</h5>
              <i class="bi ${visibilityIcon} text-muted"></i>
            </div>
            <div class="mb-2">
              <span class="badge text-bg-primary">${esc(project.category)}</span> ${archived}
            </div>
            <p class="card-text text-muted small line-clamp-2">${esc(project.description) || 'Nessuna descrizione'}</p>
            <div class="mb-2">${technologies}</div>
            <div class="small text-muted">${owner}</div>
          </div>
        </div>
      </a>
    </div>`;
}

// Riempie un <select> con le categorie
function fillCategorySelect(select, withAll) {
  const options = CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
  select.innerHTML = (withAll ? '<option value="">Tutte le categorie</option>' : '') + options;
}

// "react, node ,mongo" diventa ['react', 'node', 'mongo']
function parseTechnologies(text) {
  return text.split(',').map((t) => t.trim()).filter((t) => t);
}
