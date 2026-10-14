import { criarMundo, passo } from '../../../bomberolho/js/sim/mundo.js';
import { pegarItem } from '../../../bomberolho/js/sim/itens.js';
for (const s of [1,2,3]) {
const m = criarMundo({ mapa: ['#######', '#1.2..#', '#.....#', '#######'], semente: s });
pegarItem(m, m.jogadores[0], 'cisco'); const t = m.jogadores[0].cisco.tipo;
let k = 0; while (!m.jogadores[1].cisco && k < 60) { passo(m, [{ dir: true }]); k++; }
let gotas = 0; for (let n = 0; n < 200; n++) { passo(m, []); }
console.log(s, t, 'contágio em', k, 'ticks; rival tem', m.jogadores[1].cisco?.tipo, 'vel após', m.jogadores[0].x);
}
