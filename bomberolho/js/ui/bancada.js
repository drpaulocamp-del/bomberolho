// Bancada de ajuste do "sentir" (?ajuste=1). Controles deslizantes que mudam
// os parâmetros da simulação na hora, na partida em andamento; "Restaurar
// padrão" e "Copiar ajuste" (um JSON curto para o dono colar ao orquestrador).
// Só é carregada com ?ajuste=1 — fora disso nem o arquivo é baixado.

import { AJUSTE_PADRAO, FAIXAS_AJUSTE, diferencasDoPadrao } from '../sim/ajustes.js';

function formatar(faixa, valor) {
  const v = valor * faixa.escala;
  const casas = Math.abs(v) >= 10 || faixa.escala === 1 ? 0 : v >= 1 ? 2 : 3;
  return `${v.toFixed(casas).replace('.', ',')} ${faixa.unidade}`;
}

/**
 * Texto copiado: só o que mudou em relação ao padrão (curto para colar), em
 * JSON de uma linha. `criarAjuste` completa o resto com o padrão.
 */
export function textoDoAjuste(ajuste) {
  return JSON.stringify({ bomberolhoAjuste: diferencasDoPadrao(ajuste) });
}

export class Bancada {
  constructor(raiz, jogo, op = {}) {
    this.jogo = jogo;
    this.op = op;
    const estilo = document.createElement('link');
    estilo.rel = 'stylesheet';
    estilo.href = 'css/bancada.css';
    document.head.append(estilo);

    this.botaoAbrir = document.createElement('button');
    this.botaoAbrir.type = 'button';
    this.botaoAbrir.className = 'bancada-abrir';
    this.botaoAbrir.textContent = 'Ajuste';
    this.botaoAbrir.setAttribute('aria-expanded', 'true');
    this.botaoAbrir.addEventListener('click', () => this.alternar());

    this.el = document.createElement('section');
    this.el.className = 'bancada';
    this.el.setAttribute('aria-label', 'Bancada de ajuste do sentir');
    this.el.innerHTML = `
      <header><h2>Bancada de ajuste</h2>
        <button type="button" class="secundario recolher" aria-pressed="false" title="Mostrar só o controle que está mexendo">Recolher</button>
        <button type="button" class="fechar" aria-label="Fechar a bancada">✕</button></header>
      <p class="nota">Mexa e sinta na hora. Quando gostar, toque em "Copiar ajuste" e mande o texto.</p>
      <div class="controles"></div>
      <div class="acoes">
        <button type="button" class="secundario restaurar">Restaurar padrão</button>
        <button type="button" class="copiar">Copiar ajuste</button>
      </div>
      <textarea class="texto" readonly rows="3" aria-label="Texto do ajuste" hidden></textarea>
      <p class="aviso-copia" role="status"></p>`;
    this.controles = this.el.querySelector('.controles');
    this.linhas = FAIXAS_AJUSTE.map((f) => this.criarControle(f));
    this.el.querySelector('.fechar').addEventListener('click', () => this.alternar(false));
    this.botaoRecolher = this.el.querySelector('.recolher');
    this.botaoRecolher.addEventListener('click', () => this.recolher());
    this.marcarAtivo(this.linhas[0]);
    this.el.querySelector('.restaurar').addEventListener('click', () => this.restaurar());
    this.el.querySelector('.copiar').addEventListener('click', () => this.copiar());
    raiz.append(this.botaoAbrir, this.el);
    // Em tela baixa ou estreita a bancada aberta cobre metade da arena: começa recolhida.
    if (window.matchMedia('(max-height: 520px), (max-width: 400px)').matches) this.recolher(true);
    this.sincronizar();
  }

  criarControle(f) {
    const id = `ajuste-${f.chave}`;
    const linha = document.createElement('div');
    linha.className = 'controle';
    linha.innerHTML = `<label for="${id}">${f.rotulo}<output></output></label>
      <input id="${id}" type="range" min="${f.min}" max="${f.max}" step="${f.passo}">`;
    const entrada = linha.querySelector('input');
    const saida = linha.querySelector('output');
    const ref = { f, entrada, saida, linha };
    entrada.addEventListener('focus', () => this.marcarAtivo(ref));
    entrada.addEventListener('input', () => {
      this.marcarAtivo(ref);
      this.jogo.ajuste[f.chave] = Number(entrada.value);
      saida.textContent = formatar(f, Number(entrada.value));
      linha.classList.toggle('mudado', Number(entrada.value) !== AJUSTE_PADRAO[f.chave]);
    });
    this.controles.append(linha);
    return ref;
  }

  /** O controle mexido por último é o que fica à vista com a bancada recolhida. */
  marcarAtivo(ref) {
    if (this.ativo === ref) return;
    this.ativo?.linha.classList.remove('ativo');
    this.ativo = ref;
    ref.linha.classList.add('ativo');
  }

  /** Recolher: só o cabeçalho e o controle ativo, para sentir o jogo enquanto mexe. */
  recolher(recolhida = !this.el.classList.contains('recolhida')) {
    this.el.classList.toggle('recolhida', recolhida);
    this.botaoRecolher.textContent = recolhida ? 'Mostrar tudo' : 'Recolher';
    this.botaoRecolher.setAttribute('aria-pressed', String(recolhida));
  }

  /** Mostra nos controles os valores que estão valendo (ex.: mudados pelo gancho). */
  sincronizar() {
    for (const { f, entrada, saida, linha } of this.linhas) {
      const v = this.jogo.ajuste[f.chave];
      entrada.value = String(v);
      saida.textContent = formatar(f, v);
      linha.classList.toggle('mudado', v !== AJUSTE_PADRAO[f.chave]);
    }
  }

  /** Chamado a cada quadro: só re-sincroniza se algo mudou por fora. */
  atualizar() {
    const chave = FAIXAS_AJUSTE.map((f) => this.jogo.ajuste[f.chave]).join(',');
    if (chave !== this.chave) {
      this.chave = chave;
      this.sincronizar();
    }
  }

  restaurar() {
    Object.assign(this.jogo.ajuste, AJUSTE_PADRAO);
    this.sincronizar();
    this.avisar('Valores padrão de volta.');
  }

  async copiar() {
    const texto = textoDoAjuste(this.jogo.ajuste);
    const area = this.el.querySelector('.texto');
    area.value = texto;
    area.hidden = false;
    const nada = Object.keys(diferencasDoPadrao(this.jogo.ajuste)).length === 0;
    try {
      await navigator.clipboard.writeText(texto);
      this.avisar(nada ? 'Copiado — mas tudo ainda está no padrão.' : 'Copiado (só o que mudou)! É só colar na conversa.');
    } catch {
      // Sem permissão de área de transferência: o texto fica selecionado para copiar à mão.
      area.focus();
      area.select();
      this.avisar('Selecione e copie o texto acima.');
    }
  }

  avisar(msg) {
    this.el.querySelector('.aviso-copia').textContent = msg;
  }

  alternar(aberta = this.el.hidden) {
    this.el.hidden = !aberta;
    this.botaoAbrir.setAttribute('aria-expanded', String(aberta));
    this.op.aoFechar?.();
  }
}
