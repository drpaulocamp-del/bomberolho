// Verificador P2R1: sondas independentes das regras novas (chute, Pinça, Penetrante, Super Lupa, Cisco, bichinhos).
import { criarMundo, passo } from '../../../bomberolho/js/sim/mundo.js';
import { pegarItem } from '../../../bomberolho/js/sim/itens.js';
import { criarAjuste } from '../../../bomberolho/js/sim/ajustes.js';
import { hashDe, impressaoDigital } from '../../../bomberolho/js/sim/retrato.js';
const V = {}; const E = {};
const mapa = (l) => criarMundo({ mapa: l });
const run = (m, n, ents = []) => { for (let k = 0; k < n; k++) passo(m, ents); };
const J = (m, i = 0) => m.jogadores[i];
const pos = (j) => [(j.x / 1000).toFixed(3), (j.y / 1000).toFixed(3)];
// 1. chute: gota desliza e para antes do bloco, centrada
{
  const m = mapa(['###########', '#1........#', '#........B#', '###########']);
  const j = J(m); pegarItem(m, j, 'chute');
  passo(m, [{ bomba: true }]); passo(m, []);
  run(m, 20, [{ esq: true }]); // sai p/ esquerda? está na col 1; vai à direita primeiro
  const m2 = mapa(['###########', '#.1.....B.#', '#.........#', '###########']);
  const j2 = J(m2); pegarItem(m2, j2, 'chute');
  passo(m2, [{ bomba: true }]); run(m2, 25, [{ esq: true }]); // sai para a esquerda (col 1)
  run(m2, 20, [{ dir: true }]); // volta e chuta
  run(m2, 40, []);
  const g = m2.gotas[0];
  V.chute = { gota: g && [g.x, g.y, g.col, g.lin, !!g.mov], esperado: '7500,1500 (antes do bloco em 8)' , jogador: pos(j2) };
}
// 2. chute: gota parada por jogador no caminho; e respingo pega gota deslizando = estoura na hora
{
  const m = mapa(['#############', '#.1.......2.#', '#...........#', '#############']);
  const j = J(m); pegarItem(m, j, 'chute');
  passo(m, [{ bomba: true }]); run(m, 25, [{ esq: true }]); run(m, 20, [{ dir: true }]); run(m, 40, []);
  const g = m.gotas[0]; V.chuteParaNoJogador = { gota: g && [g.col, g.lin], rival: pos(J(m, 1)), esperado: 'col 9 (rival na 10)' };
}
// 3. Pinça: arremesso 3 casas, quica sobre bloco, volta pela borda
{
  const m = mapa(['#########', '#..1BB..#', '#.......#', '#########']);
  const j = J(m); pegarItem(m, j, 'pinca'); j.dir = 'dir';
  passo(m, [{ bomba: true }]); // solta gota
  passo(m, []); passo(m, [{ bomba: true }]); // levanta
  const seg = j.segurando; j.dir = 'dir';
  passo(m, []); // solta = arremessa
  run(m, 40, []);
  const g = m.gotas[0];
  V.pinca = { segurou: seg !== null, gota: g && [g.estado, g.col, g.lin], esperado: 'col 3+3=6 livre → (6,1)' };
  // volta pela borda: de (6,1) arremessar 3 p/ direita: 9 → interior w=7 → 9-7=2 → (2,1)
  const m3 = mapa(['#########', '#.....1.#', '#.......#', '#########']);
  const k = J(m3); pegarItem(m3, k, 'pinca'); k.dir = 'dir';
  passo(m3, [{ bomba: true }]); passo(m3, []); passo(m3, [{ bomba: true }]); k.dir = 'dir'; passo(m3, []); run(m3, 40, []);
  const g3 = m3.gotas[0]; V.pincaBorda = { gota: g3 && [g3.estado, g3.col, g3.lin], esperado: '(6+3)=9 → volta → col 2' };
}
// 4. Penetrante: atravessa blocos, para em pilar
{
  const m = mapa(['#########', '#1BBB.B.#', '#.#.....#', '#B......#', '#########']);
  const j = J(m); pegarItem(m, j, 'penetrante'); pegarItem(m, j, 'superLupa');
  passo(m, [{ bomba: true }]); j.x = 1500; j.y = 3500; m.grade[3*9+1]=0; // tira o jogador do caminho
  run(m, 170, []);
  V.penetrante = { quebrando: m.grade.map((t, i) => t === 4 ? i : -1).filter((i) => i >= 0).map((i) => [i % 9, Math.floor(i / 9)]), alcance: j.alcance, jogadorVivo: j.vivo, esperado: 'blocos (2..4,1) e (6,1) todos' };
}
// 5. Cisco: contagioso e expira
{
  const m = mapa(['#######', '#1.2..#', '#.....#', '#######']);
  pegarItem(m, J(m), 'cisco'); const tipo = J(m).cisco.tipo;
  run(m, 10, [{ dir: true }]);
  V.cisco = { tipo, rivalPegou: !!J(m, 1).cisco, dur: J(m).cisco?.restante };
  run(m, 700, []); V.cisco.expirou = !J(m).cisco && !J(m, 1).cisco;
}
// 6. Bichinho: vida extra + invulnerável, depois sai
{
  const m = mapa(['#######', '#1....#', '#.....#', '#######']);
  const j = J(m); pegarItem(m, j, 'estojo'); const tipo = j.montaria.tipo;
  passo(m, [{ bomba: true }]); run(m, 170, []);
  V.vidaExtra = { tipo, vivo: j.vivo, montaria: j.montaria, invul: j.invulneravel };
  run(m, 80, []); passo(m, [{ bomba: true }]); passo(m, []); run(m, 170, []);
  V.vidaExtra.segundaVez = j.vivo;
}
// 7. Saltinho por cima de pilar; Cascudo frente x costas; Disparada para no obstáculo
function montarTipo(m, j, tipo) { for (let k = 0; k < 10 && j.montaria?.tipo !== tipo; k++) pegarItem(m, j, 'estojo'); return j.montaria?.tipo; }
{
  const m = mapa(['#######', '#.....#', '#1#...#', '#.....#', '#######']);
  const j = J(m); montarTipo(m, j, 'saltinho'); j.dir = 'dir';
  passo(m, [{ acao: true, dir: true }]); run(m, 25, []);
  V.saltinho = { pos: pos(j), esperado: '3.5,2.5 (por cima do pilar)' };
  const m2 = mapa(['#########', '#.......#', '#1......#', '#.......#', '#########']);
  const k = J(m2); montarTipo(m2, k, 'disparada'); k.dir = 'dir';
  m2.grade[2 * 9 + 6] = 3; // bloco em (6,2)
  let t = 0; while (t < 60) { passo(m2, [{ acao: true }]); t++; if (!k.disparada && t > 2) break; }
  V.disparada = { pos: pos(k), ticks: t, esperado: 'para em 5.5 (bloco na 6)' };
  // Cascudo: respingo vindo da frente não molha; das costas molha (perde bichinho)
  const m3 = mapa(['#########', '#.......#', '#...1.2.#', '#.......#', '#########']);
  const c = J(m3); montarTipo(m3, c, 'cascudo'); c.dir = 'dir';
  const r = J(m3, 1); passo(m3, [{ acao: true }, { bomba: true }]); r.x = 6500; r.y = 1500;
  for (let n = 0; n < 200; n++) passo(m3, [{ acao: true }]);
  V.cascudoFrente = { vivo: c.vivo, montado: c.montaria?.tipo, defendeu: c.defendidos.length };
  const m4 = mapa(['#########', '#.......#', '#...1.2.#', '#.......#', '#########']);
  const c4 = J(m4); montarTipo(m4, c4, 'cascudo'); c4.dir = 'esq';
  const r4 = J(m4, 1); passo(m4, [{ acao: true }, { bomba: true }]); r4.x = 6500; r4.y = 1500;
  for (let n = 0; n < 200; n++) passo(m4, [{ acao: true }]);
  V.cascudoCostas = { vivo: c4.vivo, montado: c4.montaria?.tipo ?? null };
}
// 8. Aperto com bichinho: esmaga mesmo montado
{
  const m = criarMundo({ semente: 3, duracao: 3700 });
  const j = J(m); pegarItem(m, j, 'estojo');
  run(m, 400, []);
  V.apertoMontado = { vivo: j.vivo, motivoEsmagado: !j.vivo };
}
// 9. Ajuste muda o mundo e é determinístico
{
  const h = (aj) => { const m = criarMundo({ semente: 9, ajuste: criarAjuste(aj) }); for (let k = 0; k < 400; k++) passo(m, [{ dir: k % 50 < 25, baixo: k % 50 >= 25, bomba: k % 90 === 0 }]); return hashDe(impressaoDigital(m)); };
  V.ajuste = { padraoIgual: h({}) === h({}), mudaComVelocidade: h({}) !== h({ velocidadeBase: 80 }), mesmaConfigIgual: h({ velocidadeBase: 80 }) === h({ velocidadeBase: 80 }) };
}
console.log(JSON.stringify(V, null, 1));
