requireLogin();
renderNavbar();

// la pagina è per soli admin (i controlli veri sono comunque sul server)
if (getUser().role !== 'admin') {
  window.location.href = '/dashboard.html';
}

let users = [];
let projects = [];

// La ricerca filtra le righe già scaricate
function matches(...fields) {
  const search = document.getElementById('adminSearch').value.trim().toLowerCase();
  return fields.some((field) => String(field).toLowerCase().includes(search));
}

async function loadUsers() {
  users = await api('/admin/users');
  document.getElementById('statUsers').textContent = users.length;
  document.getElementById('statBlocked').textContent = users.filter((u) => u.blocked).length;
  renderUsers();
}

function renderUsers() {
  document.getElementById('usersTable').innerHTML = users.filter((u) => matches(u.name, u.email)).map((user) => {
    const status = user.blocked
      ? '<span class="badge text-bg-danger">Bloccato</span>'
      : '<span class="badge text-bg-success">Attivo</span>';
    const action = user.role === 'admin'
      ? ''
      : `<button class="btn btn-sm ${user.blocked ? 'btn-outline-success' : 'btn-outline-danger'} block-user" data-id="${user._id}">
           <i class="bi ${user.blocked ? 'bi-unlock' : 'bi-lock'}"></i> ${user.blocked ? 'Sblocca' : 'Blocca'}
         </button>`;

    return `
      <tr>
        <td><span class="d-flex align-items-center gap-2">${avatar(user.name)} ${esc(user.name)}</span></td>
        <td>${esc(user.email)}</td>
        <td>${user.role === 'admin' ? '<span class="badge bg-primary-subtle text-primary-emphasis">Admin</span>' : 'Utente'}</td>
        <td>${status}</td>
        <td>${formatDate(user.createdAt)}</td>
        <td class="text-end">${action}</td>
      </tr>`;
  }).join('');
}

async function loadProjects() {
  projects = await api('/admin/projects');
  document.getElementById('statProjectsAdmin').textContent = projects.length;
  document.getElementById('statArchived').textContent = projects.filter((p) => p.archived).length;
  renderProjects();
}

function renderProjects() {
  document.getElementById('projectsTable').innerHTML = projects.filter((p) => matches(p.title, p.owner.name)).map((project) => {
    const status = project.archived
      ? '<span class="badge text-bg-warning">Archiviato</span>'
      : '<span class="badge text-bg-success">Attivo</span>';

    return `
      <tr>
        <td><a href="/project.html?id=${project._id}">${esc(project.title)}</a></td>
        <td>${esc(project.owner.name)}</td>
        <td>${esc(project.category)}</td>
        <td>${project.visibility === 'private' ? 'Privato' : 'Pubblico'}</td>
        <td>${status}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary archive-project" data-id="${project._id}">
            <i class="bi ${project.archived ? 'bi-arrow-counterclockwise' : 'bi-archive'}"></i> ${project.archived ? 'Ripristina' : 'Archivia'}
          </button>
        </td>
      </tr>`;
  }).join('');
}

document.getElementById('adminSearch').addEventListener('input', () => {
  renderUsers();
  renderProjects();
});

document.getElementById('usersTable').addEventListener('click', async (event) => {
  const button = event.target.closest('.block-user');
  if (!button) {
    return;
  }
  try {
    await api(`/admin/users/${button.dataset.id}/block`, 'PATCH');
    await loadUsers();
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

document.getElementById('projectsTable').addEventListener('click', async (event) => {
  const button = event.target.closest('.archive-project');
  if (!button) {
    return;
  }
  try {
    await api(`/admin/projects/${button.dataset.id}/archive`, 'PATCH');
    await loadProjects();
  } catch (err) {
    showToast(err.message, 'danger');
  }
});

loadUsers().catch((err) => showToast(err.message, 'danger'));
loadProjects().catch((err) => showToast(err.message, 'danger'));
