// Pagina di un progetto: intestazione, board Kanban, chat e membri.
// Le parti in tempo reale (chat e aggiornamenti dei task) usano Socket.IO.
requireLogin();
renderNavbar();

const projectId = new URLSearchParams(window.location.search).get('id');
if (!projectId) {
  window.location.href = '/dashboard.html';
}

const me = getUser();
let project = null; // dati del progetto ricevuti dal server
let tasks = [];     // task del progetto
let socket = null;

const taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
const editProjectModal = new bootstrap.Modal(document.getElementById('editProjectModal'));
const board = document.getElementById('board');
const chatBox = document.getElementById('chatBox');

// Il pulsante di ogni card porta il task allo stato successivo
const NEXT_STEP = {
  todo: { status: 'doing', label: 'Inizia', icon: 'bi-play-fill' },
  doing: { status: 'done', label: 'Completa', icon: 'bi-check-lg' },
  done: { status: 'todo', label: 'Riapri', icon: 'bi-arrow-counterclockwise' }
};

fillCategorySelect(document.getElementById('editCategory'));

// ---------- Caricamento iniziale ----------

async function loadProject() {
  project = await api('/projects/' + projectId);
  renderHeader();

  // chi non è membro vede solo l'intestazione (e il pulsante "Partecipa" se il progetto è pubblico)
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

// ---------- Intestazione e azioni sul progetto ----------

function renderHeader() {
  document.title = project.title + ' - TaskFlow';
  document.getElementById('projectHeader').classList.remove('d-none');
  document.getElementById('projectCover').innerHTML = projectCover(project);
  document.getElementById('projectTitle').textContent = project.title;
  document.getElementById('projectDescription').textContent = project.description || 'Nessuna descrizione';

  const visibility = project.visibility === 'private'
    ? badge('secondary', '<i class="bi bi-lock"></i> Privato')
    : badge('success', '<i class="bi bi-globe"></i> Pubblico');
  const archived = project.archived ? badge('warning', 'Archiviato') : '';
  document.getElementById('projectBadges').innerHTML = `${badge('primary', esc(project.category))} ${visibility} ${archived}`;

  document.getElementById('projectTechnologies').innerHTML = project.technologies
    .map((t) => `<span class="tech">${esc(t)}</span>`)
    .join('');
  document.getElementById('projectOwner').innerHTML =
    `${avatar(project.owner.name, 'avatar-sm')} Creato da ${esc(project.owner.name)} il ${formatDate(project.createdAt)}`;

  renderActions();
}

// I pulsanti cambiano in base al ruolo: proprietario, membro o visitatore
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
    actions.innerHTML = '<button class="btn btn-outline-danger btn-sm" id="leaveBtn"><i class="bi bi-box-arrow-left"></i> Lascia il progetto</button>';
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
  document.getElementById('membersList').innerHTML = project.members.map((member) => {
    const isOwner = member._id === project.owner._id;
    const removeButton = project.isOwner && !isOwner
      ? `<button class="btn btn-sm btn-outline-danger remove-member" data-id="${member._id}" title="Rimuovi"><i class="bi bi-x-lg"></i></button>`
      : '';

    return `
      <li class="list-group-item d-flex justify-content-between align-items-center gap-2 px-0">
        <div class="d-flex align-items-center gap-2">
          ${avatar(member.name)}
          <div>
            <div class="fw-semibold">${esc(member.name)} ${isOwner ? badge('primary', 'Proprietario') : ''}</div>
            <div class="small text-secondary">${esc(member.email)}</div>
          </div>
        </div>
        ${removeButton}
      </li>`;
  }).join('');

  // solo il proprietario vede il form per aggiungere membri
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

// ---------- Board Kanban ----------

async function loadTasks() {
  tasks = await api(`/projects/${projectId}/tasks`);
  renderBoard();
}

function taskCard(task) {
  const next = NEXT_STEP[task.status];
  const assignee = task.assignee
    ? `<span class="d-flex align-items-center gap-1">${avatar(task.assignee.name, 'avatar-sm')} ${esc(task.assignee.name)}</span>`
    : '<span><i class="bi bi-person"></i> Nessuno</span>';
  const description = task.description
    ? `<p class="small text-secondary mb-2 line-clamp-2">${esc(task.description)}</p>`
    : '';

  return `
    <div class="card task-card" draggable="true" data-id="${task._id}">
      <div class="card-body p-3">
        <div class="mb-2">${badge(PRIORITY_COLORS[task.priority], 'Priorità ' + PRIORITY_LABELS[task.priority].toLowerCase())}</div>
        <h6>${esc(task.title)}</h6>
        ${description}
        <div class="task-meta mb-3">${assignee} ${dueDate(task)}</div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary flex-grow-1 move-task" data-id="${task._id}" data-status="${next.status}">
            <i class="bi ${next.icon}"></i> ${next.label}
          </button>
          <button class="btn btn-sm btn-outline-secondary edit-task" data-id="${task._id}" title="Modifica"><i class="bi bi-pencil"></i></button>
        </div>
      </div>
    </div>`;
}

// Divide i task nelle tre colonne in base allo stato
function renderBoard() {
  Object.keys(STATUS_LABELS).forEach((status) => {
    const columnTasks = tasks.filter((task) => task.status === status);
    document.getElementById('count-' + status).textContent = columnTasks.length;
    document.getElementById('col-' + status).innerHTML = columnTasks.length > 0
      ? columnTasks.map(taskCard).join('')
      : emptyState('bi-inbox', 'Nessun task');
  });
}

async function changeStatus(taskId, status) {
  try {
    await api(`/projects/${projectId}/tasks/${taskId}/status`, 'PATCH', { status });
  } catch (err) {
    showToast(err.message, 'danger');
  }
  await loadTasks();
}

// Apre la finestra del task: vuota per un nuovo task, già compilata per una modifica
function openTaskModal(taskId) {
  const task = tasks.find((t) => t._id === taskId);

  document.getElementById('taskModalTitle').textContent = task ? 'Modifica task' : 'Nuovo task';
  document.getElementById('taskId').value = task ? task._id : '';
  document.getElementById('taskTitle').value = task ? task.title : '';
  document.getElementById('taskDescription').value = task ? task.description : '';
  document.getElementById('taskPriority').value = task ? task.priority : 'medium';
  document.getElementById('taskStatus').value = task ? task.status : 'todo';
  document.getElementById('taskDueDate').value = task && task.dueDate ? task.dueDate.slice(0, 10) : '';
  document.getElementById('deleteTaskBtn').classList.toggle('d-none', !task);

  // si può assegnare un task solo a un membro del progetto
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
      // lo stato si cambia con il suo endpoint dedicato, solo se è diverso
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

document.getElementById('deleteTaskBtn').addEventListener('click', async () => {
  if (!confirm('Eliminare questo task?')) {
    return;
  }
  try {
    await api(`/projects/${projectId}/tasks/${document.getElementById('taskId').value}`, 'DELETE');
    taskModal.hide();
    await loadTasks();
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

// Un solo listener per tutti i pulsanti delle card (le card vengono ricreate a ogni aggiornamento)
board.addEventListener('click', (event) => {
  const moveButton = event.target.closest('.move-task');
  const editButton = event.target.closest('.edit-task');

  if (moveButton) {
    changeStatus(moveButton.dataset.id, moveButton.dataset.status);
  } else if (editButton) {
    openTaskModal(editButton.dataset.id);
  }
});

// Drag and drop: si trascina una card e la si rilascia su un'altra colonna
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
  // lo stesso messaggio non va mostrato due volte
  if (document.getElementById('msg-' + message._id)) {
    return;
  }
  const mine = message.user._id === me.id;
  chatBox.insertAdjacentHTML('beforeend', `
    <div class="chat-message ${mine ? 'mine' : ''}" id="msg-${message._id}">
      <div class="chat-author">${esc(message.user.name)} · ${formatTime(message.createdAt)}</div>
      <div>${esc(message.message)}</div>
    </div>`);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Il messaggio non viene salvato con fetch: lo invia Socket.IO, il server lo salva e lo manda a tutti
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

// Testo del toast per ogni evento sui task che arriva dal server
const taskEvents = {
  taskCreated: (task) => `ha creato il task "${task.title}"`,
  taskUpdated: (task) => `ha modificato il task "${task.title}"`,
  taskMoved: (task) => `ha spostato "${task.title}" in "${STATUS_LABELS[task.status]}"`,
  taskAssigned: (task) => `ha assegnato il task "${task.title}"`,
  taskDeleted: (task) => `ha eliminato il task "${task.title}"`
};

function connectSocket() {
  socket = io({ auth: { token: getToken() } });

  // a ogni connessione (anche dopo una riconnessione) si entra nella stanza del progetto
  socket.on('connect', () => socket.emit('joinProject', projectId));
  socket.on('connect_error', () => showToast('Connessione in tempo reale non riuscita', 'danger'));
  socket.on('errorMessage', (message) => showToast(message, 'danger'));
  socket.on('newMessage', addMessage);

  Object.keys(taskEvents).forEach((eventName) => {
    socket.on(eventName, (data) => {
      loadTasks();
      // il toast lo vedono solo gli altri membri, non chi ha fatto la modifica
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
