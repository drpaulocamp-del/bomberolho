// Verificador TODO R1: quanto tempo a criança fica ASSISTINDO depois de cair,
// e quanto dura uma partida padrão (2 troféus) contra o Fácil.
// Uso: cd qa && node verificacao/v-todo-r1/espera.mjs [n]
import { jogarPartida } from '../../lote/partida.mjs';
import { ORDEM_ARENAS } from '../../../bomberolho/js/sim/arenas.js';
const n = Number(process.argv[2] || 60);
for (const perfil of ['crianca', 'novato']) {
  const esperas = [], durPartida = [], rodadasN = []; let taca = 0, rodadasComQueda = 0, rodadasTot = 0, ganhouRodada = 0;
  for (let k = 0; k < n; k++) {
    const canto = k % 4;
    const niveis = ['facil', 'facil', 'facil', 'facil']; niveis[canto] = perfil;
    const spec = { cenario: perfil, proxy: canto, dificuldade: 'facil', arena: ORDEM_ARENAS[k % 5], niveis, semente: 900000 + k, rodadas: 2 };
    if (perfil === 'crianca') spec.crianca = canto;
    const r = jogarPartida(spec);
    let total = 0;
    for (const rd of r.rodadas) {
      rodadasTot++; total += rd.segundos;
      if (rd.vencedor === canto) ganhouRodada++;
      const q = rd.quedas.find((x) => x.jogador === canto);
      if (q) { rodadasComQueda++; const caiuEm = (7200 - q.restante) / 60; esperas.push(Math.max(0, rd.segundos - caiuEm)); }
    }
    durPartida.push(total + r.rodadas.length * 3.5 + 3.5 * r.rodadas.length); // contagem ~3,5 s + intervalo ~? (aprox.)
    rodadasN.push(r.rodadas.length);
    if (r.campeao === canto) taca++;
  }
  esperas.sort((a, b) => a - b); durPartida.sort((a, b) => a - b);
  const med = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const pct = (a, p) => a[Math.floor(p * (a.length - 1))];
  console.log(JSON.stringify({
    perfil, partidas: n, taca: (100 * taca / n).toFixed(1) + '%', rodadaGanha: (100 * ganhouRodada / rodadasTot).toFixed(1) + '%',
    rodadasPorPartida: med(rodadasN).toFixed(2), caiuEm: (100 * rodadasComQueda / rodadasTot).toFixed(1) + '% das rodadas',
    assistindo_s: { media: med(esperas).toFixed(1), mediana: pct(esperas, 0.5).toFixed(1), p90: pct(esperas, 0.9).toFixed(1), acima30s: (100 * esperas.filter((e) => e > 30).length / esperas.length).toFixed(0) + '%', acima60s: (100 * esperas.filter((e) => e > 60).length / esperas.length).toFixed(0) + '%' },
    partida_min_aprox: { mediana: (pct(durPartida, 0.5) / 60).toFixed(1), p90: (pct(durPartida, 0.9) / 60).toFixed(1), max: (durPartida.at(-1) / 60).toFixed(1) },
  }));
}
