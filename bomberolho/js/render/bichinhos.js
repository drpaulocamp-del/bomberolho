// Bichinhos do Estojo Surpresa, desenhados por código e com formas bem
// diferentes entre si (dá para distingui-los sem depender da cor):
//  - Saltinho: cúpula verde em forma de pálpebra, com cílios no alto e duas
//    pernas dobradas de mola;
//  - Cascudo: carapaça larga e transparente como uma lente de contato, com aro;
//  - Disparada: corpo alongado em gota deitada, com rodinhas e um rastro de cílios.
// Também o arco da carapaça fechada (lado protegido) e o anel de piscar.

const TAU = Math.PI * 2;
const LADO = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] };

function olhinhos(ctx, x, y, r, s) {
  for (const lado of [-1, 1]) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x + lado * r, y, s * 0.05, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1B1B22';
    ctx.beginPath();
    ctx.arc(x + lado * r, y + s * 0.01, s * 0.025, 0, TAU);
    ctx.fill();
  }
}

function saltinho(ctx, x, y, s, fase, noAr) {
  const mola = noAr ? 0.06 : Math.abs(Math.sin(fase * 6)) * 0.015;
  // Pernas de mola (zigue-zague) com pezinhos redondos.
  ctx.strokeStyle = '#1F8A5C';
  ctx.lineWidth = s * 0.05;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const lado of [-1, 1]) {
    const bx = x + lado * s * 0.3;
    ctx.beginPath();
    ctx.moveTo(x + lado * s * 0.18, y + s * 0.12);
    ctx.lineTo(bx + lado * s * 0.08, y + s * (0.2 + mola));
    ctx.lineTo(bx - lado * s * 0.02, y + s * (0.3 + mola * 2));
    ctx.stroke();
    ctx.fillStyle = '#2FB777';
    ctx.beginPath();
    ctx.ellipse(bx + lado * s * 0.03, y + s * (0.34 + mola * 2), s * 0.08, s * 0.045, 0, 0, TAU);
    ctx.fill();
  }
  // Cúpula-pálpebra.
  const g = ctx.createLinearGradient(0, y - s * 0.2, 0, y + s * 0.3);
  g.addColorStop(0, '#7BE8B0');
  g.addColorStop(1, '#2FB777');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#1F8A5C';
  ctx.lineWidth = s * 0.035;
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.2, s * 0.32, s * 0.3, 0, Math.PI, TAU);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Cílios ao longo da borda de cima.
  ctx.lineWidth = s * 0.03;
  for (let k = -2; k <= 2; k++) {
    const a = Math.PI * 1.5 + k * 0.42;
    const px = x + Math.cos(a) * s * 0.32;
    const py = y + s * 0.2 + Math.sin(a) * s * 0.3;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(a) * s * 0.09, py + Math.sin(a) * s * 0.09);
    ctx.stroke();
  }
  olhinhos(ctx, x, y + s * 0.13, s * 0.13, s);
}

