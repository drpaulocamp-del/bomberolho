// Competidores: criação e consultas simples.

import { CASA, MEIA_CASA, PODERES_INICIAIS, VELOCIDADE_BASE, VELOCIDADE_PASSO } from './constantes.js';

export function criarJogador(id, personagem, col, lin) {
  return {
    id,
    personagem,
    x: col * CASA + MEIA_CASA, // centro do corpo, em unidades
    y: lin * CASA + MEIA_CASA,
    vivo: true,
    gotas: PODERES_INICIAIS.gotas, // máximo de gotas simultâneas
    alcance: PODERES_INICIAIS.alcance,
    velocidade: PODERES_INICIAIS.velocidade, // nível de Lágrima Veloz
    dir: 'baixo', // para onde está olhando
    andando: false,
    bombaAntes: false, // botão de gota no tick anterior (soltar exige novo toque)
    eliminadoEm: null, // tick em que foi encharcado
    eliminadoPor: null, // id do dono da gota
  };
}

export function velocidadeDe(j) {
  return VELOCIDADE_BASE + j.velocidade * VELOCIDADE_PASSO;
}

/** Casa que contém o centro do corpo — é ela que conta para gota, item e respingo. */
export function colDe(j) {
  return Math.floor(j.x / CASA);
}
export function linDe(j) {
  return Math.floor(j.y / CASA);
}

/** O corpo (uma casa de lado) encosta na casa (col, lin)? */
export function sobrepoe(j, col, lin) {
  return Math.abs(j.x - (col * CASA + MEIA_CASA)) < CASA
    && Math.abs(j.y - (lin * CASA + MEIA_CASA)) < CASA;
}
