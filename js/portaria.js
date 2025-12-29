// ----------------------------------------------------
// PORTARIA - ILUMI SISTEMA DE VEÍCULOS
// ----------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  protegerRota("portaria");
  configurarMenu();
  carregarUsuario();

  carregarVeiculos();
  carregarFiltrosReservas();   // 🔹 Preenche os selects de reserva
  carregarReservas();
  carregarHistoricoFiltros();
  carregarHistorico();

  document.getElementById("btn-novo-veiculo")?.addEventListener("click", abrirModalNovoVeiculo);
  document.getElementById("btn-nova-reserva")?.addEventListener("click", abrirModalNovaReserva);
  document.getElementById("btn-novo-usuario")?.addEventListener("click", abrirModalNovoFuncionario);

  // 🔹 Filtros de RESERVAS agora chamam carregarReservas()
  document.getElementById("filtro-reserva-veiculo")?.addEventListener("change", carregarReservas);
  document.getElementById("filtro-reserva-funcionario")?.addEventListener("change", carregarReservas);
  document.getElementById("filtro-reserva-status")?.addEventListener("change", carregarReservas);

  // Filtros do HISTÓRICO
  document.getElementById("filtro-historico-veiculo")?.addEventListener("change", carregarHistorico);
  document.getElementById("filtro-historico-funcionario")?.addEventListener("change", carregarHistorico);
  document.getElementById("filtro-historico-data")?.addEventListener("change", carregarHistorico);
});

// ----------------------------------------------------
// Helpers de data/hora
// ----------------------------------------------------
function parseDbDate(value) {
  if (!value) return null;

  // Normaliza "2025-12-29 13:00:00" -> "2025-12-29T13:00:00"
  const normalized = String(value).includes(" ")
    ? String(value).replace(" ", "T")
    : String(value);

  // Se não tiver timezone (Z ou +00:00 etc), assume UTC
  const hasTZ = /([zZ]|[+\-]\d{2}:\d{2})$/.test(normalized);
  return new Date(hasTZ ? normalized : `${normalized}Z`);
}

function parseDbDate(value) {
  if (!value) return null;

  // Normaliza "2025-12-29 13:00:00" -> "2025-12-29T13:00:00"
  const normalized = String(value).includes(" ")
    ? String(value).replace(" ", "T")
    : String(value);

  // Se não tiver timezone (Z ou +00:00 etc), assume UTC
  const hasTZ = /([zZ]|[+\-]\d{2}:\d{2})$/.test(normalized);
  return new Date(hasTZ ? normalized : `${normalized}Z`);
}

function parseDbDate(value) {
  if (!value) return null;

  // Normaliza "2025-12-29 13:00:00" -> "2025-12-29T13:00:00"
  const normalized = String(value).includes(" ")
    ? String(value).replace(" ", "T")
    : String(value);

  // Se não tiver timezone (Z ou +00:00 etc), assume UTC
  const hasTZ = /([zZ]|[+\-]\d{2}:\d{2})$/.test(normalized);
  return new Date(hasTZ ? normalized : `${normalized}Z`);
}

function formatarDataHoraBR(value) {
  const d = parseDbDate(value);
  if (!d || isNaN(d)) return "-";

  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${ano} ${h}:${m}`;
}

function toInputDateTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d)) return "";
  // ajustar timezone para caber no input datetime-local
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
}

function getMinDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

// ----------------------------------------------------
// Proteção da rota
// ----------------------------------------------------
function protegerRota(roleEsperado) {
  const role = sessionStorage.getItem("ilumiUserRole");
  if (role !== roleEsperado) window.location.href = "index.html";
}

// ----------------------------------------------------
// Usuário logado
// ----------------------------------------------------
function carregarUsuario() {
  const email = sessionStorage.getItem("ilumiUserEmail");
  document.getElementById("user-info").textContent = email ?? "";

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await supa.auth.signOut();
    sessionStorage.clear();
    window.location.href = "index.html";
  });
}

// ----------------------------------------------------
// MENU / telas
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

      if (target === "reservas") {
        carregarFiltrosReservas();
        carregarReservas();
      }
      if (target === "usuarios") carregarUsuarios();
    });
  });
}

// ----------------------------------------------------
// VEÍCULOS
// ----------------------------------------------------
async function carregarVeiculos() {
  const tbody = document.getElementById("tabela-veiculos");
  tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

  const { data, error } = await supa.from("veiculos").select("*").order("modelo");

  if (error) {
    tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar.</td></tr>";
    return;
  }

  if (!data?.length) {
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
        <td class="d-flex gap-1 flex-wrap">
  <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEditarVeiculo('${v.id}')">Editar</button>
  <button class="btn btn-sm btn-outline-secondary" onclick="abrirModalPermissoesVeiculo('${v.id}')">
    Permissões
  </button>
</td>
       
      </tr>`;
  });
}

