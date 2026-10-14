// Desenha o estado da simulação num Canvas 2D nítido em qualquer densidade de
// pixels. Só lê o mundo; nunca o altera.

import { BLOCO, MURO, TPS, CASA, DIRECOES, DURACAO_SALTO } from '../sim/constantes.js';
import { PERSONAGENS } from '../dados/personagens.js';
import { proximaQueda } from '../sim/aperto.js';
import { obterTema } from './temas.js';
import { criarPecas } from './pecas.js';
import { desenharPersonagem } from './personagens.js';
import { desenharBichinho, desenharEscudo, ALTURA_MONTADO } from './bichinhos.js';
import { desenharGota, desenharRespingos, desenharItem, desenharQuebra, Particulas } from './efeitos.js';

const TAU = Math.PI * 2;
const FONTE = 'system-ui, -apple-system, "Segoe UI", sans-serif';

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
    // Cenário = fundo + blocos e muros parados, num canvas só; refeito apenas
    // quando alguma casa muda. Poupa o quadro em telas de alta densidade.
    const chaveCenario = mundo.grade.join('');
    if (chaveCenario !== this.chaveCenario) {
      const { fundo, bloco, muro } = this.pecas;
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
        const t = mundo.grade[i];
        if (t === BLOCO || t === MURO) c.drawImage(t === BLOCO ? bloco : muro, (i % mundo.colunas) * px, Math.floor(i / mundo.colunas) * px);
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
        const cores = e.penetrante ? ['#D7A8FF', '#FFFFFF', '#9B4DF0'] : ['#7FD3FF', '#FFFFFF', '#3FA9F5'];
        this.particulas.emitir(10, { x, y, vel: s * 4, subida: s * 1.5, vida: 0.6, r: s * 0.07, cores, gravidade: s * 9, forma: 'gota' });
        if (!this.reduzido) this.tremor = Math.min(1, this.tremor + (e.cadeia ? 0.25 : 0.45));
      } else if (e.tipo === 'bloco') {
        this.particulas.emitir(8, { x, y, vel: s * 2.2, subida: s * 0.8, vida: 0.7, r: s * 0.06, cores: ['#FFE08A', '#F6B94A', '#FFF4CF'], gravidade: s * 3, forma: 'bola' });
      } else if (e.tipo === 'item' || e.tipo === 'montou') {
        this.particulas.emitir(12, { x, y, vel: s * 2.5, subida: s * 1.2, vida: 0.6, r: s * 0.05, cores: ['#FFFFFF', '#FFE58F', '#8FD4FF'], gravidade: s * 2, forma: 'bola' });
      } else if (e.tipo === 'itemQueimado' || e.tipo === 'gotaEsmagada') {
        this.particulas.emitir(6, { x, y, vel: s * 1, subida: s * 1.5, vida: 0.8, r: s * 0.1, cores: ['rgba(255,255,255,0.8)'], gravidade: -s * 0.5, forma: 'bola' });
      } else if (e.tipo === 'muro') {
        this.particulas.emitir(10, { x, y: y + s * 0.3, vel: s * 2, subida: s * 0.3, vida: 0.5, r: s * 0.08, cores: ['rgba(255,255,255,0.85)', 'rgba(200,200,220,0.8)'], gravidade: s * 2, forma: 'bola' });
        if (!this.reduzido) this.tremor = Math.min(1, this.tremor + 0.12);
      } else if (e.tipo === 'perdeuBichinho' || e.tipo === 'defendeu') {
        this.particulas.emitir(14, { x: 0, y: 0, alvo: e.jogador, vel: s * 3, subida: s, vida: 0.7, r: s * 0.07, cores: ['#FFFFFF', '#8FD4FF', '#FFB3D9'], gravidade: s * 4, forma: 'bola' });
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
    this.desenharCorrenteza(mundo, tempoSeg);
    this.desenharAvisoDeQueda(mundo, tempoSeg);

    for (const q of mundo.quebras) {
      desenharQuebra(ctx, bloco, (q.i % mundo.colunas) * s, Math.floor(q.i / mundo.colunas) * s, s, q.t, q.duracao);
    }
    for (let i = 0; i < mundo.itens.length; i++) {
      const tipo = mundo.itens[i];
      if (!tipo) continue;
      const c = i % mundo.colunas;
      const l = Math.floor(i / mundo.colunas);
      const flut = Math.sin(tempoSeg * 3 + c * 0.9 + l * 0.4) * s * 0.04;
      ctx.drawImage(this.spriteDoItem(tipo), c * s, l * s + flut, s, s);
    }

    for (const g of mundo.gotas) if (g.estado === 'chao') desenharGota(ctx, (g.x / CASA) * s, (g.y / CASA) * s, s, g, tempoSeg);
    ctx.save();
    ctx.beginPath();
    ctx.rect(s * 0.9, s * 0.9, s * (mundo.colunas - 1.8), s * (mundo.linhas - 1.8));
    ctx.clip();
    desenharRespingos(ctx, mundo.respingos, s, tempoSeg);
    ctx.restore();
    const posicoes = this.desenharJogadores(mundo, anteriores, fracao, tempoSeg);
    for (const g of mundo.gotas) if (g.estado === 'voo') this.desenharVoo(mundo, g, fracao, tempoSeg);

    // Partículas recortadas ao interior da moldura (não "vazam" pela armação).
    ctx.save();
    ctx.beginPath();
    ctx.rect(s * 0.9, s * 0.9, s * (mundo.colunas - 1.8), s * (mundo.linhas - 1.8));
    ctx.clip();
    this.particulas.atualizar(dtSeg, posicoes);
    this.particulas.desenhar(ctx);
    ctx.restore();
    this.desenharMensagens(mundo, tempoSeg);
  }

  /** Setinhas da correnteza andando no sentido da água (Lago Lacrimal). */
  desenharCorrenteza(mundo, tempoSeg) {
    const { ctx, s } = this;
    let tem = false;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = s * 0.06;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < mundo.piso.length; i++) {
      const dir = DIRECOES[mundo.piso[i]];
      if (!dir) continue;
      tem = true;
      const fase = this.reduzido ? 0.5 : (tempoSeg * 0.9) % 1;
      const cx = (i % mundo.colunas + 0.5) * s + dir.dc * (fase - 0.5) * s;
      const cy = (Math.floor(i / mundo.colunas) + 0.5) * s + dir.dl * (fase - 0.5) * s;
      const ax = dir.dc * s * 0.12;
      const ay = dir.dl * s * 0.12;
      ctx.globalAlpha = 0.25 + 0.6 * Math.sin(fase * Math.PI);
      ctx.beginPath();
      ctx.moveTo(cx - ax - ay, cy - ay - ax);
      ctx.lineTo(cx + ax, cy + ay);
      ctx.lineTo(cx - ax + ay, cy - ay + ax);
      ctx.stroke();
    }
    if (tem) ctx.globalAlpha = 1;
  }

  /** A próxima peça do aperto: sombra que cresce e pisca até ela cair. */
  desenharAvisoDeQueda(mundo, tempoSeg) {
    const i = proximaQueda(mundo);
    if (i < 0) return;
    const { ctx, s } = this;
    const a = mundo.aperto;
    const falta = Math.max(0, a.proximoEm - mundo.tick) / Math.max(1, a.ritmo); // 1 → 0
    const x = (i % mundo.colunas + 0.5) * s;
    const y = (Math.floor(i / mundo.colunas) + 0.5) * s;
    ctx.save();
    ctx.fillStyle = `rgba(40, 20, 70, ${0.18 + (1 - falta) * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.1, s * (0.2 + (1 - falta) * 0.25), s * (0.12 + (1 - falta) * 0.16), 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = Math.floor(tempoSeg * 8) % 2 ? '#FF5A6E' : '#FFFFFF';
    ctx.lineWidth = s * 0.05;
    ctx.setLineDash([s * 0.1, s * 0.08]);
    ctx.strokeRect(x - s * 0.42, y - s * 0.42, s * 0.84, s * 0.84);
    ctx.restore();
  }

  /** Gota arremessada pela Pinça: arco por cima de tudo, sombra no chão, dá a volta pela borda. */
  desenharVoo(mundo, g, fracao, tempoSeg) {
    const { ctx, s } = this;
    const v = g.voo;
    const p = Math.min(1, (v.t + fracao) / v.duracao);
    const { dc, dl } = DIRECOES[v.dir];
    const w = mundo.colunas - 2;
    const h = mundo.linhas - 2;
    const ajusta = (x, n) => ((((x - 1) % n) + n) % n) + 1;
    const col = ajusta(v.col0 + 0.5 + dc * v.casas * p, w);
    const lin = ajusta(v.lin0 + 0.5 + dl * v.casas * p, h);
    const x = col * s;
    const y = lin * s;
    const altura = Math.sin(Math.PI * p) * s * (0.5 + 0.18 * v.casas);
    ctx.fillStyle = 'rgba(20, 40, 80, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.34, s * 0.18 * (1 - p * 0.3 + Math.abs(0.5 - p) * 0.4), s * 0.05, 0, 0, TAU);
    ctx.fill();
    desenharGota(ctx, x, y - altura, s, g, tempoSeg, { sombra: false, escala: 0.85 });
  }

  desenharJogadores(mundo, anteriores, fracao, tempoSeg) {
    const { ctx, s } = this;
    const posicoes = mundo.jogadores.map((j) => {
      const a = anteriores[j.id] || j;
      // Túnel: um salto grande de posição não é interpolado (senão cruza a arena).
      const f = Math.abs(a.x - j.x) > CASA * 2 ? 1 : fracao;
      return {
        j,
        x: ((a.x + (j.x - a.x) * f) / CASA) * s,
        y: ((a.y + (j.y - a.y) * f) / CASA) * s,
      };
    });
    const ordem = [...posicoes].sort((p, q) => p.y - q.y || p.j.id - q.j.id);
    for (const { j, x, y } of ordem) {
      let molhado = 0;
      let alfa = 1;
      if (!j.vivo) {
        const d = mundo.tick - j.eliminadoEm;
        if (d > 90) continue; // já foi "descansar"
        molhado = Math.min(1, d / 8);
        alfa = d < 45 ? 1 : Math.max(0, 1 - (d - 45) / 45);
      }
      // Piscando invulnerável depois de perder o bichinho.
      if (j.invulneravel > 0 && Math.floor(mundo.tick / 4) % 2 === 0) alfa *= 0.35;
      const noAr = j.salto ? Math.sin(Math.PI * Math.min(1, j.salto.t / DURACAO_SALTO)) * s * 0.55 : 0;
      if (j.id === 0 && j.vivo) this.marcarHumano(mundo, x, y, tempoSeg);
      if (j.disparada) this.rastroDeVelocidade(x, y, j.dir);
      let yp = y - noAr;
      let sp = s;
      if (j.montaria) {
        desenharBichinho(ctx, j.montaria.tipo, {
          x, y: y - noAr, s, fase: tempoSeg + j.id, alfa, noAr: !!j.salto,
          sentido: j.dir === 'esq' ? -1 : 1, correndo: !!j.disparada,
        });
        yp -= s * ALTURA_MONTADO;
        sp = s * 0.74; // menor e mais alto: o bichinho aparece inteiro embaixo
      }
      if (j.montaria?.tipo === 'cascudo' && j.vivo) desenharEscudo(ctx, x, y - s * 0.05, s, j.dir, j.escudo, tempoSeg);
      const piscar = ((tempoSeg + j.id * 1.37) % 3.4) < 0.13 ? 1 : 0;
      desenharPersonagem(ctx, PERSONAGENS[j.personagem], {
        x, y: yp, s: sp, dir: j.dir, andando: j.andando && j.vivo, fase: tempoSeg + j.id * 0.31,
        piscar: j.cisco ? Math.max(piscar, (Math.floor(tempoSeg * 3) % 3 === 0) ? 1 : 0) : piscar, molhado, alfa,
      });
      if (j.cisco && j.vivo) this.nuvemDeCisco(x, yp, tempoSeg);
      if (j.segurando !== null) {
        const g = mundo.gotas.find((o) => o.id === j.segurando);
        if (g) desenharGota(ctx, x, yp - s * 0.72, s, g, tempoSeg, { sombra: false, escala: 0.7 });
      }
    }
    return posicoes;
  }

  rastroDeVelocidade(x, y, dir) {
    const { ctx, s } = this;
    const { dc, dl } = DIRECOES[dir];
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 160, 70, 0.7)';
    ctx.lineWidth = s * 0.05;
    ctx.lineCap = 'round';
    for (const k of [-1, 0, 1]) {
      const ox = dl !== 0 ? k * s * 0.18 : 0;
      const oy = dc !== 0 ? k * s * 0.18 : 0;
      ctx.beginPath();
      ctx.moveTo(x - dc * s * 0.45 + ox, y - dl * s * 0.45 + oy);
      ctx.lineTo(x - dc * s * 0.9 + ox, y - dl * s * 0.9 + oy);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Cisco: bolinhas de poeira girando em volta da cabeça. */
  nuvemDeCisco(x, y, tempoSeg) {
    const { ctx, s } = this;
    ctx.save();
    ctx.fillStyle = 'rgba(140, 132, 128, 0.85)';
    for (let k = 0; k < 4; k++) {
      const a = tempoSeg * 4 + (k / 4) * TAU;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * s * 0.36, y - s * 0.42 + Math.sin(a) * s * 0.1, s * (0.05 + (k % 2) * 0.02), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Anel sob o jogador humano e, na largada, o balão "Você". */
  marcarHumano(mundo, x, y, tempoSeg) {
    const { ctx, s } = this;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 113, 227, 0.75)';
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.38, s * 0.33, s * 0.11, 0, 0, TAU);
    ctx.stroke();
    const jogado = mundo.fase === 'contagem' ? 0 : mundo.tick - mundo.inicioJogo;
    if (mundo.fase === 'contagem' || jogado < TPS * 3) {
      const by = y - s * 0.86 + Math.sin(tempoSeg * 5) * s * 0.05;
      const texto = 'Você';
      ctx.font = `700 ${Math.max(11, Math.round(s * 0.34))}px ${FONTE}`;
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

  /** "3, 2, 1, Já!" e "Aperto final!" por cima da arena. */
  desenharMensagens(mundo, tempoSeg) {
    let texto = null;
    let cor = '#0071E3';
    let fracaoAnim = 0;
    if (mundo.fase === 'contagem') {
      const n = Math.ceil(mundo.contagem / TPS);
      texto = String(n);
      fracaoAnim = 1 - ((mundo.contagem - 1) % TPS) / TPS;
    } else {
      const jogado = mundo.tick - mundo.inicioJogo;
      if (mundo.inicioJogo > 0 && jogado < 40) {
        texto = 'Já!';
        cor = '#1FAA59';
        fracaoAnim = jogado / 40;
      } else if (mundo.aperto.ativo && mundo.fase === 'jogando' && mundo.ajuste.inicioAperto - mundo.tempoRestante < 120) {
        texto = 'Aperto final!';
        cor = '#E2574C';
        fracaoAnim = (mundo.ajuste.inicioAperto - mundo.tempoRestante) / 120;
      }
    }
    if (!texto) return;
    const { ctx, s } = this;
    const grande = texto.length <= 3;
    const pulo = this.reduzido ? 1 : 1 + Math.max(0, 0.35 - fracaoAnim) * 1.2;
    const tamanho = Math.round(s * (grande ? 2.6 : 1.1) * pulo);
    const x = (mundo.colunas / 2) * s;
    const y = (mundo.linhas / 2) * s;
    ctx.save();
    ctx.font = `900 ${tamanho}px ${FONTE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = Math.min(1, (1 - fracaoAnim) * 3 + 0.2);
    ctx.lineJoin = 'round';
    ctx.lineWidth = tamanho * 0.16;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeText(texto, x, y);
    ctx.fillStyle = cor;
    ctx.fillText(texto, x, y);
    ctx.restore();
  }
}
