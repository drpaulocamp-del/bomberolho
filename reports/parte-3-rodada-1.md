# Parte 3 — Estética, identidade e som · Rodada 1 (relatório do executor)

Li inteiros o `PLAN.md` e o `CLAUDE.md`. Li também os relatórios e pareceres anteriores (`reports/parte-1-rodada-1.md`, `reports/parte-2-rodada-2.md`, `reviews/parte-1-rodada-1.md`, `reviews/parte-2-rodada-2.md`).

Esta parte dá a cara do jogo. Ela entrega:
- um fluxo completo de menus;
- as criaturinhas redesenhadas, com expressões e animações;
- efeitos de "encharcar e ir descansar", de alcance, de coleta e de vitória;
- som procedural, com efeitos e música por arena;
- preferências e placar guardados no aparelho;
- as melhorias pendentes dos pareceres que tocavam a arte: a boca do túnel, o corte do boneco no túnel e a bancada.

Tudo foi desenhado e sintetizado por código. Nada foi baixado, não há fonte externa nem arquivo de som.

## Como testar

```
node dev-server.mjs --port 7200   →  http://localhost:7200/bomberolho/
cd qa && npm test && npm run e2e
npm run capturas:p3                # todas as telas nas 4 resoluções → qa/capturas/p3/
node navegador/desempenho.mjs      # fps: desktop, celular lento e menu no celular lento
npm run som                        # pico e volume de cada efeito e trilha (sem alto-falante)
```

- **Sem parâmetros na URL**, o jogo abre o **menu**. Atrás dele roda uma partida de robôs de vitrine, sem som e sem placar.
- **Com qualquer parâmetro de jogo** (`?semente=`, `?arena=`, `?demo=1`, `?personagem=`, `?dificuldade=`, `?rodadas=`, `?escala=`, `?ajuste=1`), a partida começa direto, como antes. É assim que os testes antigos e o verificador entram.
- O gancho `__bomberolho` continua igual e ganhou alguns acréscimos:
  - `menu(etapa)`;
  - `state.menu`, `state.mudo`, `state.audio` ('inativo', 'running' ou 'suspended') e `state.placarLocal`.
- `start()` fecha o menu e começa a partida.

## O que foi feito

### 1. Personagens (`js/render/personagens.js`, `js/dados/personagens.js`)

**Desenho.** O corpo é um olho: esclera branca e pálpebra na cor do personagem. A íris olha para onde ele anda. Cada um tem:
- boquinha, bochechas rosadas e sobrancelha na pálpebra;
- bracinhos com mãozinha e pezinhos que alternam ao andar;
- respiração, ou seja, o corpo estica e achata de leve quando está parado.

**Distinção para daltônicos.** Os oito se distinguem por forma, não só pela cor. Muda a silhueta, o acessório e até o desenho da íris e da pupila:

| | Cor | Silhueta / acessório | Íris / pupila |
|---|---|---|---|
| Íris | violeta | flor grande girando devagar | pétalas |
| Pupilo | azul-petróleo | topete de três fios | pupila enorme |
| Córnea | ciano | mais alta (cúpula), cúpula de vidro e losango flutuando | brilho em estrela que pisca |
| Retina | coral | coroinha de três **cones** (os cones da retina) | raios |
| Cristalino | âmbar | **lente deitada** (mais largo), faixa com nó esvoaçante | anéis de foco |
| Mácula | menta | brotinho que balança | pontinhos em volta da pupila |
| Cílio | rosa | cílios compridos e laço | pupila em **coração** |
| Lente | azul-marinho | óculos redondos com reflexo | — |

Nenhum lembra o herói clássico do gênero: não há capacete, antena, cinto nem luvas. A folha com todas as poses está em `qa/capturas/p3/folha-personagens.png`, gerada por `qa/ferramentas/folha.html`.

