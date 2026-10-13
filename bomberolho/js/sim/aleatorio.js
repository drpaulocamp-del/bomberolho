// Gerador pseudoaleatório com semente (mulberry32). O estado é um único inteiro
// de 32 bits guardado dentro do mundo, então salvar/copiar o mundo copia também
// a sequência aleatória — essencial para o determinismo.

export function criarAleatorio(semente) {
  return { estado: semente >>> 0 };
}

/** Próximo número em [0, 1). */
export function proximo(rng) {
  rng.estado = (rng.estado + 0x6d2b79f5) >>> 0;
  let t = rng.estado;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Inteiro em [0, n). */
export function inteiro(rng, n) {
  return Math.floor(proximo(rng) * n);
}

/** Embaralha no lugar (Fisher–Yates) e devolve o próprio vetor. */
export function embaralhar(rng, vetor) {
  for (let i = vetor.length - 1; i > 0; i--) {
    const j = inteiro(rng, i + 1);
    const t = vetor[i];
    vetor[i] = vetor[j];
    vetor[j] = t;
  }
  return vetor;
}

/** Converte qualquer texto ou número numa semente de 32 bits (FNV-1a). */
export function sementeDeTexto(valor) {
  const texto = String(valor);
  if (/^\d+$/.test(texto) && Number(texto) <= 0xffffffff) return Number(texto) >>> 0;
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
