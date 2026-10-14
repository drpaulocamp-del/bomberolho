// Partida = várias rodadas; vence quem ganhar `alvo` rodadas primeiro (1 a 3).
// Empate não dá troféu a ninguém. Para nunca haver partida infinita, depois de
// `2 × alvo + 3` rodadas a partida acaba: leva quem tem mais troféus, ou
// termina empatada se houver empate no topo.

export const ALVO_PADRAO = 2;

export function limiteDeRodadas(alvo) {
  return alvo * 2 + 3;
}

export function criarPartida(alvo = ALVO_PADRAO, competidores = 4) {
  const a = Math.min(3, Math.max(1, Math.round(Number(alvo) || ALVO_PADRAO)));
  return { alvo: a, rodada: 1, vitorias: new Array(competidores).fill(0), historico: [], campeao: null, encerrada: false };
}

/** Registra o resultado de uma rodada (`vencedor` = id ou null) e decide se a partida acabou. */
export function registrarRodada(p, vencedor) {
  if (p.encerrada) return p;
  p.historico.push(vencedor);
  if (vencedor !== null) p.vitorias[vencedor]++;
  if (vencedor !== null && p.vitorias[vencedor] >= p.alvo) {
    p.campeao = vencedor;
    p.encerrada = true;
  } else if (p.historico.length >= limiteDeRodadas(p.alvo)) {
    const max = Math.max(...p.vitorias);
    const lideres = p.vitorias.flatMap((v, id) => (v === max ? [id] : []));
    p.campeao = max > 0 && lideres.length === 1 ? lideres[0] : null;
    p.encerrada = true;
  } else {
    p.rodada++;
  }
  return p;
}

/** Cada rodada tem sua própria arena sorteada, derivada da semente da partida. */
export function sementeDaRodada(semente, rodada) {
  return rodada <= 1 ? semente >>> 0 : (semente + Math.imul(rodada - 1, 0x9e3779b9)) >>> 0;
}
