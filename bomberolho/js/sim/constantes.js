// Constantes da simulação. Tudo em inteiros para o resultado ser idêntico em
// qualquer máquina: posições em "unidades" (1 casa = 1000 unidades) e tempo em
// ticks de passo fixo (60 por segundo).

export const TPS = 60; // ticks por segundo (passo fixo)
export const CASA = 1000; // unidades por casa
export const MEIA_CASA = CASA / 2;

export const COLUNAS = 15; // 13 jogáveis + moldura
export const LINHAS = 13; // 11 jogáveis + moldura

// Tipos de casa da grade.
export const VAZIO = 0;
export const MOLDURA = 1;
export const PILAR = 2;
export const BLOCO = 3;
export const QUEBRANDO = 4; // bloco sendo desfeito pelo respingo: ainda sólido

export const PAVIO = 165; // 2,75 s até a gota estourar
export const DURACAO_RESPINGO = 30; // 0,5 s letal
export const DURACAO_QUEBRA = DURACAO_RESPINGO; // bloco some junto com o respingo
export const ATRASO_FIM = 90; // 1,5 s entre a última queda e o resultado

// Velocidade em unidades por tick: 55 ≈ 3,3 casas/s; cada Lágrima Veloz soma ~0,54.
export const VELOCIDADE_BASE = 55;
export const VELOCIDADE_PASSO = 9;

export const PODERES_INICIAIS = Object.freeze({ gotas: 1, alcance: 2, velocidade: 0 });
export const LIMITES = Object.freeze({ gotas: 8, alcance: 8, velocidade: 4 });

// Cantos de largada, na ordem dos jogadores 0..3.
export const LARGADAS = Object.freeze([
  Object.freeze({ col: 1, lin: 1 }),
  Object.freeze({ col: COLUNAS - 2, lin: 1 }),
  Object.freeze({ col: 1, lin: LINHAS - 2 }),
  Object.freeze({ col: COLUNAS - 2, lin: LINHAS - 2 }),
]);

export const DIRECOES = Object.freeze({
  cima: Object.freeze({ dc: 0, dl: -1 }),
  baixo: Object.freeze({ dc: 0, dl: 1 }),
  esq: Object.freeze({ dc: -1, dl: 0 }),
  dir: Object.freeze({ dc: 1, dl: 0 }),
});
export const NOMES_DIRECOES = Object.freeze(['cima', 'baixo', 'esq', 'dir']);
