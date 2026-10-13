// Respingo em cruz: alcance, parada em pilar, primeiro bloco de cada braço,
// reação em cadeia imediata e duração letal.

import {
  VAZIO, BLOCO, QUEBRANDO, DURACAO_RESPINGO, DURACAO_QUEBRA, DIRECOES, NOMES_DIRECOES,
} from './constantes.js';

/**
 * Estoura as gotas dadas e, no mesmo tick, todas as que forem atingidas
 * (cadeia). Ordem determinística: fila na ordem em que as gotas são atingidas.
 */
export function estourar(m, iniciais) {
  const fila = [...iniciais];
  const marcadas = new Set(fila.map((g) => g.id));
  const novos = [];
  for (let k = 0; k < fila.length; k++) {
    const g = fila[k];
    const r = {
      id: m.proximoId++,
      col: g.col,
      lin: g.lin,
      dono: g.dono,
      t: DURACAO_RESPINGO,
      bracos: { cima: 0, baixo: 0, esq: 0, dir: 0 },
      // Ponta do braço que termina num bloco (para a arte mostrar o choque).
      batida: { cima: false, baixo: false, esq: false, dir: false },
      cadeia: k >= iniciais.length,
    };
    for (const nome of NOMES_DIRECOES) {
      const { dc, dl } = DIRECOES[nome];
      for (let passo = 1; passo <= g.alcance; passo++) {
        const c = g.col + dc * passo;
        const l = g.lin + dl * passo;
        const i = l * m.colunas + c;
        const tipo = m.grade[i];
        if (tipo === BLOCO) {
          // Só o primeiro bloco de cada braço: ele começa a se desfazer e o braço para.
          m.grade[i] = QUEBRANDO;
          m.quebras.push({ i, t: DURACAO_QUEBRA });
          m.eventos.push({ tipo: 'bloco', col: c, lin: l });
          r.batida[nome] = true;
          break;
        }
        if (tipo !== VAZIO) break; // moldura, pilar ou bloco já quebrando
        r.bracos[nome] = passo;
        const outra = m.gotas.find((o) => o.col === c && o.lin === l);
        if (outra) {
          // Cadeia: a gota atingida estoura agora; o braço termina nela.
          if (!marcadas.has(outra.id)) { marcadas.add(outra.id); fila.push(outra); }
          break;
        }
      }
    }
    novos.push(r);
  }
  m.gotas = m.gotas.filter((g) => !marcadas.has(g.id));
  for (const r of novos) {
    m.respingos.push(r);
    m.eventos.push({ tipo: 'respingo', col: r.col, lin: r.lin, dono: r.dono, cadeia: r.cadeia });
  }
  return novos;
}

/** Índices das casas cobertas por um respingo (centro + braços). */
export function casasDoRespingo(m, r) {
  const casas = [r.lin * m.colunas + r.col];
  for (const nome of NOMES_DIRECOES) {
    const { dc, dl } = DIRECOES[nome];
    for (let p = 1; p <= r.bracos[nome]; p++) {
      casas.push((r.lin + dl * p) * m.colunas + (r.col + dc * p));
    }
  }
  return casas;
}

/** Mapa (0/1) das casas letais agora. */
export function casasLetais(m) {
  const letal = new Uint8Array(m.grade.length);
  for (const r of m.respingos) for (const i of casasDoRespingo(m, r)) letal[i] = 1;
  return letal;
}

/** Passa um tick nos respingos e blocos quebrando; blocos desfeitos revelam o item. */
export function envelhecerRespingos(m) {
  for (const r of m.respingos) r.t--;
  m.respingos = m.respingos.filter((r) => r.t > 0);
  for (const q of m.quebras) {
    q.t--;
    if (q.t <= 0) {
      m.grade[q.i] = VAZIO;
      const item = m.ocultos[q.i];
      if (item) {
        m.itens[q.i] = item;
        m.ocultos[q.i] = null;
        m.eventos.push({ tipo: 'itemSurge', col: q.i % m.colunas, lin: Math.floor(q.i / m.colunas), item });
      }
    }
  }
  m.quebras = m.quebras.filter((q) => q.t > 0);
}
