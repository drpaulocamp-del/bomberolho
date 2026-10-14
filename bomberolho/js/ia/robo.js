// Robôs em três níveis. Todos seguem as mesmas regras do humano e leem só o
// que está na tela (nunca os itens escondidos). A cada tick:
//  1. se a casa onde estão vai ficar molhada (ou vai receber peça do aperto),
//     FOGEM pelo planejador com tempo (caminhos.js); sem fuga a pé, tentam o
//     bichinho ou a Pinça;
//  2. senão, AGEM: táticas (chute, arremesso), ataque, abrir blocos, pegar
//     itens ou passear — nunca ficam parados sem motivo.
// Os níveis mudam a folga de segurança, a reação, a vontade de atacar, a
// leitura de armadilhas e o uso dos itens avançados (ver NIVEIS).

import { CASA, MEIA_CASA, VAZIO, BLOCO, DIRECOES, NOMES_DIRECOES, LIMITES } from '../sim/constantes.js';
import { criarAleatorio, proximo } from '../sim/aleatorio.js';
import { colDe, linDe, velocidadeDe } from '../sim/jogadores.js';
import { gotaEm, gotasAtivasDe, alcanceAoSoltar } from '../sim/gotas.js';
import { analisar, alcanceDaGota, SEGURO } from './perigo.js';
import {
  vizinhos, casasComGota, buscar, buscarSeguro, primeiroPasso, planejarFuga, casaDe, distancia, passavel, ticksPorCasa, apertoDaFuga,
} from './caminhos.js';
import * as T from './taticas.js';

const S = 60; // ticks por segundo

export const NIVEIS = Object.freeze({
  // Fácil: anda, abre blocos, pega tudo (até Cisco), demora a notar gotas
  // alheias, enxerga pouco à frente na fuga, só ataca depois de 20 s e quase
  // nunca persegue. Às vezes se atrapalha sozinho.
  facil: Object.freeze({
    margem: 0, reacao: 30, alcanceVisto: 2, semCadeia: true, camadas: 6, calma: 20 * S, perseguir: 0.05, perseguirFinal: 0.2, atacar: 0.3, atacaNaFuga: 0, atacaNoFim: false, armadilha: false, emboscada: 0, erro: 0.1,
    usaTatica: 0.12, usaPoder: 0.35, evitaCisco: false, duasSaidas: false, pensar: 12, notaMinimaTatica: 3, pausaEntreGotas: 70,
  }),
  // Médio: foge bem, ataca quem está na mira e encurrala de vez em quando.
  // (Rodada 2: menos vontade de atacar — o salto do Fácil para o Médio era
  // grande demais para crianças, e o Médio vencia o Difícil.)
  medio: Object.freeze({
    margem: 2, reacao: 18, alcanceVisto: 0, semCadeia: false, camadas: 8, calma: 12 * S, perseguir: 0.08, perseguirFinal: 0.35, atacar: 0.3, atacaNaFuga: 0, atacaNoFim: true, armadilha: false, emboscada: 0, erro: 0,
    usaTatica: 0.25, usaPoder: 0.85, evitaCisco: true, duasSaidas: true, pensar: 6, notaMinimaTatica: 2, pausaEntreGotas: 15,
  }),
  // Difícil: lê o perigo com antecedência, monta armadilhas (cadeia incluída),
  // usa chute, Pinça e bichinhos sempre que valem a pena; quase nunca se molha.
  dificil: Object.freeze({
    margem: 4, cautelaFinal: true, reacao: 0, alcanceVisto: 0, semCadeia: false, camadas: 16, calma: 3 * S, perseguir: 0.6, perseguirFinal: 0.95, atacar: 0.95, atacaNaFuga: 0.6, atacaNoFim: true, armadilha: true, emboscada: 15, erro: 0,
    usaTatica: 1, usaPoder: 1, evitaCisco: true, duasSaidas: true, pensar: 4, notaMinimaTatica: 2, pausaEntreGotas: 0,
  }),
});