function abrirModalNovoVeiculo() {
  const modal = `
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
  document.getElementById("modal-container").innerHTML = modal;
  new bootstrap.Modal("#modalVeiculo").show();
}

async function salvarNovoVeiculo() {
  const placa = document.getElementById("veic-placa").value.trim();
  const modelo = document.getElementById("veic-modelo").value.trim();
  const km = document.getElementById("veic-km").value;
  const status = document.getElementById("veic-status").value;

  if (!placa || !modelo) {
    Swal.fire("Atenção", "Preencha placa e modelo!", "warning");
    return;
  }

  const { error } = await supa.from("veiculos").insert({
    placa,
    modelo,
    km_atual: km || 0,
    status,
  });

  if (error) {
    Swal.fire("Erro", "Falha ao salvar veículo.", "error");
    return;
  }

  bootstrap.Modal.getInstance(document.getElementById("modalVeiculo")).hide();
  Swal.fire("Sucesso!", "Veículo cadastrado.", "success");
  carregarVeiculos();
}

async function abrirModalEditarVeiculo(id) {
  const { data, error } = await supa.from("veiculos").select("*").eq("id", id).maybeSingle();
  if (error || !data) {
    Swal.fire("Erro", "Veículo não encontrado.", "error");
    return;
  }

  const modal = `
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
      <input id="veic-km" type="number" class="form-control mb-2" value="${data.km_atual}">

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
  document.getElementById("modal-container").innerHTML = modal;
  new bootstrap.Modal("#modalVeiculo").show();
}

async function salvarEdicaoVeiculo(id) {
  const placa = document.getElementById("veic-placa").value.trim();
  const modelo = document.getElementById("veic-modelo").value.trim();
  const km = document.getElementById("veic-km").value;
  const status = document.getElementById("veic-status").value;

  const { error } = await supa
    .from("veiculos")
    .update({ placa, modelo, km_atual: km, status })
    .eq("id", id);

  if (error) {
    Swal.fire("Erro", "Falha ao atualizar veículo.", "error");
    return;
  }

  bootstrap.Modal.getInstance(document.getElementById("modalVeiculo")).hide();
  Swal.fire("Sucesso!", "Veículo atualizado!", "success");
  carregarVeiculos();
}

// ----------------------------------------------------
// RESERVAS
// ----------------------------------------------------
async function carregarReservas() {
  const tbody = document.getElementById("tabela-reservas");
  tbody.innerHTML = "<tr><td colspan='7'>Carregando...</td></tr>";

  const filtroVeic = document.getElementById("filtro-reserva-veiculo")?.value;
  const filtroFunc = document.getElementById("filtro-reserva-funcionario")?.value;
  const filtroStatus = document.getElementById("filtro-reserva-status")?.value;

  let query = supa.from("reservas_view").select("*");

  if (filtroVeic) query = query.eq("veiculo_id", filtroVeic);
  if (filtroFunc) query = query.eq("funcionario_id", filtroFunc);
  if (filtroStatus) query = query.eq("status", filtroStatus);

  const { data, error } = await query.order("data_saida_prevista", { ascending: false });

  if (error) {
    tbody.innerHTML = "<tr><td colspan='7'>Erro ao carregar reservas.</td></tr>";
    return;
  }

  if (!data?.length) {
    tbody.innerHTML = "<tr><td colspan='7'>Nenhuma reserva encontrada.</td></tr>";
    return;
  }

  tbody.innerHTML = "";
  data.forEach((r) => {
    tbody.innerHTML += `
      <tr>
        <td>${r.veiculo_modelo} (${r.veiculo_placa})</td>
        <td>${r.funcionario_nome ?? "-"}</td>
        <td>${formatarDataHoraBR(r.data_saida_prevista)}</td>
        <td>${formatarDataHoraBR(r.data_retorno_prevista)}</td>
        <td>${r.status}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEditarReserva('${r.id}')">Editar</button>
          <button class="btn btn-sm btn-outline-danger" onclick="excluirReserva('${r.id}')">Excluir</button>
        </td>
      </tr>`;
  });
}

