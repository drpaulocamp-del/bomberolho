// Partida = várias rodadas; vence quem ganhar `alvo` rodadas primeiro (1 a 3).
// Empate não dá troféu a ninguém. Para nunca haver partida infinita (e ela
// caber numa espera de consultório), depois de `2 × alvo + 1` rodadas a
// partida acaba: leva quem tem mais troféus; empatados no topo, desempata
// quem molhou mais rivais na partida; se ainda empatar, a partida empata.

export const ALVO_PADRAO = 2;

export function limiteDeRodadas(alvo) {
  return alvo * 2 + 1;
}

export function criarPartida(alvo = ALVO_PADRAO, competidores = 4) {
  const a = Math.min(3, Math.max(1, Math.round(Number(alvo) || ALVO_PADRAO)));
  return {
    alvo: a, rodada: 1, vitorias: new Array(competidores).fill(0), molhados: new Array(competidores).fill(0),
    historico: [], campeao: null, encerrada: false, desempate: false,
  };
}

/**
 * Registra o resultado de uma rodada (`vencedor` = id ou null; `molhados[id]` =
 * rivais que cada um molhou nela) e decide se a partida acabou.
 */
export function registrarRodada(p, vencedor, molhados = []) {
  if (p.encerrada) return p;
  p.historico.push(vencedor);
  molhados.forEach((n, id) => { p.molhados[id] += n; });
  if (vencedor !== null) p.vitorias[vencedor]++;
  if (vencedor !== null && p.vitorias[vencedor] >= p.alvo) {
    p.campeao = vencedor;
    p.encerrada = true;
  } else if (p.historico.length >= limiteDeRodadas(p.alvo)) {
    const max = Math.max(...p.vitorias);
    let lideres = p.vitorias.flatMap((v, id) => (v === max ? [id] : []));
    if (lideres.length > 1) {
      const maisMolhou = Math.max(...lideres.map((id) => p.molhados[id]));
      lideres = lideres.filter((id) => p.molhados[id] === maisMolhou);
      p.desempate = lideres.length === 1;
    }
    p.campeao = lideres.length === 1 ? lideres[0] : null;
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

/** Rivais que cada competidor molhou numa rodada (crédito do respingo; queda no aperto não conta). */
export function molhadosNaRodada(m) {
  const n = m.jogadores.map(() => 0);
  for (const j of m.jogadores) if (!j.vivo && j.eliminadoPor !== null && j.eliminadoPor !== j.id) n[j.eliminadoPor]++;
  return n;
}
