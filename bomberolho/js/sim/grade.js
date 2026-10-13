// Grade da arena: geração com semente e utilidades de consulta.

import {
  COLUNAS, LINHAS, VAZIO, MOLDURA, PILAR, BLOCO, LARGADAS,
} from './constantes.js';
import { embaralhar } from './aleatorio.js';

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

/**
 * Sorteia blocos e itens escondidos. Usa contagens exatas (não "moeda por
 * casa") para que toda semente tenha a mesma densidade e a mesma mistura de itens.
 */
export function gerarArena(arena, rng) {
  const grade = gradeFixa();
  const reservadas = new Set(casasDeLargada());
  const candidatas = [];
  for (let i = 0; i < grade.length; i++) {
    if (grade[i] === VAZIO && !reservadas.has(i)) candidatas.push(i);
  }
  embaralhar(rng, candidatas);
  const nBlocos = Math.round(candidatas.length * arena.densidadeBlocos);
  const blocos = candidatas.slice(0, nBlocos).sort((a, b) => a - b);
  for (const i of blocos) grade[i] = BLOCO;

  const ocultos = new Array(grade.length).fill(null);
  const comItem = embaralhar(rng, blocos.slice()).slice(0, Math.round(nBlocos * arena.taxaItens));
  const tipos = distribuirItens(arena.pesosItens, comItem.length);
  comItem.forEach((i, k) => { ocultos[i] = tipos[k]; });
  return { grade, ocultos };
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

const ITEM_POR_LETRA = { g: 'gota', a: 'alcance', v: 'velocidade' };

/**
 * Monta grade a partir de texto (usado nos testes e em arenas desenhadas à mão).
 * '#' moldura/pilar · 'B' bloco · '.' vazio · '1'..'4' largadas ·
 * 'g' 'a' 'v' item exposto · 'G' 'A' 'V' bloco com item escondido.
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
      else if (ch === 'B') grade[i] = BLOCO;
      else if (ITEM_POR_LETRA[ch]) itens[i] = ITEM_POR_LETRA[ch];
      else if (ITEM_POR_LETRA[ch.toLowerCase()]) { grade[i] = BLOCO; ocultos[i] = ITEM_POR_LETRA[ch.toLowerCase()]; }
      else if (ch >= '1' && ch <= '4') largadas[Number(ch) - 1] = { col: c, lin: l };
      else if (ch !== '.') throw new Error(`caractere desconhecido '${ch}'`);
    }
  }
  return { grade, itens, ocultos, colunas, linhas, largadas };
}