async function carregarFiltrosReservas() {
  const selVeic = document.getElementById("filtro-reserva-veiculo");
  const selFunc = document.getElementById("filtro-reserva-funcionario");
  const selStatus = document.getElementById("filtro-reserva-status");

  if (!selVeic || !selFunc || !selStatus) return;

  selVeic.innerHTML = `<option value="">Todos</option>`;
  selFunc.innerHTML = `<option value="">Todos</option>`;
  selStatus.innerHTML = `
    <option value="">Todos</option>
    <option value="aberta">Abertas</option>
    <option value="em_uso">Em uso</option>
    <option value="finalizada">Finalizadas</option>
  `;

  const { data: veiculos } = await supa.from("veiculos").select("*").order("modelo");
  const { data: funcionarios } = await supa.from("funcionarios").select("*").order("nome");

  veiculos?.forEach(v => {
    selVeic.innerHTML += `<option value="${v.id}">${v.modelo} (${v.placa})</option>`;
  });

  funcionarios?.forEach(f => {
    selFunc.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
  });
}

async function abrirModalNovaReserva() {
  const { data: veiculos } = await supa.from("veiculos").select("*").eq("status", "disponivel");
  const { data: funcionarios } = await supa.from("funcionarios").select("*").eq("ativo", true);

  const optVeic = (veiculos || []).map(v =>
    `<option value="${v.id}">${v.modelo} (${v.placa})</option>`
  ).join("");

  const optFunc = (funcionarios || []).map(f =>
    `<option value="${f.id}">${f.nome}</option>`
  ).join("");

  const modal = `
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

      <label class="form-label">Data/Hora Saída</label>
      <input id="res-saida" type="datetime-local" class="form-control mb-2" min="${getMinDateTime()}">

      <label class="form-label">Data/Hora Retorno</label>
      <input id="res-retorno" type="datetime-local" class="form-control mb-2" min="${getMinDateTime()}">

      <label class="form-label">Motivo / Destino</label>
      <textarea id="res-motivo" class="form-control"></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-ilumi" onclick="salvarReserva()">Salvar</button>
    </div>
  </div></div>
</div>`;
  document.getElementById("modal-container").innerHTML = modal;
  new bootstrap.Modal("#modalReserva").show();
}

// Verificar conflito de horário ao criar reserva
async function existeConflito(veiculo_id, saida, retorno, excludeId = null) {
  let query = supa
    .from("reservas")
    .select("data_saida_prevista, data_retorno_prevista, status")
    .eq("veiculo_id", veiculo_id)
    .neq("status", "cancelada");

  if (excludeId) query = query.neq("id", excludeId); // Ignora a reserva sendo editada

  const { data, error } = await query;

  if (error) return false;

  const novaIni = new Date(saida).getTime();
  const novaFim = new Date(retorno).getTime();

  for (const r of data || []) {
    if (!r.data_saida_prevista || !r.data_retorno_prevista) continue;
    const ini = new Date(r.data_saida_prevista).getTime();
    const fim = new Date(r.data_retorno_prevista).getTime();

    if (novaIni < fim && novaFim > ini) return true;
  }

  return false;
}

async function salvarReserva() {
  const funcionario = document.getElementById("res-func").value;
    const veiculo = document.getElementById("res-veic").value;
  const saida = document.getElementById("res-saida").value;
  const retorno = document.getElementById("res-retorno").value;
  const motivo = document.getElementById("res-motivo").value.trim();

  if (!funcionario || !veiculo || !saida || !retorno || !motivo) {
    Swal.fire("Atenção", "Preencha todos os campos.", "warning");
    return;
  }

  const dSaida = new Date(saida);
  const dRet = new Date(retorno);
  const agora = new Date();

  if (dSaida < agora) {
    Swal.fire("Atenção", "A data/hora de saída já passou.", "warning");
    return;
  }
  if (dRet <= dSaida) {
    Swal.fire("Atenção", "O retorno deve ser após a saída.", "warning");
    return;
  }

  const conflito = await existeConflito(veiculo, saida, retorno);
  if (conflito) {
    Swal.fire("Conflito", "Este veículo já possui reserva nesse horário.", "error");
    return;
  }

  const { error } = await supa.from("reservas").insert({
    funcionario_id: funcionario,
    veiculo_id: veiculo,
    data_saida_prevista: saida,
    data_retorno_prevista: retorno,
    motivo,
    status: "aberta",
  });

  if (error) {
    console.error(error);
    Swal.fire("Erro", "Falha ao salvar reserva.", "error");
    return;
  }

  bootstrap.Modal.getInstance(document.getElementById("modalReserva")).hide();
  Swal.fire("Sucesso!", "Reserva cadastrada!", "success");

  carregarReservas();
  carregarHistorico();
}

