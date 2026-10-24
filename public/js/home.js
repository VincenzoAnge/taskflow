renderNavbar();

const heroButtons = document.getElementById('heroButtons');
if (getToken()) {
  heroButtons.innerHTML = '<a href="/dashboard.html" class="btn btn-primary btn-lg">Vai alla dashboard</a>';
} else {
  heroButtons.innerHTML = `
    <a href="/register.html" class="btn btn-primary btn-lg me-2">Inizia ora</a>
    <a href="/explore.html" class="btn btn-outline-secondary btn-lg">Esplora i progetti</a>`;
}

async function loadLatestProjects() {
  const projects = await api('/projects/public');
  const container = document.getElementById('latestProjects');

  if (projects.length === 0) {
    container.innerHTML = '<p class="text-muted">Ancora nessun progetto pubblico.</p>';
    return;
  }
  container.innerHTML = projects.slice(0, 3).map(projectCard).join('');
}

loadLatestProjects().catch((err) => showToast(err.message, 'danger'));
