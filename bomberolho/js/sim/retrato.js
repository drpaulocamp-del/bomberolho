// Retrato do mundo: cópia em objetos simples (para o gancho de teste e para a
// interface) e uma impressão digital (hash) para provar determinismo.

import { CASA, MOLDURA, PILAR, BLOCO, QUEBRANDO, MURO, TUNEL } from './constantes.js';
import { colDe, linDe } from './jogadores.js';
import { gotasAtivasDe } from './gotas.js';
import { casasDoRespingo } from './respingo.js';
import { obterArena } from './arenas.js';
import { nomeDoItem } from './itens.js';
import { proximaQueda } from './aperto.js';
import { destinoDoVoo } from './pinca.js';

const LETRA = { [MOLDURA]: '#', [PILAR]: '#', [BLOCO]: 'B', [QUEBRANDO]: 'q', [MURO]: 'M', [TUNEL]: 'T' };
const LETRA_ITEM = {
  gota: 'g', alcance: 'a', velocidade: 'v', chute: 'c', superLupa: 's', cisco: 'z', pinca: 'p', penetrante: 'n', estojo: 'e',
};

/** Grade em texto: '#' sólido fixo, 'B' bloco, 'q' quebrando, 'M' muro do aperto, 'T' túnel, letras de item, 'o' gota, '.' livre. */
export function gradeEmTexto(m) {
  const linhas = [];
  for (let l = 0; l < m.linhas; l++) {
    let s = '';
    for (let c = 0; c < m.colunas; c++) {
      const i = l * m.colunas + c;
      const gota = m.gotas.some((g) => g.estado === 'chao' && g.col === c && g.lin === l);
      s += gota ? 'o' : LETRA[m.grade[i]] || LETRA_ITEM[m.itens[i]] || '.';
    }
    linhas.push(s);
  }
  return linhas;
}

const LEGENDA = {
  '#': 'pilar/moldura', B: 'bloco', q: 'bloco quebrando', M: 'peça do aperto final', T: 'túnel', o: 'gota', '.': 'livre',
  ...Object.fromEntries(Object.entries(LETRA_ITEM).map(([tipo, letra]) => [letra, nomeDoItem(tipo)])),
};

export function retratar(m) {
  const arredonda = (v) => Math.round(v * 1000) / 1000;
  const queda = proximaQueda(m);
  return {
    tick: m.tick,
    tempo: arredonda(m.tick / 60),
    semente: m.semente,
    arena: m.arena,
    nomeArena: obterArena(m.arena).nome,
    fase: m.fase,
    contagem: Math.ceil(m.contagem / 60), // segundos que faltam para o "já!" (0 = valendo)
    relogio: m.tempoRestante === null ? null : arredonda(Math.max(0, m.tempoRestante) / 60), // segundos
    tempoEsgotado: m.tempoEsgotado,
    aperto: { ativo: m.aperto.ativo, caidas: m.aperto.indice, total: m.aperto.seq ? m.aperto.seq.length : null,
      proxima: queda >= 0 ? { col: queda % m.colunas, lin: Math.floor(queda / m.colunas), emTicks: m.aperto.proximoEm - m.tick } : null },
    vencedor: m.vencedor,
    colunas: m.colunas,
    linhas: m.linhas,
    grade: gradeEmTexto(m),
    legenda: LEGENDA,
    piso: m.piso.flatMap((p, i) => (p ? [{ tipo: p, col: i % m.colunas, lin: Math.floor(i / m.colunas) }] : [])),
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
      poderes: {
        gotas: j.gotas, alcance: j.alcance, velocidade: j.velocidade,
        chute: j.chute, pinca: j.pinca, penetrante: j.penetrante,
      },
      cisco: j.cisco ? { ...j.cisco } : null,
      montaria: j.montaria ? j.montaria.tipo : null,
      invulneravel: j.invulneravel,
      segurando: j.segurando,
      noAr: j.salto !== null,
      escudo: j.escudo,
      disparando: j.disparada !== null,
      gotasAtivas: gotasAtivasDe(m, j.id),
      eliminadoEm: j.eliminadoEm,
      eliminadoPor: j.eliminadoPor,
    })),
    gotas: m.gotas.map((g) => ({
      id: g.id, col: g.col, lin: g.lin, dono: g.dono, alcance: g.alcance, penetrante: g.penetrante,
      estado: g.estado, deslizando: g.mov ? g.mov.dir : null, portador: g.portador,
      destino: g.voo ? destinoDoVoo(m, g.voo) : null,
      pavio: g.pavio, segundos: arredonda(g.pavio / 60), passantes: [...g.passantes],
    })),
    respingos: m.respingos.map((r) => ({
      id: r.id, col: r.col, lin: r.lin, dono: r.dono, restante: r.t, penetrante: r.penetrante,
      bracos: { ...r.bracos }, cadeia: r.cadeia,
      casas: casasDoRespingo(m, r).map((i) => ({ col: i % m.colunas, lin: Math.floor(i / m.colunas) })),
    })),
    itens: m.itens.flatMap((tipo, i) => (tipo ? [{ tipo, col: i % m.colunas, lin: Math.floor(i / m.colunas) }] : [])),
    itensEscondidos: m.ocultos.filter(Boolean).length,
  };
}

/** Hash FNV-1a de 32 bits de qualquer valor serializável. */
export function hashDe(valor) {
  const texto = JSON.stringify(valor);
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Hash do estado completo do mundo (inclui o gerador aleatório). */
export function impressaoDigital(m) {
  const { eventos, ...essencial } = m;
  return hashDe(essencial);
}

/** Cópia profunda do mundo (para replays e testes). */
export function clonarMundo(m) {
  return structuredClone(m);
}
