// Perfil "criança" escrito FORA da IA do jogo (não usa nada de js/ia/): um
// jogador ingênuo que só enxerga o que a tela mostra e segue regras simples,
// como uma criança de 6 anos que acabou de aprender:
//  - foge da cruz que VÊ: a prévia listrada aparece nos últimos 2 s do pavio; a
//    própria gota ela sabe que é perigosa desde que soltou; respingo na hora;
//    andando, não passa na frente de gota nenhuma que esteja no chão;
//  - foge pelo caminho mais curto até uma casa fora das cruzes vistas, sem
//    pensar em tempo nem em cadeia;
//  - do aperto final só entende a casa marcada no chão (a próxima peça); não
//    antecipa que a parede continua fechando;
//  - solta uma gota de cada vez, encostada em bloco ou com rival por perto,
//    conferindo se há esquina para se esconder (às vezes nem isso: distração);
//  - reage com atraso (decide a cada ~0,25 s) e às vezes erra a direção;
//  - pega todo item que vê (inclusive o Cisco) e não usa bichinho nem Pinça.
// Serve para medir se uma criança de verdade ganha do Fácil (seção 3.3).

import { VAZIO, BLOCO, CASA, DIRECOES, NOMES_DIRECOES } from '../../bomberolho/js/sim/constantes.js';
import { colDe, linDe } from '../../bomberolho/js/sim/jogadores.js';
import { criarAleatorio, proximo } from '../../bomberolho/js/sim/aleatorio.js';
import { proximaQueda } from '../../bomberolho/js/sim/aperto.js';

export const PERFIL_CRIANCA = Object.freeze({
  pensar: 15, // ticks entre decisões (0,25 s)
  distracao: 0.05, // chance de soltar gota sem conferir a saída
  engano: 0.06, // chance de, numa decisão, ir para um lado qualquer
  vontadeDeAtacar: 0.35, // rival a até 2 casas na mesma linha/coluna
  previa: 120, // ticks finais do pavio em que a cruz aparece no chão
});

const VAZIA = Object.freeze({ cima: false, baixo: false, esq: false, dir: false, bomba: false, acao: false });

export function criarCrianca(id, semente, perfil = PERFIL_CRIANCA) {
  return { id, perfil, rng: criarAleatorio((semente ^ 0xC71A) >>> 0), proxima: 0, dir: null, refugio: null, alvo: null, mundo: null };
}

const idx = (m, c, l) => l * m.colunas + c;
const gotaNa = (m, c, l) => m.gotas.some((g) => g.estado === 'chao' && g.col === c && g.lin === l);

/** Casas que a criança enxerga como perigosas agora. */
function perigosas(m, id, perfil) {
  const p = new Uint8Array(m.grade.length);
  const cruz = (col, lin, alcance) => {
    p[idx(m, col, lin)] = 1;
    for (const nome of NOMES_DIRECOES) {
      const { dc, dl } = DIRECOES[nome];
      for (let k = 1; k <= alcance; k++) {
        const t = m.grade[idx(m, col + dc * k, lin + dl * k)];
        if (t !== VAZIO) break;
        p[idx(m, col + dc * k, lin + dl * k)] = 1;
      }
    }
  };
  for (const g of m.gotas) {
    if (g.estado !== 'chao') continue;
    if (g.dono === id || g.pavio <= perfil.previa) cruz(g.col, g.lin, g.alcance);
  }
  // Respingo na tela: o braço "cresce" no desenho; ela foge da cruz inteira e
  // nunca corre por dentro dela (`molhado`).
  const antes = p.slice();
  for (const r of m.respingos) cruz(r.col, r.lin, Math.max(2, ...Object.values(r.bracos)));
  const molhado = p.map((v, i) => (v && !antes[i] ? 1 : 0));
  const q = proximaQueda(m);
  if (q >= 0) p[q] = 1;
  // Para ANDAR ela evita também a cruz das gotas alheias ainda sem prévia (vê a
  // gota no chão e não passa na frente dela); para FUGIR, só a prévia conta.
  const evitar = p.slice();
  const antes2 = p.slice();
  for (const g of m.gotas) if (g.estado === 'chao' && g.dono !== id && g.pavio > perfil.previa) cruz(g.col, g.lin, g.alcance);
  for (let i = 0; i < p.length; i++) { evitar[i] = p[i]; p[i] = antes2[i]; }
  return { p, molhado, evitar };
}