**Expressões em jogo** (`Renderizador.expressaoDe`):
- arregala (pálpebra sobe, pupila encolhe, boca em "o") quando está na cruz de uma gota que vai estourar;
- aperta os olhos de alegria (olho "^", boca aberta) ao pegar um item ou montar;
- fica decidido ao soltar ou chutar a gota;
- leva susto ao pegar o Cisco ou perder o bichinho;
- pisca sozinho, cada um no seu ritmo;
- quem vence a rodada pula com os braços para cima.

**"Encharcar e ir descansar"**, sem violência:
1. O boneco leva o banho: aperta os olhos, a boca fica ondulada, ele chacoalha e escorrem pingos.
2. Uma **nuvenzinha fofa** aparece embaixo dele.
3. Ele cochila de olhos fechados, com cílios.
4. Sobe com "z z" e some (2,2 s).

O retrato no placar também passa a cochilar, e a faixa "Você foi descansar!" mostra o retrato do jogador dormindo.

**Desempenho.** Os bonecos saem de um cache de quadros prontos (`desenharPersonagemRapido`). As animações de parado repetem num ciclo comum de 2π/2,2 s, em 16 quadros, e as de andar num ciclo de 2π/14 s, em 8 quadros. Cada pose é desenhada uma vez e depois só copiada. O cache é limitado (LRU de 520 quadros).

### 2. Arenas e peças (`js/render/temas.js`, `pecas.js`, `renderizador.js`)

- As 5 arenas mantêm a identidade aprovada na parte 2. Foram ajustadas em dois pontos:
  - **Consultório:** pilar (armação) mais escuro e pesado, e bloco em verde-menta (estojo de lente). Antes, pilar, bloco e piso eram quase todos branco-acinzentados.
  - **Jardim:** tufinhos de grama no piso.
- **Boca do túnel (M4 do parecer da parte 2):** agora é desenhada a cada quadro.
  - Aberta: escura, com as setas.
  - Com a casa de chegada ocupada (peça do aperto, bloco ou gota): **pálpebra fechada com cílios**, ou seja, o túnel "dormindo". Captura em `qa/capturas/p3`, feita pelo roteiro de túnel descrito na seção de medições.
- **Corte do boneco no túnel (limitação da parte 2):** perto da boca, o boneco é desenhado também do outro lado, numa cópia deslocada de 13 casas. As duas imagens são recortadas na boca, e um véu escuro por cima faz quem entra sumir na boca. Resultado: ele "entra num lado e sai no outro" sem pulo visual.
- **Alcance do respingo (legibilidade):** no último 1,25 s do pavio, as casas que a gota vai molhar ganham um tom azul (violeta, no Penetrante) e gotinhas que pulsam cada vez mais rápido. Lê-se "saia daqui" num relance, sem contar casas, e não depende só da cor: a forma das gotinhas e o pulso também dizem.

### 3. Efeitos

- **Respingo:** o respingo em camadas da parte 2 continua. Ganhou mais gotas espirrando e a tremidinha de tela, que é desligada com "reduzir movimento".
- **Item que surge:** brilhinhos em estrela (dourados nos raros).
- **Item pego:** o medalhão sobe da cabeça de quem pegou, cresce um pouco e some. O boneco sorri.
- **Vitória da rodada:** chuva de confete sobre quem venceu, que pula comemorando.
- **Cartões** de rodada e de taça: arte animada com o vencedor pulando e confete; ao lado de quem levou a taça, uma **taça dourada** desenhada. No empate, os quatro aparecem encharcados juntos. Na pausa, o seu personagem cochila com "z".
- **`prefers-reduced-motion`:** tira a tremida, reduz as partículas a 35%, deixa a nuvem de descanso quase sem subida, para o desfile, o pulo das letras do logo, o confete, a animação dos cartões e as transições de CSS. Coberto por teste.

### 4. Menus e fluxo (`js/ui/menu.js`, `css/menu.css`, `js/render/logo.js`)

