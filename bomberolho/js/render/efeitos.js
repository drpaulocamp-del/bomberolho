// Gota de colírio, respingo de água, itens e partículas.

import { DIRECOES, NOMES_DIRECOES } from '../sim/constantes.js';
import { gotinha } from './personagens.js';

const TAU = Math.PI * 2;

/**
 * Gota de colírio: incha e pulsa cada vez mais rápido conforme o pavio acaba;
 * tem carinha, que aperta os olhos no último meio segundo.
 */
// Cores da gota comum e da gota de Colírio Penetrante (violeta, com losango).
const CORES_GOTA = {
  comum: { topo: '#A8ECFF', meio: '#43B4FF', base: '#1C6FE0', contorno: '#1458B8', rosto: '#0D3F86' },
  penetrante: { topo: '#F3D6FF', meio: '#B067F5', base: '#6A1FC9', contorno: '#4C1496', rosto: '#36096E' },
};

/**
 * Gota de colírio. `o.sombra` = false quando ela está no ar (a sombra vai no
 * chão, desenhada à parte). `o.escala` encolhe a gota (na mão, no ar).
 */
export function desenharGota(ctx, x, y, s, gota, tempoSeg, o = {}) {
  const restante = gota.pavio / (gota.pavioTotal || 165); // 1 → 0
  const ritmo = 4 + (1 - restante) * 14;
  const pulso = 1 + Math.sin(tempoSeg * ritmo) * (0.04 + (1 - restante) * 0.06);
  const r = s * 0.27 * pulso * (o.escala ?? 1);
  const cy = y + s * 0.08;
  const cor = gota.penetrante ? CORES_GOTA.penetrante : CORES_GOTA.comum;

  if (o.sombra !== false) {
    ctx.fillStyle = 'rgba(20, 60, 110, 0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.36, s * 0.24, s * 0.07, 0, 0, TAU);
    ctx.fill();
  }

  const g = ctx.createLinearGradient(0, cy - r * 1.9, 0, cy + r);
  g.addColorStop(0, cor.topo);
  g.addColorStop(0.55, cor.meio);
  g.addColorStop(1, cor.base);
  ctx.fillStyle = g;
  gotinha(ctx, x, cy, r);
  ctx.strokeStyle = cor.contorno;
  ctx.lineWidth = s * 0.03;
  ctx.stroke();
  if (gota.penetrante) {
    // Losango brilhante na testa e anel tracejado: lê-se "atravessa" num relance.
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(x, cy - r * 1.25);
    ctx.lineTo(x + r * 0.22, cy - r * 0.95);
    ctx.lineTo(x, cy - r * 0.65);
    ctx.lineTo(x - r * 0.22, cy - r * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = 'rgba(176, 103, 245, 0.8)';
    ctx.setLineDash([s * 0.05, s * 0.05]);
    ctx.lineWidth = s * 0.025;
    ctx.beginPath();
    ctx.arc(x, cy - r * 0.2, r * 1.45, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

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
  ctx.strokeStyle = cor.rosto;
  ctx.fillStyle = cor.rosto;
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
function larguraRespingo(t, duracao) {
  const p = 1 - t / duracao; // 0 → 1
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
    { cor: 'rgba(30, 120, 230, 0.9)', penetrante: 'rgba(118, 46, 214, 0.9)', fator: 1 },
    { cor: 'rgba(90, 200, 255, 0.95)', penetrante: 'rgba(196, 140, 255, 0.95)', fator: 0.78 },
    { cor: 'rgba(230, 251, 255, 0.95)', penetrante: 'rgba(250, 238, 255, 0.95)', fator: 0.36 },
  ];
  for (const camada of camadas) {
    for (const r of respingos) {
      ctx.fillStyle = r.penetrante ? camada.penetrante : camada.cor;
      const w = larguraRespingo(r.t, r.duracao) * camada.fator * s;
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
  // Ponta de cada braço: coroinha de gotas espirrando para fora (ou batendo
  // no bloco); e brilhos girando no centro.
  for (const r of respingos) {
    const w = larguraRespingo(r.t, r.duracao) * s;
    const cx = (r.col + 0.5) * s;
    const cy = (r.lin + 0.5) * s;
    const vida = 1 - r.t / r.duracao;
    const abre = Math.min(1, vida * 4);
    ctx.fillStyle = 'rgba(120, 210, 255, 0.95)';
    for (const nome of NOMES_DIRECOES) {
      const n = r.bracos[nome];
      if (!n && !r.batida[nome]) continue;
      const { dc, dl } = DIRECOES[nome];
      const alcance = (n + (r.batida[nome] ? 0.45 : 0.25)) * s;
      const px = cx + dc * alcance;
      const py = cy + dl * alcance;
      for (const lado of [-1, 0, 1]) {
        const ang = Math.atan2(dl, dc) + lado * 0.75;
        const d = w * (0.25 + abre * 0.35);
        ctx.save();
        ctx.translate(px + Math.cos(ang) * d, py + Math.sin(ang) * d);
        ctx.rotate(ang + Math.PI / 2);
        gotinha(ctx, 0, 0, w * 0.11 * (1 - vida * 0.5));
        ctx.restore();
      }
    }
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
export function desenharQuebra(ctx, sprite, x, y, s, t, duracao) {
  const p = 1 - t / duracao; // 0 → 1
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

/** Itens: medalhão de vidro com o desenho do poder (centro em x, y). */
export function desenharItem(ctx, tipo, x, y, s) {
  const cy = y - s * 0.03;
  ctx.fillStyle = 'rgba(30, 60, 80, 0.16)';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.38, s * 0.2, s * 0.05, 0, 0, TAU);
  ctx.fill();
  const estilo = ESTILO_MEDALHAO[tipo] || ESTILO_MEDALHAO.comum;
  const g = ctx.createRadialGradient(x - s * 0.1, cy - s * 0.12, s * 0.05, x, cy, s * 0.34);
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(1, estilo.fundo);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, cy, s * 0.33, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = estilo.aro;
  ctx.lineWidth = s * (estilo.grosso ? 0.06 : 0.04);
  ctx.stroke();
  ctx.save();
  ctx.translate(x, cy);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  (ICONES[tipo] || iconeFrasco)(ctx, s);
  ctx.restore();
}

// Aro do medalhão: azul (comum), dourado (raro), coral (azar), rosa (estojo).
const ESTILO_MEDALHAO = {
  comum: { fundo: '#D9F0FF', aro: '#0071E3' },
  superLupa: { fundo: '#FFF1C2', aro: '#E0A100', grosso: true },
  penetrante: { fundo: '#F1E3FF', aro: '#8B3FE0', grosso: true },
  cisco: { fundo: '#FFE3DD', aro: '#E2574C' },
  estojo: { fundo: '#FFE6F3', aro: '#E0479A', grosso: true },
};

const ICONES = {
  gota: iconeFrasco,
  alcance: iconeLupa,
  velocidade: iconeVeloz,
  chute: iconeChute,
  superLupa: iconeSuperLupa,
  cisco: iconeCisco,
  pinca: iconePinca,
  penetrante: iconePenetrante,
  estojo: iconeEstojo,
};

/** Chute-Pisca: tênis com riscos de movimento. */
function iconeChute(ctx, s) {
  ctx.strokeStyle = '#2BA5F7';
  ctx.lineWidth = s * 0.03;
  for (const y of [-0.06, 0.02, 0.1]) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.22, s * y);
    ctx.lineTo(-s * 0.13, s * y);
    ctx.stroke();
  }
  ctx.fillStyle = '#FF8A3D';
  ctx.strokeStyle = '#B4501A';
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  ctx.moveTo(-s * 0.08, -s * 0.13);
  ctx.lineTo(s * 0.02, -s * 0.13);
  ctx.quadraticCurveTo(s * 0.04, -s * 0.02, s * 0.12, 0);
  ctx.quadraticCurveTo(s * 0.22, s * 0.02, s * 0.21, s * 0.1);
  ctx.lineTo(-s * 0.09, s * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-s * 0.09, s * 0.06, s * 0.3, s * 0.04);
}

/** Super Lupa: lupa dourada com estrela. */
function iconeSuperLupa(ctx, s) {
  ctx.strokeStyle = '#8A5A00';
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.moveTo(s * 0.06, s * 0.06);
  ctx.lineTo(s * 0.18, s * 0.18);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 236, 160, 0.95)';
  ctx.strokeStyle = '#E0A100';
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.arc(-s * 0.04, -s * 0.04, s * 0.14, 0, TAU);
  ctx.fill();
  ctx.stroke();
  estrela(ctx, -s * 0.04, -s * 0.04, s * 0.08, '#E0A100');
}

function estrela(ctx, x, y, r, cor) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU - Math.PI / 2;
    const rr = k % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (k) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** Cisco: bolinha de poeira cinza, tonta (espiral nos olhos). */
function iconeCisco(ctx, s) {
  ctx.fillStyle = '#A7A2A0';
  for (const [x, y, r] of [[-0.07, 0.02, 0.1], [0.07, 0.03, 0.1], [0, -0.06, 0.11], [0, 0.07, 0.09]]) {
    ctx.beginPath();
    ctx.arc(s * x, s * y, s * r, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = '#4A4441';
  ctx.lineWidth = s * 0.022;
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 0.05 * lado, -s * 0.02, s * 0.03, 0, Math.PI * 1.6);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, s * 0.07, s * 0.03, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

/** Pinça: duas hastes que se encontram, segurando uma gotinha. */
function iconePinca(ctx, s) {
  ctx.strokeStyle = '#5E6B7D';
  ctx.lineWidth = s * 0.045;
  ctx.beginPath();
  ctx.moveTo(-s * 0.16, -s * 0.18);
  ctx.lineTo(s * 0.05, s * 0.12);
  ctx.moveTo(-s * 0.06, -s * 0.2);
  ctx.lineTo(s * 0.09, s * 0.1);
  ctx.stroke();
  ctx.fillStyle = '#9AA6B6';
  ctx.beginPath();
  ctx.arc(-s * 0.11, -s * 0.19, s * 0.045, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#43B4FF';
  gotinha(ctx, s * 0.12, s * 0.16, s * 0.055);
}

/** Colírio Penetrante: gota violeta atravessando um bloquinho. */
function iconePenetrante(ctx, s) {
  ctx.fillStyle = '#FFD772';
  ctx.strokeStyle = '#C9842E';
  ctx.lineWidth = s * 0.025;
  ctx.beginPath();
  ctx.roundRect(-s * 0.05, -s * 0.12, s * 0.12, s * 0.24, s * 0.03);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#8B3FE0';
  ctx.lineWidth = s * 0.045;
  ctx.beginPath();
  ctx.moveTo(-s * 0.22, 0);
  ctx.lineTo(s * 0.2, 0);
  ctx.moveTo(s * 0.12, -s * 0.07);
  ctx.lineTo(s * 0.2, 0);
  ctx.lineTo(s * 0.12, s * 0.07);
  ctx.stroke();
  ctx.fillStyle = '#B067F5';
  ctx.save();
  ctx.translate(-s * 0.16, 0);
  ctx.rotate(Math.PI / 2);
  gotinha(ctx, 0, 0, s * 0.06);
  ctx.restore();
}

/** Estojo Surpresa: estojinho de lente (dois potinhos tampados) com "?". */
function iconeEstojo(ctx, s) {
  ctx.fillStyle = '#FFB3D9';
  ctx.strokeStyle = '#B0216A';
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  ctx.roundRect(-s * 0.21, -s * 0.09, s * 0.42, s * 0.18, s * 0.09);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  for (const x of [-0.11, 0.11]) {
    ctx.beginPath();
    ctx.arc(s * x, 0, s * 0.075, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#B0216A';
  ctx.font = `900 ${Math.round(s * 0.12)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', -s * 0.11, s * 0.005);
  ctx.fillText('?', s * 0.11, s * 0.005);
  estrela(ctx, s * 0.2, -s * 0.15, s * 0.05, '#FFC93C');
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
        alvo: base.alvo, // id de jogador: nasce onde ele estiver no próximo quadro
      });
    }
    if (this.lista.length > 400) this.lista.splice(0, this.lista.length - 400);
  }

  atualizar(dt, posicoes = []) {
    for (const p of this.lista) {
      if (p.alvo !== undefined) {
        const alvo = posicoes.find((q) => q.j.id === p.alvo);
        if (alvo) { p.x += alvo.x; p.y += alvo.y; }
        p.alvo = undefined;
      }
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
