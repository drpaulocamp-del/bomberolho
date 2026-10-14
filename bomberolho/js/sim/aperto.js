// Relógio da rodada e aperto final: com `inicioAperto` ticks no relógio,
// peças sólidas caem uma a uma em espiral, de fora para dentro (sentido
// horário a partir do canto de cima à esquerda), até sobrar um miolo 5×3.
// A próxima casa a cair fica marcada no chão durante todo o intervalo (aviso
// justo). Quem estiver nela quando a peça cai vai descansar (mesmo montado);
// gota e item embaixo somem.

import { CASA, MEIA_CASA, PILAR, MURO, SOBRA_APERTO, ANEIS_APERTO } from './constantes.js';
import { colDe, linDe, sobrepoe } from './jogadores.js';

/** Ordem das casas que caem (pula pilares, que já são sólidos). */
export function sequenciaDoAperto(m) {
  const seq = [];
  const add = (c, l) => {
    const i = l * m.colunas + c;
    if (m.grade[i] !== PILAR) seq.push(i);
  };
  for (let k = 0; k < ANEIS_APERTO; k++) {
    const c0 = 1 + k;
    const c1 = m.colunas - 2 - k;
    const l0 = 1 + k;
    const l1 = m.linhas - 2 - k;
    if (c0 > c1 || l0 > l1) break;
    for (let c = c0; c <= c1; c++) add(c, l0);
    for (let l = l0 + 1; l <= l1; l++) add(c1, l);
    if (l1 > l0) for (let c = c1 - 1; c >= c0; c--) add(c, l1);
    if (c1 > c0) for (let l = l1 - 1; l > l0; l--) add(c0, l);
  }
  return seq;
}

export function criarAperto() {
  return { ativo: false, indice: 0, ritmo: 0, proximoEm: null, seq: null };
}

/** Um tick do aperto (chamado só com o relógio correndo). */
export function avancarAperto(m, eliminar) {
  const a = m.aperto;
  if (!a.ativo) {
    if (m.tempoRestante > m.ajuste.inicioAperto) return;
    a.ativo = true;
    a.seq = sequenciaDoAperto(m);
    a.ritmo = Math.max(6, Math.floor((m.ajuste.inicioAperto - SOBRA_APERTO) / Math.max(1, a.seq.length)));
    a.proximoEm = m.tick + a.ritmo;
    m.eventos.push({ tipo: 'aperto' });
    return;
  }
  if (a.indice >= a.seq.length || m.tick < a.proximoEm) return;
  cair(m, a.seq[a.indice], eliminar);
  a.indice++;
  a.proximoEm = a.indice < a.seq.length ? m.tick + a.ritmo : null;
}

/** Casa que vai cair a seguir (para o aviso no chão e para a IA), ou -1. */
export function proximaQueda(m) {
  const a = m.aperto;
  return a.ativo && a.indice < a.seq.length ? a.seq[a.indice] : -1;
}

function cair(m, i, eliminar) {
  const col = i % m.colunas;
  const lin = Math.floor(i / m.colunas);
  if (m.itens[i]) m.eventos.push({ tipo: 'itemQueimado', col, lin, item: m.itens[i] });
  m.grade[i] = MURO;
  m.ocultos[i] = null;
  m.itens[i] = null;
  m.quebras = m.quebras.filter((q) => q.i !== i);
  m.gotas = m.gotas.filter((g) => {
    const embaixo = g.estado === 'chao' && Math.abs(g.x - (col * CASA + MEIA_CASA)) < CASA && Math.abs(g.y - (lin * CASA + MEIA_CASA)) < CASA;
    if (embaixo) m.eventos.push({ tipo: 'gotaEsmagada', col: g.col, lin: g.lin });
    return !embaixo;
  });
  for (const j of m.jogadores) {
    if (!j.vivo) continue;
    const alvoDoSalto = j.salto && Math.floor(j.salto.x1 / CASA) === col && Math.floor(j.salto.y1 / CASA) === lin;
    if ((colDe(j) === col && linDe(j) === lin && !j.salto) || alvoDoSalto) {
      j.montaria = null; // a peça é sólida: nem o bichinho salva
      eliminar(m, j, null, 'aperto');
    } else if (!j.salto && sobrepoe(j, col, lin)) {
      // Com só um pedaço do corpo embaixo: é empurrado para o centro da própria casa.
      if (colDe(j) !== col) j.x = colDe(j) * CASA + MEIA_CASA;
      if (linDe(j) !== lin) j.y = linDe(j) * CASA + MEIA_CASA;
    }
  }
  m.eventos.push({ tipo: 'muro', col, lin });
}
