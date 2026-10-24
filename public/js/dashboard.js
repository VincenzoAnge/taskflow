requireLogin();
renderNavbar();

document.getElementById('welcome').textContent = 'Ciao, ' + getUser().name;
fillCategorySelect(document.getElementById('projectCategory'), false);

function renderTasks(tasks) {
  const list = document.getElementById('myTasks');

  if (tasks.length === 0) {
    list.innerHTML = '<li class="list-group-item"><div class="empty-state border-0"><i class="bi bi-check2-all"></i>Nessun task assegnato a te.</div></li>';
    return;
  }

  list.innerHTML = tasks.map((task) => {
    // scaduto = la data è precedente a oggi (un task che scade oggi non è ancora in ritardo)
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const overdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < startOfToday;
    const due = task.dueDate
      ? `<span class="${overdue ? 'text-danger' : 'text-muted'}"><i class="bi bi-calendar"></i> ${formatDate(task.dueDate)}</span>`
      : '<span class="text-muted">Nessuna scadenza</span>';

    return `
      <li class="list-group-item py-3">
        <div class="d-flex justify-content-between align-items-start">
          <a href="/project.html?id=${task.project._id}" class="fw-semibold text-decoration-none">${esc(task.title)}</a>
          <span class="badge text-bg-${STATUS_COLORS[task.status]}">${STATUS_LABELS[task.status]}</span>
        </div>
        <div class="small text-muted">${esc(task.project.title)}</div>
        <div class="small">${due}</div>
      </li>`;
  }).join('');
}

function renderProjects(containerId, projects, emptyText) {
  const container = document.getElementById(containerId);
  container.innerHTML = projects.length > 0
    ? projects.map(projectCard).join('')
    : `<div class="col-12"><div class="empty-state"><i class="bi bi-folder2-open"></i>${emptyText}</div></div>`;
}

async function loadDashboard() {
  const data = await api('/users/me/dashboard');

  document.getElementById('statProjects').textContent = data.stats.projects;
  document.getElementById('statTodo').textContent = data.stats.todo;
  document.getElementById('statDoing').textContent = data.stats.doing;
  document.getElementById('statDone').textContent = data.stats.done;

  renderProjects('createdProjects', data.createdProjects, 'Non hai ancora creato progetti.');
  renderProjects('memberProjects', data.memberProjects, 'Non partecipi ancora a progetti di altri.');
  renderTasks(data.tasks);
}

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
