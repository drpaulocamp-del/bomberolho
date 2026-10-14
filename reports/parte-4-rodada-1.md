# Parte 4 — Celular e acabamento · Rodada 1 (relatório do executor)

Li inteiros o `PLAN.md` e o `CLAUDE.md`, além dos relatórios e pareceres aprovados das Partes 1, 2 e 3. Antes de mexer em qualquer coisa, rodei as suítes:

| Suíte | Antes desta rodada | Depois |
|---|---|---|
| `npm test` | 176/176 | **188/188** (22 s) |
| `npm run e2e` | 42/42 | **55/55** (100 s) |

Esta rodada entrega a Parte 4 e trata as pendências dos pareceres aprovados:

- fps no meio da rodada e no aperto;
- Cascudo;
- Difícil e Fácil (perfil "criança" escrito fora da IA, aperto do Fácil);
- itens menores da Parte 3.

Todos os testes no navegador usam Playwright e Chromium (em `/opt/pw-browsers`). Olhei de verdade as capturas nas 4 telas e também em 640×360 deitado.

## 1. Jogar no celular

### Controles de toque (`js/input/toque.js`, `js/input/botoes.js`, `css/toque.css`)

**Alavanca flutuante.** Ela nasce **onde o polegar encosta**, em qualquer ponto livre da **metade esquerda** da tela; no modo canhoto, da metade direita. Vale em cima da arena, na faixa de baixo ou sobre o placar quando o celular está deitado.

- **Zona morta:** 12 px.
- **Direções:** 4 bem definidas, com **histerese**. Para trocar de eixo, o outro eixo precisa ser 35% maior; na diagonal a direção não "treme".
- **Volta à zona morta:** usa 70% do raio, então o boneco não pisca na borda.
- **Arrasto além da borda (44 px):** a base **segue o dedo**. Mudar de direção nunca exige voltar ao centro antigo.
- **Em repouso:** fica um contorno claro no canto, que mostra à criança onde pôr o dedo.
- **Seta acesa:** a seta da direção atual acende.

**Botão de gota.** É redondo, azul, com **88 px** (80 px em telas baixas). Mostra a **contagem de gotas livres** e fica desbotado quando não há gota livre. Segurar e soltar faz a **Pinça** funcionar como no teclado.

**Botão do bichinho.** Tem 64 px (60 px em telas baixas) e mostra o ícone do bichinho montado. **Só aparece montado.**

- Fica translúcido durante a recarga.
- Fica azul-claro com a carapaça do Cascudo fechada.

**Posição dos botões:**

- **Em pé:** a gota fica no canto de baixo à direita e o bichinho à esquerda dela.
- **Deitado:** o bichinho fica em cima da gota, na coluna da direita.
- **Canhoto (inverter lados):** os botões vão para a esquerda e a alavanca para a direita. Deitado, o placar troca de lado e fica sob a alavanca.

**Onde trocar de lado:**

- em "Como jogar", com **Gota na mão esquerda**;
- na pausa, com **Trocar lados**.

A escolha fica guardada no aparelho (`localStorage`, campo `canhoto`) e é validada como as demais preferências.

**Quando os controles aparecem.** Aparecem quando o ponteiro principal do aparelho é de toque (`pointer: coarse`) ou no **primeiro toque de dedo** em qualquer aparelho. Com mouse, não aparecem. `?toque=1` força a interface, com o mouse movendo a alavanca, para testes; `?toque=0` esconde.

**Espaço reservado.** Há uma faixa de 104–116 px embaixo (em pé) ou ao lado (deitado). **A arena nunca fica sob os botões**, e há teste para isso.

**Toque múltiplo.** Um dedo controla a alavanca e cada botão tem o seu dedo; dedos a mais são ignorados. A lógica de "botão com borda" foi extraída para `botoes.js` e é a mesma do teclado: toque rápido não se perde, e segurado entrega um tick solto antes de reapertar. As duas entradas se somam.

**Como jogar** (`ui/menu.js`) agora fala de toque no celular:

- "Arraste o dedo na metade esquerda (ou direita) da tela para andar";
- "Toque no botão azul…";
- "Num bichinho? O botão branco…".

As figuras também mudam: alavanca e botões em miniatura. No teclado ganhou o passo do bichinho ("Shift usa o poder dele") e "setas ou WASD" (pendência da Parte 3). Deitado, o cartão usa 2 colunas e cabe sem rolar (`paisagem-02-como-jogar`).

