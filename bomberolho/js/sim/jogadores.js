// Competidores: criação e consultas simples.

import { CASA, MEIA_CASA, PODERES_INICIAIS } from './constantes.js';

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
    chute: false, // Chute-Pisca: empurra a gota ao andar contra ela
    pinca: false, // Pinça: levanta e arremessa gotas
    penetrante: false, // Colírio Penetrante: respingo atravessa blocos
    cisco: null, // { tipo, restante } — azar passageiro
    montaria: null, // { tipo } — bichinho do Estojo Surpresa (vida extra)
    invulneravel: 0, // ticks piscando depois de perder o bichinho
    segurando: null, // id da gota levantada com a Pinça
    salto: null, // { x0, y0, x1, y1, t } — pulo do Saltinho em andamento
    disparada: null, // { dir, resta } — arrancada da Disparada em andamento
    escudo: false, // carapaça do Cascudo fechada (protege a frente)
    recarga: 0, // ticks até poder usar o poder do bichinho de novo
    dir: 'baixo', // para onde está olhando
    eixosAntes: { h: 0, v: 0 }, // direções do tick anterior (para "rolar" as teclas)
    virando: null, // direção da esquina que está pegando com a janela de virada
    andando: false,
    bombaAntes: false, // botão de gota no tick anterior (soltar exige novo toque)
    acaoAntes: false, // segundo botão no tick anterior
    defendidos: [], // respingos já barrados pela carapaça (para avisar uma vez só)
    eliminadoEm: null, // tick em que foi encharcado
    eliminadoPor: null, // id do dono da gota (null: aperto final)
  };
}

/** Velocidade a pé (un/tick), já com Lágrima Veloz e Cisco. Sempre < 1/10 de casa. */
export function velocidadeDe(j, aj) {
  if (j.cisco?.tipo === 'lento') return Math.round(aj.velocidadeBase * 0.55);
  if (j.cisco?.tipo === 'ligeiro') return Math.min(95, aj.velocidadeBase + 6 * aj.velocidadePasso);
  return Math.min(95, aj.velocidadeBase + j.velocidade * aj.velocidadePasso);
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

/** No ar (pulo do Saltinho): não colide, não é molhado, não pega item. */
export function noAr(j) {
  return j.salto !== null;
}
