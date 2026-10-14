// O mundo da simulação e o passo fixo. Nada aqui toca em DOM, Canvas, relógio
// real ou Math.random: dado o mesmo mundo e as mesmas entradas, o próximo mundo
// é sempre o mesmo (testado em qa/sim/determinismo.test.mjs).

import { COLUNAS, LINHAS, LARGADAS, ATRASO_FIM, TPS, VAZIO, CASA, MEIA_CASA } from './constantes.js';
import { criarAjuste } from './ajustes.js';
import { criarAleatorio } from './aleatorio.js';
import { obterArena } from './arenas.js';
import { gerarArena, gradeDeTexto } from './grade.js';
import { criarJogador, colDe, linDe, sobrepoe } from './jogadores.js';
import { moverJogador, aplicarCorrente } from './movimento.js';
import { soltarGota, atualizarPassantes } from './gotas.js';
import { estourar, casasLetais, envelhecerRespingos, respingosEm } from './respingo.js';
import { pegarItem } from './itens.js';
import { avancarChutadas } from './chute.js';
import { gotaParaLevantar, levantar, arremessar, seguirPortador, avancarVoos } from './pinca.js';
import { usarPoder, desmontar, vemDaFrente } from './bichinhos.js';
import { criarAperto, avancarAperto } from './aperto.js';

export const PERSONAGENS_PADRAO = Object.freeze(['iris', 'pupilo', 'retina', 'macula']);
export const ENTRADA_VAZIA = Object.freeze({ cima: false, baixo: false, esq: false, dir: false, bomba: false, acao: false });
const INTERVALO_ESPIRRO = 45; // Cisco "espirro": uma gota sem querer a cada 0,75 s

/**
 * Cria um mundo novo (uma rodada).
 * @param {object} op
 * @param {number} op.semente      semente de 32 bits
 * @param {string} [op.arena]      id da arena (js/sim/arenas.js)
 * @param {string[]} [op.personagens] um por competidor (1 a 4)
 * @param {string[]} [op.mapa]     grade em texto (testes); ver gradeDeTexto
 * @param {object} [op.ajuste]     parâmetros de sentir (js/sim/ajustes.js); o objeto é usado como está
 * @param {number} [op.contagem]   ticks de "3, 2, 1, já!" antes de soltar (0 = começa jogando)
 * @param {number|null} [op.duracao] ticks de relógio (null = sem relógio nem aperto final)
 *
 * Sem `contagem`/`duracao`, o mundo é "livre" (testes de regra); o controlador
 * da partida (js/jogo.js) liga a contagem, o relógio e o aperto final.
 */
export function criarMundo(op = {}) {
  const semente = (op.semente ?? 1) >>> 0;
  const arena = obterArena(op.arena);
  const rng = criarAleatorio(semente);
  const ajuste = op.ajuste || criarAjuste();
  let grade, ocultos, itens, piso, colunas = COLUNAS, linhas = LINHAS, largadas = LARGADAS;
  if (op.mapa) {
    const t = gradeDeTexto(op.mapa);
    ({ grade, ocultos, itens, colunas, linhas, piso } = t);
    largadas = t.largadas.filter(Boolean);
  } else {
    ({ grade, ocultos, piso } = gerarArena(arena, rng));
    itens = new Array(grade.length).fill(null);
  }
  const personagens = (op.personagens || PERSONAGENS_PADRAO).slice(0, largadas.length);
  const jogadores = personagens.map((p, id) => criarJogador(id, p, largadas[id].col, largadas[id].lin));
  const contagem = Math.max(0, Math.round(op.contagem ?? 0));
  return {
    semente,
    rng: rng.estado,
    arena: arena.id,
    ajuste,
    colunas,
    linhas,
    tick: 0,
    fase: contagem > 0 ? 'contagem' : 'jogando', // → 'encerrando' (última queda) → 'fim'
    contagem,
    inicioJogo: contagem, // tick em que todos são soltos ("já!")
    tempoRestante: op.duracao ?? null,
    tempoEsgotado: false,
    aperto: criarAperto(),
    fimEm: null,
    vencedor: null, // id, ou null em empate
    grade,
    ocultos, // itens ainda escondidos sob blocos
    itens, // itens expostos no chão
    piso, // correnteza, lente (não muda)
    jogadores,
    gotas: [],
    respingos: [],
    quebras: [],
    proximoId: 1,
    eventos: [], // o que aconteceu no último tick (para som e efeitos)
  };
}

/**
 * Avança um tick. `entradas[id]` = {cima, baixo, esq, dir, bomba, acao} (opcional).
 * Ordem fixa: contagem → relógio/aperto → efeitos → poderes e movimento →
 * botão de gota (soltar/levantar/arremessar) → passantes → gotas chutadas e
 * no ar → respingos antigos → pavios → gotas em casas letais → itens
 * queimados → pegar itens → contágio do Cisco → encharcar → fim.
 */
