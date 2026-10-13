// Paletas e peças de cada arena (só aparência). A parte 3 amplia esta tabela.

export const TEMAS = Object.freeze({
  jardim: Object.freeze({
    piso: ['#D6F3DE', '#CAEDD5'],
    pisoSombra: 'rgba(36, 92, 64, 0.16)',
    flores: ['#C3B1FF', '#FFC2DD', '#FFFFFF', '#FFE58F'],
    moldura: { clara: '#9B87EC', escura: '#5B45B8', brilho: 'rgba(255,255,255,0.35)', dobradica: '#E6E0FF' },
    pilar: { base: '#AE9DF0', baseEscura: '#7560D4', lenteClara: '#F4FDFF', lenteEscura: '#9AD6F2', aro: '#5F49C2' },
    bloco: { clara: '#FFF0B8', media: '#FFD772', escura: '#F0AE45', grao: '#D98B25', borda: '#C9842E' },
  }),
});

export function obterTema(id) {
  return TEMAS[id] || TEMAS.jardim;
}
