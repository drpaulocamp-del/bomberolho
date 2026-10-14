// Música leve por arena, composta aqui e tocada por um sequenciador simples
// (agenda as notas um pouquinho adiante no relógio do WebAudio).
// Para não cansar em repetição: volume baixo, melodia alternando entre duas
// frases e, a cada volta completa, uma volta "respirando" (sem melodia).

import { tom, ruido, freq } from './sintese.js';

const MAIOR = [0, 2, 4, 5, 7, 9, 11];
const DORICO = [0, 2, 3, 5, 7, 9, 10];
const _ = null;

// Graus da escala (0 = tônica; 7 = oitava acima). Cada frase tem 4 compassos
// de 8 colcheias. `acordes`: grau da raiz de cada compasso.
export const TEMAS = {
  menu: {
    bpm: 96, tonica: 60, escala: MAIOR, acordes: [0, 5, 3, 4], timbre: 'marimba',
    frases: [
      [4, _, 2, _, 4, 5, 4, _, 2, _, 0, _, 2, 4, 2, _, 3, _, 5, _, 7, 5, 3, _, 4, 2, 4, 5, 4, _, _, _],
      [7, _, 5, _, 4, _, 5, 4, 2, _, 4, _, 5, _, _, _, 3, 4, 5, _, 3, _, 1, _, 2, _, 4, _, 2, _, _, _],
    ],
  },
  jardim: {
    bpm: 104, tonica: 65, escala: MAIOR, acordes: [0, 3, 5, 4], timbre: 'flauta',
    frases: [
      [0, 2, 4, _, 4, _, 5, 4, 3, _, 5, _, 3, 2, 1, _, 5, _, 4, 2, 0, _, 2, _, 4, _, 2, _, 1, _, _, _],
      [4, 5, 7, _, 7, _, 5, 4, 5, _, 3, _, 5, _, _, _, 2, 4, 5, _, 4, 2, 0, _, 1, 2, 1, _, 0, _, _, _],
    ],
  },
  lago: {
    bpm: 84, tonica: 62, escala: MAIOR, acordes: [0, 3, 0, 4], timbre: 'sino',
    frases: [
      [4, _, _, 5, 4, _, 2, _, 3, _, _, 4, 3, _, 1, _, 4, _, 7, _, 6, _, 4, _, 5, _, _, _, 4, _, _, _],
      [2, _, 4, _, 7, _, _, 6, 5, _, 3, _, 5, _, _, _, 4, _, 2, _, 0, _, 2, _, 1, _, _, _, _, _, _, _],
    ],
  },
  caverna: {
    bpm: 92, tonica: 57, escala: DORICO, acordes: [0, 6, 5, 6], timbre: 'marimba',
    frases: [
      [0, _, 2, 4, _, 2, 4, 5, 6, _, 4, _, 2, _, _, _, 5, _, 4, 2, _, 4, 2, 0, 1, _, 2, _, 4, _, _, _],
      [4, _, 5, 7, _, 5, 4, _, 6, _, 5, 4, 2, _, _, _, 2, 4, 5, _, 4, _, 2, _, 1, 2, 0, _, _, _, _, _],
    ],
  },
  vale: {
    bpm: 112, tonica: 67, escala: MAIOR, acordes: [0, 4, 5, 3], timbre: 'pluck',
    frases: [
      [0, 0, 4, _, 4, 5, 4, _, 1, 1, 4, _, 4, 5, 4, _, 2, 2, 5, _, 5, 7, 5, 4, 3, _, 2, _, 1, _, _, _],
      [7, _, 6, 5, 4, _, 5, _, 4, _, 2, 4, 1, _, _, _, 2, 4, 5, _, 7, 5, 4, 2, 3, 2, 1, _, 0, _, _, _],
    ],
  },
  consultorio: {
    bpm: 100, tonica: 58, escala: MAIOR, acordes: [0, 2, 3, 4], timbre: 'sino',
    frases: [
      [4, _, 4, 5, 6, _, 4, _, 2, _, 2, 4, 6, _, 4, _, 3, _, 5, _, 7, _, 5, 3, 4, _, 2, _, 4, _, _, _],
      [7, _, 6, _, 5, _, 4, _, 6, _, 5, _, 4, _, 2, _, 3, 4, 5, _, 4, 3, 2, _, 1, _, 2, _, 0, _, _, _],
    ],
  },
};

function nota(tema, grau, oitava = 0) {
  const n = tema.escala.length;
  const o = Math.floor(grau / n);
  const g = ((grau % n) + n) % n;
  return tema.tonica + tema.escala[g] + 12 * (o + oitava);
}

