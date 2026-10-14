// Bichinhos do Estojo Surpresa. Montado, o jogador tem uma vida extra: se for
// molhado, perde o bichinho em vez de sair da rodada e pisca invulnerável por
// ~1 s. Pegar outro estojo já montado TROCA por um bichinho diferente.
// Cada um tem um poder no segundo botão (`acao`):
//  - Saltinho: pula 2 casas para a frente, por cima do que houver no meio
//    (bloco, pilar, gota, jogador), se a casa de pouso estiver livre;
//  - Cascudo: enquanto o botão estiver apertado, fecha a carapaça virada para
//    a frente: fica parado (pode girar) e o respingo que vem DA FRENTE não o
//    molha; costas e lados continuam vulneráveis;
//  - Disparada: apertar dá uma arrancada em linha reta enquanto o botão estiver
//    apertado (até 6 casas), parando no primeiro obstáculo.

import {
  CASA, MEIA_CASA, MOLDURA, TUNEL, DIRECOES,
  DISTANCIA_SALTO, DURACAO_SALTO, ALCANCE_DISPARADA, RECARGA_PODER,
} from './constantes.js';
import { sortearNoMundo } from './aleatorio.js';
import { colDe, linDe, sobrepoe } from './jogadores.js';
import { casaLivreParaGota, tentarChutar } from './chute.js';
import { tentarMover, atravessarTunel, eixosDaEntrada } from './movimento.js';

export const BICHINHOS = Object.freeze(['saltinho', 'cascudo', 'disparada']);

export const NOMES_BICHINHOS = Object.freeze({
  saltinho: 'Saltinho',
  cascudo: 'Cascudo',
  disparada: 'Disparada',
});

/** Monta (ou troca por outro diferente) — sorteado com a semente do mundo. */
export function montar(m, j) {
  const opcoes = BICHINHOS.filter((b) => b !== j.montaria?.tipo);
  const tipo = opcoes[sortearNoMundo(m, opcoes.length)];
  const trocou = j.montaria !== null;
  j.montaria = { tipo };
  j.escudo = false;
  j.disparada = null;
  m.eventos.push({ tipo: 'montou', jogador: j.id, bichinho: tipo, trocou });
}

/** Perde o bichinho (foi molhado montado): fica piscando, invulnerável. */
export function desmontar(m, j) {
  m.eventos.push({ tipo: 'perdeuBichinho', jogador: j.id, bichinho: j.montaria.tipo });
  j.montaria = null;
  j.escudo = false;
  j.disparada = null;
  j.invulneravel = m.ajuste.invulneravel;
}

/** Casa de pouso do pulo, ou null se não dá para pular. */
export function destinoDoSalto(m, j) {
  const { dc, dl } = DIRECOES[j.dir];
  const c = colDe(j);
  const l = linDe(j);
  const meio = m.grade[(l + dl) * m.colunas + c + dc];
  if (meio === MOLDURA || meio === TUNEL) return null;
  const col = c + dc * DISTANCIA_SALTO;
  const lin = l + dl * DISTANCIA_SALTO;
  if (col < 1 || lin < 1 || col > m.colunas - 2 || lin > m.linhas - 2) return null;
  if (!casaLivreParaGota(m, col, lin)) return null; // mesma regra: sem nada sólido nem ninguém
  return { col, lin };
}

function avancarSalto(m, j) {
  const s = j.salto;
  s.t++;
  const p = Math.min(1, s.t / DURACAO_SALTO);
  j.x = Math.round(s.x0 + (s.x1 - s.x0) * p);
  j.y = Math.round(s.y0 + (s.y1 - s.y0) * p);
  if (s.t >= DURACAO_SALTO) {
    j.salto = null;
    j.recarga = RECARGA_PODER;
    // Se alguém soltou uma gota bem onde ele pousou, ele pode sair de cima dela.
    for (const g of m.gotas) {
      if (g.estado === 'chao' && sobrepoe(j, g.col, g.lin) && !g.passantes.includes(j.id)) g.passantes.push(j.id);
    }
    m.eventos.push({ tipo: 'pousoSalto', jogador: j.id, col: colDe(j), lin: linDe(j) });
  }
}

function avancarDisparada(m, j, acao) {
  const d = j.disparada;
  if (!acao || d.resta <= 0) {
    j.disparada = null;
    j.recarga = RECARGA_PODER;
    return;
  }
  // Em dois meios-passos: cada um sempre menor que uma casa (não atravessa nada).
  let total = Math.min(m.ajuste.velocidadeDisparada, d.resta);
  let parou = false;
  while (total > 0 && !parou) {
    const passo = Math.min(total, 90);
    const r = tentarMover(m, j, d.dir, passo, null);
    if (r.moveu) {
      const dx = r.x - j.x;
      j.x = r.x;
      j.y = r.y;
      atravessarTunel(m, j, dx);
    }
    if (!r.avancou) {
      if (j.chute) tentarChutar(m, j, d.dir);
      parou = true;
    }
    total -= passo;
    d.resta -= passo;
  }
  j.dir = d.dir;
  j.andando = true;
  if (parou) {
    j.disparada = null;
    j.recarga = RECARGA_PODER;
    m.eventos.push({ tipo: 'fimDisparada', jogador: j.id });
  }
}

/**
 * Poderes dos bichinhos, um tick. Devolve true quando o poder ocupa o
 * movimento do jogador neste tick (no ar, arrancando ou de carapaça fechada).
 */
export function usarPoder(m, j, entrada) {
  const acao = !!entrada.acao;
  const borda = acao && !j.acaoAntes;
  j.acaoAntes = acao;
  if (j.recarga > 0) j.recarga--;
  if (j.salto) {
    avancarSalto(m, j);
    return true;
  }
  if (j.disparada) {
    avancarDisparada(m, j, acao);
    return true;
  }
  const tipo = j.montaria?.tipo;
  j.escudo = tipo === 'cascudo' && acao;
  if (j.escudo) {
    // Carapaça fechada: não anda, mas gira para escolher o lado protegido.
    const { h, v } = eixosDaEntrada(entrada);
    if (h !== 0 && v === 0) j.dir = h > 0 ? 'dir' : 'esq';
    else if (v !== 0 && h === 0) j.dir = v > 0 ? 'baixo' : 'cima';
    j.andando = false;
    return true;
  }
  if (!borda || j.recarga > 0 || j.segurando !== null) return false;
  if (tipo === 'saltinho') {
    const alvo = destinoDoSalto(m, j);
    if (!alvo) return false;
    j.salto = { x0: j.x, y0: j.y, x1: alvo.col * CASA + MEIA_CASA, y1: alvo.lin * CASA + MEIA_CASA, t: 0 };
    m.eventos.push({ tipo: 'salto', jogador: j.id, col: alvo.col, lin: alvo.lin });
    return true;
  }
  if (tipo === 'disparada') {
    j.disparada = { dir: j.dir, resta: ALCANCE_DISPARADA * CASA };
    m.eventos.push({ tipo: 'disparada', jogador: j.id, dir: j.dir });
    avancarDisparada(m, j, true);
    return true;
  }
  return false;
}

/**
 * Carapaça do Cascudo: o respingo `r` vem da frente do jogador? Vale só para
 * respingos cujo centro está à frente, na mesma linha/coluna.
 */
export function vemDaFrente(j, r) {
  const { dc, dl } = DIRECOES[j.dir];
  const c = colDe(j);
  const l = linDe(j);
  if (dc !== 0) return r.lin === l && Math.sign(r.col - c) === dc;
  return r.col === c && Math.sign(r.lin - l) === dl;
}
