document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      errorEl.textContent = 'Preencha usuário e senha.';
      return;
    }

    try {
      // Login no Supabase
      const { data, error } = await supa.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error(error);
        errorEl.textContent = 'Usuário ou senha inválidos.';
        return;
      }

      // ---------- DEFINIR ROLE AUTOMATICAMENTE ----------
      let role = "funcionario";

      if (email.toLowerCase() === "portaria@ilumi.com" || email.toLowerCase() === "portaria") {
        role = "portaria";
      }

      // Salvar sessão
      sessionStorage.setItem('ilumiUserRole', role);
      sessionStorage.setItem('ilumiUserEmail', email);

      // Redirecionar
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