/** `dificuldade`: 'facil' | 'medio' | 'dificil' ou um objeto de nível (simulações). */
export function criarRobo(id, dificuldade, semente) {
  return {
    id,
    nivel: typeof dificuldade === 'object' && dificuldade ? dificuldade : NIVEIS[dificuldade] || NIVEIS.facil,
    rng: criarAleatorio((semente ^ Math.imul(id + 1, 0x9e3779b1)) >>> 0),
    alvo: null, // casa para onde está indo
    motivo: null, // 'item' | 'bloco' | 'ataque' | 'passeio'
    refugio: null, // casa segura escolhida na fuga
    recusadas: {}, // casa → tick até quando não vale tentar soltar ali de novo
    proximaEmboscada: 0,
    roteiro: [], // entradas já decididas para os próximos ticks
    proximoPensar: 0,
    ultimaGota: -1000,
    contas: { gotas: 0, ataques: 0, blocos: 0, taticas: 0, chutes: 0, poderes: 0, fugasDeEmergencia: 0 }, // para as simulações em lote
  };
}

const VAZIA = Object.freeze(T.entrada());

/** Decide a entrada do robô para este tick. */
export function decidir(r, m) {
  const j = m.jogadores[r.id];
  if (!j || !j.vivo || m.fase === 'fim' || m.fase === 'contagem') {
    r.roteiro = [];
    return VAZIA;
  }
  if (r.roteiro.length) return r.roteiro.shift();
  if (j.salto) return VAZIA;
  const n = r.nivel;
  const an = n.reacao || n.alcanceVisto || n.semCadeia
    ? analisar(m, [], { reacao: n.reacao, quem: j.id, alcanceVisto: n.alcanceVisto, semCadeia: n.semCadeia })
    : analisar(m);
  const aqui = casaDe(m, j);
  if (j.disparada) {
    // Segura a arrancada até sair do perigo.
    return an.primeiro[aqui] === SEGURO ? VAZIA : T.entrada({ [j.disparada.dir]: true, acao: true });
  }
  if (j.segurando !== null) return VAZIA; // soltar o botão arremessa
  const ocupada = casasComGota(m, j);
  if (an.primeiro[aqui] !== SEGURO) {
    // Colado numa gota (a própria, recém-solta, ou a de um rival): chutá-la
    // contra alguém vale mais que só fugir — e o chute já confere a fuga.
    if (j.chute && tempoDeJogo(m) >= n.calma && proximo(r.rng) < n.usaTatica) {
      const t = T.taticaChute(m, j, n);
      if (t) {
        r.contas.taticas++;
        r.contas.chutes++;
        r.alvo = null;
        return sequencia(r, t);
      }
    }
    // Fugindo, o Cisco não é obstáculo: um azar passageiro é melhor que se molhar.
    return fugir(r, m, j, an, ocupada);
  }
  r.refugio = null;
  if (n.evitaCisco) for (let i = 0; i < m.itens.length; i++) if (m.itens[i] === 'cisco') ocupada[i] = 1;
  return agir(r, m, j, an, ocupada);
}

function sequencia(r, lista) {
  if (lista.some((e) => e.acao)) r.contas.poderes++;
  r.roteiro = lista.slice(1);
  return lista[0];
}

/** Direção do passo até uma casa vizinha (ou centralizar, se já está nela). */
function irPara(m, j, destino) {
  const aqui = casaDe(m, j);
  if (destino === undefined || destino === null || destino === aqui) return centralizar(m, j);
  for (const [v, dir] of vizinhos(m, aqui)) if (v === destino) return T.entrada({ [dir]: true });
  return centralizar(m, j);
}

/** Já está na casa certa: termina de centralizar para não ficar com o pé no perigo. */
function centralizar(m, j) {
  const ox = j.x - (colDe(j) * CASA + MEIA_CASA);
  const oy = j.y - (linDe(j) * CASA + MEIA_CASA);
  const v = velocidadeDe(j, m.ajuste);
  if (Math.abs(ox) >= v && Math.abs(ox) >= Math.abs(oy)) return T.entrada({ esq: ox > 0, dir: ox < 0 });
  if (Math.abs(oy) >= v) return T.entrada({ cima: oy > 0, baixo: oy < 0 });
  return VAZIA;
}

