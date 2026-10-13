// Leitura de perigo: para cada casa, em quantos ticks ela fica molhada.
// Usa só o que o jogador humano também vê (gotas, pavios, alcances, respingos).

import { VAZIO, DIRECOES, NOMES_DIRECOES } from '../sim/constantes.js';

export const SEGURO = Number.POSITIVE_INFINITY;

/** Casas que uma gota molharia se estourasse com a grade atual. */
export function alcanceDaGota(m, g, gotas) {
  const casas = [g.lin * m.colunas + g.col];
  for (const nome of NOMES_DIRECOES) {
    const { dc, dl } = DIRECOES[nome];
    for (let p = 1; p <= g.alcance; p++) {
      const c = g.col + dc * p;
      const l = g.lin + dl * p;
      const i = l * m.colunas + c;
      if (m.grade[i] !== VAZIO) break;
      casas.push(i);
      if (gotas.some((o) => o.col === c && o.lin === l)) break;
    }
  }
  return casas;
}

/**
 * Vetor com o tempo (ticks) até cada casa ficar letal: 0 = molhada agora,
 * SEGURO = nenhuma gota conhecida a alcança. Considera a cadeia: uma gota
 * atingida por outra estoura junto com ela. `extras` permite simular gotas
 * hipotéticas ("se eu soltar aqui, tenho para onde fugir?").
 */
export function mapaDePerigo(m, extras = []) {
  const perigo = new Array(m.grade.length).fill(SEGURO);
  for (const r of m.respingos) {
    perigo[r.lin * m.colunas + r.col] = 0;
    for (const nome of NOMES_DIRECOES) {
      const { dc, dl } = DIRECOES[nome];
      for (let p = 1; p <= r.bracos[nome]; p++) perigo[(r.lin + dl * p) * m.colunas + r.col + dc * p] = 0;
    }
  }
  const gotas = [...m.gotas, ...extras];
  if (!gotas.length) return perigo;
  const tempo = gotas.map((g) => g.pavio);
  const casas = gotas.map((g) => alcanceDaGota(m, g, gotas));
  // Propaga a cadeia até estabilizar (poucas gotas: laço curto).
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (let a = 0; a < gotas.length; a++) {
      for (let b = 0; b < gotas.length; b++) {
        if (a === b || tempo[b] <= tempo[a]) continue;
        const ib = gotas[b].lin * m.colunas + gotas[b].col;
        if (casas[a].includes(ib)) { tempo[b] = tempo[a]; mudou = true; }
      }
    }
  }
  gotas.forEach((g, k) => {
    for (const i of casas[k]) if (tempo[k] < perigo[i]) perigo[i] = tempo[k];
  });
  return perigo;
}
