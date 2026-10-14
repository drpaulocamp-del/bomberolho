// Síntese procedural (WebAudio): blocos básicos — tom com envelope, ruído
// filtrado — e os efeitos sonoros do jogo montados com eles. Nada gravado,
// nada baixado: cada som nasce de osciladores e ruído na hora.

const NOTA_LA = 440;

/** Frequência de uma nota MIDI (69 = Lá 440 Hz). */
export function freq(midi) {
  return NOTA_LA * Math.pow(2, (midi - 69) / 12);
}

/** Buffer de ruído branco reaproveitado por todos os sons. */
export function criarRuido(ctx) {
  const n = Math.floor(ctx.sampleRate * 1);
  const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
  const dados = buffer.getChannelData(0);
  let semente = 12345;
  for (let i = 0; i < n; i++) {
    semente = (semente * 1103515245 + 12345) >>> 0;
    dados[i] = (semente / 0xffffffff) * 2 - 1;
  }
  return buffer;
}

/**
 * Tom com envelope de ataque/queda e, se pedido, deslize de frequência.
 * o = { tipo, f, f2, dur, vol, ataque, saida, vibrato }
 */
export function tom(ctx, t, o) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.tipo || 'sine';
  osc.frequency.setValueAtTime(o.f, t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.dur);
  if (o.vibrato) {
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = o.vibrato.taxa;
    lg.gain.value = o.vibrato.prof;
    lfo.connect(lg).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + o.dur + 0.05);
  }
  const ataque = o.ataque ?? 0.005;
  // Ganho em silêncio desde a criação: sem isto, o primeiro quadro de áudio
  // pode passar com o ganho padrão (1) e virar um estalo de uma amostra.
  g.gain.value = 0;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol), t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  osc.connect(g).connect(o.saida);
  osc.start(t);
  osc.stop(t + o.dur + 0.02);
}

/** Ruído filtrado com varredura do filtro. o = { filtro, f, f2, q, dur, vol, saida } */
export function ruido(ctx, buffer, t, o) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filtro = ctx.createBiquadFilter();
  filtro.type = o.filtro || 'bandpass';
  filtro.frequency.setValueAtTime(o.f, t);
  if (o.f2) filtro.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
  filtro.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  g.gain.value = 0; // idem: nada de estalo na primeira amostra do ruído
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.vol, t + (o.ataque ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(filtro).connect(g).connect(o.saida);
  src.start(t, Math.random() * 0.5);
  src.stop(t + o.dur + 0.02);
}

/** Sequência de notas curtas (arpejos, fanfarras). */
function arpejo(ctx, t, notas, passo, o) {
  notas.forEach((n, k) => tom(ctx, t + k * passo, { tipo: o.tipo || 'triangle', f: freq(n), dur: o.dur ?? passo * 2.2, vol: o.vol, saida: o.saida }));
}

/** Bolhinhas: blips agudos aleatórios (água). */
function bolhas(ctx, t, n, vol, saida) {
  for (let k = 0; k < n; k++) {
    const f = 700 + Math.random() * 900;
    tom(ctx, t + 0.03 + Math.random() * 0.22, { f, f2: f * 1.6, dur: 0.06, vol, saida });
  }
}

/**
 * Efeitos sonoros. Cada um recebe (ctx, ruido, t, saida, extra). Volumes
 * baixos e sons curtos: vão se repetir centenas de vezes numa partida.
 */