**Tela inicial:**
- logo desenhado por código: "Bomberolho" em letras gordinhas, com os três "o" virando olhinhos que olham em volta e piscam, e uma gota pingando;
- o **desfile dos 8 personagens** saltitando e acenando;
- botão grande **Jogar**;
- "Como jogar", botão de som, as taças guardadas e um cartão **"Você sabia?"** contado por um personagem, com botão de trocar a curiosidade.

**Quem é você?** Destaque grande do escolhido, com nome e frase curta, comemorando ao ser escolhido. Grade 4×2 com os oito animados.

**Onde vamos jogar?**
- miniaturas **reais** de cada arena: o mapa verdadeiro, com os quatro nos cantos e o seu personagem no primeiro canto;
- **Surpresa!**: cada rodada numa arena diferente, em rodízio a partir da semente, coberto por teste;
- **Robôs:** Fácil "Para começar", Médio "Já sei jogar", Difícil "Desafio!", com 1, 2 ou 3 gotinhas. Isso atende à sugestão do parecer da parte 2 de dizer que o Médio é "para quem já joga";
- **Troféus para a taça:** 1, 2 ou 3, com troféus desenhados;
- **Começar!**.

**Como jogar:** 5 passos com figuras do próprio jogo (o seu personagem andando, a gota, a cruz, os itens, e quem ficou sequinho comemorando).

**Pensado para quem mal lê:**
- uma decisão por tela e figura grande em tudo;
- botões ≥ 44 px (medido em teste nas 4 telas);
- seleção com aro azul e selo ✓, não só cor.

**Sem becos sem saída:**
- Voltar sempre à vista nas etapas;
- Esc volta;
- setas andam entre as opções de um grupo;
- foco no botão principal de cada tela.

**HUD.** Os botões **Pausar** e **Sair** ficam sempre visíveis, junto com o botão de **som**. Em retrato estreito ficam só os ícones, com `aria-label`.
- **Sair** pergunta "Sair da partida?" com "Continuar jogando" e "Sair". Com a rodada já terminada, sai direto.
- **Pausa:** Continuar / Recomeçar / Menu.
- **Placar entre rodadas:** Próxima rodada.
- **Fim de partida:** Jogar de novo / Menu.
- Todos os cartões têm uma curiosidade. O primeiro botão é sempre o principal, e Enter aciona o botão em foco.

Em retrato, o cartão ocupa a tela inteira. Assim cabe sem rolar em 360×640, o que é medido em teste.

**Padrão do site (3.6):**
- azul `#0071E3`, texto `#1D1D1F` e fundo `#F5F5F7`;
- vidro fosco no painel e nos cartões, cantos arredondados;
- fonte do sistema (`system-ui`, Inter se houver localmente; nada é baixado).

O jogo em si é bem mais colorido.

### 5. Som (`js/audio/sintese.js`, `musica.js`, `som.js`)

**Só depois de um gesto.** O `AudioContext` nasce no primeiro toque, clique ou tecla. Testes provam que `state.audio` é 'inativo' antes de qualquer gesto e que não há aviso de autoplay no console.

**Mudo persistente** em `localStorage`. Com mudo, nem o contexto é criado. Desligar o mudo dentro de um gesto cria o contexto e toca um "plim". A aba escondida suspende o áudio.

**Efeitos sintetizados** com osciladores e ruído filtrado (25 sons):
- "ploc" da gota;
- "splash" do respingo: chiado que desce, baque macio e bolhinhas. Cadeia no mesmo quadro vira um splash mais cheio, não uma rajada;
- tufinho do bloco;
- arpejo de item e arpejo maior para os raros;
- "uó-uó" do Cisco e "atchim" de brinquedo;
- "piuuu" com bolhas de quem encharca;
- bipes da contagem e o "já!";
- aviso de duas notas do aperto e baque das peças;
- "boing" do Saltinho, "plim" da carapaça e arpejo do estojo;
- fanfarrinha de taça, notinhas de rodada e um empate suave (nunca "derrota" triste);
- cliques de interface.

Há intervalo mínimo entre sons iguais, para não metralhar.