/** Refúgio: entre as casas seguras mais próximas, a mais aberta (menos chance de ser encurralado). */
function escolherRefugio(r, m, ocupada, lista) {
  let melhor = lista[0];
  let melhorNota = -Infinity;
  for (const c of lista) {
    let livres = 0;
    for (const [v] of vizinhos(m, c)) if (passavel(m, v, ocupada)) livres++;
    const nota = livres + proximo(r.rng) * (r.nivel.margem < 4 ? 3 : 0.5);
    if (nota > melhorNota) { melhorNota = nota; melhor = c; }
  }
  return melhor;
}

function fugir(r, m, j, an, ocupada) {
  const n = r.nivel;
  r.alvo = null;
  const origemBloqueada = !!gotaEm(m, colDe(j), linDe(j));
  const escolher = (lista) => escolherRefugio(r, m, ocupada, lista);
  const plano = planejarFuga(m, j, an, ocupada, { margem: n.margem, camadas: n.camadas, origemBloqueada, escolher, alvo: r.refugio });
  r.refugio = plano.ok ? plano.destino : null;
  if (n.atacaNoFim && apostaFinal(m) && gotasAtivasDe(m, j.id) < j.gotas && !gotaEm(m, colDe(j), linDe(j))
    && notaDoAtaque(m, j, casaDe(m, j), true) >= 2) return soltar(r, m, 'ataques');
  if (plano.ok) {
    // Fugindo com folga e com gota sobrando: uma segunda gota pode fechar a
    // saída de um rival (é assim que se encurrala de verdade).
    if (n.atacaNaFuga && an.primeiro[casaDe(m, j)] > 50 && tempoDeJogo(m) >= n.calma
      && proximo(r.rng) < n.atacaNaFuga && querAtacarDaqui(r, m, j, false, 2) && podeSoltar(r, m, j)) {
      return soltar(r, m, 'ataques');
    }
    if (proximo(r.rng) < n.usaPoder) {
      const a = T.arrancadaNaFuga(m, j, an, plano.caminho);
      if (a) return sequencia(r, a);
    }
    return irPara(m, j, plano.caminho[1]);
  }
  // Sem fuga a pé com folga: bichinho, Pinça, ou fuga com folga zero.
  if (proximo(r.rng) < n.usaPoder) {
    const b = T.fugaComBichinho(m, j, an, n.margem);
    if (b) {
      r.contas.fugasDeEmergencia++;
      return sequencia(r, b);
    }
  }
  if (proximo(r.rng) < Math.max(n.usaTatica, 0.5)) {
    const p = T.fugaComPinca(m, j, n.margem) || T.fugaComChute(m, j, n.margem);
    if (p) {
      r.contas.fugasDeEmergencia++;
      return sequencia(r, p);
    }
  }
  const justo = planejarFuga(m, j, an, ocupada, { margem: 0, camadas: n.camadas, origemBloqueada, escolher });
  return irPara(m, j, (justo.ok ? justo : plano).caminho[1]);
}

function tempoDeJogo(m) {
  return m.tempoRestante === null ? m.tick : m.ajuste.duracaoRodada - m.tempoRestante;
}

