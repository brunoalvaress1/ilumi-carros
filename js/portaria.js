// ------------------------------------------------------------
// PORTARIA – ILUMI SISTEMA DE VEÍCULOS - Versão Otimizada
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {

  // Executa carga inicial só uma vez
  protegerRota("portaria");
  configurarMenu();
  carregarUsuario();

  carregarVeiculos();
  carregarFiltrosReservas();
  carregarReservas();
  carregarHistoricoFiltros();
  carregarHistorico();

  // SetInterval para atualizar dados periodicamente (ex: 10 minutos = 600000ms)
  setInterval(() => {
    carregarReservas();
    carregarVeiculos();
  }, 600000);

  document.getElementById("btn-novo-veiculo")?.addEventListener("click", abrirModalNovoVeiculo);
  document.getElementById("btn-nova-reserva")?.addEventListener("click", abrirModalNovaReserva);
  document.getElementById("btn-novo-usuario")?.addEventListener("click", abrirModalNovoFuncionario);

  document.getElementById("filtro-reserva-veiculo")?.addEventListener("change", carregarReservas);
  document.getElementById("filtro-reserva-funcionario")?.addEventListener("change", carregarReservas);
  document.getElementById("filtro-reserva-status")?.addEventListener("change", carregarReservas);

  document.getElementById("filtro-historico-veiculo")?.addEventListener("change", carregarHistorico);
  document.getElementById("filtro-historico-funcionario")?.addEventListener("change", carregarHistorico);
  document.getElementById("filtro-historico-data")?.addEventListener("change", carregarHistorico);
});

// ------------------------------------------------------------
// Funções otimizadas para carregamento com limites e tratamento de erro
// ------------------------------------------------------------

async function carregarVeiculos() {
  const tbody = document.getElementById("tabela-veiculos");
  tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

  try {
    const { data, error } = await supa
      .from("veiculos")
      .select("*")
      .order("modelo")
      .limit(20);  // Limite para evitar grandes volumes

    if (error) throw error;

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
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEditarVeiculo('${v.id}')">Editar</button>
          </td>
        </tr>`;
    });

  } catch (err) {
    console.error("Erro em carregarVeiculos:", err);
    tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar.</td></tr>";
  }
}

async function carregarReservas() {
  const tbody = document.getElementById("tabela-reservas");
  tbody.innerHTML = "<tr><td colspan='7'>Carregando...</td></tr>";

  const filtroVeic = document.getElementById("filtro-reserva-veiculo")?.value;
  const filtroFunc = document.getElementById("filtro-reserva-funcionario")?.value;
  const filtroStatus = document.getElementById("filtro-reserva-status")?.value;

  try {
    let query = supa.from("reservas_view").select("*").limit(20);

    if (filtroVeic) query = query.eq("veiculo_id", filtroVeic);
    if (filtroFunc) query = query.eq("funcionario_id", filtroFunc);
    if (filtroStatus) query = query.eq("status", filtroStatus);

    const { data, error } = await query.order("data_saida_prevista", { ascending: false });

    if (error) throw error;

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
          <td>${formatarDataHoraBR(r.data_retorno_previsto)}</td>
          <td>${r.status}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEditarReserva('${r.id}')">Editar</button>
            <button class="btn btn-sm btn-outline-danger" onclick="excluirReserva('${r.id}')">Excluir</button>
          </td>
        </tr>`;
    });

  } catch (err) {
    console.error("Erro em carregarReservas:", err);
    tbody.innerHTML = "<tr><td colspan='7'>Erro ao carregar reservas.</td></tr>";
  }
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

  try {
    const { data: veiculos, error: errV } = await supa.from("veiculos").select("*").order("modelo").limit(50);
    const { data: funcionarios, error: errF } = await supa.from("funcionarios").select("*").order("nome").limit(50);

    if (errV || errF) throw errV ?? errF;

    veiculos?.forEach(v => {
      selVeic.innerHTML += `<option value="${v.id}">${v.modelo} (${v.placa})</option>`;
    });

    funcionarios?.forEach(f => {
      selFunc.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
    });

  } catch (err) {
    console.error("Erro em carregarFiltrosReservas:", err);
  }
}

