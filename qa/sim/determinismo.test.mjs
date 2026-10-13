import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarMundo, passo } from './ajuda.mjs';
import { impressaoDigital, clonarMundo, retratar } from '../../bomberolho/js/sim/retrato.js';
import { criarAleatorio, inteiro } from '../../bomberolho/js/sim/aleatorio.js';
import { Jogo } from '../../bomberolho/js/jogo.js';

/** Roteiro de entradas pseudoaleatório (o mesmo para a mesma semente). */
function roteiro(semente, ticks) {
  const rng = criarAleatorio(semente);
  const nomes = ['cima', 'baixo', 'esq', 'dir'];
  const lista = [];
  let atual = [];
  for (let t = 0; t < ticks; t++) {
    if (t % 6 === 0) {
      atual = [0, 1, 2, 3].map(() => {
        const ent = { cima: false, baixo: false, esq: false, dir: false, bomba: inteiro(rng, 12) === 0 };
        ent[nomes[inteiro(rng, 4)]] = true;
        if (inteiro(rng, 4) === 0) ent[nomes[inteiro(rng, 4)]] = true;
        return ent;
      });
    }
    lista.push(atual);
  }
  return lista;
}

function rodar(semente, entradas) {
  const m = criarMundo({ semente });
  const hashes = [];
  for (const ent of entradas) {
    passo(m, ent);
    hashes.push(impressaoDigital(m));
  }
  return { m, hashes };
}

test('mesma semente + mesmas entradas = mesmo estado em todos os 6000 ticks', () => {
  const ent = roteiro(11, 6000);
  const a = rodar(2024, ent);
  const b = rodar(2024, ent);
  assert.deepEqual(a.hashes, b.hashes);
  assert.deepEqual(a.m, b.m);
  // E o roteiro de fato mexeu no mundo (gotas, respingos, blocos quebrados).
  const blocosAntes = criarMundo({ semente: 2024 }).grade.filter((t) => t === 3).length;
  assert.ok(a.m.grade.filter((t) => t === 3).length < blocosAntes);
});

test('semente diferente ou uma única entrada diferente muda o resultado', () => {
  const ent = roteiro(11, 1500);
  const base = rodar(5, ent).hashes.at(-1);
  assert.notEqual(rodar(6, ent).hashes.at(-1), base);
  const alterada = ent.map((x) => x.map((y) => ({ ...y })));
  alterada[3][0] = { cima: false, baixo: true, esq: false, dir: false, bomba: true };
  assert.notEqual(rodar(5, alterada).hashes.at(-1), base);
});

test('um mundo clonado no meio da partida segue idêntico ao original', () => {
  const ent = roteiro(3, 3000);
  const m = criarMundo({ semente: 77 });
  for (let t = 0; t < 1500; t++) passo(m, ent[t]);
  const copia = clonarMundo(m);
  const viaJson = JSON.parse(JSON.stringify(m)); // estado é só dado: serializável
  for (let t = 1500; t < 3000; t++) {
    passo(m, ent[t]);
    passo(copia, ent[t]);
    passo(viaJson, ent[t]);
  }
  assert.equal(impressaoDigital(copia), impressaoDigital(m));
  assert.equal(impressaoDigital(viaJson), impressaoDigital(m));
});

test('partida inteira com robôs é reprodutível pela semente (controlador + IA)', () => {
  const jogar = () => {
    const jogo = new Jogo();
    jogo.demo = true;
    jogo.iniciar({ semente: 4242, dificuldade: 'medio' });
    const marcos = [];
    for (let k = 0; k < 40; k++) {
      jogo.passos(100);
      marcos.push(jogo.impressao());
    }
    return { marcos, retrato: retratar(jogo.mundo) };
  };
  const a = jogar();
  const b = jogar();
  assert.deepEqual(a.marcos, b.marcos);
  assert.deepEqual(a.retrato, b.retrato);
});

test('o retrato é uma cópia: mexer nele não altera o mundo', () => {
  const m = criarMundo({ semente: 1 });
  const h = impressaoDigital(m);
  const r = retratar(m);
  r.jogadores[0].x = 99;
  r.grade[1] = 'xxx';
  assert.equal(impressaoDigital(m), h);
});
