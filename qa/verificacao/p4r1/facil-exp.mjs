// Experimento: perfil "criança" (lote/crianca.mjs) contra variações do Fácil.
// Uso: node qa/verificacao/p4r1/facil-exp.mjs [n]
import { jogarPartida } from '../../lote/partida.mjs';
import { NIVEIS } from '../../../bomberolho/js/ia/robo.js';
import { ORDEM_ARENAS } from '../../../bomberolho/js/sim/arenas.js';
const N = Number(process.argv[2] || 40);
// [nível dos robôs, dificuldade da partida (decide o aperto: 'facil' = suave)]
const variantes = {
  'Fácil, aperto suave': [NIVEIS.facil, 'facil'],
  'Fácil, aperto normal': [NIVEIS.facil, 'medio'],
  'Fácil sem poupar, aperto normal (parte 3)': [{ ...NIVEIS.facil, poupaHumano: false }, 'medio'],
};
for (const [nome, [nivel, dificuldade]] of Object.entries(variantes)) {
  let empates = 0;
  let tacas = 0; let rodadas = 0; let ganhas = 0; const causas = {};
  for (let k = 0; k < N; k++) {
    const canto = k % 4;
    const niveis = [nivel, nivel, nivel, nivel].map((n, i) => (i === canto ? 'crianca' : n));
    const r = jogarPartida({ cenario: 'x', crianca: canto, dificuldade, arena: ORDEM_ARENAS[k % 5], niveis, semente: 5000 + k, rodadas: 2 });
    if (r.campeao === canto) tacas++;
    for (const ro of r.rodadas) {
      rodadas++; if (ro.vencedor === canto) ganhas++; if (ro.vencedor === null) empates++;
      for (const q of ro.quedas) if (q.jogador === canto) { const c = q.motivo === 'propria' ? 'propria' : q.por === null ? 'aperto' : 'rival'; causas[c] = (causas[c] || 0) + 1; }
    }
  }
  console.log(nome, `taças ${(100 * tacas / N).toFixed(0)}%`, `rodadas ${(100 * ganhas / rodadas).toFixed(0)}%`, `empates ${(100 * empates / rodadas).toFixed(0)}%`, JSON.stringify(causas));
}
