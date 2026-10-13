// Utilidades compartilhadas pelos testes da simulação.

export { criarMundo, passo, avancar } from '../../bomberolho/js/sim/mundo.js';
export * as K from '../../bomberolho/js/sim/constantes.js';
import { CASA, MEIA_CASA } from '../../bomberolho/js/sim/constantes.js';
import { criarMundo, passo } from '../../bomberolho/js/sim/mundo.js';

/** Mundo a partir de um mapa em texto (ver gradeDeTexto). */
export function mapa(...linhas) {
  return criarMundo({ semente: 1, mapa: linhas });
}

/** Entrada com as teclas dadas: e('dir', 'baixo'), e('bomba'). */
export function e(...teclas) {
  const r = { cima: false, baixo: false, esq: false, dir: false, bomba: false };
  for (const t of teclas) r[t] = true;
  return r;
}

/** Centro da casa em unidades. */
export const centro = (casa) => casa * CASA + MEIA_CASA;

/** Põe o jogador numa posição exata (em unidades). */
export function posicionar(m, id, x, y) {
  m.jogadores[id].x = x;
  m.jogadores[id].y = y;
}

/** Roda até a condição valer (ou estourar o limite) e devolve os ticks usados. */
export function ate(m, condicao, entradas = [], limite = 2000) {
  for (let k = 0; k < limite; k++) {
    if (condicao(m)) return k;
    passo(m, typeof entradas === 'function' ? entradas(m) : entradas);
  }
  throw new Error('condição não alcançada');
}

/** Casas sólidas (para o jogador) que o corpo dele sobrepõe. */
export function sobreposicoesSolidas(m, j) {
  const ruins = [];
  const c0 = Math.floor((j.x - MEIA_CASA) / CASA);
  const c1 = Math.floor((j.x + MEIA_CASA - 1) / CASA);
  const l0 = Math.floor((j.y - MEIA_CASA) / CASA);
  const l1 = Math.floor((j.y + MEIA_CASA - 1) / CASA);
  for (let l = l0; l <= l1; l++) {
    for (let c = c0; c <= c1; c++) {
      const solidoFixo = m.grade[l * m.colunas + c] !== 0;
      const gota = m.gotas.find((g) => g.col === c && g.lin === l);
      if (solidoFixo || (gota && !gota.passantes.includes(j.id))) ruins.push([c, l]);
    }
  }
  return ruins;
}