function cascudo(ctx, x, y, s, fase) {
  // Pezinhos curtos.
  ctx.fillStyle = '#3A4A63';
  for (const [dx, dy] of [[-0.26, 0.28], [0.26, 0.28], [-0.12, 0.33], [0.12, 0.33]]) {
    ctx.beginPath();
    ctx.ellipse(x + s * dx, y + s * dy + Math.sin(fase * 10 + dx * 9) * s * 0.01, s * 0.06, s * 0.04, 0, 0, TAU);
    ctx.fill();
  }
  // Carapaça-lente: domo largo, transparente, com aro.
  const g = ctx.createRadialGradient(x - s * 0.12, y + s * 0.02, s * 0.03, x, y + s * 0.14, s * 0.42);
  g.addColorStop(0, 'rgba(230, 250, 255, 0.95)');
  g.addColorStop(1, 'rgba(90, 190, 240, 0.9)');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#2C7FB8';
  ctx.lineWidth = s * 0.045;
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.16, s * 0.42, s * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  ctx.ellipse(x - s * 0.08, y + s * 0.1, s * 0.22, s * 0.08, 0, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  olhinhos(ctx, x, y + s * 0.27, s * 0.1, s);
}

function disparada(ctx, x, y, s, fase, sentido, correndo) {
  ctx.save();
  ctx.translate(x, y + s * 0.18);
  ctx.scale(sentido, 1);
  // Rastro de cílios esvoaçando atrás.
  ctx.strokeStyle = correndo ? '#FFB067' : 'rgba(255, 176, 103, 0.7)';
  ctx.lineWidth = s * 0.035;
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const onda = Math.sin(fase * (correndo ? 30 : 8) + k) * s * 0.04;
    ctx.beginPath();
    ctx.moveTo(-s * 0.28, (k - 1) * s * 0.07);
    ctx.quadraticCurveTo(-s * 0.4, (k - 1) * s * 0.07 + onda, -s * (correndo ? 0.56 : 0.46), (k - 1) * s * 0.1);
    ctx.stroke();
  }
  // Rodinhas.
  ctx.fillStyle = '#3B2A1E';
  for (const dx of [-0.16, 0.16]) {
    ctx.beginPath();
    ctx.arc(s * dx, s * 0.14, s * 0.07, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#C9B7A6';
    ctx.lineWidth = s * 0.015;
    ctx.beginPath();
    ctx.moveTo(s * dx, s * 0.14);
    ctx.lineTo(s * dx + Math.cos(fase * 20) * s * 0.06, s * 0.14 + Math.sin(fase * 20) * s * 0.06);
    ctx.stroke();
  }
  // Corpo em gota deitada, apontando para a frente.
  const g = ctx.createLinearGradient(0, -s * 0.15, 0, s * 0.15);
  g.addColorStop(0, '#FFC27A');
  g.addColorStop(1, '#F07F1E');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#B4560F';
  ctx.lineWidth = s * 0.035;
  ctx.beginPath();
  ctx.moveTo(s * 0.36, 0);
  ctx.bezierCurveTo(s * 0.2, -s * 0.16, -s * 0.2, -s * 0.16, -s * 0.3, 0);
  ctx.bezierCurveTo(-s * 0.2, s * 0.15, s * 0.2, s * 0.15, s * 0.36, 0);
  ctx.fill();
  ctx.stroke();
  // Raio branco na lateral.
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(-s * 0.1, -s * 0.06);
  ctx.lineTo(s * 0.04, -s * 0.06);
  ctx.lineTo(-s * 0.01, 0);
  ctx.lineTo(s * 0.1, 0);
  ctx.lineTo(-s * 0.06, s * 0.08);
  ctx.lineTo(-s * 0.02, s * 0.02);
  ctx.lineTo(-s * 0.12, s * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(s * 0.24, -s * 0.03, s * 0.05, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1B1B22';
  ctx.beginPath();
  ctx.arc(s * 0.26, -s * 0.03, s * 0.025, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/**
 * Desenha o bichinho com o centro da casa em (x, y). O personagem vai por
 * cima, um pouco mais alto (ver ALTURA_MONTADO).
 */
export function desenharBichinho(ctx, tipo, o) {
  const { x, y, s, fase = 0 } = o;
  ctx.save();
  ctx.globalAlpha = o.alfa ?? 1;
  ctx.fillStyle = 'rgba(30, 50, 60, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.4, s * 0.36, s * 0.09, 0, 0, TAU);
  ctx.fill();
  const yy = y - (o.altura || 0);
  if (tipo === 'saltinho') saltinho(ctx, x, yy, s, fase, o.noAr);
  else if (tipo === 'cascudo') cascudo(ctx, x, yy, s, fase);
  else if (tipo === 'disparada') disparada(ctx, x, yy, s, fase, o.sentido || 1, o.correndo);
  ctx.restore();
}

export const ALTURA_MONTADO = 0.24; // em casas: quanto o personagem sobe ao montar

/**
 * Carapaça do Cascudo: arco grosso do lado protegido. Fechada (`ativa`), é
 * forte e brilhante; aberta, só um tracejado discreto mostra o lado.
 */
export function desenharEscudo(ctx, x, y, s, dir, ativa, tempoSeg) {
  const [dx, dy] = LADO[dir] || LADO.baixo;
  const ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.lineCap = 'round';
  if (ativa) {
    const pulso = 1 + Math.sin(tempoSeg * 12) * 0.04;
    ctx.strokeStyle = 'rgba(60, 170, 240, 0.85)';
    ctx.lineWidth = s * 0.14;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.5 * pulso, ang - 0.95, ang + 0.95);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = s * 0.045;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.5 * pulso, ang - 0.6, ang + 0.2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(44, 127, 184, 0.55)';
    ctx.setLineDash([s * 0.06, s * 0.07]);
    ctx.lineWidth = s * 0.04;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.5, ang - 0.8, ang + 0.8);
    ctx.stroke();
  }
  ctx.restore();
}
