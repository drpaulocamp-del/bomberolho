// Verificador P2R2: sondas novas de regras (independentes das do executor).
import { criarMundo, passo } from '../../../bomberolho/js/sim/mundo.js';
import { pegarItem } from '../../../bomberolho/js/sim/itens.js';
const run = (m, n, e = []) => { for (let k = 0; k < n; k++) passo(m, e); };
const R = {};
// 1. gota chutada atingida por respingo no meio do deslize estoura na hora, na casa mais próxima
{
  const m = criarMundo({ mapa: ['###############', '#1...........2#', '#.#.#.#.#.#.#.#', '#.............#', '###############'] });
  const j = m.jogadores[0]; pegarItem(m, j, 'chute');
  // rival solta gota em (7,3) com alcance 2: braço para cima alcança (7,1)
  const r = m.jogadores[1]; r.x = 7500; r.y = 3500;
  passo(m, [{}, { bomba: true }]); r.x = 13500; r.y = 3500;
  const gr = m.gotas.find((g) => g.dono === 1);
  // gota parada do mapa em (2,1)? ('o' no mapa) — se não houver, solta uma do jogador em (2,1)
  let g = m.gotas.find((x) => x.dono !== 1);
  if (!g) { j.x = 2500; passo(m, [{ bomba: true }]); j.x = 1500; g = m.gotas.find((x) => x.dono === 0); }
  // espera até o respingo do rival estar perto de estourar, então chuta
  while (gr.pavio > 8) passo(m, []);
  passo(m, [{ dir: true }]); passo(m, [{ dir: true }]);
  const desl = !!g.mov;
  let estourou = null;
  for (let k = 0; k < 40 && !estourou; k++) { passo(m, []); const e = m.eventos.find((x) => x.tipo === 'estouro' || x.tipo === 'respingo'); if (!m.gotas.includes(g)) estourou = { tick: k, ev: m.eventos.map((x) => x.tipo) }; }
  R.chuteCadeia = { deslizava: desl, estourou, respingos: m.respingos.map((x) => [x.col, x.lin, x.cadeia]) };
}
// 2. Cisco: dois parados encostados — o azar fica trocando de dono a cada 1 s?
{
  const m = criarMundo({ mapa: ['#######', '#12...#', '#.....#', '#######'], semente: 3 });
  pegarItem(m, m.jogadores[0], 'cisco');
  m.jogadores[1].x = 2300;
  let trocas = 0;
  for (let k = 0; k < 600; k++) { passo(m, []); trocas += m.eventos.filter((e) => e.tipo === 'cisco').length; }
  R.ciscoPingPong = { trocasEm10s: trocas };
}
// 3. Invulnerável depois de perder o bichinho: respingo não molha, aperto sim (já testado), dura ~66 ticks
{
  const m = criarMundo({ mapa: ['#######', '#1....#', '#.....#', '#######'] });
  const j = m.jogadores[0]; pegarItem(m, j, 'estojo');
  const t1 = j.montaria.tipo; pegarItem(m, j, 'estojo'); const t2 = j.montaria.tipo;
  passo(m, [{ bomba: true }]); run(m, 170);
  R.vidaExtra = { troca: [t1, t2], vivo: j.vivo, montaria: j.montaria, invul: j.invulneravel };
}
// 4. Super Lupa: alcance vai ao máximo; Lupa depois não passa do limite
{
  const m = criarMundo({ mapa: ['#####', '#1..#', '#####'] });
  const j = m.jogadores[0]; pegarItem(m, j, 'superLupa'); const a = j.alcance; pegarItem(m, j, 'alcance');
  for (let k = 0; k < 12; k++) { pegarItem(m, j, 'gota'); pegarItem(m, j, 'velocidade'); }
  R.limites = { superLupa: a, depoisLupa: j.alcance, gotas: j.gotas, velocidade: j.velocidade };
}
// 5. Penetrante para no pilar e destrói itens expostos no caminho
{
  const m = criarMundo({ mapa: ['#########', '#1.B.B#B#', '#.......#', '#########'] });
  const j = m.jogadores[0]; pegarItem(m, j, 'penetrante'); pegarItem(m, j, 'superLupa');
  m.itens[1 * 9 + 4] = 'gota';
  passo(m, [{ bomba: true }]); j.y = 2500; j.x = 1500;
  run(m, 168);
  R.penetrante = { quebrando: m.grade.flatMap((t, i) => (t === 4 ? [[i % 9, Math.floor(i / 9)]] : [])), itemQueimado: m.itens[13] === null, blocoAlemDoPilar: m.grade[1 * 9 + 7] };
}
// 6. Empate simultâneo e vitória
{
  const m = criarMundo({ mapa: ['#####', '#1.2#', '#####'], duracao: 7200 });
  passo(m, [{ bomba: true }]); run(m, 260);
  R.empateJuntos = { fase: m.fase, vencedor: m.vencedor, vivos: m.jogadores.filter((x) => x.vivo).length };
}
console.log(JSON.stringify(R, null, 1));