### Retrato, paisagem e 360 px

Testei em 390×844, 844×390, 360×640, 640×360 e 768×1024. Em todas:

- a arena fica inteira na tela, com casa ≥ 18 px;
- não há rolagem;
- os botões não ficam sobre a arena.

Em 640×360 deitado:

- o painel ficou mais estreito (`min(240px, 26vw)`);
- os botões do topo ficam só com ícone;
- a barra fica compacta (`paisagem-pequena-04-alavanca`).

### Sem rolagem, zoom, seleção, menu de contexto nem puxar-para-atualizar

Isso já existia: `touch-action: none` e `user-select: none` no corpo, `overscroll-behavior: none` e menu de contexto cancelado. Acrescentei:

- **`touchstart` cancelado nas áreas de jogo** (não nos botões normais). Assim não há zoom com dois toques, lupa nem "copiar".
- **Eventos `gesturestart`, `gesturechange` e `dblclick` cancelados,** para a pinça do Safari no iPhone, que ignora `touch-action`.
- **`touch-action: pan-y` só nos cartões e no menu,** para eles poderem rolar caso falte altura.

O teste faz uma pinça de dois dedos e um arrasto no vazio e confere `visualViewport.scale === 1` e a ausência de rolagem.

**Teste medido do trajeto** (`navegador/toque.test.mjs`): com eventos de toque **de verdade** do Chromium (CDP `Input.dispatchTouchEvent`, que gera `pointerType: "touch"`), um roteiro de 8 trechos pela alavanca é comparado com os mesmos comandos dados direto pelo gancho noutra página.

- O resultado é **idêntico casa a casa**, depois de cada trecho.
- O trajeto anda mais de 3 casas e passa pelo "L" da largada, batendo em bloco e voltando.
- Soltar o dedo faz parar.

Outros testes cobrem:

- zona morta e diagonal com histerese;
- a alavanca nascendo no ponto do dedo;
- a base seguindo o dedo;
- a gota caindo na casa certa e a contagem de gotas;
- o botão do bichinho só montado, com alvos ≥ 56 px;
- toque múltiplo (2 dedos e um 3º ignorado);
- canhoto lembrado depois de recarregar.

## 2. Desempenho e peso

### Diagnóstico

Fiz perfil de CPU (`verificacao/p4r1/perfil.mjs`) e atribuição de custo com CSS injetado (`exp2.mjs`). Foram três causas:

1. **Aperto no desktop (38–41 fps).** O relógio pulsa no aperto, e ele estava **dentro do painel com `backdrop-filter`**. Cada quadro da animação refazia o desfoque. Sem o pulso ou sem o desfoque, o fps voltava a 60.
   - **Correção:** tirei o `backdrop-filter` do painel. Atrás dele só há o degradê parado do fundo, então o desfoque não aparecia. O vidro fosco continua nos cartões e no menu.
2. **IA do Difícil.** `camadasDeFuga` alocava arrays por camada, e `vizinhos` criava listas novas milhares de vezes por segundo.
   - **Correção:** vizinhança em tabela por mundo e memória reaproveitada no planejador.
   - **Resultado:** as mesmas 5 partidas de referência rodam em **24 s, antes 42 s**, com **impressões digitais idênticas**. A IA decide exatamente igual.
3. **Pixels do canvas no celular lento.** A 4× de CPU, com JavaScript a ~15 ms por quadro, ainda sobravam ~25 ms fora do JS, e esse resto **cresce com a densidade**:

   | Densidade | fps |
   |---|---|
   | 2× | 21 |
   | 1,5× | 29 |
   | 1× | 41 |

   - **Correção:** **densidade adaptativa** (`render/densidade.js`). Começa em até 2×. Se o quadro médio passa de 22 ms por 0,8 s de partida, desce **direto ao degrau que deve caber** (2 → 1,5 → 1,25 → 1, pela raiz da razão de tempos). Nunca sobe na mesma visita, para a imagem não "pulsar". A densidade aparece em `state.densidade` e pode ser fixada por `?densidade=`.

### Medido (`npm run desempenho`, 2 vezes; partida Difícil, semente 11, Jardim)

Janelas de 6 s, depois de 1,5 s de aquecimento:

| Cenário | Desktop 1280×720 | Celular lento (390×844, DPR 3, CPU 4×) |
|---|---|---|
| Começo | 60 / 60 | 47 / 43 (p95 33–50 ms) |
| Meio | 60 / 60 | 46 / 43 (p95 33–50 ms) |
| Aperto | 60 / 60 | 44 / 44 (p95 33–50 ms) |
| Menu | — | 32 / 38 |