function agir(r, m, j, an, ocupada) {
  const n = r.nivel;
  const aqui = casaDe(m, j);
  const podeAtacar = tempoDeJogo(m) >= n.calma;
  // Últimos segundos: com o relógio quase no fim (empate certo), uma gota que
  // estoura antes do 0:00 e encurrala alguém só pode melhorar o resultado.
  if (n.atacaNoFim && apostaFinal(m) && gotasAtivasDe(m, j.id) < j.gotas && notaDoAtaque(m, j, aqui, true) >= 2) return soltar(r, m, 'ataques');
  if (m.tick >= r.proximoPensar) {
    r.proximoPensar = m.tick + n.pensar;
    if (podeAtacar && proximo(r.rng) < n.usaTatica) {
      const t = T.taticaPinca(m, j, n) || T.taticaChute(m, j, n);
      if (t) {
        r.contas.taticas++;
        return sequencia(r, t);
      }
    }
    if (podeAtacar && querAtacarDaqui(r, m, j) && podeSoltar(r, m, j)) return soltar(r, m, 'ataques');
    const alvoRuim = r.alvo === null || (r.motivo !== 'chute' && an.primeiro[r.alvo] !== SEGURO) || (r.motivo === 'item' && !m.itens[r.alvo]);
    if (alvoRuim) escolherAlvo(r, m, j, an, ocupada, podeAtacar);
  }
  if (r.alvo === aqui) {
    const motivo = r.motivo;
    r.alvo = null;
    if (motivo === 'bloco' && valorDeBlocos(m, j, aqui, blocosJaAlvo(m, an)) > 0) {
      if (podeSoltar(r, m, j)) return soltar(r, m, 'blocos');
      r.recusadas[aqui] = m.tick + 90; // agora não dá: tenta outro ponto
    }
    if (motivo === 'ataque' && podeAtacar && querAtacarDaqui(r, m, j, true) && podeSoltar(r, m, j)) return soltar(r, m, 'ataques');
    escolherAlvo(r, m, j, an, ocupada, podeAtacar);
  }
  if (r.alvo === null) escolherAlvo(r, m, j, an, ocupada, podeAtacar);
  if (r.alvo === null) return centralizar(m, j);
  const busca = r.motivo === 'chute' ? buscarParaChute(m, j, an, ocupada) : buscarSeguro(m, j, an, ocupada);
  if (busca.dist[r.alvo] < 0) {
    r.alvo = null;
    return centralizar(m, j);
  }
  if (proximo(r.rng) < n.usaPoder * 0.25) {
    const alvo = r.alvo;
    const a = T.atalhoDoSaltinho(m, j, (i) => distanciaPorCaminho(m, j, an, ocupada, i, alvo));
    if (a) return sequencia(r, a);
  }
  return irPara(m, j, primeiroPasso(busca, r.alvo));
}

/**
 * Caminho até o ponto de chute: além das casas sem perigo, aceita casas cujo
 * perigo só começa bem depois de ele passar (a casa colada à gota está na cruz
 * dela, mas o chute a leva embora antes).
 */
function buscarParaChute(m, j, an, ocupada) {
  const T = ticksPorCasa(m, j);
  return buscar(m, j, ocupada, (i, d) => an.primeiro[i] === SEGURO || an.primeiro[i] > d * T + 40);
}

function distanciaPorCaminho(m, j, an, ocupada, de, ate) {
  if (de === ate) return 0;
  // Busca a partir de `de` só por casas sem perigo.
  const falso = { ...j, x: (de % m.colunas) * CASA + MEIA_CASA, y: Math.floor(de / m.colunas) * CASA + MEIA_CASA };
  return buscarSeguro(m, falso, an, ocupada).dist[ate];
}

function soltar(r, m, motivo) {
  r.contas.gotas++;
  if (motivo) r.contas[motivo]++;
  r.ultimaGota = m.tick;
  r.alvo = null;
  r.proximoPensar = m.tick + 2;
  return T.entrada({ bomba: true });
}

function gotaHipotetica(m, j) {
  const col = colDe(j);
  const lin = linDe(j);
  return { col, lin, pavio: m.ajuste.pavio, alcance: alcanceAoSoltar(m, j, col, lin), penetrante: j.penetrante };
}

/** Dá para soltar uma gota aqui e ainda fugir dela (com a folga do nível)? */
function podeSoltar(r, m, j) {
  const n = r.nivel;
  if (gotasAtivasDe(m, j.id) >= j.gotas || m.tick - r.ultimaGota < n.pausaEntreGotas) return false;
  if (m.grade[linDe(j) * m.colunas + colDe(j)] !== VAZIO || gotaEm(m, colDe(j), linDe(j))) return false;
  const hip = gotaHipotetica(m, j);
  if (n.erro && tempoDeJogo(m) >= n.calma && proximo(r.rng) < n.erro) {
    // Distração do nível fácil: só confere se há alguma casa livre ao lado.
    return vizinhos(m, casaDe(m, j)).some(([v]) => passavel(m, v, casasComGota(m, j)));
  }
  const an = analisar(m, [hip]);
  // Antes da hora de atacar (a "calma" do nível), nem para abrir bloco ele
  // solta uma gota cuja cruz pegue um rival: é a segurança da largada (3.2).
  if (tempoDeJogo(m) < n.calma) {
    const cruz = alcanceDaGota(m, hip, an.ocupadas);
    if (m.jogadores.some((o) => o.vivo && o !== j && cruz.includes(casaDe(m, o)))) return false;
  }
  const ocupada = casasComGota(m, j, [hip]);
  const plano = planejarFuga(m, j, an, ocupada, { margem: margemParaSoltar(m, n), camadas: n.camadas, origemBloqueada: true });
  if (!plano.ok) return false;
  if (n.duasSaidas && (cauteloso(m, n) || !faseFinal(m)) && rivalPerto(m, j, 5) && plano.seguras.length < 2) return false;
  return true;
}

