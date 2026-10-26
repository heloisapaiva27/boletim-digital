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