requireLogin();
renderNavbar();

// la pagina è per soli admin (i controlli veri sono comunque sul server)
if (getUser().role !== 'admin') {
  window.location.href = '/dashboard.html';
}

async function loadUsers() {
  const users = await api('/admin/users');

  document.getElementById('usersTable').innerHTML = users.map((user) => {
    const status = user.blocked
      ? '<span class="badge text-bg-danger">Bloccato</span>'
      : '<span class="badge text-bg-success">Attivo</span>';
    const action = user.role === 'admin'
      ? ''
      : `<button class="btn btn-sm btn-outline-secondary block-user" data-id="${user._id}">
           ${user.blocked ? 'Sblocca' : 'Blocca'}
         </button>`;

    return `
      <tr>
        <td>${esc(user.name)}</td>
        <td>${esc(user.email)}</td>
        <td>${user.role === 'admin' ? 'Admin' : 'Utente'}</td>
        <td>${status}</td>
        <td>${formatDate(user.createdAt)}</td>
        <td class="text-end">${action}</td>
      </tr>`;
  }).join('');
}

async function loadProjects() {
  const projects = await api('/admin/projects');

  document.getElementById('projectsTable').innerHTML = projects.map((project) => {
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
            ${project.archived ? 'Ripristina' : 'Archivia'}
          </button>
        </td>
      </tr>`;
  }).join('');
}

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
