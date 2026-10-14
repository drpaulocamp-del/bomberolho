// Cenários da simulação em lote. Todos os competidores são robôs; o "humano"
// é representado por perfis-proxy com parâmetros explícitos (ver PERFIS).

import { NIVEIS } from '../../bomberolho/js/ia/robo.js';
import { ORDEM_ARENAS } from '../../bomberolho/js/sim/arenas.js';

const S = 60;

/**
 * Perfis que imitam pessoas (só para medir; não existem no jogo):
 *  - novato: uma criança que está aprendendo. Enxerga o alcance certo, mas
 *    reage devagar (0,3 s), não prevê cadeias, planeja a fuga só alguns passos
 *    à frente e sem folga; ataca com vontade desde o começo (criança gosta de
 *    soltar gota perto dos outros) e ignora as táticas avançadas.
 *  - bom: alguém que joga bem — a mesma leitura do robô Difícil.
 */
export const PERFIS = Object.freeze({
  novato: Object.freeze({
    ...NIVEIS.facil,
    margem: 0, reacao: 18, alcanceVisto: 0, semCadeia: true, camadas: 8, calma: 0, perseguir: 0.3, perseguirFinal: 0.6,
    atacar: 0.5, atacaNaFuga: 0, erro: 0.05, usaTatica: 0, usaPoder: 0.3, evitaCisco: false, pausaEntreGotas: 30,
  }),
  bom: NIVEIS.dificil,
});

export function nivelPorNome(nome) {
  if (nome && typeof nome === 'object') return nome; // nível já montado (experimentos)
  return PERFIS[nome] || NIVEIS[nome];
}

/**
 * Lista de partidas (cada uma com semente fixa: o lote é reproduzível).
 * `escala` multiplica as quantidades (0.1 = rápido, 1 = completo).
 */
export function montarPartidas(escala = 1) {
  const partidas = [];
  const q = (n) => Math.max(1, Math.round(n * escala));
  let semente = 1000;
  // A) Mesmo nível, em cada arena: justiça por canto, duração, empates, uso de itens.
  for (const nivel of ['facil', 'medio', 'dificil']) {
    for (const arena of ORDEM_ARENAS) {
      for (let k = 0; k < q(80); k++) {
        partidas.push({ cenario: `mesmo:${nivel}`, nivelGrupo: nivel, arena, niveis: [nivel, nivel, nivel, nivel], semente: semente++, rodadas: 2 });
      }
    }
  }
  // B) Proxies de gente contra os robôs (o proxy passa por todos os cantos).
  const contra = [['novato', 'facil', 300], ['novato', 'medio', 300], ['bom', 'dificil', 300], ['bom', 'medio', 150]];
  for (const [perfil, nivel, n] of contra) {
    for (let k = 0; k < q(n); k++) {
      const canto = k % 4;
      const niveis = [nivel, nivel, nivel, nivel];
      niveis[canto] = perfil;
      partidas.push({ cenario: `${perfil}×${nivel}`, proxy: canto, arena: ORDEM_ARENAS[k % ORDEM_ARENAS.length], niveis, semente: semente++, rodadas: 2 });
    }
  }
  // C) Níveis misturados: um de cada (e um Fácil a mais), girando os cantos.
  for (let k = 0; k < q(480); k++) {
    const base = ['dificil', 'medio', 'facil', 'facil'];
    const niveis = base.map((_, i) => base[(i + k) % 4]);
    partidas.push({ cenario: 'misto', arena: ORDEM_ARENAS[k % ORDEM_ARENAS.length], niveis, semente: semente++, rodadas: 2 });
  }
  return partidas;
}

export const LIMITE_TICKS_RODADA = 7200 + 210 + 90 + 30; // relógio + contagem + pausa final + folga
export { S };
