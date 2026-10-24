// Usato da login.html e register.html: il form dice quale delle due è con data-mode
renderNavbar();

const form = document.getElementById('authForm');
const errorBox = document.getElementById('authError');
const submitButton = form.querySelector('button[type=submit]');
const isRegister = form.dataset.mode === 'register';

// dove andare dopo il login: la pagina richiesta prima (solo indirizzi interni) oppure la dashboard
function getDestination() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  return '/dashboard.html';
}

// se c'è già un token valido non serve rifare il login
// (se il token è scaduto la funzione api() lo cancella da sola)
if (getToken()) {
  api('/auth/me')
    .then(() => { window.location.href = getDestination(); })
    .catch(() => {});
}

document.getElementById('togglePassword').addEventListener('click', () => {
  const input = document.getElementById('password');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  document.getElementById('togglePassword').innerHTML = showing ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.classList.add('d-none');

  const body = {
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value
  };
  if (isRegister) {
    body.name = document.getElementById('name').value.trim();
  }

  // evita doppi invii mentre si aspetta il server
  submitButton.disabled = true;
  const label = submitButton.textContent;
  submitButton.textContent = 'Attendi...';

  try {
    const data = await api(isRegister ? '/auth/register' : '/auth/login', 'POST', body);
    saveSession(data.token, data.user);
    window.location.href = getDestination();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('d-none');
    submitButton.disabled = false;
    submitButton.textContent = label;
  }
});
