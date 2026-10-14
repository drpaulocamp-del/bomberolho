// Verificador P2R1: um jogador parado dentro da boca do túnel (moldura) fica imune?
import { criarMundo, passo } from '../../../bomberolho/js/sim/mundo.js';
import { soltarGota } from '../../../bomberolho/js/sim/gotas.js';
const m = criarMundo({ semente: 5, arena: 'caverna', duracao: 7200 });
const j = m.jogadores[0];
// limpa a linha 3 perto do túnel e põe o jogador na casa (1,3)
for (let c = 1; c <= 5; c++) if (m.grade[3 * 15 + c] === 3) m.grade[3 * 15 + c] = 0;
j.x = 1500; j.y = 3500;
// anda para a esquerda até x≈700 (dentro da boca, col 0)
let n = 0;
while (j.x > 700 && n < 100) { passo(m, [{ esq: true }]); n++; }
console.log('posição no túnel', j.x, j.y, 'col', Math.floor(j.x / 1000));
// rival solta gota alcance 8 em (3,3)
const r = m.jogadores[1]; r.x = 3500; r.y = 3500; r.alcance = 8;
soltarGota(m, r); r.x = 3500; r.y = 5500; // tira o rival
for (let k = 0; k < 200; k++) passo(m, []);
console.log('após respingo alcance 8 na mesma linha: vivo?', j.vivo);
// aperto final: avança o relógio até o fim
m.tempoRestante = 3601;
for (let k = 0; k < 3700 && m.fase !== 'fim'; k++) passo(m, []);
console.log('após o aperto inteiro: vivo?', j.vivo, 'x', j.x, 'grade (1,3)=', m.grade[3 * 15 + 1], 'fase', m.fase, 'tempo', m.tempoRestante);
