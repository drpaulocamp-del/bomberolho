// Desenho das criaturinhas-olho: o corpo é um olho (esclera branca com
// pálpebra na cor do personagem, íris e pupila que olham para onde ele anda),
// com boquinha, bochechas, sobrancelha, bracinhos, pezinhos e um acessório de
// forma própria. Tudo em vetor, nítido em qualquer tamanho.
//
// Expressões (o.expressao):
//  normal  — olhar tranquilo, sorrisinho;
//  susto   — arregala (pálpebra sobe, pupila encolhe, boca em "o");
//  alegre  — aperta os olhos de alegria (olho em arco "^"), boca aberta;
//  esforco — olho meio fechado e decidido (soltou ou chutou a gota);
//  molhado — encharcado: olho bem apertado, boca ondulada, pingos;
//  sono    — olho fechado e relaxado (indo descansar).

const TAU = Math.PI * 2;

const OLHAR = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] };
// Todas as animações de "parado" repetem a cada 2π/2,2 s (respiração); andar, a cada 2π/14 s.
const CICLO_PARADO = TAU / 2.2;
const CICLO_ANDANDO = TAU / 14;
const QUADROS_PARADO = 16;
const QUADROS_ANDANDO = 8;
const LIMITE_CACHE = 520;
const cache = new Map();

/**
 * Mesmo desenho, mas guardado em quadros prontos (canvas fora da tela): a
 * animação é cíclica, então cada pose é desenhada uma vez e depois só copiada.
 * Poupa muito no celular de entrada. Encharcado e transições usam o desenho direto.
 * @param {number} dpr densidade de pixels do canvas de destino
 */
export function desenharPersonagemRapido(ctx, p, o, dpr = 1) {
  if (o.molhado) {
    desenharPersonagem(ctx, p, o);
    return;
  }
  const andando = !!o.andando;
  const ciclo = andando ? CICLO_ANDANDO : CICLO_PARADO;
  const quadros = andando ? QUADROS_ANDANDO : QUADROS_PARADO;
  const fase = ((o.fase || 0) % ciclo + ciclo) % ciclo;
  const k = Math.floor((fase / ciclo) * quadros) % quadros;
  const s = o.s;
  const chave = `${p.id}|${o.expressao || 'normal'}|${o.dir}|${andando ? 1 : 0}|${k}|${o.piscar ? 1 : 0}|${o.bracos || ''}|${o.sombra === false ? 0 : 1}|${Math.round(s * dpr * 4)}`;
  let quadro = cache.get(chave);
  if (quadro) {
    // Usado agora: vai para o fim da fila (os menos usados saem primeiro).
    cache.delete(chave);
    cache.set(chave, quadro);
  } else {
    const w = s * 1.5;
    const h = s * 1.5;
    quadro = document.createElement('canvas');
    quadro.width = Math.ceil(w * dpr);
    quadro.height = Math.ceil(h * dpr);
    const c = quadro.getContext('2d');
    c.scale(dpr, dpr);
    desenharPersonagem(c, p, { ...o, x: w / 2, y: s * 0.95, fase: (k / quadros) * ciclo, alfa: 1 });
    if (cache.size >= LIMITE_CACHE) {
      for (const velha of [...cache.keys()].slice(0, 80)) cache.delete(velha);
    }
    cache.set(chave, quadro);
  }
  const alfa = o.alfa ?? 1;
  if (alfa !== 1) {
    ctx.save();
    ctx.globalAlpha *= alfa;
  }
  ctx.drawImage(quadro, o.x - s * 0.75, o.y - s * 0.95, s * 1.5, s * 1.5);
  if (alfa !== 1) ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} p  definição (js/dados/personagens.js)
 * @param {object} o  { x, y (centro da casa, px), s (casa, px), dir, andando,
 *   fase (s), piscar (0..1), molhado (0..1), alfa, expressao, bracos
 *   ('repouso' | 'cima' | 'aceno'), sombra (false = sem sombra) }
 */
