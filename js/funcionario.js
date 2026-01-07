// ------------------------------------------------------------
// FUNCIONÁRIO – ILUMI SISTEMA DE VEÍCULOS
// ------------------------------------------------------------

<<<<<<< HEAD
// Estado da reserva (MODIFICADO: Adicionado dataRetorno)
=======

// Veículos restritos: só os e-mails listados podem reservar
// Se um veículo NÃO estiver aqui, fica liberado para todos.
const VEICULOS_RESTRITOS = {
  // "UUID_DO_VEICULO_AQUI": ["joao@ilumi.com", "maria@ilumi.com"],
  // "UUID_DO_VEICULO_B": ["fulano@ilumi.com"]
};


>>>>>>> d03174534502a1f8bbb160230592bab66f04c73e
const estadoReservaFuncionario = {
  veiculoId: null,
  data: null,         // yyyy-MM-dd (data de saída)
  dataRetorno: null,  // NOVO: yyyy-MM-dd (data de retorno)
  saida: null,        // Date (horário de saída)
  retorno: null,      // Date (horário de retorno)
  intervalosBloqueados: [] // {inicio: Date, fim: Date}
};

    document.addEventListener('DOMContentLoaded', () => {
    protegerRota('funcionario');
    carregarUsuario();
    carregarVeiculosDisponiveis();
    carregarMinhasReservas();
    configurarFormReserva();
    configurarCheckinCheckout();

    const saidaHidden = document.getElementById("reserva-saida");
    const retornoHidden = document.getElementById("reserva-retorno");
    if (saidaHidden) saidaHidden.value = "";
    if (retornoHidden) retornoHidden.value = "";

    // Eventos para atualizar grade de horários
    const selVeic = document.getElementById("reserva-veiculo");
    const inputData = document.getElementById("reserva-data");
    if (selVeic) selVeic.addEventListener("change", onFiltroHorarioChange);
    if (inputData) inputData.addEventListener("change", onFiltroHorarioChange);
    });


<<<<<<< HEAD
  // Eventos para atualizar grade de horários
  const selVeic = document.getElementById("reserva-veiculo");
  const inputData = document.getElementById("reserva-data");
  // NOVO: Listener para data de retorno
  const inputDataRetorno = document.getElementById("reserva-data-retorno");
  if (selVeic) selVeic.addEventListener("change", onFiltroHorarioChange);
  if (inputData) inputData.addEventListener("change", onFiltroHorarioChange);
  if (inputDataRetorno) inputDataRetorno.addEventListener("change", onFiltroHorarioChange);
});
=======
>>>>>>> d03174534502a1f8bbb160230592bab66f04c73e

// ------------------------------------------------------------
// PROTEÇÃO DE ROTA
// ------------------------------------------------------------
function protegerRota(roleEsperado) {
  const role = sessionStorage.getItem("ilumiUserRole");
  if (role !== roleEsperado) window.location.href = "index.html";
}

