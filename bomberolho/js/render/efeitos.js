// Gota de colírio, respingo de água, itens e partículas.

import { PAVIO, DURACAO_RESPINGO, DURACAO_QUEBRA, DIRECOES, NOMES_DIRECOES } from '../sim/constantes.js';
import { gotinha } from './personagens.js';

const TAU = Math.PI * 2;

/**
 * Gota de colírio: incha e pulsa cada vez mais rápido conforme o pavio acaba;
 * tem carinha, que aperta os olhos no último meio segundo.
 */
export function desenharGota(ctx, x, y, s, gota, tempoSeg) {
  const restante = gota.pavio / PAVIO; // 1 → 0
  const ritmo = 4 + (1 - restante) * 14;
  const pulso = 1 + Math.sin(tempoSeg * ritmo) * (0.04 + (1 - restante) * 0.06);
  const r = s * 0.27 * pulso;
  const cy = y + s * 0.08;

  ctx.fillStyle = 'rgba(20, 60, 110, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.36, s * 0.24, s * 0.07, 0, 0, TAU);
  ctx.fill();

  const g = ctx.createLinearGradient(0, cy - r * 1.9, 0, cy + r);
  g.addColorStop(0, '#A8ECFF');
  g.addColorStop(0.55, '#43B4FF');
  g.addColorStop(1, '#1C6FE0');
  ctx.fillStyle = g;
  gotinha(ctx, x, cy, r);
  ctx.strokeStyle = '#1458B8';
  ctx.lineWidth = s * 0.03;
  ctx.stroke();

  // Aviso final: clareia piscando.
  if (gota.pavio < 30 && Math.floor(gota.pavio / 4) % 2 === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    gotinha(ctx, x, cy, r);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.42, cy - r * 0.5, r * 0.18, r * 0.3, 0.4, 0, TAU);
  ctx.fill();

  // Carinha.
  ctx.strokeStyle = '#0D3F86';
  ctx.fillStyle = '#0D3F86';
  ctx.lineWidth = s * 0.025;
  ctx.lineCap = 'round';
  const ex = r * 0.32;
  const ey = cy + r * 0.05;
  if (gota.pavio < 30) {
    for (const lado of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + lado * ex - lado * r * 0.1, ey - r * 0.1);
      ctx.lineTo(x + lado * ex + lado * r * 0.05, ey);
      ctx.lineTo(x + lado * ex - lado * r * 0.1, ey + r * 0.1);
      ctx.stroke();
    }
  } else {
    for (const lado of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + lado * ex, ey, r * 0.09, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255, 140, 170, 0.5)';
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + lado * r * 0.55, ey + r * 0.28, r * 0.13, r * 0.08, 0, 0, TAU);
    ctx.fill();
  }
}

/** Largura relativa do respingo ao longo da vida: espirra, segura, recolhe. */
function larguraRespingo(t) {
  const p = 1 - t / DURACAO_RESPINGO; // 0 → 1
  if (p < 0.15) return 0.45 + (p / 0.15) * 0.45;
  if (p < 0.7) return 0.9 - (p - 0.15) * 0.15;
  return Math.max(0.1, 0.82 - ((p - 0.7) / 0.3) * 0.7);
}

/**
 * Respingos de água em cruz. Desenha em camadas (contorno de todos, depois
 * água, depois brilho) para que cruzes que se cruzam se fundam numa poça só.
 */
