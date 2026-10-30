/* ==========================================================================
   CONFIGURAÇÃO FIXA DO ALUNO & ESTADO DA APLICAÇÃO
   ========================================================================== */
const CONFIG_ALUNO = {
  turma: "8C",
  numeroChamada: 8,
  apiUrl: "https://boletim-api.profbt.com.br"
};

let pinSessao = "";
let dadosAtuais = null;

// DADOS DE FALLBACK (USADOS QUANDO dados RETORNADOS PELA API FOREM null)
const DADOS_INICIAIS_PADRAO = {
  disciplinas: [
    { nome: "Português", tri1: 8.5, tri2: 7.0, tri3: 8.0, faltas: [2, 1, 0] },
    { nome: "Matemática", tri1: 6.0, tri2: 7.5, tri3: 8.5, faltas: [4, 2, 1] },
    { nome: "História", tri1: 9.0, tri2: 8.0, tri3: 9.5, faltas: [0, 1, 0] },
    { nome: "Geografia", tri1: 7.5, tri2: 8.0, tri3: 7.0, faltas: [1, 0, 2] },
    { nome: "Ciências", tri1: 8.0, tri2: 8.5, tri3: 9.0, faltas: [1, 2, 0] },
    { nome: "Inglês", tri1: 9.5, tri2: 9.0, tri3: 10.0, faltas: [0, 0, 0] },
    { nome: "Arte", tri1: 10.0, tri2: 9.5, tri3: 9.0, faltas: [0, 0, 0] },
    { nome: "Educação Física", tri1: 9.0, tri2: 9.0, tri3: 9.5, faltas: [2, 0, 1] }
  ]
};

/* ==========================================================================
   VARIÁVEIS DE INSTÂNCIA DOS GRÁFICOS
   ========================================================================== */
let graficoMedias = null;
let graficoEvolucao = null;
let graficoFaltas = null;

/* ==========================================================================
   NÚCLEO PROTEGIDO — HELPER DE NORMALIZAÇÃO DE NOTA
   ========================================================================== */
function normalizarNota(val) {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") {
    if (isNaN(val)) return null;
    if (val > 10 && val <= 100) return val / 10;
    return val;
  }
  let str = String(val).replace(",", ".").trim();
  if (str === "") return null;
  let num = parseFloat(str);
  if (isNaN(num)) return null;
  if (num > 10 && num <= 100) return num / 10;
  return num;
}

function calcularMedia(tri1, tri2, tri3) {
  let n1 = normalizarNota(tri1);
  let n2 = normalizarNota(tri2);
  let n3 = normalizarNota(tri3);
  let soma = 0;
  let qtd = 0;
  if (n1 !== null) { soma += n1; qtd++; }
  if (n2 !== null) { soma += n2; qtd++; }
  if (n3 !== null) { soma += n3; qtd++; }
  if (qtd === 0) return null;
  return soma / qtd;
}

