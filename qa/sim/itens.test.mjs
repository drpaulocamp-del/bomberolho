import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapa, passo, avancar, e, centro, posicionar, K } from './ajuda.mjs';
import { aplicarItem, ITENS } from '../../bomberolho/js/sim/itens.js';

test('pegar itens: Frasquinho (+1 gota), Lupa (+1 alcance), Lágrima Veloz (+velocidade)', () => {
  const m = mapa('########', '#1gav..#', '########');
  const j = m.jogadores[0];
  avancar(m, 80, [e('dir')]);
  assert.deepEqual([j.gotas, j.alcance, j.velocidade], [2, 3, 1]);
  assert.ok(m.itens.every((t) => t === null), 'itens somem ao serem pegos');
});

test('o item é pego quando o centro do corpo entra na casa', () => {
  const m = mapa('######', '#1.g.#', '######');
  const j = m.jogadores[0];
  posicionar(m, 0, centro(3) - 520, centro(1));
  passo(m);
  assert.equal(j.gotas, 1, 'ainda não');
  passo(m, [e('dir')]);
  assert.equal(j.gotas, 2);
  assert.ok(m.eventos.some((ev) => ev.tipo === 'item' && ev.item === 'gota' && ev.mudou));
});

test('limites máximos por atributo são respeitados', () => {
  const j = { gotas: 1, alcance: 2, velocidade: 0 };
  for (let k = 0; k < 20; k++) {
    aplicarItem(j, 'gota');
    aplicarItem(j, 'alcance');
    aplicarItem(j, 'velocidade');
  }
  assert.deepEqual(j, { gotas: K.LIMITES.gotas, alcance: K.LIMITES.alcance, velocidade: K.LIMITES.velocidade });
  assert.equal(aplicarItem(j, 'gota'), false, 'no limite, o item não muda nada');
  assert.equal(aplicarItem(j, 'inexistente'), false);
});

test('velocidade máxima continua controlável (menos de 1/10 de casa por tick)', () => {
  const max = K.VELOCIDADE_BASE + K.LIMITES.velocidade * K.VELOCIDADE_PASSO;
  assert.ok(max < K.CASA / 10);
});

test('cada item tem nome em português e atributo válido', () => {
  for (const [id, def] of Object.entries(ITENS)) {
    assert.ok(def.nome.length > 2, id);
    assert.ok(['gotas', 'alcance', 'velocidade'].includes(def.atributo), id);
  }
});

test('Lupa aumenta o alcance das gotas soltas depois', () => {
  const m = mapa('###########', '#1a.......#', '###########');
  avancar(m, 20, [e('dir')]);
  passo(m, [e('bomba')]);
  assert.equal(m.gotas[0].alcance, 3);
});
