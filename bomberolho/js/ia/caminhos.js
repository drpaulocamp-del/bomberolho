// Caminhos dos robôs: vizinhança (com os túneis da Caverna), busca em largura
// e o planejador de fuga com tempo (camadas de "onde posso estar no passo k").

import { CASA, VAZIO, TUNEL, DIRECOES, NOMES_DIRECOES } from '../sim/constantes.js';
import { colDe, linDe, velocidadeDe } from '../sim/jogadores.js';
import { secaDurante, secaDesde, SEGURO } from './perigo.js';

const tabelas = new WeakMap(); // mundo → { semente, lista } (vizinhança pronta; só leitura)

/**
 * Vizinhos de uma casa: [[índice, direção], ...]; pelos túneis, a casa do lado
 * oposto. A tabela é montada uma vez por mundo (a moldura e os túneis não
 * mudam): a busca chama isto milhares de vezes por segundo e, antes, cada
 * chamada criava listas novas. Quem chama só lê a lista.
 */
export function vizinhos(m, i) {
  let t = tabelas.get(m);
  if (!t || t.semente !== m.semente) {
    t = { semente: m.semente, lista: Array.from({ length: m.grade.length }, (_, k) => montarVizinhos(m, k)) };
    tabelas.set(m, t);
  }
  return t.lista[i];
}

