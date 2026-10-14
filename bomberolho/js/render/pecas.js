// Peças da arena pré-desenhadas em canvases fora da tela, na resolução real do
// aparelho (casa × devicePixelRatio): o quadro só copia imagens prontas.
// Cada arena escolhe um desenho de pilar e de bloco (temas.js).

import { MOLDURA, PILAR, TUNEL } from '../sim/constantes.js';

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

function gradiente(ctx, y0, y1, a, b) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}

/** Base comum dos pilares: sombra e placa arredondada. */
function basePilar(ctx, s, p) {
  ctx.fillStyle = 'rgba(20, 15, 50, 0.22)';
  retanguloRedondo(ctx, s * 0.1, s * 0.16, s * 0.86, s * 0.86, s * 0.2);
  ctx.fill();
  ctx.fillStyle = gradiente(ctx, s * 0.04, s * 0.96, p.base, p.baseEscura);
  retanguloRedondo(ctx, s * 0.05, s * 0.04, s * 0.9, s * 0.9, s * 0.2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = s * 0.035;
  retanguloRedondo(ctx, s * 0.09, s * 0.08, s * 0.82, s * 0.82, s * 0.17);
  ctx.stroke();
}

function brilhoCurvo(ctx, x, y, r, a0, a1, s) {
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = s * 0.04;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, a0, a1);
  ctx.stroke();
}

