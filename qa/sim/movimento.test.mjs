import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapa, passo, avancar, e, centro, posicionar, sobreposicoesSolidas, criarMundo, K } from './ajuda.mjs';
import { criarAleatorio, inteiro } from '../../bomberolho/js/sim/aleatorio.js';

// Corredor com pilares nas casas pares, como a arena real.
const CORREDOR = [
  '#########',
  '#1......#',
  '#.#.#.#.#',
  '#.......#',
  '#.#.#.#.#',
  '#.......#',
  '#########',
];

test('movimento contínuo: anda a velocidade-base por tick, não casa a casa', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  passo(m, [e('dir')]);
  assert.equal(j.x, centro(1) + K.VELOCIDADE_BASE);
  assert.equal(j.y, centro(1));
  assert.equal(j.dir, 'dir');
  assert.equal(j.andando, true);
  avancar(m, 5, [e('dir')]);
  assert.equal(j.x, centro(1) + 6 * K.VELOCIDADE_BASE);
  passo(m, []);
  assert.equal(j.andando, false, 'soltou a tecla, parou na hora (sem inércia)');
});

test('para exatamente no centro da última casa antes da parede, sem atravessar', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  avancar(m, 300, [e('dir')]);
  assert.equal(j.x, centro(7));
  avancar(m, 300, [e('cima')]);
  assert.equal(j.y, centro(1), 'moldura de cima também segura');
});

test('empurrar um pilar alinhado não move e não atravessa', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  posicionar(m, 0, centro(2), centro(1)); // pilar logo abaixo em (2,2)
  avancar(m, 30, [e('baixo')]);
  assert.equal(j.x, centro(2));
  assert.equal(j.y, centro(1));
  assert.equal(j.dir, 'baixo', 'vira o rosto para onde tentou ir');
});

test('deslize de quina: levemente desalinhado para a direita, escorrega para o corredor', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  posicionar(m, 0, centro(2) + 300, centro(1)); // em cima do pilar (2,2), puxado para a coluna 3
  passo(m, [e('baixo')]);
  assert.equal(j.x, centro(2) + 300 + K.VELOCIDADE_BASE, 'primeiro escorrega de lado');
  assert.equal(j.y, centro(1));
  avancar(m, 40, [e('baixo')]);
  assert.equal(j.x, centro(3), 'termina alinhado à coluna livre');
  assert.ok(j.y > centro(2), 'e desce pelo corredor');
});

test('deslize de quina para o outro lado (esquerda) e no eixo horizontal', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  posicionar(m, 0, centro(2) - 200, centro(1));
  avancar(m, 40, [e('baixo')]);
  assert.equal(j.x, centro(1));
  assert.ok(j.y > centro(2));

  const m2 = mapa(...CORREDOR);
  const k = m2.jogadores[0];
  posicionar(m2, 0, centro(1), centro(2) + 250); // na coluna 1, ao lado do pilar (2,2)
  avancar(m2, 40, [e('dir')]);
  assert.equal(k.y, centro(3));
  assert.ok(k.x > centro(2));
});

test('deslize generoso: funciona mesmo com quase meia casa de desvio', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  posicionar(m, 0, centro(2) + 490, centro(1));
  avancar(m, 40, [e('baixo')]);
  assert.equal(j.x, centro(3));
  assert.ok(j.y > centro(2));
});

test('não desliza para um corredor que também está fechado', () => {
  const m = mapa(
    '#######',
    '#1....#',
    '#.##..#',
    '#.....#',
    '#######',
  );
  const j = m.jogadores[0];
  posicionar(m, 0, centro(2) + 300, centro(1)); // abaixo: (2,2) e (3,2) fechados
  avancar(m, 20, [e('baixo')]);
  assert.equal(j.x, centro(2) + 300);
  assert.equal(j.y, centro(1));
});

test('virar a esquina com duas teclas: segue reto até a abertura e entra nela', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  // Direita + baixo segurados: anda pela linha 1 e desce na primeira coluna livre (3).
  avancar(m, 60, [e('dir', 'baixo')]);
  assert.equal(j.x, centro(3));
  assert.ok(j.y > centro(2), `desceu (y=${j.y})`);
});

