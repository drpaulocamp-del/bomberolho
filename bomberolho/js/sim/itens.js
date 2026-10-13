// Itens: tabela de efeitos. Cada item conhece seu atributo e limite; itens
// novos (parte 2: chute, Super Lupa, Cisco) entram aqui sem mexer no resto.

import { LIMITES } from './constantes.js';

export const ITENS = Object.freeze({
  gota: Object.freeze({ nome: 'Frasquinho Extra', atributo: 'gotas', limite: LIMITES.gotas }),
  alcance: Object.freeze({ nome: 'Lupa', atributo: 'alcance', limite: LIMITES.alcance }),
  velocidade: Object.freeze({ nome: 'Lágrima Veloz', atributo: 'velocidade', limite: LIMITES.velocidade }),
});

/** Aplica o item ao jogador respeitando o limite. Devolve true se algo mudou. */
export function aplicarItem(jogador, tipo) {
  const def = ITENS[tipo];
  if (!def) return false;
  const antes = jogador[def.atributo];
  jogador[def.atributo] = Math.min(def.limite, antes + 1);
  return jogador[def.atributo] !== antes;
}