No celular, a densidade se acomoda em 1–1,5×.

Também rodei **o script do próprio verificador** (`verificacao/v-p3r1/fps2.mjs`), no mesmo cenário dele. A janela é de 4 s e começa 0,5 s depois, então inclui a adaptação:

| | Antes (parecer da P3) | Agora |
|---|---|---|
| Desktop: começo / meio / aperto | 60 / 60 / 38 | **60 / 60 / 60** |
| Celular lento: começo / meio / aperto | 49 / 27 / 23 | **37 / 33 / 33** |

O orçamento da seção 3.1 está cumprido: 60 fps no desktop e ≥ 30 no celular de entrada emulado.

### Peso

- A pasta `bomberolho/` inteira tem **410 kB**. Sem a bancada (`ui/bancada.js` e `css/bancada.css`, que só vêm com `?ajuste=1`), são **401 kB**.
- O teste `peso` mede tudo o que a página baixa até a partida começar: fica **dentro de 600 kB**, sem nenhum pedido externo e sem a bancada.

### Memória (`npm run memoria`)

Foram 5 minutos de partidas seguidas: demo, tempo 8×, partida nova a cada resultado e volta pelo menu a cada 3. Em cada amostra, o lixo foi coletado à força antes de medir.

| s | 0 | 30 | 60 | 90 | 120 | 150 | 180 | 210 | 240 | 270 | 300 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Heap (MB) | 1,92 | 4,02 | 4,23 | 4,24 | 4,38 | 4,38 | 4,39 | 4,46 | 4,73 | 4,63 | 4,43 |
| Nós do DOM | 693 | 1250 | 1186 | 1170 | 1195 | 1251 | 1190 | 1207 | 1205 | 1251 | 1276 |
| Partidas | 0 | 3 | 5 | 8 | 11 | 14 | 16 | 20 | 23 | 26 | 28 |

- O heap fica num platô de 4,0–4,7 MB ao longo de 28 partidas, com variação de +0,41 MB entre 30 s e 300 s.
- Os ouvintes de evento ficam constantes em 57, e os nós do DOM oscilam sem crescer.
- **Sem vazamento.**

## 3. Robustez

Tudo coberto em `navegador/toque.test.mjs`:

- **Aba em segundo plano:** a partida pausa e **solta os dedos e as teclas**. Antes, um dedo na alavanca na hora em que a aba sumia deixava o boneco andando ao voltar.
- **Perda de foco da janela** (notificação, outra janela): pausa e solta as entradas.
- **Girar e redimensionar no meio da partida:** testei 5 tamanhos. A arena é refeita inteira na tela, sem rolagem, e a alavanca volta ao repouso.
- **Recarregar no meio da partida:** volta limpo, sem erro, com as preferências guardadas.
- **Toque múltiplo:** coberto (seção 1).
- **Console e rede:** zero erros, avisos e 404 em todas as capturas e testes.

## 4. Acessibilidade (`navegador/acessibilidade.test.mjs`)

- **Foco de teclado:**
  - O anel passou de azul translúcido (~1,9:1) para **#0B57C2 sólido, com 3 px e afastado 3 px**, acima de 3:1 sobre o fundo.
  - O teste percorre o menu com Tab e confere estilo, largura e contraste do anel.
  - Enter e Esc navegam os menus.
- **Contraste:**
  - O teste mede os textos principais e secundários dos cartões e do placar e exige ≥ 4,5:1.
  - Ele acusou o azul `#0071E3` sobre os fundos azul-claros: 4,3:1 em "Você sabia?", nos botões secundários e em "Rodada".
  - Esses textos passaram para `--azul-escuro`.
  - Também corrigi:

    | Elemento | Antes | Depois |
    |---|---|---|
    | Botão "Continuar" | verde #1FAA59 (3,0:1) | #147A3F (5,4:1) |
    | "Troféus para a taça" (dourado) | #B07D00 | #8A6200 |
    | Selo "cisco!" | #E2574C | #C0392B |
    | Relógio no aperto | #D23B30 | #B8302A |