test('diagonal segurada anda em escadinha até o canto oposto, sem tremer', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  let voltas = 0;
  let antes = j.x;
  for (let t = 0; t < 400; t++) {
    passo(m, [e('dir', 'baixo')]);
    if (j.x < antes) voltas++; // nunca anda para a esquerda
    antes = j.x;
  }
  assert.equal(voltas, 0);
  assert.deepEqual([j.x, j.y], [centro(7), centro(5)]);
});

test('duas teclas nunca escorregam para o lado contrário ao desejado', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  posicionar(m, 0, centro(2) - 200, centro(1)); // puxado para a coluna 1, mas quer ir à direita
  j.dir = 'dir';
  passo(m, [e('dir', 'baixo')]);
  assert.ok(j.x > centro(2) - 200, 'foi para a direita, não para a esquerda');
});

test('teclas opostas se anulam', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  avancar(m, 10, [e('esq', 'dir')]);
  assert.equal(j.x, centro(1));
  assert.equal(j.andando, false);
});

test('Lágrima Veloz deixa mais rápido', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  j.velocidade = 2;
  passo(m, [e('dir')]);
  assert.equal(j.x, centro(1) + K.VELOCIDADE_BASE + 2 * K.VELOCIDADE_PASSO);
});

test('blocos também seguram o movimento', () => {
  const m = mapa(
    '######',
    '#1.B.#',
    '######',
  );
  avancar(m, 100, [e('dir')]);
  assert.equal(m.jogadores[0].x, centro(2));
});

test('propriedade: 30 000 ticks de teclas aleatórias nunca sobrepõem o corpo a algo sólido', () => {
  const m = criarMundo({ semente: 99 });
  const rng = criarAleatorio(7);
  const opcoes = [[], ['cima'], ['baixo'], ['esq'], ['dir'], ['dir', 'baixo'], ['cima', 'esq'], ['bomba'], ['dir', 'bomba']];
  let teclas = [];
  for (let t = 0; t < 30000; t++) {
    if (t % 9 === 0) teclas = m.jogadores.map(() => e(...opcoes[inteiro(rng, opcoes.length)]));
    passo(m, teclas);
    // Gotas e respingos ficam de fora deste teste: só interessa a colisão.
    m.gotas.length = 0;
    m.respingos.length = 0;
    for (const j of m.jogadores) {
      assert.deepEqual(sobreposicoesSolidas(m, j), [], `tick ${t}, jogador ${j.id} em ${j.x},${j.y}`);
      assert.ok(Number.isInteger(j.x) && Number.isInteger(j.y), 'posições sempre inteiras');
    }
  }
  // E eles de fato andaram bastante (não ficaram presos em quinas).
  const andaram = m.jogadores.filter((j) => j.x !== 1500 || j.y !== 1500).length;
  assert.ok(andaram >= 3);
});

test('em qualquer casa livre da arena, cada tecla leva a algum lugar ou é parede de verdade', () => {
  // Varre posições desalinhadas: se a casa vizinha (ou a do deslize) está livre, o jogador anda.
  const m = criarMundo({ semente: 3 });
  m.grade = m.grade.map((t) => (t === K.BLOCO ? K.VAZIO : t));
  const j = m.jogadores[0];
  for (let l = 1; l < 12; l++) {
    for (let c = 1; c < 14; c++) {
      if (m.grade[l * 15 + c] !== K.VAZIO) continue;
      for (const dx of [-300, 0, 300]) {
        for (const nome of ['cima', 'baixo', 'esq', 'dir']) {
          const x = centro(c) + (l % 2 === 1 ? dx : 0);
          const y = centro(l) + (l % 2 === 1 ? 0 : 0);
          if (sobreposicoesSolidas({ ...m, gotas: [] }, { id: 0, x, y }).length) continue;
          j.x = x;
          j.y = y;
          passo(m, [e(nome)]);
          const frente = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] }[nome];
          const livre = m.grade[(l + frente[1]) * 15 + c + frente[0]] === K.VAZIO;
          if (livre) assert.ok(j.x !== x || j.y !== y, `preso em ${c},${l} (dx ${dx}) indo ${nome}`);
        }
      }
    }
  }
});
