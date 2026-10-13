import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapa, passo, avancar, e, centro, posicionar, K } from './ajuda.mjs';
import { casasDoRespingo, casasLetais } from '../../bomberolho/js/sim/respingo.js';
import { soltarGota } from '../../bomberolho/js/sim/gotas.js';

/**
 * Solta (sem passar tempo) uma gota do jogador 0 em (col, lin) e o devolve ao
 * canto (1,1), para ele não se molhar sem querer.
 */
function gotaEm(m, col, lin, alcance = 2) {
  const j = m.jogadores[0];
  j.alcance = alcance;
  j.gotas = 9;
  posicionar(m, 0, centro(col), centro(lin));
  const g = soltarGota(m, j);
  g.passantes = [];
  posicionar(m, 0, centro(1), centro(1));
  return g;
}

function estourarJa(m, g) {
  g.pavio = 1;
  passo(m);
}

const casas = (m, r) => casasDoRespingo(m, r).map((i) => `${i % m.colunas},${Math.floor(i / m.colunas)}`).sort();

test('respingo em cruz com o alcance da gota, atravessando casas vazias', () => {
  const m = mapa(
    '###########',
    '#1........#',
    '#.........#',
    '#.........#',
    '#.........#',
    '#.........#',
    '###########',
  );
  const g = gotaEm(m, 5, 3, 2);
  estourarJa(m, g);
  const r = m.respingos[0];
  assert.deepEqual(r.bracos, { cima: 2, baixo: 2, esq: 2, dir: 2 });
  assert.deepEqual(casas(m, r), ['3,3', '4,3', '5,1', '5,2', '5,3', '5,4', '5,5', '6,3', '7,3'].sort());
});

test('para em pilar e na moldura (não molha atrás deles)', () => {
  const m = mapa(
    '#########',
    '#1......#',
    '#.#.#.#.#',
    '#.......#',
    '#########',
  );
  const g = gotaEm(m, 3, 1, 5);
  estourarJa(m, g);
  const r = m.respingos[0];
  assert.equal(r.bracos.cima, 0, 'moldura logo acima');
  assert.equal(r.bracos.baixo, 2, 'desce pela coluna livre até a moldura');
  assert.equal(r.bracos.esq, 2);
  assert.equal(r.bracos.dir, 4);
  const m2 = mapa('#########', '#1......#', '#.#.#.#.#', '#.......#', '#########');
  const g2 = gotaEm(m2, 2, 1, 5);
  estourarJa(m2, g2);
  assert.equal(m2.respingos[0].bracos.baixo, 0, 'pilar em (2,2) segura o braço de baixo');
});

test('só o primeiro bloco de cada braço é destruído', () => {
  const m = mapa(
    '###########',
    '#1..BB.B..#',
    '###########',
  );
  const g = gotaEm(m, 3, 1, 8);
  estourarJa(m, g);
  const r = m.respingos[0];
  assert.equal(r.bracos.dir, 0, 'o bloco vizinho para o braço');
  assert.equal(r.batida.dir, true);
  assert.equal(m.grade[1 * 11 + 4], K.QUEBRANDO, 'primeiro bloco começa a se desfazer');
  assert.equal(m.grade[1 * 11 + 5], K.BLOCO, 'o segundo fica');
  assert.equal(m.grade[1 * 11 + 7], K.BLOCO, 'o de mais longe também');
});

test('bloco quebrando continua sólido e segura outros respingos; depois some', () => {
  const m = mapa(
    '###########',
    '#1.....B..#',
    '###########',
  );
  const a = gotaEm(m, 5, 1, 3);
  estourarJa(m, a);
  assert.equal(m.grade[1 * 11 + 7], K.QUEBRANDO);
  // Segunda gota do outro lado, estourando enquanto o bloco quebra: não passa.
  const b = gotaEm(m, 9, 1, 4);
  estourarJa(m, b);
  const rb = m.respingos.find((r) => r.col === 9);
  assert.equal(rb.bracos.esq, 1, 'parou no bloco que já está quebrando');
  avancar(m, K.DURACAO_QUEBRA);
  assert.equal(m.grade[1 * 11 + 7], K.VAZIO);
});

test('duração letal: molha durante todo o respingo (≈0,5 s) e depois seca', () => {
  assert.ok(K.DURACAO_RESPINGO >= 24 && K.DURACAO_RESPINGO <= 36);
  for (const atraso of [0, 10, K.DURACAO_RESPINGO - 1]) {
    const m = mapa('##########', '#1......2#', '##########');
    const g = gotaEm(m, 5, 1, 2);
    estourarJa(m, g);
    avancar(m, atraso);
    // O jogador 1 aparece direto em cima da casa molhada.
    posicionar(m, 1, centro(6), centro(1));
    passo(m);
    if (atraso + 1 < K.DURACAO_RESPINGO) assert.equal(m.jogadores[1].vivo, false, `ainda molhado após ${atraso} ticks`);
  }
  const m = mapa('##########', '#1......2#', '##########');
  const g = gotaEm(m, 5, 1, 2);
  estourarJa(m, g);
  avancar(m, K.DURACAO_RESPINGO);
  assert.equal(m.respingos.length, 0, 'respingo acabou');
  posicionar(m, 1, centro(6), centro(1));
  passo(m);
  assert.equal(m.jogadores[1].vivo, true, 'seco: pode passar');
});

