// Sondas do verificador (parte 1, rodada 1): mede o "sentir" e confere regras direto na simulação.
import { criarMundo, passo } from '../../bomberolho/js/sim/mundo.js';
import { impressaoDigital } from '../../bomberolho/js/sim/retrato.js';
import { Jogo } from '../../bomberolho/js/jogo.js';

const E = (...t) => { const r = { cima: false, baixo: false, esq: false, dir: false, bomba: false }; for (const k of t) r[k] = true; return r; };
const mapa = (...l) => criarMundo({ semente: 1, mapa: l });
const out = {};

// 1) Deslize de quina: no corredor da linha 1, deslocado sobre o pilar (2,2), apertar "baixo".
const M = ['#######', '#1....#', '#.#.#.#', '#.....#', '#######'];
const desl = [];
for (const off of [-490, -400, -250, -100, -10, 0, 10, 100, 250, 400, 490]) {
  const m = mapa(...M); const j = m.jogadores[0];
  j.x = 2500 + off; j.y = 1500;
  let t = 0; while (j.y < 2500 && t < 200) { passo(m, [E('baixo')]); t++; }
  desl.push({ off, ticksAteEntrarNoCorredor: t, xFinal: j.x });
}
out.deslize = desl;

// 2) Virar a esquina correndo: segurando dir, aperta baixo em x variados antes/depois da abertura (3,2).
const virar = [];
for (const x0 of [2600, 2900, 3100, 3400, 3500, 3600, 3900]) {
  const m = mapa(...M); const j = m.jogadores[0]; j.x = x0; j.y = 1500;
  let t = 0; while (j.y < 2500 && t < 200) { passo(m, [E('baixo')]); t++; }
  const m2 = mapa(...M); const j2 = m2.jogadores[0]; j2.x = x0; j2.y = 1500; j2.dir = 'dir';
  let t2 = 0; while (j2.y < 2500 && t2 < 200) { passo(m2, [E('baixo', 'dir')]); t2++; }
  virar.push({ x0, soBaixo: t, baixoMaisDir: t2, colFinal: Math.floor(j2.x / 1000) });
}
out.virarEsquina = virar;

// 3) Sair de cima da gota e ela virar sólida.
{
  const m = mapa('#######', '#1....#', '#######');
  passo(m, [E('bomba')]);
  const g = m.gotas[0];
  const pass0 = [...g.passantes];
  let t = 0; while (m.gotas[0].passantes.length && t < 100) { passo(m, [E('dir')]); t++; }
  const xAoSair = m.jogadores[0].x;
  for (let k = 0; k < 30; k++) passo(m, [E('esq')]);
  out.sairDeCima = { passantesNaSoltura: pass0, ticksAtePerderPasse: t, xAoSair, xDepoisDeEmpurrarDeVolta: m.jogadores[0].x, limiteEsperado: 2500 };
}

// 4) Primeiro bloco por braço + itens queimados + parada em pilar.
{
  const m = mapa('#########', '#1.BB...#', '#.#.#.#.#', '#.......#', '#########');
  m.jogadores[0].alcance = 6;
  passo(m, [E('bomba')]);
  for (let k = 0; k < 170; k++) passo(m, [E()]);
  // jogador está na própria casa -> deve ter sido encharcado
  out.primeiroBloco = { grade: m.grade.slice(9, 18).join(''), vivo: m.jogadores[0].vivo };
}

