// Logotipo desenhado por código: "Bomberolho" em letras gordinhas, com os
// "o" virando olhinhos que olham em volta e piscam, e uma gota de colírio
// pingando sobre a palavra.

import { gotinha } from './personagens.js';

const TAU = Math.PI * 2;
const FONTE = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const PALAVRA = 'Bomberolho';
// Cores dos olhinhos (uma para cada "o"): violeta, coral e menta.
const CORES_OLHO = [['#8B5CF6', '#5B34C7'], ['#FF6F61', '#C9443A'], ['#2FBF71', '#1B8048']];

/**
 * @param {CanvasRenderingContext2D} ctx já escalado para px CSS
 * @param {number} w  largura disponível (px CSS)
 * @param {number} h  altura disponível
 * @param {number} t  relógio (s), para animar
 * @param {boolean} quieto  reduzir movimento
 */
export function desenharLogo(ctx, w, h, t, quieto = false) {
  ctx.clearRect(0, 0, w, h);
  let tam = h * 0.62;
  ctx.font = `900 ${tam}px ${FONTE}`;
  const largura = ctx.measureText(PALAVRA).width;
  if (largura > w * 0.94) {
    tam *= (w * 0.94) / largura;
    ctx.font = `900 ${tam}px ${FONTE}`;
  }
  const total = ctx.measureText(PALAVRA).width;
  let x = (w - total) / 2;
  const base = h * 0.72;

  let olho = 0;
  const letras = [...PALAVRA];
  const dpr = ctx.getTransform().a || 1;
  letras.forEach((letra, k) => {
    const lw = ctx.measureText(letra).width;
    // Pulinho em onda, letra por letra.
    const pulo = quieto ? 0 : Math.max(0, Math.sin(t * 3 - k * 0.45)) * tam * 0.05;
    if (letra === 'o') {
      desenharOlhinho(ctx, x + lw / 2, base - tam * 0.27 - pulo, tam * 0.3, t + olho * 1.3, CORES_OLHO[olho % 3], quieto);
      olho++;
    } else {
      const sprite = spriteDaLetra(letra, tam, dpr);
      ctx.drawImage(sprite.canvas, x - sprite.margem, base - pulo - sprite.subida, sprite.w, sprite.h);
    }
    x += lw;
  });

  // Gota caindo sobre o "B", em laço.
  const ciclo = quieto ? 0.3 : (t * 0.5) % 1;
  const gx = (w - total) / 2 + tam * 0.05;
  const gy = h * 0.06 + ciclo * h * 0.12;
  ctx.globalAlpha = quieto ? 1 : Math.min(1, (1 - ciclo) * 3);
  const g = ctx.createLinearGradient(0, gy - tam * 0.2, 0, gy + tam * 0.1);
  g.addColorStop(0, '#A8ECFF');
  g.addColorStop(1, '#1C6FE0');
  ctx.fillStyle = g;
  gotinha(ctx, gx, gy + tam * 0.1, tam * 0.075);
  ctx.globalAlpha = 1;
}

// Letras pré-desenhadas (contorno branco, degradê azul e traço escuro): o
// quadro só copia imagens, leve até em celular simples.
const letrasProntas = new Map();
function spriteDaLetra(letra, tam, dpr) {
  const chave = `${letra}|${Math.round(tam * dpr)}`;
  let sprite = letrasProntas.get(chave);
  if (sprite) return sprite;
  if (letrasProntas.size > 60) letrasProntas.clear();
  const margem = tam * 0.14;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `900 ${tam}px ${FONTE}`;
  const w = ctx.measureText(letra).width + margem * 2;
  const h = tam * 1.25;
  c.width = Math.ceil(w * dpr);
  c.height = Math.ceil(h * dpr);
  ctx.scale(dpr, dpr);
  ctx.font = `900 ${tam}px ${FONTE}`;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  const subida = tam * 1.0;
  const grad = ctx.createLinearGradient(0, subida - tam * 0.8, 0, subida);
  grad.addColorStop(0, '#3FA9F5');
  grad.addColorStop(1, '#0071E3');
  ctx.lineWidth = tam * 0.2;
  ctx.strokeStyle = '#FFFFFF';
  ctx.strokeText(letra, margem, subida);
  ctx.fillStyle = grad;
  ctx.fillText(letra, margem, subida);
  ctx.lineWidth = tam * 0.035;
  ctx.strokeStyle = '#0A4FA3';
  ctx.strokeText(letra, margem, subida);
  sprite = { canvas: c, w, h, margem, subida };
  letrasProntas.set(chave, sprite);
  return sprite;
}

function desenharOlhinho(ctx, x, y, r, t, [cor, escura], quieto) {
  ctx.save();
  ctx.lineWidth = r * 0.42;
  ctx.strokeStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  // Olha em volta devagar.
  const ang = quieto ? 0.8 : t * 0.9;
  const ix = x + Math.cos(ang) * r * 0.22;
  const iy = y + Math.sin(ang * 1.3) * r * 0.18;
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(ix, iy, r * 0.58, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#15171C';
  ctx.beginPath();
  ctx.arc(ix, iy, r * 0.27, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(ix - r * 0.2, iy - r * 0.2, r * 0.13, 0, TAU);
  ctx.fill();
  // Piscada de vez em quando.
  const p = quieto ? 1 : (t % 4.2);
  if (p < 0.14) {
    ctx.fillStyle = cor;
    ctx.fillRect(x - r, y - r, r * 2, r * 2 * Math.sin((p / 0.14) * Math.PI));
  }
  ctx.restore();
  ctx.lineWidth = r * 0.14;
  ctx.strokeStyle = escura;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
}
