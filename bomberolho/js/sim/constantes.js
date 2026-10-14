// Constantes da simulação. Tudo em inteiros para o resultado ser idêntico em
// qualquer máquina: posições em "unidades" (1 casa = 1000 unidades) e tempo em
// ticks de passo fixo (60 por segundo). Os valores de "sentir" (velocidade,
// pavio, respingo…) moram em ajustes.js; os daqui são a estrutura do jogo.

import { AJUSTE_PADRAO } from './ajustes.js';

export const TPS = 60; // ticks por segundo (passo fixo)
export const CASA = 1000; // unidades por casa
export const MEIA_CASA = CASA / 2;

export const COLUNAS = 15; // 13 jogáveis + moldura
export const LINHAS = 13; // 11 jogáveis + moldura

// Tipos de casa da grade.
export const VAZIO = 0;
export const MOLDURA = 1;
export const PILAR = 2;
export const BLOCO = 3;
export const QUEBRANDO = 4; // bloco sendo desfeito pelo respingo: ainda sólido
export const MURO = 5; // peça que caiu no aperto final: sólida para sempre
export const TUNEL = 6; // passagem na moldura (Caverna da Pupila): leva ao lado oposto

// Atalhos para os valores padrão (testes e desenho); a simulação lê m.ajuste.
export const PAVIO = AJUSTE_PADRAO.pavio;
export const DURACAO_RESPINGO = AJUSTE_PADRAO.duracaoRespingo;
export const DURACAO_QUEBRA = DURACAO_RESPINGO; // bloco some junto com o respingo
export const VELOCIDADE_BASE = AJUSTE_PADRAO.velocidadeBase;
export const VELOCIDADE_PASSO = AJUSTE_PADRAO.velocidadePasso;

export const ATRASO_FIM = 90; // 1,5 s entre a última queda e o resultado
export const SOBRA_APERTO = 1200; // o aperto termina 20 s antes do fim do relógio (miolo 5×3 no fim)
export const SOBRA_APERTO_SUAVE = 600; // no Fácil, o aperto se espalha até 10 s do fim: peças caem ~25% mais devagar
export const ANEIS_APERTO = 4; // anéis que caem, de fora para dentro (depois fecham as pontas do miolo 5×3)
export const DISTANCIA_SALTO = 2; // casas do pulo do Saltinho
export const DURACAO_SALTO = 20; // ticks no ar
export const ALCANCE_DISPARADA = 6; // casas máximas de uma arrancada
export const RECARGA_PODER = 45; // ticks entre dois usos do poder do bichinho

export const PODERES_INICIAIS = Object.freeze({ gotas: 1, alcance: 2, velocidade: 0 });
export const LIMITES = Object.freeze({ gotas: 8, alcance: 8, velocidade: 4 });

// Cantos de largada, na ordem dos jogadores 0..3.
export const LARGADAS = Object.freeze([
  Object.freeze({ col: 1, lin: 1 }),
  Object.freeze({ col: COLUNAS - 2, lin: 1 }),
  Object.freeze({ col: 1, lin: LINHAS - 2 }),
  Object.freeze({ col: COLUNAS - 2, lin: LINHAS - 2 }),
]);

export const DIRECOES = Object.freeze({
  cima: Object.freeze({ dc: 0, dl: -1 }),
  baixo: Object.freeze({ dc: 0, dl: 1 }),
  esq: Object.freeze({ dc: -1, dl: 0 }),
  dir: Object.freeze({ dc: 1, dl: 0 }),
});
export const NOMES_DIRECOES = Object.freeze(['cima', 'baixo', 'esq', 'dir']);
