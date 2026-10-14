// Itens: tabela de efeitos. Os de atributo (contadores com limite) ficam em
// ITENS; os especiais (chute, Super Lupa, Cisco, Pinça, Penetrante, Estojo)
// em ESPECIAIS. Cada um tem nome em português e um efeito só.

import { LIMITES } from './constantes.js';
import { sortearNoMundo } from './aleatorio.js';
import { montar } from './bichinhos.js';

export const ITENS = Object.freeze({
  gota: Object.freeze({ nome: 'Frasquinho Extra', atributo: 'gotas', limite: LIMITES.gotas }),
  alcance: Object.freeze({ nome: 'Lupa', atributo: 'alcance', limite: LIMITES.alcance }),
  velocidade: Object.freeze({ nome: 'Lágrima Veloz', atributo: 'velocidade', limite: LIMITES.velocidade }),
});

export const TIPOS_CISCO = Object.freeze(['lento', 'ligeiro', 'espirro']);

export const ESPECIAIS = Object.freeze({
  chute: Object.freeze({ nome: 'Chute-Pisca', raro: false }),
  superLupa: Object.freeze({ nome: 'Super Lupa', raro: true }),
  cisco: Object.freeze({ nome: 'Cisco', raro: false }),
  pinca: Object.freeze({ nome: 'Pinça', raro: false }),
  penetrante: Object.freeze({ nome: 'Colírio Penetrante', raro: true }),
  estojo: Object.freeze({ nome: 'Estojo Surpresa', raro: false }),
});

export function nomeDoItem(tipo) {
  return (ITENS[tipo] || ESPECIAIS[tipo])?.nome ?? tipo;
}

/** Item de atributo: soma 1 respeitando o limite. Devolve true se algo mudou. */
export function aplicarItem(jogador, tipo) {
  const def = ITENS[tipo];
  if (!def) return false;
  const antes = jogador[def.atributo];
  jogador[def.atributo] = Math.min(def.limite, antes + 1);
  return jogador[def.atributo] !== antes;
}

/**
 * Qualquer item (de atributo ou especial). Precisa do mundo para o sorteio
 * (Cisco, bichinho) e para os parâmetros. Devolve true se algo mudou.
 */
export function pegarItem(m, j, tipo) {
  if (ITENS[tipo]) return aplicarItem(j, tipo);
  switch (tipo) {
    case 'chute':
      if (j.chute) return false;
      j.chute = true;
      return true;
    case 'superLupa':
      if (j.alcance >= LIMITES.alcance) return false;
      j.alcance = LIMITES.alcance;
      return true;
    case 'cisco':
      // Azar passageiro: tipo sorteado com a semente (mesma partida, mesmo azar).
      j.cisco = { tipo: TIPOS_CISCO[sortearNoMundo(m, TIPOS_CISCO.length)], restante: m.ajuste.duracaoCisco };
      return true;
    case 'pinca':
      if (j.pinca) return false;
      j.pinca = true;
      return true;
    case 'penetrante':
      if (j.penetrante) return false;
      j.penetrante = true;
      return true;
    case 'estojo':
      montar(m, j);
      return true;
    default:
      return false;
  }
}