- **Reduzir movimento:** sem animações de entrada nem pulsos (testado com `reducedMotion: 'reduce'`). Os controles de toque também ficam sem transição.
- **Alvos de toque:** os menus têm ≥ 44 px e os controles do jogo ≥ 56 px. O teste mede em 360×640.
- **Rótulos:** os botões de toque têm `aria-label` ("Soltar gota", "Poder do Saltinho"…) e ficam fora da ordem do Tab, porque quem usa teclado tem as teclas.

## 5. Limpeza e documentação

- Retirei a instrumentação temporária. O `grep` não acha `console.log`, TODO nem FIXME no jogo.
- Todos os módulos são importados.
- As exportações usadas só pelos testes (`clonarMundo`, `mapaDePerigo`, `avancar`, `DURACAO_QUEBRA`) são API de teste documentada.
- O gancho passou à versão `4.0.0-parte4`.
- **`README.md` completo:**
  - o que é e privacidade;
  - como rodar (`node dev-server.mjs --port 7200` → `/bomberolho/`) e como jogar (teclado e toque);
  - como testar, com as ferramentas de medição;
  - todos os parâmetros de URL, inclusive `?toque=` e `?densidade=`;
  - a bancada `?ajuste=1` e a estrutura;
  - **a integração da etapa 2, escrita para outro agente seguir:**
    - copiar só `bomberolho/` para `/<site>/bomberolho/`;
    - o que **não** copiar;
    - um link sugerido (`href="bomberolho/"` ou `/bomberolho/`);
    - não usar iframe;
    - como conferir: o que deve aparecer, console sem erros e rede sem 404;
    - os três motivos comuns de tela em branco.
  - Não há dados pessoais do dono.
- **Scripts novos no `package.json`:** `desempenho`, `memoria` e `capturas:p4`.

## 6. Pendências dos pareceres aprovados

### (a) fps no meio e no aperto

Resolvido (seção 2). O script do verificador mostra:

- desktop no aperto: de 38 para 60 fps;
- celular lento: de 27 para 33 no meio e de 23 para 33 no aperto.

### (b) Cascudo segurando a carapaça indefinidamente (P2 R2, M1)

- **Novas regras:**
  - A carapaça fecha na **borda** do botão.
  - Fica fechada enquanto o botão estiver apertado, **no máximo `duracaoCarapaca` = 1,5 s**.
  - Ao abrir, porque soltou ou porque cansou, o bichinho **descansa `recargaCarapaca` = 2,5 s**.
  - Segurar o botão não a fecha de novo.
- **Ajuste:** os dois valores estão em `sim/ajustes.js`, e a duração também na bancada.
- **IA:** o robô passou a fechar só quando o estouro está perto (`duracaoCarapaca − respingo − 8` ticks) e segura até o perigo passar.
- **Testes novos:**
  - "fecha no máximo 1,5 s e depois descansa";
  - "Cascudo num beco, botão segurado: defende uma gota, mas não duas seguidas". É o cenário `#1...2#` do parecer.
- **Uso no lote:** a defesa continua sendo usada, com 0,10 defesa por rodada no Médio e 0,07 no Difícil.

### (c) Fácil para criança e Difícil que se molha sozinho (P2 R2, M2 / M2b)

**Perfil "criança" escrito fora da IA** (`qa/lote/crianca.mjs`, sem importar nada de `js/ia/`):

- só enxerga o que a tela mostra:
  - a prévia listrada dos últimos 2 s;
  - a própria gota;
  - o respingo;
  - a casa marcada do aperto;
- foge pelo caminho mais curto, sem noção de tempo nem de cadeia;
- não passa na frente de gota no chão;
- solta uma gota de cada vez, só se houver esquina para se esconder, com 5% de distração;
- decide a cada 0,25 s, erra a direção 6% das vezes, pega tudo (até Cisco) e não usa poderes.

Ele entrou no lote como cenário `criança×facil`. Sozinho na arena, sem robôs, ele se molha com a própria gota em 7 de 40 minutos de jogo, ou seja, é **bem mais fraco** que o "novato" interno.

**O que mudou no Fácil:**

1. **Poupa a criança (`poupaHumano`):**
   - o robô do Fácil não solta gota cuja cruz pegue a casa dela ou uma vizinha;
   - não a escolhe para perseguir nem para atacar;
   - briga com os outros robôs.

   Isso não é trapaça: são as mesmas regras e a mesma leitura; muda só quem ele escolhe como alvo. Coberto por teste.
2. **Aperto suave no Fácil:** são as mesmas peças, a partir do mesmo 1:00, mas o aperto termina a 0:10 em vez de 0:20. As peças caem **~27% mais devagar**. Médio e Difícil não mudam. Coberto por teste.

