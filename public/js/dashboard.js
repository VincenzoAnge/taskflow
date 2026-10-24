requireLogin();
renderNavbar();

document.getElementById('welcome').textContent = 'Ciao, ' + getUser().name;
document.getElementById('today').textContent = new Date().toLocaleDateString('it-IT', {
  weekday: 'long', day: 'numeric', month: 'long'
});
fillCategorySelect(document.getElementById('projectCategory'));

let myTasks = [];
let taskFilter = 'open';

function renderTasks() {
  const list = document.getElementById('myTasks');
  const tasks = myTasks.filter((task) => {
    if (taskFilter === 'open') return task.status !== 'done';
    if (taskFilter === 'done') return task.status === 'done';
    return true;
  });

  if (tasks.length === 0) {
    const text = taskFilter === 'open' ? 'Nessun task da fare, ottimo lavoro!' : 'Nessun task qui.';
    list.innerHTML = `<li class="list-group-item"><div class="empty-state border-0"><i class="bi bi-check2-all"></i>${text}</div></li>`;
    return;
  }

  list.innerHTML = tasks.map((task) => {
    const done = task.status === 'done';
    return `
      <li class="list-group-item task-row d-flex gap-3 py-3">
        <button class="check-btn ${done ? 'checked' : ''} toggle-task" data-id="${task._id}" data-project="${task.project._id}"
          title="${done ? 'Riapri il task' : 'Segna come completato'}">
          <i class="bi ${done ? 'bi-check-circle-fill' : 'bi-circle'}"></i>
        </button>
        <div class="flex-grow-1 min-w-0">
          <a href="/project.html?id=${task.project._id}" class="fw-semibold text-decoration-none text-reset ${done ? 'text-decoration-line-through text-muted' : ''}">${esc(task.title)}</a>
          <div class="small text-muted text-truncate"><i class="bi bi-folder2"></i> ${esc(task.project.title)}</div>
          <div class="d-flex flex-wrap gap-2 align-items-center mt-1 small">
            <span class="badge text-bg-${STATUS_COLORS[task.status]}">${STATUS_LABELS[task.status]}</span>
            ${dueLabel(task)}
          </div>
        </div>
      </li>`;
  }).join('');
}

function renderProjects(containerId, projects, emptyHtml) {
  // i progetti archiviati vanno in fondo
  const sorted = [...projects].sort((a, b) => a.archived - b.archived);
  document.getElementById(containerId).innerHTML = projects.length > 0
    ? sorted.map(projectCard).join('')
    : `<div class="col-12"><div class="empty-state">${emptyHtml}</div></div>`;
}

async function loadDashboard() {
  const data = await api('/users/me/dashboard');

  document.getElementById('statProjects').textContent = data.stats.projects;
  document.getElementById('statTodo').textContent = data.stats.todo;
  document.getElementById('statDoing').textContent = data.stats.doing;
  document.getElementById('statDone').textContent = data.stats.done;
  document.getElementById('createdCount').textContent = data.createdProjects.length;
  document.getElementById('memberCount').textContent = data.memberProjects.length;

  renderProjects('createdProjects', data.createdProjects, `
    <i class="bi bi-folder-plus"></i>Non hai ancora creato progetti.
    <div class="mt-3"><button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#projectModal">Crea il primo progetto</button></div>`);
  renderProjects('memberProjects', data.memberProjects, `
    <i class="bi bi-people"></i>Non partecipi ancora a progetti di altri.
    <div class="mt-3"><a href="/explore.html" class="btn btn-outline-primary btn-sm">Trova un progetto</a></div>`);

  myTasks = data.tasks;
  renderTasks();
}

document.getElementById('taskFilter').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) {
    return;
  }
  document.querySelectorAll('#taskFilter button').forEach((b) => b.classList.remove('active'));
  button.classList.add('active');
  taskFilter = button.dataset.filter;
  renderTasks();
});

// Spunta veloce: completa il task (o lo riapre) senza entrare nel progetto
document.getElementById('myTasks').addEventListener('click', async (event) => {
  const button = event.target.closest('.toggle-task');
  if (!button) {
    return;
  }
  const task = myTasks.find((t) => t._id === button.dataset.id);
  const status = task.status === 'done' ? 'todo' : 'done';

  try {
    await api(`/projects/${button.dataset.project}/tasks/${task._id}/status`, 'PATCH', { status });
    showToast(status === 'done' ? 'Task completato' : 'Task riaperto', 'success');
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

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