// ----------------------------------------------------
// EDITAR / EXCLUIR RESERVA
// ----------------------------------------------------
async function abrirModalEditarReserva(id) {
  const { data: reserva, error } = await supa
    .from("reservas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !reserva) {
    Swal.fire("Erro", "Reserva não encontrada.", "error");
    return;
  }

  const { data: veiculos } = await supa.from("veiculos").select("*");
  const { data: funcionarios } = await supa.from("funcionarios").select("*");

  const optVeic = (veiculos || []).map(v =>
    `<option value="${v.id}" ${v.id === reserva.veiculo_id ? "selected" : ""}>${v.modelo} (${v.placa})</option>`
  ).join("");

  const optFunc = (funcionarios || []).map(f =>
    `<option value="${f.id}" ${f.id === reserva.funcionario_id ? "selected" : ""}>${f.nome}</option>`
  ).join("");

  const modal = `
<div class="modal fade" id="modalEditReserva" tabindex="-1">
  <div class="modal-dialog"><div class="modal-content">
    <div class="modal-header bg-primary text-white">
      <h5 class="modal-title">Editar Reserva</h5>
      <button class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body">

      <label class="form-label">Funcionário</label>
      <select id="edit-res-func" class="form-select mb-2">${optFunc}</select>

      <label class="form-label">Veículo</label>
      <select id="edit-res-veic" class="form-select mb-2">${optVeic}</select>

      <label class="form-label">Data/Hora Saída Prevista</label>
      <input id="edit-res-saida-prev" type="datetime-local" class="form-control mb-2"
             value="${toInputDateTime(reserva.data_saida_prevista)}">

      <label class="form-label">Data/Hora Retorno Prevista</label>
      <input id="edit-res-ret-prev" type="datetime-local" class="form-control mb-2"
             value="${toInputDateTime(reserva.data_retorno_prevista)}">

      <label class="form-label">Data/Hora Saída Real</label>
      <input id="edit-res-saida-real" type="datetime-local" class="form-control mb-2"
             value="${toInputDateTime(reserva.data_saida_real)}">

      <label class="form-label">Data/Hora Retorno Real</label>
      <input id="edit-res-ret-real" type="datetime-local" class="form-control mb-2"
             value="${toInputDateTime(reserva.data_retorno_real)}">

      <label class="form-label">Km Início</label>
      <input id="edit-res-km-inicio" type="number" class="form-control mb-2" value="${reserva.km_inicio ?? ""}">

      <label class="form-label">Km Fim</label>
      <input id="edit-res-km-fim" type="number" class="form-control mb-2" value="${reserva.km_fim ?? ""}">

      <label class="form-label">Motivo / Destino</label>
      <textarea id="edit-res-motivo" class="form-control mb-2">${reserva.motivo ?? ""}</textarea>

    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarEdicaoReserva('${id}')">Salvar alterações</button>
    </div>
  </div></div>
</div>`;
  document.getElementById("modal-container").innerHTML = modal;
  new bootstrap.Modal("#modalEditReserva").show();
}

