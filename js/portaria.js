// ----------------------------------------------------
// PORTARIA - ILUMI SISTEMA DE VEÍCULOS
// ----------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  protegerRota("portaria");
  configurarMenu();
  carregarUsuario();

  carregarVeiculos();
  carregarReservas();
  carregarHistoricoFiltros();
  carregarHistorico();

  // Botões principais
  const btnNovoVeiculo = document.getElementById("btn-novo-veiculo");
  if (btnNovoVeiculo) btnNovoVeiculo.addEventListener("click", abrirModalNovoVeiculo);

  const btnNovaReserva = document.getElementById("btn-nova-reserva");
  if (btnNovaReserva) btnNovaReserva.addEventListener("click", abrirModalNovaReserva);

  const btnNovoUsuario = document.getElementById("btn-novo-usuario");
  if (btnNovoUsuario) btnNovoUsuario.addEventListener("click", abrirModalNovoFuncionario);

  // Eventos do histórico
  document.getElementById("filtro-historico-veiculo")?.addEventListener("change", carregarHistorico);
  document.getElementById("filtro-historico-funcionario")?.addEventListener("change", carregarHistorico);
  document.getElementById("filtro-historico-data")?.addEventListener("change", carregarHistorico);

  // Eventos de filtro em reservas (se existirem no HTML)
  document.getElementById("filtro-reserva-veiculo")?.addEventListener("change", carregarReservas);
  document.getElementById("filtro-reserva-funcionario")?.addEventListener("change", carregarReservas);
});

// ----------------------------------------------------
// Proteção da rota
// ----------------------------------------------------
function protegerRota(roleEsperado) {
  const role = sessionStorage.getItem("ilumiUserRole");
  if (role !== roleEsperado) {
    window.location.href = "index.html";
  }
}

// ----------------------------------------------------
// Dados do usuário logado
// ----------------------------------------------------
function carregarUsuario() {
  const email = sessionStorage.getItem("ilumiUserEmail");
  const userInfo = document.getElementById("user-info");
  if (userInfo) userInfo.textContent = email ?? "";

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supa.auth.signOut();
      sessionStorage.clear();
      window.location.href = "index.html";
    });
  }
}

// ----------------------------------------------------
// MENU lateral e troca de telas
// ----------------------------------------------------
function configurarMenu() {
  const btns = document.querySelectorAll("#portaria-menu button");
  const screens = document.querySelectorAll(".screen");

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-screen");

      btns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      screens.forEach((sc) => {
        sc.classList.toggle("d-none", sc.id !== "screen-" + target);
      });

      // Ao entrar em Reservas → filtros + lista
      if (target === "reservas") {
        carregarFiltrosReservas();
        carregarReservas();
      }

      // Ao entrar em Usuários → lista de funcionários
      if (target === "usuarios") {
        carregarUsuarios();
      }

      // Ao entrar em Histórico → recarregar histórico
      if (target === "historico") {
        carregarHistorico();
      }
    });
  });
}

// ----------------------------------------------------
// VEÍCULOS - Carregar
// ----------------------------------------------------
async function carregarVeiculos() {
  const tbody = document.getElementById("tabela-veiculos");
  if (!tbody) return;

  tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

  const { data, error } = await supa
    .from("veiculos")
    .select("*")
    .order("modelo");

  if (error) {
    console.error(error);
    tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar.</td></tr>";
    return;
  }

  if (!data || !data.length) {
    tbody.innerHTML = "<tr><td colspan='5'>Nenhum veículo encontrado.</td></tr>";
    return;
  }

  tbody.innerHTML = "";
  data.forEach((v) => {
    tbody.innerHTML += `
      <tr>
        <td>${v.placa}</td>
        <td>${v.modelo}</td>
        <td>${v.km_atual ?? "-"}</td>
        <td>${v.status ?? "-"}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEditarVeiculo('${v.id}')">
            Editar
          </button>
        </td>
      </tr>
    `;
  });
}