export function desenharRespingos(ctx, respingos, s, tempoSeg) {
  if (!respingos.length) return;
  const camadas = [
    { cor: 'rgba(30, 120, 230, 0.9)', fator: 1 },
    { cor: 'rgba(90, 200, 255, 0.95)', fator: 0.78 },
    { cor: 'rgba(230, 251, 255, 0.95)', fator: 0.36 },
  ];
  for (const camada of camadas) {
    ctx.fillStyle = camada.cor;
    for (const r of respingos) {
      const w = larguraRespingo(r.t) * camada.fator * s;
      const cx = (r.col + 0.5) * s;
      const cy = (r.lin + 0.5) * s;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.62, 0, TAU);
      ctx.fill();
      for (const nome of NOMES_DIRECOES) {
        const n = r.bracos[nome];
        if (!n) continue;
        const { dc, dl } = DIRECOES[nome];
        const fim = n * s + (camada.fator < 1 ? -0.08 * s : 0) - s * 0.1;
        const x0 = Math.min(cx, cx + dc * fim);
        const y0 = Math.min(cy, cy + dl * fim);
        const largura = dc !== 0 ? Math.abs(dc * fim) : w;
        const altura = dl !== 0 ? Math.abs(dl * fim) : w;
        ctx.beginPath();
        ctx.roundRect(dc !== 0 ? x0 : cx - w / 2, dl !== 0 ? y0 : cy - w / 2, largura, altura, w / 2);
        ctx.fill();
        // Bolhas na borda: dão o aspecto de água espirrando.
        if (camada.fator === 1) {
          for (let k = 1; k <= n; k++) {
            const ondula = Math.sin(tempoSeg * 18 + k * 2.1 + r.id) * 0.06 * s;
            const bx = cx + dc * (k - 0.5) * s + (dl !== 0 ? w * 0.5 + ondula : 0);
            const by = cy + dl * (k - 0.5) * s + (dc !== 0 ? w * 0.5 + ondula : 0);
            ctx.beginPath();
            ctx.arc(bx, by, w * 0.18, 0, TAU);
            ctx.arc(cx + dc * (k - 0.5) * s - (dl !== 0 ? w * 0.5 : 0), cy + dl * (k - 0.5) * s - (dc !== 0 ? w * 0.5 : 0), w * 0.16, 0, TAU);
            ctx.fill();
          }
        }
      }
    }
  }
  // Ponta de cada braço: uma gota arredondada maior; e brilhos no centro.
  for (const r of respingos) {
    const w = larguraRespingo(r.t) * s;
    const cx = (r.col + 0.5) * s;
    const cy = (r.lin + 0.5) * s;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU + tempoSeg * 3 + r.id;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * w * 0.45, cy + Math.sin(a) * w * 0.45, w * 0.06, 0, TAU);
      ctx.fill();
    }
  }
}

/** Bloco se desfazendo: encolhe, abre em quatro tufos e some. */
export function desenharQuebra(ctx, sprite, x, y, s, t) {
  const p = 1 - t / DURACAO_QUEBRA; // 0 → 1
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - p * 1.1);
  const meio = s / 2;
  const afasta = p * s * 0.35;
  const escala = 1 - p * 0.5;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.save();
    ctx.translate(x + meio + dx * afasta, y + meio + dy * afasta - p * s * 0.2);
    ctx.scale(escala * 0.55, escala * 0.55);
    ctx.drawImage(sprite, -meio, -meio, s, s);
    ctx.restore();
  }
  ctx.restore();
}

/** Itens: medalhão de vidro com o desenho do poder, flutuando. */
export function desenharItem(ctx, tipo, x, y, s, tempoSeg) {
  const flut = Math.sin(tempoSeg * 3 + x * 0.05) * s * 0.04;
  const cy = y + flut;
  ctx.fillStyle = 'rgba(30, 60, 80, 0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.36, s * 0.22 - flut * 0.5, s * 0.06, 0, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(x - s * 0.1, cy - s * 0.12, s * 0.05, x, cy, s * 0.34);
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(1, '#D9F0FF');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, cy, s * 0.33, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#0071E3';
  ctx.lineWidth = s * 0.04;
  ctx.stroke();
  ctx.save();
  ctx.translate(x, cy);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (tipo === 'gota') iconeFrasco(ctx, s);
  else if (tipo === 'alcance') iconeLupa(ctx, s);
  else if (tipo === 'velocidade') iconeVeloz(ctx, s);
  ctx.restore();
}

