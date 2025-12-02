// js/funcionario.js
// Lógica da tela de Funcionário

document.addEventListener('DOMContentLoaded', () => {
  protegerRota('funcionario');
  carregarUsuario();
  carregarVeiculosDisponiveis();
  carregarMinhasReservas();
  configurarFormReserva();
  configurarCheckinCheckout();
});

function protegerRota(roleEsperado) {
  const role = sessionStorage.getItem('ilumiUserRole');
  if (role !== roleEsperado) {
    window.location.href = 'index.html';
  }
}

function carregarUsuario() {
  const email = sessionStorage.getItem('ilumiUserEmail');
  const userInfo = document.getElementById('user-info');
  if (userInfo && email) {
    userInfo.textContent = email;
  }

  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn.addEventListener('click', async () => {
    await supa.auth.signOut();
    sessionStorage.clear();
    window.location.href = 'index.html';
  });
}

async function carregarVeiculosDisponiveis() {
  const selectVeiculo = document.getElementById('reserva-veiculo');

  const { data, error } = await supa
    .from('veiculos')
    .select('*')
    .eq('status', 'disponivel')
    .order('modelo', { ascending: true });

  if (error) {
    console.error(error);
    Swal.fire('Erro', 'Não foi possível carregar os veículos.', 'error');
    return;
  }

  selectVeiculo.innerHTML = '<option value="">Selecione...</option>';
  data.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `${v.modelo} (${v.placa})`;
    selectVeiculo.appendChild(opt);
  });
}

function configurarFormReserva() {
  const form = document.getElementById('form-reserva');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const veiculoId = document.getElementById('reserva-veiculo').value;
    const saida = document.getElementById('reserva-saida').value;
    const motivo = document.getElementById('reserva-motivo').value.trim();
    const email = sessionStorage.getItem('ilumiUserEmail');

    if (!veiculoId || !saida || !motivo) {
      Swal.fire('Atenção', 'Preencha todos os campos.', 'warning');
      return;
    }

    const { data: userProfile } = await supa
      .from('funcionarios')
      .select('id, nome')
      .eq('email', email)
      .maybeSingle();

    const funcionarioId = userProfile?.id;

    const { error } = await supa.from('reservas').insert({
      veiculo_id: veiculoId,
      funcionario_id: funcionarioId,
      data_saida_prevista: saida,
      motivo,
      status: 'aberta'
    });

    if (error) {
      console.error(error);
      Swal.fire('Erro', 'Não foi possível criar a reserva.', 'error');
      return;
    }

    Swal.fire('Pronto!', 'Reserva criada com sucesso.', 'success');
    form.reset();
    carregarMinhasReservas();
  });
}

async function carregarMinhasReservas() {
  const tbody = document.getElementById('tabela-minhas-reservas');
  tbody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';

  const email = sessionStorage.getItem('ilumiUserEmail');

  const { data: userProfile } = await supa
    .from('funcionarios')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  const funcionarioId = userProfile?.id;

  const { data, error } = await supa
    .from('reservas_view')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .order('data_saida_prevista', { ascending: false });

  if (error) {
    console.error(error);
    tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar reservas.</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">Você ainda não tem reservas.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  data.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.veiculo_modelo} (${r.veiculo_placa})</td>
      <td>${r.data_saida_real || r.data_saida_prevista || '-'}</td>
      <td>${r.data_retorno_real || '-'}</td>
      <td>${r.status}</td>
    `;
    tbody.appendChild(tr);
  });

  // também preenche o select de check-in/check-out
  const selectReserva = document.getElementById('check-reserva');
  selectReserva.innerHTML = '<option value="">Selecione...</option>';
  data.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = `${r.veiculo_modelo} - ${r.data_saida_prevista}`;
    selectReserva.appendChild(opt);
  });
}

function configurarCheckinCheckout() {
  const btnIn = document.getElementById('btn-checkin');
  const btnOut = document.getElementById('btn-checkout');

  btnIn.addEventListener('click', () => fazerCheck('in'));
  btnOut.addEventListener('click', () => fazerCheck('out'));
}

async function fazerCheck(tipo) {
  const reservaId = document.getElementById('check-reserva').value;
  const km = document.getElementById('check-km').value;
  const fotoInput = document.getElementById('check-foto');

  if (!reservaId || !km || !fotoInput.files[0]) {
    Swal.fire('Atenção', 'Selecione a reserva, informe o KM e envie a foto.', 'warning');
    return;
  }

  const file = fotoInput.files[0];
  const timestamp = Date.now();
  const email = sessionStorage.getItem('ilumiUserEmail');
  const path = `${email}/${reservaId}/${tipo}-${timestamp}-${file.name}`;

  const { error: uploadError } = await supa.storage
    .from('painel-fotos')
    .upload(path, file);

  if (uploadError) {
    console.error(uploadError);
    Swal.fire('Erro', 'Não foi possível enviar a foto.', 'error');
    return;
  }

  const agora = new Date().toISOString();

  let updateData = {};
  if (tipo === 'in') {
    updateData = {
      data_saida_real: agora,
      km_inicio: km,
      foto_painel_inicio: path,
      status: 'em_uso'
    };
  } else {
    updateData = {
      data_retorno_real: agora,
      km_fim: km,
      foto_painel_fim: path,
      status: 'finalizada'
    };
  }

  const { error } = await supa
    .from('reservas')
    .update(updateData)
    .eq('id', reservaId);

  if (error) {
    console.error(error);
    Swal.fire('Erro', 'Não foi possível registrar o check-' + tipo + '.', 'error');
    return;
  }

  Swal.fire('Sucesso', `Check-${tipo === 'in' ? 'in' : 'out'} registrado!`, 'success');
  document.getElementById('check-km').value = '';
  document.getElementById('check-foto').value = '';
  carregarMinhasReservas();
}
