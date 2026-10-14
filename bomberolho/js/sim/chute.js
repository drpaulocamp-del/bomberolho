// Chute-Pisca: andar contra uma gota parada a empurra. Ela desliza em linha
// reta, de centro em centro de casa, e para no centro da última casa livre
// antes de algo sólido (pilar, bloco, outra gota, jogador). Itens no chão não
// a seguram. Atingida por respingo enquanto desliza, estoura na casa mais próxima.

import { CASA, MEIA_CASA, VAZIO, DIRECOES } from './constantes.js';
import { gotaEm } from './gotas.js';
import { colDe, linDe, sobrepoe } from './jogadores.js';

/** A casa pode receber uma gota (deslizando ou pousando)? `ignorar` = a própria gota. */
export function casaLivreParaGota(m, col, lin, ignorar = null) {
  if (col < 0 || lin < 0 || col >= m.colunas || lin >= m.linhas) return false;
  if (m.grade[lin * m.colunas + col] !== VAZIO) return false;
  const outra = gotaEm(m, col, lin);
  if (outra && outra !== ignorar) return false;
  return !m.jogadores.some((o) => o.vivo && !o.salto && sobrepoe(o, col, lin));
}

/** Tenta chutar a gota que está colada à frente do jogador. */
export function tentarChutar(m, j, nome) {
  const { dc, dl } = DIRECOES[nome];
  const c = colDe(j);
  const l = linDe(j);
  const desvio = dc !== 0 ? j.y - (l * CASA + MEIA_CASA) : j.x - (c * CASA + MEIA_CASA);
  if (Math.abs(desvio) > 200) return false; // de raspão não chuta
  const g = gotaEm(m, c + dc, l + dl);
  if (!g || g.mov || g.passantes.includes(j.id)) return false;
  const distancia = dc !== 0 ? (g.x - j.x) * dc : (g.y - j.y) * dl;
  if (distancia > CASA) return false; // ainda não encostou
  if (m.jogadores.some((o) => o !== j && o.vivo && !o.salto && sobrepoe(o, g.col, g.lin))) return false;
  if (!casaLivreParaGota(m, g.col + dc, g.lin + dl, g)) return false;
  g.mov = { dir: nome };
  g.passantes = [];
  m.eventos.push({ tipo: 'chute', col: g.col, lin: g.lin, jogador: j.id, dir: nome });
  return true;
}

/** Avança as gotas chutadas um tick. */
export function avancarChutadas(m) {
  for (const g of m.gotas) {
    if (!g.mov || g.estado !== 'chao') continue;
    const { dc, dl } = DIRECOES[g.mov.dir];
    let resto = m.ajuste.velocidadeChute;
    while (resto > 0 && g.mov) {
      const noCentro = g.x % CASA === MEIA_CASA && g.y % CASA === MEIA_CASA;
      if (noCentro && !casaLivreParaGota(m, g.col + dc, g.lin + dl, g)) {
        g.mov = null;
        m.eventos.push({ tipo: 'gotaParou', col: g.col, lin: g.lin });
        break;
      }
      // Anda até o próximo centro de casa (nunca passa dele num passo só).
      const falta = noCentro ? CASA : distanciaAoProximoCentro(g, dc, dl);
      const passo = Math.min(resto, falta);
      g.x += dc * passo;
      g.y += dl * passo;
      resto -= passo;
      g.col = Math.floor(g.x / CASA);
      g.lin = Math.floor(g.y / CASA);
    }
  }
}

function distanciaAoProximoCentro(g, dc, dl) {
  const v = dc !== 0 ? g.x : g.y;
  const s = dc !== 0 ? dc : dl;
  const off = ((v - MEIA_CASA) % CASA + CASA) % CASA; // 0 no centro
  return s > 0 ? CASA - off : off;
}

/** Leva a gota que deslizava para o centro da casa mais próxima (antes de estourar). */
export function assentar(g) {
  g.col = Math.round((g.x - MEIA_CASA) / CASA);
  g.lin = Math.round((g.y - MEIA_CASA) / CASA);
  g.x = g.col * CASA + MEIA_CASA;
  g.y = g.lin * CASA + MEIA_CASA;
  g.mov = null;
}
