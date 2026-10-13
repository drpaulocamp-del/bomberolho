// Regras de cada arena que afetam a simulação (densidade de blocos, itens).
// A aparência mora em js/render/temas.js; aqui fica só o que muda o jogo.
// Novas arenas (parte 2) entram nesta tabela com os mesmos campos.

export const ARENAS = Object.freeze({
  jardim: Object.freeze({
    id: 'jardim',
    nome: 'Jardim da Íris',
    densidadeBlocos: 0.78, // fração das casas livres (fora dos cantos) com bloco
    taxaItens: 0.32, // fração dos blocos que escondem um item
    pesosItens: Object.freeze({ gota: 4, alcance: 4, velocidade: 2 }),
  }),
});

export const ARENA_PADRAO = 'jardim';

export function obterArena(id) {
  return ARENAS[id] || ARENAS[ARENA_PADRAO];
}