// ------------------------------------------------------------
// USUÁRIO LOGADO
// ------------------------------------------------------------
function carregarUsuario() {
  const email = sessionStorage.getItem("ilumiUserEmail");
  document.getElementById("user-info").textContent = email ?? "";

  document.getElementById("logout-btn").onclick = async () => {
    await supa.auth.signOut();
    sessionStorage.clear();
    window.location.href = "index.html";
  };
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
function getMinDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
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

// ------------------------------------------------------------
// BLOQUEIOS (30 MIN ANTES / 1H DEPOIS)
// ------------------------------------------------------------
async function obterIntervalosBloqueados(veiculoId) {
  // MODIFICADO: Buscar reservas que sobreponham o período (saída a retorno)
  const dataSaida = estadoReservaFuncionario.data;
  const dataRetorno = estadoReservaFuncionario.dataRetorno;
  if (!dataSaida || !dataRetorno) return [];

  const { data, error } = await supa
    .from("reservas")
    .select("data_saida_prevista, data_retorno_previsto, data_retorno_real, status")
    .eq("veiculo_id", veiculoId)
    .neq("status", "cancelada")
    .or(`and(data_saida_prevista.lte.${dataRetorno}T23:59,data_retorno_previsto.gte.${dataSaida}T00:00)`);  // Overlap no período

  if (error) {
    console.error("Erro ao buscar intervalos bloqueados:", error);
    return [];
  }

  const intervalos = [];

  for (const r of data || []) {
    if (!r.data_saida_prevista || (!r.data_retorno_previsto && !r.data_retorno_real)) {
      continue;
    }

    const saidaPrev = new Date(r.data_saida_prevista);
    const retornoEfetivo = r.data_retorno_real
      ? new Date(r.data_retorno_real)
      : new Date(r.data_retorno_previsto);

    // 30 min antes
    const bloqueioAntes = new Date(saidaPrev.getTime() - 30 * 60 * 1000);
    // 1 hora depois
    const bloqueioDepois = new Date(retornoEfetivo.getTime() + 60 * 60 * 1000);

    intervalos.push({ inicio: bloqueioAntes, fim: bloqueioDepois });
  }

  return intervalos;
}

// função reaproveitada na criação da reserva (confirmação final)
async function existeConflito(veiculo_id, saida, retorno) {
  const intervalos = await obterIntervalosBloqueados(veiculo_id);
  const novaSaida = new Date(saida);
  const novoRetorno = new Date(retorno);

  for (const inter of intervalos) {
    if (novaSaida < inter.fim && novoRetorno > inter.inicio) {
      return true;
    }
  }
  return false;
}

// ------------------------------------------------------------
// CARREGAR VEÍCULOS DISPONÍVEIS
// ------------------------------------------------------------
async function carregarVeiculosDisponiveis() {
  const selectVeiculo = document.getElementById("reserva-veiculo");
  selectVeiculo.innerHTML = '<option value="">Carregando...</option>';

  const email = sessionStorage.getItem("ilumiUserEmail");

  // 1) Descobre funcionario_id
  const { data: funcionario, error: funcErr } = await supa
    .from("funcionarios")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (funcErr || !funcionario) {
    selectVeiculo.innerHTML = '<option value="">Erro ao identificar funcionário</option>';
    return;
  }

  // 2) Carrega veículos disponíveis
  const { data: veiculos, error: veicErr } = await supa
    .from("veiculos")
    .select("id, modelo, placa, status")
    .eq("status", "disponivel")
    .order("modelo");

  if (veicErr) {
    Swal.fire("Erro", "Falha ao carregar veículos.", "error");
    return;
  }

  const veiculoIds = (veiculos || []).map(v => v.id);
  if (!veiculoIds.length) {
    selectVeiculo.innerHTML = '<option value="">Sem veículos disponíveis</option>';
    return;
  }

  // 3) Busca todas as permissões desses veículos
  const { data: perms, error: permErr } = await supa
    .from("veiculo_permissoes")
    .select("veiculo_id, funcionario_id")
    .in("veiculo_id", veiculoIds);

  if (permErr) {
    Swal.fire("Erro", "Falha ao carregar permissões de veículos.", "error");
    return;
  }

  // Mapa: veiculo_id -> Set(funcionario_id)
  const mapa = new Map();
  (perms || []).forEach(p => {
    if (!mapa.has(p.veiculo_id)) mapa.set(p.veiculo_id, new Set());
    mapa.get(p.veiculo_id).add(p.funcionario_id);
  });

  // Regra: se veículo não tem entrada no mapa => livre
  // se tem => só aparece se funcionario.id estiver permitido
  const filtrados = (veiculos || []).filter(v => {
    const set = mapa.get(v.id);
    if (!set) return true; // livre
    return set.has(funcionario.id); // restrito
  });

  selectVeiculo.innerHTML = '<option value="">Selecione...</option>';
  if (!filtrados.length) {
    selectVeiculo.innerHTML += `<option value="" disabled>Nenhum veículo disponível para você</option>`;
    return;
  }

  filtrados.forEach(v => {
    selectVeiculo.innerHTML += `<option value="${v.id}">${v.modelo} (${v.placa})</option>`;
  });
}

// ------------------------------------------------------------
// EVENTO AO MUDAR VEÍCULO OU DATA (ATUALIZA GRADE)
// ------------------------------------------------------------
async function onFiltroHorarioChange() {
  const veiculoId = document.getElementById("reserva-veiculo").value;
  const dataReserva = document.getElementById("reserva-data").value; // yyyy-MM-dd
  // NOVO: Capturar data de retorno
  const dataReservaRetorno = document.getElementById("reserva-data-retorno").value;

  estadoReservaFuncionario.veiculoId = veiculoId || null;
  estadoReservaFuncionario.data = dataReserva || null;
  estadoReservaFuncionario.dataRetorno = dataReservaRetorno || null;  // NOVO
  estadoReservaFuncionario.saida = null;
  estadoReservaFuncionario.retorno = null;
  estadoReservaFuncionario.intervalosBloqueados = [];

  // Zera inputs hidden
  document.getElementById("reserva-saida").value = "";
  document.getElementById("reserva-retorno").value = "";

  // Reset grade de retorno
  limparGradeRetorno("Escolha primeiro o horário de saída.");

  if (!veiculoId || !dataReserva || !dataReservaRetorno) {  // MODIFICADO: Verificar ambas datas
    const gradeSaida = document.getElementById("grade-saida");
    gradeSaida.innerHTML = `<span class="slot-legenda">Selecione o veículo e as datas.</span>`;
    return;
  }

  // Carrega intervalos bloqueados e monta grade de saída
  estadoReservaFuncionario.intervalosBloqueados = await obterIntervalosBloqueados(veiculoId);
  montarGradeSaida();
}

// ------------------------------------------------------------
// MONTAR GRADE DE HORÁRIOS - SAÍDA
// ------------------------------------------------------------
function montarGradeSaida() {
  const gradeSaida = document.getElementById("grade-saida");
  gradeSaida.innerHTML = "";

  const { data, dataRetorno, intervalosBloqueados } = estadoReservaFuncionario;  // MODIFICADO: Incluir dataRetorno
  if (!data || !dataRetorno) {
    gradeSaida.innerHTML = `<span class="slot-legenda">Selecione o veículo e as datas.</span>`;
    return;
  }

  const base = new Date(`${data}T00:00:00`);
  const agora = new Date();

  for (let i = 0; i < 48; i++) {
    const slotInicio = new Date(base.getTime() + i * 30 * 60 * 1000);
    const slotFim = new Date(slotInicio.getTime() + 30 * 60 * 1000);

    let disponivel = true;

    // Não permitir horários que já passaram (hoje)
    if (slotFim <= agora) {
      disponivel = false;
    } else {
      // MODIFICADO: Verificar conflito no período inteiro (saída a retorno)
      for (const inter of intervalosBloqueados) {
        const periodoReserva = {
          inicio: new Date(`${data}T${slotInicio.toTimeString().slice(0, 5)}`),
          fim: new Date(`${dataRetorno}T${slotFim.toTimeString().slice(0, 5)}`)
        };
        if (periodoReserva.inicio < inter.fim && periodoReserva.fim > inter.inicio) {
          disponivel = false;
          break;
        }
      }
    }

    const span = document.createElement("span");
    span.classList.add("slot-pill");
    span.textContent = slotInicio.toTimeString().slice(0, 5); // HH:MM

    if (!disponivel) {
      span.classList.add("bloqueado");
    } else {
      span.classList.add("disponivel");
      span.addEventListener("click", () => selecionarHorarioSaida(slotInicio, span));
    }

    gradeSaida.appendChild(span);
  }
}

// ------------------------------------------------------------
// MONTAR / LIMPAR GRADE DE RETORNO
// ------------------------------------------------------------
function limparGradeRetorno(mensagem) {
  const gradeRet = document.getElementById("grade-retorno");
  gradeRet.innerHTML = `<span class="slot-legenda">${mensagem}</span>`;
}

function montarGradeRetorno() {
  const gradeRet = document.getElementById("grade-retorno");
  gradeRet.innerHTML = "";

  const { data, dataRetorno, intervalosBloqueados, saida } = estadoReservaFuncionario;  // MODIFICADO: Incluir dataRetorno
  if (!data || !dataRetorno || !saida) {
    limparGradeRetorno("Escolha primeiro o horário de saída.");
    return;
  }

  const base = new Date(`${dataRetorno}T00:00:00`);  // MODIFICADO: Usar dataRetorno

  for (let i = 0; i < 48; i++) {
    const slotInicio = new Date(base.getTime() + i * 30 * 60 * 1000);
    const slotFim = new Date(slotInicio.getTime() + 30 * 60 * 1000);

    let disponivel = true;

    // MODIFICADO: Retorno deve ser DEPOIS da saída (mesmo em dias diferentes)
    if (slotInicio <= saida) {
      disponivel = false;
    } else {
      // Não conflitar com intervalos bloqueados
      for (const inter of intervalosBloqueados) {
        if (slotInicio < inter.fim && slotFim > inter.inicio) {
          disponivel = false;
          break;
        }
      }
    }

    const span = document.createElement("span");
    span.classList.add("slot-pill");
    span.textContent = slotInicio.toTimeString().slice(0, 5);

    if (!disponivel) {
      span.classList.add("bloqueado");
    } else {
      span.classList.add("disponivel");
      span.addEventListener("click", () => selecionarHorarioRetorno(slotInicio, span));
    }

    gradeRet.appendChild(span);
  }
}

// ------------------------------------------------------------
// SELEÇÃO DE SAÍDA / RETORNO
// ------------------------------------------------------------
function selecionarHorarioSaida(dateObj, spanEl) {
  estadoReservaFuncionario.saida = dateObj;
  estadoReservaFuncionario.retorno = null;

  // Marcar visualmente
  const gradeSaida = document.getElementById("grade-saida");
  gradeSaida.querySelectorAll(".slot-pill.disponivel").forEach(el => {
    el.classList.remove("selecionado");
  });
  spanEl.classList.add("selecionado");

  // Limpa retorno anterior
  document.getElementById("reserva-retorno").value = "";
  limparGradeRetorno("Selecione o horário de retorno.");

  // ✅ SALVAR COM TIMEZONE (UTC) - evita -3h
  document.getElementById("reserva-saida").value = dateObj.toISOString();

  montarGradeRetorno();
}

function selecionarHorarioRetorno(dateObj, spanEl) {
  estadoReservaFuncionario.retorno = dateObj;

  const gradeRet = document.getElementById("grade-retorno");
  gradeRet.querySelectorAll(".slot-pill.disponivel").forEach(el => {
    el.classList.remove("selecionado");
  });
  spanEl.classList.add("selecionado");

<<<<<<< HEAD
  // MODIFICADO: Usar dataRetorno
  const data = estadoReservaFuncionario.dataRetorno;
  const hhmm = spanEl.textContent;
  document.getElementById("reserva-retorno").value = `${data}T${hhmm}`;
=======
  // ✅ SALVAR COM TIMEZONE (UTC) - evita -3h
  document.getElementById("reserva-retorno").value = dateObj.toISOString();
>>>>>>> d03174534502a1f8bbb160230592bab66f04c73e
}

// ------------------------------------------------------------
// FORMULÁRIO DE RESERVA (USA OS HIDDEN)
// ------------------------------------------------------------
function configurarFormReserva() {
  const form = document.getElementById("form-reserva");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const veiculo = document.getElementById("reserva-veiculo").value;
    const dataSaida = document.getElementById("reserva-data").value;
    const dataRetorno = document.getElementById("reserva-data-retorno").value;  // NOVO
    const saida = document.getElementById("reserva-saida").value;
    const retorno = document.getElementById("reserva-retorno").value;
    const motivo = document.getElementById("reserva-motivo").value.trim();
    const email = sessionStorage.getItem("ilumiUserEmail");

    // MODIFICADO: Validações para datas
    if (!veiculo || !dataSaida || !dataRetorno || !saida || !retorno || !motivo) {
      Swal.fire("Atenção", "Selecione veículo, datas, horários e motivo.", "warning");
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

    // Verificação final de conflito (blindagem extra)
    const conflito = await existeConflito(veiculo, saida, retorno);
    if (conflito) {
      Swal.fire("Indisponível", "Este horário foi ocupado enquanto você selecionava.", "error");
      return;
    }

    const { data: funcionario } = await supa
      .from("funcionarios")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!funcionario) {
      Swal.fire("Erro", "Seu usuário não foi encontrado.", "error");
      return;
    }

    const { error } = await supa.from("reservas").insert({
      veiculo_id: veiculo,
      funcionario_id: funcionario.id,
      data_saida_prevista: saida,
      data_retorno_previsto: retorno,
      motivo,
      status: "aberta"
    });

    if (error) {
      console.error(error);
      Swal.fire("Erro", "Não foi possível criar a reserva.", "error");
      return;
    }

    Swal.fire("Sucesso!", "Reserva criada com sucesso.", "success");
    form.reset();

    // Limpa estado e grades
    estadoReservaFuncionario.saida = null;
    estadoReservaFuncionario.retorno = null;
    document.getElementById("grade-saida").innerHTML = `<span class="slot-legenda">Selecione o veículo e as datas.</span>`;
    limparGradeRetorno("Escolha primeiro o horário de saída.");

    carregarMinhasReservas();
  });
}

