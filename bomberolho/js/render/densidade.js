// Densidade de pixels adaptativa do canvas da arena. Começa nítida (até 2×) e,
// se o aparelho não der conta (quadro médio acima de ~22 ms, isto é, abaixo de
// ~45 qps, por 0,8 s seguidos de partida), desce: 2 → 1,5 → 1,25 → 1 (pulando
// degraus se o quadro estiver muito lento).
// Menos pixels por quadro é o que mais alivia um celular simples; a diferença
// de nitidez entre 2× e 1,5× numa tela pequena quase não se vê. Só desce
// (subir e descer em seguida faria a imagem "pulsar"); recarregar recomeça.

const DEGRAUS = [2, 1.5, 1.25, 1];
const LIMITE_MS = 22; // quadro médio acima disto (abaixo de ~45 qps) = lento
const JANELA_MS = 800; // tempo lento seguido antes de descer
const FOLGA_MS = 400; // depois de mudar, espera o quadro novo se acomodar

/**
 * @param {number} maxima densidade do aparelho (devicePixelRatio)
 * @param {number|null} fixa densidade fixada (teste/URL), sem adaptação
 */
export function criarDensidade(maxima, fixa = null) {
  const teto = Math.min(2, Math.max(1, maxima || 1));
  const degraus = DEGRAUS.filter((d) => d <= teto);
  if (degraus[0] !== teto) degraus.unshift(teto);
  let nivel = 0;
  let media = 16.7;
  let lentoDesde = null;
  let folgaAte = 0;
  return {
    /** Densidade a usar agora. */
    get valor() {
      return fixa ?? degraus[nivel];
    },
    /**
     * Registra um quadro de partida (dt em ms, `agora` em ms). Devolve true
     * quando a densidade mudou (o canvas precisa ser refeito).
     */
    registrar(dt, agora) {
      if (fixa !== null || nivel >= degraus.length - 1) return false;
      if (agora < folgaAte) return false;
      media = media * 0.9 + Math.min(dt, 100) * 0.1;
      if (media <= LIMITE_MS) {
        lentoDesde = null;
        return false;
      }
      lentoDesde ??= agora;
      if (agora - lentoDesde < JANELA_MS) return false;
      // Desce de uma vez até o degrau que deve caber no quadro (o custo do
      // desenho cresce com o quadrado da densidade): menos trocas = menos tropeços.
      const alvo = degraus[nivel] * Math.sqrt(18 / media);
      do nivel++; while (nivel < degraus.length - 1 && degraus[nivel] > alvo);
      lentoDesde = null;
      media = 16.7;
      folgaAte = agora + FOLGA_MS;
      return true;
    },
    /** Quadros fora da partida (pausa, menu, aba escondida) não contam. */
    esquecer() {
      lentoDesde = null;
      media = 16.7;
    },
  };
}