export function passo(m, entradas = []) {
  m.tick++;
  m.eventos = [];
  if (m.fase === 'fim') return m;
  if (m.fase === 'contagem') {
    contar(m, entradas);
    return m;
  }
  if (m.fase === 'jogando' && m.tempoRestante !== null) {
    m.tempoRestante--;
    avancarAperto(m, eliminar);
    if (m.tempoRestante <= 0) {
      m.tempoEsgotado = true;
      m.fase = 'encerrando';
      m.fimEm = m.tick + ATRASO_FIM;
      m.eventos.push({ tipo: 'tempo' });
    }
  }

  const vivos = emRodizio(m, m.jogadores.filter((j) => j.vivo));
  for (const j of vivos) passarEfeitos(m, j);
  for (const j of vivos) {
    if (!j.vivo) continue; // esmagado pelo aperto neste tick
    const ent = entradas[j.id] || ENTRADA_VAZIA;
    const ocupado = usarPoder(m, j, ent);
    if (!ocupado) moverJogador(m, j, ent);
    if (!j.salto) aplicarCorrente(m, j);
  }
  for (const j of vivos) if (j.vivo) botaoDaGota(m, j, entradas[j.id] || ENTRADA_VAZIA);
  for (const g of m.gotas) if (g.estado === 'mao') seguirPortador(g, m.jogadores[g.portador]);
  atualizarPassantes(m);
  avancarChutadas(m);
  avancarVoos(m);

  envelhecerRespingos(m);
  for (const g of m.gotas) g.pavio = g.estado === 'voo' ? Math.max(1, g.pavio - 1) : g.pavio - 1;
  const vencidas = m.gotas.filter((g) => g.pavio <= 0);
  for (const g of vencidas) if (g.estado === 'mao') largarNaMao(m, g);
  if (vencidas.length) estourar(m, vencidas);

  // Gota parada numa casa ainda molhada (ex.: solta dentro do respingo) estoura.
  let letal = casasLetais(m);
  const molhadas = m.gotas.filter((g) => g.estado === 'chao' && casasDaGota(m, g).some((i) => letal[i]));
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
    if (!j.vivo || j.salto) continue;
    const i = linDe(j) * m.colunas + colDe(j);
    const item = m.itens[i];
    if (item) {
      m.itens[i] = null;
      const mudou = pegarItem(m, j, item);
      m.eventos.push({ tipo: 'item', jogador: j.id, item, mudou, col: colDe(j), lin: linDe(j) });
    }
  }

  espalharCisco(m);
  for (const j of vivos) if (j.vivo) encharcar(m, j, letal);
  verificarFim(m);
  return m;
}

/**
 * Ordem de processamento dos jogadores neste tick, girando a cada tick: com a
 * ordem fixa por id, o jogador 0 sempre andava, soltava gota e pegava o item
 * disputado primeiro (desempate sistemático a favor de um canto).
 */
function emRodizio(m, lista) {
  if (lista.length < 2) return lista;
  const k = m.tick % lista.length;
  return k ? [...lista.slice(k), ...lista.slice(0, k)] : lista;
}

/** "3, 2, 1, já!": ninguém se mexe; o botão segurado não vira gota na largada. */
function contar(m, entradas) {
  for (const j of m.jogadores) {
    const e = entradas[j.id];
    j.bombaAntes = !!(e && e.bomba);
    j.acaoAntes = !!(e && e.acao);
  }
  m.contagem--;
  if (m.contagem > 0 && m.contagem % TPS === 0) m.eventos.push({ tipo: 'contagem', n: m.contagem / TPS });
  if (m.contagem <= 0) {
    m.fase = 'jogando';
    m.eventos.push({ tipo: 'ja' });
  }
}

function passarEfeitos(m, j) {
  if (j.invulneravel > 0) j.invulneravel--;
  if (j.imuneCisco > 0) j.imuneCisco--;
  if (j.cisco) {
    j.cisco.restante--;
    if (j.cisco.restante <= 0) {
      j.cisco = null;
      m.eventos.push({ tipo: 'fimCisco', jogador: j.id });
    }
  }
}

/** Botão de gota: soltar; com a Pinça, levantar (apertar) e arremessar (soltar). */
function botaoDaGota(m, j, ent) {
  const quer = !!ent.bomba;
  const borda = quer && !j.bombaAntes;
  j.bombaAntes = quer;
  if (j.salto) return;
  if (j.segurando !== null) {
    if (!quer) arremessar(m, j);
    return;
  }
  if (borda) {
    const g = gotaParaLevantar(m, j);
    if (g) levantar(m, j, g);
    else soltarGota(m, j);
  }
  if (j.cisco?.tipo === 'espirro' && j.cisco.restante % INTERVALO_ESPIRRO === 0 && soltarGota(m, j)) {
    m.eventos.push({ tipo: 'espirro', jogador: j.id });
  }
}

/** Casas que o corpo da gota toca (uma, ou duas se estiver deslizando). */
export function casasDaGota(m, g) {
  const c0 = Math.floor((g.x - MEIA_CASA) / CASA);
  const l0 = Math.floor((g.y - MEIA_CASA) / CASA);
  const c1 = Math.ceil((g.x - MEIA_CASA) / CASA);
  const l1 = Math.ceil((g.y - MEIA_CASA) / CASA);
  const casas = [l0 * m.colunas + c0];
  if (c1 !== c0 || l1 !== l0) casas.push(l1 * m.colunas + c1);
  return casas;
}