/** Aperto final avançado ou só dois de pé: os robôs ficam mais ousados. */
function faseFinal(m) {
  const a = m.aperto;
  if (a && a.ativo && a.seq && a.indice > a.seq.length * 0.4) return true;
  return m.jogadores.filter((o) => o.vivo).length === 2;
}

/**
 * Cautela do Difícil na fase final: enquanto o aperto ainda cai e há mais de
 * dois de pé, não aceita fugas justas (era ali que ele mais se molhava
 * sozinho). No duelo, ou com a arena já fechada, arrisca como os outros.
 */
function cauteloso(m, n) {
  if (!n.cautelaFinal) return false;
  const a = m.aperto;
  const fechada = a && a.ativo && a.seq && a.indice >= a.seq.length;
  return !fechada && m.jogadores.filter((o) => o.vivo).length > 2;
}

/** Janela da aposta final: a gota solta agora estoura antes de o relógio zerar, por pouco. */
function apostaFinal(m) {
  if (m.tempoRestante === null || m.fase !== 'jogando') return false;
  const p = m.ajuste.pavio;
  return m.tempoRestante > p + 5 && m.tempoRestante <= p + 150;
}

/** Folga exigida para soltar: na fase final, até o Difícil aceita fugas justas. */
function margemParaSoltar(m, n) {
  return faseFinal(m) && !cauteloso(m, n) ? Math.min(n.margem, 3) : n.margem;
}

function rivalPerto(m, j, d) {
  const aqui = casaDe(m, j);
  return m.jogadores.some((o) => o.vivo && o !== j && distancia(m, casaDe(m, o), aqui) <= d);
}

/**
 * Uma gota aqui ameaça algum rival? Nota 3 = ele não teria fuga, 2 = fuga
 * apertada, 1 = está na cruz mas foge. Decide conforme o nível.
 */
function querAtacarDaqui(r, m, j, chegouNoPonto = false, notaMinima = 1) {
  const n = r.nivel;
  if (gotasAtivasDe(m, j.id) >= j.gotas) return false;
  const nota = notaDoAtaque(m, j, casaDe(m, j), n.armadilha);
  if (nota < notaMinima || nota === 0) return false;
  let chance = nota === 3 ? n.atacar : nota === 2 ? n.atacar * 0.8 : n.atacar * (chegouNoPonto ? 0.6 : 0.3);
  if (faseFinal(m)) chance = Math.min(1, chance * 1.6); // arena encolhendo: hora de arriscar
  return proximo(r.rng) < chance;
}

/**
 * Quanto uma gota solta na casa `i` aperta os rivais (com eles parados onde
 * estão): 3 = algum fica sem fuga, 2 = fuga apertada, 1 = na cruz mas foge.
 * Com `armadilha`, conta também quem não está na cruz mas fica encurralado
 * (cadeias e corredores fechados).
 */
function notaDoAtaque(m, j, i, armadilha) {
  const falso = { ...j, x: (i % m.colunas) * CASA + MEIA_CASA, y: Math.floor(i / m.colunas) * CASA + MEIA_CASA };
  const hip = gotaHipotetica(m, falso);
  const perto = m.jogadores.filter((o) => o.vivo && o !== j && distancia(m, casaDe(m, o), i) <= hip.alcance + 2);
  if (!perto.length) return 0;
  const an = analisar(m, [hip]);
  const cruz = alcanceDaGota(m, hip, an.ocupadas);
  let nota = 0;
  for (const o of perto) {
    const naCruz = cruz.includes(casaDe(m, o));
    if (!naCruz && !armadilha) continue;
    // Fora da cruz só conta se a gota o alcança de outro jeito (cadeia): quem
    // não corre perigo nenhum também tem "poucas casas seguras" na conta da
    // fuga — e antes isso virava nota 2, gota gasta à toa.
    if (!naCruz && an.primeiro[casaDe(m, o)] === SEGURO) continue;
    const v = apertoDaFuga(m, o, an, casasComGota(m, o, [hip]), naCruz);
    if (v > nota) nota = v;
  }
  return nota;
}