/** Melodia em cada timbre: só osciladores, poucos parciais. */
function tocarMelodia(ctx, t, tema, midi, dur, saida) {
  const f = freq(midi);
  switch (tema.timbre) {
    case 'flauta':
      tom(ctx, t, { f, dur: dur * 1.6, vol: 0.09, ataque: 0.03, saida, vibrato: { taxa: 5, prof: f * 0.006 } });
      tom(ctx, t, { tipo: 'triangle', f: f * 2, dur: dur, vol: 0.012, ataque: 0.03, saida });
      break;
    case 'sino':
      tom(ctx, t, { tipo: 'triangle', f, dur: dur * 3, vol: 0.07, saida });
      tom(ctx, t, { f: f * 3, dur: dur * 1.2, vol: 0.018, saida });
      break;
    case 'pluck':
      tom(ctx, t, { tipo: 'triangle', f: f * 1.01, f2: f, dur: dur * 1.3, vol: 0.085, saida });
      break;
    default: // marimba
      tom(ctx, t, { f, dur: dur * 1.5, vol: 0.1, saida });
      tom(ctx, t, { f: f * 4, dur: 0.05, vol: 0.02, saida });
  }
}

export class Sequenciador {
  constructor(ctx, saida, ruidoBuffer) {
    this.ctx = ctx;
    this.saida = saida;
    this.ruido = ruidoBuffer;
    this.tema = null;
    this.passo = 0;
    this.proximo = 0;
    this.intenso = false;
    this.timer = null;
  }

  tocar(nome) {
    const tema = TEMAS[nome] || null;
    if (tema === this.tema) return;
    this.tema = tema;
    this.passo = 0;
    this.proximo = this.ctx.currentTime + 0.12;
    if (tema && !this.timer) this.timer = setInterval(() => this.agendar(), 40);
    if (!tema) this.parar();
  }

  parar() {
    this.tema = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  agendar() {
    const tema = this.tema;
    if (!tema) return;
    const ctx = this.ctx;
    // Aba parada ou contexto suspenso: recomeça a contar daqui.
    if (this.proximo < ctx.currentTime - 0.2) this.proximo = ctx.currentTime + 0.05;
    const colcheia = 60 / (tema.bpm * (this.intenso ? 1.12 : 1)) / 2;
    while (this.proximo < ctx.currentTime + 0.15) {
      this.tocarPasso(tema, this.passo, this.proximo, colcheia);
      this.passo++;
      this.proximo += colcheia;
    }
  }

  tocarPasso(tema, passo, t, colcheia) {
    const s = this.saida;
    const ctx = this.ctx;
    const noCompasso = passo % 8;
    const compasso = Math.floor(passo / 8) % 4;
    const volta = Math.floor(passo / 32); // cada volta = 4 compassos
    const raiz = tema.acordes[compasso];
    // Baixo: tônica no tempo 1 e quinta no tempo 3.
    if (noCompasso === 0 || noCompasso === 4) {
      const grau = noCompasso === 0 ? raiz : raiz + 4;
      tom(ctx, t, { f: freq(nota(tema, grau, -2)), dur: colcheia * 3, vol: 0.13, ataque: 0.01, saida: s });
    }
    // Acorde suave (tríade) no começo do compasso, segurando o compasso todo.
    if (noCompasso === 0) {
      for (const k of [0, 2, 4]) {
        tom(ctx, t, { tipo: 'triangle', f: freq(nota(tema, raiz + k, -1)), dur: colcheia * 7.5, vol: 0.022, ataque: 0.12, saida: s });
      }
    }
    // Arpejo leve nas colcheias pares.
    if (noCompasso % 2 === 1) {
      const k = [0, 2, 4, 2][(noCompasso >> 1) % 4];
      tom(ctx, t, { tipo: 'triangle', f: freq(nota(tema, raiz + k)), dur: colcheia * 0.9, vol: 0.022, saida: s });
    }
    // Percussão de leve: chiadinho no contratempo; mais rápido no aperto final.
    if (noCompasso % 2 === 1 || (this.intenso && noCompasso % 2 === 0)) {
      ruido(ctx, this.ruido, t, { filtro: 'highpass', f: 7000, dur: 0.035, vol: this.intenso ? 0.035 : 0.022, saida: s });
    }
    // Melodia: frase A, frase B, A de novo, e uma volta só de acompanhamento.
    const qual = [0, 1, 0, -1][volta % 4];
    if (qual >= 0) {
      const grau = tema.frases[qual][passo % 32];
      if (grau !== null) tocarMelodia(ctx, t, tema, nota(tema, grau), colcheia, s);
    }
  }
}
