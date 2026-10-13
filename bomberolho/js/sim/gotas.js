// Gotas de colírio: soltar (centrada na casa), pavio e a regra de "sair de cima".

import { CASA, MEIA_CASA, PAVIO, VAZIO } from './constantes.js';
import { colDe, linDe, sobrepoe } from './jogadores.js';

export function gotaEm(m, col, lin) {
  for (const g of m.gotas) if (g.col === col && g.lin === lin) return g;
  return undefined;
}

export function gotasAtivasDe(m, id) {
  let n = 0;
  for (const g of m.gotas) if (g.dono === id) n++;
  return n;
}

/**
 * Solta uma gota na casa do centro do jogador. Quem está encostado na casa nesse
 * instante (o dono e quem mais estiver ali) pode sair de cima; depois de sair,
 * a gota vira obstáculo sólido também para ele.
 */
export function soltarGota(m, j) {
  if (!j.vivo || gotasAtivasDe(m, j.id) >= j.gotas) return null;
  const col = colDe(j);
  const lin = linDe(j);
  if (m.grade[lin * m.colunas + col] !== VAZIO || gotaEm(m, col, lin)) return null;
  const passantes = m.jogadores.filter((o) => o.vivo && sobrepoe(o, col, lin)).map((o) => o.id);
  const gota = {
    id: m.proximoId++,
    col,
    lin,
    x: col * CASA + MEIA_CASA,
    y: lin * CASA + MEIA_CASA,
    dono: j.id,
    alcance: j.alcance,
    pavio: PAVIO,
    passantes,
  };
  m.gotas.push(gota);
  m.eventos.push({ tipo: 'gota', col, lin, dono: j.id });
  return gota;
}

/** Quem já não encosta mais na gota perde o direito de atravessá-la. */
export function atualizarPassantes(m) {
  for (const g of m.gotas) {
    if (g.passantes.length === 0) continue;
    g.passantes = g.passantes.filter((id) => {
      const j = m.jogadores[id];
      return j.vivo && sobrepoe(j, g.col, g.lin);
    });
  }
}