let ultimoAlvo = -1; // casa achada pela última busca (o refúgio escolhido)

/** Busca em largura até a primeira casa que satisfaz `objetivo`; devolve a direção do 1º passo. */
function rumo(m, origem, objetivo, evitar) {
  const n = m.grade.length;
  const pai = new Int16Array(n).fill(-1);
  const dirDe = new Array(n);
  const fila = [origem];
  pai[origem] = origem;
  for (let k = 0; k < fila.length; k++) {
    const i = fila[k];
    if (i !== origem && objetivo(i)) {
      let c = i;
      while (pai[c] !== origem) c = pai[c];
      ultimoAlvo = i;
      return dirDe[c];
    }
    for (const nome of NOMES_DIRECOES) {
      const { dc, dl } = DIRECOES[nome];
      const v = i + dl * m.colunas + dc;
      if (pai[v] !== -1 || m.grade[v] !== VAZIO || gotaNa(m, v % m.colunas, Math.floor(v / m.colunas))) continue;
      if (evitar && evitar[v]) continue;
      pai[v] = i;
      dirDe[v] = nome;
      fila.push(v);
    }
  }
  return null;
}

/** Há uma casa que satisfaz `ok` a até `passos` casas, andando por casas livres e sem perigo à vista? */
function escondeEm(m, origem, ok, passos, perigo) {
  const dist = new Int8Array(m.grade.length).fill(-1);
  dist[origem] = 0;
  const fila = [origem];
  for (let k = 0; k < fila.length; k++) {
    const i = fila[k];
    if (i !== origem && ok(i)) return true;
    if (dist[i] >= passos) continue;
    for (const nome of NOMES_DIRECOES) {
      const v = i + DIRECOES[nome].dl * m.colunas + DIRECOES[nome].dc;
      if (dist[v] !== -1 || m.grade[v] !== VAZIO || perigo[v] || gotaNa(m, v % m.colunas, Math.floor(v / m.colunas))) continue;
      dist[v] = dist[i] + 1;
      fila.push(v);
    }
  }
  return false;
}

function encostadoEmBloco(m, c, l) {
  return NOMES_DIRECOES.some((nome) => m.grade[idx(m, c + DIRECOES[nome].dc, l + DIRECOES[nome].dl)] === BLOCO);
}

function rivalNaMira(m, j, c, l) {
  return m.jogadores.some((o) => o.vivo && o.id !== j.id
    && ((colDe(o) === c && Math.abs(linDe(o) - l) <= 2) || (linDe(o) === l && Math.abs(colDe(o) - c) <= 2)));
}

