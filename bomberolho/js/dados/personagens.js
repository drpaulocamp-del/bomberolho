// As criaturinhas-olho. Cada uma tem cor, íris e um acessório de FORMA própria,
// para serem reconhecidas também por quem não distingue bem as cores.

export const PERSONAGENS = Object.freeze({
  iris: Object.freeze({ id: 'iris', nome: 'Íris', cor: '#8B5CF6', escura: '#5B34C7', iris: '#B69CFF', irisEscura: '#6A3FE0', estilo: 'flor' }),
  pupilo: Object.freeze({ id: 'pupilo', nome: 'Pupilo', cor: '#119DA4', escura: '#0A6970', iris: '#3CCFC4', irisEscura: '#0E7F86', estilo: 'topete' }),
  cornea: Object.freeze({ id: 'cornea', nome: 'Córnea', cor: '#33B8F0', escura: '#1478B3', iris: '#8EE3FF', irisEscura: '#1E95D1', estilo: 'cristal' }),
  retina: Object.freeze({ id: 'retina', nome: 'Retina', cor: '#FF6F61', escura: '#C9443A', iris: '#FF9E8F', irisEscura: '#D9503F', estilo: 'cilios' }),
  cristalino: Object.freeze({ id: 'cristalino', nome: 'Cristalino', cor: '#F2A516', escura: '#B87300', iris: '#FFCB57', irisEscura: '#C98500', estilo: 'faixa' }),
  macula: Object.freeze({ id: 'macula', nome: 'Mácula', cor: '#2FBF71', escura: '#1B8048', iris: '#74E0A3', irisEscura: '#209256', estilo: 'broto' }),
  cilio: Object.freeze({ id: 'cilio', nome: 'Cílio', cor: '#EC4899', escura: '#B0216A', iris: '#F98BC4', irisEscura: '#C52C7A', estilo: 'laco' }),
  lente: Object.freeze({ id: 'lente', nome: 'Lente', cor: '#2B4C9B', escura: '#16285C', iris: '#6D8FE0', irisEscura: '#2D4FA8', estilo: 'oculos' }),
});

/** Escolhe os 4 da partida: o do humano primeiro, depois os rivais padrão sem repetir. */
export function escalarPersonagens(escolhido) {
  const preferidos = ['iris', 'pupilo', 'retina', 'macula', 'cornea', 'cristalino', 'cilio', 'lente'];
  const primeiro = PERSONAGENS[escolhido] ? escolhido : 'iris';
  return [primeiro, ...preferidos.filter((p) => p !== primeiro)].slice(0, 4);
}
