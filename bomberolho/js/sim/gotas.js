// Gotas de colírio: soltar (centrada na casa), pavio e a regra de "sair de cima".
//
// Estados de uma gota: 'chao' (parada ou deslizando depois de um chute),
// 'mao' (levantada com a Pinça) e 'voo' (arremessada). Só no chão ela é
// obstáculo, é atingida por respingo e entra na cadeia.

import { CASA, MEIA_CASA, VAZIO } from './constantes.js';
import { colDe, linDe, sobrepoe } from './jogadores.js';

/** Gota no chão cujo corpo encosta na casa (col, lin). Parada, só a própria casa; deslizando, até duas. */
export function gotaEm(m, col, lin) {
  const cx = col * CASA + MEIA_CASA;
  const cy = lin * CASA + MEIA_CASA;
  for (const g of m.gotas) {
    if (g.estado === 'chao' && Math.abs(g.x - cx) < CASA && Math.abs(g.y - cy) < CASA) return g;
  }
  return undefined;
}

export function gotasAtivasDe(m, id) {
  let n = 0;
  for (const g of m.gotas) if (g.dono === id) n++;
  return n;
}

/** Alcance que uma gota solta agora nesta casa teria (lente do Consultório soma). */
export function alcanceAoSoltar(m, j, col, lin) {
  const lente = m.piso[lin * m.colunas + col] === 'lente' ? m.ajuste.bonusLente : 0;
  return j.alcance + lente;
}

/**
 * Solta uma gota na casa do centro do jogador. Quem está encostado na casa nesse
 * instante (o dono e quem mais estiver ali) pode sair de cima; depois de sair,
 * a gota vira obstáculo sólido também para ele.
 */
export function soltarGota(m, j) {
  if (!j.vivo || j.salto || j.segurando !== null || gotasAtivasDe(m, j.id) >= j.gotas) return null;
  const col = colDe(j);
  const lin = linDe(j);
  if (m.grade[lin * m.colunas + col] !== VAZIO || gotaEm(m, col, lin)) return null;
  const passantes = m.jogadores.filter((o) => o.vivo && !o.salto && sobrepoe(o, col, lin)).map((o) => o.id);
  const gota = {
    id: m.proximoId++,
    col,
    lin,
    x: col * CASA + MEIA_CASA,
    y: lin * CASA + MEIA_CASA,
    dono: j.id,
    alcance: alcanceAoSoltar(m, j, col, lin),
    penetrante: j.penetrante,
    pavio: m.ajuste.pavio,
    pavioTotal: m.ajuste.pavio, // para o desenho medir quanto falta
    passantes,
    estado: 'chao',
    mov: null, // { dir } enquanto desliza depois de um chute
    voo: null, // arremesso da Pinça
    portador: null, // quem a segura com a Pinça
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
      return j.vivo && g.estado === 'chao' && sobrepoe(j, g.col, g.lin);
    });
  }
}
