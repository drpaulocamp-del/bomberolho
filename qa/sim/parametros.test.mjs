import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerParametros } from '../../bomberolho/js/parametros.js';
import { sementeDeTexto } from '../../bomberolho/js/sim/aleatorio.js';

test('padrões sem parâmetros', () => {
  assert.deepEqual(lerParametros(''), { arena: 'jardim', dificuldade: 'facil', semente: null, demo: false, personagem: null, escala: 1, rodadas: 2, ajuste: false, densidade: null, toque: null });
});

test('lê ?arena=, ?dificuldade=, ?semente=, ?demo=1, ?personagem=, ?escala=', () => {
  const p = lerParametros('?arena=jardim&dificuldade=dificil&semente=123&demo=1&personagem=retina&escala=2');
  assert.deepEqual(p, { arena: 'jardim', dificuldade: 'dificil', semente: 123, demo: true, personagem: 'retina', escala: 2, rodadas: 2, ajuste: false, densidade: null, toque: null });
});

test('valores inválidos caem no padrão em silêncio', () => {
  const p = lerParametros('?arena=lua&dificuldade=impossivel&demo=talvez&personagem=xyz&escala=-3&rodadas=9&ajuste=talvez');
  assert.deepEqual(p, { arena: 'jardim', dificuldade: 'facil', semente: null, demo: false, personagem: null, escala: 1, rodadas: 2, ajuste: false, densidade: null, toque: null });
});

test('semente em texto vira número estável', () => {
  assert.equal(lerParametros('?semente=clinica').semente, sementeDeTexto('clinica'));
  assert.equal(sementeDeTexto('clinica'), sementeDeTexto('clinica'));
  assert.notEqual(sementeDeTexto('clinica'), sementeDeTexto('clínica'));
  assert.equal(sementeDeTexto('42'), 42);
});

test('parte 2: ?arena= aceita as cinco arenas, ?rodadas=1..3 e ?ajuste=1 abre a bancada', () => {
  for (const a of ['jardim', 'lago', 'caverna', 'vale', 'consultorio']) assert.equal(lerParametros(`?arena=${a}`).arena, a);
  assert.equal(lerParametros('?rodadas=3').rodadas, 3);
  assert.equal(lerParametros('?rodadas=1').rodadas, 1);
  assert.equal(lerParametros('?ajuste=1').ajuste, true);
  assert.equal(lerParametros('?ajuste=0').ajuste, false);
});

test('parte 4: ?toque=1/0 força os controles de toque; ?densidade= fixa a nitidez (1 a 3)', () => {
  assert.equal(lerParametros('?toque=1').toque, true);
  assert.equal(lerParametros('?toque=0').toque, false);
  assert.equal(lerParametros('').toque, null);
  assert.equal(lerParametros('?densidade=1.5').densidade, 1.5);
  assert.equal(lerParametros('?densidade=9').densidade, null);
  assert.equal(lerParametros('?densidade=abc').densidade, null);
});