// ----------------------------------------------------
// MODAL - Novo veículo
// ----------------------------------------------------
function abrirModalNovoVeiculo() {
  const modalHtml = `
<div class="modal fade" id="modalVeiculo" tabindex="-1">
  <div class="modal-dialog"><div class="modal-content">

    <div class="modal-header bg-ilumi text-white">
      <h5 class="modal-title">Adicionar Veículo</h5>
      <button class="btn-close" data-bs-dismiss="modal"></button>
    </div>

    <div class="modal-body">

      <label class="form-label">Placa</label>
      <input id="veic-placa" class="form-control mb-2">

      <label class="form-label">Modelo</label>
      <input id="veic-modelo" class="form-control mb-2">

      <label class="form-label">KM Atual</label>
      <input id="veic-km" type="number" class="form-control mb-2">

      <label class="form-label">Status</label>
      <select id="veic-status" class="form-select">
        <option value="disponivel">Disponível</option>
        <option value="manutencao">Manutenção</option>
      </select>

    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-ilumi" onclick="salvarNovoVeiculo()">Salvar</button>
    </div>

  </div></div>
</div>`;
  const container = document.getElementById("modal-container");
  if (!container) return;
  container.innerHTML = modalHtml;

  const modalEl = document.getElementById("modalVeiculo");
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// ----------------------------------------------------
// SALVAR - Novo veículo
// ----------------------------------------------------
async function salvarNovoVeiculo() {
  const placa = document.getElementById("veic-placa")?.value.trim();
  const modelo = document.getElementById("veic-modelo")?.value.trim();
  const km = document.getElementById("veic-km")?.value;
  const status = document.getElementById("veic-status")?.value;

  if (!placa || !modelo) {
    Swal.fire("Atenção", "Preencha placa e modelo.", "warning");
    return;
  }

  const { error } = await supa.from("veiculos").insert({
    placa,
    modelo,
    km_atual: km || 0,
    status,
  });

  if (error) {
    console.error(error);
    Swal.fire("Erro", "Falha ao salvar veículo.", "error");
    return;
  }

  const modalEl = document.getElementById("modalVeiculo");
  if (modalEl) {
    bootstrap.Modal.getInstance(modalEl)?.hide();
  }
  Swal.fire("Sucesso!", "Veículo cadastrado.", "success");
  carregarVeiculos();
}

// ----------------------------------------------------
// MODAL - Editar veículo
// ----------------------------------------------------
async function abrirModalEditarVeiculo(id) {
  const { data, error } = await supa
    .from("veiculos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    console.error(error);
    Swal.fire("Erro", "Veículo não encontrado.", "error");
    return;
  }

  const modalHtml = `
<div class="modal fade" id="modalVeiculo" tabindex="-1">
  <div class="modal-dialog"><div class="modal-content">

    <div class="modal-header bg-primary text-white">
      <h5 class="modal-title">Editar Veículo</h5>
      <button class="btn-close" data-bs-dismiss="modal"></button>
    </div>

    <div class="modal-body">

      <label class="form-label">Placa</label>
      <input id="veic-placa" class="form-control mb-2" value="${data.placa}">

      <label class="form-label">Modelo</label>
      <input id="veic-modelo" class="form-control mb-2" value="${data.modelo}">

      <label class="form-label">KM Atual</label>
      <input id="veic-km" type="number" class="form-control mb-2" value="${data.km_atual ?? ""}">

      <label class="form-label">Status</label>
      <select id="veic-status" class="form-select">
        <option value="disponivel" ${data.status === "disponivel" ? "selected" : ""}>Disponível</option>
        <option value="manutencao" ${data.status === "manutencao" ? "selected" : ""}>Manutenção</option>
        <option value="em_uso" ${data.status === "em_uso" ? "selected" : ""}>Em uso</option>
      </select>

    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarEdicaoVeiculo('${id}')">Salvar</button>
    </div>

  </div></div>
</div>`;
  const container = document.getElementById("modal-container");
  if (!container) return;
  container.innerHTML = modalHtml;

  const modalEl = document.getElementById("modalVeiculo");
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// ----------------------------------------------------
// SALVAR - Editar veículo
// ----------------------------------------------------
async function salvarEdicaoVeiculo(id) {
  const placa = document.getElementById("veic-placa")?.value.trim();
  const modelo = document.getElementById("veic-modelo")?.value.trim();
  const km = document.getElementById("veic-km")?.value;
  const status = document.getElementById("veic-status")?.value;

  const { error } = await supa
    .from("veiculos")
    .update({
      placa,
      modelo,
      km_atual: km,
      status,
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    Swal.fire("Erro", "Falha ao atualizar veículo.", "error");
    return;
  }

  const modalEl = document.getElementById("modalVeiculo");
  if (modalEl) {
    bootstrap.Modal.getInstance(modalEl)?.hide();
  }
  Swal.fire("Sucesso!", "Veículo atualizado!", "success");
  carregarVeiculos();
}

// ----------------------------------------------------
// RESERVAS - Carregar
// ----------------------------------------------------
async function carregarReservas() {
  const tbody = document.getElementById("tabela-reservas");
  if (!tbody) return;

  tbody.innerHTML = "<tr><td colspan='6'>Carregando...</td></tr>";

  const filtroVeic = document.getElementById("filtro-reserva-veiculo")?.value;
  const filtroFunc = document.getElementById("filtro-reserva-funcionario")?.value;

  let query = supa.from("reservas_view").select("*");

  if (filtroVeic) query = query.eq("veiculo_id", filtroVeic);
  if (filtroFunc) query = query.eq("funcionario_id", filtroFunc);

  const { data, error } = await query.order("data_saida_prevista", { ascending: false });

  if (error) {
    console.error(error);
    tbody.innerHTML = "<tr><td colspan='6'>Erro ao carregar reservas.</td></tr>";
    return;
  }

  if (!data || !data.length) {
    tbody.innerHTML = "<tr><td colspan='6'>Nenhuma reserva encontrada.</td></tr>";
    return;
  }

  tbody.innerHTML = "";
  data.forEach((r) => {
    tbody.innerHTML += `
      <tr>
        <td>${r.veiculo_modelo} (${r.veiculo_placa})</td>
        <td>${r.funcionario_nome ?? "-"}</td>
        <td>${r.data_saida_prevista ?? "-"}</td>
        <td>${r.data_retorno_real ?? "-"}</td>
        <td>${r.status}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="cancelarReserva('${r.id}')">
            Cancelar
          </button>
        </td>
      </tr>
    `;
  });
}

// ----------------------------------------------------
// RESERVAS - Carregar filtros (veículo / funcionário)
// ----------------------------------------------------
async function carregarFiltrosReservas() {
  const selVeic = document.getElementById("filtro-reserva-veiculo");
  const selFunc = document.getElementById("filtro-reserva-funcionario");
  if (!selVeic || !selFunc) return;

  selVeic.innerHTML = `<option value="">Todos</option>`;
  selFunc.innerHTML = `<option value="">Todos</option>`;

  const { data: veiculos } = await supa.from("veiculos").select("*").order("modelo");
  veiculos?.forEach(v => {
    selVeic.innerHTML += `<option value="${v.id}">${v.modelo} (${v.placa})</option>`;
  });

  const { data: funcionarios } = await supa.from("funcionarios").select("*").order("nome");
  funcionarios?.forEach(f => {
    selFunc.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
  });
}

// ----------------------------------------------------
// MODAL - Nova reserva
// ----------------------------------------------------
async function abrirModalNovaReserva() {
  const { data: veiculos } = await supa
    .from("veiculos")
    .select("*")
    .eq("status", "disponivel");

  const { data: funcionarios } = await supa
    .from("funcionarios")
    .select("*")
    .eq("ativo", true);

  const optVeic = (veiculos || []).map(v =>
    `<option value="${v.id}">${v.modelo} (${v.placa})</option>`
  ).join("");

  const optFunc = (funcionarios || []).map(f =>
    `<option value="${f.id}">${f.nome}</option>`
  ).join("");

  const modalHtml = `
<div class="modal fade" id="modalReserva" tabindex="-1">
  <div class="modal-dialog"><div class="modal-content">

    <div class="modal-header bg-ilumi text-white">
      <h5 class="modal-title">Nova Reserva</h5>
      <button class="btn-close" data-bs-dismiss="modal"></button>
    </div>

    <div class="modal-body">
      <label class="form-label">Funcionário</label>
      <select id="res-func" class="form-select mb-2">${optFunc}</select>

      <label class="form-label">Veículo</label>
      <select id="res-veic" class="form-select mb-2">${optVeic}</select>

      <label class="form-label">Data/Hora saída</label>
      <input id="res-saida" type="datetime-local" class="form-control mb-2">

      <label class="form-label">Motivo</label>
      <textarea id="res-motivo" class="form-control"></textarea>
    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-ilumi" onclick="salvarReserva()">Salvar</button>
    </div>

  </div></div>
</div>`;
  const container = document.getElementById("modal-container");
  if (!container) return;
  container.innerHTML = modalHtml;

  const modalEl = document.getElementById("modalReserva");
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// ----------------------------------------------------
// SALVAR RESERVA
// ----------------------------------------------------
async function salvarReserva() {
  const funcionario = document.getElementById("res-func")?.value;
  const veiculo = document.getElementById("res-veic")?.value;
  const saida = document.getElementById("res-saida")?.value;
  const motivo = document.getElementById("res-motivo")?.value.trim();

  if (!funcionario || !veiculo || !saida || !motivo) {
    Swal.fire("Atenção", "Preencha todos os campos.", "warning");
    return;
  }

  const { error } = await supa.from("reservas").insert({
    funcionario_id: funcionario,
    veiculo_id: veiculo,
    data_saida_prevista: saida,
    motivo,
    status: "aberta",
  });

  if (error) {
    console.error(error);
    Swal.fire("Erro", "Falha ao salvar reserva.", "error");
    return;
  }

  const modalEl = document.getElementById("modalReserva");
  if (modalEl) {
    bootstrap.Modal.getInstance(modalEl)?.hide();
  }
  Swal.fire("Sucesso!", "Reserva cadastrada!", "success");

  carregarReservas();
}

// ----------------------------------------------------
// CANCELAR RESERVA
// ----------------------------------------------------
async function cancelarReserva(id) {
  const c = await Swal.fire({
    title: "Cancelar reserva?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim",
    cancelButtonText: "Não",
  });

  if (!c.isConfirmed) return;

  const { error } = await supa
    .from("reservas")
    .update({ status: "cancelada" })
    .eq("id", id);

  if (error) {
    console.error(error);
    Swal.fire("Erro", "Falha ao cancelar reserva.", "error");
    return;
  }

  Swal.fire("Cancelada!", "A reserva foi cancelada.", "success");
  carregarReservas();
}

// ----------------------------------------------------
// HISTÓRICO - Filtros
// ----------------------------------------------------
async function carregarHistoricoFiltros() {
  const selVeic = document.getElementById("filtro-historico-veiculo");
  const selFunc = document.getElementById("filtro-historico-funcionario");
  if (!selVeic || !selFunc) return;

  const { data: veiculos } = await supa.from("veiculos").select("*");
  const { data: funcionarios } = await supa.from("funcionarios").select("*");

  selVeic.innerHTML = `<option value="">Todos</option>`;
  selFunc.innerHTML = `<option value="">Todos</option>`;

  (veiculos || []).forEach(v => {
    selVeic.innerHTML += `<option value="${v.id}">${v.modelo} (${v.placa})</option>`;
  });

  (funcionarios || []).forEach(f => {
    selFunc.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
  });
}

// ----------------------------------------------------
// HISTÓRICO - Carregar dados
// ----------------------------------------------------
async function carregarHistorico() {
  const tbody = document.getElementById("tabela-historico");
  if (!tbody) return;

  tbody.innerHTML = "<tr><td colspan='6'>Carregando...</td></tr>";

  const v = document.getElementById("filtro-historico-veiculo")?.value;
  const f = document.getElementById("filtro-historico-funcionario")?.value;
  const dataFiltro = document.getElementById("filtro-historico-data")?.value;

  let query = supa.from("reservas_view").select("*");

  if (v) query = query.eq("veiculo_id", v);
  if (f) query = query.eq("funcionario_id", f);

  if (dataFiltro) {
    query = query
      .gte("data_saida_prevista", `${dataFiltro} 00:00:00`)
      .lte("data_saida_prevista", `${dataFiltro} 23:59:59`);
  }

  const { data, error } = await query.order("data_saida_prevista", { ascending: false });

  if (error) {
    console.error(error);
    tbody.innerHTML = "<tr><td colspan='6'>Erro ao carregar.</td></tr>";
    return;
  }

  if (!data || !data.length) {
    tbody.innerHTML = "<tr><td colspan='6'>Nenhum registro encontrado.</td></tr>";
    return;
  }

  tbody.innerHTML = "";
  data.forEach(h => {
    tbody.innerHTML += `
      <tr>
        <td>${h.veiculo_modelo} (${h.veiculo_placa})</td>
        <td>${h.funcionario_nome ?? "-"}</td>
        <td>${h.data_saida_real ?? "-"}</td>
        <td>${h.data_retorno_real ?? "-"}</td>
        <td>${h.km_inicio ?? "-"}</td>
        <td>${h.km_fim ?? "-"}</td>
      </tr>
    `;
  });
}

/* ============================================================
   MÓDULO COMPLETO DE USUÁRIOS / FUNCIONÁRIOS
   ============================================================ */

// ----------------------------------------------------
// CARREGAR LISTA DE FUNCIONÁRIOS
// ----------------------------------------------------
async function carregarUsuarios() {
  const tbody = document.getElementById("tabela-usuarios");
  if (!tbody) return;

  tbody.innerHTML = "<tr><td colspan='4'>Carregando...</td></tr>";

  const { data, error } = await supa
    .from("funcionarios")
    .select("*")
    .order("nome");

  if (error) {
    console.error(error);
    tbody.innerHTML = "<tr><td colspan='4'>Erro ao carregar.</td></tr>";
    return;
  }

  if (!data || !data.length) {
    tbody.innerHTML = "<tr><td colspan='4'>Nenhum funcionário encontrado.</td></tr>";
    return;
  }

  tbody.innerHTML = "";
  data.forEach(f => {
    tbody.innerHTML += `
      <tr>
        <td>${f.nome}</td>
        <td>${f.email}</td>
        <td>${f.ativo ? "Sim" : "Não"}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEditarUsuario('${f.id}')">Editar</button>
          <button class="btn btn-sm btn-outline-${f.ativo ? "danger" : "success"}"
            onclick="alternarStatusUsuario('${f.id}', ${f.ativo})">
            ${f.ativo ? "Desativar" : "Ativar"}
          </button>
        </td>
      </tr>
    `;
  });
}

// ----------------------------------------------------
// MODAL - Novo Funcionário
// ----------------------------------------------------
function abrirModalNovoFuncionario() {
  const modalHtml = `
<div class="modal fade" id="modalFuncionario" tabindex="-1">
  <div class="modal-dialog"><div class="modal-content">

    <div class="modal-header bg-ilumi text-white">
      <h5 class="modal-title">Cadastrar Funcionário</h5>
      <button class="btn-close" data-bs-dismiss="modal"></button>
    </div>

    <div class="modal-body">

      <label class="form-label">Nome completo</label>
      <input id="func-nome" class="form-control mb-2">

      <label class="form-label">E-mail (login)</label>
      <input id="func-email" type="email" class="form-control mb-2">

      <label class="form-label">Senha</label>
      <input id="func-senha" type="password" class="form-control mb-2">

    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-ilumi" onclick="salvarNovoFuncionario()">Salvar</button>
    </div>

  </div></div>
</div>`;
  const container = document.getElementById("modal-container");
  if (!container) return;
  container.innerHTML = modalHtml;

  const modalEl = document.getElementById("modalFuncionario");
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// ----------------------------------------------------
// SALVAR FUNCIONÁRIO
// ----------------------------------------------------
async function salvarNovoFuncionario() {
  const nome = document.getElementById("func-nome")?.value.trim();
  const email = document.getElementById("func-email")?.value.trim();
  const senha = document.getElementById("func-senha")?.value.trim();

  if (!nome || !email || !senha) {
    Swal.fire("Atenção", "Preencha todos os campos.", "warning");
    return;
  }

  // Criar usuário no Auth
  const { error: authError } = await supa.auth.signUp({
    email,
    password: senha
  });

  if (authError) {
    console.error(authError);
    Swal.fire("Erro", authError.message, "error");
    return;
  }

  // Inserir no banco
  const { error } = await supa.from("funcionarios").insert({
    nome,
    email,
    ativo: true,
  });

  if (error) {
    console.error(error);
    Swal.fire("Erro", "Falha ao salvar funcionário.", "error");
    return;
  }

  const modalEl = document.getElementById("modalFuncionario");
  if (modalEl) {
    bootstrap.Modal.getInstance(modalEl)?.hide();
  }
  Swal.fire("Sucesso!", "Funcionário cadastrado!", "success");
  carregarUsuarios();
}

// ----------------------------------------------------
// ALTERAR STATUS (ATIVAR/DESATIVAR)
// ----------------------------------------------------
async function alternarStatusUsuario(id, statusAtual) {
  const novo = !statusAtual;

  const { error } = await supa
    .from("funcionarios")
    .update({ ativo: novo })
    .eq("id", id);

  if (error) {
    console.error(error);
    Swal.fire("Erro", "Falha ao alterar status.", "error");
    return;
  }

  Swal.fire("Sucesso!", "Status atualizado!", "success");
  carregarUsuarios();
}

// ----------------------------------------------------
// MODAL - Editar Funcionário
// ----------------------------------------------------
async function abrirModalEditarUsuario(id) {
  const { data, error } = await supa
    .from("funcionarios")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    console.error(error);
    Swal.fire("Erro", "Funcionário não encontrado.", "error");
    return;
  }

  const modalHtml = `
<div class="modal fade" id="modalFuncionario" tabindex="-1">
  <div class="modal-dialog"><div class="modal-content">

    <div class="modal-header bg-primary text-white">
      <h5 class="modal-title">Editar Funcionário</h5>
      <button class="btn-close" data-bs-dismiss="modal"></button>
    </div>

    <div class="modal-body">

      <label class="form-label">Nome completo</label>
      <input id="func-nome-edit" class="form-control mb-2" value="${data.nome}">

      <label class="form-label">E-mail</label>
      <input id="func-email-edit" type="email" class="form-control mb-2" value="${data.email}">

    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarEdicaoFuncionario('${id}')">Salvar</button>
    </div>

  </div></div>
</div>`;
  const container = document.getElementById("modal-container");
  if (!container) return;
  container.innerHTML = modalHtml;

  const modalEl = document.getElementById("modalFuncionario");
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// ----------------------------------------------------
// SALVAR EDIÇÃO DE FUNCIONÁRIO
// ----------------------------------------------------
async function salvarEdicaoFuncionario(id) {
  const nome = document.getElementById("func-nome-edit")?.value.trim();
  const email = document.getElementById("func-email-edit")?.value.trim();

  if (!nome || !email) {
    Swal.fire("Atenção", "Preencha todos os campos.", "warning");
    return;
  }

  const { error } = await supa
    .from("funcionarios")
    .update({ nome, email })
    .eq("id", id);

  if (error) {
    console.error(error);
    Swal.fire("Erro", "Falha ao atualizar funcionário.", "error");
    return;
  }

  const modalEl = document.getElementById("modalFuncionario");
  if (modalEl) {
    bootstrap.Modal.getInstance(modalEl)?.hide();
  }
  Swal.fire("Sucesso!", "Funcionário atualizado!", "success");
  carregarUsuarios();
}