/** Entrada da criança para este tick. */
export function decidirCrianca(cr, m) {
  const j = m.jogadores[cr.id];
  if (cr.mundo !== m) {
    cr.mundo = m;
    cr.proxima = 0;
    cr.dir = null;
    cr.refugio = null;
    cr.alvo = null;
  }
  if (!j.vivo || m.fase !== 'jogando') return VAZIA;
  const perfil = cr.perfil;
  if (m.tick < cr.proxima) return cr.dir ? { ...VAZIA, [cr.dir]: true } : VAZIA;
  cr.proxima = m.tick + perfil.pensar;
  const c = colDe(j);
  const l = linDe(j);
  const aqui = idx(m, c, l);
  const { p: perigo, molhado, evitar } = perigosas(m, j.id, perfil);

  if (!perigo[aqui]) cr.refugio = null;
  if (perigo[aqui]) {
    // Corre para a casa sem perigo mais perto (ignora o tempo). Notar o perigo
    // demora; já correndo, ela vai virando o dedo sem parar.
    cr.proxima = m.tick + 3;
    // Escolhe um esconderijo e vai até ele (sem trocar de ideia no caminho).
    let dir = null;
    if (cr.refugio !== null && !perigo[cr.refugio]) dir = rumo(m, aqui, (i) => i === cr.refugio, molhado);
    if (!dir) {
      // Prefere esconderijo longe de qualquer gota no chão; senão, o primeiro sem prévia.
      dir = rumo(m, aqui, (i) => !evitar[i], perigo) ?? rumo(m, aqui, (i) => !evitar[i], molhado)
        ?? rumo(m, aqui, (i) => !perigo[i], perigo) ?? rumo(m, aqui, (i) => !perigo[i], molhado) ?? rumo(m, aqui, (i) => !perigo[i], null);
      cr.refugio = dir ? ultimoAlvo : null;
    }
    cr.dir = dir ?? NOMES_DIRECOES[Math.floor(proximo(cr.rng) * 4)];
    return { ...VAZIA, [cr.dir]: true };
  }
  if (proximo(cr.rng) < perfil.engano) {
    // Mexe o dedo para um lado qualquer — mas não para dentro do respingo que está vendo.
    const lados = NOMES_DIRECOES.filter((n) => {
      const v = aqui + DIRECOES[n].dl * m.colunas + DIRECOES[n].dc;
      return m.grade[v] === VAZIO && !evitar[v];
    });
    if (lados.length) {
      cr.dir = lados[Math.floor(proximo(cr.rng) * lados.length)];
      return { ...VAZIA, [cr.dir]: true };
    }
  }
  const minhas = m.gotas.filter((g) => g.dono === j.id).length;
  // Centralizada o bastante para a gota cair onde ela está.
  const centrada = Math.abs(j.x - (c * CASA + CASA / 2)) < 250 && Math.abs(j.y - (l * CASA + CASA / 2)) < 250;
  // Uma de cada vez: solta, se esconde e espera estourar (com mais gotas no
  // estoque ela não fica mais esperta, só mais confusa).
  if (minhas === 0 && centrada && !gotaNa(m, c, l)) {
    const quer = encostadoEmBloco(m, c, l) || (rivalNaMira(m, j, c, l) && proximo(cr.rng) < perfil.vontadeDeAtacar);
    if (quer) {
      // A regra que o "Como jogar" ensina: soltar e se esconder na esquina —
      // ela confere se há, a poucos passos, uma casa fora da cruz da gota.
      const cruz = new Uint8Array(m.grade.length);
      cruz[aqui] = 1;
      for (const nome of NOMES_DIRECOES) {
        const { dc, dl } = DIRECOES[nome];
        for (let k = 1; k <= j.alcance; k++) {
          const v = idx(m, c + dc * k, l + dl * k);
          if (m.grade[v] !== VAZIO) break;
          cruz[v] = 1;
        }
      }
      const livre = escondeEm(m, aqui, (i) => !cruz[i], 4, perigo);
      if (livre || proximo(cr.rng) < perfil.distracao) {
        cr.dir = null;
        cr.proxima = m.tick + 4; // soltou: já sabe que tem de correr
        return { ...VAZIA, bomba: true };
      }
    }
  }
  // Anda: item à vista, senão um bloco para abrir, senão perto de alguém.
  const item = (i) => !!m.itens[i];
  const bloco = (i) => encostadoEmBloco(m, i % m.colunas, Math.floor(i / m.colunas));
  const rival = (i) => m.jogadores.some((o) => o.vivo && o.id !== j.id && idx(m, colDe(o), linDe(o)) === i);
  // Mantém o alvo escolhido enquanto ele continuar valendo (não fica indo e voltando).
  const vale = (i) => i !== aqui && !evitar[i] && (item(i) || bloco(i));
  cr.dir = null;
  if (cr.alvo !== null && vale(cr.alvo)) cr.dir = rumo(m, aqui, (i) => i === cr.alvo, evitar);
  if (!cr.dir) {
    cr.dir = rumo(m, aqui, item, evitar) ?? rumo(m, aqui, bloco, evitar);
    cr.alvo = cr.dir ? ultimoAlvo : null;
    cr.dir ??= rumo(m, aqui, rival, evitar);
  }
  if (cr.dir) return { ...VAZIA, [cr.dir]: true };
  // Sem aonde ir: termina de entrar na casa onde está (não fica com o pé na vizinha).
  const ox = j.x - (c * CASA + CASA / 2);
  const oy = j.y - (l * CASA + CASA / 2);
  if (Math.abs(ox) > 80) return { ...VAZIA, [ox > 0 ? 'esq' : 'dir']: true };
  if (Math.abs(oy) > 80) return { ...VAZIA, [oy > 0 ? 'cima' : 'baixo']: true };
  return VAZIA;
}
