// Leitura de perigo com tempo: para cada casa, as janelas [início, fim) (em
// ticks a partir de agora) em que ela vai estar molhada ou soterrada.
// Usa só o que o jogador humano também vê na tela: gotas (paradas, chutadas,
// na mão e no ar), pavios, alcances, respingos, lentes e a próxima peça do
// aperto final. Nunca lê os itens escondidos.

import { VAZIO, BLOCO, QUEBRANDO, DIRECOES, NOMES_DIRECOES } from '../sim/constantes.js';
import { destinoDoVoo, darVolta } from '../sim/pinca.js';

export const SEGURO = Number.POSITIVE_INFINITY;
export const SEMPRE = 1e9; // fim de janela que não acaba (peça do aperto)
const QUEDAS_PREVISTAS = 6; // quantas peças do aperto entram na leitura

const cache = new WeakMap(); // mundo → { tick, analise } (só leitura; não muda o jogo)

/** Gota "parada" para a leitura: onde ela vai estourar, quando e com que alcance. */
function gotaLida(m, g) {
  let col = g.col;
  let lin = g.lin;
  let pavio = g.pavio;
  if (g.estado === 'chao' && g.mov) ({ col, lin } = fimDoDeslize(m, g));
  else if (g.estado === 'mao') {
    // Vai ser arremessada para a frente de quem a segura.
    const p = m.jogadores[g.portador];
    const { dc, dl } = DIRECOES[p.dir];
    ({ col, lin } = darVolta(m, g.col + dc * m.ajuste.distanciaPinca, g.lin + dl * m.ajuste.distanciaPinca));
  } else if (g.estado === 'voo') {
    ({ col, lin } = destinoDoVoo(m, g.voo));
    pavio = Math.max(pavio, g.voo.duracao - g.voo.t);
  }
  return { col, lin, pavio, alcance: g.alcance, penetrante: !!g.penetrante };
}

function fimDoDeslize(m, g) {
  const { dc, dl } = DIRECOES[g.mov.dir];
  let col = Math.round((g.x - 500) / 1000);
  let lin = Math.round((g.y - 500) / 1000);
  for (let k = 0; k < 20; k++) {
    const c = col + dc;
    const l = lin + dl;
    if (m.grade[l * m.colunas + c] !== VAZIO) break;
    if (m.gotas.some((o) => o !== g && o.estado === 'chao' && o.col === c && o.lin === l)) break;
    col = c;
    lin = l;
  }
  return { col, lin };
}

/** Casas que uma gota lida molharia com a grade atual (para em gota: cadeia). */
export function alcanceDaGota(m, g, ocupadas) {
  const casas = [g.lin * m.colunas + g.col];
  for (const nome of NOMES_DIRECOES) {
    const { dc, dl } = DIRECOES[nome];
    for (let p = 1; p <= g.alcance; p++) {
      const c = g.col + dc * p;
      const l = g.lin + dl * p;
      const i = l * m.colunas + c;
      const t = m.grade[i];
      if (t === BLOCO || t === QUEBRANDO) {
        if (g.penetrante) continue;
        break;
      }
      if (t !== VAZIO) break;
      casas.push(i);
      if (ocupadas.has(i)) break;
    }
  }
  return casas;
}

/**
 * Análise completa. `extras` = gotas hipotéticas {col, lin, pavio, alcance,
 * penetrante} ("e se eu soltar aqui?"). Sem extras, o resultado é guardado
 * por tick e repartido entre os robôs.
 */
export function analisar(m, extras = []) {
  if (!extras.length) {
    const c = cache.get(m);
    if (c && c.tick === m.tick) return c.analise;
  }
  const n = m.grade.length;
  const janelas = new Array(n); // undefined ou [ini, fim, ini, fim, ...]
  const marcar = (i, ini, fim) => {
    if (!janelas[i]) janelas[i] = [];
    janelas[i].push(ini, fim);
  };
  for (const r of m.respingos) {
    const casas = [r.lin * m.colunas + r.col];
    for (const nome of NOMES_DIRECOES) {
      const { dc, dl } = DIRECOES[nome];
      for (let p = 1; p <= r.bracos[nome]; p++) casas.push((r.lin + dl * p) * m.colunas + r.col + dc * p);
    }
    for (const i of casas) marcar(i, 0, r.t);
  }
  const gotas = [...m.gotas.map((g) => gotaLida(m, g)), ...extras];
  const ocupadas = new Set(gotas.map((g) => g.lin * m.colunas + g.col));
  const tempo = gotas.map((g) => g.pavio);
  const casas = gotas.map((g) => alcanceDaGota(m, g, ocupadas));
  // Cadeia: quem é atingido estoura junto (propaga até estabilizar).
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (let a = 0; a < gotas.length; a++) {
      for (let b = 0; b < gotas.length; b++) {
        if (a === b || tempo[b] <= tempo[a]) continue;
        if (casas[a].includes(gotas[b].lin * m.colunas + gotas[b].col)) { tempo[b] = tempo[a]; mudou = true; }
      }
    }
  }
  const dur = m.ajuste.duracaoRespingo;
  gotas.forEach((g, k) => { for (const i of casas[k]) marcar(i, tempo[k], tempo[k] + dur); });

  // Aperto final: a peça que cai é perigo dali para sempre.
  const a = m.aperto;
  if (a && a.ativo && a.seq) {
    for (let k = 0; k < QUEDAS_PREVISTAS && a.indice + k < a.seq.length; k++) {
      marcar(a.seq[a.indice + k], Math.max(0, a.proximoEm - m.tick) + k * a.ritmo, SEMPRE);
    }
  }

  const primeiro = new Array(n).fill(SEGURO);
  for (let i = 0; i < n; i++) {
    const j = janelas[i];
    if (!j) continue;
    for (let k = 0; k < j.length; k += 2) if (j[k] < primeiro[i]) primeiro[i] = j[k];
  }
  const analise = { janelas, primeiro, gotas, tempo, ocupadas };
  if (!extras.length) cache.set(m, { tick: m.tick, analise });
  return analise;
}

/** A casa fica seca durante todo o intervalo [a, b]? */
export function secaDurante(an, i, a, b) {
  const j = an.janelas[i];
  if (!j) return true;
  for (let k = 0; k < j.length; k += 2) if (j[k] <= b && j[k + 1] > a) return false;
  return true;
}

/** A casa fica seca de `desde` em diante (nenhuma janela termina depois disso)? */
export function secaDesde(an, i, desde) {
  const j = an.janelas[i];
  if (!j) return true;
  for (let k = 0; k < j.length; k += 2) if (j[k + 1] > desde) return false;
  return true;
}

/** Compatível com a parte 1: tempo até cada casa ficar letal (SEGURO se nunca). */
export function mapaDePerigo(m, extras = []) {
  return analisar(m, extras).primeiro;
}