const PILARES = {
  /** Lente de vidro sobre placa (Jardim). */
  lente(ctx, s, p) {
    basePilar(ctx, s, p);
    const lg = ctx.createRadialGradient(s * 0.4, s * 0.37, s * 0.03, s * 0.5, s * 0.47, s * 0.27);
    lg.addColorStop(0, p.lenteClara);
    lg.addColorStop(1, p.lenteEscura);
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.47, s * 0.27, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = p.aro;
    ctx.lineWidth = s * 0.06;
    ctx.stroke();
    brilhoCurvo(ctx, s * 0.5, s * 0.47, s * 0.17, Math.PI * 1.1, Math.PI * 1.45, s);
  },
  /** Pedra de vidro com ondinhas concêntricas (Lago) — nada parecido com uma gota. */
  ondas(ctx, s, p) {
    basePilar(ctx, s, p);
    ctx.fillStyle = p.lenteEscura;
    ctx.beginPath();
    ctx.ellipse(s * 0.5, s * 0.5, s * 0.32, s * 0.26, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = p.aro;
    ctx.lineWidth = s * 0.045;
    for (const [rx, ry] of [[0.3, 0.24], [0.2, 0.15], [0.09, 0.07]]) {
      ctx.beginPath();
      ctx.ellipse(s * 0.5, s * 0.5, s * rx, s * ry, 0, 0, TAU);
      ctx.stroke();
    }
    brilhoCurvo(ctx, s * 0.5, s * 0.5, s * 0.25, Math.PI * 1.15, Math.PI * 1.45, s);
  },
  /** Pupila escura com aro claro (Caverna) — o aro dá contraste no escuro. */
  pupila(ctx, s, p) {
    basePilar(ctx, s, p);
    ctx.fillStyle = p.aro;
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.47, s * 0.3, 0, TAU);
    ctx.fill();
    const g = ctx.createRadialGradient(s * 0.44, s * 0.4, s * 0.02, s * 0.5, s * 0.47, s * 0.24);
    g.addColorStop(0, p.lenteClara);
    g.addColorStop(1, p.lenteEscura);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.47, s * 0.24, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(s * 0.41, s * 0.38, s * 0.05, 0, TAU);
    ctx.fill();
  },
  /** Cone da retina: triângulo arredondado com listras (Vale). */
  cone(ctx, s, p) {
    ctx.fillStyle = 'rgba(120, 40, 20, 0.2)';
    ctx.beginPath();
    ctx.ellipse(s * 0.52, s * 0.86, s * 0.38, s * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = gradiente(ctx, s * 0.08, s * 0.9, p.base, p.baseEscura);
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.06);
    ctx.quadraticCurveTo(s * 0.62, s * 0.08, s * 0.88, s * 0.78);
    ctx.quadraticCurveTo(s * 0.5, s * 0.96, s * 0.12, s * 0.78);
    ctx.quadraticCurveTo(s * 0.38, s * 0.08, s * 0.5, s * 0.06);
    ctx.fill();
    ctx.strokeStyle = p.aro;
    ctx.lineWidth = s * 0.045;
    ctx.stroke();
    ctx.strokeStyle = p.lenteEscura;
    ctx.lineWidth = s * 0.05;
    for (const y of [0.42, 0.6]) {
      ctx.beginPath();
      ctx.moveTo(s * (0.5 - (y - 0.06) * 0.48), s * y);
      ctx.quadraticCurveTo(s * 0.5, s * (y + 0.06), s * (0.5 + (y - 0.06) * 0.48), s * y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(s * 0.43, s * 0.3, s * 0.04, s * 0.09, 0.3, 0, TAU);
    ctx.fill();
  },
  /** Armação de óculos sobre placa (Consultório). */
  armacao(ctx, s, p) {
    basePilar(ctx, s, p);
    ctx.fillStyle = p.lenteEscura;
    ctx.strokeStyle = p.aro;
    ctx.lineWidth = s * 0.055;
    for (const x of [0.31, 0.69]) {
      ctx.beginPath();
      ctx.arc(s * x, s * 0.5, s * 0.15, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(s * 0.44, s * 0.46);
    ctx.quadraticCurveTo(s * 0.5, s * 0.38, s * 0.56, s * 0.46);
    ctx.stroke();
    brilhoCurvo(ctx, s * 0.31, s * 0.5, s * 0.08, Math.PI * 1.1, Math.PI * 1.5, s);
    brilhoCurvo(ctx, s * 0.69, s * 0.5, s * 0.08, Math.PI * 1.1, Math.PI * 1.5, s);
  },
};

function sombraBloco(ctx, s, cor) {
  ctx.fillStyle = cor;
  retanguloRedondo(ctx, s * 0.1, s * 0.17, s * 0.84, s * 0.82, s * 0.28);
  ctx.fill();
}

const BLOCOS = {
  /** Pólen fofo: bolinhas sobrepostas com grãozinhos (Jardim). */
  polen(ctx, s, b) {
    sombraBloco(ctx, s, 'rgba(120, 80, 20, 0.2)');
    const bolas = [[0.32, 0.36, 0.25], [0.68, 0.36, 0.25], [0.3, 0.66, 0.26], [0.7, 0.66, 0.26], [0.5, 0.5, 0.3]];
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
    ctx.fillStyle = b.grao;
    for (const [x, y] of [[0.3, 0.3], [0.62, 0.27], [0.45, 0.55], [0.72, 0.62], [0.27, 0.7], [0.55, 0.78]]) {
      ctx.beginPath();
      ctx.arc(s * x, s * y, s * 0.03, 0, TAU);
      ctx.fill();
    }
  },
  /** Cristal de sal de lágrima: hexágono facetado (Lago). */
  cristal(ctx, s, b) {
    sombraBloco(ctx, s, 'rgba(30, 90, 140, 0.18)');
    const pts = Array.from({ length: 6 }, (_, k) => {
      const a = (k / 6) * TAU + Math.PI / 6;
      return [s * (0.5 + Math.cos(a) * 0.42), s * (0.5 + Math.sin(a) * 0.42)];
    });
    ctx.fillStyle = gradiente(ctx, s * 0.08, s * 0.92, b.clara, b.escura);
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = b.borda;
    ctx.lineWidth = s * 0.035;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = s * 0.025;
    for (const k of [0, 2, 4]) {
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.5);
      ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.stroke();
    }
    ctx.fillStyle = b.grao;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.5);
    ctx.lineTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  },
  /** Pedrinhas de cisco arredondadas, claras para contrastar no escuro (Caverna). */
  pedra(ctx, s, b) {
    sombraBloco(ctx, s, 'rgba(0, 0, 0, 0.35)');
    for (const [x, y, rx, ry] of [[0.36, 0.62, 0.27, 0.22], [0.66, 0.6, 0.25, 0.24], [0.5, 0.36, 0.3, 0.24]]) {
      const g = ctx.createRadialGradient(s * (x - 0.08), s * (y - 0.08), s * 0.03, s * x, s * y, s * rx);
      g.addColorStop(0, b.clara);
      g.addColorStop(0.7, b.media);
      g.addColorStop(1, b.escura);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(s * x, s * y, s * rx, s * ry, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = b.borda;
      ctx.lineWidth = s * 0.03;
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(s * 0.42, s * 0.28, s * 0.07, s * 0.035, -0.4, 0, TAU);
    ctx.fill();
  },
  /** Feixe de bastonetes (cápsulas em pé) (Vale). */
  bastonete(ctx, s, b) {
    sombraBloco(ctx, s, 'rgba(70, 30, 110, 0.2)');
    for (const [x, h] of [[0.27, 0.62], [0.5, 0.74], [0.73, 0.62]]) {
      const topo = s * (0.5 - h / 2) + s * 0.04;
      ctx.fillStyle = gradiente(ctx, topo, topo + s * h, b.clara, b.escura);
      retanguloRedondo(ctx, s * (x - 0.1), topo, s * 0.2, s * h, s * 0.1);
      ctx.fill();
      ctx.strokeStyle = b.borda;
      ctx.lineWidth = s * 0.03;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      retanguloRedondo(ctx, s * (x - 0.05), topo + s * 0.05, s * 0.04, s * h * 0.45, s * 0.02);
      ctx.fill();
    }
  },
  /** Caixinha de lente de contato com fita (Consultório). */
  caixa(ctx, s, b) {
    sombraBloco(ctx, s, 'rgba(30, 50, 80, 0.18)');
    ctx.fillStyle = gradiente(ctx, s * 0.1, s * 0.9, b.clara, b.media);
    retanguloRedondo(ctx, s * 0.1, s * 0.12, s * 0.8, s * 0.76, s * 0.12);
    ctx.fill();
    ctx.strokeStyle = b.borda;
    ctx.lineWidth = s * 0.035;
    ctx.stroke();
    ctx.fillStyle = b.escura;
    ctx.fillRect(s * 0.1, s * 0.42, s * 0.8, s * 0.1);
    ctx.strokeStyle = b.grao;
    ctx.lineWidth = s * 0.04;
    ctx.beginPath();
    ctx.arc(s * 0.5, s * 0.47, s * 0.13, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(s * 0.46, s * 0.43, s * 0.035, 0, TAU);
    ctx.fill();
  },
};

/** Peça do aperto final: placa pesada listrada (nunca quebra). */
function desenharMuro(ctx, s, cor) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  retanguloRedondo(ctx, s * 0.06, s * 0.12, s * 0.92, s * 0.9, s * 0.16);
  ctx.fill();
  ctx.fillStyle = gradiente(ctx, s * 0.02, s * 0.96, cor.clara, cor.escura);
  retanguloRedondo(ctx, s * 0.03, s * 0.02, s * 0.94, s * 0.92, s * 0.16);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = cor.risco;
  ctx.lineWidth = s * 0.07;
  for (let k = -1; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(s * (k * 0.4 - 0.1), s);
    ctx.lineTo(s * (k * 0.4 + 0.6), 0);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const [x, y] of [[0.18, 0.16], [0.82, 0.16], [0.18, 0.8], [0.82, 0.8]]) {
    ctx.beginPath();
    ctx.arc(s * x, s * y, s * 0.045, 0, TAU);
    ctx.fill();
  }
}

// Pseudoaleatório só para a decoração (não afeta o jogo).
function ruido(i) {
  let h = Math.imul(i ^ 0x5bd1e995, 0x27d4eb2d);
  h ^= h >>> 15;
  return ((h >>> 0) % 1000) / 1000;
}

function decorar(ctx, tema, c, l, px, i) {
  const x = (c + 0.2 + ruido(i + 7) * 0.6) * px;
  const y = (l + 0.2 + ruido(i + 13) * 0.6) * px;
  if (ruido(i) > 0.22) return;
  switch (tema.decoracao) {
    case 'flores': {
      const r = px * 0.045;
      ctx.fillStyle = tema.flores[Math.floor(ruido(i + 999) * tema.flores.length)];
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
      break;
    }
    case 'ondinhas':
      ctx.strokeStyle = 'rgba(80, 160, 210, 0.35)';
      ctx.lineWidth = px * 0.025;
      ctx.beginPath();
      ctx.arc(x, y, px * 0.08, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      break;
    case 'brilhos':
      ctx.fillStyle = 'rgba(200, 190, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(x, y, px * 0.025, 0, TAU);
      ctx.fill();
      break;
    case 'pontinhos':
      ctx.fillStyle = tema.flores[Math.floor(ruido(i + 3) * tema.flores.length)];
      ctx.beginPath();
      ctx.arc(x, y, px * 0.035, 0, TAU);
      ctx.fill();
      break;
    default:
      break;
  }
}

/** Faixa de água da correnteza (a seta animada é desenhada a cada quadro). */
function desenharAgua(ctx, tema, mundo, px) {
  ctx.fillStyle = tema.agua.fundo;
  mundo.piso.forEach((p, i) => {
    if (!p || p === 'lente') return;
    const c = i % mundo.colunas;
    const l = Math.floor(i / mundo.colunas);
    ctx.fillRect(c * px, l * px, px, px);
  });
  ctx.strokeStyle = tema.agua.borda;
  ctx.lineWidth = px * 0.05;
  mundo.piso.forEach((p, i) => {
    if (!p || p === 'lente') return;
    const c = i % mundo.colunas;
    const l = Math.floor(i / mundo.colunas);
    const vizinho = (dc, dl) => {
      const v = mundo.piso[(l + dl) * mundo.colunas + c + dc];
      return v && v !== 'lente';
    };
    ctx.beginPath();
    if (!vizinho(0, -1)) { ctx.moveTo(c * px, l * px); ctx.lineTo((c + 1) * px, l * px); }
    if (!vizinho(0, 1)) { ctx.moveTo(c * px, (l + 1) * px); ctx.lineTo((c + 1) * px, (l + 1) * px); }
    if (!vizinho(-1, 0)) { ctx.moveTo(c * px, l * px); ctx.lineTo(c * px, (l + 1) * px); }
    if (!vizinho(1, 0)) { ctx.moveTo((c + 1) * px, l * px); ctx.lineTo((c + 1) * px, (l + 1) * px); }
    ctx.stroke();
  });
}

/** Lente no chão (Consultório): anel azul com vidro e "+2". */
function desenharLentesDoChao(ctx, tema, mundo, px) {
  mundo.piso.forEach((p, i) => {
    if (p !== 'lente') return;
    const x = (i % mundo.colunas + 0.5) * px;
    const y = (Math.floor(i / mundo.colunas) + 0.5) * px;
    ctx.fillStyle = tema.lente.vidro;
    ctx.beginPath();
    ctx.arc(x, y, px * 0.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = tema.lente.aro;
    ctx.lineWidth = px * 0.07;
    ctx.stroke();
    ctx.setLineDash([px * 0.08, px * 0.08]);
    ctx.lineWidth = px * 0.03;
    ctx.beginPath();
    ctx.arc(x, y, px * 0.28, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = tema.lente.aro;
    ctx.font = `800 ${Math.round(px * 0.26)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+2', x, y + px * 0.01);
  });
}

/** Boca de túnel na moldura (Caverna): arco escuro com setinhas. */
function desenharTuneis(ctx, tema, mundo, px) {
  for (let i = 0; i < mundo.grade.length; i++) {
    if (mundo.grade[i] !== TUNEL) continue;
    const c = i % mundo.colunas;
    const l = Math.floor(i / mundo.colunas);
    const x = c * px;
    const y = l * px;
    ctx.fillStyle = tema.tunel.boca;
    retanguloRedondo(ctx, x + px * 0.04, y + px * 0.1, px * 0.92, px * 0.8, px * 0.35);
    ctx.fill();
    ctx.strokeStyle = tema.tunel.brilho;
    ctx.lineWidth = px * 0.05;
    ctx.stroke();
    const saindo = c === 0 ? -1 : 1;
    ctx.strokeStyle = 'rgba(200, 190, 255, 0.9)';
    ctx.lineWidth = px * 0.06;
    ctx.lineCap = 'round';
    for (const k of [0, 1]) {
      const cx = x + px * (0.5 + saindo * (k * 0.22 - 0.1));
      ctx.beginPath();
      ctx.moveTo(cx - saindo * px * 0.08, y + px * 0.36);
      ctx.lineTo(cx + saindo * px * 0.06, y + px * 0.5);
      ctx.lineTo(cx - saindo * px * 0.08, y + px * 0.64);
      ctx.stroke();
    }
  }
}

/**
 * Fundo estático: piso, elementos de chão, moldura em forma de armação de
 * óculos e pilares. Também prepara os sprites de bloco e de muro.
 * @returns {{fundo: HTMLCanvasElement, bloco: HTMLCanvasElement, muro: HTMLCanvasElement, s: number, dpr: number}}
 */
export function criarPecas(mundo, tema, s, dpr) {
  const px = s * dpr;
  const W = mundo.colunas * px;
  const H = mundo.linhas * px;
  const fundo = novoCanvas(W, H);
  const ctx = fundo.getContext('2d');

  for (let l = 1; l < mundo.linhas - 1; l++) {
    for (let c = 1; c < mundo.colunas - 1; c++) {
      ctx.fillStyle = tema.piso[(c + l) % 2];
      ctx.fillRect(c * px, l * px, px, px);
      decorar(ctx, tema, c, l, px, l * mundo.colunas + c);
    }
  }
  if (tema.decoracao === 'azulejos') {
    ctx.strokeStyle = 'rgba(120, 140, 170, 0.18)';
    ctx.lineWidth = Math.max(1, px * 0.02);
    for (let l = 1; l < mundo.linhas; l++) { ctx.beginPath(); ctx.moveTo(px, l * px); ctx.lineTo(W - px, l * px); ctx.stroke(); }
    for (let c = 1; c < mundo.colunas; c++) { ctx.beginPath(); ctx.moveTo(c * px, px); ctx.lineTo(c * px, H - px); ctx.stroke(); }
  }
  if (tema.agua) desenharAgua(ctx, tema, mundo, px);
  if (tema.lente) desenharLentesDoChao(ctx, tema, mundo, px);

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
  ctx.save();
  ctx.fillStyle = gradiente(ctx, 0, H, m.clara, m.escura);
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
  if (tema.tunel) desenharTuneis(ctx, tema, mundo, px);

  const pilar = novoCanvas(px, px);
  (PILARES[tema.pilar.estilo] || PILARES.lente)(pilar.getContext('2d'), px, tema.pilar);
  for (let l = 0; l < mundo.linhas; l++) {
    for (let c = 0; c < mundo.colunas; c++) {
      if (mundo.grade[l * mundo.colunas + c] === PILAR) ctx.drawImage(pilar, c * px, l * px);
    }
  }

  const bloco = novoCanvas(px, px);
  (BLOCOS[tema.bloco.estilo] || BLOCOS.polen)(bloco.getContext('2d'), px, tema.bloco);
  const muro = novoCanvas(px, px);
  desenharMuro(muro.getContext('2d'), px, tema.muro);
  return { fundo, bloco, muro, s, dpr };
}
