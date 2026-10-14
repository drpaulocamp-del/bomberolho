// Parte 2 — bancada de ajuste: parâmetros num lugar só, efeito imediato na
// partida, determinismo por configuração; e as melhorias M1 (janela para
// virar a esquina) e M2 (toque rápido nas setas) do parecer da parte 1.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { mapa, passo, avancar, e, centro, posicionar, criarMundo, K } from './ajuda.mjs';
import { AJUSTE_PADRAO, FAIXAS_AJUSTE, criarAjuste, diferencasDoPadrao } from '../../bomberolho/js/sim/ajustes.js';
import { impressaoDigital } from '../../bomberolho/js/sim/retrato.js';
import { criarTeclado } from '../../bomberolho/js/input/teclado.js';
import { textoDoAjuste } from '../../bomberolho/js/ui/bancada.js';
import { Jogo } from '../../bomberolho/js/jogo.js';

const CORREDOR = ['#########', '#1......#', '#.#.#.#.#', '#.......#', '#########'];

test('a bancada cobre tudo o que o plano pede, com faixas válidas que incluem o padrão', () => {
  const chaves = FAIXAS_AJUSTE.map((f) => f.chave);
  for (const k of ['velocidadeBase', 'velocidadePasso', 'pavio', 'duracaoRespingo', 'toleranciaQuina', 'velocidadeChute', 'inicioAperto',
    'distanciaPinca', 'invulneravel', 'velocidadeDisparada']) assert.ok(chaves.includes(k), k);
  for (const f of FAIXAS_AJUSTE) {
    assert.ok(f.min <= AJUSTE_PADRAO[f.chave] && AJUSTE_PADRAO[f.chave] <= f.max, f.chave);
    assert.ok(f.rotulo.length > 4 && f.unidade);
  }
});

test('sem números mágicos de sentir espalhados: a simulação lê m.ajuste', () => {
  const pasta = new URL('../../bomberolho/js/sim/', import.meta.url);
  for (const nome of readdirSync(pasta)) {
    if (nome === 'ajustes.js' || nome === 'constantes.js') continue;
    const codigo = readFileSync(new URL(nome, pasta), 'utf8');
    assert.doesNotMatch(codigo, /\b(PAVIO|DURACAO_RESPINGO|VELOCIDADE_BASE|VELOCIDADE_PASSO)\b/, nome);
  }
});

test('criarAjuste aceita só chaves conhecidas e números; "Copiar ajuste" gera JSON curto e relível', () => {
  const aj = criarAjuste({ pavio: 150, inventado: 3, velocidadeBase: 'abc' });
  assert.equal(aj.pavio, 150);
  assert.equal(aj.inventado, undefined);
  assert.equal(aj.velocidadeBase, AJUSTE_PADRAO.velocidadeBase);
  assert.deepEqual(diferencasDoPadrao(aj), { pavio: 150 });
  const texto = textoDoAjuste(aj);
  assert.ok(texto.length < 400, 'texto curto');
  const lido = JSON.parse(texto).bomberolhoAjuste;
  assert.deepEqual(lido, { pavio: 150 }, 'copia só o que mudou (M8)');
  assert.equal(textoDoAjuste(criarAjuste()), '{"bomberolhoAjuste":{}}');
  assert.deepEqual(criarAjuste(lido), aj);
});

test('efeito imediato: mudar o ajuste no meio da partida muda o próximo tick', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  passo(m, [e('dir')]);
  m.ajuste.velocidadeBase = 70;
  passo(m, [e('dir')]);
  assert.equal(j.x, centro(1) + 55 + 70);
  m.ajuste.pavio = 100;
  m.ajuste.duracaoRespingo = 12;
  passo(m, [e('bomba')]);
  assert.equal(m.gotas[0].pavioTotal, 100, 'gota nova com o pavio novo');
  avancar(m, 99, []);
  assert.equal(m.respingos[0].duracao, 12, 'respingo com a duração nova');
});

test('o controlador compartilha o ajuste com cada rodada nova (vale até o fim da partida)', () => {
  const jogo = new Jogo().iniciar({ semente: 2, contagem: false });
  jogo.ajuste.pavio = 120;
  assert.equal(jogo.mundo.ajuste.pavio, 120);
  jogo.partida.rodada = 2;
  jogo.novaRodada();
  assert.equal(jogo.mundo.ajuste.pavio, 120);
});

test('determinismo por configuração: mesmo ajuste + mesma semente = mesmo resultado; ajuste diferente muda', () => {
  const rodar = (mud) => {
    const m = criarMundo({ semente: 9, ajuste: criarAjuste(mud), duracao: 7200 });
    for (let t = 0; t < 900; t++) passo(m, m.jogadores.map((_, k) => e(['dir', 'baixo', 'esq', 'cima'][(t >> 5) % 4], t % 97 === k ? 'bomba' : 'acao')));
    return impressaoDigital(m);
  };
  assert.equal(rodar({ pavio: 140 }), rodar({ pavio: 140 }));
  assert.notEqual(rodar({ pavio: 140 }), rodar({}));
});

test('tolerância do deslize de quina: com 0 não escorrega; com o padrão escorrega até meia casa', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  m.ajuste.toleranciaQuina = 0;
  posicionar(m, 0, centro(2) + 300, centro(1));
  avancar(m, 20, [e('baixo')]);
  assert.equal(j.x, centro(2) + 300, 'sem tolerância: engancha');
  m.ajuste.toleranciaQuina = 500;
  avancar(m, 40, [e('baixo')]);
  assert.equal(j.x, centro(3));
});

test('M1: rolar as teclas (→ e depois ↓) logo depois de passar da esquina ainda pega a esquina', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  posicionar(m, 0, centro(3) + 100, centro(1)); // passou 0,1 casa da abertura (3,2)
  j.dir = 'dir';
  passo(m, [e('dir')]); // ainda só →
  let t = 0;
  for (; t < 60 && j.y <= centro(2); t++) passo(m, [e('dir', 'baixo')]);
  assert.ok(t <= 24, `desceu em ${t} ticks`);
  assert.equal(j.x, centro(3), 'pela coluna 3');
});

test('M1: diagonal segurada desde o começo continua em escadinha (sem ir e voltar)', () => {
  const m = mapa(...CORREDOR);
  const j = m.jogadores[0];
  let voltas = 0;
  let antes = j.x;
  for (let t = 0; t < 400; t++) {
    passo(m, [e('dir', 'baixo')]);
    if (j.x < antes) voltas++;
    antes = j.x;
  }
  assert.equal(voltas, 0);
});

test('M2: uma seta apertada e solta entre dois ticks não se perde; Shift/E/K são o botão do bichinho', () => {
  const alvo = new EventTarget();
  const tec = criarTeclado(alvo);
  const tecla = (tipo, code, extra = {}) => {
    const ev = new Event(tipo, { cancelable: true });
    Object.assign(ev, { code, repeat: false, ...extra });
    alvo.dispatchEvent(ev);
    return ev;
  };
  tecla('keydown', 'ArrowLeft');
  tecla('keyup', 'ArrowLeft');
  assert.equal(tec.ler().esq, true, 'toque rápido entregue por 1 tick');
  assert.equal(tec.ler().esq, false);
  for (const code of ['ShiftLeft', 'KeyE', 'KeyK']) {
    const ev = tecla('keydown', code);
    assert.equal(ev.defaultPrevented, true);
    assert.equal(tec.ler().acao, true, code);
    tecla('keyup', code);
    tec.ler();
  }
  assert.equal(tec.ler().acao, false);
});
