// Desenha o estado da simulação num Canvas 2D nítido em qualquer densidade de
// pixels. Só lê o mundo; nunca o altera.

import { BLOCO, MURO, VAZIO, TUNEL, TPS, CASA, DIRECOES, NOMES_DIRECOES, DURACAO_SALTO } from '../sim/constantes.js';
import { PERSONAGENS } from '../dados/personagens.js';
import { proximaQueda } from '../sim/aperto.js';
import { obterTema } from './temas.js';
import { criarPecas } from './pecas.js';
import { desenharPersonagem, desenharPersonagemRapido, gotinha } from './personagens.js';
import { desenharBichinho, desenharEscudo, ALTURA_MONTADO } from './bichinhos.js';
import { desenharGota, desenharRespingos, desenharItem, desenharQuebra, Particulas } from './efeitos.js';

const TAU = Math.PI * 2;
const DESCANSO = 130; // ticks da animação de "ir descansar" (encharca, nuvem, sobe)
const RAROS = new Set(['superLupa', 'penetrante', 'pinca', 'chute', 'estojo']);
// Ticks finais do pavio em que o alcance do respingo aparece no chão (2 s).
const JANELA_ALCANCE = 120;
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
    this.humor = []; // por jogador: { expressao, ate } (expressões passageiras)
    this.coletas = []; // itens pegos, subindo e sumindo sobre quem pegou
    this.relogio = 0;
    this.humano = 0; // -1 na vitrine do menu (sem balão "Você")
  }

  /** Expressão passageira de um jogador (alegre ao pegar item, decidido ao soltar gota…). */
  sentir(id, expressao, duracao) {
    if (id === undefined || id === null) return;
    this.humor[id] = { expressao, ate: this.relogio + duracao };
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
      this.humorDoEvento(e);
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
      } else if (e.tipo === 'itemSurge') {
        const cores = RAROS.has(e.item) ? ['#FFE58F', '#FFFFFF', '#E0A100'] : ['#FFFFFF', '#BFE8FF', '#7FD3FF'];
        this.particulas.emitir(8, { x, y, vel: s * 1.6, subida: s * 1.4, vida: 0.7, r: s * 0.05, cores, gravidade: s * 1.5, forma: 'brilho' });
      } else if (e.tipo === 'encharcado') {
        this.particulas.emitir(18, { x: 0, y: 0, alvo: e.jogador, vel: s * 3.2, subida: s * 2, vida: 0.8, r: s * 0.08, cores: ['#7FD3FF', '#FFFFFF', '#3FA9F5'], gravidade: s * 8, forma: 'gota' });
      } else if (e.tipo === 'fim' && e.vencedor !== null) {
        this.particulas.emitir(40, { x: 0, y: 0, alvo: e.vencedor, vel: s * 4, subida: s * 4, vida: 1.6, r: s * 0.07, cores: ['#FF6F61', '#FFC93C', '#2FBF71', '#3FA9F5', '#8B5CF6', '#EC4899'], gravidade: s * 5, forma: 'confete' });
      } else if (e.tipo === 'perdeuBichinho' || e.tipo === 'defendeu') {
        this.particulas.emitir(14, { x: 0, y: 0, alvo: e.jogador, vel: s * 3, subida: s, vida: 0.7, r: s * 0.07, cores: ['#FFFFFF', '#8FD4FF', '#FFB3D9'], gravidade: s * 4, forma: 'bola' });
      }
    }
  }

  humorDoEvento(e) {
    switch (e.tipo) {
      case 'item':
        if (e.item === 'cisco') this.sentir(e.jogador, 'susto', 0.7);
        else {
          this.sentir(e.jogador, 'alegre', 0.8);
          if (e.mudou !== false) this.coletas.push({ jogador: e.jogador, item: e.item, t: 0 });
        }
        break;
      case 'montou': this.sentir(e.jogador, 'alegre', 1); break;
      case 'gota': this.sentir(e.dono, 'esforco', 0.35); break;
      case 'chute': case 'arremesso': this.sentir(e.jogador, 'esforco', 0.4); break;
      case 'perdeuBichinho': this.sentir(e.jogador, 'susto', 0.9); break;
      case 'defendeu': this.sentir(e.jogador, 'esforco', 0.5); break;
      default: break;
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
    this.relogio = tempoSeg;
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

    this.desenharAlcance(mundo, tempoSeg);
    for (const g of mundo.gotas) if (g.estado === 'chao') desenharGota(ctx, (g.x / CASA) * s, (g.y / CASA) * s, s, g, tempoSeg);
    ctx.save();
    ctx.beginPath();
    ctx.rect(s * 0.9, s * 0.9, s * (mundo.colunas - 1.8), s * (mundo.linhas - 1.8));
    ctx.clip();
    desenharRespingos(ctx, mundo.respingos, s, tempoSeg);
    ctx.restore();
    const posicoes = this.desenharJogadores(mundo, anteriores, fracao, tempoSeg);
    this.desenharBocasDeTunel(mundo);
    for (const g of mundo.gotas) if (g.estado === 'voo') this.desenharVoo(mundo, g, fracao, tempoSeg);

    // Partículas recortadas ao interior da moldura (não "vazam" pela armação).
    ctx.save();
    ctx.beginPath();
    ctx.rect(s * 0.9, s * 0.9, s * (mundo.colunas - 1.8), s * (mundo.linhas - 1.8));
    ctx.clip();
    this.particulas.atualizar(dtSeg, posicoes);
    this.particulas.desenhar(ctx);
    ctx.restore();
    this.desenharColetas(posicoes, dtSeg);
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
    const W = mundo.colunas;
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
    // Perto de uma boca de túnel, o boneco também aparece saindo do outro lado
    // (cópia deslocada), e os dois são recortados na boca: entra num, sai no outro.
    const desenhos = [];
    for (const p of posicoes) {
      desenhos.push(p);
      const lin = Math.floor(p.y / s);
      const temTunel = mundo.grade[lin * W] === TUNEL;
      if (!temTunel || !p.j.vivo) continue;
      const casas = p.x / s;
      if (casas < 1.5) desenhos.push({ ...p, x: p.x + (W - 2) * s, copia: true });
      else if (casas > W - 1.5) desenhos.push({ ...p, x: p.x - (W - 2) * s, copia: true });
    }
    const ordem = desenhos.sort((p, q) => p.y - q.y || p.j.id - q.j.id);
    for (const d of ordem) {
      const recorta = d.x < s * 1.5 || d.x > s * (W - 1.5);
      if (recorta) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(s * 0.55, 0, s * (W - 1.1), s * mundo.linhas);
        ctx.clip();
      }
      this.desenharUm(mundo, d, tempoSeg);
      if (recorta) ctx.restore();
    }
    return posicoes;
  }

  /** Expressão do momento: passageira (evento), susto perto de uma gota prestes a estourar, ou normal. */
  expressaoDe(mundo, j) {
    if (mundo.fase === 'fim' && mundo.vencedor === j.id) return 'alegre';
    const h = this.humor[j.id];
    if (h && h.ate > this.relogio) return h.expressao;
    const col = Math.floor(j.x / CASA);
    const lin = Math.floor(j.y / CASA);
    for (const g of mundo.gotas) {
      if (g.estado !== 'chao' || g.pavio > 70) continue;
      const na = (g.col === col && Math.abs(g.lin - lin) <= g.alcance) || (g.lin === lin && Math.abs(g.col - col) <= g.alcance);
      if (na) return 'susto';
    }
    return 'normal';
  }

  desenharUm(mundo, { j, x, y }, tempoSeg) {
    const { ctx, s } = this;
    if (!j.vivo) {
      this.desenharDescanso(mundo, j, x, y, tempoSeg);
      return;
    }
    let alfa = 1;
    // Piscando invulnerável depois de perder o bichinho.
    if (j.invulneravel > 0 && Math.floor(mundo.tick / 4) % 2 === 0) alfa *= 0.35;
    const venceu = mundo.fase === 'fim' && mundo.vencedor === j.id;
    const comemora = venceu && !this.reduzido ? Math.abs(Math.sin(tempoSeg * 7)) * s * 0.18 : 0;
    const noAr = (j.salto ? Math.sin(Math.PI * Math.min(1, j.salto.t / DURACAO_SALTO)) * s * 0.55 : 0) + comemora;
    if (j.id === this.humano) this.marcarHumano(mundo, x, y, tempoSeg);
    if (j.disparada) this.rastroDeVelocidade(x, y, j.dir);
    let yp = y - noAr;
    let sp = s * 1.08; // um tiquinho maior que a casa: lê-se melhor em tela pequena
    if (j.montaria) {
      desenharBichinho(ctx, j.montaria.tipo, {
        x, y: y - noAr, s, fase: tempoSeg + j.id, alfa, noAr: !!j.salto,
        sentido: j.dir === 'esq' ? -1 : 1, correndo: !!j.disparada,
      });
      yp -= s * ALTURA_MONTADO;
      sp = s * 0.8; // menor e mais alto: o bichinho aparece inteiro embaixo
    }
    if (j.montaria?.tipo === 'cascudo') desenharEscudo(ctx, x, y - s * 0.05, s, j.dir, j.escudo, tempoSeg);
    const piscar = ((tempoSeg + j.id * 1.37) % 3.4) < 0.13 ? 1 : 0;
    desenharPersonagemRapido(ctx, PERSONAGENS[j.personagem], {
      x, y: yp, s: sp, dir: venceu ? 'baixo' : j.dir, andando: j.andando, fase: tempoSeg + j.id * 0.31,
      piscar: j.cisco ? Math.max(piscar, (Math.floor(tempoSeg * 3) % 3 === 0) ? 1 : 0) : piscar,
      alfa, expressao: this.expressaoDe(mundo, j), bracos: venceu ? 'cima' : 'repouso', sombra: !noAr || noAr < 1,
    }, this.dpr);
    if (j.cisco) this.nuvemDeCisco(x, yp, tempoSeg);
    if (j.segurando !== null) {
      const g = mundo.gotas.find((o) => o.id === j.segurando);
      if (g) desenharGota(ctx, x, yp - s * 0.72, s, g, tempoSeg, { sombra: false, escala: 0.7 });
    }
  }

  /**
   * "Encharcar e ir descansar", sem violência: o boneco leva o banho, aperta
   * os olhos e chacoalha; uma nuvenzinha fofa aparece embaixo e o leva para
   * cima, dormindo, até sumir.
   */
  desenharDescanso(mundo, j, x, y, tempoSeg) {
    const d = mundo.tick - j.eliminadoEm;
    if (d > DESCANSO) return;
    const { ctx, s } = this;
    const p = PERSONAGENS[j.personagem];
    if (d < 40) {
      const chacoalha = this.reduzido ? 0 : Math.sin(d * 1.3) * s * 0.04 * (1 - d / 40);
      desenharPersonagem(ctx, p, { x: x + chacoalha, y, s, dir: 'baixo', fase: tempoSeg, molhado: Math.min(1, d / 6) });
      return;
    }
    const k = (d - 40) / (DESCANSO - 40); // 0 → 1
    const sobe = (this.reduzido ? 0.3 : 1) * k * k * s * 1.4;
    const alfa = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    const nuvemY = y + s * 0.3 - sobe;
    ctx.save();
    ctx.globalAlpha = alfa;
    desenharPersonagemRapido(ctx, p, { x, y: nuvemY - s * 0.4, s: s * 0.82, dir: 'baixo', fase: tempoSeg * 0.4, expressao: 'sono', sombra: false }, this.dpr);
    nuvem(ctx, x, nuvemY, s * Math.min(1, k * 4));
    ctx.fillStyle = '#5B6B8C';
    ctx.textAlign = 'center';
    for (let n = 0; n < 2; n++) {
      const f = (k * 2 + n * 0.5) % 1;
      ctx.globalAlpha = alfa * Math.sin(f * Math.PI);
      ctx.font = `800 ${Math.round(s * (0.2 + f * 0.14))}px ${FONTE}`;
      ctx.fillText('z', x + s * 0.3 + f * s * 0.2, nuvemY - s * 0.75 - f * s * 0.3);
    }
    ctx.restore();
  }

  /**
   * Casa de perigo pré-desenhada (por cor): fundo translúcido, listras
   * diagonais e contorno tracejado. A forma (listras + tracejado) diz "perigo"
   * mesmo sem cor, em cinza e para daltônicos; a cor de cada arena foi
   * escolhida com contraste forte contra o piso (qa/sim/temas.test.mjs).
   */
  spriteDePerigo(rgb) {
    const chave = `perigo|${rgb}`;
    if (!this.itensProntos[chave]) {
      const { s, dpr } = this;
      const c = document.createElement('canvas');
      c.width = Math.ceil(s * dpr);
      c.height = Math.ceil(s * dpr);
      const ctx = c.getContext('2d');
      ctx.scale(dpr, dpr);
      const m = s * 0.07;
      const r = s * 0.2;
      ctx.beginPath();
      ctx.roundRect(m, m, s - 2 * m, s - 2 * m, r);
      ctx.fillStyle = `rgba(${rgb}, 0.34)`;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = `rgba(${rgb}, 0.55)`;
      ctx.lineWidth = s * 0.075;
      ctx.beginPath();
      for (let k = -1; k <= 4; k++) {
        const x0 = k * s * 0.3;
        ctx.moveTo(x0, s);
        ctx.lineTo(x0 + s, 0);
      }
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = `rgba(${rgb}, 0.95)`;
      ctx.lineWidth = Math.max(1.5, s * 0.06);
      ctx.setLineDash([s * 0.13, s * 0.09]);
      ctx.beginPath();
      ctx.roundRect(m, m, s - 2 * m, s - 2 * m, r);
      ctx.stroke();
      this.itensProntos[chave] = c;
    }
    return this.itensProntos[chave];
  }

  /**
   * Alcance do respingo: nos últimos 2 s do pavio, as casas que a gota vai
   * molhar ficam listradas e tracejadas, com uma gotinha no meio, pulsando
   * cada vez mais forte e mais rápido. Lê-se "saia daqui" num relance, sem
   * contar casas, também em tela pequena, em cinza e para daltônicos.
   */
  desenharAlcance(mundo, tempoSeg) {
    const { ctx, s } = this;
    const perigo = obterTema(mundo.arena).perigo;
    let mexeu = false;
    for (const g of mundo.gotas) {
      if (g.estado !== 'chao' || g.pavio > JANELA_ALCANCE) continue;
      const forca = 1 - g.pavio / JANELA_ALCANCE; // 0 → 1
      const rgb = g.penetrante ? perigo.penetrante : perigo.cor;
      const casas = [[g.col, g.lin]];
      for (const nome of NOMES_DIRECOES) {
        const { dc, dl } = DIRECOES[nome];
        for (let k = 1; k <= g.alcance; k++) {
          const c = g.col + dc * k;
          const l = g.lin + dl * k;
          const t = mundo.grade[l * mundo.colunas + c];
          if (t === BLOCO) { if (!g.penetrante) break; continue; } // o bloco já mostra o choque
          if (t !== VAZIO) break;
          casas.push([c, l]);
        }
      }
      const pulso = this.reduzido ? 0.75 : 0.5 + 0.5 * Math.sin(tempoSeg * (7 + forca * 11));
      const sprite = this.spriteDePerigo(rgb);
      mexeu = true;
      ctx.globalAlpha = 0.62 + 0.38 * Math.min(1, forca * 0.6 + forca * pulso * 0.5);
      for (const [c, l] of casas) ctx.drawImage(sprite, c * s, l * s, s, s);
      ctx.globalAlpha = 0.75 + 0.25 * forca;
      ctx.fillStyle = `rgb(${rgb})`;
      const r = s * (0.09 + 0.05 * forca * (this.reduzido ? 1 : 0.6 + 0.4 * pulso));
      for (const [c, l] of casas.slice(1)) gotinha(ctx, (c + 0.5) * s, (l + 0.62) * s, r);
    }
    if (mexeu) ctx.globalAlpha = 1;
  }

  /**
   * Bocas de túnel desenhadas a cada quadro: aberta (escura, com setas) ou
   * "dormindo" (pálpebra fechada) quando a casa de chegada está ocupada.
   * Por cima dos bonecos, um véu escuro faz quem entra sumir na boca.
   */
  desenharBocasDeTunel(mundo) {
    const { ctx, s } = this;
    const W = mundo.colunas;
    for (let l = 0; l < mundo.linhas; l++) {
      if (mundo.grade[l * W] !== TUNEL) continue;
      for (const lado of [0, W - 1]) {
        const destino = lado === 0 ? W - 2 : 1;
        const i = l * W + destino;
        const fechada = mundo.grade[i] !== VAZIO || mundo.gotas.some((g) => g.estado === 'chao' && g.col === destino && g.lin === l);
        const x = lado * s;
        const y = l * s;
        const fora = lado === 0 ? 0 : 1; // lado de fora da boca (borda da tela)
        if (fechada) {
          ctx.fillStyle = '#4B3F86';
          ctx.beginPath();
          ctx.roundRect(x + s * 0.04, y + s * 0.1, s * 0.92, s * 0.8, s * 0.35);
          ctx.fill();
          ctx.strokeStyle = '#C7BCFF';
          ctx.lineWidth = s * 0.05;
          ctx.stroke();
          // Pálpebra fechada com cílios: o túnel está "dormindo".
          ctx.strokeStyle = '#E6E0FF';
          ctx.lineWidth = s * 0.06;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(x + s * 0.5, y + s * 0.38, s * 0.26, Math.PI * 0.2, Math.PI * 0.8);
          for (const k of [-1, 0, 1]) {
            const a = Math.PI * (0.5 - k * 0.22);
            const bx = x + s * 0.5 + Math.cos(a) * s * 0.26;
            const by = y + s * 0.38 + Math.sin(a) * s * 0.26;
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(a) * s * 0.11, by + Math.sin(a) * s * 0.11);
          }
          ctx.stroke();
        } else {
          const g = ctx.createLinearGradient(x + fora * s, 0, x + (1 - fora) * s, 0);
          g.addColorStop(0, 'rgba(11, 9, 24, 1)');
          g.addColorStop(0.55, 'rgba(11, 9, 24, 0.85)');
          g.addColorStop(1, 'rgba(11, 9, 24, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.roundRect(x + s * 0.04, y + s * 0.1, s * 0.92, s * 0.8, s * 0.35);
          ctx.fill();
        }
      }
    }
  }

  /** Item pego: o medalhão sobe da cabeça de quem pegou, com um "+". */
  desenharColetas(posicoes, dtSeg) {
    if (!this.coletas.length) return;
    const { ctx, s } = this;
    for (const c of this.coletas) {
      c.t += dtSeg;
      const pos = posicoes.find((p) => p.j.id === c.jogador);
      if (!pos) continue;
      const k = Math.min(1, c.t / 0.9);
      const y = pos.y - s * (0.75 + k * 0.6);
      ctx.save();
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const tam = s * (0.62 + Math.sin(Math.min(1, k * 3) * Math.PI) * 0.12);
      ctx.drawImage(this.spriteDoItem(c.item), pos.x - tam / 2, y - tam / 2, tam, tam);
      ctx.restore();
    }
    this.coletas = this.coletas.filter((c) => c.t < 0.9);
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
    // Balão acima do acessório (que chega a 0,87 casa), só na contagem e no
    // primeiro segundo e meio, sumindo devagar: não cobre ninguém em jogo.
    const visivel = mundo.fase === 'contagem' ? 1 : Math.max(0, Math.min(1, (TPS * 1.5 - jogado) / (TPS * 0.5)));
    if (visivel > 0) {
      ctx.globalAlpha = visivel;
      const by = y - s * 1.2 + (this.reduzido ? 0 : Math.sin(tempoSeg * 5) * s * 0.05);
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

/** Nuvenzinha fofa (o "travesseiro" de quem foi descansar). */
function nuvem(ctx, x, y, s) {
  if (s <= 1) return;
  ctx.save();
  ctx.fillStyle = 'rgba(70, 90, 140, 0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.12, s * 0.42, s * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#C9D6EA';
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  for (const [dx, dy, r] of [[-0.24, 0.02, 0.15], [-0.08, -0.06, 0.19], [0.12, -0.04, 0.17], [0.27, 0.03, 0.13], [0, 0.06, 0.16]]) {
    ctx.moveTo(x + dx * s + r * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
  }
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}
