// Esplora: progetti pubblici filtrati per categoria e tecnologia, ordinati per data.
// I filtri vengono applicati dal server (GET /api/projects/public?category=...&technology=...&sort=...)
renderNavbar();

const categorySelect = document.getElementById('filterCategory');
categorySelect.innerHTML = '<option value="">Tutte le categorie</option>' +
  CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');

async function loadProjects() {
  const params = new URLSearchParams({
    category: categorySelect.value,
    technology: document.getElementById('filterTechnology').value.trim(),
    sort: document.getElementById('filterSort').value
  });
  const projects = await api('/projects/public?' + params);

  document.getElementById('projects').innerHTML = projects.length > 0
    ? projects.map(projectCard).join('')
    : `<div class="col-12">${emptyState('bi-search', 'Nessun progetto trovato con questi filtri.')}</div>`;
}

function reload() {
  loadProjects().catch((err) => showToast(err.message, 'danger'));
}

// Ogni modifica a un filtro ricarica l'elenco.
// Per la tecnologia si aspetta che l'utente smetta di scrivere per un attimo.
let typingTimer = null;
document.getElementById('filterTechnology').addEventListener('input', () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(reload, 300);
});
categorySelect.addEventListener('change', reload);
document.getElementById('filterSort').addEventListener('change', reload);
document.getElementById('filterForm').addEventListener('submit', (event) => event.preventDefault());

reload();
