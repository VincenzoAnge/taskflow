// Funzioni usate da tutte le pagine

const CATEGORIES = ['Web', 'Mobile', 'Dati', 'Gioco', 'Altro'];
const STATUS_LABELS = { todo: 'Da fare', doing: 'In corso', done: 'Completato' };
const STATUS_COLORS = { todo: 'secondary', doing: 'primary', done: 'success' };
const PRIORITY_LABELS = { low: 'Bassa', medium: 'Media', high: 'Alta' };
const PRIORITY_COLORS = { low: 'secondary', medium: 'warning', high: 'danger' };

// Ogni categoria ha una sua icona e un suo gradiente per la copertina
const CATEGORY_STYLES = {
  Web: { icon: 'bi-globe2', gradient: 'linear-gradient(135deg, #4f46e5, #0ea5e9)' },
  Mobile: { icon: 'bi-phone', gradient: 'linear-gradient(135deg, #ec4899, #f97316)' },
  Dati: { icon: 'bi-bar-chart-line', gradient: 'linear-gradient(135deg, #059669, #14b8a6)' },
  Gioco: { icon: 'bi-controller', gradient: 'linear-gradient(135deg, #7c3aed, #d946ef)' },
  Altro: { icon: 'bi-stars', gradient: 'linear-gradient(135deg, #475569, #94a3b8)' }
};
const AVATAR_COLORS = ['#4f46e5', '#0ea5e9', '#059669', '#d97706', '#db2777', '#7c3aed', '#475569'];

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
    // dopo il login si torna alla pagina che si voleva aprire
    const next = window.location.pathname + window.location.search;
    window.location.href = '/login.html?next=' + encodeURIComponent(next);
  }
}

// --- Chiamate alle API ---

async function api(path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' };
  if (getToken()) {
    headers.Authorization = 'Bearer ' + getToken();
  }

  let response;
  let json;
  try {
    response = await fetch('/api' + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    json = await response.json();
  } catch (err) {
    throw new Error('Server non raggiungibile, riprova tra poco');
  }

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

// Cerchietto colorato con le iniziali del nome (il colore dipende dal nome)
function avatar(name, size = '') {
  const text = String(name || '?').trim();
  const initials = text.split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
  let sum = 0;
  for (const char of text) {
    sum += char.charCodeAt(0);
  }
  const color = AVATAR_COLORS[sum % AVATAR_COLORS.length];
  return `<span class="avatar ${size}" style="background:${color}" title="${esc(text)}">${esc(initials)}</span>`;
}

// Copertina di un progetto: immagine se c'è, altrimenti gradiente + icona della categoria
function coverStyle(category) {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES.Altro;
}

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

// Scadenza di un task: in rosso se è passata, in arancione se è oggi
function dueLabel(task) {
  if (!task.dueDate) {
    return '';
  }
  const today = new Date().setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate).setHours(0, 0, 0, 0);
  const open = task.status !== 'done';

  if (open && due < today) {
    return `<span class="due due-late"><i class="bi bi-exclamation-circle"></i> Scaduto il ${formatDate(task.dueDate)}</span>`;
  }
  if (open && due === today) {
    return '<span class="due due-today"><i class="bi bi-alarm"></i> Scade oggi</span>';
  }
  return `<span class="due"><i class="bi bi-calendar-event"></i> ${formatDate(task.dueDate)}</span>`;
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
      <a class="nav-link ${path === href ? 'active' : ''}" href="${href}">
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
      <div class="dropdown">
        <button class="btn user-menu dropdown-toggle" data-bs-toggle="dropdown" id="userMenuBtn">
          ${avatar(user.name)} <span class="fw-semibold">${esc(user.name)}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><span class="dropdown-item-text small text-muted">${esc(user.email)}</span></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="/dashboard.html"><i class="bi bi-grid"></i> Dashboard</a></li>
          <li><a class="dropdown-item" href="/explore.html"><i class="bi bi-compass"></i> Esplora progetti</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item text-danger" id="logoutBtn"><i class="bi bi-box-arrow-right"></i> Esci</button></li>
        </ul>
      </div>`;
  }

  const navbar = document.getElementById('navbar');
  navbar.className = 'navbar navbar-expand-lg app-navbar';
  navbar.innerHTML = `
    <div class="container">
      <a class="navbar-brand d-flex align-items-center" href="/">
        <span class="brand-logo"><i class="bi bi-kanban"></i></span> TaskFlow
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

  renderFooter();
}

function renderFooter() {
  if (document.getElementById('footer')) {
    return;
  }
  const footer = document.createElement('footer');
  footer.id = 'footer';
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="container d-flex flex-wrap justify-content-between gap-2">
      <span><i class="bi bi-kanban text-primary"></i> <strong>TaskFlow</strong> &middot; Progetto finale Node.js</span>
      <span>Node.js &middot; Express &middot; MongoDB &middot; Socket.IO</span>
    </div>`;
  document.body.appendChild(footer);
}

// Card di un progetto, usata in dashboard, esplora e home
function projectCard(project) {
  const technologies = (project.technologies || [])
    .slice(0, 4)
    .map((t) => `<span class="badge tech-badge">${esc(t)}</span>`)
    .join(' ');
  const style = coverStyle(project.category);
  const cover = project.coverImage
    ? `<img src="${esc(project.coverImage)}" alt="" onerror="this.remove()">`
    : '';
  const owner = project.owner && project.owner.name
    ? `${avatar(project.owner.name, 'avatar-sm')} <span>${esc(project.owner.name)}</span>`
    : '';
  const visibilityIcon = project.visibility === 'private' ? 'bi-lock-fill' : 'bi-globe';
  const archived = project.archived ? '<span class="badge text-bg-warning">Archiviato</span>' : '';

  return `
    <div class="col">
      <a href="/project.html?id=${project._id}" class="text-decoration-none text-reset">
        <div class="card project-card">
          <div class="project-cover" style="background:${style.gradient}">
            <span class="cover-icon"><i class="bi ${style.icon}"></i></span>${cover}
          </div>
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h5 class="card-title mb-0">${esc(project.title)}</h5>
              <i class="bi ${visibilityIcon} text-muted ms-2"></i>
            </div>
            <div class="mb-2">
              <span class="badge bg-primary-subtle text-primary-emphasis">${esc(project.category)}</span> ${archived}
            </div>
            <p class="card-text text-muted small line-clamp-2">${esc(project.description) || 'Nessuna descrizione'}</p>
            <div class="mb-3">${technologies}</div>
            <div class="small text-muted d-flex align-items-center gap-2">${owner}</div>
          </div>
        </div>
      </a>
    </div>`;
}

// Riempie un <select> con le categorie
function fillCategorySelect(select) {
  select.innerHTML = CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
}

// "react, node ,mongo" diventa ['react', 'node', 'mongo']
function parseTechnologies(text) {
  return text.split(',').map((t) => t.trim()).filter((t) => t);
}
