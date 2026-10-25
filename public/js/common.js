// Funzioni e costanti condivise da tutte le pagine.
// Va incluso prima dello script della pagina (es. <script src="/js/common.js"> e poi /js/dashboard.js).

// ---------- Costanti ----------

const CATEGORIES = ['Web', 'Mobile', 'Dati', 'Gioco', 'Altro'];

const STATUS_LABELS = { todo: 'Da fare', doing: 'In corso', done: 'Completato' };
const PRIORITY_LABELS = { low: 'Bassa', medium: 'Media', high: 'Alta' };

// Colori Bootstrap usati per i badge di stato e priorità
const STATUS_COLORS = { todo: 'secondary', doing: 'primary', done: 'success' };
const PRIORITY_COLORS = { low: 'secondary', medium: 'warning', high: 'danger' };

// Icona e colore della copertina di ogni categoria (usati quando il progetto non ha un'immagine)
const CATEGORY_STYLES = {
  Web: { icon: 'bi-globe2', color: 'indigo' },
  Mobile: { icon: 'bi-phone', color: 'pink' },
  Dati: { icon: 'bi-bar-chart-line', color: 'teal' },
  Gioco: { icon: 'bi-controller', color: 'purple' },
  Altro: { icon: 'bi-stars', color: 'gray' }
};

const AVATAR_COLORS = ['#6d5efc', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

// ---------- Sessione (token JWT e utente salvati nel localStorage) ----------

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

// Le pagine private chiamano questa funzione: senza token si va al login
// e dopo il login si torna alla pagina che si voleva aprire
function requireLogin() {
  if (!getToken()) {
    const next = window.location.pathname + window.location.search;
    window.location.href = '/login.html?next=' + encodeURIComponent(next);
  }
}

// ---------- Chiamate alle API ----------

// Esegue una richiesta al backend e restituisce il campo "data" della risposta.
// Se il server risponde con success: false lancia un errore con il messaggio ricevuto.
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
    // token scaduto o account bloccato: si torna al login
    const sessionInvalid = response.status === 401 || json.message === 'Account bloccato';
    if (sessionInvalid && getToken()) {
      logout();
    }
    throw new Error(json.message);
  }
  return json.data;
}

// ---------- Utilità ----------

// Evita che il testo scritto dagli utenti venga interpretato come HTML
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

// "react, node ,mongo" diventa ['react', 'node', 'mongo']
function parseTechnologies(text) {
  return text.split(',').map((t) => t.trim()).filter((t) => t);
}

// Riempie un <select> con le categorie
function fillCategorySelect(select) {
  select.innerHTML = CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
}

// ---------- Piccoli pezzi di interfaccia ----------

// Badge colorato (versione "soft" di Bootstrap, adatta al tema scuro)
function badge(color, text) {
  return `<span class="badge bg-${color}-subtle text-${color}-emphasis">${text}</span>`;
}

// Cerchio con le iniziali del nome; il colore dipende dal nome così resta sempre uguale
function avatar(name, size = '') {
  const text = String(name || '?').trim();
  const initials = text.split(' ').slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('');
  let sum = 0;
  for (const char of text) {
    sum += char.charCodeAt(0);
  }
  const color = AVATAR_COLORS[sum % AVATAR_COLORS.length];
  return `<span class="avatar ${size}" style="background:${color}" title="${esc(text)}">${esc(initials)}</span>`;
}

// Data di scadenza di un task, in rosso se è già passata e il task non è completato
function dueDate(task) {
  if (!task.dueDate) {
    return '';
  }
  const today = new Date().setHours(0, 0, 0, 0);
  const late = task.status !== 'done' && new Date(task.dueDate).setHours(0, 0, 0, 0) < today;
  return `<span class="${late ? 'text-danger fw-semibold' : ''}"><i class="bi bi-calendar-event"></i> ${formatDate(task.dueDate)}</span>`;
}

// Copertina di un progetto: l'immagine se c'è, altrimenti colore e icona della categoria
function projectCover(project) {
  const style = CATEGORY_STYLES[project.category] || CATEGORY_STYLES.Altro;
  const image = project.coverImage
    ? `<img src="${esc(project.coverImage)}" alt="" onerror="this.remove()">`
    : '';
  return `
    <div class="project-cover cover-${style.color}">
      <i class="bi ${style.icon}"></i>${image}
    </div>`;
}

// Card di un progetto, usata in home, dashboard ed esplora
function projectCard(project) {
  const technologies = (project.technologies || [])
    .map((t) => `<span class="tech">${esc(t)}</span>`)
    .join('');
  const owner = project.owner && project.owner.name
    ? `<div class="small text-secondary d-flex align-items-center gap-2 mt-3">${avatar(project.owner.name, 'avatar-sm')} ${esc(project.owner.name)}</div>`
    : '';
  const visibility = project.visibility === 'private' ? badge('secondary', '<i class="bi bi-lock"></i> Privato') : '';
  const archived = project.archived ? badge('warning', 'Archiviato') : '';

  return `
    <div class="col">
      <a href="/project.html?id=${project._id}" class="card project-card h-100">
        ${projectCover(project)}
        <div class="card-body">
          <div class="d-flex flex-wrap gap-1 mb-2">${badge('primary', esc(project.category))} ${visibility} ${archived}</div>
          <h5 class="card-title">${esc(project.title)}</h5>
          <p class="card-text text-secondary small line-clamp-2">${esc(project.description) || 'Nessuna descrizione'}</p>
          <div>${technologies}</div>
          ${owner}
        </div>
      </a>
    </div>`;
}

// Messaggio mostrato quando una lista è vuota
function emptyState(icon, text) {
  return `<div class="empty-state"><i class="bi ${icon}"></i><span>${text}</span></div>`;
}

// Notifica in basso a destra (toast di Bootstrap)
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

// ---------- Navbar (uguale in tutte le pagine) ----------

function renderNavbar() {
  const user = getUser();
  const path = window.location.pathname;

  const link = (href, icon, text) => `
    <li class="nav-item">
      <a class="nav-link ${path === href ? 'active' : ''}" href="${href}"><i class="bi ${icon}"></i> ${text}</a>
    </li>`;

  let links = link('/explore.html', 'bi-compass', 'Esplora');
  let right = `
    <a href="/login.html" class="btn btn-outline-secondary btn-sm">Accedi</a>
    <a href="/register.html" class="btn btn-primary btn-sm">Registrati</a>`;

  if (user) {
    links = link('/dashboard.html', 'bi-grid', 'Dashboard') + links;
    if (user.role === 'admin') {
      links += link('/admin.html', 'bi-shield-lock', 'Admin');
    }
    right = `
      <span class="d-flex align-items-center gap-2 small">${avatar(user.name)} ${esc(user.name)}</span>
      <button id="logoutBtn" class="btn btn-outline-secondary btn-sm"><i class="bi bi-box-arrow-right"></i> Esci</button>`;
  }

  const navbar = document.getElementById('navbar');
  navbar.className = 'navbar navbar-expand-lg app-navbar';
  navbar.innerHTML = `
    <div class="container-xxl">
      <a class="navbar-brand" href="/"><span class="brand-logo"><i class="bi bi-kanban"></i></span> TaskFlow</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu" aria-label="Menu">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav me-auto">${links}</ul>
        <div class="d-flex align-items-center gap-2 py-2 py-lg-0">${right}</div>
      </div>
    </div>`;

  if (user) {
    document.getElementById('logoutBtn').addEventListener('click', logout);
  }
}
