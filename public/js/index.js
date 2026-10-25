// Home page: bottoni in base al login e ultimi 3 progetti pubblici
renderNavbar();

const heroButtons = document.getElementById('heroButtons');
if (getToken()) {
  heroButtons.innerHTML = '<a href="/dashboard.html" class="btn btn-primary btn-lg">Vai alla dashboard</a>';
} else {
  heroButtons.innerHTML = `
    <a href="/register.html" class="btn btn-primary btn-lg">Inizia ora</a>
    <a href="/explore.html" class="btn btn-outline-secondary btn-lg">Esplora i progetti</a>`;
}

async function loadLatestProjects() {
  const projects = await api('/projects/public');
  const container = document.getElementById('latestProjects');

  container.innerHTML = projects.length > 0
    ? projects.slice(0, 3).map(projectCard).join('')
    : `<div class="col-12">${emptyState('bi-folder2-open', 'Ancora nessun progetto pubblico.')}</div>`;
}

loadLatestProjects().catch((err) => showToast(err.message, 'danger'));