// 5) Duração letal: conta ticks em que uma casa do braço é letal.
{
  const m = mapa('#########', '#1......#', '#########');
  m.jogadores[0].alcance = 3;
  passo(m, [E('bomba')]);
  for (let k = 0; k < 12; k++) passo(m, [E('dir')]); // sai do alcance? alcance 3 -> precisa ir à col 5
  for (let k = 0; k < 60; k++) passo(m, [E('dir')]);
  const vivoFora = m.jogadores[0].vivo;
  // novo: mede janela
  const m2 = mapa('#########', '#1......#', '#########', );
  m2.jogadores[0].alcance = 3; passo(m2, [E('bomba')]);
  for (let k = 0; k < 40; k++) passo(m2, [E('dir')]);
  let letais = 0, primeiro = null, ultimo = null;
  for (let k = 0; k < 200; k++) {
    passo(m2, [E()]);
    const r = m2.respingos.some(r => r.lin === 1 && r.col - r.bracos.esq <= 3 && r.col + r.bracos.dir >= 3);
    if (r) { letais++; primeiro ??= m2.tick; ultimo = m2.tick; }
  }
  out.duracaoLetal = { ticksLetais: letais, primeiro, ultimo, vivoFora };
}

// 6) Cadeia: duas gotas de donos diferentes, pavios diferentes.
{
  const m = mapa('#########', '#1..2...#', '#.#.#.#.#', '#.......#', '#########');
  passo(m, [E('bomba'), E()]);
  for (let k = 0; k < 60; k++) passo(m, [E('baixo'), E()]);
  passo(m, [E(), E('bomba')]);
  for (let k = 0; k < 60; k++) passo(m, [E('baixo'), E('baixo')]);
  const antes = m.gotas.map(g => ({ id: g.id, pavio: g.pavio }));
  let tick = null; let n = 0;
  while (m.gotas.length && n < 200) { passo(m, [E(), E()]); n++; }
  out.cadeia = { antes, respingosMesmoTick: m.respingos.length, cadeias: m.respingos.map(r => r.cadeia), tick: m.tick };
}

// 7) Determinismo pelo controlador com robôs, 3 execuções, e hash por semente diferente.
{
  const h = [];
  for (let k = 0; k < 3; k++) { const jg = new Jogo().iniciar({ semente: 4242, dificuldade: 'dificil' }); jg.demo = true; jg.passos(5000); h.push(jg.impressao()); }
  const jg2 = new Jogo().iniciar({ semente: 4243, dificuldade: 'dificil' }); jg2.demo = true; jg2.passos(5000);
  out.determinismo = { iguais: h, outraSemente: jg2.impressao() };
}

// 8) Velocidade em casas/s, por nível de Lágrima Veloz.
out.velocidade = [0, 1, 2, 3, 4].map(v => ({ nivel: v, casasPorS: ((55 + 9 * v) * 60 / 1000).toFixed(2) }));

// 9) Lote de robôs: quedas, auto-eliminações, rodadas encerradas em 2 min por nível.
for (const dif of ['facil', 'medio', 'dificil']) {
  let fim = 0, quedas = 0, proprias = 0, paradoMax = 0, empates = 0;
  for (let s = 1; s <= 40; s++) {
    const jg = new Jogo().iniciar({ semente: s * 7919, dificuldade: dif }); jg.demo = true;
    const parado = [0, 0, 0, 0]; const ult = jg.mundo.jogadores.map(j => [j.x, j.y]);
    for (let t = 0; t < 7200 && jg.mundo.fase !== 'fim'; t++) {
      jg.tick();
      jg.mundo.jogadores.forEach((j, i) => {
        if (!j.vivo) return;
        if (j.x === ult[i][0] && j.y === ult[i][1]) { parado[i]++; paradoMax = Math.max(paradoMax, parado[i]); } else parado[i] = 0;
        ult[i] = [j.x, j.y];
      });
    }
    if (jg.mundo.fase === 'fim') { fim++; if (jg.mundo.vencedor === null) empates++; }
    for (const j of jg.mundo.jogadores) if (!j.vivo) { quedas++; if (j.eliminadoPor === j.id) proprias++; }
  }
  out['lote_' + dif] = { partidas: 40, encerradasEm2min: fim, empates, quedas, pelaPropria: proprias, maiorTempoParadoTicks: paradoMax };
}
console.log(JSON.stringify(out, null, 1));