/* ==========================================================================
   NÚCLEO PROTEGIDO — AUTENTICAÇÃO E REQUISIÇÕES À API
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const formLogin = document.getElementById("formLogin");
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pinInput = document.getElementById("pinInput");
      const pinDigitado = pinInput ? pinInput.value.trim() : "";
      if (!pinDigitado) return;

      exibirMensagemLogin("Conectando...", "info");

      try {
        const resposta = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/abrir`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            turma: CONFIG_ALUNO.turma,
            numero_chamada: CONFIG_ALUNO.numeroChamada,
            pin: pinDigitado
          })
        });

        if (resposta.status === 401) {
          exibirMensagemLogin("Turma, chamada ou PIN inválidos.", "erro");
          return;
        }
        if (resposta.status === 429) {
          exibirMensagemLogin("Muitas tentativas. Aguarde um minuto e tente novamente.", "erro");
          return;
        }
        if (!resposta.ok) {
          exibirMensagemLogin("Não foi possível conectar ao servidor. Tente novamente.", "erro");
          return;
        }

        const data = await resposta.json();
        pinSessao = pinDigitado;
        if (pinInput) pinInput.value = "";

        if (data && data.dados && Array.isArray(data.dados.disciplinas)) {
          dadosAtuais = data.dados;
        } else {
          dadosAtuais = JSON.parse(JSON.stringify(DADOS_INICIAIS_PADRAO));
        }

        exibirMensagemLogin("", "");
        document.getElementById("secaoLogin").classList.add("escondido");
        document.getElementById("secaoBoletim").classList.remove("escondido");

        atualizarBoletim();
      } catch (err) {
        exibirMensagemLogin("Não foi possível conectar ao servidor. Tente novamente.", "erro");
      }
    });
  }

  const btnEditar = document.getElementById("btnEditar");
  if (btnEditar) {
    btnEditar.addEventListener("click", () => {
      abrirEditor();
    });
  }

  const btnCancelar = document.getElementById("btnCancelar");
  if (btnCancelar) {
    btnCancelar.addEventListener("click", () => {
      fecharEditor();
    });
  }

  const formEditor = document.getElementById("formEditor");
  if (formEditor) {
    formEditor.addEventListener("submit", async (e) => {
      e.preventDefault();
      await salvarAlteracoes();
    });
  }
});

function exibirMensagemLogin(msg, tipo) {
  const divMsg = document.getElementById("mensagemLogin");
  if (!divMsg) return;
  if (!msg) {
    divMsg.className = "mensagem";
    divMsg.textContent = "";
    return;
  }
  divMsg.className = `mensagem ${tipo}`;
  divMsg.textContent = msg;
}

function exibirMensagemEditor(msg, tipo) {
  const divMsg = document.getElementById("mensagemEditor");
  if (!divMsg) return;
  if (!msg) {
    divMsg.className = "mensagem";
    divMsg.textContent = "";
    return;
  }
  divMsg.className = `mensagem ${tipo}`;
  divMsg.textContent = msg;
}

/* ==========================================================================
   NÚCLEO PROTEGIDO — RENDERIZAÇÃO DE TABELA E CARDS
   ========================================================================== */
function atualizarBoletim() {
  preencherCards();
  preencherTabela();
  atualizarGraficos();
}

function preencherCards() {
  const containerCards = document.getElementById("containerCards");
  if (!containerCards) return;
  containerCards.innerHTML = "";

  if (!dadosAtuais || !Array.isArray(dadosAtuais.disciplinas)) return;

  dadosAtuais.disciplinas.forEach((disc) => {
    const card = document.createElement("article");
    card.className = "card-disciplina";

    const h3 = document.createElement("h3");
    h3.textContent = disc.nome || "Disciplina";

    const m = calcularMedia(disc.tri1, disc.tri2, disc.tri3);
    const mediaFormatada = m !== null ? m.toFixed(1).replace(".", ",") : "-";

    let fTotal = 0;
    if (Array.isArray(disc.faltas)) {
      fTotal = disc.faltas.reduce((a, b) => a + (Number(b) || 0), 0);
    } else if (typeof disc.faltas === "number") {
      fTotal = disc.faltas;
    }

    const pMedia = document.createElement("p");
    pMedia.textContent = `Média: ${mediaFormatada}`;

    const pFaltas = document.createElement("p");
    pFaltas.textContent = `Faltas Totais: ${fTotal}`;

    card.appendChild(h3);
    card.appendChild(pMedia);
    card.appendChild(pFaltas);
    containerCards.appendChild(card);
  });
}

function preencherTabela() {
  const corpoTabela = document.getElementById("corpoTabela");
  if (!corpoTabela) return;
  corpoTabela.innerHTML = "";

  if (!dadosAtuais || !Array.isArray(dadosAtuais.disciplinas)) return;

  dadosAtuais.disciplinas.forEach((disc) => {
    const tr = document.createElement("tr");

    const tdNome = document.createElement("td");
    tdNome.textContent = disc.nome || "";

    const n1 = normalizarNota(disc.tri1);
    const n2 = normalizarNota(disc.tri2);
    const n3 = normalizarNota(disc.tri3);

    const tdTri1 = document.createElement("td");
    tdTri1.textContent = n1 !== null ? n1.toFixed(1).replace(".", ",") : "-";

    const tdTri2 = document.createElement("td");
    tdTri2.textContent = n2 !== null ? n2.toFixed(1).replace(".", ",") : "-";

    const tdTri3 = document.createElement("td");
    tdTri3.textContent = n3 !== null ? n3.toFixed(1).replace(".", ",") : "-";

    const m = calcularMedia(disc.tri1, disc.tri2, disc.tri3);
    const tdMedia = document.createElement("td");
    tdMedia.textContent = m !== null ? m.toFixed(1).replace(".", ",") : "-";

    let fTotal = 0;
    if (Array.isArray(disc.faltas)) {
      fTotal = disc.faltas.reduce((a, b) => a + (Number(b) || 0), 0);
    } else if (typeof disc.faltas === "number") {
      fTotal = disc.faltas;
    }

    const tdFaltas = document.createElement("td");
    tdFaltas.textContent = fTotal;

    tr.appendChild(tdNome);
    tr.appendChild(tdTri1);
    tr.appendChild(tdTri2);
    tr.appendChild(tdTri3);
    tr.appendChild(tdMedia);
    tr.appendChild(tdFaltas);
    corpoTabela.appendChild(tr);
  });
}

