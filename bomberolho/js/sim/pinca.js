// Pinça: com o item, apertar o botão de gota em cima de uma gota (ou colado
// nela, de frente) a levanta; soltar o botão a arremessa na direção do olhar,
// por cima de tudo, a `distanciaPinca` casas. Regras (determinísticas):
//  - o pavio continua correndo na mão e no ar; se acabar na mão, estoura ali;
//    no ar ela nunca estoura: espera pousar;
//  - pousa sempre centrada; se a casa estiver ocupada (bloco, pilar, gota ou
//    jogador), quica uma casa para a frente, quantas vezes for preciso;
//  - ao passar da borda, reaparece do lado oposto da arena (dá a volta);
//  - no ar ela não é obstáculo nem é atingida por respingo.

import { CASA, MEIA_CASA, DIRECOES } from './constantes.js';
import { gotaEm } from './gotas.js';
import { colDe, linDe, sobrepoe } from './jogadores.js';
import { casaLivreParaGota } from './chute.js';

const MAX_QUIQUES = 60; // trava de segurança: nunca acontece numa arena de verdade

/** Gota que o jogador pode levantar agora (ou null). */
export function gotaParaLevantar(m, j) {
  if (!j.pinca || j.segurando !== null || j.salto) return null;
  const c = colDe(j);
  const l = linDe(j);
  const embaixo = gotaEm(m, c, l);
  if (embaixo && !embaixo.mov) return embaixo;
  const { dc, dl } = DIRECOES[j.dir];
  const frente = gotaEm(m, c + dc, l + dl);
  if (!frente || frente.mov) return null;
  const distancia = dc !== 0 ? (frente.x - j.x) * dc : (frente.y - j.y) * dl;
  const desvio = dc !== 0 ? j.y - (l * CASA + MEIA_CASA) : j.x - (c * CASA + MEIA_CASA);
  return distancia <= CASA + 60 && Math.abs(desvio) <= 300 ? frente : null;
}

export function levantar(m, j, g) {
  g.estado = 'mao';
  g.portador = j.id;
  g.passantes = [];
  g.mov = null;
  j.segurando = g.id;
  seguirPortador(g, j);
  m.eventos.push({ tipo: 'levantou', jogador: j.id, col: g.col, lin: g.lin });
}

/** Na mão, a gota acompanha o jogador (para o desenho e para estourar ali). */
export function seguirPortador(g, j) {
  g.col = colDe(j);
  g.lin = linDe(j);
  g.x = g.col * CASA + MEIA_CASA;
  g.y = g.lin * CASA + MEIA_CASA;
}

/** Interior jogável dá a volta: a casa logo depois da última é a primeira. */
export function darVolta(m, col, lin) {
  const w = m.colunas - 2;
  const h = m.linhas - 2;
  return {
    col: ((((col - 1) % w) + w) % w) + 1,
    lin: ((((lin - 1) % h) + h) % h) + 1,
  };
}

function iniciarVoo(m, g, col, lin, dir, casas) {
  g.voo = { col0: col, lin0: lin, dir, casas, t: 0, duracao: casas * m.ajuste.vooPorCasa, quiques: g.voo ? g.voo.quiques + 1 : 0 };
}

export function arremessar(m, j) {
  const g = m.gotas.find((o) => o.id === j.segurando);
  j.segurando = null;
  if (!g) return;
  g.estado = 'voo';
  g.portador = null;
  g.voo = null;
  iniciarVoo(m, g, colDe(j), linDe(j), j.dir, m.ajuste.distanciaPinca);
  m.eventos.push({ tipo: 'arremesso', jogador: j.id, col: g.col, lin: g.lin, dir: j.dir });
}

/** Casa onde o voo atual termina (já com a volta pela borda). */
export function destinoDoVoo(m, voo) {
  const { dc, dl } = DIRECOES[voo.dir];
  return darVolta(m, voo.col0 + dc * voo.casas, voo.lin0 + dl * voo.casas);
}

/** Pousa num lugar livre ou quica para a casa seguinte. */
export function avancarVoos(m) {
  for (const g of m.gotas) {
    if (g.estado !== 'voo') continue;
    g.voo.t++;
    if (g.voo.t < g.voo.duracao) continue;
    const { col, lin } = destinoDoVoo(m, g.voo);
    if (casaLivreParaGota(m, col, lin)) {
      g.estado = 'chao';
      g.col = col;
      g.lin = lin;
      g.x = col * CASA + MEIA_CASA;
      g.y = lin * CASA + MEIA_CASA;
      g.voo = null;
      g.passantes = m.jogadores.filter((o) => o.vivo && !o.salto && sobrepoe(o, col, lin)).map((o) => o.id);
      m.eventos.push({ tipo: 'pousou', col, lin });
    } else if (g.voo.quiques >= MAX_QUIQUES) {
      g.descartada = true; // arena sem nenhuma casa livre: a gota evapora
    } else {
      iniciarVoo(m, g, col, lin, g.voo.dir, 1);
      m.eventos.push({ tipo: 'quique', col, lin });
    }
  }
  if (m.gotas.some((g) => g.descartada)) m.gotas = m.gotas.filter((g) => !g.descartada);
}
