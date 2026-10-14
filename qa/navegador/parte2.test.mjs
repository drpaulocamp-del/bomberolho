// Testes de navegador da parte 2: contagem e relógio no placar, troféus,
// placar entre rodadas e taça, segundo botão no teclado (bichinho), Pinça pelo
// teclado, bancada de ajuste (?ajuste=1) e as cinco arenas carregando limpas.
// Uso: cd qa && npm run e2e

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo } from './apoio.mjs';

let servidor;
let navegador;
before(async () => {
  servidor = await subirServidor();
  navegador = await abrirNavegador();
});
after(async () => {
  await navegador?.close();
  await servidor?.fechar();
});

async function abrir(tela = TELAS.desktop, busca = '?semente=7', extras = {}) {
  const p = await novaPagina(navegador, tela, extras);
  await p.pagina.goto(servidor.url + busca);
  await esperarJogo(p.pagina);
  return p;
}

test('contagem "3, 2, 1" trava todos; o relógio do placar começa em 2:00 e desce depois do "já"', async () => {
  const { pagina, contexto, problemas } = await abrir();
  const s0 = await pagina.evaluate(() => { const b = window.__bomberolho; b.setTimeScale(0); return b.state; });
  assert.equal(s0.fase, 'contagem');
  assert.equal(s0.contagem, 3);
  assert.match(await pagina.textContent('#barra .tempo'), /2:00/);
  await pagina.keyboard.down('ArrowDown');
  const s1 = await pagina.evaluate(() => window.__bomberolho.step(120));
  assert.equal(s1.jogadores[0].y, 1.5, 'ninguém anda na contagem');
  await pagina.keyboard.up('ArrowDown');
  const s2 = await pagina.evaluate(() => {
    const b = window.__bomberolho;
    for (const id of [0, 1, 2, 3]) b.input(id, {}); // todos parados: a rodada não acaba antes
    return b.step(60 + 61 * 60);
  });
  assert.equal(s2.fase, 'jogando');
  assert.ok(s2.relogio < 60, `relógio ${s2.relogio}`);
  assert.match(await pagina.textContent('#barra .tempo'), /0:5\d/);
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('fim de rodada: placar entre rodadas com troféus, Enter pula para a próxima, e a taça no fim', async () => {
  const { pagina, contexto, problemas } = await abrir(TELAS.desktop, '?semente=12&demo=1&rodadas=2');
  const intervalo = await pagina.evaluate(() => {
    const b = window.__bomberolho;
    b.setTimeScale(0);
    for (let k = 0; k < 400 && b.state.tela !== 'intervalo'; k++) b.step(60);
    return b.state;
  });
  assert.equal(intervalo.tela, 'intervalo');
  assert.equal(await pagina.isVisible('#aviso'), true);
  assert.match(await pagina.textContent('#aviso h2'), /rodada|Empate/);
  assert.match(await pagina.textContent('#aviso p'), /Próxima rodada em \d/);
  assert.equal(await pagina.locator('#aviso .placar-trofeus li').count(), 4);
  const ganhos = intervalo.partida.vitorias.reduce((a, b) => a + b, 0);
  assert.equal(await pagina.locator('#placar .trofeus i.ganho').count(), ganhos, 'troféus no placar lateral');
  await pagina.keyboard.press('Enter');
  const nova = await pagina.evaluate(() => window.__bomberolho.state);
  assert.equal(nova.rodada, 2);
  assert.equal(nova.fase, 'contagem');
  const fim = await pagina.evaluate(() => {
    const b = window.__bomberolho;
    for (let k = 0; k < 2000 && b.state.tela !== 'resultado'; k++) b.step(60);
    return b.state;
  });
  assert.equal(fim.tela, 'resultado');
  assert.match(await pagina.textContent('#aviso h2'), /taça|empatada/);
  assert.deepEqual(problemas, []);
  await contexto.close();
});

test('teclado: Shift usa o bichinho (Saltinho pula), e o gancho aceita o campo acao', async () => {
  const { pagina, contexto } = await abrir();
  await pagina.evaluate(() => {
    const b = window.__bomberolho;
    b.start({ semente: 7, contagem: false });
    b.setTimeScale(0);
    for (const id of [1, 2, 3]) b.input(id, {});
    let s = b.state;
    while (b.state.jogadores[0].montaria !== 'saltinho') { b.darItem(0, 'estojo'); s = b.state; }
    return s;
  });
  // Vai até a casa (2,1), de frente para o bloco (3,1), com (4,1) livre (semente 7).
  await pagina.keyboard.down('ArrowRight');
  await pagina.evaluate(() => window.__bomberolho.step(18));
  await pagina.keyboard.up('ArrowRight');
  await pagina.evaluate(() => window.__bomberolho.step(2));
  await pagina.keyboard.down('ShiftLeft');
  const noAr = await pagina.evaluate(() => window.__bomberolho.step(1).jogadores[0].noAr);
  await pagina.keyboard.up('ShiftLeft');
  assert.equal(noAr, true, 'pulou com Shift');
  const pouso = await pagina.evaluate(() => window.__bomberolho.step(30).jogadores[0]);
  assert.deepEqual([pouso.col, pouso.lin], [4, 1], 'por cima do bloco, na casa livre seguinte');
  const r = await pagina.evaluate(() => window.__bomberolho.input(2, { acao: true }));
  assert.equal(r.acao, true);
  await contexto.close();
});

test('teclado: com a Pinça, Espaço solta a gota, segurar levanta e soltar arremessa', async () => {
  const { pagina, contexto } = await abrir();
  await pagina.evaluate(() => {
    const b = window.__bomberolho;
    b.start({ semente: 7, contagem: false });
    b.setTimeScale(0);
    for (const id of [1, 2, 3]) b.input(id, {});
    b.darItem(0, 'pinca');
  });
  await pagina.keyboard.down('ArrowDown');
  await pagina.evaluate(() => window.__bomberolho.step(1));
  await pagina.keyboard.up('ArrowDown');
  await pagina.evaluate(() => window.__bomberolho.step(1));
  await pagina.keyboard.press('Space');
  await pagina.evaluate(() => window.__bomberolho.step(2));
  await pagina.keyboard.down('Space');
  const mao = await pagina.evaluate(() => window.__bomberolho.step(2).gotas[0].estado);
  await pagina.keyboard.up('Space');
  const voo = await pagina.evaluate(() => window.__bomberolho.step(1).gotas[0]);
  assert.equal(mao, 'mao');
  assert.equal(voo.estado, 'voo');
  assert.equal(voo.destino.col, 1);
  await contexto.close();
});

test('sem ?ajuste=1 a bancada não existe nem é baixada', async () => {
  const { pagina, contexto } = await abrir();
  const pedidos = [];
  pagina.on('request', (r) => pedidos.push(r.url()));
  await pagina.reload();
  await esperarJogo(pagina);
  await pagina.waitForTimeout(400);
  assert.equal(await pagina.locator('.bancada').count(), 0);
  assert.ok(!pedidos.some((u) => /bancada/.test(u)), 'bancada.js e bancada.css não foram pedidos');
  await contexto.close();
});

for (const [nome, tela] of [['desktop', TELAS.desktop], ['retrato', TELAS.retrato], ['paisagem', TELAS.paisagem]]) {
  test(`bancada ?ajuste=1 em ${nome}: muda na hora, restaura, copia, fecha com um toque e não cobre a arena`, async () => {
    const { pagina, contexto, problemas } = await abrir(tela, '?semente=7&ajuste=1', { contexto: { permissions: ['clipboard-read', 'clipboard-write'] } });
    await pagina.waitForSelector('.bancada input[type=range]');
    const n = await pagina.locator('.bancada input[type=range]').count();
    assert.ok(n >= 10, `${n} controles`);
    const pavio = pagina.locator('#ajuste-pavio');
    await pavio.fill('120');
    assert.equal(await pagina.evaluate(() => window.__bomberolho.state.ajuste.pavio), 120, 'efeito imediato');
    const velocidade = pagina.locator('#ajuste-velocidadeBase');
    await velocidade.focus();
    await pagina.keyboard.press('ArrowRight');
    assert.equal(await pagina.evaluate(() => window.__bomberolho.state.ajuste.velocidadeBase), 56, 'setas mexem no controle, não no boneco');
    await pagina.click('.bancada .copiar');
    const texto = await pagina.inputValue('.bancada .texto');
    assert.deepEqual(JSON.parse(texto).bomberolhoAjuste, { pavio: 120, velocidadeBase: 56 }, 'só o que mudou');
    // Recolher: fica só o controle mexido por último, e a bancada encolhe.
    const alturaAberta = (await pagina.locator('.bancada').boundingBox()).height;
    await pagina.click('.bancada .recolher');
    const visiveis = await pagina.locator('.bancada .controle:visible').count();
    assert.equal(visiveis, 1, 'recolhida: um controle à vista');
    assert.equal(await pagina.locator('.bancada .controle.ativo input').getAttribute('id'), 'ajuste-velocidadeBase');
    const alturaRecolhida = (await pagina.locator('.bancada').boundingBox()).height;
    assert.ok(alturaRecolhida < alturaAberta * 0.7, `encolheu de ${alturaAberta} para ${alturaRecolhida}px`);
    await pagina.click('.bancada .recolher');
    assert.ok(await pagina.locator('.bancada .controle:visible').count() >= 10);
    await pagina.click('.bancada .restaurar');
    assert.equal(await pagina.evaluate(() => window.__bomberolho.state.ajuste.pavio), 165);
    // Alvos de toque e cobertura da arena.
    const medidas = await pagina.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const arena = r('#arena');
      const painel = r('.bancada');
      const sx = Math.max(0, Math.min(arena.right, painel.right) - Math.max(arena.left, painel.left));
      const sy = Math.max(0, Math.min(arena.bottom, painel.bottom) - Math.max(arena.top, painel.top));
      const botoes = [...document.querySelectorAll('.bancada button, .bancada input, .bancada-abrir')].map((b) => b.getBoundingClientRect().height);
      return { cobre: (sx * sy) / (arena.width * arena.height), menor: Math.min(...botoes) };
    });
    assert.ok(medidas.cobre < 0.75, `cobre ${Math.round(medidas.cobre * 100)}% da arena`);
    assert.ok(medidas.menor >= 44, `alvo de ${medidas.menor}px`);
    await pagina.click('.bancada .fechar');
    assert.equal(await pagina.isVisible('.bancada'), false);
    await pagina.click('.bancada-abrir');
    assert.equal(await pagina.isVisible('.bancada'), true);
    assert.deepEqual(problemas, []);
    await contexto.close();
  });
}

for (const arena of ['jardim', 'lago', 'caverna', 'vale', 'consultorio']) {
  test(`arena ${arena}: carrega limpa em 360×640 e roda uma partida inteira sem erro`, async () => {
    const { pagina, contexto, problemas } = await abrir(TELAS.pequeno, `?semente=3&demo=1&dificuldade=medio&arena=${arena}&rodadas=1`);
    const s = await pagina.evaluate(() => {
      const b = window.__bomberolho;
      b.setTimeScale(0);
      for (let k = 0; k < 1000 && b.state.tela !== 'resultado'; k++) b.step(60);
      return b.state;
    });
    assert.equal(s.arena, arena);
    assert.equal(s.tela, 'resultado');
    const rola = await pagina.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight);
    assert.equal(rola, false);
    assert.deepEqual(problemas, []);
    await contexto.close();
  });
}