async function salvarEdicaoReserva(id) {
  try {
    console.log("Salvando edição para reserva ID:", id);

    const funcionario_id = document.getElementById("edit-res-func")?.value;
    const veiculo_id = document.getElementById("edit-res-veic")?.value;
    const data_saida_prevista = document.getElementById("edit-res-saida-prev")?.value || null;
    const data_retorno_prevista = document.getElementById("edit-res-ret-prev")?.value || null;
    const data_saida_real = document.getElementById("edit-res-saida-real")?.value || null;
    const data_retorno_real = document.getElementById("edit-res-ret-real")?.value || null;
    const km_inicio = document.getElementById("edit-res-km-inicio")?.value ? Number(document.getElementById("edit-res-km-inicio").value) : null;
    const km_fim = document.getElementById("edit-res-km-fim")?.value ? Number(document.getElementById("edit-res-km-fim").value) : null;
    const motivo = document.getElementById("edit-res-motivo")?.value?.trim() || null;

    if (!funcionario_id || !veiculo_id) {
      Swal.fire("Erro", "Funcionário e veículo são obrigatórios.", "error");
      return;
    }

    const dSaidaPrev = data_saida_prevista ? new Date(data_saida_prevista) : null;
    const dRetPrev = data_retorno_prevista ? new Date(data_retorno_prevista) : null;
    if (dSaidaPrev && dRetPrev && dRetPrev <= dSaidaPrev) {
      Swal.fire("Erro", "Retorno previsto deve ser após saída.", "error");
      return;
    }

    const dRetReal = data_retorno_real ? new Date(data_retorno_real) : null;
    const dSaidaReal = data_saida_real ? new Date(data_saida_real) : null;
    if (dSaidaReal && dRetReal && dRetReal <= dSaidaReal) {
      Swal.fire("Erro", "Retorno real deve ser após saída.", "error");
      return;
    }

    if (km_inicio && km_fim && km_fim < km_inicio) {
      Swal.fire("Erro", "KM fim não pode ser menor que KM início.", "error");
      return;
    }

    if (veiculo_id && data_saida_prevista && data_retorno_prevista) {
      const conflito = await existeConflito(veiculo_id, data_saida_prevista, data_retorno_prevista, id);
      if (conflito) {
        Swal.fire("Erro", "Conflito de horário com outra reserva.", "error");
        return;
      }
    }

    const updates = {
      funcionario_id,
      veiculo_id,
      data_saida_prevista,
      data_retorno_prevista,
      data_saida_real,
      data_retorno_real,
      km_inicio,
      km_fim,
      motivo
    };

    console.log("Updates enviados:", updates);
    const { error } = await supa.from("reservas").update(updates).eq("id", id);

    if (error) {
      console.error("Erro Supabase:", error);
      Swal.fire("Erro", `Falha ao salvar: ${error.message}`, "error");
      return;
    }

    const modalEl = document.getElementById("modalEditReserva");
    if (modalEl) {
      const inst = bootstrap.Modal.getInstance(modalEl);
      if (inst) inst.hide();
    }

    Swal.fire("Sucesso!", "Reserva atualizada.", "success");
    carregarReservas();
    carregarHistorico();

  } catch (err) {
    console.error("Erro inesperado:", err);
    Swal.fire("Erro", "Erro inesperado. Verifique o console.", "error");
  }
}

async function excluirReserva(id) {
  const confirmar = await Swal.fire({
    title: "Excluir reserva?",
    text: "Esta ação não poderá ser desfeita. A reserva será removida permanentemente.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, excluir",
    cancelButtonText: "Cancelar"
  });

  if (!confirmar.isConfirmed) return;

  const { error } = await supa
    .from("reservas")
    .delete()
    .eq("id", id);

  if (error) {
    Swal.fire("Erro", "Falha ao excluir reserva.", "error");
    console.error(error);
    return;
  }

  Swal.fire("Excluída!", "A reserva foi removida com sucesso.", "success");

  carregarReservas();
  carregarHistorico();
}

// ----------------------------------------------------
// HISTÓRICO
// ----------------------------------------------------
async function carregarHistoricoFiltros() {
  const selVeic = document.getElementById("filtro-historico-veiculo");
  const selFunc = document.getElementById("filtro-historico-funcionario");

  const { data: veiculos } = await supa.from("veiculos").select("*");
  const { data: funcionarios } = await supa.from("funcionarios").select("*");

  selVeic.innerHTML = `<option value="">Todos</option>`;
  selFunc.innerHTML = `<option value="">Todos</option>`;

  veiculos?.forEach(v => {
    selVeic.innerHTML += `<option value="${v.id}">${v.modelo} (${v.placa})</option>`;
  });

  funcionarios?.forEach(f => {
    selFunc.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
  });
}

