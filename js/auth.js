// js/auth.js
// Script só da tela de login

document.addEventListener('DOMContentLoaded', () => {
  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    if (!email || !password) {
      errorEl.textContent = 'Preencha usuário e senha.';
      return;
    }

    try {
      // Login no Supabase (auth de e-mail e senha)
      const { data, error } = await supa.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error(error);
        errorEl.textContent = 'Usuário ou senha inválidos.';
        return;
      }

      // Guarda o perfil básico na sessionStorage
      sessionStorage.setItem('ilumiUserRole', role);
      sessionStorage.setItem('ilumiUserEmail', email);

      if (role === 'portaria') {
        window.location.href = 'portaria.html';
      } else {
        window.location.href = 'funcionario.html';
      }

    } catch (err) {
      console.error(err);
      errorEl.textContent = 'Erro ao fazer login, tente novamente.';
    }
  });
});