/* ==========================================================================
   NÚCLEO PROTEGIDO — EDITOR, VALIDAÇÕES E SALVAMENTO
   ========================================================================== */
function abrirEditor() {
  const camposContainer = document.getElementById("camposEditor");
  if (!camposContainer) return;
  camposContainer.innerHTML = "";
  exibirMensagemEditor("", "");

  if (!dadosAtuais || !Array.isArray(dadosAtuais.disciplinas)) return;

  dadosAtuais.disciplinas.forEach((disc, idx) => {
    const item = document.createElement("div");
    item.className = "item-editor";

    const title = document.createElement("h4");
    title.textContent = disc.nome || `Disciplina ${idx + 1}`;
    item.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "grid-inputs";

    const n1 = normalizarNota(disc.tri1);
    const n2 = normalizarNota(disc.tri2);
    const n3 = normalizarNota(disc.tri3);

    const f1 = (Array.isArray(disc.faltas) && disc.faltas[0] !== undefined) ? disc.faltas[0] : 0;
    const f2 = (Array.isArray(disc.faltas) && disc.faltas[1] !== undefined) ? disc.faltas[1] : 0;
    const f3 = (Array.isArray(disc.faltas) && disc.faltas[2] !== undefined) ? disc.faltas[2] : 0;

    grid.appendChild(criarCampoInput(`tri1_${idx}`, "1º Tri (Nota)", n1 !== null ? String(n1).replace(".", ",") : ""));
    grid.appendChild(criarCampoInput(`tri2_${idx}`, "2º Tri (Nota)", n2 !== null ? String(n2).replace(".", ",") : ""));
    grid.appendChild(criarCampoInput(`tri3_${idx}`, "3º Tri (Nota)", n3 !== null ? String(n3).replace(".", ",") : ""));

    grid.appendChild(criarCampoInput(`f1_${idx}`, "1º Tri (Faltas)", f1, "number"));
    grid.appendChild(criarCampoInput(`f2_${idx}`, "2º Tri (Faltas)", f2, "number"));
    grid.appendChild(criarCampoInput(`f3_${idx}`, "3º Tri (Faltas)", f3, "number"));

    item.appendChild(grid);
    camposContainer.appendChild(item);
  });

  document.getElementById("secaoBoletim").classList.add("escondido");
  document.getElementById("secaoEditor").classList.remove("escondido");
}

function criarCampoInput(id, labelText, val, type = "text") {
  const wrap = document.createElement("div");
  wrap.className = "campo-input";

  const lbl = document.createElement("label");
  lbl.htmlFor = id;
  lbl.textContent = labelText;

  const inp = document.createElement("input");
  inp.type = type;
  inp.id = id;
  inp.value = val !== null && val !== undefined ? val : "";

  wrap.appendChild(lbl);
  wrap.appendChild(inp);
  return wrap;
}

function fecharEditor() {
  document.getElementById("secaoEditor").classList.add("escondido");
  document.getElementById("secaoBoletim").classList.remove("escondido");
  exibirMensagemEditor("", "");
}

function validarNotaInput(valStr) {
  if (valStr === null || valStr === undefined) return { ok: true, valor: null };
  let str = String(valStr).trim().replace(",", ".");
  if (str === "") return { ok: true, valor: null };

  if (!/^\d+(\.\d+)?$/.test(str)) {
    return { ok: false, valor: null };
  }

  let num = parseFloat(str);
  if (isNaN(num) || num < 0 || num > 10) {
    return { ok: false, valor: null };
  }
  return { ok: true, valor: num };
}

function validarFaltaInput(valStr) {
  if (valStr === null || valStr === undefined) return { ok: false, valor: null };
  let str = String(valStr).trim();
  if (str === "") return { ok: false, valor: null };

  if (!/^\d+$/.test(str)) {
    return { ok: false, valor: null };
  }

  let num = parseInt(str, 10);
  if (isNaN(num) || num < 0) {
    return { ok: false, valor: null };
  }
  return { ok: true, valor: num };
}

