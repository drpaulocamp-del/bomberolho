// Robôs simples (parte 1): andam, abrem blocos, pegam itens e fogem dos
// respingos que conseguem prever. A IA completa em 3 níveis vem na parte 2;
// esta já segue as mesmas regras do humano e lê o mesmo estado que ele vê.

import { CASA, MEIA_CASA, PAVIO, VAZIO, BLOCO, DIRECOES, NOMES_DIRECOES } from '../sim/constantes.js';
import { criarAleatorio, proximo, inteiro } from '../sim/aleatorio.js';
import { colDe, linDe, velocidadeDe } from '../sim/jogadores.js';
import { gotasAtivasDe } from '../sim/gotas.js';
import { mapaDePerigo, SEGURO } from './perigo.js';

// Quanto maior a reação, mais tempo o robô demora para notar o perigo.
export const NIVEIS = Object.freeze({
  facil: Object.freeze({ reacao: 12, chanceSoltar: 0.35, perseguir: 0.1, folga: 10 }),
  medio: Object.freeze({ reacao: 4, chanceSoltar: 0.6, perseguir: 0.35, folga: 16 }),
  dificil: Object.freeze({ reacao: 1, chanceSoltar: 0.85, perseguir: 0.7, folga: 22 }),
});

export function criarRobo(id, dificuldade, semente) {
  return {
    id,
    nivel: NIVEIS[dificuldade] || NIVEIS.facil,
    rng: criarAleatorio((semente ^ Math.imul(id + 1, 0x9e3779b1)) >>> 0),
    alvo: null, // índice da casa para onde está indo
    fugindo: false,
    proximaLeitura: 0, // tick da próxima vez que olha o perigo
    soltouAntes: false,
    recusadas: new Set(), // casas onde não deu para soltar com segurança
  };
}

function livreParaRobo(m, i, j) {
  if (m.grade[i] !== VAZIO) return false;
  const c = i % m.colunas;
  const l = Math.floor(i / m.colunas);
  const g = m.gotas.find((o) => o.col === c && o.lin === l);
  return !g || g.passantes.includes(j.id);
}

/**
 * Busca em largura a partir da casa do robô. `podeEntrar(i, ticks)` decide se
 * dá para pisar na casa chegando lá em `ticks`; devolve distâncias e pais.
 */
function buscar(m, j, podeEntrar) {
  const n = m.grade.length;
  const dist = new Int16Array(n).fill(-1);
  const pai = new Int16Array(n).fill(-1);
  const origem = linDe(j) * m.colunas + colDe(j);
  const ticksPorCasa = Math.ceil(CASA / velocidadeDe(j));
  dist[origem] = 0;
  const fila = [origem];
  for (let k = 0; k < fila.length; k++) {
    const i = fila[k];
    for (const nome of NOMES_DIRECOES) {
      const { dc, dl } = DIRECOES[nome];
      const v = i + dl * m.colunas + dc;
      if (dist[v] !== -1 || !livreParaRobo(m, v, j)) continue;
      if (!podeEntrar(v, (dist[i] + 1) * ticksPorCasa)) continue;
      dist[v] = dist[i] + 1;
      pai[v] = i;
      fila.push(v);
    }
  }
  return { dist, pai, origem, ticksPorCasa };
}

function primeiroPasso(busca, destino) {
  let i = destino;
  while (busca.pai[i] !== -1 && busca.pai[i] !== busca.origem) i = busca.pai[i];
  return i;
}

/** A casa mais próxima que satisfaz `serve`, com desempate aleatório. */
function maisProxima(r, busca, serve) {
  let melhor = -1;
  let melhorD = Infinity;
  for (let i = 0; i < busca.dist.length; i++) {
    const d = busca.dist[i];
    if (d < 0 || !serve(i)) continue;
    const dd = d + proximo(r.rng) * 0.9;
    if (dd < melhorD) { melhorD = dd; melhor = i; }
  }
  return melhor;
}

function entradaRumo(m, j, destino) {
  const e = { cima: false, baixo: false, esq: false, dir: false, bomba: false };
  const c = destino % m.colunas;
  const l = Math.floor(destino / m.colunas);
  const cj = colDe(j);
  const lj = linDe(j);
  if (c > cj) e.dir = true;
  else if (c < cj) e.esq = true;
  else if (l > lj) e.baixo = true;
  else if (l < lj) e.cima = true;
  else {
    // Já está na casa: termina de centralizar para não ficar com o pé no perigo.
    const ox = j.x - (c * CASA + MEIA_CASA);
    const oy = j.y - (l * CASA + MEIA_CASA);
    const v = velocidadeDe(j);
    if (Math.abs(ox) >= v && Math.abs(ox) >= Math.abs(oy)) { e.esq = ox > 0; e.dir = ox < 0; }
    else if (Math.abs(oy) >= v) { e.cima = oy > 0; e.baixo = oy < 0; }
  }
  return e;
}

function temBlocoVizinho(m, i) {
  return NOMES_DIRECOES.some((nome) => {
    const { dc, dl } = DIRECOES[nome];
    return m.grade[i + dl * m.colunas + dc] === BLOCO;
  });
}

function rivalNaMira(m, j) {
  const cj = colDe(j);
  const lj = linDe(j);
  return m.jogadores.some((o) => {
    if (o.id === j.id || !o.vivo) return false;
    const co = colDe(o);
    const lo = linDe(o);
    if (co !== cj && lo !== lj) return false;
    const d = Math.abs(co - cj) + Math.abs(lo - lj);
    if (d > j.alcance) return false;
    const dc = Math.sign(co - cj);
    const dl = Math.sign(lo - lj);
    for (let p = 1; p < d; p++) if (m.grade[(lj + dl * p) * m.colunas + cj + dc * p] !== VAZIO) return false;
    return true;
  });
}

