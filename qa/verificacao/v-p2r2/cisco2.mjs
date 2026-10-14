import { criarMundo, passo } from '../../../bomberolho/js/sim/mundo.js';
import { pegarItem } from '../../../bomberolho/js/sim/itens.js';
for (const s of [1, 2, 3, 4]) {
  const m = criarMundo({ mapa: ['#######', '#12...#', '#.....#', '#######'], semente: s });
  pegarItem(m, m.jogadores[0], 'cisco');
  const tipo = m.jogadores[0].cisco.tipo;
  m.jogadores[1].x = 2100;
  let trocas = 0, gotas = 0;
  for (let k = 0; k < 600; k++) { passo(m, []); trocas += m.eventos.filter((e) => e.tipo === 'cisco').length; }
  console.log(s, tipo, 'trocas em 10 s parados encostados:', trocas, 'vivos', m.jogadores.map((j) => j.vivo));
}
