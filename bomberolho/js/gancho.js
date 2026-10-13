// Gancho de teste window.__bomberolho — usado pelos testes de navegador e pelo
// verificador. Não altera regras: só lê o estado e injeta entradas/passos.

const CAMPOS_ENTRADA = ['cima', 'baixo', 'esq', 'dir', 'bomba'];

export function instalarGancho(app) {
  const api = {
    versao: '1.0.0-parte1',

    /** Retrato do jogo (cópia: mexer nele não muda nada). */
    get state() {
      return { ...app.jogo.retrato(), fps: app.fps() };
    },

    /**
     * Nova partida. {personagem, arena, dificuldade, semente, rodadas}; o que
     * faltar mantém o valor atual, exceto a semente, que é sorteada.
     */
    start(opcoes = {}) {
      app.reiniciar(opcoes);
      return api.state;
    },

    /** Escala do tempo real: 1 normal, 2 dobro, 0 congela (use step). */
    setTimeScale(n) {
      const v = Number(n);
      if (!Number.isFinite(v) || v < 0 || v > 16) throw new RangeError('setTimeScale: use um número entre 0 e 16');
      app.jogo.escala = v;
      return v;
    },

    /**
     * Fixa a entrada de um competidor (0 = humano) até nova chamada.
     * `input(0, {dir: true})`; `input(0, null)` devolve o controle ao teclado/robô.
     */
    input(jogador, comandos) {
      const id = Number(jogador);
      if (!Number.isInteger(id) || id < 0 || id >= app.jogo.mundo.jogadores.length) {
        throw new RangeError(`input: jogador inválido (${jogador})`);
      }
      if (comandos == null) {
        app.jogo.substitutas[id] = undefined;
        return null;
      }
      const e = {};
      for (const c of CAMPOS_ENTRADA) e[c] = !!comandos[c];
      app.jogo.substitutas[id] = e;
      return { ...e };
    },

    /** Roda n ticks (1/60 s cada) na hora, redesenha e devolve o estado. */
    step(n = 1) {
      const k = Math.max(0, Math.floor(Number(n) || 0));
      app.jogo.passos(k);
      app.redesenhar(k);
      return api.state;
    },

    /** Liga/desliga o piloto automático do humano. */
    demo(ligado = true) {
      app.jogo.demo = !!ligado;
      return app.jogo.demo;
    },

    /** Pausa (true), retoma (false) ou alterna (sem argumento). */
    pause(estado) {
      app.pausar(estado);
      return app.jogo.pausado;
    },

    /** Impressão digital do estado completo da simulação (determinismo). */
    hash() {
      return app.jogo.impressao();
    },
  };
  Object.defineProperty(window, '__bomberolho', { value: Object.freeze(api), configurable: true });
  return api;
}
