import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapa, passo, avancar, e, centro, posicionar, K } from './ajuda.mjs';

const SALA = [
  '#########',
  '#1......#',
  '#.#.#.#.#',
  '#.......#',
  '#########',
];

test('a gota nasce centrada na casa do centro do corpo, mesmo desalinhado', () => {
  const m = mapa(...SALA);
  posicionar(m, 0, centro(3) + 420, centro(1)); // centro do corpo ainda na casa 3
  passo(m, [e('bomba')]);
  assert.equal(m.gotas.length, 1);
  const g = m.gotas[0];
  assert.deepEqual([g.col, g.lin, g.x, g.y], [3, 1, centro(3), centro(1)]);
  assert.equal(g.dono, 0);
  assert.equal(g.alcance, K.PODERES_INICIAIS.alcance);
});

test('pavio: estoura exatamente no PAVIO-ésimo tick, contando o da soltura (≈2,75 s)', () => {
  const m = mapa(...SALA);
  passo(m, [e('bomba')]);
  assert.ok(K.PAVIO >= 150 && K.PAVIO <= 180, 'entre 2,5 s e 3 s');
  avancar(m, K.PAVIO - 2);
  assert.equal(m.gotas.length, 1, 'ainda não');
  assert.equal(m.respingos.length, 0);
  passo(m);
  assert.equal(m.gotas.length, 0);
  assert.equal(m.respingos.length, 1);
});

test('segurar o botão solta uma gota só; soltar e apertar de novo solta outra', () => {
  const m = mapa(...SALA);
  m.jogadores[0].gotas = 3;
  avancar(m, 10, [e('bomba')]);
  assert.equal(m.gotas.length, 1);
  avancar(m, 20, [e('dir')]);
  passo(m, [e('bomba')]);
  assert.equal(m.gotas.length, 2);
});

test('limite de gotas simultâneas e devolução ao estourar', () => {
  const m = mapa(...SALA);
  const j = m.jogadores[0];
  const solta = () => { passo(m, [e('bomba')]); passo(m, []); };
  solta();
  avancar(m, 20, [e('dir')]);
  solta();
  assert.equal(m.gotas.length, 1, 'com 1 Frasquinho, só uma por vez');
  j.gotas = 2;
  solta();
  assert.equal(m.gotas.length, 2);
  avancar(m, 200, [e('dir')]); // espera estourarem
  assert.equal(m.gotas.length, 0);
  solta();
  assert.equal(m.gotas.length, 1, 'gotas estouradas voltam para o estoque');
});

test('não solta duas gotas na mesma casa', () => {
  const m = mapa(...SALA);
  m.jogadores[0].gotas = 5;
  passo(m, [e('bomba')]);
  passo(m, []);
  passo(m, [e('bomba')]);
  assert.equal(m.gotas.length, 1);
});

test('o dono sai de cima da gota; depois ela vira sólida para ele também', () => {
  const m = mapa(...SALA);
  const j = m.jogadores[0];
  posicionar(m, 0, centro(3), centro(1));
  passo(m, [e('bomba')]);
  assert.deepEqual(m.gotas[0].passantes, [0]);
  avancar(m, 25, [e('dir')]); // sai pela direita
  assert.ok(j.x >= centro(4));
  assert.deepEqual(m.gotas[0].passantes, [], 'perdeu o passe ao sair');
  avancar(m, 40, [e('esq')]);
  assert.equal(j.x, centro(4), 'para no centro da casa vizinha: a gota agora é parede');
});

test('enquanto ainda encosta na gota, pode voltar para cima dela', () => {
  const m = mapa(...SALA);
  const j = m.jogadores[0];
  posicionar(m, 0, centro(3), centro(1));
  passo(m, [e('bomba')]);
  avancar(m, 8, [e('dir')]); // anda menos de uma casa
  avancar(m, 8, [e('esq')]);
  assert.equal(j.x, centro(3));
});

test('outro competidor encostado na casa na hora também pode sair de cima', () => {
  const m = mapa(
    '#######',
    '#1.2..#',
    '#######',
  );
  posicionar(m, 0, centro(2), centro(1));
  posicionar(m, 1, centro(2) + 600, centro(1)); // encostado na casa 2
  passo(m, [e('bomba')]);
  assert.deepEqual(m.gotas[0].passantes, [0, 1]);
  const longe = mapa('#######', '#1..2.#', '#######');
  posicionar(longe, 0, centro(2), centro(1));
  passo(longe, [e('bomba')]);
  assert.deepEqual(longe.gotas[0].passantes, [0], 'quem está longe não ganha passe');
  avancar(longe, 60, [e('dir'), e('esq')]);
  assert.equal(longe.jogadores[1].x, centro(3), 'e não atravessa a gota');
});

test('gota bloqueia a passagem de quem chega de fora', () => {
  const m = mapa('########', '#1...2.#', '########');
  posicionar(m, 0, centro(3), centro(1));
  passo(m, [e('bomba')]);
  avancar(m, 30, [e('esq'), e('esq')]);
  assert.equal(m.jogadores[1].x, centro(4));
});

test('quem foi encharcado não solta gota', () => {
  const m = mapa(...SALA);
  m.jogadores[0].vivo = false;
  passo(m, [e('bomba')]);
  assert.equal(m.gotas.length, 0);
});