**Música por arena, composta aqui:** menu e as 5 arenas, cada uma com escala, andamento e timbre próprios.

| Trilha | Tonalidade | Andamento | Timbre |
|---|---|---|---|
| Menu | Dó maior | 96 | marimba |
| Jardim | Fá | 104 | flauta com vibrato |
| Lago | Ré | 84 | sino |
| Caverna | Lá dórico | 92 | marimba grave, misteriosa sem assustar |
| Vale | Sol | 112 | pluck |
| Consultório | Si♭ | 100 | sino |

Cada trilha tem baixo, acorde suave, arpejo leve e chiadinho no contratempo.

**Para não irritar em repetição:**
- volume da trilha baixo (cerca de 7 dB abaixo dos efeitos);
- melodia alternando duas frases (A, B, A);
- **uma volta inteira só de acompanhamento**, para respirar.

No aperto final, a trilha acelera 12% e o chiadinho dobra. A música para na pausa e no fim da partida, onde toca a fanfarra.

**Níveis medidos** offline (`npm run som`), antes dos ganhos de saída (trilha × 0,55, mestre × 0,8, compressor):
- efeitos: pico entre −4 e −21 dBFS, RMS entre −23 e −40;
- trilhas: RMS em torno de −31.

### 6. Preferências e placar local (`js/ui/preferencias.js`)

O jogo guarda mudo, personagem, arena, dificuldade e troféus, além de partidas, taças e rodadas ganhas, também por personagem. A tela inicial mostra as taças.
- Tudo em `localStorage`, numa chave só, validada campo a campo: valor adulterado volta ao padrão.
- Leitura e gravação ficam em try/catch. Há teste com `localStorage` que lança erro: o jogo abre e joga normalmente.
- Partida no piloto automático (`?demo=1`) e a vitrine não contam no placar.
- Nada sai do aparelho.

### 7. Bancada (M6 do parecer da parte 2)

Em tela baixa ou estreita (altura ≤ 520 px ou largura ≤ 400 px), a bancada `?ajuste=1` **já abre recolhida**. O teste da parte 2 foi ajustado para conferir isso e abri-la inteira antes de mexer.

## Curiosidades (24) e por que são verdadeiras

Todas são simples e nenhuma promete nada médico. Cada uma é contada pelo personagem ligado ao assunto.

1. **"No escuro, a pupila fica maior para deixar entrar mais luz."** Reflexo pupilar: a pupila se dilata com pouca luz. É o exemplo do próprio plano.
2. **"Com luz forte, a pupila fica pequenininha."** É o mesmo reflexo, no sentido contrário (miose).
3. **"A íris é a parte colorida do olho."** Definição anatômica.
4. **"O desenho de cada íris é único, como uma impressão digital."** É a base do reconhecimento biométrico por íris.
5. **"A gente pisca mais ou menos 15 vezes por minuto."** A frequência média em repouso costuma ser citada entre 15 e 20 por minuto.
6. **"Uma piscada é tão rápida que dura menos de meio segundo."** Uma piscada dura cerca de 100 a 400 ms.
7. **"Os cílios ajudam a segurar a poeira longe dos olhos."** Função de proteção dos cílios.
8. **"A córnea é a janelinha transparente na frente do olho."** Definição anatômica.
9. **"Piscar espalha a lágrima e deixa o olho limpinho."** O piscar distribui o filme lacrimal sobre a superfície do olho.
10. **"A lágrima tem um pouquinho de sal. Por isso é salgadinha!"** A lágrima contém sais (sódio e cloreto).
11. **"Dentro do olho tem uma lente natural: o cristalino."** Definição anatômica.
12. **"O cristalino muda de forma para ver perto e longe."** É a acomodação.
13. **"A retina fica no fundo do olho e recebe a luz."** Definição anatômica.
14. **"Os cones da retina veem as cores."** Os cones são as células da visão de cores.
15. **"Os bastonetes da retina ajudam a enxergar no escuro."** Os bastonetes são as células da visão com pouca luz.
16. **"A imagem chega de cabeça para baixo na retina. O cérebro desvira!"** A lente forma na retina uma imagem invertida, e o cérebro a interpreta.
17. **"A mácula é um pedacinho da retina que vê os detalhes."** A mácula, com a fóvea, é a região da visão central e de detalhe.
18. **"Todo olho tem um ponto cego. O cérebro completa o buraco."** O disco óptico não tem fotorreceptores, e o cérebro preenche a falha.
19. **"O nervo óptico leva as imagens do olho até o cérebro."** Função do nervo óptico.
20. **"Com os dois olhos juntos, dá para saber se algo está perto ou longe."** É a visão binocular (estereopsia).
21. **"As sobrancelhas ajudam a desviar o suor dos olhos."** Função descrita das sobrancelhas.
22. **"Os bebês nascem enxergando pouco e aprendem a ver aos pouquinhos."** A acuidade visual do recém-nascido é baixa e se desenvolve nos primeiros meses e anos.
23. **"Nunca olhe direto para o Sol: a luz dele é forte demais."** É um aviso de segurança geral, não uma promessa médica. Olhar o Sol pode lesar a retina.
24. **"Lágrimas aparecem quando choramos e também quando rimos muito."** Há lágrima emocional e também lágrima reflexa, por exemplo ao rir muito.