**Experimento** (`verificacao/p4r1/facil-exp.mjs`, 48 partidas por linha, perfil "criança"):

| Variante do Fácil | Taças da criança | Rodadas | Empates | Quedas no aperto |
|---|---|---|---|---|
| Como na Parte 3 (sem poupar, aperto normal) | 2% | 5% | 11% | 18 |
| Poupa, aperto normal | 13% | 9% | 34% | 24 |
| **Poupa + aperto suave (adotado)** | **15%** | **11%** | **31%** | **10** |

**Lote completo da Parte 4** (`qa/lote/p4.md`, escala 0,5, 1 515 partidas, 0 NaN, 0 partida sem fim):

| | Parte 2 | Parte 4 |
|---|---|---|
| Novato × Fácil: taças | 92% | **98%** |
| Criança × Fácil: taças | (não havia) | **14,7% ± 5,7** (rodadas 10,9%) |
| Bom × Difícil: taças | 25–27% | 20,0% ± 6,4 |
| Novato × Médio: taças | 22% | 27,3% ± 7,1 |
| Misto: Difícil / Médio / cada Fácil | 66 / 32,5 / 0,2% | 62,9 / 35,0 / 0,4% |
| Auto-eliminação por rodada: Fácil / Médio / Difícil | 2,5 / 6,2 / 5,6% | 2,1 / 5,9 / 5,5% |
| mesmo:fácil, rodadas com vencedor | 78% | 83% |

**Difícil ≈ Médio (M2), tentativa honesta.** Implementei a sugestão do parecer como `preveRival`: o Difícil só soltava a gota se a fuga continuasse existindo com uma gota hipotética do rival vizinho na casa dele. Medi com 350 partidas:

| | Auto-eliminação do Difícil | Bom × Difícil (taças) |
|---|---|---|
| Com `preveRival` | 5,6% | 15,3% |
| Sem `preveRival` | 5,2% | 20,0% |

A regra **não baixou** a auto-eliminação (a diferença é ruído) e endureceu o Difícil sem motivo, por isso **retirei o código**.

O que domina as quedas do Difícil é "própria, em cadeia" (19% das quedas): uma gota rival que chega **depois** e detona a dele. A taxa absoluta continua baixa: 5,5% por rodada, e 3,4% de erro "puro". Ficou como limitação.

### (d) Itens menores da Parte 3

- **Pausar ativo depois do fim:** o botão fica **desligado** (cinza, `disabled`) no intervalo e no resultado. Há teste para isso.
- **"(ou W A S D)" quebrando em 360 px:** o texto virou "Ande com as setas ou WASD."
- **Curiosidades contadas por personagem sem ligação:**

  | Curiosidade | Contava | Agora conta |
  |---|---|---|
  | Ponto cego | Mácula | Lente (já conta do nervo óptico, que sai do olho no ponto cego) |
  | Lágrimas de riso | Mácula | Córnea |
  | Sobrancelhas | Lente | Cílio |
  | Bebês | Íris | Mácula (a visão de detalhe amadurece nos primeiros meses) |

## 7. Como testar

```bash
cd qa
npm test && npm run e2e            # 188 + 55
npm run desempenho                 # fps por momento (desktop e celular lento)
npm run memoria                    # 5 min de partidas, heap a cada 30 s
npm run capturas:p4                # qa/capturas/p4/ (5 telas, com toque)
node lote/simular.mjs --escala 0.5 --json lote/p4.json --md lote/p4.md   # ~25 min com 4 núcleos
node verificacao/p4r1/facil-exp.mjs 48                                     # criança × variantes do Fácil
node verificacao/v-p3r1/fps2.mjs   # o fps do verificador da parte 3
```

Para jogar com toque no computador: `http://localhost:7200/bomberolho/?toque=1&semente=7`. A alavanca nasce onde o mouse clicar, na metade esquerda.

**Capturas olhadas** (`qa/capturas/p4/`): 5 telas (`desktop`, `retrato`, `paisagem`, `pequeno` e `paisagem-pequena`) × menu, Como jogar, jogando, alavanca em uso, montado, pausa, canhoto e resultado.

## 8. Limitações conhecidas (honestas)