function montarVizinhos(m, i) {
  const c = i % m.colunas;
  const l = Math.floor(i / m.colunas);
  const lista = [];
  // A ordem das direções muda de rodada para rodada (pela semente): com ordem
  // fixa (cima, baixo, esq, dir), os empates da busca sempre preferiam os
  // mesmos lados, e isso favorecia uns cantos de largada mais que outros.
  // Dentro da rodada ela não muda (mudar a cada tick fazia o robô hesitar).
  const giro = (m.semente >>> 7) & 3;
  for (let k = 0; k < 4; k++) {
    const nome = NOMES_DIRECOES[(k + giro) & 3];
    const { dc, dl } = DIRECOES[nome];
    let cc = c + dc;
    const ll = l + dl;
    if (ll < 0 || ll >= m.linhas || cc < 0 || cc >= m.colunas) continue;
    // Boca de túnel: portal sem largura, leva direto à casa do lado oposto.
    if (m.grade[ll * m.colunas + cc] === TUNEL) cc = cc === 0 ? m.colunas - 2 : 1;
    lista.push(Object.freeze([ll * m.colunas + cc, nome]));
  }
  return Object.freeze(lista);
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
  return t === VAZIO && !ocupada[i];
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
    const viz = vizinhos(m, i);
    for (let b = 0; b < viz.length; b++) {
      const v = viz[b][0];
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
 * que aguenta mais tempo. `alvo`: refúgio preferido (mantido se não custar
 * mais caro). `origemBloqueada`: há gota na casa de partida (ele pode ficar
 * nela, mas não voltar a ela depois de sair).
 *
 * O primeiro passo é tratado à parte, com o tempo real até o centro da casa
 * vizinha (quem já está a meio caminho de uma casa chega antes nela e demora
 * mais para as outras); os seguintes custam uma casa cada.
 */
export function planejarFuga(m, j, an, ocupada, op = {}) {
  const T = ticksPorCasa(m, j);
  const vel = velocidadeDe(j, m.ajuste);
  const origem = casaDe(m, j);
  const cx = (origem % m.colunas) * CASA + CASA / 2;
  const cy = Math.floor(origem / m.colunas) * CASA + CASA / 2;
  const margem = op.margem ?? 6;
  const opcoes = [{ casa: origem, t1: Math.ceil((Math.abs(j.x - cx) + Math.abs(j.y - cy)) / vel) + T }];
  for (const [v, nome] of vizinhos(m, origem)) {
    if (!passavel(m, v, ocupada) || (v === origem && op.origemBloqueada)) continue;
    const { dc, dl } = DIRECOES[nome];
    const lateral = dc !== 0 ? Math.abs(j.y - cy) : Math.abs(j.x - cx);
    const axial = dc !== 0 ? Math.abs(cx + dc * CASA - j.x) : Math.abs(cy + dl * CASA - j.y);
    const t1 = Math.ceil((lateral + Math.min(axial, CASA * 1.5)) / vel);
    // A casa de partida precisa ficar seca até o centro do corpo sair dela.
    if (!secaDurante(an, origem, 0, Math.max(0, t1 - Math.floor(T / 2)) + margem)) continue;
    opcoes.push({ casa: v, t1 });
  }
  let melhor = null;
  let melhorFalha = null;
  for (const o of opcoes) {
    const p = camadasDeFuga(m, an, ocupada, op, origem, o.casa, o.t1, T, margem);
    p.chegada = o.t1 + (p.passos - 1) * T;
    if (p.ok) {
      // O refúgio já escolhido ganha de qualquer outro enquanto der para chegar
      // nele a tempo: trocar de ideia na fronteira entre duas casas faz ir e voltar.
      const preferido = op.alvo !== undefined && op.alvo !== null && p.destino === op.alvo;
      const nota = p.chegada - (preferido ? 10000 : 0);
      if (!melhor || nota < melhor.nota) melhor = { ...p, nota };
    } else if (!melhorFalha || p.chegada > melhorFalha.chegada) melhorFalha = p;
  }
  return melhor || melhorFalha || { ok: false, passos: 0, destino: origem, caminho: [origem], seguras: [] };
}

// Memória reaproveitada pelo planejador (roda milhares de vezes por segundo
// no Difícil; criar arrays novos a cada camada pesava no celular simples).
let PAIS = new Int16Array(0); // camada k, casa c → casa anterior + 1 (0 = não alcançada)
let MARCA = new Int32Array(0); // casa → número da última camada que a alcançou
let selo = 0;

function camadasDeFuga(m, an, ocupada, op, origem, primeira, t1, T, margem) {
  const camadas = op.camadas ?? 16;
  const n = m.grade.length;
  const metade = Math.ceil(T / 2);
  const escolher = op.escolher || ((lista) => lista[0]);
  if (PAIS.length < (camadas + 1) * n) PAIS = new Int16Array((camadas + 1) * n);
  if (MARCA.length < n) { MARCA = new Int32Array(n); selo = 0; }
  if (selo > 2e9) { MARCA.fill(0); selo = 0; }
  let atual = [origem];
  let fallback = { k: 0, casa: origem };
  let feitas = 0; // camadas guardadas em PAIS
  for (let k = 1; k <= camadas; k++) {
    const t = t1 + (k - 1) * T;
    const ini = Math.max(0, t - metade - margem);
    const fim = t + metade + margem;
    const base = (k - 1) * n;
    const marca = ++selo;
    const proxima = [];
    const chegar = (v, de) => { MARCA[v] = marca; PAIS[base + v] = de + 1; proxima.push(v); };
    if (k === 1) {
      if (secaDurante(an, primeira, ini, fim)) chegar(primeira, origem);
    } else {
      for (let a = 0; a < atual.length; a++) {
        const c = atual[a];
        if (MARCA[c] !== marca && secaDurante(an, c, ini, fim)) chegar(c, c);
        const viz = vizinhos(m, c);
        for (let b = 0; b < viz.length; b++) {
          const v = viz[b][0];
          if (MARCA[v] === marca || !passavel(m, v, ocupada)) continue;
          if (v === origem && op.origemBloqueada) continue;
          if (!secaDurante(an, v, ini, fim)) continue;
          chegar(v, c);
        }
      }
    }
    if (!proxima.length) break;
    feitas = k;
    atual = proxima;
    fallback = { k, casa: proxima[0] };
    const seguras = proxima.filter((c) => secaDesde(an, c, ini));
    if (seguras.length) {
      const destino = op.alvo !== undefined && seguras.includes(op.alvo) ? op.alvo : escolher(seguras);
      return { ok: true, passos: k, destino, caminho: refazer(n, k, destino, origem), seguras };
    }
  }
  return { ok: false, passos: fallback.k, destino: fallback.casa, caminho: refazer(n, Math.min(feitas, fallback.k), fallback.casa, origem), seguras: [] };
}

function refazer(n, camadas, destino, origem) {
  const caminho = [destino];
  let c = destino;
  for (let k = camadas - 1; k >= 0; k--) {
    c = PAIS[k * n + c] - 1;
    caminho.push(c);
  }
  caminho.reverse();
  if (caminho[0] !== origem) caminho.unshift(origem);
  return caminho;
}

/**
 * Quão encurralado um rival fica: 3 = sem fuga, 2 = só foge sem folga nenhuma
 * (precisa acertar o tempo), 1 = na cruz mas foge com folga, 0 = nada.
 * (Contar "poucas casas seguras" enganava: a primeira camada segura da fuga
 * quase sempre tem uma ou duas casas, mesmo com a arena toda aberta.)
 */
export function apertoDaFuga(m, o, an, ocupada, naCruz) {
  const fuga = planejarFuga(m, o, an, ocupada, { margem: 0, camadas: 12 });
  if (!fuga.ok) return 3;
  if (!planejarFuga(m, o, an, ocupada, { margem: 14, camadas: 12 }).ok) return 2;
  return naCruz ? 1 : 0;
}

/** Distância em casas (Manhattan) entre dois índices. */
export function distancia(m, a, b) {
  return Math.abs((a % m.colunas) - (b % m.colunas)) + Math.abs(Math.floor(a / m.colunas) - Math.floor(b / m.colunas));
}