// ------------------------------------------------------------
// MINHAS RESERVAS + SELECT PARA CHECK-IN/OUT
// ------------------------------------------------------------
async function carregarMinhasReservas() {
  console.log("=== Iniciando carregarMinhasReservas ===");
  const tbody = document.getElementById("tabela-minhas-reservas");
  tbody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';

  try {
    const email = sessionStorage.getItem("ilumiUserEmail");
    console.log("E-mail do usuário:", email);

        if (!email) {
      tbody.innerHTML = '<tr><td colspan="4">Erro: Usuário não logado.</td></tr>';
      return;
    }

    const { data: funcionario, error: funcError } = await supa
      .from("funcionarios")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    console.log("Dados do funcionário:", funcionario, "Erro:", funcError);

    if (funcError) {
      tbody.innerHTML = '<tr><td colspan="4">Erro ao buscar funcionário.</td></tr>';
      console.error("Erro no funcionário:", funcError);
      return;
    }

    if (!funcionario) {
      tbody.innerHTML = '<tr><td colspan="4">Funcionário não encontrado.</td></tr>';
      return;
    }

    const { data, error } = await supa
      .from("reservas_view")
      .select("*")
      .eq("funcionario_id", funcionario.id)
      .order("data_saida_prevista", { ascending: false });

    console.log("Dados das reservas:", data, "Erro:", error);

    if (error) {
      tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar reservas.</td></tr>';
      console.error("Erro nas reservas:", error);
      return;
    }

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">Você ainda não tem reservas.</td></tr>';
      return;
    }

    tbody.innerHTML = "";
    data.forEach(r => {
      const status = r.status;
      const podeCancelar = status === "aberta";  // Só permite cancelar se aberta

      tbody.innerHTML += `
<<<<<<< HEAD
        <tr>
          <td>${r.veiculo_modelo} (${r.veiculo_placa})</td>
          <td>${formatarDataHoraBR(r.data_saida_real || r.data_saida_prevista)}</td>
          <td>${formatarDataHoraBR(r.data_retorno_real || r.data_retorno_previsto)}</td>
          <td>${status}</td>
          <td>
            ${podeCancelar ? `<button class="btn btn-sm btn-outline-warning" onclick="cancelarReserva('${r.id}')">Cancelar</button>` : "-"}
          </td>
        </tr>
      `;
=======
  <tr>
    <td>${r.veiculo_modelo} (${r.veiculo_placa})</td>
    <td>${formatarDataHoraBR(r.data_saida_real || r.data_saida_prevista)}</td>
    <td>${formatarDataHoraBR(r.data_retorno_real || r.data_retorno_previsto)}</td>
    <td>${r.status}</td>
    <td>
      ${
        (r.status === "aberta")
          ? `<button class="btn btn-sm btn-outline-danger" onclick="cancelarReservaFuncionario('${r.id}')">
               Excluir
             </button>`
          : `<span class="text-muted small">-</span>`
      }
    </td>
  </tr>
`;
>>>>>>> d03174534502a1f8bbb160230592bab66f04c73e
    });

    console.log("=== carregarMinhasReservas concluído ===");

  } catch (err) {
    console.error("Erro inesperado em carregarMinhasReservas:", err);
    tbody.innerHTML = '<tr><td colspan="4">Erro inesperado. Verifique o console.</td></tr>';
  }
}

// ------------------------------------------------------------
// CHECK-IN / CHECK-OUT (SEPARADOS)
// ------------------------------------------------------------
function configurarCheckinCheckout() {
  document.getElementById("btn-checkin").onclick = () => fazerCheck("in");
  document.getElementById("btn-checkout").onclick = () => fazerCheck("out");
  carregarReservasCheckin();
  carregarReservasCheckout();
}

async function carregarReservasCheckin() {
  const select = document.getElementById("checkin-reserva");
  select.innerHTML = '<option value="">Selecione...</option>';

  const email = sessionStorage.getItem("ilumiUserEmail");
  const { data: funcionario } = await supa
    .from("funcionarios")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!funcionario) return;

  const { data, error } = await supa
    .from("reservas_view")
    .select("*")
    .eq("funcionario_id", funcionario.id)
    .eq("status", "aberta")  // Só reservas abertas para check-in
    .order("data_saida_prevista", { ascending: false });

  if (error) return;

  data.forEach(r => {
    select.innerHTML += `
      <option value="${r.id}" data-status="${r.status}">
        ${r.veiculo_modelo} — ${formatarDataHoraBR(r.data_saida_prevista)}
      </option>
    `;
  });
}

async function carregarReservasCheckout() {
  const select = document.getElementById("checkout-reserva");
  select.innerHTML = '<option value="">Selecione...</option>';

  const email = sessionStorage.getItem("ilumiUserEmail");
  const { data: funcionario } = await supa
    .from("funcionarios")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!funcionario) return;

  const { data, error } = await supa
    .from("reservas_view")
    .select("*")
    .eq("funcionario_id", funcionario.id)
    .eq("status", "em_uso")  // Só reservas em uso para check-out
    .order("data_saida_prevista", { ascending: false });

  if (error) return;

  data.forEach(r => {
    select.innerHTML += `
      <option value="${r.id}" data-status="${r.status}">
        ${r.veiculo_modelo} — ${formatarDataHoraBR(r.data_saida_prevista)}
      </option>
    `;
  });
}

async function fazerCheck(tipo) {
  const isCheckin = tipo === "in";
  const select = isCheckin ? document.getElementById("checkin-reserva") : document.getElementById("checkout-reserva");
  const km = isCheckin ? document.getElementById("checkin-km").value : document.getElementById("checkout-km").value;
  const foto = isCheckin ? document.getElementById("checkin-foto").files[0] : document.getElementById("checkout-foto").files[0];

  const reservaId = Number(select.value);
  if (!reservaId || !km || !foto) {
    Swal.fire("Atenção", "Selecione a reserva, informe o KM e envie a foto.", "warning");
    return;
  }

  const status = select.options[select.selectedIndex].dataset.status;
  if (isCheckin && status !== "aberta") {
    Swal.fire("Atenção", "Só é possível fazer check-in de reservas abertas.", "warning");
    return;
  }
  if (!isCheckin && status !== "em_uso") {
    Swal.fire("Atenção", "Só é possível fazer check-out de reservas em uso.", "warning");
    return;
  }

  const safeName = foto.name.replace(/[^\w.\-]/g, "_");
  const email = sessionStorage.getItem("ilumiUserEmail");
  const timestamp = Date.now();
  const path = `${email}/${reservaId}/${tipo}-${timestamp}-${safeName}`;

  console.log("Tentando upload para path:", path, "Arquivo:", foto.name);

  const { error: uploadError } = await supa
    .storage
    .from("painel-fotos")
    .upload(path, foto);

  console.log("Upload erro:", uploadError);

  if (uploadError) {
    console.error("Erro no upload:", uploadError);
    Swal.fire("Erro", "Não foi possível enviar a foto.", "error");
    return;
  }

  console.log("Upload bem-sucedido, path salvo:", path);

  const agora = new Date().toISOString();
  let updates = {};

  if (isCheckin) {
    updates = {
      data_saida_real: agora,
      km_inicio: km,
      foto_painel_inicio: path,
      status: "em_uso"
    };
  } else {
    updates = {
      data_retorno_real: agora,
      km_fim: km,
      foto_painel_fim: path,
      status: "finalizada"
    };
  }

  const { error } = await supa
    .from("reservas")
    .update(updates)
    .eq("id", reservaId);

  if (error) {
    console.error(error);
    Swal.fire("Erro", "Falha ao registrar ação.", "error");
    return;
  }

  // 🔹 NOVO: Se for check-out, atualize o KM atual do veículo
  if (!isCheckin) {
    // Busque o veiculo_id da reserva
    const { data: reserva } = await supa
      .from("reservas")
      .select("veiculo_id")
      .eq("id", reservaId)
      .single();

    if (reserva) {
      const { error: veicError } = await supa
        .from("veiculos")
        .update({ km_atual: km })  // Atualiza km_atual com o km_fim
        .eq("id", reserva.veiculo_id);

      if (veicError) {
        console.error("Erro ao atualizar KM do veículo:", veicError);
        // Não bloqueia o check-out, apenas loga o erro
      } else {
        console.log("KM do veículo atualizado com sucesso.");
      }
    }
  }

  Swal.fire("Sucesso!", `Check-${tipo === "in" ? "in" : "out"} registrado!`, "success");

  // Limpar campos
  if (isCheckin) {
    document.getElementById("checkin-km").value = "";
    document.getElementById("checkin-foto").value = "";
  } else {
    document.getElementById("checkout-km").value = "";
    document.getElementById("checkout-foto").value = "";
  }

  // Recarregar tabelas e selects
  carregarMinhasReservas();
  carregarReservasCheckin();
  carregarReservasCheckout();
}

<<<<<<< HEAD
async function cancelarReserva(id) {
  const confirmar = await Swal.fire({
    title: "Cancelar reserva?",
    text: "Esta ação marcará a reserva como cancelada. Não poderá ser revertida.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, cancelar",
=======

async function cancelarReservaFuncionario(reservaId) {
  const confirmar = await Swal.fire({
    title: "Excluir reserva?",
    text: "A reserva será cancelada e o horário voltará a ficar disponível.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, excluir",
>>>>>>> d03174534502a1f8bbb160230592bab66f04c73e
    cancelButtonText: "Cancelar"
  });

  if (!confirmar.isConfirmed) return;

<<<<<<< HEAD
  const { error } = await supa
    .from("reservas")
    .update({ status: "cancelada" })
    .eq("id", id);

  if (error) {
    Swal.fire("Erro", "Falha ao cancelar reserva.", "error");
    console.error(error);
    return;
  }

  Swal.fire("Cancelada!", "Reserva cancelada com sucesso.", "success");
  carregarMinhasReservas();  // Recarrega a tabela
=======
  // ✅ Melhor prática: cancelar (não deletar)
  const { error } = await supa
    .from("reservas")
    .update({ status: "cancelada" })
    .eq("id", reservaId);

  if (error) {
    console.error(error);
    Swal.fire("Erro", "Não foi possível excluir a reserva.", "error");
    return;
  }

  Swal.fire("Pronto!", "Reserva cancelada com sucesso.", "success");

  // Atualiza tela + selects de check-in/out
  carregarMinhasReservas();
  carregarReservasCheckin();
  carregarReservasCheckout();

  // Recalcula a grade se o usuário estiver montando uma nova reserva
  if (estadoReservaFuncionario.veiculoId && estadoReservaFuncionario.data) {
    onFiltroHorarioChange();
  }
>>>>>>> d03174534502a1f8bbb160230592bab66f04c73e
}