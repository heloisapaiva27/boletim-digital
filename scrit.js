// DADOS FICTÍCIOS PADRONIZADOS DO 8º ANO (Dados Brutos)
const dadosBoletim = [
  { disciplina: "Língua Portuguesa", tri1: 82, tri2: "7,8", tri3: 85, faltas: [2, 1, 1] },
  { disciplina: "Matemática", tri1: 52, tri2: "5,8", tri3: null, faltas: [3, 2, 1] },
  { disciplina: "Ciências", tri1: "8,1", tri2: 76, tri3: 8.0, faltas: [1, 2, 0] },
  { disciplina: "História", tri1: 7.0, tri2: 84, tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Geografia", tri1: 68, tri2: 7.3, tri3: "7,9", faltas: [0, 1, 1] },
  { disciplina: "Língua Inglesa", tri1: 86, tri2: "8,1", tri3: 8.7, faltas: [1, 0, 0] },
  { disciplina: "Arte", tri1: 9.0, tri2: 92, tri3: null, faltas: [1, 1, 0] },
  { disciplina: "Educação Física", tri1: 95, tri2: 9.0, tri3: "9,4", faltas: [0, 1, 0] },
  { disciplina: "Educação Digital", tri1: 88, tri2: 9.1, tri3: 93, faltas: [1, 0, 1] },
  { disciplina: "Educação Financeira", tri1: 74, tri2: "7,8", tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Estudo Orientado", tri1: 8.0, tri2: 83, tri3: "8,5", faltas: [0, 1, 0] },
  { disciplina: "Redação e Leitura", tri1: 62, tri2: "6,8", tri3: null, faltas: [2, 1, 1] },
  { disciplina: "Pensamento Lógico", tri1: 48, tri2: 5.6, tri3: "6,0", faltas: [2, 2, 1] },
  { disciplina: "Literatura Arte e Movimento", tri1: "7,7", tri2: 80, tri3: null, faltas: [1, 0, 1] },
  { disciplina: "Práticas Experimentais", tri1: 58, tri2: "6,2", tri3: 6.4, faltas: [1, 1, 1] }
];

// Função obrigatória para normalizar as notas para a escala de 0 a 10
function normalizarNota(valor) {
  // Trata notas não lançadas
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  // Converte vírgula decimal em ponto, se for uma string
  if (typeof valor === 'string') {
    valor = valor.replace(',', '.');
  }

  let numero = Number(valor);

  // Se não for um número válido, descarta
  if (isNaN(numero)) {
    return null;
  }

  // Regra: valores entre 0 e 10 continuam iguais
  if (numero >= 0 && numero <= 10) {
    return numero;
  }

  // Regra: valores entre 10 e 100 devem ser divididos por 10
  if (numero > 10 && numero <= 100) {
    return numero / 10;
  }

  // Valores fora das regras são inválidos
  return null;
}

// Função para formatar como a nota deve aparecer na tabela
function formatarNotaParaExibir(notaNormalizada) {
  if (notaNormalizada === null) {
    return "—";
  }
  return notaNormalizada.toFixed(1).replace('.', ',');
}

// Função principal que processa os dados e desenha na tela
function car