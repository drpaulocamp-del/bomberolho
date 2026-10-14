// Grade da arena: geração com semente e utilidades de consulta.

import {
  COLUNAS, LINHAS, VAZIO, MOLDURA, PILAR, BLOCO, TUNEL, LARGADAS,
} from './constantes.js';
import { embaralhar, inteiro } from './aleatorio.js';

export function indice(col, lin, colunas = COLUNAS) {
  return lin * colunas + col;
}

/** Casas do "L" livre de cada canto: o canto e os dois vizinhos para dentro. */
export function casasDeLargada(colunas = COLUNAS, linhas = LINHAS) {
  const casas = [];
  for (const { col, lin } of LARGADAS) {
    const dc = col === 1 ? 1 : -1;
    const dl = lin === 1 ? 1 : -1;
    casas.push([col, lin], [col + dc, lin], [col, lin + dl]);
  }
  return casas.map(([c, l]) => indice(c, l, colunas));
}

/** Moldura e pilares fixos (casas de linha e coluna pares no interior). */
export function gradeFixa(colunas = COLUNAS, linhas = LINHAS) {
  const grade = new Array(colunas * linhas).fill(VAZIO);
  for (let l = 0; l < linhas; l++) {
    for (let c = 0; c < colunas; c++) {
      const borda = c === 0 || l === 0 || c === colunas - 1 || l === linhas - 1;
      if (borda) grade[indice(c, l, colunas)] = MOLDURA;
      else if (c % 2 === 0 && l % 2 === 0) grade[indice(c, l, colunas)] = PILAR;
    }
  }
  return grade;
}

/** Casas da arena que nunca recebem bloco além dos cantos (água, túnel, lente, clareira). */
export function casasReservadas(arena, colunas = COLUNAS, linhas = LINHAS) {
  const casas = new Set(casasDeLargada(colunas, linhas));
  for (const chave of Object.keys(arena.piso)) {
    const [c, l] = chave.split(',').map(Number);
    casas.add(indice(c, l, colunas));
  }
  for (const l of arena.tuneis) {
    casas.add(indice(1, l, colunas));
    casas.add(indice(colunas - 2, l, colunas));
  }
  if (arena.clareira) {
    const mc = (colunas - 1) / 2;
    const ml = (linhas - 1) / 2;
    for (let l = ml - 1; l <= ml + 1; l++) for (let c = mc - 2; c <= mc + 2; c++) casas.add(indice(c, l, colunas));
  }
  return casas;
}

/** Piso especial por casa: null, direção da correnteza ('cima'…) ou 'lente'. */
export function pisoDaArena(arena, colunas = COLUNAS, linhas = LINHAS) {
  const piso = new Array(colunas * linhas).fill(null);
  for (const [chave, valor] of Object.entries(arena.piso)) {
    const [c, l] = chave.split(',').map(Number);
    piso[indice(c, l, colunas)] = valor;
  }
  return piso;
}

/**
 * Sorteia blocos e itens escondidos. Usa contagens exatas (não "moeda por
 * casa") para que toda semente tenha a mesma densidade e a mesma mistura de
 * itens, e reparte os itens entre os quatro quadrantes e o meio em rodízio (cada canto
 * recebe a sua parte de cada tipo — justiça numa partida de quatro cantos).
 */
export function gerarArena(arena, rng) {
  const grade = gradeFixa();
  for (const l of arena.tuneis) {
    grade[indice(0, l)] = TUNEL;
    grade[indice(COLUNAS - 1, l)] = TUNEL;
  }
  const reservadas = casasReservadas(arena);
  const candidatas = [];
  for (let i = 0; i < grade.length; i++) {
    if (grade[i] === VAZIO && !reservadas.has(i)) candidatas.push(i);
  }
  embaralhar(rng, candidatas);
  const nBlocos = Math.round(candidatas.length * arena.densidadeBlocos);
  const blocos = candidatas.slice(0, nBlocos).sort((a, b) => a - b);
  for (const i of blocos) grade[i] = BLOCO;

  const ocultos = new Array(grade.length).fill(null);
  const tipos = distribuirItens(arena.pesosItens, Math.round(nBlocos * arena.taxaItens));
  // Cinco "montes": os quatro quadrantes e a cruz do meio (coluna e linha
  // centrais, de ninguém). Rodízio q, q+1, q+2, q+3, meio: cada canto recebe
  // exatamente a sua parte de cada tipo, sem que parte dela caia no meio.
  const montes = [[], [], [], [], []];
  for (const i of blocos) montes[quadrante(i)].push(i);
  for (const lista of montes) embaralhar(rng, lista);
  const q0 = inteiro(rng, 4);
  const ordem = [q0, (q0 + 1) % 4, (q0 + 2) % 4, (q0 + 3) % 4, 4];
  let k = 0;
  for (const tipo of tipos) {
    for (let tentativa = 0; tentativa < 5; tentativa++, k++) {
      const monte = montes[ordem[k % 5]];
      if (monte.length) {
        ocultos[monte.pop()] = tipo;
        k++;
        break;
      }
    }
  }
  return { grade, ocultos, piso: pisoDaArena(arena) };
}

