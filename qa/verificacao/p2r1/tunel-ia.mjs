// Verificador P2R1: robôs se escondem no túnel? Onde estão os sobreviventes nos empates por tempo na Caverna.
import { Jogo } from '../../../bomberolho/js/jogo.js';
const nivel = process.argv[2] || 'dificil';
let empates = 0, noTunel = 0, rodadas = 0, tempoNoTunel = 0, ticksVivos = 0;
for (let s = 1; s <= 12; s++) {
  const jg = new Jogo(); jg.demo = true;
  jg.iniciar({ semente: s * 77, arena: 'caverna', dificuldade: nivel, rodadas: 1 });
  while (!jg.partida.encerrada) {
    jg.tick();
    const m = jg.mundo;
    if (m.fase === 'jogando') for (const j of m.jogadores) if (j.vivo) { ticksVivos++; const c = Math.floor(j.x / 1000); if (c === 0 || c === 14) tempoNoTunel++; }
    if (m.fase === 'fim' && jg.registrada && !jg._contada) {
      jg._contada = true; rodadas++;
      if (m.tempoEsgotado) {
        empates++;
        const vivos = m.jogadores.filter((j) => j.vivo);
        const t = vivos.filter((j) => { const c = Math.floor(j.x / 1000); return c === 0 || c === 14; });
        noTunel += t.length ? 1 : 0;
        console.log('semente', s * 77, 'empate; vivos', vivos.map((j) => [j.id, (j.x / 1000).toFixed(2), (j.y / 1000).toFixed(2)]));
      }
    }
  }
}
console.log({ nivel, rodadas, empates, empatesComAlguemNoTunel: noTunel, fracTicksNoTunel: (tempoNoTunel / ticksVivos).toFixed(4) });