test('competidor dentro da cruz é encharcado; fora dela, não', () => {
  const m = mapa(
    '#########',
    '#1....2.#',
    '#.#.#.#.#',
    '#3....4.#',
    '#########',
  );
  const g = gotaEm(m, 3, 1, 3);
  posicionar(m, 0, centro(7), centro(3)); // dono fora do alcance
  estourarJa(m, g);
  assert.equal(m.jogadores[1].vivo, false, 'jogador 1 a 3 casas na linha');
  assert.equal(m.jogadores[2].vivo, true, 'jogador 2 na diagonal, salvo');
  assert.equal(m.jogadores[3].vivo, true);
  assert.equal(m.jogadores[1].eliminadoPor, 0);
  assert.ok(m.eventos.some((ev) => ev.tipo === 'encharcado' && ev.jogador === 1));
});

test('vale a casa do centro do corpo: com o pé na beira do respingo, escapa', () => {
  const m = mapa('#########', '#1.....2#', '#########');
  const g = gotaEm(m, 3, 1, 2); // molha até a coluna 5
  posicionar(m, 1, centro(6) - 450, centro(1)); // corpo encosta na 5, centro na 6
  estourarJa(m, g);
  assert.equal(m.jogadores[1].vivo, true);
});

test('cadeia imediata: a gota atingida estoura no mesmo tick', () => {
  const m = mapa(
    '#############',
    '#1..........#',
    '#############',
  );
  const a = gotaEm(m, 3, 1, 2);
  const b = gotaEm(m, 5, 1, 2);
  const c = gotaEm(m, 7, 1, 2);
  const d = gotaEm(m, 10, 1, 2); // fora do alcance de c
  b.pavio = 999;
  c.pavio = 999;
  d.pavio = 999;
  estourarJa(m, a);
  assert.deepEqual(m.respingos.map((r) => r.col).sort((x, y) => x - y), [3, 5, 7], 'a → b → c no mesmo tick');
  assert.deepEqual(m.gotas.map((g) => g.col), [10]);
  assert.equal(m.respingos.filter((r) => r.cadeia).length, 2);
  // O braço que atinge outra gota termina nela.
  assert.equal(m.respingos.find((r) => r.col === 3).bracos.dir, 2);
});

test('cadeia também por gota com pavio mais longo de outro dono', () => {
  const m = mapa('#########', '#1......#', '#.#.#.#.#', '#......2#', '#########');
  const a = gotaEm(m, 3, 1, 2);
  const b = gotaEm(m, 3, 3, 2);
  b.dono = 1;
  b.pavio = 120;
  estourarJa(m, a);
  assert.equal(m.gotas.length, 0);
  assert.equal(m.respingos.length, 2);
  assert.ok(m.respingos.some((r) => r.dono === 1 && r.cadeia));
});

test('gota solta numa casa ainda molhada estoura na hora', () => {
  const m = mapa('#########', '#1......#', '#########');
  const a = gotaEm(m, 4, 1, 1);
  estourarJa(m, a);
  const b = gotaEm(m, 5, 1, 1); // casa 5 está molhada pelo respingo de a
  assert.equal(b.col, 5);
  passo(m);
  assert.equal(m.gotas.length, 0, 'não ficou parada');
  assert.equal(m.respingos.length, 2);
});

test('respingo destrói itens expostos (e o braço continua depois deles)', () => {
  const m = mapa('##########', '#1..ga..v#', '##########');
  const g = gotaEm(m, 3, 1, 4);
  estourarJa(m, g);
  assert.equal(m.itens[1 * 10 + 4], null);
  assert.equal(m.itens[1 * 10 + 5], null);
  assert.equal(m.itens[1 * 10 + 8], 'velocidade', 'fora do alcance, sobrevive');
  assert.equal(m.respingos[0].bracos.dir, 4);
  assert.equal(m.eventos.filter((ev) => ev.tipo === 'itemQueimado').length, 2);
});

test('item escondido aparece quando o bloco termina de quebrar e não é queimado pelo mesmo respingo', () => {
  const m = mapa('########', '#1..G..#', '########');
  const g = gotaEm(m, 3, 1, 1);
  estourarJa(m, g);
  assert.equal(m.itens[1 * 8 + 4], null, 'ainda escondido enquanto quebra');
  avancar(m, K.DURACAO_QUEBRA);
  assert.equal(m.grade[1 * 8 + 4], K.VAZIO);
  assert.equal(m.itens[1 * 8 + 4], 'gota');
  // Um respingo novo, depois, queima o item revelado.
  const h = gotaEm(m, 3, 1, 1);
  estourarJa(m, h);
  assert.equal(m.itens[1 * 8 + 4], null);
});

test('casasLetais reflete exatamente a união dos respingos ativos', () => {
  const m = mapa('#########', '#1......#', '#.#.#.#.#', '#.......#', '#########');
  estourarJa(m, gotaEm(m, 3, 1, 1));
  estourarJa(m, gotaEm(m, 7, 3, 1));
  const letal = casasLetais(m);
  const molhadas = [...letal].map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  const esperado = new Set(m.respingos.flatMap((r) => casasDoRespingo(m, r)));
  assert.deepEqual(new Set(molhadas), esperado);
});
