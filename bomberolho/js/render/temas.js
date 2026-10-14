// Paletas e peças de cada arena (só aparência). Cada arena tem piso, moldura,
// pilar e bloco com desenho próprio (ver pecas.js) e uma cor de "muro" para
// as peças do aperto final. A parte 3 refina; aqui já é tudo distinto e legível.

export const TEMAS = Object.freeze({
  jardim: Object.freeze({
    fundoPagina: '#EEE9FF',
    piso: ['#D6F3DE', '#CAEDD5'],
    pisoSombra: 'rgba(36, 92, 64, 0.16)',
    decoracao: 'flores',
    flores: ['#C3B1FF', '#FFC2DD', '#FFFFFF', '#FFE58F'],
    moldura: { clara: '#9B87EC', escura: '#5B45B8', brilho: 'rgba(255,255,255,0.35)', dobradica: '#E6E0FF' },
    pilar: { estilo: 'lente', base: '#AE9DF0', baseEscura: '#7560D4', lenteClara: '#F4FDFF', lenteEscura: '#9AD6F2', aro: '#5F49C2' },
    bloco: { estilo: 'polen', clara: '#FFF0B8', media: '#FFD772', escura: '#F0AE45', grao: '#D98B25', borda: '#C9842E' },
    muro: { clara: '#8C7BD6', escura: '#4B3A9E', risco: 'rgba(255,255,255,0.45)' },
  }),
  lago: Object.freeze({
    fundoPagina: '#E3F4FF',
    piso: ['#D8F1FB', '#CBEAF7'],
    pisoSombra: 'rgba(20, 80, 120, 0.16)',
    decoracao: 'ondinhas',
    agua: { fundo: '#7FCBEB', borda: '#4FA9D6', seta: 'rgba(255,255,255,0.85)' },
    moldura: { clara: '#58B7E8', escura: '#1E6FA8', brilho: 'rgba(255,255,255,0.4)', dobradica: '#DDF4FF' },
    pilar: { estilo: 'ondas', base: '#9ED8F5', baseEscura: '#3C93C9', lenteClara: '#FFFFFF', lenteEscura: '#BDE8FA', aro: '#2C78AE' },
    bloco: { estilo: 'cristal', clara: '#FFFFFF', media: '#E4F6FF', escura: '#A9D8F0', grao: '#7DBBDE', borda: '#6FA9CC' },
    muro: { clara: '#5D9CC4', escura: '#25577E', risco: 'rgba(255,255,255,0.45)' },
  }),
  caverna: Object.freeze({
    fundoPagina: '#1C1830',
    piso: ['#3A3460', '#342E57'],
    pisoSombra: 'rgba(0, 0, 0, 0.3)',
    decoracao: 'brilhos',
    moldura: { clara: '#5B4F96', escura: '#241C4A', brilho: 'rgba(255,255,255,0.22)', dobradica: '#B9AEF5' },
    pilar: { estilo: 'pupila', base: '#6B5FB0', baseEscura: '#3B2F7A', lenteClara: '#2A2350', lenteEscura: '#0E0B1E', aro: '#C7BCFF' },
    bloco: { estilo: 'pedra', clara: '#F4E3C4', media: '#DDBF8E', escura: '#B88F5A', grao: '#8E6A3C', borda: '#8E6A3C' },
    muro: { clara: '#7B6FC2', escura: '#2E2563', risco: 'rgba(255,255,255,0.35)' },
    tunel: { boca: '#0B0918', brilho: '#9C8CFF' },
  }),
  vale: Object.freeze({
    fundoPagina: '#FFEDEA',
    piso: ['#FFE1DA', '#FBD5CC'],
    pisoSombra: 'rgba(140, 50, 40, 0.15)',
    decoracao: 'pontinhos',
    flores: ['#FFB4A6', '#FFD3C9', '#FFFFFF'],
    moldura: { clara: '#F28B7D', escura: '#B3473C', brilho: 'rgba(255,255,255,0.38)', dobradica: '#FFE6E1' },
    pilar: { estilo: 'cone', base: '#FFB86B', baseEscura: '#E07B26', lenteClara: '#FFF4D6', lenteEscura: '#FFCF8A', aro: '#B85E14' },
    bloco: { estilo: 'bastonete', clara: '#E9DBFF', media: '#C3A6F5', escura: '#9374D6', grao: '#6E4FB8', borda: '#6E4FB8' },
    muro: { clara: '#D9796C', escura: '#8E3329', risco: 'rgba(255,255,255,0.45)' },
  }),
  consultorio: Object.freeze({
    fundoPagina: '#EEF2F7',
    piso: ['#F4F6FA', '#E8EDF4'],
    pisoSombra: 'rgba(40, 60, 90, 0.14)',
    decoracao: 'azulejos',
    lente: { aro: '#0071E3', vidro: 'rgba(160, 215, 255, 0.55)', brilho: '#FFFFFF' },
    moldura: { clara: '#8EA2BF', escura: '#46597A', brilho: 'rgba(255,255,255,0.45)', dobradica: '#F2F6FB' },
    pilar: { estilo: 'armacao', base: '#C9D4E3', baseEscura: '#8C9BB3', lenteClara: '#FFFFFF', lenteEscura: '#CFE6FA', aro: '#2B3A55' },
    bloco: { estilo: 'caixa', clara: '#FFFFFF', media: '#DCEBFA', escura: '#9DBBDB', grao: '#0071E3', borda: '#7193B8' },
    muro: { clara: '#7D8DA6', escura: '#3A4860', risco: 'rgba(255,255,255,0.45)' },
  }),
});

export function obterTema(id) {
  return TEMAS[id] || TEMAS.jardim;
}
