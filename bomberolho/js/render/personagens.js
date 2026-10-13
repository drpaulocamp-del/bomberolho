// Desenho das criaturinhas-olho: corpo redondo que é um olho (esclera branca,
// pálpebra na cor do personagem, íris e pupila que olham para onde ele anda),
// pezinhos, bracinhos e um acessório de forma própria. Tudo em vetor.

const TAU = Math.PI * 2;

const OLHAR = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] };

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} p  definição (js/dados/personagens.js)
 * @param {object} o  { x, y (centro da casa, px), s (casa, px), dir, andando,
 *                     fase (s, para animar), piscar (0..1), molhado (0..1), alfa }
 */
export function desenharPersonagem(ctx, p, o) {
  const { s } = o;
  const molhado = o.molhado || 0;
  const passo = o.andando ? Math.sin(o.fase * 14) : 0;
  const pulo = o.andando ? Math.abs(Math.sin(o.fase * 14)) * s * 0.035 : Math.sin(o.fase * 2.2) * s * 0.012;
  const R = s * 0.37;
  const cx = o.x;
  const cy = o.y - s * 0.04 - pulo + molhado * s * 0.12;
  const [ox, oy] = OLHAR[o.dir] || OLHAR.baixo;

  ctx.save();
  ctx.globalAlpha = o.alfa ?? 1;

  // Sombra no chão.
  ctx.fillStyle = 'rgba(30, 50, 60, 0.2)';
  ctx.beginPath();
  ctx.ellipse(o.x, o.y + s * 0.38, s * (0.27 - pulo / s), s * 0.08, 0, 0, TAU);
  ctx.fill();

  // Pezinhos (alternam ao andar).
  ctx.fillStyle = p.escura;
  for (const lado of [-1, 1]) {
    const elev = o.andando ? Math.max(0, passo * lado) * s * 0.06 : 0;
    ctx.beginPath();
    ctx.ellipse(cx + lado * s * 0.15, o.y + s * 0.34 - elev, s * 0.1, s * 0.065, 0, 0, TAU);
    ctx.fill();
  }

  // Bracinhos (balançam ao andar).
  for (const lado of [-1, 1]) {
    const bal = o.andando ? passo * lado * s * 0.05 : 0;
    ctx.fillStyle = p.cor;
    ctx.strokeStyle = p.escura;
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.arc(cx + lado * (R + s * 0.02), cy + s * 0.08 + bal, s * 0.075, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  // Corpo-olho: esclera com leve volume.
  const esclera = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
  esclera.addColorStop(0, '#FFFFFF');
  esclera.addColorStop(0.75, '#F3F6FB');
  esclera.addColorStop(1, '#DCE4EE');
  ctx.fillStyle = esclera;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.clip();

  // Íris e pupila, deslocadas para onde o personagem olha.
  const ir = R * (p.estilo === 'topete' ? 0.5 : 0.52);
  const ix = cx + ox * R * 0.22;
  const iy = cy + R * 0.12 + oy * R * 0.16;
  desenharIris(ctx, p, ix, iy, ir);

  // Pálpebra superior na cor do personagem; desce ao piscar e quando encharcado.
  const fechar = Math.max(o.piscar || 0, molhado > 0 ? 1 : 0);
  const borda = cy - R * 0.42 + fechar * R * 1.5;
  const palpebra = ctx.createLinearGradient(0, cy - R, 0, borda);
  palpebra.addColorStop(0, p.cor);
  palpebra.addColorStop(1, misturar(p.cor, '#FFFFFF', 0.18));
  ctx.fillStyle = palpebra;
  ctx.beginPath();
  ctx.moveTo(cx - R * 1.1, cy - R * 1.1);
  ctx.lineTo(cx + R * 1.1, cy - R * 1.1);
  ctx.lineTo(cx + R * 1.1, borda - R * 0.18);
  ctx.quadraticCurveTo(cx, borda + R * 0.32, cx - R * 1.1, borda - R * 0.18);
  ctx.closePath();
  ctx.fill();
  // Contorno da pálpebra (vira o "risquinho" do olho fechado).
  ctx.strokeStyle = p.escura;
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  ctx.moveTo(cx - R * 1.1, borda - R * 0.18);
  ctx.quadraticCurveTo(cx, borda + R * 0.32, cx + R * 1.1, borda - R * 0.18);
  ctx.stroke();

  // Encharcado: véu de água por cima.
  if (molhado > 0) {
    ctx.fillStyle = `rgba(90, 180, 255, ${0.35 * molhado})`;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  }
  ctx.restore();

  // Contorno do corpo e brilho.
  ctx.strokeStyle = p.escura;
  ctx.lineWidth = s * 0.04;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(cx - R * 0.45, cy - R * 0.55, R * 0.16, R * 0.09, -0.6, 0, TAU);
  ctx.fill();

  desenharAcessorio(ctx, p, cx, cy, R, s, o.fase || 0);

  if (molhado > 0) desenharPingos(ctx, cx, cy, R, molhado, o.fase || 0);
  ctx.restore();
}

function desenharIris(ctx, p, ix, iy, ir) {
  const g = ctx.createRadialGradient(ix, iy, ir * 0.2, ix, iy, ir);
  g.addColorStop(0, p.iris);
  g.addColorStop(1, p.irisEscura);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ix, iy, ir, 0, TAU);
  ctx.fill();
  // Raios da íris (textura sutil).
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = ir * 0.08;
  const raios = p.estilo === 'flor' ? 8 : 12;
  for (let k = 0; k < raios; k++) {
    const a = (k / raios) * TAU;
    ctx.beginPath();
    ctx.moveTo(ix + Math.cos(a) * ir * 0.5, iy + Math.sin(a) * ir * 0.5);
    ctx.lineTo(ix + Math.cos(a) * ir * 0.88, iy + Math.sin(a) * ir * 0.88);
    ctx.stroke();
  }
  ctx.strokeStyle = p.escura;
  ctx.lineWidth = ir * 0.1;
  ctx.beginPath();
  ctx.arc(ix, iy, ir, 0, TAU);
  ctx.stroke();
  // Pupila (o Pupilo tem a maior) e brilhos.
  const pr = ir * (p.estilo === 'topete' ? 0.56 : 0.42);
  ctx.fillStyle = '#15171C';
  ctx.beginPath();
  ctx.arc(ix, iy, pr, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(ix - ir * 0.3, iy - ir * 0.32, ir * 0.2, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ix + ir * 0.28, iy + ir * 0.25, ir * 0.09, 0, TAU);
  ctx.fill();
}

function desenharAcessorio(ctx, p, cx, cy, R, s, fase) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const topo = cy - R;
  switch (p.estilo) {
    case 'flor': { // florzinha de cinco pétalas presa no alto
      const fx = cx + R * 0.45;
      const fy = topo + R * 0.12;
      ctx.fillStyle = '#FFD1F0';
      ctx.strokeStyle = p.escura;
      ctx.lineWidth = s * 0.02;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU + fase * 0.6;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * s * 0.07, fy + Math.sin(a) * s * 0.07, s * 0.055, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#FFC93C';
      ctx.beginPath();
      ctx.arc(fx, fy, s * 0.045, 0, TAU);
      ctx.fill();
      break;
    }
    case 'topete': { // três fios de cabelo em onda
      ctx.strokeStyle = p.escura;
      ctx.lineWidth = s * 0.045;
      for (const k of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + k * R * 0.22, topo + R * 0.08);
        ctx.quadraticCurveTo(cx + k * R * 0.4 + R * 0.15, topo - R * 0.35, cx + k * R * 0.5 + R * 0.3, topo - R * 0.25);
        ctx.stroke();
      }
      break;
    }
    case 'cristal': { // losango brilhante flutuando
      const fy = topo - R * 0.28 + Math.sin(fase * 3) * s * 0.02;
      ctx.fillStyle = '#E8FBFF';
      ctx.strokeStyle = p.escura;
      ctx.lineWidth = s * 0.025;
      ctx.beginPath();
      ctx.moveTo(cx, fy - s * 0.1);
      ctx.lineTo(cx + s * 0.07, fy);
      ctx.lineTo(cx, fy + s * 0.1);
      ctx.lineTo(cx - s * 0.07, fy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'cilios': { // três cílios grandes e curvos
      ctx.strokeStyle = p.escura;
      ctx.lineWidth = s * 0.04;
      for (const k of [-1, 0, 1]) {
        const bx = cx + k * R * 0.42;
        const by = topo + R * (k === 0 ? 0.02 : 0.15);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + k * R * 0.1, by - R * 0.3, bx + k * R * 0.32 + R * 0.05, by - R * 0.36);
        ctx.stroke();
      }
      break;
    }
    case 'faixa': { // faixa na testa com nó do lado
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      ctx.arc(cx, cy + R * 0.25, R * 1.02, Math.PI * 1.18, Math.PI * 1.82);
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = p.escura;
      ctx.lineWidth = s * 0.02;
      const nx = cx + R * 0.82;
      const ny = cy - R * 0.5;
      for (const a of [-0.5, 0.4]) {
        ctx.beginPath();
        ctx.ellipse(nx + Math.cos(a) * s * 0.07, ny + Math.sin(a) * s * 0.07, s * 0.06, s * 0.03, a, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'broto': { // brotinho de duas folhas
      ctx.strokeStyle = p.escura;
      ctx.lineWidth = s * 0.03;
      ctx.beginPath();
      ctx.moveTo(cx, topo + R * 0.05);
      ctx.lineTo(cx, topo - R * 0.25);
      ctx.stroke();
      ctx.fillStyle = '#9BF2BE';
      for (const lado of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + lado * s * 0.075, topo - R * 0.32, s * 0.08, s * 0.04, lado * -0.5 + Math.sin(fase * 2) * 0.1, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'laco': { // laço de fita ao lado
      const lx = cx - R * 0.62;
      const ly = topo + R * 0.2;
      ctx.fillStyle = '#FFE3F1';
      ctx.strokeStyle = p.escura;
      ctx.lineWidth = s * 0.022;
      for (const lado of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + lado * s * 0.11, ly - s * 0.06);
        ctx.lineTo(lx + lado * s * 0.11, ly + s * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = p.cor;
      ctx.beginPath();
      ctx.arc(lx, ly, s * 0.03, 0, TAU);
      ctx.fill();
      break;
    }
    case 'oculos': { // óculos redondos sobre o olho
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = s * 0.035;
      ctx.beginPath();
      ctx.arc(cx, cy + R * 0.1, R * 0.7, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.7, cy);
      ctx.lineTo(cx - R * 1.02, cy - R * 0.15);
      ctx.moveTo(cx + R * 0.7, cy);
      ctx.lineTo(cx + R * 1.02, cy - R * 0.15);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

function desenharPingos(ctx, cx, cy, R, molhado, fase) {
  ctx.fillStyle = 'rgba(70, 170, 255, 0.85)';
  for (let k = 0; k < 4; k++) {
    const a = k * 1.7 + 0.4;
    const queda = ((fase * 1.4 + k * 0.27) % 1) * R * 0.9;
    const px = cx + Math.cos(a) * R * 0.95;
    const py = cy + Math.sin(a) * R * 0.5 + queda;
    gotinha(ctx, px, py, R * 0.12 * molhado);
  }
}

/** Gotinha simples (ponta para cima). */
export function gotinha(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.8);
  ctx.bezierCurveTo(x + r * 0.4, y - r * 1.1, x + r, y - r * 0.5, x + r, y);
  ctx.arc(x, y, r, 0, Math.PI);
  ctx.bezierCurveTo(x - r, y - r * 0.5, x - r * 0.4, y - r * 1.1, x, y - r * 1.8);
  ctx.fill();
}

/** Mistura duas cores hexadecimais (t = 0 → a, 1 → b). */
export function misturar(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const canal = (sh) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `rgb(${canal(16)}, ${canal(8)}, ${canal(0)})`;
}