async function carregarHistorico() {
  const tbody = document.getElementById("tabela-historico");
  tbody.innerHTML = "<tr><td colspan='8'>Carregando...</td></tr>";

  const v = document.getElementById("filtro-historico-veiculo").value;
  const f = document.getElementById("filtro-historico-funcionario").value;
  const dataFiltro = document.getElementById("filtro-historico-data").value;

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
    tbody.innerHTML = "<tr><td colspan='8'>Erro ao carregar.</td></tr>";
    return;
  }

  if (!data?.length) {
    tbody.innerHTML = "<tr><td colspan='8'>Nenhum registro encontrado.</td></tr>";
    return;
  }

  tbody.innerHTML = "";
  data.forEach(h => {
  console.log("Reserva ID:", h.id, "Foto Início:", h.foto_painel_inicio, "Foto Fim:", h.foto_painel_fim);

  const fotoInicioBtn = h.foto_painel_inicio ? `<button class="btn btn-sm btn-outline-info" onclick="verFoto('${h.foto_painel_inicio}')">Ver Início</button>` : "Sem foto";
  const fotoFimBtn = h.foto_painel_fim ? `<button class="btn btn-sm btn-outline-info" onclick="verFoto('${h.foto_painel_fim}')">Ver Fim</button>` : "Sem foto";

  tbody.innerHTML += `
    <tr>
      <td>${h.veiculo_modelo} (${h.veiculo_placa})</td>
      <td>${h.funcionario_nome ?? "-"}</td>
      <td>${h.motivo ?? "-"}</td>
      <td>${formatarDataHoraBR(h.data_saida_real)}</td>
      <td>${formatarDataHoraBR(h.data_retorno_real)}</td>
      <td>${h.km_inicio ?? "-"}</td>
      <td>${h.km_fim ?? "-"}</td>
      <td>${fotoInicioBtn} ${fotoFimBtn}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" onclick="excluirDoHistorico('${h.id}')">Excluir</button>
      </td>
    </tr>`;
});
}

async function excluirDoHistorico(id) {
  const confirmar = await Swal.fire({
    title: "Excluir do histórico?",
    text: "Esta ação removerá permanentemente o registro.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, excluir",
    cancelButtonText: "Cancelar"
  });

  if (!confirmar.isConfirmed) return;

  const { error } = await supa
    .from("reservas")
    .delete()
    .eq("id", id);

  if (error) {
    Swal.fire("Erro", "Falha ao excluir registro.", "error");
    console.error(error);
    return;
  }

  Swal.fire("Excluído!", "O registro foi removido do histórico.", "success");

  carregarHistorico();
  carregarReservas();
}

// ----------------------------------------------------
// FUNCIONÁRIOS
// ----------------------------------------------------
// --- SUBSTITUA a função carregarUsuarios() por esta versão ---
async function carregarUsuarios() {
  const tbody = document.getElementById("tabela-usuarios");
  tbody.innerHTML = "<tr><td colspan='4'>Carregando...</td></tr>";

  const { data, error } = await supa.from("funcionarios").select("*").order("nome");

  if (error) {
    tbody.innerHTML = "<tr><td colspan='4'>Erro ao carregar.</td></tr>";
    return;
  }

  if (!data?.length) {
    tbody.innerHTML = "<tr><td colspan='4'>Nenhum funcionário encontrado.</td></tr>";
    return;
  }

  tbody.innerHTML = "";
  data.forEach((f) => {
    tbody.innerHTML += `
      <tr>
        <td>${f.nome}</td>
        <td>${f.email}</td>
        <td>${f.ativo ? "Sim" : "Não"}</td>
        <td class="d-flex gap-1 flex-wrap">
          <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEditarUsuario('${f.id}')">Editar</button>

          <button class="btn btn-sm btn-outline-${f.ativo ? "danger" : "success"}"
            onclick="alternarStatusUsuario('${f.id}', ${f.ativo})">
            ${f.ativo ? "Desativar" : "Ativar"}
          </button>

          <!-- NOVO BOTÃO: EXCLUIR -->
          <button class="btn btn-sm btn-danger" onclick="excluirUsuario('${f.id}')">
            Excluir
          </button>
        </td>
      </tr>`;
  });
}

