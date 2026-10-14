// Curiosidades sobre os olhos: verdadeiras, simples e sem promessa médica.
// Cada uma é "contada" por um personagem ligado ao assunto. A justificativa de
// cada fato está no relatório da parte 3 (reports/parte-3-rodada-1.md).

export const CURIOSIDADES = Object.freeze([
  { quem: 'pupilo', texto: 'No escuro, a pupila fica maior para deixar entrar mais luz.' },
  { quem: 'pupilo', texto: 'Com luz forte, a pupila fica pequenininha.' },
  { quem: 'iris', texto: 'A íris é a parte colorida do olho.' },
  { quem: 'iris', texto: 'O desenho de cada íris é único, como uma impressão digital.' },
  { quem: 'cilio', texto: 'A gente pisca mais ou menos 15 vezes por minuto.' },
  { quem: 'cilio', texto: 'Uma piscada é tão rápida que dura menos de meio segundo.' },
  { quem: 'cilio', texto: 'Os cílios ajudam a segurar a poeira longe dos olhos.' },
  { quem: 'cornea', texto: 'A córnea é a janelinha transparente na frente do olho.' },
  { quem: 'cornea', texto: 'Piscar espalha a lágrima e deixa o olho limpinho.' },
  { quem: 'cornea', texto: 'A lágrima tem um pouquinho de sal. Por isso é salgadinha!' },
  { quem: 'cristalino', texto: 'Dentro do olho tem uma lente natural: o cristalino.' },
  { quem: 'cristalino', texto: 'O cristalino muda de forma para ver perto e longe.' },
  { quem: 'retina', texto: 'A retina fica no fundo do olho e recebe a luz.' },
  { quem: 'retina', texto: 'Os cones da retina veem as cores.' },
  { quem: 'retina', texto: 'Os bastonetes da retina ajudam a enxergar no escuro.' },
  { quem: 'retina', texto: 'A imagem chega de cabeça para baixo na retina. O cérebro desvira!' },
  { quem: 'macula', texto: 'A mácula é um pedacinho da retina que vê os detalhes.' },
  { quem: 'macula', texto: 'Todo olho tem um ponto cego. O cérebro completa o buraco.' },
  { quem: 'lente', texto: 'O nervo óptico leva as imagens do olho até o cérebro.' },
  { quem: 'lente', texto: 'Com os dois olhos juntos, dá para saber se algo está perto ou longe.' },
  { quem: 'lente', texto: 'As sobrancelhas ajudam a desviar o suor dos olhos.' },
  { quem: 'iris', texto: 'Os bebês nascem enxergando pouco e aprendem a ver aos pouquinhos.' },
  { quem: 'pupilo', texto: 'Nunca olhe direto para o Sol: a luz dele é forte demais.' },
  { quem: 'macula', texto: 'Lágrimas aparecem quando choramos e também quando rimos muito.' },
]);

/** Sorteio sem repetir as últimas (rodízio embaralhado). Usa Math.random: é só enfeite. */
export function criarSorteioDeCuriosidades() {
  let fila = [];
  return () => {
    if (!fila.length) {
      fila = CURIOSIDADES.map((_, i) => i);
      for (let i = fila.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fila[i], fila[j]] = [fila[j], fila[i]];
      }
    }
    return CURIOSIDADES[fila.pop()];
  };
}
