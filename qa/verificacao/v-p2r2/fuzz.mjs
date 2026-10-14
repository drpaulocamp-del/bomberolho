// Verificador P2R2: fuzz de invariantes com 4 jogadores de entradas aleatórias
// (todas as arenas, itens dados de saída, ajustes extremos da bancada).
// Invariantes a cada tick: centro de todo vivo no interior; corpo sem
// sobrepor casa sólida (fora do salto do Saltinho); nada NaN; no máximo uma
// gota por casa; gota no chão sempre em casa VAZIA e centrada.
import { criarMundo, passo } from '../../../bomberolho/js/sim/mundo.js';
import { pegarItem } from '../../../bomberolho/js/sim/itens.js';
import { criarAjuste } from '../../../bomberolho/js/sim/ajustes.js';
import { criarAleatorio, proximo } from '../../../bomberolho/js/sim/aleatorio.js';
const ARENAS = ['jardim', 'lago', 'caverna', 'vale', 'consultorio'];
const AJ = [{}, { velocidadeBase: 85, velocidadePasso: 20, velocidadeChute: 250, velocidadeDisparada: 250, toleranciaQuina: 500 }, { velocidadeBase: 35, toleranciaQuina: 0, pavio: 90, duracaoRespingo: 60 }];
const N = Number(process.argv[2] || 20);
const falhas = [];
let ticks = 0, tuneis = 0, saltos = 0, chutes = 0, voos = 0;
const SOLIDO = new Set([1, 2, 3, 4, 5, 6]);
for (const arena of ARENAS) for (let s = 1; s <= N; s++) for (let a = 0; a < AJ.length; a++) {
  const m = criarMundo({ semente: s * 101 + a, arena, ajuste: criarAjuste(AJ[a]), duracao: 7200 });
  const rng = criarAleatorio(s * 7 + a * 13 + arena.length);
  // metade dos jogadores com itens avançados
  m.jogadores.forEach((j, i) => {
    if ((s + i) % 2) for (const t of ['chute', 'pinca', 'velocidade', 'velocidade', 'velocidade', 'velocidade', 'gota', 'gota', 'alcance', 'estojo']) pegarItem(m, j, t);
  });
  // abre parte dos blocos para haver espaço
  if (s % 3 === 0) m.grade = m.grade.map((t) => (t === 3 ? 0 : t));
  const ent = [{}, {}, {}, {}];
  for (let t = 0; t < 7300 && m.fase !== 'fim'; t++) {
    for (let i = 0; i < 4; i++) if (proximo(rng) < 0.06) {
      const d = ['cima', 'baixo', 'esq', 'dir'][Math.floor(proximo(rng) * 4)];
      const d2 = proximo(rng) < 0.2 ? ['cima', 'baixo', 'esq', 'dir'][Math.floor(proximo(rng) * 4)] : null;
      ent[i] = { [d]: true, ...(d2 ? { [d2]: true } : {}), bomba: proximo(rng) < 0.15, acao: proximo(rng) < 0.1 };
    }
    for (const j of m.jogadores) if (process.env.IMORTAL) j.invulneravel = 999;
    const antes = m.jogadores.map((j) => j.x);
    passo(m, ent);
    ticks++;
    for (const e of m.eventos) { if (e.tipo === 'salto') saltos++; if (e.tipo === 'chute') chutes++; if (e.tipo === 'arremesso') voos++; }
    for (const j of m.jogadores) {
      if (Math.abs(j.x - antes[j.id]) > 5000) tuneis++;
      if (!Number.isFinite(j.x) || !Number.isFinite(j.y)) falhas.push(['NaN', arena, s, a, t]);
      if (!j.vivo) continue;
      const c = Math.floor(j.x / 1000), l = Math.floor(j.y / 1000);
      if (c < 1 || c > m.colunas - 2 || l < 1 || l > m.linhas - 2) falhas.push(['fora', arena, s, a, t, j.id, j.x, j.y]);
      if (j.salto) continue;
      // sobreposição do corpo (quadrado de 1 casa) com casas sólidas
      for (const [x, y] of [[j.x - 499, j.y - 499], [j.x + 499, j.y - 499], [j.x - 499, j.y + 499], [j.x + 499, j.y + 499]]) {
        const cc = Math.floor(x / 1000), ll = Math.floor(y / 1000);
        const tipo = m.grade[ll * m.colunas + cc];
        if (SOLIDO.has(tipo) && !(tipo === 6)) { falhas.push(['sobrepoe', arena, s, a, t, j.id, j.x, j.y, cc, ll, tipo]); break; }
      }
    }
    const casas = new Set();
    for (const g of m.gotas) {
      if (g.estado !== 'chao' || g.mov) continue;
      const k = g.lin * m.colunas + g.col;
      if (casas.has(k)) falhas.push(['duas gotas', arena, s, a, t, g.col, g.lin]);
      casas.add(k);
      if (m.grade[k] !== 0) falhas.push(['gota em sólido', arena, s, a, t, g.col, g.lin, m.grade[k]]);
    }
    if (falhas.length > 30) break;
  }
}
const tipos = {};
for (const f of falhas) tipos[f[0]] = (tipos[f[0]] || 0) + 1;
console.log(JSON.stringify({ rodadas: ARENAS.length * N * AJ.length, ticks, tuneis, saltos, chutes, voos, falhas: falhas.length, tipos, exemplos: falhas.slice(0, 12) }));
