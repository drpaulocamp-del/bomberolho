// Verificador P2R2: o aperto cobre todo o interior menos o miolo, para os 4 cantos e as 5 arenas?
// E a distribuição do canto inicial por semente; e quem fica no miolo/fim.
import { criarMundo } from '../../../bomberolho/js/sim/mundo.js';
import { sequenciaDoAperto, cantoInicialDoAperto } from '../../../bomberolho/js/sim/aperto.js';
for (const arena of ['jardim', 'lago', 'caverna', 'vale', 'consultorio']) {
  const m = criarMundo({ semente: 5, arena });
  for (let canto = 0; canto < 4; canto++) {
    const seq = sequenciaDoAperto(m, canto);
    const set = new Set(seq);
    const sobra = [];
    for (let l = 1; l < 12; l++) for (let c = 1; c < 14; c++) { const i = l * 15 + c; if (m.grade[i] !== 2 && !set.has(i)) sobra.push([c, l]); }
    const dup = seq.length - set.size;
    if (canto === 0 || sobra.length !== 7 || dup) console.log(arena, 'canto', canto, 'quedas', seq.length, 'dup', dup, 'sobra', JSON.stringify(sobra), 'primeiras', JSON.stringify(seq.slice(0, 3).map((i) => [i % 15, Math.floor(i / 15)])));
  }
}
const cont = [0, 0, 0, 0];
for (let s = 0; s < 40000; s++) cont[cantoInicialDoAperto(s * 2654435761)]++;
console.log('canto inicial (40000 sementes espalhadas):', cont);
const cont2 = [0, 0, 0, 0];
for (let s = 0; s < 4000; s++) cont2[cantoInicialDoAperto(s)]++;
console.log('canto inicial (sementes 0..3999):', cont2);