async function salvarAlteracoes() {
  if (!dadosAtuais || !Array.isArray(dadosAtuais.disciplinas)) return;

  let disciplinasCopia = JSON.parse(JSON.stringify(dadosAtuais.disciplinas));
  let erros = false;

  disciplinasCopia.forEach((disc, idx) => {
    const inpT1 = document.getElementById(`tri1_${idx}`);
    const inpT2 = document.getElementById(`tri2_${idx}`);
    const inpT3 = document.getElementById(`tri3_${idx}`);

    const inpF1 = document.getElementById(`f1_${idx}`);
    const inpF2 = document.getElementById(`f2_${idx}`);
    const inpF3 = document.getElementById(`f3_${idx}`);

    const vT1 = validarNotaInput(inpT1 ? inpT1.value : "");
    const vT2 = validarNotaInput(inpT2 ? inpT2.value : "");
    const vT3 = validarNotaInput(inpT3 ? inpT3.value : "");

    const vF1 = validarFaltaInput(inpF1 ? inpF1.value : "");
    const vF2 = validarFaltaInput(inpF2 ? inpF2.value : "");
    const vF3 = validarFaltaInput(inpF3 ? inpF3.value : "");

    if (!vT1.ok || !vT2.ok || !vT3.ok || !vF1.ok || !vF2.ok || !vF3.ok) {
      erros = true;
    } else {
      disc.tri1 = vT1.valor;
      disc.tri2 = vT2.valor;
      disc.tri3 = vT3.valor;
      disc.faltas = [vF1.valor, vF2.valor, vF3.valor];
    }
  });

  if (erros) {
    exibirMensagemEditor("Verifique os campos com dados inválidos. Notas devem ser entre 0 e 10 e faltas números inteiros.", "erro");
    return;
  }

  exibirMensagemEditor("Salvando...", "info");

  const payload = {
    turma: CONFIG_ALUNO.turma,
    numero_chamada: CONFIG_ALUNO.numeroChamada,
    pin: pinSessao,
    dados: {
      disciplinas: disciplinasCopia
    }
  };

  try {
    const resposta = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/salvar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!resposta.ok) {
      exibirMensagemEditor("Erro ao salvar dados no servidor. Tente novamente.", "erro");
      return;
    }

    dadosAtuais.disciplinas = disciplinasCopia;
    exibirMensagemEditor("Dados salvos com sucesso.", "sucesso");

    setTimeout(() => {
      fecharEditor();
      atualizarBoletim();
    }, 800);

  } catch (err) {
    exibirMensagemEditor("Erro de conexão ao salvar dados. Tente novamente.", "erro");
  }
}

/* ==========================================================================
   CAMADA DE LEITURA E VISUALIZAÇÃO — GRÁFICOS (CHART.JS)
   ========================================================================== */
function atualizarGraficos() {
  atualizarGraficoMedias();
  atualizarGraficoEvolucao();
  atualizarGraficoFaltas();
}

/* GRÁFICO 1 — MÉDIA POR DISCIPLINA (BARRA HORIZONTAL) */
function atualizarGraficoMedias() {
  const canvas = document.getElementById("graficoMediasDisciplinas");
  if (!canvas) return;

  if (graficoMedias) {
    graficoMedias.destroy();
    graficoMedias = null;
  }

  if (!dadosAtuais || !Array.isArray(dadosAtuais.disciplinas)) return;

  const labels = [];
  const dataValues = [];

  dadosAtuais.disciplinas.forEach((disc) => {
    labels.push(disc.nome || "Disciplina");
    const m = calcularMedia(disc.tri1, disc.tri2, disc.tri3);
    dataValues.push(m !== null ? Number(m.toFixed(1)) : null);
  });

  const ctx = canvas.getContext("2d");
  graficoMedias = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Média",
          data: dataValues,
          backgroundColor: "#7c3aed",
          borderColor: "#5b21b6",
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 10,
          ticks: { color: "#f3f4f6" },
          grid: { color: "#3730a3" }
        },
        y: {
          ticks: { color: "#f3f4f6" },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw;
              if (val === null || val === undefined) return "Sem nota";
              return `Média: ${String(val).replace(".", ",")}`;
            }
          }
        }
      }
    }
  });
}

