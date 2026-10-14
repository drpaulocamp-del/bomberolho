// Regras de cada arena que afetam a simulação: densidade de blocos, itens,
// casas reservadas e o elemento de arena. A aparência mora em js/render/temas.js.
//
// Elementos (simples e justos, sempre visíveis no chão):
//  - Lago Lacrimal: correnteza em anel (sentido horário) que empurra devagar
//    quem está alinhado à faixa de água; a água não tem blocos.
//  - Caverna da Pupila: dois túneis na moldura (linhas 5 e 7, longe dos
//    cantos de largada): quem entra de um lado sai do outro, sem nunca parar
//    na moldura. Respingo e gota chutada não atravessam.
//  - Consultório das Lentes: cinco lentes no chão; a gota solta sobre uma
//    lente ganha +2 de alcance (para todos, inclusive os robôs).
//  - Vale da Retina: sem mecânica nova, mas com layout próprio: clareira
//    no centro e menos blocos, mais itens (partidas rápidas e abertas).

import { COLUNAS, LINHAS } from './constantes.js';

/** Anel da correnteza do Lago: retângulo nas linhas 3 e 9 e colunas 3 e 11. */
function anelDaCorrenteza() {
  const piso = {};
  const [c0, c1, l0, l1] = [3, COLUNAS - 4, 3, LINHAS - 4];
  for (let c = c0; c < c1; c++) piso[`${c},${l0}`] = 'dir';
  for (let l = l0; l < l1; l++) piso[`${c1},${l}`] = 'baixo';
  for (let c = c1; c > c0; c--) piso[`${c},${l1}`] = 'esq';
  for (let l = l1; l > l0; l--) piso[`${c0},${l}`] = 'cima';
  return piso;
}

const LINHAS_TUNEL = Object.freeze([5, LINHAS - 6]);

export const ARENAS = Object.freeze({
  jardim: Object.freeze({
    id: 'jardim',
    nome: 'Jardim da Íris',
    elemento: null,
    densidadeBlocos: 0.78, // fração das casas livres (fora dos cantos) com bloco
    taxaItens: 0.34, // fração dos blocos que escondem um item
    pesosItens: Object.freeze({ gota: 7, alcance: 7, velocidade: 4, chute: 2, superLupa: 1, cisco: 2, pinca: 1, penetrante: 1, estojo: 2 }),
    piso: Object.freeze({}),
    tuneis: Object.freeze([]),
    clareira: false,
  }),
  lago: Object.freeze({
    id: 'lago',
    nome: 'Lago Lacrimal',
    elemento: 'correnteza',
    densidadeBlocos: 0.84, // a água já abre caminho; o resto é mais fechado
    taxaItens: 0.36,
    pesosItens: Object.freeze({ gota: 6, alcance: 6, velocidade: 3, chute: 3, superLupa: 1, cisco: 2, pinca: 1, penetrante: 1, estojo: 3 }),
    piso: Object.freeze(anelDaCorrenteza()),
    tuneis: Object.freeze([]),
    clareira: false,
  }),
  caverna: Object.freeze({
    id: 'caverna',
    nome: 'Caverna da Pupila',
    elemento: 'tuneis',
    densidadeBlocos: 0.78,
    taxaItens: 0.34,
    pesosItens: Object.freeze({ gota: 7, alcance: 6, velocidade: 4, chute: 2, superLupa: 1, cisco: 3, pinca: 2, penetrante: 1, estojo: 2 }),
    piso: Object.freeze({}),
    tuneis: LINHAS_TUNEL,
    clareira: false,
  }),
  vale: Object.freeze({
    id: 'vale',
    nome: 'Vale da Retina',
    elemento: null,
    densidadeBlocos: 0.7,
    taxaItens: 0.42,
    pesosItens: Object.freeze({ gota: 7, alcance: 7, velocidade: 4, chute: 2, superLupa: 1, cisco: 2, pinca: 2, penetrante: 2, estojo: 2 }),
    piso: Object.freeze({}),
    tuneis: Object.freeze([]),
    clareira: true, // miolo 5×3 sem blocos
  }),
  consultorio: Object.freeze({
    id: 'consultorio',
    nome: 'Consultório das Lentes',
    elemento: 'lentes',
    densidadeBlocos: 0.78,
    taxaItens: 0.34,
    pesosItens: Object.freeze({ gota: 7, alcance: 6, velocidade: 4, chute: 2, superLupa: 2, cisco: 2, pinca: 1, penetrante: 1, estojo: 2 }),
    piso: Object.freeze({ '3,3': 'lente', [`${COLUNAS - 4},3`]: 'lente', [`3,${LINHAS - 4}`]: 'lente', [`${COLUNAS - 4},${LINHAS - 4}`]: 'lente', '7,6': 'lente' }),
    tuneis: Object.freeze([]),
    clareira: false,
  }),
});

export const ARENA_PADRAO = 'jardim';
export const ORDEM_ARENAS = Object.freeze(['jardim', 'lago', 'caverna', 'vale', 'consultorio']);

export function obterArena(id) {
  return ARENAS[id] || ARENAS[ARENA_PADRAO];
}
