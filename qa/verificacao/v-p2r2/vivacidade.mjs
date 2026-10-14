// Verificador P2R2 (independente): vivacidade e justiça da IA.
// Humano parado (ou em demo Fácil) contra cada nível em cada arena.
// Mede: tempo máximo de robô parado (mesma posição exata), "zanzar" (robô
// confinado a ≤ 2 casas por muito tempo), primeira molhada do humano parado,
// resultados da rodada e auto-eliminações.
// Uso: node vivacidade.mjs [modo=parado|demo] [sementes=8]
import { Jogo } from '../../../bomberolho/js/jogo.js';
const modo = process.argv[2] || 'parado';
const N = Number(process.argv[3] || 8);
const ARENAS = ['jardim', 'lago', 'caverna', 'vale', 'consultorio'];
const out = {};
for (const nivel of ['facil', 'medio', 'dificil']) {
  const r = { rodadas: 0, vencHumano: 0, vencRobo: 0, empate: 0, mortesHumano: [], maxParado: 0, piorParado: null, maxZanzar: 0, piorZanzar: null, robosProprias: 0, robosRodadas: 0, parados5s: 0, zanzar8s: 0 };
  for (const arena of ARENAS) for (let s = 1; s <= N; s++) {
    const jg = new Jogo();
    const semente = 1000 + s * 37 + arena.length;
    jg.iniciar({ semente, arena, dificuldade: nivel, rodadas: 1 });
    if (modo === 'parado') jg.substitutas[0] = { cima: false, baixo: false, esq: false, dir: false, bomba: false, acao: false };
    else jg.robos[0] = (await import('../../../bomberolho/js/ia/robo.js')).criarRobo(0, 'facil', semente), jg.demo = true;
    const ant = jg.mundo.jogadores.map((j) => [j.x, j.y]);
    const parado = [0, 0, 0, 0];
    const janela = [[], [], [], []];
    let morteH = null;
    while (!jg.registrada) {
      jg.tick();
      const m = jg.mundo;
      if (m.fase !== 'jogando') continue;
      m.jogadores.forEach((j, i) => {
        if (i === 0) { if (!j.vivo && morteH === null) morteH = (m.tick - (m.inicioJogo ?? 0)) / 60; return; }
        if (!j.vivo) { janela[i] = []; return; }
        if (j.x === ant[i][0] && j.y === ant[i][1]) {
          parado[i]++;
          if (parado[i] === 300) r.parados5s++;
          if (parado[i] > r.maxParado) { r.maxParado = parado[i]; r.piorParado = { arena, semente, i, x: j.x / 1000, y: j.y / 1000, relogio: Math.round(m.tempoRestante / 60), montaria: j.montaria?.tipo, grade: null }; }
        } else parado[i] = 0;
        ant[i] = [j.x, j.y];
        // zanzar: casas visitadas nos últimos 8 s
        const w = janela[i];
        w.push(Math.floor(j.y / 1000) * 15 + Math.floor(j.x / 1000));
        if (w.length > 480) w.shift();
        if (w.length === 480 && new Set(w).size <= 2) {
          // conta tempo confinado
          j._conf = (j._conf || 480) + 1;
          if (j._conf === 481) r.zanzar8s++;
          if (j._conf > r.maxZanzar) { r.maxZanzar = j._conf; r.piorZanzar = { arena, semente, i, casas: [...new Set(w)].map((c) => [c % 15, Math.floor(c / 15)]), relogio: Math.round(m.tempoRestante / 60), aperto: m.aperto.ativo }; }
        } else j._conf = 0;
      });
    }
    const m = jg.mundo;
    r.rodadas++;
    if (m.vencedor === 0) r.vencHumano++; else if (m.vencedor !== null) r.vencRobo++; else r.empate++;
    r.mortesHumano.push(morteH === null ? 'vivo' : +morteH.toFixed(1));
    for (const e of jg.mundo.eventosTodos || []) void e;
  }
  r.maxParado = +(r.maxParado / 60).toFixed(1);
  r.maxZanzar = +(r.maxZanzar / 60).toFixed(1);
  const mortes = r.mortesHumano.filter((x) => x !== 'vivo').sort((a, b) => a - b);
  r.humanoMolhadoAntesDe10s = mortes.filter((x) => x < 10).length;
  r.humanoMolhadoAntesDe20s = mortes.filter((x) => x < 20).length;
  r.primeiraMolhada = mortes[0];
  r.medianaMolhada = mortes[Math.floor(mortes.length / 2)];
  delete r.mortesHumano;
  out[nivel] = r;
}
console.log(JSON.stringify({ modo, sementesPorArena: N, ...out }, null, 1));
