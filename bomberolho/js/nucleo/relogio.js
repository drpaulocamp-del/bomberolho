// Relógio de passo fixo: converte o tempo real entre quadros (variável) num
// número inteiro de ticks de simulação. Assim o jogo anda igual a 30, 60 ou
// 144 quadros por segundo. Contas em "milésimos de tick" para não acumular erro.

import { TPS } from '../sim/constantes.js';

const MILI = 1000; // 1 tick = 1000 milésimos
export const DT_MAXIMO_MS = 250; // aba voltando do segundo plano não vira "avalanche" de ticks

export function criarRelogio() {
  return { acumulado: 0 };
}

/**
 * Soma `dtMs` (multiplicado pela escala de tempo) e devolve quantos ticks rodar.
 * O resto fica guardado para o próximo quadro.
 */
export function avancarRelogio(rel, dtMs, escala = 1) {
  const dt = Math.min(Math.max(dtMs, 0), DT_MAXIMO_MS);
  rel.acumulado += Math.round(dt * TPS * escala);
  const ticks = Math.floor(rel.acumulado / MILI);
  rel.acumulado -= ticks * MILI;
  return ticks;
}

/** Fração (0–1) entre o último tick e o próximo, para interpolar o desenho. */
export function fracaoDoTick(rel) {
  return rel.acumulado / MILI;
}
