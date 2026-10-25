// Dashboard: card riepilogative, progetti dell'utente e task assegnati a lui
requireLogin();
renderNavbar();

document.getElementById('welcome').textContent = 'Ciao, ' + getUser().name;
fillCategorySelect(document.getElementById('projectCategory'));

// ---------- Visualizzazione ----------

function renderProjects(containerId, projects, emptyHtml) {
  document.getElementById(containerId).innerHTML = projects.length > 0
    ? projects.map(projectCard).join('')
    : `<div class="col-12">${emptyHtml}</div>`;
}

// I task arrivano dal server già ordinati per scadenza
function renderTasks(tasks) {
  const list = document.getElementById('myTasks');

  if (tasks.length === 0) {
    list.innerHTML = `<li class="list-group-item">${emptyState('bi-check2-all', 'Nessun task assegnato a te.')}</li>`;
    return;
  }

  list.innerHTML = tasks.map((task) => `
    <li class="list-group-item py-3">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <a href="/project.html?id=${task.project._id}" class="fw-semibold text-reset text-decoration-none">${esc(task.title)}</a>
        ${badge(STATUS_COLORS[task.status], STATUS_LABELS[task.status])}
      </div>
      <div class="small text-secondary"><i class="bi bi-folder2"></i> ${esc(task.project.title)}</div>
      <div class="small mt-1">${dueDate(task) || '<span class="text-secondary">Nessuna scadenza</span>'}</div>
    </li>`).join('');
}

// ---------- Caricamento dati ----------

async function loadDashboard() {
  const data = await api('/users/me/dashboard');

  document.getElementById('statProjects').textContent = data.stats.projects;
  document.getElementById('statTodo').textContent = data.stats.todo;
  document.getElementById('statDoing').textContent = data.stats.doing;
  document.getElementById('statDone').textContent = data.stats.done;

  renderProjects('createdProjects', data.createdProjects,
    emptyState('bi-folder-plus', 'Non hai ancora creato progetti. Usa "Nuovo progetto" per iniziare.'));
  renderProjects('memberProjects', data.memberProjects,
    emptyState('bi-people', 'Non partecipi a progetti di altri. Trovane uno in <a href="/explore.html">Esplora</a>.'));
  renderTasks(data.tasks);
}

// ---------- Nuovo progetto ----------

document.getElementById('projectForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const project = await api('/projects', 'POST', {
      title: document.getElementById('projectTitle').value,
      description: document.getElementById('projectDescription').value,
      category: document.getElementById('projectCategory').value,
      visibility: document.getElementById('projectVisibility').value,
      technologies: parseTechnologies(document.getElementById('projectTechnologies').value),
      coverImage: document.getElementById('projectCover').value
    });
    window.location.href = '/project.html?id=' + project._id;
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

loadDashboard().catch((err) => showToast(err.message, 'danger'));
