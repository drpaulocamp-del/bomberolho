// Joga uma partida inteira sem cabeça, pelo controlador real (js/jogo.js), e
// devolve as medições: rodadas, durações, quedas por causa, itens, poderes,
// tempo parado, e as checagens de robustez (NaN, rodada sem fim).

import { Jogo } from '../../bomberolho/js/jogo.js';
import { limiteDeRodadas } from '../../bomberolho/js/sim/partida.js';
import { nivelPorNome, LIMITE_TICKS_RODADA } from './cenarios.mjs';

const EVENTOS_DE_PODER = ['chute', 'levantou', 'arremesso', 'salto', 'disparada', 'defendeu', 'perdeuBichinho', 'montou', 'espirro', 'cisco'];

export function jogarPartida(spec) {
  const jogo = new Jogo();
  jogo.demo = true;
  const niveis = spec.niveis.map(nivelPorNome);
  jogo.iniciar({ semente: spec.semente, arena: spec.arena, dificuldade: 'facil', niveis, rodadas: spec.rodadas, contagem: true });
  const r = {
    cenario: spec.cenario, arena: spec.arena, niveis: spec.niveis, proxy: spec.proxy ?? null,
    rodadas: [], campeao: null, problemas: [],
    itens: spec.niveis.map(() => ({})), poderes: spec.niveis.map(() => ({})),
    paradoMax: spec.niveis.map(() => 0), contas: [],
  };
  let rodada = null;
  const parado = [0, 0, 0, 0];
  const antes = [];
  let ticksTotais = 0;
  const limiteTotal = LIMITE_TICKS_RODADA * (limiteDeRodadas(jogo.partida.alvo) + 1) + 400 * limiteDeRodadas(jogo.partida.alvo);
  while (!jogo.partida.encerrada) {
    if (++ticksTotais > limiteTotal) {
      r.problemas.push('partida sem fim');
      break;
    }
    jogo.tick();
    const m = jogo.mundo;
    if (!rodada || rodada.mundo !== m) {
      rodada = { mundo: m, quedas: [], contas: null };
      antes.length = 0;
    }
    if (m.tick > LIMITE_TICKS_RODADA && m.fase !== 'fim' && !r.problemas.includes('rodada passou do limite')) r.problemas.push('rodada passou do limite');
    for (const j of m.jogadores) {
      if (!Number.isFinite(j.x) || !Number.isFinite(j.y)) r.problemas.push(`NaN na posição (jogador ${j.id})`);
      if (m.fase === 'jogando' && j.vivo && jogo.intervalo === 0) {
        const a = antes[j.id];
        const quieto = a && a[0] === j.x && a[1] === j.y && !j.escudo;
        parado[j.id] = quieto ? parado[j.id] + 1 : 0;
        if (parado[j.id] > r.paradoMax[j.id]) r.paradoMax[j.id] = parado[j.id];
      } else parado[j.id] = 0;
      antes[j.id] = [j.x, j.y];
    }
    for (const e of jogo.consumirEventos()) {
      if (e.tipo === 'encharcado') rodada.quedas.push({ jogador: e.jogador, por: e.por, motivo: e.motivo, tick: m.tick, cisco: m.jogadores[e.jogador].cisco?.tipo ?? null, restante: m.tempoRestante });
      else if (e.tipo === 'item') r.itens[e.jogador][e.item] = (r.itens[e.jogador][e.item] || 0) + 1;
      else if (EVENTOS_DE_PODER.includes(e.tipo) && e.jogador !== undefined) r.poderes[e.jogador][e.tipo] = (r.poderes[e.jogador][e.tipo] || 0) + 1;
      else if (e.tipo === 'respingo' && e.penetrante) r.poderes[e.dono].penetrante = (r.poderes[e.dono].penetrante || 0) + 1;
      else if (e.tipo === 'fimRodada') {
        r.rodadas.push({
          vencedor: e.vencedor,
          tempoEsgotado: m.tempoEsgotado,
          segundos: (m.ajuste.duracaoRodada - Math.max(0, m.tempoRestante)) / 60,
          quedas: rodada.quedas,
          vivosNoFim: m.jogadores.filter((j) => j.vivo).length,
        });
        r.contas.push(jogo.robos.map((rb) => ({ ...rb.contas })));
      }
    }
  }
  r.campeao = jogo.partida.campeao;
  r.encerrada = jogo.partida.encerrada;
  return r;
}
