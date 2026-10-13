import { Jogo } from '../../bomberolho/js/jogo.js';
import { criarMundo, passo } from '../../bomberolho/js/sim/mundo.js';
const E = (...t) => { const r = { cima: false, baixo: false, esq: false, dir: false, bomba: false }; for (const k of t) r[k] = true; return r; };
// Cadeia controlada: gota A (col 1) e gota B (col 3, solta ~1 s depois, pavio maior, outro dono).
const m = criarMundo({ semente: 1, mapa: ['#########', '#1.2....#', '#.#.#.#.#', '#.......#', '#########'] });
passo(m, [E('bomba'), E()]);
for (let k = 0; k < 60; k++) passo(m, [E('baixo'), E()]);
passo(m, [E(), E('bomba')]);
for (let k = 0; k < 40; k++) passo(m, [E('baixo'), E('baixo')]);
const antes = m.gotas.map((g) => ({ id: g.id, col: g.col, pavio: g.pavio }));
while (m.gotas.length === 2) passo(m, [E(), E()]);
console.log('controlada', JSON.stringify({ antes, tick: m.tick, gotas: m.gotas.length, respingos: m.respingos.map((r) => ({ col: r.col, t: r.t, cadeia: r.cadeia, bracos: r.bracos })) }));
// Procura cadeias em partidas de robôs
let achou = 0;
for (let s = 1; s <= 200 && achou < 3; s++) {
  const jg = new Jogo().iniciar({ semente: s, dificuldade: 'dificil' }); jg.demo = true;
  for (let t = 0; t < 7200 && jg.mundo.fase !== 'fim'; t++) {
    const prev = jg.mundo.gotas.map((g) => ({ ...g }));
    jg.tick();
    const ch = jg.mundo.respingos.filter((r) => r.cadeia && r.t === 30);
    if (ch.length) { achou++; console.log('robos', s, jg.mundo.tick, JSON.stringify(ch.map((r) => ({ col: r.col, lin: r.lin, pavioAnterior: prev.find((g) => g.col === r.col && g.lin === r.lin)?.pavio })))); break; }
  }
}