async function carregarHistorico() {
  const tbody = document.getElementById("tabela-historico");
  tbody.innerHTML = "<tr><td colspan='9'>Carregando...</td></tr>";

  const filtroVeic = document.getElementById("filtro-historico-veiculo")?.value;
  const filtroFunc = document.getElementById("filtro-historico-funcionario")?.value;
  const filtroData = document.getElementById("filtro-historico-data")?.value;

  try {
    let query = supa.from("reservas_view").select("*").eq("status", "finalizada").limit(30);

    if (filtroVeic) query = query.eq("veiculo_id", filtroVeic);
    if (filtroFunc) query = query.eq("funcionario_id", filtroFunc);
    if (filtroData) query = query.gte("data_saida_prevista", filtroData + "T00:00:00");

    const { data, error } = await query.order("data_saida_prevista", { ascending: false });

    if (error) throw error;

    if (!data?.length) {
      tbody.innerHTML = "<tr><td colspan='9'>Nenhum histórico encontrado.</td></tr>";
      return;
    }

    tbody.innerHTML = "";
    data.forEach((r) => {
      tbody.innerHTML += `
        <tr>
          <td>${r.veiculo_modelo} (${r.veiculo_placa})</td>
          <td>${r.funcionario_nome ?? "-"}</td>
          <td>${r.motivo ?? "-"}</td>
          <td>${formatarDataHoraBR(r.data_saida_real || r.data_saida_prevista)}</td>
          <td>${formatarDataHoraBR(r.data_retorno_real || r.data_retorno_previsto)}</td>
          <td>${r.km_inicio ?? "-"}</td>
          <td>${r.km_fim ?? "-"}</td>
          <td>
      ${r.foto_painel_inicio
        ? `<button class="btn btn-sm btn-outline-info" onclick="verFoto('${r.foto_painel_inicio}')">Início</button>`
        : "-"}
      ${r.foto_painel_fim
        ? `<button class="btn btn-sm btn-outline-info" onclick="verFoto('${r.foto_painel_fim}')">Fim</button>`
        : "-"}
    </td>
          <td>
      <button class="btn btn-sm btn-outline-danger" onclick="excluirReserva('${r.id}')">
        Excluir
      </button>
    </td>
        </tr>`;
    });

  } catch (err) {
    console.error("Erro em carregarHistorico:", err);
    tbody.innerHTML = "<tr><td colspan='9'>Erro ao carregar histórico.</td></tr>";
  }
}

async function carregarHistoricoFiltros() {
  const selVeic = document.getElementById("filtro-historico-veiculo");
  const selFunc = document.getElementById("filtro-historico-funcionario");

  if (!selVeic || !selFunc) return;

  selVeic.innerHTML = `<option value="">Todos</option>`;
  selFunc.innerHTML = `<option value="">Todos</option>`;

  try {
    const { data: veiculos, error: errV } = await supa.from("veiculos").select("*").order("modelo").limit(50);
    const { data: funcionarios, error: errF } = await supa.from("funcionarios").select("*").order("nome").limit(50);

    if (errV || errF) throw errV ?? errF;

    veiculos?.forEach(v => {
      selVeic.innerHTML += `<option value="${v.id}">${v.modelo} (${v.placa})</option>`;
    });

    funcionarios?.forEach(f => {
      selFunc.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
    });

  } catch (err) {
    console.error("Erro em carregarHistoricoFiltros:", err);
  }
}

// ------------------------------------------------------------
// RESERVAS (continuação e funções com melhorias)
// ------------------------------------------------------------

async function abrirModalNovaReserva() {
  try {
    const { data: veiculos, error: veicErr } = await supa.from("veiculos").select("*").eq("status", "disponivel").limit(50);
    const { data: funcionarios, error: funcErr } = await supa.from("funcionarios").select("*").eq("ativo", true).limit(50);

    if (veicErr) throw veicErr;
    if (funcErr) throw funcErr;

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

      <label class="form-label">Data/Hora Retorno Prevista</label>
      <input id="res-retorno" type="datetime-local" class="form-control mb-2" min="${getMinDateTime()}">
      <small class="text-muted">Deixe igual à saída para devolução no mesmo dia.</small>

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
  } catch (err) {
    console.error("Erro abrirModalNovaReserva:", err);
    Swal.fire("Erro", "Falha ao carregar dados para nova reserva.", "error");
  }
}