function abrirModalNovoFuncionario() {
  const modal = `
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
  document.getElementById("modal-container").innerHTML = modal;
  new bootstrap.Modal("#modalFuncionario").show();
}

async function salvarNovoFuncionario() {
  const nome = document.getElementById("func-nome").value.trim();
  const email = document.getElementById("func-email").value.trim();
  const senha = document.getElementById("func-senha").value.trim();

  if (!nome || !email || !senha) {
    Swal.fire("Atenção", "Preencha todos os campos!", "warning");
    return;
  }

  const { error: authError } = await supa.auth.signUp({ email, password: senha });
  if (authError) {
    Swal.fire("Erro", authError.message, "error");
    return;
  }

  const { error } = await supa.from("funcionarios").insert({ nome, email, ativo: true });
  if (error) {
    Swal.fire("Erro", "Falha ao salvar funcionário.", "error");
    return;
  }

  bootstrap.Modal.getInstance(document.getElementById("modalFuncionario")).hide();
  Swal.fire("Sucesso!", "Funcionário cadastrado!", "success");
  carregarUsuarios();
}

async function alternarStatusUsuario(id, statusAtual) {
  const novo = !statusAtual;
  const { error } = await supa.from("funcionarios").update({ ativo: novo }).eq("id", id);
  if (error) {
    Swal.fire("Erro", "Falha ao alterar status.", "error");
    return;
  }

  Swal.fire("Sucesso!", "Status atualizado!", "success");
  carregarUsuarios();
}

async function abrirModalEditarUsuario(id) {
  const { data, error } = await supa.from("funcionarios").select("*").eq("id", id).maybeSingle();
  if (error || !data) {
    Swal.fire("Erro", "Funcionário não encontrado.", "error");
    return;
  }

  const modal = `
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
  document.getElementById("modal-container").innerHTML = modal;
  new bootstrap.Modal("#modalFuncionario").show();
}

async function salvarEdicaoFuncionario(id) {
  const nome = document.getElementById("func-nome-edit").value.trim();
  const email = document.getElementById("func-email-edit").value.trim();

  if (!nome || !email) {
    Swal.fire("Atenção", "Preencha todos os campos!", "warning");
    return;
  }

  const { error } = await supa.from("funcionarios").update({ nome, email }).eq("id", id);
  if (error) {
    Swal.fire("Erro", "Falha ao atualizar funcionário.", "error");
    return;
  }

  bootstrap.Modal.getInstance(document.getElementById("modalFuncionario")).hide();
  Swal.fire("Sucesso!", "Funcionário atualizado!", "success");
  carregarUsuarios();
}


function verFoto(path) {
  console.log("Tentando ver foto com path:", path);
  if (!path) {
    Swal.fire("Erro", "Path da foto não encontrado.", "error");
    return;
  }

  const { data, error } = supa.storage.from('painel-fotos').getPublicUrl(path);
  console.log("URL gerada:", data?.publicUrl, "Erro:", error);

  if (data?.publicUrl) {
    window.open(data.publicUrl, '_blank');
  } else {
    Swal.fire("Erro", "Foto não encontrada ou bucket não público.", "error");
  }
}

// --- ADICIONE esta função no final do portaria.js (ou após alternarStatusUsuario) ---
async function excluirUsuario(id) {
  const confirmar = await Swal.fire({
    title: "Excluir funcionário?",
    text: "Isso removerá o registro do funcionário do sistema. Essa ação não poderá ser desfeita.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, excluir",
    cancelButtonText: "Cancelar"
  });

  if (!confirmar.isConfirmed) return;

  const { error } = await supa
    .from("funcionarios")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);

    // Se houver vínculo com reservas, pode falhar por constraint (FK).
    // Aqui mostramos uma mensagem mais amigável.
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("foreign key") || msg.includes("constraint")) {
      Swal.fire(
        "Não foi possível excluir",
        "Este funcionário possui reservas vinculadas. Em vez de excluir, desative o usuário.",
        "error"
      );
      return;
    }

    Swal.fire("Erro", "Falha ao excluir funcionário.", "error");
    return;
  }

  Swal.fire("Excluído!", "Funcionário removido com sucesso.", "success");
  carregarUsuarios();
}







