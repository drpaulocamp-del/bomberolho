// Estado de botões com borda, comum ao teclado e ao toque. A simulação age na
// borda (solto → apertado): um toque rápido (apertar e soltar entre dois
// ticks) não se perde — fica guardado até a próxima leitura — e, se o botão
// continuou apertado desde o tick anterior, entrega um tick solto antes.

export function criarBotoes(nomes = ['bomba', 'acao']) {
  const apertados = new Set();
  const pendente = {};
  const ultima = {};
  for (const n of nomes) {
    pendente[n] = false;
    ultima[n] = false;
  }
  return {
    apertar(nome, repetido = false) {
      if (!repetido) pendente[nome] = true;
      apertados.add(nome);
    },
    soltar(nome) {
      apertados.delete(nome);
    },
    apertado(nome) {
      return apertados.has(nome);
    },
    /** Valor do botão para o próximo tick (consome o toque guardado). */
    ler(nome) {
      let v = pendente[nome] || apertados.has(nome);
      if (pendente[nome] && ultima[nome]) v = false;
      else pendente[nome] = false;
      ultima[nome] = v;
      return v;
    },
    limpar() {
      apertados.clear();
      for (const n of nomes) pendente[n] = false;
    },
  };
}