function iconeFrasco(ctx, s) {
  ctx.fillStyle = '#3BA9FF';
  ctx.strokeStyle = '#155BB5';
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  ctx.roundRect(-s * 0.11, -s * 0.08, s * 0.22, s * 0.25, s * 0.05);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-s * 0.08, -s * 0.01, s * 0.16, s * 0.08);
  ctx.fillStyle = '#FF7AA8';
  ctx.beginPath();
  ctx.roundRect(-s * 0.05, -s * 0.19, s * 0.1, s * 0.11, s * 0.03);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#155BB5';
  ctx.font = `bold ${Math.round(s * 0.16)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', s * 0.17, -s * 0.15);
}

function iconeLupa(ctx, s) {
  ctx.strokeStyle = '#7A4B12';
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.moveTo(s * 0.06, s * 0.06);
  ctx.lineTo(s * 0.17, s * 0.17);
  ctx.stroke();
  ctx.fillStyle = 'rgba(160, 225, 255, 0.9)';
  ctx.strokeStyle = '#2C3E66';
  ctx.lineWidth = s * 0.045;
  ctx.beginPath();
  ctx.arc(-s * 0.04, -s * 0.04, s * 0.13, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = s * 0.025;
  ctx.beginPath();
  ctx.arc(-s * 0.04, -s * 0.04, s * 0.08, Math.PI * 1.1, Math.PI * 1.5);
  ctx.stroke();
}

function iconeVeloz(ctx, s) {
  ctx.strokeStyle = '#2BA5F7';
  ctx.lineWidth = s * 0.035;
  for (const [y, w] of [[-0.08, 0.12], [0.02, 0.16], [0.12, 0.1]]) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, s * y);
    ctx.lineTo(-s * (0.2 - w), s * y);
    ctx.stroke();
  }
  const g = ctx.createLinearGradient(0, -s * 0.18, 0, s * 0.14);
  g.addColorStop(0, '#B6F0FF');
  g.addColorStop(1, '#1E88E5');
  ctx.fillStyle = g;
  ctx.save();
  ctx.translate(s * 0.06, s * 0.02);
  ctx.rotate(0.5);
  gotinha(ctx, 0, s * 0.04, s * 0.1);
  ctx.strokeStyle = '#155BB5';
  ctx.lineWidth = s * 0.025;
  ctx.stroke();
  ctx.restore();
}

/**
 * Partículas cosméticas (respingos, tufos de pólen, brilhos de item). Usam
 * Math.random à vontade: não fazem parte da simulação.
 */
export class Particulas {
  constructor() {
    this.lista = [];
    this.fator = 1; // 0,35 com "reduzir movimento"
  }

  emitir(qtd, base) {
    const n = Math.max(1, Math.round(qtd * this.fator));
    for (let k = 0; k < n; k++) {
      const a = Math.random() * TAU;
      const v = base.vel * (0.4 + Math.random() * 0.8);
      this.lista.push({
        x: base.x, y: base.y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - base.subida,
        vida: base.vida * (0.7 + Math.random() * 0.6), idade: 0,
        r: base.r * (0.6 + Math.random() * 0.8), cor: base.cores[k % base.cores.length],
        gravidade: base.gravidade, forma: base.forma,
      });
    }
    if (this.lista.length > 400) this.lista.splice(0, this.lista.length - 400);
  }

  atualizar(dt) {
    for (const p of this.lista) {
      p.idade += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravidade * dt;
    }
    this.lista = this.lista.filter((p) => p.idade < p.vida);
  }

  desenhar(ctx) {
    for (const p of this.lista) {
      const vida = 1 - p.idade / p.vida;
      ctx.globalAlpha = Math.min(1, vida * 1.5);
      ctx.fillStyle = p.cor;
      if (p.forma === 'gota') {
        gotinha(ctx, p.x, p.y, p.r * vida + 0.5);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.5 + vida * 0.5), 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