## Medições

**Suítes**

| Suíte | Antes desta parte | Depois |
|---|---|---|
| `npm test` (simulação) | 164/164 | **164/164**, em cerca de 30 s. A simulação não mudou. |
| `npm run e2e` (navegador) | 26/26 | **41/41**, em cerca de 80 s |

Os 15 testes novos estão em `qa/navegador/parte3.test.mjs`. Eles cobrem:
- o menu ao abrir, sem áudio antes de um gesto;
- o fluxo completo com as escolhas chegando à partida;
- Voltar e Esc;
- Sair com confirmação e Menu;
- os botões e a curiosidade da pausa, conferida contra a lista;
- Jogar de novo e Menu no resultado;
- as preferências lembradas;
- o mudo persistente;
- o armazenamento bloqueado;
- a arena Surpresa;
- as **4 telas**: sem rolagem, nenhum botão fora da tela, alvos ≥ 36 px (os principais têm ≥ 44), cartão de aviso inteiro e sem rolar;
- reduzir movimento.

**Console e rede.** Zero erros, avisos ou 404 em todos os testes e em todas as capturas (o roteiro de capturas confere isso).

**Peso** da primeira carga (sem a bancada, que só é baixada com `?ajuste=1`): **365 kB** sem compressão, para um orçamento de 600 kB. A pasta inteira tem 373 kB.

**fps** (`navegador/desempenho.mjs`, Chromium sem cabeça com rasterização por software):

| Cenário | fps médio | p95 do quadro |
|---|---|---|
| Desktop | 60 | 16,7 ms |
| Celular de entrada (390×844, DPR 3, CPU 4× mais lenta) | **43** | 50 ms |
| Menu no mesmo celular lento | **29** | 83 ms |

- O celular de entrada estava em 42 fps na parte 2. O cache de quadros dos personagens compensou a arte mais rica. Sem o cache, medi 35 fps.
- No menu: no começo, o desfile esvaziava o cache e a tela ficava a 10 fps. Corrigi com cache maior (LRU), letras do logo pré-desenhadas, vitrine em densidade 1 e vitrine e animações do menu em quadros alternados.

**Capturas** de todas as telas, nas 4 resoluções, em `qa/capturas/p3/` (pasta fora do git): `npm run capturas:p3`. São 15 telas por resolução (início, personagem, arena, ajuda, contagem, respingo, perigo, pausa, sair, aperto, intervalo, resultado, encharcado, descanso), mais as 5 arenas em desktop e 360×640, os 8 personagens em jogo e a folha de personagens. Olhei todas como diretor de arte e corrigi o que vi:
- botão "Jogar" instável;
- cartões cortados em 360×640;
- arenas cortadas em 1280×720;
- personagem dormindo escondido pela nuvem;
- desfile encavalado;
- contraste do Consultório;
- ícones da ajuda.

