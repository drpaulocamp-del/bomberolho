// Cascudo num beco: segurando o botão, virado para a saída, aguenta quantos respingos?
import { criarMundo, passo } from '../../../bomberolho/js/sim/mundo.js';
import { pegarItem } from '../../../bomberolho/js/sim/itens.js';
const m = criarMundo({ mapa: ['#######', '#1...2#', '#######'] });
const j = m.jogadores[0];
for (let k = 0; k < 10 && j.montaria?.tipo !== 'cascudo'; k++) pegarItem(m, j, 'estojo');
j.dir = 'dir';
const r = m.jogadores[1]; pegarItem(m, r, 'alcance'); pegarItem(m, r, 'alcance');
let defesas = 0;
for (let ciclo = 0; ciclo < 8; ciclo++) {
  r.x = 3500; passo(m, [{ acao: true }, { bomba: true }]); r.x = 5500;
  for (let t = 0; t < 200; t++) { passo(m, [{ acao: true }, {}]); defesas += m.eventos.filter((e) => e.tipo === 'defendeu' || e.tipo === 'carapaca').length; }
}
console.log({ tipo: j.montaria?.tipo, vivo: j.vivo, defesas, eventosTipos: 'ok' });
