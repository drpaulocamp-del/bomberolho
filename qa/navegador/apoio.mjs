// Apoio aos testes de navegador: sobe o dev-server numa porta livre, abre o
// Chromium e registra todo erro/aviso de console e toda resposta ≥ 400.

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

export const TELAS = Object.freeze({
  desktop: { width: 1280, height: 720 },
  retrato: { width: 390, height: 844 },
  paisagem: { width: 844, height: 390 },
  pequeno: { width: 360, height: 640 },
});

function portaLivre() {
  return new Promise((ok, falha) => {
    const s = createServer();
    s.unref();
    s.on('error', falha);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => ok(port));
    });
  });
}

export async function subirServidor() {
  const porta = await portaLivre();
  const processo = spawn(process.execPath, ['dev-server.mjs', '--port', String(porta), '--host', '127.0.0.1'], {
    cwd: RAIZ,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('dev-server não respondeu')), 8000);
    processo.stdout.on('data', (d) => { if (String(d).includes('rodando')) { clearTimeout(t); ok(); } });
    processo.on('exit', (c) => { clearTimeout(t); falha(new Error(`dev-server saiu (${c})`)); });
  });
  return {
    url: `http://127.0.0.1:${porta}/bomberolho/`,
    fechar: () => new Promise((ok) => { processo.once('exit', ok); processo.kill('SIGTERM'); }),
  };
}

export async function abrirNavegador() {
  const opcoes = {};
  // Usa o Chromium já instalado no ambiente se a versão do pacote não achar o seu.
  const local = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  if (!existsSync(chromium.executablePath()) && existsSync(local)) opcoes.executablePath = local;
  return chromium.launch(opcoes);
}

/** Nova página com coleta de problemas (console, erros, 404). */
export async function novaPagina(navegador, tela, extras = {}) {
  const contexto = await navegador.newContext({ viewport: tela, deviceScaleFactor: extras.dpr || 1, ...extras.contexto });
  const pagina = await contexto.newPage();
  const problemas = [];
  pagina.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problemas.push(`console.${m.type()}: ${m.text()}`);
  });
  pagina.on('pageerror', (e) => problemas.push(`pageerror: ${e.message}`));
  pagina.on('response', (r) => { if (r.status() >= 400) problemas.push(`HTTP ${r.status()}: ${r.url()}`); });
  pagina.on('requestfailed', (r) => problemas.push(`falhou: ${r.url()}`));
  return { pagina, contexto, problemas };
}

export async function esperarJogo(pagina) {
  await pagina.waitForFunction(() => window.__bomberolho && window.__bomberolho.state.tela !== 'carregando');
}

/**
 * Dedos na tela por CDP (eventos de toque de verdade: o navegador gera
 * pointerdown/move/up com pointerType "touch"). `pontos` = [[x, y], ...] em
 * px CSS, um por dedo, na ordem dos ids; 'touchEnd' com a lista dos dedos que
 * continuam na tela (vazia = todos saíram).
 */
export async function dedo(cdp, tipo, pontos = []) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: tipo,
    touchPoints: pontos.map((p, k) => {
      const [x, y, id = k] = p;
      return { x, y, id, radiusX: 8, radiusY: 8, force: 1 };
    }),
  });
}
