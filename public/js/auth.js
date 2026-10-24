// Usato da login.html e register.html: il form dice quale delle due è con data-mode
renderNavbar();

const form = document.getElementById('authForm');
const errorBox = document.getElementById('authError');
const isRegister = form.dataset.mode === 'register';

if (getToken()) {
  window.location.href = '/dashboard.html';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.classList.add('d-none');

  const body = {
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  };
  if (isRegister) {
    body.name = document.getElementById('name').value;
  }

  try {
    const data = await api(isRegister ? '/auth/register' : '/auth/login', 'POST', body);
    saveSession(data.token, data.user);
    window.location.href = '/dashboard.html';
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('d-none');
  }
});
