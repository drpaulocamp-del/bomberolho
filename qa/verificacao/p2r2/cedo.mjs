// P2R2: segurança da largada no Fácil (3.2). O humano fica PARADO no próprio
// canto; mede quando ele é molhado pela primeira vez, por arena, em muitas
// sementes. Antes (P2R1): na Caverna, sementes 53 e 118, molhado aos 6,0 s.
// Uso: node qa/verificacao/p2r2/cedo.mjs [sementes=40] [nivel=facil]
import { Jogo } from '../../../bomberolho/js/jogo.js';
import { ORDEM_ARENAS } from '../../../bomberolho/js/sim/arenas.js';

const N = Number(process.argv[2] || 40);
const nivel = process.argv[3] || 'facil';
const linhas = [];
for (const arena of ORDEM_ARENAS) {
  const tempos = [];
  for (const s of [53, 118, ...Array.from({ length: N - 2 }, (_, k) => 1000 + k * 37)]) {
    const jg = new Jogo();
    jg.iniciar({ semente: s, arena, dificuldade: nivel, rodadas: 1 });
    jg.substitutas[0] = {}; // humano parado
    const m = jg.mundo;
    while (m.jogadores[0].vivo && m.fase !== 'fim' && m.tick < 180 + 60 * 60) jg.tick();
    const j = m.jogadores[0];
    tempos.push(j.vivo ? Infinity : (j.eliminadoEm - 180) / 60);
  }
  tempos.sort((a, b) => a - b);
  const antes = (t) => tempos.filter((x) => x < t).length;
  linhas.push(`| ${arena} | ${tempos.length} | ${tempos[0] === Infinity ? '—' : tempos[0].toFixed(1) + ' s'} | ${antes(10)} | ${antes(20)} | ${antes(30)} |`);
}
console.log(`Nível ${nivel}, humano parado no canto 0\n`);
console.log('| Arena | Sementes | Primeira molhada (mín.) | Molhado antes de 10 s | antes de 20 s | antes de 30 s |');
console.log('|---|---|---|---|---|---|');
console.log(linhas.join('\n'));
