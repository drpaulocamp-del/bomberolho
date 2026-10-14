import { Jogo } from '../../../bomberolho/js/jogo.js';
import { pegarItem } from '../../../bomberolho/js/sim/itens.js';
const j = new Jogo(); j.iniciar({ semente: 5, arena: 'jardim', contagem: false }); for (const i of [1, 2, 3]) j.substitutas[i] = {};
const m = j.mundo; const p = m.jogadores[0]; pegarItem(m, p, 'chute');
for (let c = 1; c < 14; c++) { m.grade[m.colunas + c] = 0; m.itens[m.colunas + c] = null; }
const E = (e) => { j.substitutas[0] = { cima: false, baixo: false, esq: false, dir: false, bomba: false, acao: false, ...e }; };
const r = () => j.retrato();
E({ dir: true }); while (r().jogadores[0].x < 5.5) j.passos(1); E({}); j.passos(2);
E({ bomba: true }); j.passos(1); E({ dir: true }); while (r().jogadores[0].x < 8.5) j.passos(1); E({}); j.passos(3);
const antes = r().gotas.map((g) => g.col);
E({ esq: true }); const traj = [];
for (let t = 0; t < 60; t++) { j.passos(1); const g = r().gotas[0]; traj.push(`${g.col}${g.deslizando ? '<' : ''}`); }
console.log({ gotaAntes: antes, jogadorX: r().jogadores[0].x, traj: traj.join(' ') });
