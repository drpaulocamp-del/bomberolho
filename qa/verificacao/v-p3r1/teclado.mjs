// Verificador P3R1: só teclado, em tempo real. Menu inteiro por teclas
// (Enter, setas, Esc) e depois uma partida curta jogada com setas + Espaço
// em cada arena, com P (pausa) e Esc. Uso: cd qa && node verificacao/v-p3r1/teclado.mjs
import { fileURLToPath } from 'node:url';
import { TELAS, subirServidor, abrirNavegador, novaPagina, esperarJogo } from '../../navegador/apoio.mjs';

const PASTA = fileURLToPath(new URL('../../capturas/v-p3r1/', import.meta.url));
const servidor = await subirServidor();
const navegador = await abrirNavegador();
const log = [];
const st = (pg) => pg.evaluate(() => { const s = window.__bomberolho.state; return { tela: s.tela, menu: s.menu, arena: s.arena, foco: document.activeElement?.className + ':' + (document.activeElement?.textContent || '').trim().slice(0, 18) }; });
try {
  const { pagina: pg, contexto, problemas } = await novaPagina(navegador, TELAS.desktop, { dpr: 1 });
  await pg.goto(servidor.url);
  await esperarJogo(pg);
  await pg.waitForTimeout(600);
  log.push(['abriu', await st(pg)]);
  await pg.keyboard.press('Enter');
  await pg.waitForTimeout(300);
  log.push(['enter', await st(pg)]);
  await pg.keyboard.press('ArrowRight'); await pg.keyboard.press('ArrowRight');
  log.push(['setas personagem', await st(pg)]);
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(200);
  log.push(['esc', await st(pg)]);
  await pg.keyboard.press('Enter');
  await pg.waitForTimeout(300);
  // Tab até "Próximo"
  for (let i = 0; i < 12; i++) {
    const f = await pg.evaluate(() => document.activeElement?.dataset.acao);
    if (f === 'proximo') break;
    await pg.keyboard.press('Tab');
  }
  log.push(['tab até próximo', await st(pg)]);
  await pg.keyboard.press('Enter');
  await pg.waitForTimeout(300);
  log.push(['arena', await st(pg)]);
  await pg.keyboard.press('Enter');
  await pg.waitForTimeout(300);
  log.push(['começou', await st(pg)]);
  await contexto.close();
  problemas.length && log.push(['problemas menu', problemas]);

  for (const arena of ['jardim', 'lago', 'caverna', 'vale', 'consultorio']) {
    const p = await novaPagina(navegador, TELAS.desktop, { dpr: 1 });
    await p.pagina.goto(`${servidor.url}?arena=${arena}&dificuldade=facil`);
    await esperarJogo(p.pagina);
    await p.pagina.waitForTimeout(3300); // contagem
    const teclas = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
    for (let k = 0; k < 24; k++) {
      const t = teclas[k % 4];
      await p.pagina.keyboard.down(t);
      await p.pagina.waitForTimeout(250);
      if (k % 5 === 0) { await p.pagina.keyboard.press('Space'); }
      await p.pagina.keyboard.up(t);
      if (k === 12) { await p.pagina.screenshot({ path: `${PASTA}t-${arena}.png` }); }
    }
    await p.pagina.keyboard.press('KeyP');
    const pausa = await st(p.pagina);
    await p.pagina.keyboard.press('Enter');
    const volta = await st(p.pagina);
    log.push([arena, { pausa: pausa.tela, volta: volta.tela, rolou: await p.pagina.evaluate(() => scrollY), problemas: p.problemas }]);
    await p.contexto.close();
  }
} finally {
  await navegador.close();
  await servidor.fechar();
}
console.log(JSON.stringify(log, null, 1));