async function abrirModalPermissoesVeiculo(veiculoId) {
  // Busca veículo
  const { data: veiculo, error: veicErr } = await supa
    .from("veiculos")
    .select("id, modelo, placa")
    .eq("id", veiculoId)
    .maybeSingle();

  if (veicErr || !veiculo) {
    Swal.fire("Erro", "Veículo não encontrado.", "error");
    return;
  }

  // Busca funcionários ativos
  const { data: funcionarios, error: funcErr } = await supa
    .from("funcionarios")
    .select("id, nome, ativo")
    .eq("ativo", true)
    .order("nome");

  if (funcErr) {
    Swal.fire("Erro", "Falha ao carregar funcionários.", "error");
    return;
  }

  // Busca permissões atuais do veículo
  const { data: permissoes, error: permErr } = await supa
    .from("veiculo_permissoes")
    .select("funcionario_id")
    .eq("veiculo_id", veiculoId);

  if (permErr) {
  Swal.fire("Erro", "Falha ao carregar permissões.", "error");
  return;
}

  const permitidosSet = new Set((permissoes || []).map(p => p.funcionario_id));

  // Monta lista de checkboxes
  const listaHtml = (funcionarios || []).map(f => `
    <div class="form-check">
      <input class="form-check-input" type="checkbox"
             id="perm-${f.id}"
             value="${f.id}"
             ${permitidosSet.has(f.id) ? "checked" : ""}>
      <label class="form-check-label" for="perm-${f.id}">
        ${f.nome}
      </label>
    </div>
  `).join("");

  const modal = `
<div class="modal fade" id="modalPermissoesVeiculo" tabindex="-1">
  <div class="modal-dialog modal-dialog-scrollable"><div class="modal-content">
    <div class="modal-header bg-ilumi text-white">
      <h5 class="modal-title">
        Permissões — ${veiculo.modelo} (${veiculo.placa})
      </h5>
      <button class="btn-close" data-bs-dismiss="modal"></button>
    </div>

    <div class="modal-body">
      <p class="text-muted small mb-2">
        Se você marcar pelo menos 1 funcionário, este veículo ficará restrito apenas aos selecionados.
        Se deixar tudo desmarcado, o veículo fica livre para todos.
      </p>
      ${listaHtml || "<p class='text-muted'>Nenhum funcionário ativo.</p>"}
    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-ilumi" onclick="salvarPermissoesVeiculo('${veiculoId}')">Salvar</button>
    </div>
  </div></div>
</div>`;

  document.getElementById("modal-container").innerHTML = modal;
  new bootstrap.Modal("#modalPermissoesVeiculo").show();
}

async function salvarPermissoesVeiculo(veiculoId) {
  // Lê todos os checkboxes do modal
  const modalEl = document.getElementById("modalPermissoesVeiculo");
  const checks = modalEl.querySelectorAll("input.form-check-input[type='checkbox']");
  const selecionados = Array.from(checks)
    .filter(ch => ch.checked)
    .map(ch => ch.value);

  // Busca permissões atuais
  const { data: atuais, error: permErr } = await supa
    .from("veiculo_permissoes")
    .select("funcionario_id")
    .eq("veiculo_id", veiculoId);

  if (permErr) {
    Swal.fire("Erro", "Falha ao ler permissões atuais.", "error");
    return;
  }

  const atuaisSet = new Set((atuais || []).map(p => p.funcionario_id));
  const novosSet = new Set(selecionados);

  // Diferenças: inserir e remover
  const paraInserir = selecionados.filter(fid => !atuaisSet.has(fid));
  const paraRemover = (atuais || []).map(p => p.funcionario_id).filter(fid => !novosSet.has(fid));

  // Inserir
  if (paraInserir.length) {
    const payload = paraInserir.map(funcionario_id => ({ veiculo_id: veiculoId, funcionario_id }));
    const { error: insErr } = await supa.from("veiculo_permissoes").insert(payload);
    if (insErr) {
      console.error(insErr);
      Swal.fire("Erro", "Falha ao salvar permissões (insert).", "error");
      return;
    }
  }

  // Remover
  if (paraRemover.length) {
    const { error: delErr } = await supa
      .from("veiculo_permissoes")
      .delete()
      .eq("veiculo_id", veiculoId)
      .in("funcionario_id", paraRemover);

    if (delErr) {
      console.error(delErr);
      Swal.fire("Erro", "Falha ao salvar permissões (delete).", "error");
      return;
    }
  }

  bootstrap.Modal.getInstance(document.getElementById("modalPermissoesVeiculo")).hide();
  Swal.fire("Sucesso!", "Permissões atualizadas.", "success");
}