// Leitura dos parâmetros de URL (?arena=, ?dificuldade=, ?semente=, ?demo=1,
// ?personagem=, ?escala=). Função pura: recebe a query string, devolve opções
// já validadas — valores desconhecidos caem no padrão em silêncio.

import { ARENAS, ARENA_PADRAO } from './sim/arenas.js';
import { sementeDeTexto } from './sim/aleatorio.js';
import { PERSONAGENS } from './dados/personagens.js';

export const DIFICULDADES = Object.freeze(['facil', 'medio', 'dificil']);

export function lerParametros(busca) {
  const q = new URLSearchParams(busca);
  const arena = ARENAS[q.get('arena')] ? q.get('arena') : ARENA_PADRAO;
  const dificuldade = DIFICULDADES.includes(q.get('dificuldade')) ? q.get('dificuldade') : 'facil';
  const sementeTexto = q.get('semente');
  const semente = sementeTexto !== null && sementeTexto !== '' ? sementeDeTexto(sementeTexto) : null;
  const demo = ['1', 'true', 'sim'].includes(q.get('demo'));
  const personagem = PERSONAGENS[q.get('personagem')] ? q.get('personagem') : null;
  const escalaNum = Number(q.get('escala'));
  const escala = Number.isFinite(escalaNum) && escalaNum > 0 && escalaNum <= 8 ? escalaNum : 1;
  return { arena, dificuldade, semente, demo, personagem, escala };
}
