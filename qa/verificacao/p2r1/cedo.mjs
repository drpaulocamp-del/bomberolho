import { Jogo } from '../../../bomberolho/js/jogo.js';
for (const [s, ar] of [[53,'caverna'],[27,'vale'],[118,'caverna']]) {
  const jg = new Jogo(); jg.iniciar({ semente: s, arena: ar, dificuldade: 'facil', rodadas: 1 });
  jg.substitutas[0] = {};
  while (jg.mundo.jogadores[0].vivo && jg.mundo.tick < 2000) {
    jg.tick();
    for (const e of jg.mundo.eventos) if (e.tipo === 'gota' && e.dono !== 0) { const r = jg.robos[e.dono]; console.log(ar, 't', ((jg.mundo.tick-180)/60).toFixed(1), 'gota de', e.dono, 'em', e.col, e.lin, 'motivo', r.motivo); }
  }
  const j = jg.mundo.jogadores[0]; console.log(ar, s, 'humano molhado t', ((j.eliminadoEm-180)/60).toFixed(1), 'por', j.eliminadoPor);
}
