// Caminhos dos robôs: vizinhança (com os túneis da Caverna), busca em largura
// e o planejador de fuga com tempo (camadas de "onde posso estar no passo k").

import { CASA, VAZIO, TUNEL, DIRECOES, NOMES_DIRECOES } from '../sim/constantes.js';
import { colDe, linDe, velocidadeDe } from '../sim/jogadores.js';
import { secaDurante, secaDesde, SEGURO } from './perigo.js';

/** Vizinhos de uma casa: [[índice, direção], ...], com a volta pelos túneis. */
export function vizinhos(m, i) {
  const c = i % m.colunas;
  const l = Math.floor(i / m.colunas);
  const lista = [];
  for (const nome of NOMES_DIRECOES) {
    const { dc, dl } = DIRECOES[nome];
    let cc = c + dc;
    const ll = l + dl;
    if (cc < 0) cc = m.colunas - 1; // só acontece saindo de um túnel
    else if (cc >= m.colunas) cc = 0;
    if (ll < 0 || ll >= m.linhas) continue;
    lista.push([ll * m.colunas + cc, nome]);
  }
  return lista;
}

/** Casas com gota no chão (corpo dela) — obstáculos para quem não é passante. */
export function casasComGota(m, j, extras = []) {
  const ocupada = new Uint8Array(m.grade.length);
  for (const g of m.gotas) {
    if (g.estado !== 'chao' || (j && g.passantes.includes(j.id))) continue;
    ocupada[g.lin * m.colunas + g.col] = 1;
    if (g.mov) ocupada[Math.round((g.y - 500) / CASA) * m.colunas + Math.round((g.x - 500) / CASA)] = 1;
  }
  for (const g of extras) ocupada[g.lin * m.colunas + g.col] = 1;
  return ocupada;
}

export function passavel(m, i, ocupada) {
  const t = m.grade[i];
  return (t === VAZIO || t === TUNEL) && !ocupada[i];
}

export function casaDe(m, j) {
  return linDe(j) * m.colunas + colDe(j);
}

export function ticksPorCasa(m, j) {
  return Math.ceil(CASA / velocidadeDe(j, m.ajuste));
}

/**
 * Busca em largura a partir da casa do jogador. `pode(i, dist)` decide se dá
 * para pisar na casa; devolve distâncias (em casas) e pais.
 */
export function buscar(m, j, ocupada, pode = () => true, origem = casaDe(m, j)) {
  const n = m.grade.length;
  const dist = new Int16Array(n).fill(-1);
  const pai = new Int16Array(n).fill(-1);
  dist[origem] = 0;
  const fila = [origem];
  for (let k = 0; k < fila.length; k++) {
    const i = fila[k];
    for (const [v] of vizinhos(m, i)) {
      if (dist[v] !== -1 || !passavel(m, v, ocupada) || !pode(v, dist[i] + 1)) continue;
      dist[v] = dist[i] + 1;
      pai[v] = i;
      fila.push(v);
    }
  }
  return { dist, pai, origem, fila };
}

/** Primeira casa do caminho até `destino` (ou a própria origem). */
export function primeiroPasso(busca, destino) {
  let i = destino;
  while (busca.pai[i] !== -1 && busca.pai[i] !== busca.origem) i = busca.pai[i];
  return i;
}

/** Busca só por casas sem perigo nenhum à vista (andar tranquilo). */
export function buscarSeguro(m, j, an, ocupada) {
  return buscar(m, j, ocupada, (i) => an.primeiro[i] === SEGURO);
}

/**
 * Planejador de fuga. Camada k = casas onde o jogador pode estar depois de k
 * passos de uma casa (ficar parado conta como passo). Cada casa precisa estar
 * seca enquanto ele a ocupa (com `margem` ticks de folga). Devolve o caminho
 * até a casa mais próxima que fica seca para sempre, ou, se não houver, até a
 * que aguenta mais tempo. `alvo`: refúgio preferido (mantido se ainda servir). `origemBloqueada`: há gota na casa de partida (ele
 * pode ficar nela, mas não voltar a ela depois de sair).
 */
export function planejarFuga(m, j, an, ocupada, op = {}) {
  const T = ticksPorCasa(m, j);
  const margem = op.margem ?? 6;
  const camadas = op.camadas ?? 16;
  const origem = casaDe(m, j);
  const n = m.grade.length;
  const pais = [];
  let atual = [origem];
  const metade = Math.ceil(T / 2);
  let melhorFallback = { k: 0, casa: origem };
  const escolher = op.escolher || ((lista) => lista[0]);
  let primeira = null;
  for (let k = 1; k <= camadas; k++) {
    const ini = k * T - metade - margem;
    const fim = k * T + metade + margem;
    const pai = new Int16Array(n).fill(-1);
    const proxima = [];
    for (const c of atual) {
      if (pai[c] === -1 && secaDurante(an, c, Math.max(0, ini), fim)) { pai[c] = c; proxima.push(c); }
      for (const [v] of vizinhos(m, c)) {
        if (pai[v] !== -1 || !passavel(m, v, ocupada)) continue;
        if (v === origem && op.origemBloqueada) continue;
        if (!secaDurante(an, v, Math.max(0, ini), fim)) continue;
        pai[v] = c;
        proxima.push(v);
      }
    }
    if (!proxima.length) break;
    pais.push(pai);
    atual = proxima;
    melhorFallback = { k, casa: proxima[0] };
    const seguras = proxima.filter((c) => secaDesde(an, c, Math.max(0, ini)));
    // Refúgio já escolhido antes: mantém enquanto der (trocar de ideia a cada
    // tick entre dois refúgios parecidos deixaria o robô indo e voltando).
    if (op.alvo !== undefined && op.alvo !== null && seguras.includes(op.alvo)) {
      return { ok: true, passos: k, destino: op.alvo, caminho: refazer(pais, op.alvo, origem), seguras };
    }
    if (seguras.length && !primeira) {
      const destino = escolher(seguras);
      primeira = { ok: true, passos: k, destino, caminho: refazer(pais, destino, origem), seguras };
      if (op.alvo === undefined || op.alvo === null) return primeira;
    }
  }
  if (primeira) return primeira;
  const { casa } = melhorFallback;
  return { ok: false, passos: melhorFallback.k, destino: casa, caminho: refazer(pais.slice(0, melhorFallback.k), casa, origem), seguras: [] };
}

function refazer(pais, destino, origem) {
  const caminho = [destino];
  let c = destino;
  for (let k = pais.length - 1; k >= 0; k--) {
    c = pais[k][c];
    caminho.push(c);
  }
  caminho.reverse();
  if (caminho[0] !== origem) caminho.unshift(origem);
  return caminho;
}

/** Distância em casas (Manhattan) entre dois índices. */
export function distancia(m, a, b) {
  return Math.abs((a % m.colunas) - (b % m.colunas)) + Math.abs(Math.floor(a / m.colunas) - Math.floor(b / m.colunas));
}
