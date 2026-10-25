// Pannello admin: elenco utenti (blocca/sblocca) ed elenco progetti (archivia/ripristina)
requireLogin();
renderNavbar();

// la pagina è solo per gli admin; i controlli veri sono comunque sul server (middleware adminOnly)
if (getUser().role !== 'admin') {
  window.location.href = '/dashboard.html';
}

// ---------- Utenti ----------

async function loadUsers() {
  const users = await api('/admin/users');

  document.getElementById('usersTable').innerHTML = users.map((user) => {
    const status = user.blocked ? badge('danger', 'Bloccato') : badge('success', 'Attivo');
    const action = user.role === 'admin'
      ? ''
      : `<button class="btn btn-sm btn-outline-secondary block-user" data-id="${user._id}">
           ${user.blocked ? '<i class="bi bi-unlock"></i> Sblocca' : '<i class="bi bi-lock"></i> Blocca'}
         </button>`;

    return `
      <tr>
        <td><span class="d-flex align-items-center gap-2">${avatar(user.name)} ${esc(user.name)}</span></td>
        <td>${esc(user.email)}</td>
        <td>${user.role === 'admin' ? badge('primary', 'Admin') : 'Utente'}</td>
        <td>${status}</td>
        <td>${formatDate(user.createdAt)}</td>
        <td class="text-end">${action}</td>
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

// ---------- Progetti ----------

async function loadProjects() {
  const projects = await api('/admin/projects');

  document.getElementById('projectsTable').innerHTML = projects.map((project) => `
    <tr>
      <td><a href="/project.html?id=${project._id}">${esc(project.title)}</a></td>
      <td>${esc(project.owner.name)}</td>
      <td>${esc(project.category)}</td>
      <td>${project.visibility === 'private' ? 'Privato' : 'Pubblico'}</td>
      <td>${project.archived ? badge('warning', 'Archiviato') : badge('success', 'Attivo')}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary archive-project" data-id="${project._id}">
          ${project.archived ? '<i class="bi bi-arrow-counterclockwise"></i> Ripristina' : '<i class="bi bi-archive"></i> Archivia'}
        </button>
      </td>
    </tr>`).join('');
}

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