async function salvarReserva() {
  try {
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
    const dRetorno = new Date(retorno);
    const agora = new Date();

    if (dSaida < agora) {
      Swal.fire("Atenção", "A data/hora de saída já passou.", "warning");
      return;
    }
    if (dRetorno <= dSaida) {
      Swal.fire("Atenção", "O retorno deve ser após a saída.", "warning");
      return;
    }

    const conflito = await existeConflito(veiculo, saida, retorno);
    if (conflito) {
      Swal.fire("Conflito", "Este veículo já possui reserva nesse horário.", "error");
      return;
    }

    const saidaISO = dSaida.toISOString();
    const retornoISO = dRetorno.toISOString();

    const { error } = await supa.from("reservas").insert({
      funcionario_id: funcionario,
      veiculo_id: veiculo,
      data_saida_prevista: saidaISO,
      data_retorno_previsto: retornoISO,
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

  } catch (err) {
    console.error("Erro salvarReserva:", err);
    Swal.fire("Erro", "Erro inesperado. Verifique o console.", "error");
  }
}

async function abrirModalEditarReserva(id) {
  try {
    const { data: reserva, error } = await supa.from("reservas").select("*").eq("id", id).maybeSingle();
    if (error || !reserva) throw error || new Error("Reserva não encontrada");

    const { data: veiculos, error: errV } = await supa.from("veiculos").select("*").limit(50);
    const { data: funcionarios, error: errF } = await supa.from("funcionarios").select("*").limit(50);

    if (errV || errF) throw errV || errF;

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
             value="${toInputDateTime(reserva.data_retorno_previsto)}">

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

  } catch (err) {
    console.error("Erro abrirModalEditarReserva:", err);
    Swal.fire("Erro", "Falha ao abrir modal de edição.", "error");
  }
}

async function salvarEdicaoReserva(id) {
  try {
    const funcionario_id = document.getElementById("edit-res-func")?.value;
    const veiculo_id = document.getElementById("edit-res-veic")?.value;
    const data_saida_prevista = document.getElementById("edit-res-saida-prev")?.value || null;
    const data_retorno_previsto = document.getElementById("edit-res-ret-prev")?.value || null;
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
    const dRetPrev = data_retorno_previsto ? new Date(data_retorno_previsto) : null;
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

    if (veiculo_id && data_saida_prevista && data_retorno_previsto) {
      const conflito = await existeConflito(veiculo_id, data_saida_prevista, data_retorno_previsto, id);
      if (conflito) {
        Swal.fire("Erro", "Conflito de horário com outra reserva.", "error");
        return;
      }
    }

    const updates = {
      funcionario_id,
      veiculo_id,
      data_saida_prevista: dSaidaPrev ? dSaidaPrev.toISOString() : null,
      data_retorno_previsto: dRetPrev ? dRetPrev.toISOString() : null,
      data_saida_real: dSaidaReal ? dSaidaReal.toISOString() : null,
      data_retorno_real: dRetReal ? dRetReal.toISOString() : null,
      km_inicio,
      km_fim,
      motivo
    };

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
    console.error("Erro salvarEdicaoReserva:", err);
    Swal.fire("Erro", "Erro inesperado. Verifique o console.", "error");
  }
}

async function excluirReserva(id) {
  try {
    const confirmar = await Swal.fire({
      title: "Excluir reserva?",
      text: "Esta ação é irreversível.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar"
    });

    if (!confirmar.isConfirmed) return;

    const { error } = await supa.from("reservas").delete().eq("id", id);

    if (error) {
      Swal.fire("Erro", "Falha ao excluir reserva.", "error");
      console.error(error);
      return;
    }

    Swal.fire("Excluída!", "Reserva excluída com sucesso.", "success");
    carregarReservas();
    carregarHistorico();

  } catch (err) {
    console.error("Erro excluirReserva:", err);
    Swal.fire("Erro", "Erro inesperado ao excluir.", "error");
  }
}

// ------------------------------------------------------------
// FUNCIONÁRIOS (USUÁRIOS)
// ------------------------------------------------------------

async function carregarUsuarios() {
  const tbody = document.getElementById("tabela-usuarios");
  tbody.innerHTML = "<tr><td colspan='4'>Carregando...</td></tr>";

  try {
    const { data, error } = await supa.from("funcionarios").select("*").order("nome").limit(50);

    if (error) throw error;

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
          <td>${f.ativo ? "Ativo" : "Inativo"}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEditarFuncionario('${f.id}')">Editar</button>
            <button class="btn btn-sm btn-outline-warning" onclick="toggleAtivo('${f.id}', ${f.ativo})">${f.ativo ? "Desativar" : "Ativar"}</button>
            <button class="btn btn-sm btn-outline-danger" onclick="excluirFuncionario('${f.id}')">Excluir</button>
          </td>
        </tr>`;
    });

  } catch (err) {
    console.error("Erro carregarUsuarios:", err);
    tbody.innerHTML = "<tr><td colspan='4'>Erro ao carregar funcionários.</td></tr>";
  }
}

async function salvarNovoFuncionario() {
  try {
    const nome = document.getElementById("func-nome").value.trim();
    const email = document.getElementById("func-email").value.trim();
    const senha = document.getElementById("func-senha").value;

    if (!nome || !email || !senha) {
      Swal.fire("Atenção", "Preencha todos os campos!", "warning");
      return;
    }

    const { data, error } = await supa.auth.signUp({
      email,
      password: senha,
    });

    if (error) {
      Swal.fire("Erro", "Falha ao criar usuário.", "error");
      return;
    }

    const { error: dbError } = await supa.from("funcionarios").insert({
      id: data.user.id,
      nome,
      email,
      ativo: true,
    });

    if (dbError) {
      Swal.fire("Erro", "Falha ao salvar funcionário.", "error");
      return;
    }

    bootstrap.Modal.getInstance(document.getElementById("modalFuncionario")).hide();
    Swal.fire("Sucesso!", "Funcionário cadastrado!", "success");
    carregarUsuarios();

  } catch (err) {
    console.error("Erro salvarNovoFuncionario:", err);
    Swal.fire("Erro", "Erro inesperado ao criar funcionário.", "error");
  }
}

// ------------------------------------------------------------
// FUNCIONÁRIOS (continuação)
// ------------------------------------------------------------

async function abrirModalEditarFuncionario(id) {
  try {
    const { data, error } = await supa.from("funcionarios").select("*").eq("id", id).maybeSingle();
    if (error || !data) throw error || new Error("Funcionário não encontrado.");

    const modal = `
<div class="modal fade" id="modalFuncionario" tabindex="-1">
  <div class="modal-dialog"><div class="modal-content">
    <div class="modal-header bg-primary text-white">
      <h5 class="modal-title">Editar Funcionário</h5>
      <button class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body">
      <label class="form-label">Nome</label>
      <input id="func-nome" class="form-control mb-2" value="${data.nome}">

      <label class="form-label">E-mail</label>
      <input id="func-email" type="email" class="form-control mb-2" value="${data.email}">

      <label class="form-label">Ativo</label>
      <select id="func-ativo" class="form-select">
        <option value="true" ${data.ativo ? "selected" : ""}>Sim</option>
        <option value="false" ${!data.ativo ? "selected" : ""}>Não</option>
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-primary" onclick="salvarEdicaoFuncionario('${id}')">Salvar</button>
    </div>
  </div></div>
</div>`;
    document.getElementById("modal-container").innerHTML = modal;
    new bootstrap.Modal("#modalFuncionario").show();

  } catch (err) {
    console.error("Erro abrirModalEditarFuncionario:", err);
    Swal.fire("Erro", "Falha ao carregar dados do funcionário.", "error");
  }
}

async function salvarEdicaoFuncionario(id) {
  try {
    const nome = document.getElementById("func-nome").value.trim();
    const email = document.getElementById("func-email").value.trim();
    const ativo = document.getElementById("func-ativo").value === "true";

    if (!nome || !email) {
      Swal.fire("Atenção", "Preencha nome e e-mail!", "warning");
      return;
    }

    const { error } = await supa
      .from("funcionarios")
      .update({ nome, email, ativo })
      .eq("id", id);

    if (error) {
      Swal.fire("Erro", "Falha ao atualizar funcionário.", "error");
      return;
    }

    bootstrap.Modal.getInstance(document.getElementById("modalFuncionario")).hide();
    Swal.fire("Sucesso!", "Funcionário atualizado!", "success");
    carregarUsuarios();

  } catch (err) {
    console.error("Erro salvarEdicaoFuncionario:", err);
    Swal.fire("Erro", "Erro inesperado ao atualizar funcionário.", "error");
  }
}

async function toggleAtivo(id, atual) {
  try {
    const novo = !atual;
    const { error } = await supa
      .from("funcionarios")
      .update({ ativo: novo })
      .eq("id", id);

    if (error) {
      Swal.fire("Erro", "Falha ao alterar status.", "error");
      return;
    }

    Swal.fire("Sucesso!", `Funcionário ${novo ? "ativado" : "desativado"}!`, "success");
    carregarUsuarios();

  } catch (err) {
    console.error("Erro toggleAtivo:", err);
    Swal.fire("Erro", "Erro inesperado ao alterar status.", "error");
  }
}

async function excluirFuncionario(id) {
  try {
    const confirmar = await Swal.fire({
      title: "Excluir funcionário?",
      text: "Esta ação é irreversível e pode afetar reservas.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar"
    });

    if (!confirmar.isConfirmed) return;

    const { error } = await supa.from("funcionarios").delete().eq("id", id);

    if (error) {
      Swal.fire("Erro", "Falha ao excluir funcionário.", "error");
      console.error(error);
      return;
    }

    Swal.fire("Excluído!", "Funcionário excluído com sucesso.", "success");
    carregarUsuarios();

  } catch (err) {
    console.error("Erro excluirFuncionario:", err);
    Swal.fire("Erro", "Erro inesperado ao excluir funcionário.", "error");
  }
}

// ------------------------------------------------------------
// PERMISSÕES DE VEÍCULOS
// ------------------------------------------------------------

async function abrirModalPermissoes(veiculoId) {
  try {
    const { data: funcionarios } = await supa.from("funcionarios").select("*").eq("ativo", true).limit(50);
    const { data: autorizados } = await supa.from("veiculo_funcionarios").select("funcionario_id").eq("veiculo_id", veiculoId);

    const autorizadosIds = autorizados?.map(a => a.funcionario_id) || [];

    const checkboxes = (funcionarios || []).map(f =>
      `<div class="form-check">
        <input class="form-check-input" type="checkbox" value="${f.id}" id="func-${f.id}" ${autorizadosIds.includes(f.id) ? "checked" : ""}>
        <label class="form-check-label" for="func-${f.id}">${f.nome}</label>
      </div>`
    ).join("");

    const subModal = `
<div class="modal fade" id="modalPermissoes" tabindex="-1">
  <div class="modal-dialog"><div class="modal-content">
    <div class="modal-header bg-success text-white">
      <h5 class="modal-title">Permissões do Veículo</h5>
      <button class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body">
      <p>Selecione os funcionários autorizados para usar este veículo:</p>
      ${checkboxes}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-success" onclick="salvarPermissoes('${veiculoId}')">Salvar Permissões</button>
    </div>
  </div></div>
</div>`;

    document.getElementById("modal-container").innerHTML += subModal;
    new bootstrap.Modal("#modalPermissoes").show();

  } catch (err) {
    console.error("Erro abrirModalPermissoes:", err);
    Swal.fire("Erro", "Falha ao carregar permissões.", "error");
  }
}

async function salvarPermissoes(veiculoId) {
  try {
    const checkboxes = document.querySelectorAll("#modalPermissoes input[type='checkbox']:checked");
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);

    // Remove permissões atuais
    const { error: delError } = await supa.from("veiculo_funcionarios").delete().eq("veiculo_id", veiculoId);
    if (delError) throw delError;

    // Insere os novos autorizados
    if (selectedIds.length > 0) {
      const inserts = selectedIds.map(funcId => ({ veiculo_id: veiculoId, funcionario_id: funcId }));
      const { error: insError } = await supa.from("veiculo_funcionarios").insert(inserts);
      if (insError) throw insError;
    }

    bootstrap.Modal.getInstance(document.getElementById("modalPermissoes")).hide();
    Swal.fire("Sucesso!", "Permissões atualizadas!", "success");
  } catch (err) {
    console.error("Erro salvarPermissoes:", err);
    Swal.fire("Erro", "Falha ao salvar permissões.", "error");
  }
}

// ------------------------------------------------------------
// Função auxiliar para abrir fotos armazenadas
// ------------------------------------------------------------
function verFoto(path) {
  const clean = (path || "").trim();
  if (!clean) return;

  const supabaseUrl = "https://awlylgtadbljkjgbneds.supabase.co";
  const url = `${supabaseUrl}/storage/v1/object/public/painel-fotos/${encodeURI(clean)}`;
  
  window.open(url, "_blank");
}