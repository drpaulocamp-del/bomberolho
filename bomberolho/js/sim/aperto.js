// Relógio da rodada e aperto final: com `inicioAperto` ticks no relógio,
// peças sólidas caem uma a uma em espiral, de fora para dentro (sentido
// horário), até sobrar o miolo: um "H" de 7 casas em volta do centro.
// O canto onde a espiral começa é sorteado por rodada (pela semente): com o
// começo fixo, o canto de largada 0 — o do humano — era sempre o primeiro a
// ser espremido.
// A próxima casa a cair fica marcada no chão durante todo o intervalo (aviso
// justo). Quem estiver nela quando a peça cai vai descansar (mesmo montado);
// gota e item embaixo somem.

import { CASA, MEIA_CASA, PILAR, MURO, SOBRA_APERTO, SOBRA_APERTO_SUAVE, ANEIS_APERTO } from './constantes.js';
import { colDe, linDe, sobrepoe } from './jogadores.js';

/** Canto (0–3, na ordem das largadas) onde a espiral começa: derivado da semente. */
export function cantoInicialDoAperto(semente) {
  return Math.imul((semente >>> 0) ^ 0x5bd1e995, 0x27d4eb2d) >>> 30;
}

/**
 * Ordem das casas que caem (pula pilares, que já são sólidos). `canto` =
 * largada onde a espiral começa (0 cima/esq, 1 cima/dir, 2 baixo/esq,
 * 3 baixo/dir); sempre no sentido horário.
 */
export function sequenciaDoAperto(m, canto = cantoInicialDoAperto(m.semente)) {
  const seq = [];
  const add = (c, l) => {
    const i = l * m.colunas + c;
    if (m.grade[i] !== PILAR) seq.push(i);
  };
  // Posição de cada canto no anel percorrido em sentido horário a partir de cima/esq.
  const giro = [0, 1, 3, 2][canto] || 0;
  for (let k = 0; k < ANEIS_APERTO; k++) {
    const c0 = 1 + k;
    const c1 = m.colunas - 2 - k;
    const l0 = 1 + k;
    const l1 = m.linhas - 2 - k;
    if (c0 > c1 || l0 > l1) break;
    if (c0 === c1 || l0 === l1) {
      // Anel degenerado (arena de teste estreita): uma fila só, a partir da ponta do canto.
      const fila = [];
      for (let l = l0; l <= l1; l++) for (let c = c0; c <= c1; c++) fila.push([c, l]);
      const doFim = l0 === l1 ? canto % 2 === 1 : canto >= 2;
      (doFim ? fila.reverse() : fila).forEach((p) => add(...p));
      continue;
    }
    const anel = [];
    const quinas = [];
    quinas.push(anel.length);
    for (let c = c0; c < c1; c++) anel.push([c, l0]);
    quinas.push(anel.length);
    for (let l = l0; l < l1; l++) anel.push([c1, l]);
    quinas.push(anel.length);
    for (let c = c1; c > c0; c--) anel.push([c, l1]);
    quinas.push(anel.length);
    for (let l = l1; l > l0; l--) anel.push([c0, l]);
    const ini = quinas[giro];
    for (let n = 0; n < anel.length; n++) add(...anel[(ini + n) % anel.length]);
  }
  // Por fim fecham-se as duas colunas das pontas do miolo, de cima para baixo,
  // alternando os lados: sobra um "H" de 7 casas em volta do centro.
  const c0 = 1 + ANEIS_APERTO;
  const c1 = m.colunas - 2 - ANEIS_APERTO;
  if (c1 - c0 >= 4) {
    for (let l = 1 + ANEIS_APERTO; l <= m.linhas - 2 - ANEIS_APERTO; l++) {
      add(c0, l);
      add(c1, l);
    }
  }
  return seq;
}

/** `suave` (nível Fácil): as mesmas peças, no mesmo começo, caindo mais devagar. */
export function criarAperto(suave = false) {
  return { ativo: false, indice: 0, ritmo: 0, proximoEm: null, seq: null, suave };
}

/** Um tick do aperto (chamado só com o relógio correndo). */
export function avancarAperto(m, eliminar) {
  const a = m.aperto;
  if (!a.ativo) {
    if (m.tempoRestante > m.ajuste.inicioAperto) return;
    a.ativo = true;
    a.seq = sequenciaDoAperto(m);
    const sobra = a.suave ? SOBRA_APERTO_SUAVE : SOBRA_APERTO;
    a.ritmo = Math.max(6, Math.floor((m.ajuste.inicioAperto - sobra) / Math.max(1, a.seq.length)));
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
