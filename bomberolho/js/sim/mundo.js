// O mundo da simulação e o passo fixo. Nada aqui toca em DOM, Canvas, relógio
// real ou Math.random: dado o mesmo mundo e as mesmas entradas, o próximo mundo
// é sempre o mesmo (testado em qa/sim/determinismo.test.mjs).

import { COLUNAS, LINHAS, LARGADAS, ATRASO_FIM } from './constantes.js';
import { criarAleatorio } from './aleatorio.js';
import { obterArena } from './arenas.js';
import { gerarArena, gradeDeTexto } from './grade.js';
import { criarJogador, colDe, linDe } from './jogadores.js';
import { moverJogador } from './movimento.js';
import { soltarGota, atualizarPassantes } from './gotas.js';
import { estourar, casasLetais, envelhecerRespingos } from './respingo.js';
import { aplicarItem } from './itens.js';

export const PERSONAGENS_PADRAO = Object.freeze(['iris', 'pupilo', 'retina', 'macula']);
export const ENTRADA_VAZIA = Object.freeze({ cima: false, baixo: false, esq: false, dir: false, bomba: false });

/**
 * Cria um mundo novo.
 * @param {object} op
 * @param {number} op.semente      semente de 32 bits
 * @param {string} [op.arena]      id da arena (js/sim/arenas.js)
 * @param {string[]} [op.personagens] um por competidor (1 a 4)
 * @param {string[]} [op.mapa]     grade em texto (testes); ver gradeDeTexto
 */
export function criarMundo(op = {}) {
  const semente = (op.semente ?? 1) >>> 0;
  const arena = obterArena(op.arena);
  const rng = criarAleatorio(semente);
  let grade, ocultos, itens, colunas = COLUNAS, linhas = LINHAS, largadas = LARGADAS;
  if (op.mapa) {
    const t = gradeDeTexto(op.mapa);
    ({ grade, ocultos, itens, colunas, linhas } = t);
    largadas = t.largadas.filter(Boolean);
  } else {
    ({ grade, ocultos } = gerarArena(arena, rng));
    itens = new Array(grade.length).fill(null);
  }
  const personagens = (op.personagens || PERSONAGENS_PADRAO).slice(0, largadas.length);
  const jogadores = personagens.map((p, id) => criarJogador(id, p, largadas[id].col, largadas[id].lin));
  return {
    semente,
    rng: rng.estado,
    arena: arena.id,
    colunas,
    linhas,
    tick: 0,
    fase: 'jogando', // 'jogando' → 'encerrando' (última queda) → 'fim'
    fimEm: null,
    vencedor: null, // id, ou null em empate
    grade,
    ocultos, // itens ainda escondidos sob blocos
    itens, // itens expostos no chão
    jogadores,
    gotas: [],
    respingos: [],
    quebras: [],
    proximoId: 1,
    eventos: [], // o que aconteceu no último tick (para som e efeitos)
  };
}

/**
 * Avança um tick. `entradas[id]` = {cima, baixo, esq, dir, bomba} (opcional).
 * Ordem fixa: mover → soltar → passantes → respingos antigos → pavios →
 * gotas em casas letais → itens queimados → pegar itens → encharcar → fim.
 */
export function passo(m, entradas = []) {
  m.tick++;
  m.eventos = [];
  if (m.fase === 'fim') return m;

  const vivos = m.jogadores.filter((j) => j.vivo);
  for (const j of vivos) moverJogador(m, j, entradas[j.id] || ENTRADA_VAZIA);
  for (const j of vivos) {
    const querGota = !!(entradas[j.id] && entradas[j.id].bomba);
    if (querGota && !j.bombaAntes) soltarGota(m, j);
    j.bombaAntes = querGota;
  }
  atualizarPassantes(m);

  envelhecerRespingos(m);
  for (const g of m.gotas) g.pavio--;
  const vencidas = m.gotas.filter((g) => g.pavio <= 0);
  if (vencidas.length) estourar(m, vencidas);

  // Gota parada numa casa ainda molhada (ex.: solta dentro do respingo) estoura.
  let letal = casasLetais(m);
  const molhadas = m.gotas.filter((g) => letal[g.lin * m.colunas + g.col]);
  if (molhadas.length) {
    estourar(m, molhadas);
    letal = casasLetais(m);
  }

  for (let i = 0; i < m.itens.length; i++) {
    if (m.itens[i] && letal[i]) {
      m.eventos.push({ tipo: 'itemQueimado', col: i % m.colunas, lin: Math.floor(i / m.colunas), item: m.itens[i] });
      m.itens[i] = null;
    }
  }

  for (const j of vivos) {
    const i = linDe(j) * m.colunas + colDe(j);
    const item = m.itens[i];
    if (item) {
      m.itens[i] = null;
      const mudou = aplicarItem(j, item);
      m.eventos.push({ tipo: 'item', jogador: j.id, item, mudou, col: colDe(j), lin: linDe(j) });
    }
  }

  for (const j of vivos) {
    const i = linDe(j) * m.colunas + colDe(j);
    if (letal[i]) {
      j.vivo = false;
      j.andando = false;
      j.eliminadoEm = m.tick;
      j.eliminadoPor = donoDoRespingoEm(m, i);
      m.eventos.push({ tipo: 'encharcado', jogador: j.id, por: j.eliminadoPor });
    }
  }

  verificarFim(m);
  return m;
}

function donoDoRespingoEm(m, indiceCasa) {
  const col = indiceCasa % m.colunas;
  const lin = Math.floor(indiceCasa / m.colunas);
  // O respingo mais recente que cobre a casa leva o "crédito".
  for (let k = m.respingos.length - 1; k >= 0; k--) {
    const r = m.respingos[k];
    const naCruz = (r.lin === lin && col >= r.col - r.bracos.esq && col <= r.col + r.bracos.dir)
      || (r.col === col && lin >= r.lin - r.bracos.cima && lin <= r.lin + r.bracos.baixo);
    if (naCruz) return r.dono;
  }
  return null;
}

function verificarFim(m) {
  if (m.jogadores.length < 2) return; // mundo de treino/teste: sem fim de rodada
  const vivos = m.jogadores.filter((j) => j.vivo);
  if (m.fase === 'jogando' && vivos.length <= 1) {
    m.fase = 'encerrando';
    m.fimEm = m.tick + ATRASO_FIM;
  }
  if (m.fase === 'encerrando' && m.tick >= m.fimEm) {
    m.fase = 'fim';
    m.vencedor = vivos.length === 1 ? vivos[0].id : null;
    m.eventos.push({ tipo: 'fim', vencedor: m.vencedor });
  }
}

/** Avança n ticks com as mesmas entradas (útil para testes). */
export function avancar(m, n, entradas = []) {
  for (let k = 0; k < n; k++) passo(m, entradas);
  return m;
}