export const EFEITOS = {
  gota(ctx, r, t, s) { // "ploc" de gota pousando
    tom(ctx, t, { f: 620, f2: 280, dur: 0.13, vol: 0.5, saida: s });
    tom(ctx, t, { tipo: 'triangle', f: 1240, f2: 600, dur: 0.06, vol: 0.1, saida: s });
  },
  respingo(ctx, r, t, s, forca = 1) { // "splash": chiado que desce + baque macio + bolhas
    ruido(ctx, r, t, { f: 2600, f2: 420, q: 0.9, dur: 0.42, vol: 0.6 * forca, saida: s });
    ruido(ctx, r, t, { filtro: 'highpass', f: 5000, dur: 0.12, vol: 0.08 * forca, saida: s });
    tom(ctx, t, { f: 170, f2: 55, dur: 0.24, vol: 0.55 * forca, saida: s });
    bolhas(ctx, t, 3, 0.05, s);
  },
  bloco(ctx, r, t, s) { // tufinho se desfazendo
    ruido(ctx, r, t, { filtro: 'highpass', f: 2200, dur: 0.13, vol: 0.32, saida: s });
    tom(ctx, t, { tipo: 'triangle', f: 520, f2: 260, dur: 0.07, vol: 0.16, saida: s });
  },
  item(ctx, r, t, s) { // brilho subindo
    arpejo(ctx, t, [76, 80, 83, 88], 0.055, { vol: 0.1, saida: s });
  },
  itemRaro(ctx, r, t, s) {
    arpejo(ctx, t, [76, 80, 83, 88, 92, 95], 0.05, { vol: 0.09, saida: s });
    tom(ctx, t + 0.3, { f: freq(100), dur: 0.4, vol: 0.05, saida: s });
  },
  cisco(ctx, r, t, s) { // "uó-uó" engraçado
    tom(ctx, t, { tipo: 'triangle', f: 420, f2: 300, dur: 0.18, vol: 0.12, saida: s, vibrato: { taxa: 18, prof: 25 } });
    tom(ctx, t + 0.18, { tipo: 'triangle', f: 330, f2: 220, dur: 0.24, vol: 0.12, saida: s, vibrato: { taxa: 18, prof: 25 } });
  },
  espirro(ctx, r, t, s) { // "atchim" de brinquedo
    ruido(ctx, r, t, { f: 1800, f2: 3800, q: 2, dur: 0.12, vol: 0.17, saida: s });
    ruido(ctx, r, t + 0.12, { f: 3000, f2: 900, q: 1, dur: 0.18, vol: 0.22, saida: s });
  },
  encharcado(ctx, r, t, s) { // "piuuu" descendo + bolhas: molhou, vai descansar
    tom(ctx, t, { tipo: 'triangle', f: 980, f2: 240, dur: 0.42, vol: 0.18, saida: s });
    ruido(ctx, r, t, { f: 1200, q: 1.5, dur: 0.2, vol: 0.1, saida: s });
    bolhas(ctx, t + 0.15, 4, 0.05, s);
  },
  contagem(ctx, r, t, s) {
    tom(ctx, t, { f: 660, dur: 0.16, vol: 0.38, saida: s });
  },
  ja(ctx, r, t, s) {
    tom(ctx, t, { tipo: 'triangle', f: 880, dur: 0.35, vol: 0.16, saida: s });
    tom(ctx, t, { tipo: 'triangle', f: 1320, dur: 0.35, vol: 0.1, saida: s });
  },
  aperto(ctx, r, t, s) { // aviso de duas notas, duas vezes
    for (const k of [0, 1]) {
      tom(ctx, t + k * 0.36, { tipo: 'triangle', f: 784, dur: 0.15, vol: 0.11, saida: s });
      tom(ctx, t + k * 0.36 + 0.17, { tipo: 'triangle', f: 587, dur: 0.15, vol: 0.11, saida: s });
    }
  },
  muro(ctx, r, t, s) { // peça do aperto pousando
    tom(ctx, t, { f: 140, f2: 70, dur: 0.14, vol: 0.4, saida: s });
    ruido(ctx, r, t, { filtro: 'lowpass', f: 900, dur: 0.08, vol: 0.1, saida: s });
  },
  chute(ctx, r, t, s) {
    tom(ctx, t, { tipo: 'triangle', f: 280, f2: 520, dur: 0.1, vol: 0.55, saida: s });
    ruido(ctx, r, t, { filtro: 'highpass', f: 3000, dur: 0.05, vol: 0.22, saida: s });
  },
  salto(ctx, r, t, s) { // "boing"
    tom(ctx, t, { f: 260, f2: 880, dur: 0.2, vol: 0.28, saida: s, vibrato: { taxa: 30, prof: 30 } });
  },
  pousou(ctx, r, t, s) {
    tom(ctx, t, { f: 400, f2: 200, dur: 0.1, vol: 0.45, saida: s });
  },
  arremesso(ctx, r, t, s) { // "fiuu"
    ruido(ctx, r, t, { f: 500, f2: 2400, q: 1.2, dur: 0.3, vol: 0.55, saida: s });
    tom(ctx, t, { f: 380, f2: 1100, dur: 0.25, vol: 0.12, saida: s });
  },
  montou(ctx, r, t, s) { // estojo abrindo: arpejo alegre
    arpejo(ctx, t, [72, 76, 79, 84, 79, 84], 0.06, { vol: 0.09, saida: s });
  },
  perdeuBichinho(ctx, r, t, s) {
    arpejo(ctx, t, [79, 74, 70], 0.09, { vol: 0.1, saida: s });
  },
  defendeu(ctx, r, t, s) { // "plim" de carapaça
    tom(ctx, t, { tipo: 'triangle', f: 1560, dur: 0.25, vol: 0.2, saida: s });
    tom(ctx, t, { f: 2340, dur: 0.18, vol: 0.08, saida: s });
  },
  disparada(ctx, r, t, s) {
    ruido(ctx, r, t, { f: 300, f2: 1400, q: 1, dur: 0.25, vol: 0.5, saida: s });
    tom(ctx, t, { tipo: 'triangle', f: 180, f2: 420, dur: 0.2, vol: 0.25, saida: s });
  },
  vitoria(ctx, r, t, s) { // fanfarrinha
    arpejo(ctx, t, [72, 76, 79, 84], 0.12, { vol: 0.12, dur: 0.22, saida: s });
    for (const n of [72, 76, 79, 84]) tom(ctx, t + 0.5, { tipo: 'triangle', f: freq(n), dur: 0.9, vol: 0.05, ataque: 0.02, saida: s });
  },
  rodada(ctx, r, t, s) { // ganhou uma rodada
    arpejo(ctx, t, [79, 84, 88], 0.09, { vol: 0.1, saida: s });
  },
  empate(ctx, r, t, s) { // suave, sem "derrota" triste
    arpejo(ctx, t, [76, 72, 74, 67], 0.14, { vol: 0.08, dur: 0.3, saida: s });
  },
  clique(ctx, r, t, s) {
    tom(ctx, t, { f: 1100, f2: 900, dur: 0.05, vol: 0.35, saida: s });
    tom(ctx, t, { tipo: 'triangle', f: 2200, dur: 0.03, vol: 0.05, saida: s });
  },
  escolha(ctx, r, t, s) {
    tom(ctx, t, { tipo: 'triangle', f: 880, dur: 0.07, vol: 0.12, saida: s });
    tom(ctx, t + 0.06, { tipo: 'triangle', f: 1320, dur: 0.1, vol: 0.1, saida: s });
  },
};
