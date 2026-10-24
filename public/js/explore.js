renderNavbar();

let category = '';
let projects = [];

// Pulsanti delle categorie: "Tutte" più una per ogni categoria
function renderChips() {
  document.getElementById('categoryChips').innerHTML = ['', ...CATEGORIES].map((c) => `
    <button type="button" class="btn btn-sm chip ${c === category ? 'active' : ''}" data-category="${c}">
      ${c ? `<i class="bi ${coverStyle(c).icon}"></i> ${c}` : 'Tutte'}
    </button>`).join('');
}

// Categoria, tecnologia e ordinamento li applica il server
async function loadProjects() {
  const params = new URLSearchParams({
    category,
    technology: document.getElementById('filterTechnology').value,
    sort: document.getElementById('filterSort').value
  });
  projects = await api('/projects/public?' + params);
  renderProjects();
}

// La ricerca per testo invece filtra i progetti già scaricati
function renderProjects() {
  const search = document.getElementById('filterSearch').value.trim().toLowerCase();
  const shown = projects.filter((p) =>
    p.title.toLowerCase().includes(search) || (p.description || '').toLowerCase().includes(search));

  document.getElementById('resultCount').textContent =
    shown.length === 1 ? '1 progetto trovato' : `${shown.length} progetti trovati`;
  document.getElementById('projects').innerHTML = shown.length > 0
    ? shown.map(projectCard).join('')
    : '<div class="col-12"><div class="empty-state"><i class="bi bi-search"></i>Nessun progetto trovato con questi filtri.</div></div>';
}

// Suggerimenti per il campo tecnologia, presi dai progetti pubblici
async function loadTechSuggestions() {
  const all = await api('/projects/public');
  const technologies = [...new Set(all.flatMap((p) => p.technologies))].sort();
  document.getElementById('techList').innerHTML = technologies.map((t) => `<option value="${esc(t)}">`).join('');
}

function reload() {
  loadProjects().catch((err) => showToast(err.message, 'danger'));
}

// piccolo ritardo per non chiamare il server a ogni lettera digitata
let typingTimer = null;
document.getElementById('filterTechnology').addEventListener('input', () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(reload, 300);
});
document.getElementById('filterSort').addEventListener('change', reload);
document.getElementById('filterSearch').addEventListener('input', renderProjects);
document.getElementById('filterForm').addEventListener('submit', (event) => event.preventDefault());

document.getElementById('categoryChips').addEventListener('click', (event) => {
  const chip = event.target.closest('.chip');
  if (chip) {
    category = chip.dataset.category;
    renderChips();
    reload();
  }
});

document.getElementById('resetFilters').addEventListener('click', () => {
  category = '';
  document.getElementById('filterForm').reset();
  renderChips();
  reload();
});

renderChips();
reload();
loadTechSuggestions().catch(() => {});
