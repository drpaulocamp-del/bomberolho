// Verificador TODO R1: sondas do "sentir" clássico pela simulação real (Node).
import { Jogo } from '../../../bomberolho/js/jogo.js';
import { pegarItem } from '../../../bomberolho/js/sim/itens.js';
const novo = (sem = 5, arena = 'jardim') => { const j = new Jogo(); j.iniciar({ semente: sem, arena, dificuldade: 'facil', contagem: false, rodadas: 2 }); for (const i of [1, 2, 3]) j.substitutas[i] = {}; return j; };
const ent = (j, e) => { j.substitutas[0] = { cima: false, baixo: false, esq: false, dir: false, bomba: false, acao: false, ...e }; };
const eu = (j) => j.retrato().jogadores[0];
const out = {};
// 1) Deslize de quina: desvio d (casas) de (1,1) para a direita, depois "baixo" contra o pilar (2,2).
out.quina = [];
for (const d of [0.1, 0.2, 0.3, 0.4, 0.45, 0.49]) {
  const j = novo(); const m = j.mundo; const p = m.jogadores[0];
  p.x = 1500 + d * 1000; p.y = 1500;
  ent(j, { baixo: true }); let t = 0;
  while (eu(j).lin < 2 && t < 60) { j.passos(1); t++; }
  out.quina.push({ desvio: d, ticksAteEntrar: t, x: eu(j).x });
}
// 2) Velocidade real (casas/s) base e com 4 Lágrimas
for (const n of [0, 4]) {
  const j = novo(); const m = j.mundo; const p = m.jogadores[0];
  for (let k = 0; k < n; k++) pegarItem(m, p, 'velocidade');
  // corredor de cima: limpa a linha 1
  for (let c = 1; c < 14; c++) { m.grade[1 * m.colunas + c] = 0; m.itens[1 * m.colunas + c] = null; }
  ent(j, { dir: true }); j.passos(10); const x0 = eu(j).x; j.passos(30); out[`vel${n}`] = +((eu(j).x - x0) * 2).toFixed(2);
}
// 3) Pavio e respingo
{
  const j = novo(); ent(j, { bomba: true }); j.passos(1); ent(j, {});
  let t = 1; while (j.retrato().respingos.length === 0 && t < 400) { j.passos(1); t++; }
  let r = 0; while (j.retrato().respingos.length && r < 200) { j.passos(1); r++; }
  out.pavio_s = +(t / 60).toFixed(2); out.respingo_s = +(r / 60).toFixed(2);
}
// 4) Cadeia: gota A em (1,1), gota B em (1,3) com pavio maior; A deve detonar B no mesmo tick
{
  const j = novo(); const m = j.mundo; const p = m.jogadores[0]; pegarItem(m, p, 'gota');
  ent(j, { bomba: true }); j.passos(1); ent(j, { baixo: true }); j.passos(37); ent(j, { bomba: true }); j.passos(1);
  ent(j, { dir: true }); j.passos(30); ent(j, {});
  const g = j.retrato().gotas.map((x) => [x.col, x.lin, x.pavio]);
  let t = 0, ev = null; while (t < 300) { j.passos(1); t++; const rs = j.retrato().respingos; if (rs.length) { ev = rs.map((x) => [x.col, x.lin, x.restante, x.cadeia]); break; } }
  out.cadeia = { gotas: g, primeiroTickComRespingo: ev, vivo: eu(j).vivo };
}
// 5) Chute: gota em corredor livre, anda contra ela
{
  const j = novo(); const m = j.mundo; const p = m.jogadores[0]; pegarItem(m, p, 'chute');
  for (let c = 1; c < 14; c++) { m.grade[1 * m.colunas + c] = 0; m.itens[1 * m.colunas + c] = null; }
  m.grade[1 * m.colunas + 9] = 1 /* placeholder */;
  m.grade[1 * m.colunas + 9] = j.mundo.grade[2 * m.colunas + 2]; // pilar-like (sólido)
  ent(j, { bomba: true }); j.passos(1); ent(j, { baixo: true }); j.passos(20); ent(j, { cima: true }); j.passos(20);
  // agora em (1,1)? coloca o jogador à esquerda: o jogador está em cima da gota; leva para a esquerda impossível (moldura). Vai para (1,2) e sobe? Simples: reposiciona
  const gota = m.gotas[0]; gota.col = 3; gota.lin = 1; gota.passantes = [];
  p.x = 1500; p.y = 1500; ent(j, { dir: true }); let t = 0; const traj = [];
  while (t < 120) { j.passos(1); t++; const g = j.retrato().gotas[0]; if (!g) break; traj.push(g.col + (g.deslizando ? '>' : '')); if (t > 10 && !g.deslizando && traj.at(-2)?.includes('>')) break; }
  out.chute = { bloqueioEm: 9, paradaEm: j.retrato().gotas[0]?.col, traj: traj.filter((_, i) => i % 3 === 0).join(' ') };
}
console.log(JSON.stringify(out, null, 1));
