requireLogin();
renderNavbar();

const projectId = new URLSearchParams(window.location.search).get('id');
if (!projectId) {
  window.location.href = '/dashboard.html';
}

const me = getUser();
let project = null;
let tasks = [];
let socket = null;

const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
const editProjectModal = new bootstrap.Modal(document.getElementById('editProjectModal'));
const board = document.getElementById('board');
const chatBox = document.getElementById('chatBox');

fillCategorySelect(document.getElementById('editCategory'), false);

// ---------- Progetto ----------

async function loadProject() {
  project = await api('/projects/' + projectId);
  renderHeader();

  if (!project.isMember) {
    document.getElementById('guestArea').classList.remove('d-none');
    return;
  }

  document.getElementById('memberArea').classList.remove('d-none');
  renderMembers();
  await loadTasks();
  await loadMessages();
  connectSocket();
}

function renderHeader() {
  document.title = project.title + ' - TaskFlow';
  document.getElementById('projectHeader').classList.remove('d-none');
  document.getElementById('projectTitle').textContent = project.title;

  const style = coverStyle(project.category);
  const banner = document.getElementById('projectBanner');
  banner.style.background = style.gradient;
  banner.innerHTML = `<span class="cover-icon"><i class="bi ${style.icon}"></i></span>` +
    (project.coverImage ? `<img src="${esc(project.coverImage)}" alt="" onerror="this.remove()">` : '');
  document.getElementById('projectDescription').textContent = project.description || 'Nessuna descrizione';

  const visibility = project.visibility === 'private'
    ? '<span class="badge text-bg-dark"><i class="bi bi-lock"></i> Privato</span>'
    : '<span class="badge text-bg-light border"><i class="bi bi-globe"></i> Pubblico</span>';
  const archived = project.archived ? ' <span class="badge text-bg-warning">Archiviato</span>' : '';
  document.getElementById('projectBadges').innerHTML =
    `<span class="badge text-bg-primary">${esc(project.category)}</span> ${visibility}${archived}`;

  document.getElementById('projectTechnologies').innerHTML = project.technologies
    .map((t) => `<span class="badge tech-badge">${esc(t)}</span>`)
    .join(' ');

  document.getElementById('projectOwner').innerHTML =
    `${avatar(project.owner.name, 'avatar-sm')} Creato da ${esc(project.owner.name)} il ${formatDate(project.createdAt)}`;

  renderActions();
}

function renderActions() {
  const actions = document.getElementById('projectActions');

  if (project.isOwner) {
    actions.innerHTML = `
      <button class="btn btn-outline-secondary btn-sm" id="editProjectBtn"><i class="bi bi-pencil"></i> Modifica</button>
      <button class="btn btn-outline-secondary btn-sm" id="archiveBtn">
        <i class="bi bi-archive"></i> ${project.archived ? 'Ripristina' : 'Archivia'}
      </button>
      <button class="btn btn-outline-danger btn-sm" id="deleteProjectBtn"><i class="bi bi-trash"></i> Elimina</button>`;
    document.getElementById('editProjectBtn').addEventListener('click', openEditProject);
    document.getElementById('archiveBtn').addEventListener('click', toggleArchive);
    document.getElementById('deleteProjectBtn').addEventListener('click', deleteProject);
  } else if (project.isMember) {
    actions.innerHTML = '<button class="btn btn-outline-danger btn-sm" id="leaveBtn">Lascia il progetto</button>';
    document.getElementById('leaveBtn').addEventListener('click', leaveProject);
  } else if (project.visibility === 'public' && !project.archived) {
    actions.innerHTML = '<button class="btn btn-primary" id="joinBtn"><i class="bi bi-box-arrow-in-right"></i> Partecipa al progetto</button>';
    document.getElementById('joinBtn').addEventListener('click', joinProject);
  }
}

function openEditProject() {
  document.getElementById('editTitle').value = project.title;
  document.getElementById('editDescription').value = project.description;
  document.getElementById('editCategory').value = project.category;
  document.getElementById('editVisibility').value = project.visibility;
  document.getElementById('editTechnologies').value = project.technologies.join(', ');
  document.getElementById('editCover').value = project.coverImage;
  editProjectModal.show();
}

document.getElementById('editProjectForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('/projects/' + projectId, 'PUT', {
      title: document.getElementById('editTitle').value,
      description: document.getElementById('editDescription').value,
      category: document.getElementById('editCategory').value,
      visibility: document.getElementById('editVisibility').value,
      technologies: parseTechnologies(document.getElementById('editTechnologies').value),
      coverImage: document.getElementById('editCover').value
    });
    window.location.reload();
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

