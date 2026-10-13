// Desenha o estado da simulação num Canvas 2D nítido em qualquer densidade de
// pixels. Só lê o mundo; nunca o altera.

import { BLOCO, TPS, CASA } from '../sim/constantes.js';
import { PERSONAGENS } from '../dados/personagens.js';
import { obterTema } from './temas.js';
import { criarPecas } from './pecas.js';
import { desenharPersonagem } from './personagens.js';
import { desenharGota, desenharRespingos, desenharItem, desenharQuebra, Particulas } from './efeitos.js';

const TAU = Math.PI * 2;

export class Renderizador {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particulas = new Particulas();
    this.s = 32;
    this.dpr = 1;
    this.pecas = null;
    this.chavePecas = '';
    this.tremor = 0;
    this.reduzido = false;
  }

  definirMovimentoReduzido(reduzido) {
    this.reduzido = reduzido;
    this.particulas.fator = reduzido ? 0.35 : 1;
  }

  /** Ajusta o canvas ao espaço disponível (px CSS) mantendo casas inteiras. */
  ajustar(largura, altura, dpr, mundo) {
    const s = Math.max(14, Math.floor(Math.min(largura / mundo.colunas, altura / mundo.linhas)));
    this.s = s;
    this.dpr = dpr;
    const w = s * mundo.colunas;
    const h = s * mundo.linhas;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.chavePecas = '';
  }

  prepararPecas(mundo) {
    const chave = `${mundo.arena}|${this.s}|${this.dpr}|${mundo.semente}`;
    if (chave !== this.chavePecas) {
      this.pecas = criarPecas(mundo, obterTema(mundo.arena), this.s, this.dpr);
      this.chavePecas = chave;
      this.chaveCenario = '';
      this.cenario = null;
      this.itensProntos = {};
    }
    // Cenário = fundo + blocos parados, num canvas só; refeito apenas quando
    // algum bloco muda. Poupa o quadro em telas de alta densidade.
    const chaveCenario = mundo.grade.join('');
    if (chaveCenario !== this.chaveCenario) {
      const { fundo, bloco } = this.pecas;
      if (!this.cenario) {
        this.cenario = document.createElement('canvas');
        this.cenario.width = fundo.width;
        this.cenario.height = fundo.height;
      }
      const c = this.cenario.getContext('2d');
      const px = this.s * this.dpr;
      c.clearRect(0, 0, fundo.width, fundo.height);
      c.drawImage(fundo, 0, 0);
      for (let i = 0; i < mundo.grade.length; i++) {
        if (mundo.grade[i] === BLOCO) c.drawImage(bloco, (i % mundo.colunas) * px, Math.floor(i / mundo.colunas) * px);
      }
      this.chaveCenario = chaveCenario;
    }
  }

  /** Medalhão do item pré-desenhado (o quadro só o copia, flutuando). */
  spriteDoItem(tipo) {
    if (!this.itensProntos[tipo]) {
      const px = this.s * this.dpr;
      const c = document.createElement('canvas');
      c.width = Math.ceil(px);
      c.height = Math.ceil(px);
      const ctx = c.getContext('2d');
      ctx.scale(this.dpr, this.dpr);
      desenharItem(ctx, tipo, this.s / 2, this.s / 2, this.s);
      this.itensProntos[tipo] = c;
    }
    return this.itensProntos[tipo];
  }

  /** Transforma eventos da simulação em partículas e tremidinhas. */
  reagir(eventos) {
    const s = this.s;
    for (const e of eventos) {
      const x = (e.col + 0.5) * s;
      const y = (e.lin + 0.5) * s;
      if (e.tipo === 'respingo') {
        this.particulas.emitir(10, { x, y, vel: s * 4, subida: s * 1.5, vida: 0.6, r: s * 0.07, cores: ['#7FD3FF', '#FFFFFF', '#3FA9F5'], gravidade: s * 9, forma: 'gota' });
        if (!this.reduzido) this.tremor = Math.min(1, this.tremor + (e.cadeia ? 0.25 : 0.45));
      } else if (e.tipo === 'bloco') {
        this.particulas.emitir(8, { x, y, vel: s * 2.2, subida: s * 0.8, vida: 0.7, r: s * 0.06, cores: ['#FFE08A', '#F6B94A', '#FFF4CF'], gravidade: s * 3, forma: 'bola' });
      } else if (e.tipo === 'item') {
        this.particulas.emitir(12, { x, y, vel: s * 2.5, subida: s * 1.2, vida: 0.6, r: s * 0.05, cores: ['#FFFFFF', '#FFE58F', '#8FD4FF'], gravidade: s * 2, forma: 'bola' });
      } else if (e.tipo === 'itemQueimado') {
        this.particulas.emitir(6, { x, y, vel: s * 1, subida: s * 1.5, vida: 0.8, r: s * 0.1, cores: ['rgba(255,255,255,0.8)'], gravidade: -s * 0.5, forma: 'bola' });
      }
    }
  }

  /**
   * @param {object} mundo      estado da simulação
   * @param {object[]} anteriores posições antes do último tick
   * @param {number} fracao     0–1 entre o último tick e o próximo
   * @param {number} tempoSeg   relógio de animação (s)
   * @param {number} dtSeg      tempo desde o último quadro (s)
   */
  desenhar(mundo, anteriores, fracao, tempoSeg, dtSeg) {
    this.prepararPecas(mundo);
    const { ctx, s, dpr } = this;
    const { bloco } = this.pecas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Tremidinha curta quando uma gota estoura (desligada em "reduzir movimento").
    let tx = 0;
    let ty = 0;
    if (this.tremor > 0.01) {
      tx = (Math.random() - 0.5) * this.tremor * s * 0.12;
      ty = (Math.random() - 0.5) * this.tremor * s * 0.12;
      this.tremor *= Math.pow(0.02, dtSeg);
    }
    ctx.setTransform(dpr, 0, 0, dpr, tx * dpr, ty * dpr);
    ctx.drawImage(this.cenario, 0, 0, s * mundo.colunas, s * mundo.linhas);

    for (const q of mundo.quebras) {
      desenharQuebra(ctx, bloco, (q.i % mundo.colunas) * s, Math.floor(q.i / mundo.colunas) * s, s, q.t);
    }
    for (let i = 0; i < mundo.itens.length; i++) {
      const tipo = mundo.itens[i];
      if (!tipo) continue;
      const c = i % mundo.colunas;
      const l = Math.floor(i / mundo.colunas);
      const flut = Math.sin(tempoSeg * 3 + c * 0.9 + l * 0.4) * s * 0.04;
      ctx.drawImage(this.spriteDoItem(tipo), c * s, l * s + flut, s, s);
    }

    for (const g of mundo.gotas) desenharGota(ctx, (g.col + 0.5) * s, (g.lin + 0.5) * s, s, g, tempoSeg);
    desenharRespingos(ctx, mundo.respingos, s, tempoSeg);
    this.desenharJogadores(mundo, anteriores, fracao, tempoSeg);

    this.particulas.atualizar(dtSeg);
    this.particulas.desenhar(ctx);
  }

  desenharJogadores(mundo, anteriores, fracao, tempoSeg) {
    const { ctx, s } = this;
    const posicoes = mundo.jogadores.map((j) => {
      const a = anteriores[j.id] || j;
      return {
        j,
        x: ((a.x + (j.x - a.x) * fracao) / CASA) * s,
        y: ((a.y + (j.y - a.y) * fracao) / CASA) * s,
      };
    });
    posicoes.sort((p, q) => p.y - q.y || p.j.id - q.j.id);
    for (const { j, x, y } of posicoes) {
      let molhado = 0;
      let alfa = 1;
      if (!j.vivo) {
        const d = mundo.tick - j.eliminadoEm;
        if (d > 90) continue; // já foi "descansar"
        molhado = Math.min(1, d / 8);
        alfa = d < 45 ? 1 : Math.max(0, 1 - (d - 45) / 45);
      }
      if (j.id === 0 && j.vivo) this.marcarHumano(x, y, mundo.tick, tempoSeg);
      const piscar = ((tempoSeg + j.id * 1.37) % 3.4) < 0.13 ? 1 : 0;
      desenharPersonagem(ctx, PERSONAGENS[j.personagem], {
        x, y, s, dir: j.dir, andando: j.andando && j.vivo, fase: tempoSeg + j.id * 0.31,
        piscar, molhado, alfa,
      });
    }
  }

  /** Anel sob o jogador humano e, nos primeiros segundos, o balão "Você". */
  marcarHumano(x, y, tick, tempoSeg) {
    const { ctx, s } = this;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 113, 227, 0.75)';
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.38, s * 0.33, s * 0.11, 0, 0, TAU);
    ctx.stroke();
    if (tick < TPS * 3) {
      const by = y - s * 0.78 + Math.sin(tempoSeg * 5) * s * 0.05;
      const texto = 'Você';
      ctx.font = `700 ${Math.max(11, Math.round(s * 0.34))}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      const w = ctx.measureText(texto).width + s * 0.3;
      const h = s * 0.46;
      ctx.fillStyle = '#0071E3';
      ctx.beginPath();
      ctx.roundRect(x - w / 2, by - h / 2, w, h, h / 2);
      ctx.moveTo(x - s * 0.09, by + h / 2 - 1);
      ctx.lineTo(x, by + h / 2 + s * 0.12);
      ctx.lineTo(x + s * 0.09, by + h / 2 - 1);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(texto, x, by + 1);
    }
    ctx.restore();
  }
}
