renderNavbar();

const categorySelect = document.getElementById('filterCategory');
fillCategorySelect(categorySelect, true);

async function loadProjects() {
  const params = new URLSearchParams({
    category: categorySelect.value,
    technology: document.getElementById('filterTechnology').value,
    sort: document.getElementById('filterSort').value
  });
  const projects = await api('/projects/public?' + params);

  const container = document.getElementById('projects');
  container.innerHTML = projects.length > 0
    ? projects.map(projectCard).join('')
    : '<p class="text-muted">Nessun progetto trovato con questi filtri.</p>';
}

document.getElementById('filterForm').addEventListener('submit', (event) => {
  event.preventDefault();
  loadProjects().catch((err) => showToast(err.message, 'danger'));
});

loadProjects().catch((err) => showToast(err.message, 'danger'));