/** Se soltar uma gota aqui, existe fuga a tempo? */
function temFuga(m, j, folga) {
  const hipotetica = { col: colDe(j), lin: linDe(j), alcance: j.alcance, pavio: PAVIO, passantes: [j.id] };
  const perigo = mapaDePerigo(m, [hipotetica]);
  const busca = buscar(m, j, (i, t) => perigo[i] > t + folga);
  return maisProximaSemSorte(busca, (i) => perigo[i] === SEGURO && busca.dist[i] * busca.ticksPorCasa < PAVIO - folga) >= 0;
}

function maisProximaSemSorte(busca, serve) {
  for (let i = 0; i < busca.dist.length; i++) if (busca.dist[i] >= 0 && serve(i)) return i;
  return -1;
}

/** Decide a entrada do robô para este tick. */
export function decidir(r, m) {
  const j = m.jogadores[r.id];
  const vazia = { cima: false, baixo: false, esq: false, dir: false, bomba: false };
  if (!j || !j.vivo || m.fase === 'fim') return vazia;
  const { nivel } = r;
  const aqui = linDe(j) * m.colunas + colDe(j);

  // Só "olha" o perigo de tempos em tempos (reação); no fácil isso é mais lento.
  if (m.tick >= r.proximaLeitura) {
    r.proximaLeitura = m.tick + nivel.reacao;
    const perigo = mapaDePerigo(m);
    r.perigo = perigo;
    if (perigo[aqui] !== SEGURO) {
      const busca = buscar(m, j, (i, t) => perigo[i] > t + 4);
      // Mantém o refúgio escolhido enquanto ele servir: trocar de ideia a cada
      // tick entre dois refúgios equidistantes deixaria o robô parado na gota.
      const atualServe = r.fugindo && r.alvo !== null && perigo[r.alvo] === SEGURO && busca.dist[r.alvo] >= 0;
      if (!atualServe) {
        const refugio = maisProxima(r, busca, (i) => perigo[i] === SEGURO);
        r.alvo = refugio >= 0 ? refugio : null;
      }
      r.fugindo = true;
    } else {
      r.fugindo = false;
    }
  }
  const perigo = r.perigo || mapaDePerigo(m);

  if (!r.fugindo) {
    // Soltar gota: perto de bloco ou com rival na mira, e só se houver fuga.
    const querSoltar = gotasAtivasDe(m, j.id) < j.gotas && !r.soltouAntes
      && (temBlocoVizinho(m, aqui) || (rivalNaMira(m, j) && proximo(r.rng) < nivel.perseguir * 4))
      && !r.recusadas.has(aqui);
    if (querSoltar && proximo(r.rng) < nivel.chanceSoltar) {
      if (temFuga(m, j, nivel.folga)) {
        r.soltouAntes = true;
        r.proximaLeitura = m.tick; // relê o perigo já no próximo tick
        r.alvo = null;
        return { ...vazia, bomba: true };
      }
      r.recusadas.add(aqui);
    }
    if (r.alvo === null || r.alvo === aqui || perigo[r.alvo] !== SEGURO) escolherAlvo(r, m, j, perigo);
  }
  r.soltouAntes = false;
  if (r.alvo === null || r.alvo === aqui) {
    if (r.alvo === aqui) return entradaRumo(m, j, aqui);
    return vazia;
  }

  const seguroDeAndar = r.fugindo
    ? (i, t) => perigo[i] > t + 4
    : (i) => perigo[i] === SEGURO;
  const busca = buscar(m, j, seguroDeAndar);
  if (busca.dist[r.alvo] < 0) { r.alvo = null; return entradaRumo(m, j, aqui); }
  return entradaRumo(m, j, primeiroPasso(busca, r.alvo));
}

function escolherAlvo(r, m, j, perigo) {
  const busca = buscar(m, j, (i) => perigo[i] === SEGURO);
  const aqui = busca.origem;
  r.recusadas.clear();
  const item = maisProxima(r, busca, (i) => m.itens[i] && busca.dist[i] <= 8);
  if (item >= 0) { r.alvo = item; return; }
  if (proximo(r.rng) < r.nivel.perseguir) {
    const rival = rivalMaisProximo(m, j);
    if (rival) {
      const ir = linDe(rival) * m.colunas + colDe(rival);
      const perto = maisProxima(r, busca, (i) => i !== aqui && distanciaCasas(m, i, ir) <= 2);
      if (perto >= 0) { r.alvo = perto; return; }
    }
  }
  const bloco = maisProxima(r, busca, (i) => i !== aqui && temBlocoVizinho(m, i));
  if (bloco >= 0) { r.alvo = bloco; return; }
  // Sem nada à vista: passeia por uma casa segura qualquer.
  const opcoes = [];
  for (let i = 0; i < busca.dist.length; i++) if (busca.dist[i] > 0) opcoes.push(i);
  r.alvo = opcoes.length ? opcoes[inteiro(r.rng, opcoes.length)] : null;
}

function rivalMaisProximo(m, j) {
  let melhor = null;
  let melhorD = Infinity;
  for (const o of m.jogadores) {
    if (o.id === j.id || !o.vivo) continue;
    const d = Math.abs(o.x - j.x) + Math.abs(o.y - j.y);
    if (d < melhorD) { melhorD = d; melhor = o; }
  }
  return melhor;
}

function distanciaCasas(m, a, b) {
  return Math.abs((a % m.colunas) - (b % m.colunas)) + Math.abs(Math.floor(a / m.colunas) - Math.floor(b / m.colunas));
}