/**
 * Quadrante de uma casa: 0 cima/esq, 1 cima/dir, 2 baixo/esq, 3 baixo/dir, ou
 * 4 para a cruz do meio (coluna e linha centrais). Antes a coluna e a linha do
 * meio contavam para os quadrantes da esquerda e de cima, que assim recebiam
 * a mesma cota de itens espalhada por mais casas — os cantos 3 e 1 levavam
 * vantagem (medido no lote: seção 2).
 */
export function quadrante(i, colunas = COLUNAS, linhas = LINHAS) {
  const c = i % colunas;
  const l = Math.floor(i / colunas);
  const mc = (colunas - 1) / 2;
  const ml = (linhas - 1) / 2;
  if (c === mc || l === ml) return 4;
  return (c < mc ? 0 : 1) + (l < ml ? 0 : 2);
}

/** Reparte n itens proporcionalmente aos pesos (maiores restos primeiro). */
export function distribuirItens(pesos, n) {
  const nomes = Object.keys(pesos);
  const total = nomes.reduce((s, k) => s + pesos[k], 0);
  const cotas = nomes.map((k) => ({ k, exata: (pesos[k] * n) / total }));
  cotas.forEach((q) => { q.qtd = Math.floor(q.exata); });
  let falta = n - cotas.reduce((s, q) => s + q.qtd, 0);
  [...cotas].sort((a, b) => (b.exata - b.qtd) - (a.exata - a.qtd)).forEach((q) => {
    if (falta > 0) { q.qtd++; falta--; }
  });
  return cotas.flatMap((q) => new Array(q.qtd).fill(q.k));
}

export const ITEM_POR_LETRA = Object.freeze({
  g: 'gota', a: 'alcance', v: 'velocidade', c: 'chute', s: 'superLupa', z: 'cisco', p: 'pinca', n: 'penetrante', e: 'estojo',
});

/**
 * Monta grade a partir de texto (usado nos testes e em arenas desenhadas à mão).
 * '#' moldura/pilar · 'B' bloco · '.' vazio · '1'..'4' largadas · 'T' túnel ·
 * letra minúscula de ITEM_POR_LETRA = item exposto; maiúscula = bloco com o item escondido.
 */
export function gradeDeTexto(linhasTexto) {
  const linhas = linhasTexto.length;
  const colunas = linhasTexto[0].length;
  const grade = new Array(colunas * linhas).fill(VAZIO);
  const itens = new Array(colunas * linhas).fill(null);
  const ocultos = new Array(colunas * linhas).fill(null);
  const largadas = [];
  for (let l = 0; l < linhas; l++) {
    if (linhasTexto[l].length !== colunas) throw new Error(`linha ${l} com largura diferente`);
    for (let c = 0; c < colunas; c++) {
      const ch = linhasTexto[l][c];
      const i = indice(c, l, colunas);
      const borda = c === 0 || l === 0 || c === colunas - 1 || l === linhas - 1;
      if (ch === '#') grade[i] = borda ? MOLDURA : PILAR;
      else if (ch === 'T') grade[i] = TUNEL;
      else if (ch === 'B') grade[i] = BLOCO;
      else if (ITEM_POR_LETRA[ch]) itens[i] = ITEM_POR_LETRA[ch];
      else if (ITEM_POR_LETRA[ch.toLowerCase()]) { grade[i] = BLOCO; ocultos[i] = ITEM_POR_LETRA[ch.toLowerCase()]; }
      else if (ch >= '1' && ch <= '4') largadas[Number(ch) - 1] = { col: c, lin: l };
      else if (ch !== '.') throw new Error(`caractere desconhecido '${ch}'`);
    }
  }
  return { grade, itens, ocultos, colunas, linhas, largadas, piso: new Array(colunas * linhas).fill(null) };
}
