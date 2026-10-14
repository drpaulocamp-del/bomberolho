// Controle do som: o contexto de áudio só nasce depois de um gesto (toque,
// clique ou tecla), o mudo é lembrado entre visitas e os eventos da
// simulação viram efeitos. Música por arena, um pouco mais animada no aperto.

import { criarRuido, EFEITOS } from './sintese.js';
import { Sequenciador } from './musica.js';
import { criarCadeia } from './cadeia.js';

const RAROS = new Set(['superLupa', 'penetrante', 'pinca', 'chute']);
// Evento da simulação → efeito (os que pedem lógica estão em reagir()).
const DIRETOS = {
  gota: 'gota', bloco: 'bloco', espirro: 'espirro', contagem: 'contagem', ja: 'ja', aperto: 'aperto',
  muro: 'muro', chute: 'chute', salto: 'salto', pousoSalto: 'pousou', pousou: 'pousou', arremesso: 'arremesso',
  montou: 'montou', perdeuBichinho: 'perdeuBichinho', defendeu: 'defendeu', disparada: 'disparada',
};
// Intervalo mínimo entre dois sons iguais (cadeias e o aperto disparam muitos de uma vez).
const INTERVALO = { respingo: 0.07, bloco: 0.05, muro: 0.12, gota: 0.04 };

export class Som {
  constructor({ mudo = false } = {}) {
    this.mudo = mudo;
    this.ctx = null;
    this.tema = null;
    this.ultimo = {};
    this.musicaPausada = false;
  }

  /** Chamado dentro de um gesto do usuário: cria/retoma o áudio. */
  destravar() {
    if (this.mudo) return;
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    try {
      if (!this.ctx) {
        this.ctx = new Contexto();
        this.ruido = criarRuido(this.ctx);
        const cadeia = criarCadeia(this.ctx);
        this.efeitos = cadeia.efeitos;
        this.trilha = cadeia.trilha;
        this.seq = new Sequenciador(this.ctx, this.trilha, this.ruido);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.aplicarTema();
    } catch {
      this.ctx = null; // sem áudio neste navegador: o jogo segue mudo
    }
  }

  get pronto() {
    return !!this.ctx && !this.mudo && this.ctx.state === 'running';
  }

  definirMudo(mudo) {
    this.mudo = !!mudo;
    if (!this.ctx) return;
    if (this.mudo) {
      this.seq.parar();
      this.ctx.suspend();
    } else {
      this.ctx.resume();
      this.seq.tema = null;
      this.aplicarTema();
    }
  }

  /** Aba escondida: silêncio total (e nada de relógio rodando à toa). */
  segundoPlano(oculto) {
    if (!this.ctx || this.mudo) return;
    if (oculto) this.ctx.suspend();
    else this.ctx.resume();
  }

  /** Trilha atual: nome de TEMAS (arena ou 'menu') ou null (silêncio). */
  musica(nome) {
    this.tema = nome;
    this.aplicarTema();
  }

  pausarMusica(pausa) {
    this.musicaPausada = !!pausa;
    this.aplicarTema();
  }

  intensa(sim) {
    if (this.seq) this.seq.intenso = !!sim;
  }

  aplicarTema() {
    if (!this.ctx || this.mudo) return;
    this.seq.tocar(this.musicaPausada ? null : this.tema);
  }

  tocar(nome, extra) {
    if (!this.pronto) return;
    const t = this.ctx.currentTime;
    const minimo = INTERVALO[nome] || 0.02;
    if (this.ultimo[nome] !== undefined && t - this.ultimo[nome] < minimo) return;
    this.ultimo[nome] = t;
    EFEITOS[nome]?.(this.ctx, this.ruido, t + 0.005, this.efeitos, extra);
  }

  /** Eventos da simulação → efeitos. */
  reagir(eventos) {
    if (!this.pronto || !eventos.length) return;
    let respingos = 0;
    for (const e of eventos) {
      if (e.tipo === 'respingo') respingos++;
      else if (e.tipo === 'item') {
        if (e.item === 'cisco') this.tocar('cisco');
        else if (e.item !== 'estojo') this.tocar(RAROS.has(e.item) ? 'itemRaro' : 'item');
      } else if (e.tipo === 'encharcado') this.tocar('encharcado');
      else if (e.tipo === 'fimRodada') {
        if (e.encerrada) this.tocar(e.campeao === null ? 'empate' : 'vitoria');
        else this.tocar(e.vencedor === null ? 'empate' : 'rodada');
      } else if (DIRETOS[e.tipo]) this.tocar(DIRETOS[e.tipo]);
    }
    // Vários respingos no mesmo quadro (cadeia) = um splash mais cheio, não uma rajada.
    if (respingos) this.tocar('respingo', Math.min(1.3, 0.85 + respingos * 0.15));
  }
}