- **O Fácil ainda é difícil para o perfil "criança" externo.** Ela leva só ~15% das taças, e as quedas para robô continuam sendo a maioria. Pelos rastros, a causa principal é ficar entre duas cruzes, ou ter a própria gota detonada por cadeia, porque ela não prevê tempo nem cadeia. O perfil é deliberadamente pessimista; o "novato" interno ganha 98%. Medir com crianças de verdade é o próximo passo.
- **Mais empates por relógio no Fácil.** Com os robôs poupando a criança, ela sobrevive mais e as rodadas empatam mais por tempo: ~30% das rodadas no `criança×facil`, contra ~11% antes. Para quem perdia quase tudo, é melhor, mas a criança vê "Empate!" com frequência.
- **A auto-eliminação do Difícil continua ≈ à do Médio** (5,5% contra 5,9%). A tentativa foi medida e desfeita (ver 6c).
- **O fluxo do verificador da Parte 3** (`verificacao/v-p3r2/fluxo.mjs`) agora estoura o orçamento de 6 500 ticks em retrato. Não é defeito: com a semente sorteada, a 1ª rodada empatou e foi preciso uma 2ª. A cópia `verificacao/p4r1/fluxo-longo.mjs`, com orçamento maior, passa nas 4 telas: zero rolagem, zero botão fora da tela ou abaixo de 44 px. Os únicos avisos vêm do `getImageData` do próprio script e do falso positivo "texto cortado" do cartão, já explicado no parecer da P3.
- **Densidade adaptativa no celular lento emulado:**
  - Ela se acomoda em 1–1,25× e a imagem fica um pouco menos nítida. Num celular real, com GPU, o composto é bem mais barato do que no Chromium sem GPU deste ambiente, e a densidade deve ficar em 1,5–2×.
  - Nos primeiros ~0,8 s de partida lenta ainda há alguns quadros abaixo de 30 fps, antes da primeira descida.
- **O menu no celular lento fica em 32–38 fps** (p95 50–67 ms). É aceitável para um menu, mas não é 60.
- **Não testei em aparelho físico.** iPhone e Safari foram cobertos por código (eventos de gesto), mas não executados. Todo o toque foi emulado no Chromium, com eventos de toque reais via CDP.
- **Retina e Mácula em deuteranopia** (P3, baixa) não foram tratadas nesta rodada.

## 9. Arquivos

**Novos:**

- jogo:
  - `bomberolho/css/toque.css`;
  - `bomberolho/js/input/toque.js` e `bomberolho/js/input/botoes.js`;
  - `bomberolho/js/render/densidade.js`;
- QA:
  - `qa/lote/crianca.mjs`, `qa/lote/p4.md` e `qa/lote/p4.json`;
  - `qa/navegador/toque.test.mjs`, `qa/navegador/acessibilidade.test.mjs`, `qa/navegador/capturas-p4.mjs` e `qa/navegador/memoria.mjs`;
  - `qa/sim/toque.test.mjs` e `qa/sim/parte4.test.mjs`;
  - `qa/verificacao/p4r1/`: `perfil.mjs`, `exp2.mjs`, `picos.mjs`, `facil-exp.mjs` e `fluxo-longo.mjs`;
- relatório: `reports/parte-4-rodada-1.md`.

**Alterados:**

- raiz: `README.md`;
- `bomberolho/index.html`;
- CSS: `bomberolho/css/estilo.css` e `bomberolho/css/menu.css`;
- `bomberolho/js/`:
  - `main.js`, `jogo.js`, `gancho.js` e `parametros.js`;
  - `input/teclado.js`;
  - `ui/`: `menu.js`, `avisos.js`, `hud.js` e `preferencias.js`;
  - `dados/curiosidades.js`;
  - `ia/`: `caminhos.js`, `perigo.js`, `robo.js` e `taticas.js`;
  - `sim/`: `ajustes.js`, `aperto.js`, `bichinhos.js`, `constantes.js`, `jogadores.js` e `mundo.js`;
- QA:
  - `qa/package.json`;
  - `qa/lote/cenarios.mjs` e `qa/lote/partida.mjs`;
  - `qa/navegador/apoio.mjs` (função `dedo`) e `qa/navegador/desempenho.mjs` (3 momentos, 2 vezes);
  - `qa/navegador/jogo.test.mjs`: o hash Node × navegador agora usa o aperto suave, porque a partida padrão é Fácil;
  - `qa/navegador/parte3.test.mjs`: "Como jogar" tem 6 passos;
  - `qa/sim/bichinhos.test.mjs` e `qa/sim/parametros.test.mjs`.
