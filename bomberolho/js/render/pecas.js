// Peças da arena pré-desenhadas em canvases fora da tela, na resolução real do
// aparelho (casa × devicePixelRatio): o quadro só copia imagens prontas.

import { MOLDURA, PILAR } from '../sim/constantes.js';

const TAU = Math.PI * 2;

function novoCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function retanguloRedondo(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Pilar-lente: base lilás com uma lente de vidro e reflexo. */
function desenharPilar(ctx, s, t) {
  const p = t.pilar;
  ctx.fillStyle = 'rgba(40, 30, 90, 0.22)';
  retanguloRedondo(ctx, s * 0.1, s * 0.16, s * 0.86, s * 0.86, s * 0.2);
  ctx.fill();
  const g = ctx.createLinearGradient(0, s * 0.04, 0, s * 0.96);
  g.addColorStop(0, p.base);
  g.addColorStop(1, p.baseEscura);
  ctx.fillStyle = g;
  retanguloRedondo(ctx, s * 0.05, s * 0.04, s * 0.9, s * 0.9, s * 0.2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = s * 0.035;
  retanguloRedondo(ctx, s * 0.09, s * 0.08, s * 0.82, s * 0.82, s * 0.17);
  ctx.stroke();
  // Lente.
  const lx = s * 0.5;
  const ly = s * 0.47;
  const lr = s * 0.27;
  const lg = ctx.createRadialGradient(lx - lr * 0.4, ly - lr * 0.4, lr * 0.1, lx, ly, lr);
  lg.addColorStop(0, p.lenteClara);
  lg.addColorStop(1, p.lenteEscura);
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.arc(lx, ly, lr, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = p.aro;
  ctx.lineWidth = s * 0.06;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = s * 0.04;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(lx, ly, lr * 0.62, Math.PI * 1.1, Math.PI * 1.45);
  ctx.stroke();
}

/** Bloco de pólen fofo: bolinhas sobrepostas com grãozinhos. */
function desenharBloco(ctx, s, t) {
  const b = t.bloco;
  ctx.fillStyle = 'rgba(120, 80, 20, 0.2)';
  retanguloRedondo(ctx, s * 0.1, s * 0.17, s * 0.84, s * 0.82, s * 0.28);
  ctx.fill();
  const bolas = [
    [0.32, 0.36, 0.25], [0.68, 0.36, 0.25], [0.3, 0.66, 0.26], [0.7, 0.66, 0.26], [0.5, 0.5, 0.3],
  ];
  for (const [x, y, r] of bolas) {
    const g = ctx.createRadialGradient(s * (x - r * 0.35), s * (y - r * 0.4), s * r * 0.15, s * x, s * y, s * r);
    g.addColorStop(0, b.clara);
    g.addColorStop(0.6, b.media);
    g.addColorStop(1, b.escura);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s * x, s * y, s * r, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = b.borda;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = s * 0.025;
  for (const [x, y, r] of bolas.slice(0, 4)) {
    ctx.beginPath();
    ctx.arc(s * x, s * y, s * r, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = b.grao;
  for (const [x, y] of [[0.3, 0.3], [0.62, 0.27], [0.45, 0.55], [0.72, 0.62], [0.27, 0.7], [0.55, 0.78]]) {
    ctx.beginPath();
    ctx.arc(s * x, s * y, s * 0.03, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(s * 0.36, s * 0.24, s * 0.08, s * 0.04, -0.5, 0, TAU);
  ctx.fill();
}

/** Florzinha decorativa do piso. */
function florDoPiso(ctx, x, y, r, cor) {
  ctx.fillStyle = cor;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + 0.4;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#FFE08A';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, 0, TAU);
  ctx.fill();
}

// Pseudoaleatório só para a decoração (não afeta o jogo).
function ruido(i) {
  let h = Math.imul(i ^ 0x5bd1e995, 0x27d4eb2d);
  h ^= h >>> 15;
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Fundo estático: piso, moldura em forma de armação de óculos e pilares-lente.
 * @returns {{fundo: HTMLCanvasElement, bloco: HTMLCanvasElement, s: number, dpr: number}}
 */
export function criarPecas(mundo, tema, s, dpr) {
  const px = s * dpr;
  const W = mundo.colunas * px;
  const H = mundo.linhas * px;
  const fundo = novoCanvas(W, H);
  const ctx = fundo.getContext('2d');

  // Piso xadrez suave com flores esparsas.
  for (let l = 1; l < mundo.linhas - 1; l++) {
    for (let c = 1; c < mundo.colunas - 1; c++) {
      ctx.fillStyle = tema.piso[(c + l) % 2];
      ctx.fillRect(c * px, l * px, px, px);
      const i = l * mundo.colunas + c;
      if (ruido(i) < 0.22) {
        const cor = tema.flores[Math.floor(ruido(i + 999) * tema.flores.length)];
        florDoPiso(ctx, (c + 0.2 + ruido(i + 7) * 0.6) * px, (l + 0.2 + ruido(i + 13) * 0.6) * px, px * 0.045, cor);
      }
    }
  }

  // Sombra projetada pelos sólidos (para baixo), dando profundidade.
  ctx.fillStyle = tema.pisoSombra;
  for (let l = 0; l < mundo.linhas - 1; l++) {
    for (let c = 0; c < mundo.colunas; c++) {
      const t = mundo.grade[l * mundo.colunas + c];
      if ((t === MOLDURA || t === PILAR) && mundo.grade[(l + 1) * mundo.colunas + c] !== MOLDURA) {
        ctx.fillRect(c * px, (l + 1) * px, px, px * 0.18);
      }
    }
  }

  // Moldura: armação arredondada com dobradiças nos cantos.
  const m = tema.moldura;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, m.clara);
  g.addColorStop(1, m.escura);
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, px * 0.7);
  ctx.roundRect(px * 0.92, px * 0.92, W - px * 1.84, H - px * 1.84, px * 0.25);
  ctx.fill('evenodd');
  ctx.strokeStyle = m.brilho;
  ctx.lineWidth = px * 0.08;
  ctx.beginPath();
  ctx.roundRect(px * 0.2, px * 0.2, W - px * 0.4, H - px * 0.4, px * 0.55);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(30, 20, 80, 0.35)';
  ctx.lineWidth = px * 0.06;
  ctx.beginPath();
  ctx.roundRect(px * 0.92, px * 0.92, W - px * 1.84, H - px * 1.84, px * 0.25);
  ctx.stroke();
  ctx.fillStyle = m.dobradica;
  for (const [x, y] of [[0.46, 0.46], [mundo.colunas - 0.46, 0.46], [0.46, mundo.linhas - 0.46], [mundo.colunas - 0.46, mundo.linhas - 0.46]]) {
    ctx.beginPath();
    ctx.arc(x * px, y * px, px * 0.13, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // Pilares.
  const pilar = novoCanvas(px, px);
  desenharPilar(pilar.getContext('2d'), px, tema);
  for (let l = 0; l < mundo.linhas; l++) {
    for (let c = 0; c < mundo.colunas; c++) {
      if (mundo.grade[l * mundo.colunas + c] === PILAR) ctx.drawImage(pilar, c * px, l * px);
    }
  }

  const bloco = novoCanvas(px, px);
  desenharBloco(bloco.getContext('2d'), px, tema);
  return { fundo, bloco, s, dpr };
}
