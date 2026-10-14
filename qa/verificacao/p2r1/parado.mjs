// Verificador P2R1: humano parado no canto — quando é molhado em cada nível? Robôs ficam parados?
import { Jogo } from '../../../bomberolho/js/jogo.js';
for (const nivel of ['facil', 'medio', 'dificil']) {
  const mortes = []; let maxParado = 0; const longos = [];
  for (let s = 1; s <= 20; s++) {
    const jg = new Jogo();
    jg.iniciar({ semente: s * 13 + 1, arena: ['jardim','lago','vale','consultorio','caverna'][s % 5], dificuldade: nivel, rodadas: 1 });
    jg.substitutas[0] = { cima: false, baixo: false, esq: false, dir: false, bomba: false, acao: false };
    const parado = [0, 0, 0, 0]; const ant = jg.mundo.jogadores.map((j) => [j.x, j.y]);
    let t = 0;
    while (!jg.partida.encerrada && jg.mundo.fase !== 'fim') {
      jg.tick(); t++;
      const m = jg.mundo;
      if (m.fase !== 'jogando') continue;
      m.jogadores.forEach((j, i) => {
        if (i === 0 || !j.vivo) return;
        if (j.x === ant[i][0] && j.y === ant[i][1]) { parado[i]++; if (parado[i] > maxParado) maxParado = parado[i]; if (parado[i] === 300) longos.push([m.arena, i, (j.x/1000).toFixed(1), (j.y/1000).toFixed(1), Math.round(m.tempoRestante/60)]); } else parado[i] = 0;
        ant[i] = [j.x, j.y];
      });
      if (!m.jogadores[0].vivo && mortes.length < s) { mortes.push(((m.tick - m.inicioJogo) / 60).toFixed(1)); }
    }
    if (mortes.length < s) mortes.push('vivo');
  }
  console.log(nivel, 'humano parado molhado em (s):', mortes.join(' '), '| máx parado robô (s)', (maxParado / 60).toFixed(1), 'parados ≥5s:', JSON.stringify(longos.slice(0, 8)), longos.length);
}
