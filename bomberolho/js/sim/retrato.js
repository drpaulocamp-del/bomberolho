// Retrato do mundo: cópia em objetos simples (para o gancho de teste e para a
// interface) e uma impressão digital (hash) para provar determinismo.

import { CASA, MOLDURA, PILAR, BLOCO, QUEBRANDO } from './constantes.js';
import { colDe, linDe } from './jogadores.js';
import { gotasAtivasDe } from './gotas.js';
import { casasDoRespingo } from './respingo.js';
import { obterArena } from './arenas.js';

const LETRA = { [MOLDURA]: '#', [PILAR]: '#', [BLOCO]: 'B', [QUEBRANDO]: 'q' };
const LETRA_ITEM = { gota: 'g', alcance: 'a', velocidade: 'v' };

/** Grade em texto: '#' sólido fixo, 'B' bloco, 'q' quebrando, 'g/a/v' item, 'o' gota, '.' livre. */
export function gradeEmTexto(m) {
  const linhas = [];
  for (let l = 0; l < m.linhas; l++) {
    let s = '';
    for (let c = 0; c < m.colunas; c++) {
      const i = l * m.colunas + c;
      const gota = m.gotas.some((g) => g.col === c && g.lin === l);
      s += gota ? 'o' : LETRA[m.grade[i]] || LETRA_ITEM[m.itens[i]] || '.';
    }
    linhas.push(s);
  }
  return linhas;
}

export function retratar(m) {
  const arredonda = (v) => Math.round(v * 1000) / 1000;
  return {
    tick: m.tick,
    tempo: arredonda(m.tick / 60),
    semente: m.semente,
    arena: m.arena,
    nomeArena: obterArena(m.arena).nome,
    fase: m.fase,
    vencedor: m.vencedor,
    colunas: m.colunas,
    linhas: m.linhas,
    grade: gradeEmTexto(m),
    legenda: { '#': 'pilar/moldura', B: 'bloco', q: 'bloco quebrando', o: 'gota', g: 'Frasquinho Extra', a: 'Lupa', v: 'Lágrima Veloz', '.': 'livre' },
    jogadores: m.jogadores.map((j) => ({
      id: j.id,
      personagem: j.personagem,
      x: arredonda(j.x / CASA), // em casas; o centro da casa (c, l) é (c + 0,5, l + 0,5)
      y: arredonda(j.y / CASA),
      col: colDe(j),
      lin: linDe(j),
      vivo: j.vivo,
      dir: j.dir,
      andando: j.andando,
      poderes: { gotas: j.gotas, alcance: j.alcance, velocidade: j.velocidade },
      gotasAtivas: gotasAtivasDe(m, j.id),
      eliminadoEm: j.eliminadoEm,
      eliminadoPor: j.eliminadoPor,
    })),
    gotas: m.gotas.map((g) => ({
      id: g.id, col: g.col, lin: g.lin, dono: g.dono, alcance: g.alcance,
      pavio: g.pavio, segundos: arredonda(g.pavio / 60), passantes: [...g.passantes],
    })),
    respingos: m.respingos.map((r) => ({
      id: r.id, col: r.col, lin: r.lin, dono: r.dono, restante: r.t,
      bracos: { ...r.bracos }, cadeia: r.cadeia,
      casas: casasDoRespingo(m, r).map((i) => ({ col: i % m.colunas, lin: Math.floor(i / m.colunas) })),
    })),
    itens: m.itens.flatMap((tipo, i) => (tipo ? [{ tipo, col: i % m.colunas, lin: Math.floor(i / m.colunas) }] : [])),
    itensEscondidos: m.ocultos.filter(Boolean).length,
  };
}

/** Hash FNV-1a de 32 bits do estado completo (inclui o gerador aleatório). */
export function impressaoDigital(m) {
  const { eventos, ...essencial } = m;
  const texto = JSON.stringify(essencial);
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Cópia profunda do mundo (para replays e testes). */
export function clonarMundo(m) {
  return structuredClone(m);
}