/**
 * Emboscada (Difícil): procura, perto dos rivais, a casa de onde uma gota
 * deixaria alguém sem saída (ou quase) e de onde o próprio robô ainda foge.
 */
function procurarEmboscada(r, m, j, busca) {
  const n = r.nivel;
  const rivais = m.jogadores.filter((o) => o.vivo && o !== j).map((o) => casaDe(m, o));
  const candidatas = busca.fila
    .filter((i) => busca.dist[i] <= 7 && rivais.some((ir) => distancia(m, i, ir) <= Math.min(j.alcance, 4) + 1))
    .sort((a, b) => busca.dist[a] - busca.dist[b])
    .slice(0, 10);
  let melhor = null;
  for (const i of candidatas) {
    const nota = notaDoAtaque(m, j, i, true);
    if (nota < 2) continue;
    const valor = nota * 15 - busca.dist[i] * 2;
    if (melhor && valor <= melhor.valor) continue;
    if (!fugaPossivelEm(m, j, i, n)) continue;
    melhor = { i, valor };
  }
  return melhor;
}

/** Blocos que as gotas já no chão vão quebrar (não vale a pena mirar neles de novo). */
function blocosJaAlvo(m, an) {
  const alvo = new Set();
  for (const g of an.gotas) {
    for (const nome of NOMES_DIRECOES) {
      const { dc, dl } = DIRECOES[nome];
      for (let p = 1; p <= g.alcance; p++) {
        const i = (g.lin + dl * p) * m.colunas + g.col + dc * p;
        if (m.grade[i] === BLOCO) { alvo.add(i); if (!g.penetrante) break; } else if (m.grade[i] !== VAZIO) break;
      }
    }
  }
  return alvo;
}

/** Quantos blocos uma gota solta em `i` quebraria (todos no alcance, se penetrante). */
function valorDeBlocos(m, j, i, jaAlvo) {
  const col = i % m.colunas;
  const lin = Math.floor(i / m.colunas);
  const alcance = alcanceAoSoltar(m, j, col, lin);
  let v = 0;
  for (const nome of NOMES_DIRECOES) {
    const { dc, dl } = DIRECOES[nome];
    for (let p = 1; p <= alcance; p++) {
      const k = (lin + dl * p) * m.colunas + col + dc * p;
      const t = m.grade[k];
      if (t === BLOCO) {
        if (!jaAlvo.has(k)) v++;
        if (!j.penetrante) break;
      } else if (t !== VAZIO) break;
    }
  }
  return v;
}

/** Quanto cada item vale para o robô agora (negativo = evita). */
function valorDoItem(n, j, tipo) {
  switch (tipo) {
    case 'gota': return j.gotas < 5 ? 6 : 2;
    case 'alcance': return j.alcance < 6 ? 6 : 2;
    case 'velocidade': return j.velocidade < 3 ? 5 : 1;
    case 'superLupa': return j.alcance < LIMITES.alcance ? 9 : 1;
    case 'penetrante': return j.penetrante ? 1 : 8;
    case 'chute': return j.chute ? 1 : 6;
    case 'pinca': return j.pinca ? 1 : 6;
    case 'estojo': return j.montaria ? 3 : 9;
    case 'cisco': return n.evitaCisco ? -1 : 3;
    default: return 1;
  }
}

/** Haveria fuga se soltasse uma gota na casa `i` (como se já estivesse lá)? */
function fugaPossivelEm(m, j, i, n) {
  const falso = { ...j, x: (i % m.colunas) * CASA + MEIA_CASA, y: Math.floor(i / m.colunas) * CASA + MEIA_CASA };
  const hip = gotaHipotetica(m, falso);
  const an = analisar(m, [hip]);
  return planejarFuga(m, falso, an, casasComGota(m, j, [hip]), { margem: margemParaSoltar(m, n), camadas: n.camadas, origemBloqueada: true }).ok;
}