/* GRÁFICO 2 — EVOLUÇÃO DA MÉDIA GERAL (LINHA) */
function atualizarGraficoEvolucao() {
  const canvas = document.getElementById("graficoEvolucaoTrimestres");
  if (!canvas) return;

  if (graficoEvolucao) {
    graficoEvolucao.destroy();
    graficoEvolucao = null;
  }

  if (!dadosAtuais || !Array.isArray(dadosAtuais.disciplinas)) return;

  let somaT1 = 0, qtdT1 = 0;
  let somaT2 = 0, qtdT2 = 0;
  let somaT3 = 0, qtdT3 = 0;

  dadosAtuais.disciplinas.forEach((disc) => {
    const n1 = normalizarNota(disc.tri1);
    const n2 = normalizarNota(disc.tri2);
    const n3 = normalizarNota(disc.tri3);

    if (n1 !== null) { somaT1 += n1; qtdT1++; }
    if (n2 !== null) { somaT2 += n2; qtdT2++; }
    if (n3 !== null) { somaT3 += n3; qtdT3++; }
  });

  const m1 = qtdT1 > 0 ? Number((somaT1 / qtdT1).toFixed(1)) : null;
  const m2 = qtdT2 > 0 ? Number((somaT2 / qtdT2).toFixed(1)) : null;
  const m3 = qtdT3 > 0 ? Number((somaT3 / qtdT3).toFixed(1)) : null;

  const ctx = canvas.getContext("2d");
  graficoEvolucao = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["1º Tri", "2º Tri", "3º Tri"],
      datasets: [
        {
          label: "Média Geral",
          data: [m1, m2, m3],
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.2)",
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: "#2563eb",
          tension: 0.2,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 10,
          ticks: { color: "#f3f4f6" },
          grid: { color: "#3730a3" }
        },
        x: {
          ticks: { color: "#f3f4f6" },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw;
              if (val === null || val === undefined) return "Sem nota";
              return `Média Geral: ${String(val).replace(".", ",")}`;
            }
          }
        }
      }
    }
  });
}

/* GRÁFICO 3 — FALTAS POR TRIMESTRE (BARRA VERTICAL) */
function atualizarGraficoFaltas() {
  const canvas = document.getElementById("graficoFaltasTrimestres");
  const estadoFaltasDiv = document.getElementById("estadoFaltas");
  if (!canvas) return;

  if (graficoFaltas) {
    graficoFaltas.destroy();
    graficoFaltas = null;
  }

  if (!dadosAtuais || !Array.isArray(dadosAtuais.disciplinas)) return;

  let fTri1 = 0;
  let fTri2 = 0;
  let fTri3 = 0;

  dadosAtuais.disciplinas.forEach((disc) => {
    if (Array.isArray(disc.faltas)) {
      fTri1 += Number(disc.faltas[0]) || 0;
      fTri2 += Number(disc.faltas[1]) || 0;
      fTri3 += Number(disc.faltas[2]) || 0;
    } else if (typeof disc.faltas === "number") {
      fTri1 += disc.faltas;
    }
  });

  const totalFaltas = fTri1 + fTri2 + fTri3;
  const LIMITE_RISCO = 350;

  const cardFaltas = canvas.closest(".grafico-card");

  if (estadoFaltasDiv) {
    estadoFaltasDiv.innerHTML = "";
    if (totalFaltas >= LIMITE_RISCO) {
      const badge = document.createElement("span");
      badge.className = "badge-perigo";
      badge.textContent = "Perigo";
      estadoFaltasDiv.appendChild(badge);
      if (cardFaltas) cardFaltas.classList.add("perigo-card");
    } else {
      if (cardFaltas) cardFaltas.classList.remove("perigo-card");
    }
  }

  const ctx = canvas.getContext("2d");
  graficoFaltas = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["1º Tri", "2º Tri", "3º Tri"],
      datasets: [
        {
          label: "Faltas",
          data: [fTri1, fTri2, fTri3],
          backgroundColor: totalFaltas >= LIMITE_RISCO ? "#dc2626" : "#2563eb",
          borderColor: totalFaltas >= LIMITE_RISCO ? "#991b1b" : "#1d4ed8",
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: "#f3f4f6" },
          grid: { color: "#3730a3" }
        },
        x: {
          ticks: { color: "#f3f4f6" },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw;
              return `${context.label}: ${val} faltas`;
            }
          }
        }
      }
    }
  });
}