export function desenharPersonagem(ctx, p, o) {
  const { s } = o;
  const fase = o.fase || 0;
  const molhado = o.molhado || 0;
  const expr = molhado > 0 ? 'molhado' : (o.expressao || 'normal');
  const passo = o.andando ? Math.sin(fase * 14) : 0;
  const balanco = o.andando ? Math.abs(Math.sin(fase * 14)) * s * 0.045 : Math.sin(fase * 2.2) * s * 0.012;
  // Respiração: estica e achata de leve (parado) ou quica (andando).
  const estica = o.andando ? 1 + Math.sin(fase * 28) * 0.025 : 1 + Math.sin(fase * 2.2) * 0.018;
  const [fx, fy] = p.corpo || [1, 1];
  const R = s * 0.39;
  const rx = R * fx / Math.sqrt(estica);
  const ry = R * fy * estica;
  const cx = o.x;
  const base = o.y + s * 0.31; // linha dos pés
  const cy = base - ry - s * 0.08 - balanco + molhado * s * 0.05;
  const [ox, oy] = OLHAR[o.dir] || OLHAR.baixo;

  ctx.save();
  ctx.globalAlpha = o.alfa ?? 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (o.sombra !== false) {
    ctx.fillStyle = 'rgba(30, 40, 70, 0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, o.y + s * 0.37, s * (0.28 - balanco / s), s * 0.08, 0, 0, TAU);
    ctx.fill();
  }

  // Pezinhos (alternam ao andar).
  for (const lado of [-1, 1]) {
    const elev = o.andando ? Math.max(0, passo * lado) * s * 0.07 : 0;
    const px = cx + lado * s * 0.15;
    const py = base + s * 0.02 - elev;
    ctx.fillStyle = p.escura;
    ctx.beginPath();
    ctx.ellipse(px, py, s * 0.105, s * 0.068, lado * 0.15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(px - s * 0.025, py - s * 0.025, s * 0.04, s * 0.018, 0, 0, TAU);
    ctx.fill();
  }

  desenharBracos(ctx, p, o, cx, cy, rx, ry, s, passo, fase);

  // Corpo-olho: esclera com volume.
  const esclera = ctx.createRadialGradient(cx - rx * 0.35, cy - ry * 0.4, R * 0.1, cx, cy, Math.max(rx, ry));
  esclera.addColorStop(0, '#FFFFFF');
  esclera.addColorStop(0.72, '#F4F6FB');
  esclera.addColorStop(1, '#D9E1EC');
  ctx.fillStyle = esclera;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.clip();

  // Rubor rosado nas bochechas, na parte de baixo.
  ctx.fillStyle = 'rgba(255, 120, 150, 0.28)';
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + lado * rx * 0.62, cy + ry * 0.5, rx * 0.17, ry * 0.1, 0, 0, TAU);
    ctx.fill();
  }

  // Íris e pupila, deslocadas para onde o personagem olha.
  const ir = R * (p.estilo === 'topete' ? 0.5 : 0.47);
  const ix = cx + ox * rx * 0.2;
  const iy = cy + ry * 0.02 + oy * ry * 0.13;
  const pupila = expr === 'susto' ? 0.55 : 1;
  desenharIris(ctx, p, ix, iy, ir, pupila, fase);

  desenharPalpebra(ctx, p, expr, o.piscar || 0, cx, cy, rx, ry, s);

  desenharBoca(ctx, p, expr, cx, cy + ry * 0.66, s, fase);

  if (molhado > 0) {
    ctx.fillStyle = `rgba(90, 180, 255, ${0.3 * molhado})`;
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
  }
  ctx.restore();

  // Contorno do corpo e brilho.
  ctx.strokeStyle = p.escura;
  ctx.lineWidth = s * 0.042;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.5, cy - ry * 0.62, rx * 0.15, ry * 0.08, -0.6, 0, TAU);
  ctx.fill();

  desenharSobrancelha(ctx, p, expr, cx, cy, rx, ry, s);
  desenharAcessorio(ctx, p, cx, cy, rx, ry, s, fase);

  if (molhado > 0) desenharPingos(ctx, cx, cy, R, molhado, fase);
  ctx.restore();
}

