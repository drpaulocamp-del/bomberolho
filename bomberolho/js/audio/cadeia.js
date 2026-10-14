// Cadeia de saída do som, a mesma no jogo e nas medições (qa/ferramentas/medir-som.mjs):
//
//   efeitos ─┐
//            ├─ mestre ─ compressor suave ─ compensação ─ limitador ─ saturação ─ saída
//   trilha  ─┘
//
// O compressor só arredonda os picos (cadeias de respingos) e a compensação
// devolve o volume que ele tira; o limitador segura as rajadas e a saturação
// suave (tanh) apara o resto do pico que ele deixa passar: nunca estoura. A trilha
// fica uns 10 dB abaixo dos efeitos, para nunca cobrir o "ploc" e o "splash".

export const NIVEIS = Object.freeze({
  efeitos: 1.0,
  trilha: 0.25,
  mestre: 0.9,
  compensacao: 2.2, // ≈ +7 dB depois do compressor
});

export function criarCadeia(ctx) {
  const efeitos = ctx.createGain();
  efeitos.gain.value = NIVEIS.efeitos;
  const trilha = ctx.createGain();
  trilha.gain.value = NIVEIS.trilha;
  const mestre = ctx.createGain();
  mestre.gain.value = NIVEIS.mestre;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 8;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.2;

  const compensacao = ctx.createGain();
  compensacao.gain.value = NIVEIS.compensacao;

  const limitador = ctx.createDynamicsCompressor();
  limitador.threshold.value = -8;
  limitador.knee.value = 0;
  limitador.ratio.value = 20;
  limitador.attack.value = 0.001;
  limitador.release.value = 0.1;

  const saturacao = ctx.createWaveShaper();
  saturacao.curve = curvaSuave();

  efeitos.connect(mestre);
  trilha.connect(mestre);
  mestre.connect(compressor).connect(compensacao).connect(limitador).connect(saturacao).connect(ctx.destination);
  return { efeitos, trilha, mestre };
}

/** Linear até ~0,4 e arredondando até no máximo ~0,72 (−2,8 dBFS). */
function curvaSuave() {
  const n = 2048;
  const curva = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curva[i] = 0.89 * Math.tanh(x / 0.89);
  }
  return curva;
}
