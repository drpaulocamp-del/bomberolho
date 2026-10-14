// Parâmetros de "sentir" da simulação, num lugar só (seção 3.7 do plano).
// A bancada de ajuste (?ajuste=1) mexe nestes valores em tempo real; a
// simulação lê sempre `m.ajuste`, nunca números soltos. Unidades da
// simulação: posições em unidades (1 casa = 1000) e tempo em ticks (60/s).

export const AJUSTE_PADRAO = Object.freeze({
  velocidadeBase: 55, // un/tick ≈ 3,3 casas/s
  velocidadePasso: 9, // ganho por Lágrima Veloz (até 4)
  pavio: 165, // 2,75 s até a gota estourar
  duracaoRespingo: 30, // 0,5 s letal
  toleranciaQuina: 500, // desvio máximo (un) que ainda escorrega na quina; 500 = meia casa
  janelaVirada: 220, // com duas teclas, quanto (un) dá para "voltar" e pegar a esquina que passou
  velocidadeChute: 130, // un/tick da gota chutada (≈ 7,8 casas/s)
  duracaoRodada: 7200, // 2:00
  inicioAperto: 2700, // o aperto final começa com 0:45 no relógio
  contagem: 210, // "3, 2, 1" (1 s cada) e mais meio segundo de "já!" antes de soltar
  distanciaPinca: 3, // casas do arremesso
  vooPorCasa: 7, // ticks de voo por casa arremessada
  invulneravel: 66, // ≈ 1,1 s piscando depois de perder o bichinho
  duracaoCisco: 600, // 10 s de azar
  velocidadeDisparada: 150, // un/tick da arrancada do bichinho Disparada
  forcaCorrente: 20, // un/tick que a correnteza do Lago Lacrimal empurra
  bonusLente: 2, // alcance extra da gota solta sobre uma lente do Consultório
});

/**
 * Faixas e rótulos da bancada. `escala` converte para a unidade mostrada
 * (ex.: ticks → segundos). Só os parâmetros listados aqui são ajustáveis.
 */
export const FAIXAS_AJUSTE = Object.freeze([
  { chave: 'velocidadeBase', rotulo: 'Velocidade base', min: 35, max: 85, passo: 1, unidade: 'casas/s', escala: 60 / 1000 },
  { chave: 'velocidadePasso', rotulo: 'Ganho por Lágrima Veloz', min: 0, max: 20, passo: 1, unidade: 'casas/s', escala: 60 / 1000 },
  { chave: 'pavio', rotulo: 'Pavio da gota', min: 90, max: 240, passo: 3, unidade: 's', escala: 1 / 60 },
  { chave: 'duracaoRespingo', rotulo: 'Duração do respingo', min: 12, max: 60, passo: 1, unidade: 's', escala: 1 / 60 },
  { chave: 'toleranciaQuina', rotulo: 'Tolerância do deslize de quina', min: 0, max: 500, passo: 10, unidade: 'casa', escala: 1 / 1000 },
  { chave: 'janelaVirada', rotulo: 'Janela para virar a esquina', min: 0, max: 400, passo: 10, unidade: 'casa', escala: 1 / 1000 },
  { chave: 'velocidadeChute', rotulo: 'Velocidade do chute', min: 60, max: 250, passo: 5, unidade: 'casas/s', escala: 60 / 1000 },
  { chave: 'inicioAperto', rotulo: 'Início do aperto final', min: 1200, max: 5400, passo: 60, unidade: 's no relógio', escala: 1 / 60 },
  { chave: 'distanciaPinca', rotulo: 'Distância da Pinça', min: 2, max: 6, passo: 1, unidade: 'casas', escala: 1 },
  { chave: 'invulneravel', rotulo: 'Pisca-pisca ao perder o bichinho', min: 30, max: 150, passo: 6, unidade: 's', escala: 1 / 60 },
  { chave: 'velocidadeDisparada', rotulo: 'Arrancada da Disparada', min: 100, max: 250, passo: 5, unidade: 'casas/s', escala: 60 / 1000 },
  { chave: 'duracaoCisco', rotulo: 'Duração do Cisco', min: 180, max: 900, passo: 30, unidade: 's', escala: 1 / 60 },
]);

/** Cópia do padrão com as mudanças pedidas (só chaves conhecidas e números finitos). */
export function criarAjuste(mudancas = {}) {
  const aj = { ...AJUSTE_PADRAO };
  for (const [k, v] of Object.entries(mudancas || {})) {
    if (k in AJUSTE_PADRAO && Number.isFinite(Number(v))) aj[k] = Math.round(Number(v));
  }
  return aj;
}

/** Diferenças em relação ao padrão (o texto curto que a bancada copia). */
export function diferencasDoPadrao(aj) {
  const d = {};
  for (const k of Object.keys(AJUSTE_PADRAO)) if (aj[k] !== AJUSTE_PADRAO[k]) d[k] = aj[k];
  return d;
}