function desenharBracos(ctx, p, o, cx, cy, rx, ry, s, passo, fase) {
  const pose = o.bracos || 'repouso';
  for (const lado of [-1, 1]) {
    // Ângulo a partir do ombro (0 = para fora, positivo = para baixo).
    let ang;
    if (pose === 'cima') ang = -1.05 + Math.sin(fase * 11 + lado) * 0.25;
    else if (pose === 'aceno' && lado === 1) ang = -1.2 + Math.sin(fase * 8.8) * 0.45;
    else if (o.molhado > 0) ang = 1.25;
    else ang = 0.75 + (o.andando ? passo * lado * 0.45 : Math.sin(fase * 2.2) * 0.06);
    const ombroX = cx + lado * rx * 0.9;
    const ombroY = cy + ry * 0.18;
    const comp = s * 0.15;
    const mx = ombroX + lado * Math.cos(ang) * comp;
    const my = ombroY + Math.sin(ang) * comp;
    ctx.strokeStyle = p.escura;
    ctx.lineWidth = s * 0.075;
    ctx.beginPath();
    ctx.moveTo(ombroX, ombroY);
    ctx.lineTo(mx, my);
    ctx.stroke();
    ctx.strokeStyle = p.cor;
    ctx.lineWidth = s * 0.045;
    ctx.beginPath();
    ctx.moveTo(ombroX, ombroY);
    ctx.lineTo(mx, my);
    ctx.stroke();
    ctx.fillStyle = p.cor;
    ctx.strokeStyle = p.escura;
    ctx.lineWidth = s * 0.025;
    ctx.beginPath();
    ctx.arc(mx, my, s * 0.058, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}

function desenharIris(ctx, p, ix, iy, ir, pupila, fase) {
  const g = ctx.createRadialGradient(ix, iy - ir * 0.2, ir * 0.15, ix, iy, ir);
  g.addColorStop(0, p.iris);
  g.addColorStop(1, p.irisEscura);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ix, iy, ir, 0, TAU);
  ctx.fill();

  // Desenho da íris: cada um tem o seu (também ajuda daltônicos).
  ctx.strokeStyle = 'rgba(255,255,255,0.32)';
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = ir * 0.08;
  switch (p.estilo) {
    case 'flor': // pétalas
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        ctx.beginPath();
        ctx.ellipse(ix + Math.cos(a) * ir * 0.68, iy + Math.sin(a) * ir * 0.68, ir * 0.2, ir * 0.11, a, 0, TAU);
        ctx.fill();
      }
      break;
    case 'faixa': // anéis de foco
      for (const r of [0.66, 0.84]) {
        ctx.beginPath();
        ctx.arc(ix, iy, ir * r, 0, TAU);
        ctx.stroke();
      }
      break;
    case 'broto': // pontinhos em volta da pupila
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU + 0.3;
        ctx.beginPath();
        ctx.arc(ix + Math.cos(a) * ir * 0.72, iy + Math.sin(a) * ir * 0.72, ir * 0.07, 0, TAU);
        ctx.fill();
      }
      break;
    default: // raios
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU;
        ctx.beginPath();
        ctx.moveTo(ix + Math.cos(a) * ir * 0.5, iy + Math.sin(a) * ir * 0.5);
        ctx.lineTo(ix + Math.cos(a) * ir * 0.88, iy + Math.sin(a) * ir * 0.88);
        ctx.stroke();
      }
  }
  ctx.strokeStyle = p.escura;
  ctx.lineWidth = ir * 0.1;
  ctx.beginPath();
  ctx.arc(ix, iy, ir, 0, TAU);
  ctx.stroke();

  // Pupila: o Pupilo tem a maior; a Cílio, em coração.
  const pr = ir * (p.estilo === 'topete' ? 0.6 : 0.42) * pupila;
  ctx.fillStyle = '#15171C';
  if (p.estilo === 'laco') coracao(ctx, ix, iy + pr * 0.1, pr * 1.15);
  else {
    ctx.beginPath();
    ctx.arc(ix, iy, pr, 0, TAU);
    ctx.fill();
  }
  // Brilhos (a Córnea tem um brilho em estrela, que pisca).
  ctx.fillStyle = '#FFFFFF';
  if (p.estilo === 'cristal') {
    estrela4(ctx, ix - ir * 0.32, iy - ir * 0.32, ir * (0.3 + Math.sin(fase * 4.4) * 0.05));
  } else {
    ctx.beginPath();
    ctx.arc(ix - ir * 0.32, iy - ir * 0.32, ir * 0.21, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(ix + ir * 0.3, iy + ir * 0.26, ir * 0.09, 0, TAU);
  ctx.fill();
}

/**
 * Pálpebra superior na cor do personagem. A borda é uma curva: para baixo
 * (normal), quase reta (decidido) ou em arco para cima (alegre, olho "^").
 */
function desenharPalpebra(ctx, p, expr, piscar, cx, cy, rx, ry, s) {
  let borda; // altura das pontas da borda
  let curva; // quanto o meio da borda desce (negativo: sobe)
  switch (expr) {
    case 'susto': borda = -0.7; curva = 0.3; break;
    case 'alegre': borda = 0.28; curva = -0.62; break;
    case 'esforco': borda = -0.12; curva = 0.12; break;
    case 'molhado': borda = 0.1; curva = 0.55; break;
    case 'sono': borda = 0.05; curva = 0.5; break;
    default: borda = -0.5; curva = 0.36;
  }
  if (piscar > 0 && expr !== 'alegre') {
    borda += (0.18 - borda) * piscar;
    curva += (0.45 - curva) * piscar;
  }
  const yb = cy + ry * borda;
  const yc = yb + ry * curva;
  const g = ctx.createLinearGradient(0, cy - ry, 0, Math.max(yb, yc));
  g.addColorStop(0, p.cor);
  g.addColorStop(1, misturar(p.cor, '#FFFFFF', 0.2));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - rx * 1.1, cy - ry * 1.1);
  ctx.lineTo(cx + rx * 1.1, cy - ry * 1.1);
  ctx.lineTo(cx + rx * 1.1, yb);
  ctx.quadraticCurveTo(cx, yc + (yc - yb) * 0.6, cx - rx * 1.1, yb);
  ctx.closePath();
  ctx.fill();
  if (expr === 'alegre') {
    // Olho "^": a parte de baixo também se fecha, deixando só um arco de íris.
    ctx.fillStyle = misturar(p.cor, '#FFFFFF', 0.35);
    ctx.beginPath();
    ctx.moveTo(cx - rx * 1.1, cy + ry * 1.1);
    ctx.lineTo(cx + rx * 1.1, cy + ry * 1.1);
    ctx.lineTo(cx + rx * 1.1, cy + ry * 0.42);
    ctx.quadraticCurveTo(cx, cy - ry * 0.05, cx - rx * 1.1, cy + ry * 0.42);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = p.escura;
  ctx.lineWidth = s * 0.032;
  ctx.beginPath();
  ctx.moveTo(cx - rx * 1.1, yb);
  ctx.quadraticCurveTo(cx, yc + (yc - yb) * 0.6, cx + rx * 1.1, yb);
  ctx.stroke();
  const fechado = expr === 'sono' || expr === 'molhado' || (piscar > 0.6 && expr !== 'alegre');
  if (fechado && expr !== 'molhado') {
    // Olho fechado: cilinhos na borda (lê-se "dormindo", não "capacete").
    ctx.beginPath();
    for (const k of [-1, 0, 1]) {
      const x = cx + k * rx * 0.38;
      const t = 0.5 + (k * 0.38) / 2.2; // posição na curva da borda
      const y = yb + 2 * t * (1 - t) * (yc - yb) * 1.6;
      ctx.moveTo(x, y);
      ctx.lineTo(x + k * rx * 0.1, y + ry * 0.17);
    }
    ctx.stroke();
  }
  if (expr === 'molhado') {
    // Olho apertado: dois risquinhos de "aperto" nos cantos.
    ctx.beginPath();
    for (const lado of [-1, 1]) {
      ctx.moveTo(cx + lado * rx * 0.55, cy + ry * 0.38);
      ctx.lineTo(cx + lado * rx * 0.75, cy + ry * 0.3);
    }
    ctx.stroke();
  }
}

function desenharBoca(ctx, p, expr, x, y, s, fase) {
  ctx.strokeStyle = '#3A2030';
  ctx.fillStyle = '#7A2E45';
  ctx.lineWidth = s * 0.026;
  const w = s * 0.07;
  ctx.beginPath();
  switch (expr) {
    case 'susto':
      ctx.ellipse(x, y, w * 0.45, w * 0.6, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      return;
    case 'alegre':
      ctx.moveTo(x - w, y - w * 0.3);
      ctx.quadraticCurveTo(x, y + w * 1.3, x + w, y - w * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    case 'esforco':
      ctx.moveTo(x - w * 0.6, y);
      ctx.lineTo(x + w * 0.6, y - w * 0.1);
      break;
    case 'molhado': {
      const o = Math.sin(fase * 10) * w * 0.12;
      ctx.moveTo(x - w * 0.9, y + o);
      ctx.quadraticCurveTo(x - w * 0.45, y - w * 0.4 - o, x, y);
      ctx.quadraticCurveTo(x + w * 0.45, y + w * 0.4 + o, x + w * 0.9, y - o);
      break;
    }
    case 'sono':
      ctx.ellipse(x, y, w * 0.28, w * 0.32, 0, 0, TAU);
      break;
    default:
      ctx.moveTo(x - w * 0.7, y - w * 0.15);
      ctx.quadraticCurveTo(x, y + w * 0.7, x + w * 0.7, y - w * 0.15);
  }
  ctx.stroke();
}

/** Sobrancelha na pálpebra: sobe no susto, desce no esforço. */
function desenharSobrancelha(ctx, p, expr, cx, cy, rx, ry, s) {
  if (expr === 'sono') return;
  const alto = { susto: -0.98, alegre: -0.82, esforco: -0.66, molhado: -0.62 }[expr] ?? -0.78;
  const inclina = { esforco: 0.12, molhado: -0.12, susto: -0.04 }[expr] ?? 0;
  ctx.strokeStyle = p.escura;
  ctx.lineWidth = s * 0.035;
  for (const lado of [-1, 1]) {
    const x0 = cx + lado * rx * 0.18;
    const x1 = cx + lado * rx * 0.5;
    ctx.beginPath();
    ctx.moveTo(x0, cy + ry * (alto + inclina));
    ctx.quadraticCurveTo((x0 + x1) / 2, cy + ry * (alto - 0.08), x1, cy + ry * (alto - inclina * 0.5));
    ctx.stroke();
  }
}

function desenharAcessorio(ctx, p, cx, cy, rx, ry, s, fase) {
  ctx.save();
  const topo = cy - ry;
  ctx.strokeStyle = p.escura;
  switch (p.estilo) {
    case 'flor': { // florzona de cinco pétalas presa no alto, girando devagar
      const fx = cx + rx * 0.5;
      const fy = topo + ry * 0.1;
      ctx.fillStyle = '#FFD1F0';
      ctx.lineWidth = s * 0.022;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU + fase * 0.44;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * s * 0.085, fy + Math.sin(a) * s * 0.085, s * 0.068, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#FFC93C';
      ctx.beginPath();
      ctx.arc(fx, fy, s * 0.055, 0, TAU);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'topete': { // três fios espetados em onda
      ctx.lineWidth = s * 0.05;
      for (const k of [-1, 0, 1]) {
        const bx = cx + k * rx * 0.25;
        ctx.beginPath();
        ctx.moveTo(bx, topo + ry * 0.1);
        ctx.quadraticCurveTo(bx + k * s * 0.05 + s * 0.04, topo - s * 0.16, bx + k * s * 0.09 + s * 0.12, topo - s * 0.13 + Math.sin(fase * 4.4 + k) * s * 0.01);
        ctx.stroke();
      }
      break;
    }
    case 'cristal': { // cúpula de vidro no alto e um losango flutuando
      ctx.fillStyle = 'rgba(220, 248, 255, 0.55)';
      ctx.lineWidth = s * 0.02;
      ctx.beginPath();
      ctx.ellipse(cx, topo + ry * 0.32, rx * 0.86, ry * 0.42, 0, Math.PI, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = s * 0.03;
      ctx.beginPath();
      ctx.ellipse(cx, topo + ry * 0.32, rx * 0.68, ry * 0.3, 0, Math.PI * 1.15, Math.PI * 1.45);
      ctx.stroke();
      const fy = topo - s * 0.12 + Math.sin(fase * 2.2) * s * 0.025;
      ctx.fillStyle = '#E8FBFF';
      ctx.strokeStyle = p.escura;
      ctx.lineWidth = s * 0.025;
      ctx.beginPath();
      ctx.moveTo(cx, fy - s * 0.11);
      ctx.lineTo(cx + s * 0.075, fy);
      ctx.lineTo(cx, fy + s * 0.11);
      ctx.lineTo(cx - s * 0.075, fy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'cones': { // coroinha de três cones (os cones da retina veem as cores)
      const cores = ['#FFD166', '#FF9F6B', '#FFD166'];
      ctx.lineWidth = s * 0.022;
      [-1, 0, 1].forEach((k, n) => {
        const bx = cx + k * rx * 0.36;
        const by = topo + ry * (k === 0 ? 0.02 : 0.14);
        const alt = s * (k === 0 ? 0.17 : 0.13);
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(k * 0.35);
        ctx.fillStyle = cores[n];
        ctx.beginPath();
        ctx.moveTo(0, -alt);
        ctx.quadraticCurveTo(s * 0.02, -alt, s * 0.055, 0);
        ctx.quadraticCurveTo(0, s * 0.03, -s * 0.055, 0);
        ctx.quadraticCurveTo(-s * 0.02, -alt, 0, -alt);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, -alt, s * 0.022, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
      break;
    }
    case 'faixa': { // faixa na testa com nó esvoaçante
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = s * 0.065;
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry * 0.25, rx * 1.01, ry * 1.02, 0, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(184, 115, 0, 0.5)';
      ctx.lineWidth = s * 0.015;
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry * 0.25, rx * 1.01, ry * 1.02, 0, Math.PI * 1.25, Math.PI * 1.75);
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = p.escura;
      ctx.lineWidth = s * 0.02;
      const nx = cx + rx * 0.86;
      const ny = cy - ry * 0.5;
      for (const a of [-0.4 + Math.sin(fase * 6.6) * 0.15, 0.5 + Math.sin(fase * 6.6 + 1) * 0.15]) {
        ctx.beginPath();
        ctx.ellipse(nx + Math.cos(a) * s * 0.09, ny + Math.sin(a) * s * 0.09, s * 0.075, s * 0.032, a, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'broto': { // brotinho de duas folhas que balança
      ctx.lineWidth = s * 0.032;
      const balanco = Math.sin(fase * 2.2) * 0.12;
      const tx = cx + Math.sin(balanco) * s * 0.17;
      const ty = topo - s * 0.15;
      ctx.beginPath();
      ctx.moveTo(cx, topo + ry * 0.05);
      ctx.quadraticCurveTo(cx, topo - s * 0.08, tx, ty);
      ctx.stroke();
      ctx.fillStyle = '#9BF2BE';
      for (const lado of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(tx + lado * s * 0.085, ty - s * 0.01, s * 0.095, s * 0.045, lado * -0.45 + balanco, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'laco': { // cílios compridos e laço de fita
      ctx.lineWidth = s * 0.035;
      for (const k of [-1, 0, 1]) {
        const bx = cx + k * rx * 0.42 + rx * 0.1;
        const by = topo + ry * (k === 0 ? 0.02 : 0.12);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + k * s * 0.02, by - s * 0.1, bx + k * s * 0.07 + s * 0.04, by - s * 0.12);
        ctx.stroke();
      }
      const lx = cx - rx * 0.66;
      const ly = topo + ry * 0.2;
      ctx.fillStyle = '#FFE3F1';
      ctx.lineWidth = s * 0.022;
      for (const lado of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.quadraticCurveTo(lx + lado * s * 0.06, ly - s * 0.11, lx + lado * s * 0.13, ly - s * 0.06);
        ctx.quadraticCurveTo(lx + lado * s * 0.14, ly + s * 0.04, lx, ly);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = p.cor;
      ctx.beginPath();
      ctx.arc(lx, ly, s * 0.035, 0, TAU);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'oculos': { // óculos redondos com reflexo
      ctx.fillStyle = 'rgba(200, 230, 255, 0.18)';
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = s * 0.04;
      ctx.beginPath();
      ctx.arc(cx, cy + ry * 0.04, Math.min(rx, ry) * 0.66, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - rx * 0.66, cy - ry * 0.06);
      ctx.lineTo(cx - rx * 1.04, cy - ry * 0.2);
      ctx.moveTo(cx + rx * 0.66, cy - ry * 0.06);
      ctx.lineTo(cx + rx * 1.04, cy - ry * 0.2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = s * 0.025;
      ctx.beginPath();
      ctx.moveTo(cx + rx * 0.18, cy - ry * 0.42);
      ctx.lineTo(cx + rx * 0.4, cy - ry * 0.2);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

function desenharPingos(ctx, cx, cy, R, molhado, fase) {
  ctx.fillStyle = 'rgba(70, 170, 255, 0.85)';
  for (let k = 0; k < 4; k++) {
    const a = k * 1.7 + 0.4;
    const queda = ((fase * 1.4 + k * 0.27) % 1) * R * 0.9;
    const px = cx + Math.cos(a) * R * 0.95;
    const py = cy + Math.sin(a) * R * 0.5 + queda;
    gotinha(ctx, px, py, R * 0.12 * molhado);
  }
}

function coracao(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.75);
  ctx.bezierCurveTo(x - r * 1.2, y - r * 0.05, x - r * 0.55, y - r * 0.95, x, y - r * 0.35);
  ctx.bezierCurveTo(x + r * 0.55, y - r * 0.95, x + r * 1.2, y - r * 0.05, x, y + r * 0.75);
  ctx.fill();
}

function estrela4(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** Gotinha simples (ponta para cima). */
export function gotinha(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.8);
  ctx.bezierCurveTo(x + r * 0.4, y - r * 1.1, x + r, y - r * 0.5, x + r, y);
  ctx.arc(x, y, r, 0, Math.PI);
  ctx.bezierCurveTo(x - r, y - r * 0.5, x - r * 0.4, y - r * 1.1, x, y - r * 1.8);
  ctx.fill();
}

/** Mistura duas cores hexadecimais (t = 0 → a, 1 → b). */
export function misturar(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const canal = (sh) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `rgb(${canal(16)}, ${canal(8)}, ${canal(0)})`;
}
