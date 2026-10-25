// Login e registrazione: lo stesso script serve entrambe le pagine.
// L'attributo data-mode del form dice in quale pagina siamo ("login" o "register").
renderNavbar();

const form = document.getElementById('authForm');
const errorBox = document.getElementById('authError');
const submitButton = form.querySelector('button[type=submit]');
const isRegister = form.dataset.mode === 'register';

// Dopo il login si va alla pagina richiesta prima (solo indirizzi interni) oppure alla dashboard
function getDestination() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  return '/dashboard.html';
}

// Se c'è già un token valido non serve rifare il login
if (getToken()) {
  api('/auth/me')
    .then(() => { window.location.href = getDestination(); })
    .catch(() => {});
}

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

  // il bottone resta disabilitato finché il server non risponde (evita doppi invii)
  submitButton.disabled = true;

  try {
    const data = await api(isRegister ? '/auth/register' : '/auth/login', 'POST', body);
    saveSession(data.token, data.user);
    window.location.href = getDestination();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('d-none');
    submitButton.disabled = false;
  }
});