## Limitações conhecidas (honestas)

- **Controles de toque não existem ainda.** São da parte 4. Em celular dá para navegar por todos os menus e cartões, mas jogar exige teclado. Por isso "Como jogar" fala das setas e do Espaço.
- **O menu no celular lento fica em cerca de 29 fps,** com p95 de 83 ms. Está abaixo dos 30 pedidos para jogar, mas é o menu, não a partida. A partida fica em 43 fps.
- **Medições só em emulação.** O fps foi medido em Chromium sem cabeça com CPU 4× mais lenta e rasterização por software, e o som foi medido offline (pico e RMS). **Não ouvi o som num alto-falante.** Os níveis, o intervalo entre sons iguais, a volta de respiro da música e os timbres foram escolhidos para não cansar, mas a impressão de "não irritante" ainda precisa de um ouvido humano.
- **Acessórios no cache de quadros.** Com o personagem andando, as animações dos acessórios (flor girando, broto balançando) usam o ciclo do passo e podem dar um saltinho mínimo a cada passo. É imperceptível na velocidade do jogo.
- **Expressão de susto aproximada.** Ela olha a cruz da gota sem considerar blocos no caminho. É só cosmético, mas às vezes o boneco se assusta atrás de um bloco que o protegeria.
- **"Surpresa" segue um rodízio fixo** a partir da semente, não um sorteio. É determinístico de propósito.
- **Curiosidades:** os números são valores médios citados na literatura (piscadas por minuto, duração da piscada). Foram escritos como aproximados ("mais ou menos", "menos de").
- **A vitrine atrás do menu gasta bateria.** É uma partida de robôs de verdade rodando. O "reduzir movimento" não a desliga; ele só para as animações decorativas.

## Arquivos

**Novos:**
- jogo: `bomberolho/css/menu.css`, `bomberolho/js/ui/menu.js`, `bomberolho/js/ui/preferencias.js`, `bomberolho/js/render/logo.js`, `bomberolho/js/dados/curiosidades.js`, `bomberolho/js/audio/sintese.js`, `bomberolho/js/audio/musica.js`, `bomberolho/js/audio/som.js`;
- QA: `qa/navegador/parte3.test.mjs`, `qa/navegador/capturas-p3.mjs`, `qa/ferramentas/olhar.mjs`, `qa/ferramentas/medir-som.mjs`. A `qa/ferramentas/folha.html` já estava no checkpoint.

**Alterados:**
- `bomberolho/index.html`: menus, HUD com Pausar, Sair e som, cartão com arte e curiosidade;
- `bomberolho/css/estilo.css`;
- `bomberolho/js/main.js`: fluxo menu ↔ partida, vitrine, som, preferências;
- `bomberolho/js/jogo.js`: `menu` na tela e arena Surpresa;
- `bomberolho/js/parametros.js`: `pedeJogoDireto`;
- `bomberolho/js/gancho.js`: `menu()` e os extras do estado;
- `bomberolho/js/input/teclado.js`: teclas do menu e botão em foco;
- `bomberolho/js/dados/personagens.js`;
- `bomberolho/js/render/personagens.js`, `renderizador.js`, `efeitos.js`, `pecas.js`, `temas.js`;
- `bomberolho/js/ui/avisos.js`, `hud.js`, `bancada.js`;
- `qa/navegador/parte2.test.mjs`: bancada recolhida em tela baixa;
- `qa/navegador/desempenho.mjs`: cenário do menu;
- `qa/package.json`: scripts `capturas:p3` e `som`.

**Removido:** `qa/ferramentas/foto.mjs`. Era um auxiliar temporário meu do checkpoint, substituído por `olhar.mjs`.
