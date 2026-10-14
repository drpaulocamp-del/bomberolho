// P2R2: os robôs ainda conseguem se esconder no túnel da Caverna? Mede, por
// nível, empates por tempo, empates com sobrevivente com o centro do corpo na
// moldura (coluna 0 ou 14) e a fração do tempo vivo na moldura.
// Antes (P2R1, 12 rodadas): Difícil 10 empates, 10 com alguém no túnel, 29% do tempo.
// Uso: node qa/verificacao/p2r2/tunel-ia.mjs [nivel=dificil] [rodadas=12]
import { Jogo } from '../../../bomberolho/js/jogo.js';

const nivel = process.argv[2] || 'dificil';
const R = Number(process.argv[3] || 12);
let empates = 0, noTunel = 0, rodadas = 0, ticksNaMoldura = 0, ticksVivos = 0, vencedores = 0;
for (let s = 1; s <= R; s++) {
  const jg = new Jogo(); jg.demo = true;
  jg.iniciar({ semente: s * 77, arena: 'caverna', dificuldade: nivel, rodadas: 1 });
  while (!jg.registrada) {
    jg.tick();
    const m = jg.mundo;
    if (m.fase === 'jogando') {
      for (const j of m.jogadores) {
        if (!j.vivo) continue;
        ticksVivos++;
        const c = Math.floor(j.x / 1000);
        if (c === 0 || c === 14) ticksNaMoldura++;
      }
    }
  }
  const m = jg.mundo;
  rodadas++;
  if (m.vencedor !== null) vencedores++;
  if (m.tempoEsgotado) {
    empates++;
    if (m.jogadores.some((j) => j.vivo && [0, 14].includes(Math.floor(j.x / 1000)))) noTunel++;
  }
}
console.log({ nivel, rodadas, comVencedor: vencedores, empatesNoRelogio: empates, empatesComAlguemNaMoldura: noTunel, fracaoDoTempoNaMoldura: (ticksNaMoldura / ticksVivos).toFixed(4) });
