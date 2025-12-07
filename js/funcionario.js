// ------------------------------------------------------------
// FUNCIONÁRIO – ILUMI SISTEMA DE VEÍCULOS
// ------------------------------------------------------------

const estadoReservaFuncionario = {
  veiculoId: null,
  data: null,         // yyyy-MM-dd
  saida: null,        // Date
  retorno: null,      // Date
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

function formatarDataHoraBR(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return "-";
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
  const { data, error } = await supa
    .from("reservas")
    .select("data_saida_prevista, data_retorno_previsto, data_retorno_real, status")
    .eq("veiculo_id", veiculoId)
    .neq("status", "cancelada");

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

  const { data, error } = await supa
    .from("veiculos")
    .select("*")
    .eq("status", "disponivel")
    .order("modelo");

  if (error) {
    Swal.fire("Erro", "Falha ao carregar veículos.", "error");
    return;
  }

  selectVeiculo.innerHTML = '<option value="">Selecione...</option>';
  data.forEach(v => {
    selectVeiculo.innerHTML += `<option value="${v.id}">${v.modelo} (${v.placa})</option>`;
  });
}

// ------------------------------------------------------------
// EVENTO AO MUDAR VEÍCULO OU DATA (ATUALIZA GRADE)
// ------------------------------------------------------------
async function onFiltroHorarioChange() {
  const veiculoId = document.getElementById("reserva-veiculo").value;
  const dataReserva = document.getElementById("reserva-data").value; // yyyy-MM-dd

  estadoReservaFuncionario.veiculoId = veiculoId || null;
  estadoReservaFuncionario.data = dataReserva || null;
  estadoReservaFuncionario.saida = null;
  estadoReservaFuncionario.retorno = null;
  estadoReservaFuncionario.intervalosBloqueados = [];

  // Zera inputs hidden
  document.getElementById("reserva-saida").value = "";
  document.getElementById("reserva-retorno").value = "";

  // Reset grade de retorno
  limparGradeRetorno("Escolha primeiro o horário de saída.");

  if (!veiculoId || !dataReserva) {
    const gradeSaida = document.getElementById("grade-saida");
    gradeSaida.innerHTML = `<span class="slot-legenda">Selecione o veículo e a data.</span>`;
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

  const { data, intervalosBloqueados } = estadoReservaFuncionario;
  if (!data) {
    gradeSaida.innerHTML = `<span class="slot-legenda">Selecione o veículo e a data.</span>`;
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
      // Verifica se entra em algum intervalo bloqueado
      for (const inter of intervalosBloqueados) {
        if (slotInicio < inter.fim && slotFim > inter.inicio) {
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

  const { data, intervalosBloqueados, saida } = estadoReservaFuncionario;
  if (!data || !saida) {
    limparGradeRetorno("Escolha primeiro o horário de saída.");
    return;
  }

  const base = new Date(`${data}T00:00:00`);

  for (let i = 0; i < 48; i++) {
    const slotInicio = new Date(base.getTime() + i * 30 * 60 * 1000);
    const slotFim = new Date(slotInicio.getTime() + 30 * 60 * 1000);

    let disponivel = true;

    // Retorno deve ser DEPOIS da saída
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

  // Preenche input hidden de saída
  // Gera string yyyy-MM-ddTHH:MM
  const data = estadoReservaFuncionario.data;
  const hhmm = spanEl.textContent; // "HH:MM"
  document.getElementById("reserva-saida").value = `${data}T${hhmm}`;

  // Monta grade de retorno com base na saída
  montarGradeRetorno();
}

function selecionarHorarioRetorno(dateObj, spanEl) {
  estadoReservaFuncionario.retorno = dateObj;

  const gradeRet = document.getElementById("grade-retorno");
  gradeRet.querySelectorAll(".slot-pill.disponivel").forEach(el => {
    el.classList.remove("selecionado");
  });
  spanEl.classList.add("selecionado");

  const data = estadoReservaFuncionario.data;
  const hhmm = spanEl.textContent;
  document.getElementById("reserva-retorno").value = `${data}T${hhmm}`;
}

// ------------------------------------------------------------
// FORMULÁRIO DE RESERVA (USA OS HIDDEN)
// ------------------------------------------------------------
function configurarFormReserva() {
  const form = document.getElementById("form-reserva");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const veiculo = document.getElementById("reserva-veiculo").value;
    const saida = document.getElementById("reserva-saida").value;
    const retorno = document.getElementById("reserva-retorno").value;
    const motivo = document.getElementById("reserva-motivo").value.trim();
    const email = sessionStorage.getItem("ilumiUserEmail");

    if (!veiculo || !saida || !retorno || !motivo) {
      Swal.fire("Atenção", "Selecione veículo, data, horários e motivo.", "warning");
      return;
    }

    if (new Date(retorno) <= new Date(saida)) {
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
    document.getElementById("grade-saida").innerHTML = `<span class="slot-legenda">Selecione o veículo e a data.</span>`;
    limparGradeRetorno("Escolha primeiro o horário de saída.");

    carregarMinhasReservas();
  });
}

// ------------------------------------------------------------
// MINHAS RESERVAS + SELECT PARA CHECK-IN/OUT
// ------------------------------------------------------------
async function carregarMinhasReservas() {
  const tbody = document.getElementById("tabela-minhas-reservas");
  const select = document.getElementById("check-reserva");

  tbody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
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
    .order("data_saida_prevista", { ascending: false });

  if (error) {
    tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar reservas.</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">Você ainda não tem reservas.</td></tr>';
    return;
  }

  tbody.innerHTML = "";

  data.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td>${r.veiculo_modelo} (${r.veiculo_placa})</td>
        <td>${formatarDataHoraBR(r.data_saida_real || r.data_saida_prevista)}</td>
        <td>${formatarDataHoraBR(r.data_retorno_real || r.data_retorno_previsto)}</td>
        <td>${r.status}</td>
      </tr>
    `;
  });

  data.forEach(r => {
    if (r.status === "aberta" || r.status === "em_uso") {
      select.innerHTML += `
        <option value="${r.id}" data-status="${r.status}">
          ${r.veiculo_modelo} — ${formatarDataHoraBR(r.data_saida_prevista)}
        </option>
      `;
    }
  });
}

// ------------------------------------------------------------
// CHECK-IN / CHECK-OUT
// ------------------------------------------------------------
function configurarCheckinCheckout() {
  document.getElementById("btn-checkin").onclick = () => fazerCheck("in");
  document.getElementById("btn-checkout").onclick = () => fazerCheck("out");
}

async function fazerCheck(tipo) {
  const select = document.getElementById("check-reserva");
  const reservaId = select.value;
  const km = document.getElementById("check-km").value;
  const foto = document.getElementById("check-foto").files[0];

  if (!reservaId || !km || !foto) {
    Swal.fire("Atenção", "Selecione a reserva, informe o KM e envie a foto.", "warning");
    return;
  }

  const status = select.options[select.selectedIndex].dataset.status;

  if (tipo === "in" && status !== "aberta") {
    Swal.fire("Atenção", "Só é possível fazer check-in de reservas abertas.", "warning");
    return;
  }
  if (tipo === "out" && status !== "em_uso") {
    Swal.fire("Atenção", "Só é possível fazer check-out de reservas em uso.", "warning");
    return;
  }

  const safeName = foto.name.replace(/[^\w.\-]/g, "_");
  const email = sessionStorage.getItem("ilumiUserEmail");
  const timestamp = Date.now();
  const path = `${email}/${reservaId}/${tipo}-${timestamp}-${safeName}`;

  const { error: uploadError } = await supa
    .storage
    .from("painel-fotos")
    .upload(path, foto);

  if (uploadError) {
    console.error(uploadError);
    Swal.fire("Erro", "Não foi possível enviar a foto.", "error");
    return;
  }

  const agora = new Date().toISOString();
  let updates = {};

  if (tipo === "in") {
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

  Swal.fire("Sucesso!", `Check-${tipo === "in" ? "in" : "out"} registrado!`, "success");

  document.getElementById("check-km").value = "";
  document.getElementById("check-foto").value = "";
  carregarMinhasReservas();
}
