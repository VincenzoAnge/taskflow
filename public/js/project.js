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
let unread = 0;

const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
const editProjectModal = new bootstrap.Modal(document.getElementById('editProjectModal'));
const board = document.getElementById('board');
const chatBox = document.getElementById('chatBox');

// Il pulsante veloce di ogni card porta il task allo stato successivo
const NEXT_STEP = {
  todo: { status: 'doing', label: 'Inizia', icon: 'bi-play-fill' },
  doing: { status: 'done', label: 'Completa', icon: 'bi-check-lg' },
  done: { status: 'todo', label: 'Riapri', icon: 'bi-arrow-counterclockwise' }
};

fillCategorySelect(document.getElementById('editCategory'));

// ---------- Progetto ----------

async function loadProject() {
  project = await api('/projects/' + projectId);
  renderHeader();

  if (!project.isMember) {
    document.getElementById('guestArea').classList.remove('d-none');
    if (project.visibility === 'private' || project.archived) {
      document.getElementById('guestText').textContent = 'Questo progetto non accetta nuovi membri.';
    }
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
  document.getElementById('projectDescription').textContent = project.description || 'Nessuna descrizione';

  const style = coverStyle(project.category);
  const banner = document.getElementById('projectBanner');
  banner.style.background = style.gradient;
  banner.innerHTML = `<span class="cover-icon"><i class="bi ${style.icon}"></i></span>` +
    (project.coverImage ? `<img src="${esc(project.coverImage)}" alt="" onerror="this.remove()">` : '');

  const visibility = project.visibility === 'private'
    ? '<span class="badge text-bg-dark"><i class="bi bi-lock-fill"></i> Privato</span>'
    : '<span class="badge bg-success-subtle text-success-emphasis"><i class="bi bi-globe"></i> Pubblico</span>';
  const archived = project.archived ? ' <span class="badge text-bg-warning"><i class="bi bi-archive"></i> Archiviato</span>' : '';
  document.getElementById('projectBadges').innerHTML =
    `<span class="badge bg-primary-subtle text-primary-emphasis">${esc(project.category)}</span> ${visibility}${archived}`;

  document.getElementById('projectTechnologies').innerHTML = project.technologies
    .map((t) => `<span class="badge tech-badge">${esc(t)}</span>`)
    .join(' ');

  document.getElementById('projectOwner').innerHTML =
    `${avatar(project.owner.name, 'avatar-sm')} Creato da <strong>${esc(project.owner.name)}</strong> il ${formatDate(project.createdAt)}`;

  // al massimo 5 avatar, poi "+N"
  const others = project.members.length - 5;
  document.getElementById('projectMembers').innerHTML =
    project.members.slice(0, 5).map((m) => avatar(m.name)).join('') +
    (others > 0 ? `<span class="avatar" style="background:#cbd5e1;color:#334155">+${others}</span>` : '');

  renderActions();
}

function renderActions() {
  const actions = document.getElementById('projectActions');

  if (project.isOwner) {
    actions.innerHTML = `
      <button class="btn btn-outline-secondary" id="editProjectBtn"><i class="bi bi-pencil"></i> Modifica</button>
      <div class="dropdown">
        <button class="btn btn-outline-secondary" data-bs-toggle="dropdown" id="projectMenuBtn" aria-label="Altre azioni">
          <i class="bi bi-three-dots"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><button class="dropdown-item" id="archiveBtn">
            <i class="bi bi-archive"></i> ${project.archived ? 'Ripristina progetto' : 'Archivia progetto'}
          </button></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item text-danger" id="deleteProjectBtn"><i class="bi bi-trash"></i> Elimina progetto</button></li>
        </ul>
      </div>`;
    document.getElementById('editProjectBtn').addEventListener('click', openEditProject);
    document.getElementById('archiveBtn').addEventListener('click', toggleArchive);
    document.getElementById('deleteProjectBtn').addEventListener('click', deleteProject);
  } else if (project.isMember) {
    actions.innerHTML = '<button class="btn btn-outline-danger" id="leaveBtn"><i class="bi bi-box-arrow-left"></i> Lascia il progetto</button>';
    document.getElementById('leaveBtn').addEventListener('click', leaveProject);
  } else if (project.visibility === 'public' && !project.archived) {
    actions.innerHTML = '<button class="btn btn-primary btn-lg" id="joinBtn"><i class="bi bi-box-arrow-in-right"></i> Partecipa al progetto</button>';
    document.getElementById('joinBtn').addEventListener('click', joinProject);
  }
}

function renderProgress() {
  const done = tasks.filter((t) => t.status === 'done').length;
  const percent = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  document.getElementById('progressBox').classList.remove('d-none');
  document.getElementById('progressText').textContent = `${done} di ${tasks.length} task completati (${percent}%)`;
  document.getElementById('progressBar').style.width = percent + '%';
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
  document.getElementById('membersCount').textContent = project.members.length;

  document.getElementById('membersList').innerHTML = project.members.map((member) => {
    const isOwner = member._id === project.owner._id;
    const removeButton = project.isOwner && !isOwner
      ? `<button class="btn btn-sm btn-outline-danger remove-member" data-id="${member._id}"><i class="bi bi-person-dash"></i> Rimuovi</button>`
      : '';
    const openTasks = tasks.filter((t) => t.assignee && t.assignee._id === member._id && t.status !== 'done').length;

    return `
      <li class="list-group-item d-flex justify-content-between align-items-center gap-2 py-3">
        <div class="d-flex align-items-center gap-3">
          ${avatar(member.name, 'avatar-lg')}
          <div>
            <div class="fw-semibold">${esc(member.name)}
              ${isOwner ? '<span class="badge bg-primary-subtle text-primary-emphasis">Proprietario</span>' : ''}</div>
            <div class="small text-muted">${esc(member.email)} &middot; ${openTasks} task aperti</div>
          </div>
        </div>
        ${removeButton}
      </li>`;
  }).join('');

  document.getElementById('memberFormCard').classList.toggle('d-none', !project.isOwner);
}

document.getElementById('membersList').addEventListener('click', async (event) => {
  const button = event.target.closest('.remove-member');
  if (!button || !confirm('Rimuovere questo membro dal progetto?')) {
    return;
  }
  try {
    project.members = await api(`/projects/${projectId}/members/${button.dataset.id}`, 'DELETE');
    await loadTasks();
    renderHeader();
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
    renderHeader();
    showToast('Membro aggiunto', 'success');
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

// ---------- Task e board Kanban ----------

async function loadTasks() {
  tasks = await api(`/projects/${projectId}/tasks`);
  renderBoard();
  renderProgress();
  renderMembers();
}

function taskCard(task) {
  const next = NEXT_STEP[task.status];
  const assignee = task.assignee
    ? `${avatar(task.assignee.name, 'avatar-sm')} ${esc(task.assignee.name)}`
    : '<span class="text-muted"><i class="bi bi-person-dash"></i> Nessuno</span>';
  const description = task.description ? `<p class="small text-muted mb-2 line-clamp-2">${esc(task.description)}</p>` : '';

  return `
    <div class="card task-card prio-${task.priority} mb-2" draggable="true" data-id="${task._id}">
      <div class="card-body p-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="badge prio-badge">${PRIORITY_LABELS[task.priority]}</span>
          <div class="dropdown">
            <button class="btn btn-sm btn-icon" data-bs-toggle="dropdown" aria-label="Azioni"><i class="bi bi-three-dots"></i></button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><button class="dropdown-item edit-task" data-id="${task._id}"><i class="bi bi-pencil"></i> Modifica</button></li>
              <li><button class="dropdown-item text-danger delete-task" data-id="${task._id}"><i class="bi bi-trash"></i> Elimina</button></li>
            </ul>
          </div>
        </div>
        <h6 class="mb-1">${esc(task.title)}</h6>
        ${description}
        <div class="task-meta mb-3"><span>${assignee}</span>${dueLabel(task)}</div>
        <button class="btn btn-sm btn-light w-100 move-task" data-id="${task._id}" data-status="${next.status}">
          <i class="bi ${next.icon}"></i> ${next.label}
        </button>
      </div>
    </div>`;
}

// Ricerca per titolo e filtro "solo i miei task" (fatti nel browser, senza chiamare il server)
function visibleTasks() {
  const search = document.getElementById('taskSearch').value.trim().toLowerCase();
  const onlyMine = document.getElementById('onlyMine').checked;

  return tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(search);
    const isMine = task.assignee && task.assignee._id === me.id;
    return matchesSearch && (!onlyMine || isMine);
  });
}

function renderBoard() {
  const shown = visibleTasks();

  Object.keys(STATUS_LABELS).forEach((status) => {
    const columnTasks = shown.filter((task) => task.status === status);
    document.getElementById('count-' + status).textContent = columnTasks.length;
    document.getElementById('col-' + status).innerHTML = columnTasks.length > 0
      ? columnTasks.map(taskCard).join('')
      : '<div class="empty-state mb-2"><i class="bi bi-inbox"></i>Nessun task</div>';
  });
}

document.getElementById('taskSearch').addEventListener('input', renderBoard);
document.getElementById('onlyMine').addEventListener('change', renderBoard);

async function changeStatus(taskId, status) {
  try {
    await api(`/projects/${projectId}/tasks/${taskId}/status`, 'PATCH', { status });
  } catch (err) {
    showToast(err.message, 'danger');
  }
  await loadTasks();
}

async function deleteTask(taskId) {
  if (!confirm('Eliminare questo task?')) {
    return false;
  }
  try {
    await api(`/projects/${projectId}/tasks/${taskId}`, 'DELETE');
    await loadTasks();
    return true;
  } catch (err) {
    showToast(err.message, 'danger');
    return false;
  }
}

// Apre il modal vuoto (nuovo task, nella colonna indicata) oppure precompilato (modifica)
function openTaskModal(taskId, status = 'todo') {
  const task = tasks.find((t) => t._id === taskId);

  document.getElementById('taskModalTitle').textContent = task ? 'Modifica task' : 'Nuovo task';
  document.getElementById('taskId').value = task ? task._id : '';
  document.getElementById('taskTitle').value = task ? task.title : '';
  document.getElementById('taskDescription').value = task ? task.description : '';
  document.getElementById('taskPriority').value = task ? task.priority : 'medium';
  document.getElementById('taskStatus').value = task ? task.status : status;
  document.getElementById('taskDueDate').value = task && task.dueDate ? task.dueDate.slice(0, 10) : '';
  document.getElementById('deleteTaskBtn').classList.toggle('d-none', !task);

  const assigneeSelect = document.getElementById('taskAssignee');
  assigneeSelect.innerHTML = '<option value="">Nessuno</option>' +
    project.members.map((m) => `<option value="${m._id}">${esc(m.name)}</option>`).join('');
  assigneeSelect.value = task && task.assignee ? task.assignee._id : '';

  taskModal.show();
}

document.getElementById('newTaskBtn').addEventListener('click', () => openTaskModal(null));

document.getElementById('taskModal').addEventListener('shown.bs.modal', () => {
  document.getElementById('taskTitle').focus();
});

document.getElementById('deleteTaskBtn').addEventListener('click', async () => {
  if (await deleteTask(document.getElementById('taskId').value)) {
    taskModal.hide();
  }
});

document.getElementById('taskForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const taskId = document.getElementById('taskId').value;
  const status = document.getElementById('taskStatus').value;
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
      // lo stato ha un endpoint dedicato
      const oldTask = tasks.find((t) => t._id === taskId);
      if (oldTask.status !== status) {
        await api(`/projects/${projectId}/tasks/${taskId}/status`, 'PATCH', { status });
      }
    } else {
      await api(`/projects/${projectId}/tasks`, 'POST', { ...body, status });
    }
    taskModal.hide();
    await loadTasks();
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

board.addEventListener('click', (event) => {
  const addButton = event.target.closest('.add-task-btn');
  const moveButton = event.target.closest('.move-task');
  const editButton = event.target.closest('.edit-task');
  const deleteButton = event.target.closest('.delete-task');
  const card = event.target.closest('.task-card');

  if (addButton) {
    openTaskModal(null, addButton.dataset.status);
  } else if (moveButton) {
    changeStatus(moveButton.dataset.id, moveButton.dataset.status);
  } else if (editButton) {
    openTaskModal(editButton.dataset.id);
  } else if (deleteButton) {
    deleteTask(deleteButton.dataset.id);
  } else if (card && !event.target.closest('.dropdown')) {
    // click sul resto della card = apri i dettagli
    openTaskModal(card.dataset.id);
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
  chatBox.innerHTML = messages.length > 0
    ? ''
    : '<div class="empty-state" id="chatEmpty"><i class="bi bi-chat-heart"></i>Nessun messaggio, scrivi tu il primo!</div>';
  messages.forEach(addMessage);
}

function addMessage(message) {
  if (document.getElementById('msg-' + message._id)) {
    return;
  }
  const empty = document.getElementById('chatEmpty');
  if (empty) {
    empty.remove();
  }

  const mine = message.user._id === me.id;
  chatBox.insertAdjacentHTML('beforeend', `
    <div class="chat-message ${mine ? 'mine' : ''}" id="msg-${message._id}">
      <div class="chat-author">${mine ? '' : avatar(message.user.name, 'avatar-sm')} ${esc(message.user.name)} <span class="chat-time">${formatTime(message.createdAt)}</span></div>
      <div>${esc(message.message)}</div>
    </div>`);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function isChatOpen() {
  return document.getElementById('chatTab').classList.contains('active');
}

// Messaggio arrivato in tempo reale: se la chat non è aperta si aggiorna il contatore
function receiveMessage(message) {
  addMessage(message);
  if (!isChatOpen() && message.user._id !== me.id) {
    unread++;
    const badge = document.getElementById('unreadBadge');
    badge.textContent = unread;
    badge.classList.remove('d-none');
    showToast(`${message.user.name}: ${message.message}`);
  }
}

document.getElementById('chatTabBtn').addEventListener('shown.bs.tab', () => {
  unread = 0;
  document.getElementById('unreadBadge').classList.add('d-none');
  chatBox.scrollTop = chatBox.scrollHeight;
  document.getElementById('chatInput').focus();
});

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
  socket.on('newMessage', receiveMessage);

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