/** Pavio acabou com a gota na mão: ela cai na casa de quem a segura e estoura ali. */
function largarNaMao(m, g) {
  const j = m.jogadores[g.portador];
  seguirPortador(g, j);
  g.estado = 'chao';
  g.portador = null;
  j.segurando = null;
}

/**
 * Cisco passa: encostar (corpo com corpo) em quem não tem Cisco ENTREGA o azar
 * (com o tempo que falta) — quem tinha fica livre e, por um instante, não o
 * pega de volta. Assim o azar troca de dono em vez de se espalhar pelos quatro.
 */
const IMUNE_APOS_PASSAR = 60;
function espalharCisco(m) {
  const vivos = emRodizio(m, m.jogadores.filter((j) => j.vivo && !j.salto));
  for (const a of vivos) {
    if (!a.cisco) continue;
    for (const b of vivos) {
      if (b === a || b.cisco || b.imuneCisco > 0) continue;
      if (Math.abs(a.x - b.x) < CASA * 0.7 && Math.abs(a.y - b.y) < CASA * 0.7) {
        b.cisco = { ...a.cisco };
        a.cisco = null;
        a.imuneCisco = IMUNE_APOS_PASSAR;
        m.eventos.push({ tipo: 'cisco', jogador: b.id, de: a.id });
        m.eventos.push({ tipo: 'fimCisco', jogador: a.id });
        break;
      }
    }
  }
}

function encharcar(m, j, letal) {
  if (j.salto || j.invulneravel > 0) return;
  const col = colDe(j);
  const lin = linDe(j);
  if (!letal[lin * m.colunas + col]) return;
  if (j.escudo && j.montaria?.tipo === 'cascudo') {
    const vindos = respingosEm(m, col, lin);
    if (vindos.length && vindos.every((r) => vemDaFrente(j, r))) {
      const novo = vindos.find((r) => !(j.defendidos || []).includes(r.id));
      if (novo) {
        j.defendidos = vindos.map((r) => r.id);
        m.eventos.push({ tipo: 'defendeu', jogador: j.id, col, lin });
      }
      return;
    }
  }
  if (j.montaria) {
    desmontar(m, j);
    return;
  }
  const vindos = respingosEm(m, col, lin);
  // Para as estatísticas: molhou-se só com a própria gota, sem cadeia vinda de outro?
  const sozinho = vindos.every((r) => r.dono === j.id && (r.disparadoPor === null || r.disparadoPor === j.id));
  eliminar(m, j, donoDoRespingoEm(m, col, lin), sozinho ? 'propria' : 'respingo', sozinho && encurralado(m, j, col, lin));
}

/**
 * Só para as estatísticas: a saída estava fechada por um rival (casa vizinha
 * com gota dele ou molhada por respingo dele)? Distingue "errou sozinho" de
 * "foi encurralado e a própria gota fechou o cerco".
 */
function encurralado(m, j, col, lin) {
  for (const [dc, dl] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const c = col + dc;
    const l = lin + dl;
    if (m.gotas.some((g) => g.estado === 'chao' && g.dono !== j.id && g.col === c && g.lin === l)) return true;
    if (respingosEm(m, c, l).some((r) => r.dono !== j.id || (r.disparadoPor !== null && r.disparadoPor !== j.id))) return true;
  }
  return false;
}

/** Tira o jogador da rodada ("vai descansar"); a gota que segurava cai ali. */
function eliminar(m, j, por, motivo, cercado = false) {
  j.vivo = false;
  j.andando = false;
  j.salto = null;
  j.disparada = null;
  j.escudo = false;
  j.eliminadoEm = m.tick;
  j.eliminadoPor = por;
  if (j.segurando !== null) {
    const g = m.gotas.find((o) => o.id === j.segurando);
    j.segurando = null;
    if (g) {
      seguirPortador(g, j);
      g.estado = 'chao';
      g.portador = null;
      g.passantes = m.jogadores.filter((o) => o.vivo && sobrepoe(o, g.col, g.lin)).map((o) => o.id);
      if (m.grade[g.lin * m.colunas + g.col] !== VAZIO) m.gotas = m.gotas.filter((o) => o !== g);
    }
  }
  m.eventos.push({ tipo: 'encharcado', jogador: j.id, por, motivo, ...(cercado ? { encurralado: true } : {}) });
}

function donoDoRespingoEm(m, col, lin) {
  // O respingo mais recente que cobre a casa leva o "crédito".
  const rs = respingosEm(m, col, lin);
  return rs.length ? rs[rs.length - 1].dono : null;
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
    m.vencedor = vivos.length === 1 && !m.tempoEsgotado ? vivos[0].id : null;
    m.eventos.push({ tipo: 'fim', vencedor: m.vencedor, tempoEsgotado: m.tempoEsgotado });
  }
}

/** Avança n ticks com as mesmas entradas (útil para testes). */
export function avancar(m, n, entradas = []) {
  for (let k = 0; k < n; k++) passo(m, entradas);
  return m;
}