function escolherAlvo(r, m, j, an, ocupada, podeAtacar) {
  const n = r.nivel;
  const busca = buscarSeguro(m, j, an, ocupada);
  const aqui = busca.origem;
  let melhor = null;
  let melhorNota = -Infinity;
  const blocos = [];
  const considerar = (i, nota, motivo) => {
    if (r.recusadas[i] > m.tick) return;
    const v = nota + proximo(r.rng) * 3;
    if (motivo === 'bloco') { blocos.push({ i, v }); return; }
    if (v > melhorNota) { melhorNota = v; melhor = { i, motivo }; }
  };
  for (const i of busca.fila) {
    const tipo = m.itens[i];
    if (!tipo) continue;
    const valor = valorDoItem(n, j, tipo);
    if (valor > 0 && busca.dist[i] <= 12) considerar(i, valor * 10 - busca.dist[i] * 4, 'item');
  }
  const jaAlvo = blocosJaAlvo(m, an);
  for (const i of busca.fila) {
    if (busca.dist[i] > 14) continue;
    const v = valorDeBlocos(m, j, i, jaAlvo);
    if (v > 0) considerar(i, v * 9 - busca.dist[i] * 3 + (i === aqui ? 2 : 0), 'bloco');
  }
  // Blocos: só os pontos de onde dá para soltar e fugir (confere os melhores).
  blocos.sort((a, b) => b.v - a.v);
  for (const b of blocos.slice(0, 4)) {
    if (b.v <= melhorNota) break;
    if (fugaPossivelEm(m, j, b.i, n)) { melhorNota = b.v; melhor = { i: b.i, motivo: 'bloco' }; break; }
    r.recusadas[b.i] = m.tick + 90;
  }
  if (podeAtacar && j.chute && proximo(r.rng) < n.usaTatica) {
    const p = T.pontoDeChute(m, j, buscarParaChute(m, j, an, ocupada), n, ticksPorCasa(m, j));
    if (p) considerar(p.casa, 45 - p.d * 3, 'chute');
  }
  if (podeAtacar && n.emboscada && m.tick >= r.proximaEmboscada) {
    r.proximaEmboscada = m.tick + n.emboscada;
    const e = procurarEmboscada(r, m, j, busca);
    if (e) considerar(e.i, 30 + e.valor, 'ataque');
  }
  if (podeAtacar && proximo(r.rng) < vontadeDePerseguir(m, n)) {
    const rival = rivalMaisProximo(m, j);
    if (rival) {
      const ir = casaDe(m, rival);
      for (const i of busca.fila) {
        if (i === aqui && busca.fila.length > 1) continue;
        const d = distancia(m, i, ir);
        if (d === 0 || d > Math.max(2, j.alcance)) continue;
        const naLinha = i % m.colunas === ir % m.colunas || Math.floor(i / m.colunas) === Math.floor(ir / m.colunas);
        considerar(i, (naLinha ? 40 : 25) - busca.dist[i] * 3 - d, 'ataque');
      }
    }
  }
  if (!melhor || melhorNota < 4) {
    // Nada interessante por perto: passeia (nunca fica parado sem motivo).
    const longe = busca.fila.filter((i) => busca.dist[i] >= 2 && busca.dist[i] <= 7);
    const opcoes = longe.length ? longe : busca.fila.filter((i) => i !== aqui);
    if (opcoes.length) considerar(opcoes[Math.floor(proximo(r.rng) * opcoes.length)], 3, 'passeio');
  }
  r.alvo = melhor ? melhor.i : null;
  r.motivo = melhor ? melhor.motivo : null;
}

/** Com a arena aberta (poucos blocos) ou no aperto final, a caça aumenta. */
function vontadeDePerseguir(m, n) {
  let blocos = 0;
  for (const t of m.grade) if (t === BLOCO) blocos++;
  const aberta = Math.max(0, 1 - blocos / 60);
  const fim = m.aperto && m.aperto.ativo ? 1 : aberta;
  return n.perseguir + (n.perseguirFinal - n.perseguir) * fim;
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
