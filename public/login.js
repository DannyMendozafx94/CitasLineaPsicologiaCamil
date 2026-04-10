const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberMeInput = document.getElementById('rememberMe');
const togglePasswordButton = document.getElementById('togglePassword');
const forgotPasswordButton = document.getElementById('forgotPassword');
const googleButton = document.getElementById('googleButton');
const feedback = document.getElementById('feedback');

const setFeedback = (message, isError = false) => {
  feedback.textContent = message;
  feedback.style.background = isError
    ? 'rgba(127, 24, 35, 0.92)'
    : 'rgba(40, 72, 90, 0.92)';
  feedback.classList.add('is-visible');

  window.clearTimeout(setFeedback.timerId);
  setFeedback.timerId = window.setTimeout(() => {
    feedback.classList.remove('is-visible');
  }, 3400);
};

const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo completar la solicitud.');
  }

  return data;
};

const checkActiveSession = async () => {
  try {
    await fetchJson('/api/auth/session');
    window.location.href = '/dashboard';
  } catch (error) {
    emailInput.value = 'admin@psicologa.com';
    passwordInput.value = 'admin123';
  }
};

togglePasswordButton.addEventListener('click', () => {
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
  togglePasswordButton.textContent = showing ? 'Ver' : 'Ocultar';
});

forgotPasswordButton.addEventListener('click', () => {
  setFeedback(
    'La recuperacion aun no esta conectada. Usa las credenciales del administrador local.',
    false
  );
});

googleButton.addEventListener('click', () => {
  setFeedback(
    'El acceso con Google todavia es solo visual en este MVP.',
    false
  );
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: emailInput.value,
        password: passwordInput.value,
        rememberMe: rememberMeInput.checked,
      }),
    });

    window.location.href = '/dashboard';
  } catch (error) {
    setFeedback(error.message, true);
  }
});

checkActiveSession();
