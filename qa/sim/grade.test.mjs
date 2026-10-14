import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarMundo, K } from './ajuda.mjs';
import { casasDeLargada, distribuirItens, gerarArena, gradeDeTexto } from '../../bomberolho/js/sim/grade.js';
import { ARENAS } from '../../bomberolho/js/sim/arenas.js';
import { criarAleatorio } from '../../bomberolho/js/sim/aleatorio.js';

const SEMENTES = Array.from({ length: 200 }, (_, k) => k * 7919 + 3);

test('grade 15×13 com moldura completa e pilares nas casas pares', () => {
  const m = criarMundo({ semente: 1 });
  assert.equal(m.colunas, 15);
  assert.equal(m.linhas, 13);
  for (let l = 0; l < 13; l++) {
    for (let c = 0; c < 15; c++) {
      const t = m.grade[l * 15 + c];
      const borda = c === 0 || l === 0 || c === 14 || l === 12;
      if (borda) assert.equal(t, K.MOLDURA, `moldura em ${c},${l}`);
      else if (c % 2 === 0 && l % 2 === 0) assert.equal(t, K.PILAR, `pilar em ${c},${l}`);
      else assert.ok(t === K.VAZIO || t === K.BLOCO, `casa jogável em ${c},${l}`);
    }
  }
  assert.equal(m.grade.filter((t) => t === K.PILAR).length, 30);
});

test('o "L" de 3 casas de cada canto está sempre livre (200 sementes)', () => {
  const reservadas = casasDeLargada();
  assert.equal(reservadas.length, 12);
  for (const s of SEMENTES) {
    const m = criarMundo({ semente: s });
    for (const i of reservadas) assert.equal(m.grade[i], K.VAZIO, `semente ${s}, casa ${i}`);
  }
});

test('cada competidor nasce no seu canto, com saída para dois lados', () => {
  const m = criarMundo({ semente: 5 });
  const cantos = m.jogadores.map((j) => [Math.floor(j.x / 1000), Math.floor(j.y / 1000)]);
  assert.deepEqual(cantos, [[1, 1], [13, 1], [1, 11], [13, 11]]);
});

test('densidade de blocos entre 75% e 80% das casas livres fora dos cantos', () => {
  for (const s of SEMENTES) {
    const m = criarMundo({ semente: s });
    const livresForaDosCantos = 13 * 11 - 30 - 12;
    const blocos = m.grade.filter((t) => t === K.BLOCO).length;
    const d = blocos / livresForaDosCantos;
    assert.ok(d >= 0.75 && d <= 0.8, `semente ${s}: densidade ${d}`);
  }
});

// Parte 2: a mistura passou a incluir os itens avançados (tabela de cada arena);
// Frasquinho e Lupa continuam os mais frequentes, como o dono pediu.
test('itens escondidos: ~1/3 dos blocos, mistura fixa da arena, só debaixo de blocos', () => {
  for (const s of SEMENTES.slice(0, 50)) {
    const m = criarMundo({ semente: s });
    const blocos = m.grade.filter((t) => t === K.BLOCO).length;
    const ocultos = m.ocultos.map((t, i) => [t, i]).filter(([t]) => t);
    assert.equal(ocultos.length, Math.round(blocos * ARENAS.jardim.taxaItens));
    assert.ok(ocultos.length / blocos >= 0.3 && ocultos.length / blocos <= 0.36);
    for (const [, i] of ocultos) assert.equal(m.grade[i], K.BLOCO);
    const conta = (tipo) => ocultos.filter(([t]) => t === tipo).length;
    const esperado = distribuirItens(ARENAS.jardim.pesosItens, ocultos.length);
    for (const tipo of Object.keys(ARENAS.jardim.pesosItens)) assert.equal(conta(tipo), esperado.filter((t) => t === tipo).length, tipo);
    const mais = Math.max(...Object.keys(ARENAS.jardim.pesosItens).map(conta));
    assert.equal(conta('gota'), mais, 'Frasquinho entre os mais frequentes');
    assert.equal(conta('alcance'), mais, 'Lupa entre os mais frequentes');
    assert.ok(m.itens.every((t) => t === null), 'nenhum item exposto na largada');
  }
});

test('itens bem espalhados: em média, nenhum quadrante concentra mais de 40%', () => {
  const quadrantes = [0, 0, 0, 0];
  for (const s of SEMENTES) {
    const m = criarMundo({ semente: s });
    m.ocultos.forEach((t, i) => {
      if (!t) return;
      const c = i % 15;
      const l = Math.floor(i / 15);
      quadrantes[(c < 7.5 ? 0 : 1) + (l < 6.5 ? 0 : 2)]++;
    });
  }
  const total = quadrantes.reduce((a, b) => a + b, 0);
  for (const q of quadrantes) assert.ok(q / total < 0.4 && q / total > 0.15, `quadrantes ${quadrantes}`);
});

test('mesma semente gera a mesma arena; sementes diferentes, arenas diferentes', () => {
  const a = gerarArena(ARENAS.jardim, criarAleatorio(42));
  const b = gerarArena(ARENAS.jardim, criarAleatorio(42));
  const c = gerarArena(ARENAS.jardim, criarAleatorio(43));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.grade, c.grade);
  const distintas = new Set(SEMENTES.map((s) => criarMundo({ semente: s }).grade.join('')));
  assert.equal(distintas.size, SEMENTES.length);
});

test('distribuirItens reparte exatamente n itens proporcionais aos pesos', () => {
  assert.deepEqual(distribuirItens({ a: 1, b: 1 }, 3).length, 3);
  const r = distribuirItens({ gota: 4, alcance: 4, velocidade: 2 }, 25);
  assert.equal(r.filter((t) => t === 'velocidade').length, 5);
  assert.equal(distribuirItens({ x: 1 }, 0).length, 0);
});

test('gradeDeTexto entende moldura, pilar, bloco, itens e largadas', () => {
  const t = gradeDeTexto(['#####', '#1Ba#', '#.#G#', '#####']);
  assert.equal(t.grade[1 * 5 + 2], K.BLOCO);
  assert.equal(t.itens[1 * 5 + 3], 'alcance');
  assert.equal(t.grade[2 * 5 + 2], K.PILAR);
  assert.equal(t.grade[0], K.MOLDURA);
  assert.equal(t.ocultos[2 * 5 + 3], 'gota');
  assert.deepEqual(t.largadas[0], { col: 1, lin: 1 });
  assert.throws(() => gradeDeTexto(['##', '#']), /largura/);
  assert.throws(() => gradeDeTexto(['#?#']), /desconhecido/);
});
