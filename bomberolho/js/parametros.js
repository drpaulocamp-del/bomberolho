// Leitura dos parâmetros de URL (?arena=, ?dificuldade=, ?semente=, ?demo=1,
// ?personagem=, ?escala=, ?rodadas=, ?ajuste=1, ?densidade=, ?toque=). Função
// pura: recebe a query string, devolve opções já validadas — valores
// desconhecidos caem no padrão em silêncio.

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
  const sim = (v) => ['1', 'true', 'sim'].includes(v);
  const demo = sim(q.get('demo'));
  const personagem = PERSONAGENS[q.get('personagem')] ? q.get('personagem') : null;
  const escalaNum = Number(q.get('escala'));
  const escala = Number.isFinite(escalaNum) && escalaNum > 0 && escalaNum <= 8 ? escalaNum : 1;
  const rodadasNum = Number(q.get('rodadas'));
  const rodadas = [1, 2, 3].includes(rodadasNum) ? rodadasNum : 2;
  const ajuste = sim(q.get('ajuste'));
  const densidadeNum = Number(q.get('densidade'));
  const densidade = q.has('densidade') && Number.isFinite(densidadeNum) && densidadeNum >= 1 && densidadeNum <= 3 ? densidadeNum : null;
  // ?toque=1 mostra os controles de toque mesmo sem tela de toque (teste no
  // computador, com o mouse); ?toque=0 esconde. Sem o parâmetro, decide o aparelho.
  const toque = q.has('toque') ? sim(q.get('toque')) : null;
  return { arena, dificuldade, semente, demo, personagem, escala, rodadas, ajuste, densidade, toque };
}

const CHAVES_DE_JOGO = ['semente', 'arena', 'dificuldade', 'demo', 'personagem', 'rodadas', 'escala', 'ajuste'];

/** Com algum parâmetro de jogo na URL (testes, links diretos), pula o menu e começa a partida. */
export function pedeJogoDireto(busca) {
  const q = new URLSearchParams(busca);
  return CHAVES_DE_JOGO.some((k) => q.has(k));
}