async function toggleArchive() {
  try {
    await api(`/projects/${projectId}/archive`, 'PATCH');
    window.location.reload();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function deleteProject() {
  if (!confirm('Eliminare il progetto con tutti i task e i messaggi?')) {
    return;
  }
  try {
    await api('/projects/' + projectId, 'DELETE');
    window.location.href = '/dashboard.html';
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function joinProject() {
  try {
    await api(`/projects/${projectId}/join`, 'POST');
    window.location.reload();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function leaveProject() {
  if (!confirm('Vuoi lasciare questo progetto?')) {
    return;
  }
  try {
    await api(`/projects/${projectId}/leave`, 'POST');
    window.location.href = '/dashboard.html';
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ---------- Membri ----------

function renderMembers() {
  const list = document.getElementById('membersList');

  list.innerHTML = project.members.map((member) => {
    const isOwner = member._id === project.owner._id;
    const removeButton = project.isOwner && !isOwner
      ? `<button class="btn btn-sm btn-outline-danger remove-member" data-id="${member._id}"><i class="bi bi-x-lg"></i></button>`
      : '';
    return `
      <li class="list-group-item d-flex justify-content-between align-items-center px-0">
        <div>
          <div class="d-flex align-items-center gap-2">
            ${avatar(member.name, 'avatar-lg')}
            <div>
              <div class="fw-semibold">${esc(member.name)}
                ${isOwner ? '<span class="badge bg-primary-subtle text-primary-emphasis">Proprietario</span>' : ''}</div>
              <div class="small text-muted">${esc(member.email)}</div>
            </div>
          </div>
        </div>
        ${removeButton}
      </li>`;
  }).join('');

  document.getElementById('memberForm').classList.toggle('d-none', !project.isOwner);
}

document.getElementById('membersList').addEventListener('click', async (event) => {
  const button = event.target.closest('.remove-member');
  if (!button || !confirm('Rimuovere questo membro dal progetto?')) {
    return;
  }
  try {
    project.members = await api(`/projects/${projectId}/members/${button.dataset.id}`, 'DELETE');
    renderMembers();
    await loadTasks();
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

document.getElementById('memberForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    project.members = await api(`/projects/${projectId}/members`, 'POST', {
      email: document.getElementById('memberEmail').value
    });
    document.getElementById('memberEmail').value = '';
    renderMembers();
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

// ---------- Task e board Kanban ----------

async function loadTasks() {
  tasks = await api(`/projects/${projectId}/tasks`);
  renderBoard();
}

function taskCard(task) {
  const statusOptions = Object.keys(STATUS_LABELS)
    .map((s) => `<option value="${s}" ${s === task.status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`)
    .join('');
  const assignee = task.assignee
    ? `${avatar(task.assignee.name, 'avatar-sm')} ${esc(task.assignee.name)}`
    : '<i class="bi bi-person-dash"></i> Non assegnato';
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const overdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < startOfToday;
  const dueDate = task.dueDate
    ? `<span class="${overdue ? 'text-danger fw-semibold' : ''}"><i class="bi bi-calendar"></i> ${formatDate(task.dueDate)}</span>`
    : '';
  const description = task.description ? `<p class="small text-muted mb-2">${esc(task.description)}</p>` : '';

  return `
    <div class="card task-card prio-${task.priority} mb-2" draggable="true" data-id="${task._id}">
      <div class="card-body p-3">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
          <h6 class="mb-0">${esc(task.title)}</h6>
          <span class="badge text-bg-${PRIORITY_COLORS[task.priority]}">${PRIORITY_LABELS[task.priority]}</span>
        </div>
        ${description}
        <div class="task-meta mb-2"><span>${assignee}</span>${dueDate}</div>
        <div class="d-flex gap-2">
          <select class="form-select form-select-sm status-select" data-id="${task._id}">${statusOptions}</select>
          <button class="btn btn-sm btn-outline-secondary edit-task" data-id="${task._id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger delete-task" data-id="${task._id}"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>`;
}

function renderBoard() {
  Object.keys(STATUS_LABELS).forEach((status) => {
    const columnTasks = tasks.filter((task) => task.status === status);
    document.getElementById('count-' + status).textContent = columnTasks.length;
    document.getElementById('col-' + status).innerHTML = columnTasks.length > 0
      ? columnTasks.map(taskCard).join('')
      : '<div class="empty-state"><i class="bi bi-inbox"></i>Nessun task</div>';
  });
}

async function changeStatus(taskId, status) {
  try {
    await api(`/projects/${projectId}/tasks/${taskId}/status`, 'PATCH', { status });
    await loadTasks();
  } catch (err) {
    showToast(err.message, 'danger');
    await loadTasks();
  }
}

async function deleteTask(taskId) {
  if (!confirm('Eliminare questo task?')) {
    return;
  }
  try {
    await api(`/projects/${projectId}/tasks/${taskId}`, 'DELETE');
    await loadTasks();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Apre il modal vuoto (nuovo task) oppure precompilato (modifica)
function openTaskModal(taskId) {
  const task = tasks.find((t) => t._id === taskId);

  document.getElementById('taskModalTitle').textContent = task ? 'Modifica task' : 'Nuovo task';
  document.getElementById('taskId').value = task ? task._id : '';
  document.getElementById('taskTitle').value = task ? task.title : '';
  document.getElementById('taskDescription').value = task ? task.description : '';
  document.getElementById('taskPriority').value = task ? task.priority : 'medium';
  document.getElementById('taskDueDate').value = task && task.dueDate ? task.dueDate.slice(0, 10) : '';

  const assigneeSelect = document.getElementById('taskAssignee');
  assigneeSelect.innerHTML = '<option value="">Nessuno</option>' +
    project.members.map((m) => `<option value="${m._id}">${esc(m.name)}</option>`).join('');
  assigneeSelect.value = task && task.assignee ? task.assignee._id : '';

  taskModal.show();
}

document.getElementById('newTaskBtn').addEventListener('click', () => openTaskModal(null));

document.getElementById('taskForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const taskId = document.getElementById('taskId').value;
  const body = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDescription').value,
    assignee: document.getElementById('taskAssignee').value,
    dueDate: document.getElementById('taskDueDate').value,
    priority: document.getElementById('taskPriority').value
  };

  try {
    if (taskId) {
      await api(`/projects/${projectId}/tasks/${taskId}`, 'PUT', body);
    } else {
      await api(`/projects/${projectId}/tasks`, 'POST', body);
    }
    taskModal.hide();
    await loadTasks();
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

board.addEventListener('change', (event) => {
  if (event.target.classList.contains('status-select')) {
    changeStatus(event.target.dataset.id, event.target.value);
  }
});

board.addEventListener('click', (event) => {
  const editButton = event.target.closest('.edit-task');
  const deleteButton = event.target.closest('.delete-task');
  if (editButton) {
    openTaskModal(editButton.dataset.id);
  }
  if (deleteButton) {
    deleteTask(deleteButton.dataset.id);
  }
});

// Drag and drop: si trascina la card e si rilascia su una colonna
let draggedTaskId = null;

board.addEventListener('dragstart', (event) => {
  const card = event.target.closest('.task-card');
  if (card) {
    draggedTaskId = card.dataset.id;
  }
});

document.querySelectorAll('.kanban-column').forEach((column) => {
  column.addEventListener('dragover', (event) => {
    event.preventDefault();
    column.classList.add('drag-over');
  });
  column.addEventListener('dragleave', () => column.classList.remove('drag-over'));
  column.addEventListener('drop', (event) => {
    event.preventDefault();
    column.classList.remove('drag-over');
    if (draggedTaskId) {
      changeStatus(draggedTaskId, column.dataset.status);
      draggedTaskId = null;
    }
  });
});

// ---------- Chat ----------

async function loadMessages() {
  const messages = await api(`/projects/${projectId}/messages`);
  chatBox.innerHTML = '';
  messages.forEach(addMessage);
}

function addMessage(message) {
  if (document.getElementById('msg-' + message._id)) {
    return;
  }
  const mine = message.user._id === me.id;
  chatBox.insertAdjacentHTML('beforeend', `
    <div class="chat-message ${mine ? 'mine' : ''}" id="msg-${message._id}">
      <div class="chat-author">${mine ? '' : avatar(message.user.name, 'avatar-sm')} ${esc(message.user.name)} <span class="chat-time">${formatTime(message.createdAt)}</span></div>
      <div>${esc(message.message)}</div>
    </div>`);
  chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById('chatForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();

  if (text && socket) {
    socket.emit('chatMessage', { projectId, message: text });
    input.value = '';
  }
});

// ---------- Socket.IO ----------

// Cosa mostrare nel toast per ogni evento che arriva dal server
const taskEvents = {
  taskCreated: (task) => `ha creato il task "${task.title}"`,
  taskUpdated: (task) => `ha modificato il task "${task.title}"`,
  taskMoved: (task) => `ha spostato "${task.title}" in "${STATUS_LABELS[task.status]}"`,
  taskAssigned: (task) => `ha assegnato il task "${task.title}"`,
  taskDeleted: (task) => `ha eliminato il task "${task.title}"`
};

function connectSocket() {
  socket = io({ auth: { token: getToken() } });

  // a ogni (ri)connessione si entra di nuovo nella stanza del progetto
  socket.on('connect', () => socket.emit('joinProject', projectId));
  socket.on('connect_error', () => showToast('Connessione in tempo reale non riuscita', 'danger'));
  socket.on('errorMessage', (message) => showToast(message, 'danger'));
  socket.on('newMessage', addMessage);

  Object.keys(taskEvents).forEach((eventName) => {
    socket.on(eventName, (data) => {
      loadTasks();
      if (data.by.id !== me.id) {
        showToast(`${data.by.name} ${taskEvents[eventName](data.task)}`);
      }
    });
  });
}

// ---------- Avvio ----------

loadProject().catch((err) => {
  const errorBox = document.getElementById('errorBox');
  errorBox.innerHTML = `${esc(err.message)} - <a href="/dashboard.html">torna alla dashboard</a>`;
  errorBox.classList.remove('d-none');
});
