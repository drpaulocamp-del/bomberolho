# Parecer do verificador — Parte 4 (Celular e acabamento), rodada 2

Verificador independente e novo. Li inteiros o `PLAN.md` e o `CLAUDE.md`. No plano, li com atenção as seções 1, 2 e 3 (inclusive 3.1, 3.5, 3.8 e os aceites do dono em 3.9), 4, 7 e a rubrica e os bloqueadores da seção 8. Li também os dois relatórios desta rodada (`reports/parte-4-rodada-2.md` e `reports/parte-4-rodada-2-ajudante.md`) e o parecer da rodada 1.

Não confiei nos relatórios. Fiz quatro coisas:

- rodei as suítes;
- escrevi **14 scripts próprios** em `qa/verificacao/v-p4r2/`;
- joguei com dedos emulados de verdade (CDP `Input.dispatchTouchEvent`, contexto `hasTouch`/`isMobile`), em tempo real;
- olhei as capturas, que estão em `qa/capturas/v-p4r2/` (ignorada pelo git, junto com as saídas `.out`).

Apliquei a seção 3.9:

- **Fácil e IA:** não entram como desconto.
- **Celular emulado:** basta, porque os relatórios dizem com honestidade que não houve aparelho físico.

| Script | O que mede |
|---|---|
| `alcance.mjs` | todo botão visível: inteiro, não cortado, centro clicável, ≥ 44/56 px, sem sobreposição; 11 telas × 8 estados |
| `trajeto.mjs` | trajeto planejado pela grade, executado por toque em tempo real, conferido casa a casa (8 telas × 2 modos, com tremor de 1, 5 e 8 px) |
| `gestos.mjs` | zona morta, bordas, diagonal, virada, viradas indesejadas, gota, os 3 bichinhos, canhoto, gestos do navegador no jogo e nos menus |
| `cdp-dedos.mjs`, `multitoque.mjs` | toque múltiplo soltando um dedo de cada vez |
| `fps.mjs` | fps em cenários diferentes dos do executor (Caverna/Médio e Vale/Difícil), 4 aparelhos × 4 momentos |
| `memoria.mjs`, `sonda-relogio.mjs` | 5 min de jogo com toque, 14 giros de tela e pausas |
| `peso.mjs` | primeira carga e rede |
| `robustez.mjs` | segundo plano, foco, girar com o dedo na tela, redimensionar, recarregar |
| `teclado.mjs`, `teclado-som.mjs` | fluxo só com teclado em 1280×720, trajeto com setas e botões do painel pelo teclado |
| `contraste.mjs` | contraste do texto em 7 telas |
| `integracao.mjs` | o passo a passo da etapa 2 do README, seguido numa cópia servida em subcaminho |

## Suítes

| Suíte | Resultado | Tempo |
|---|---|---|
| `npm test` | **189/189** | 20 s |
| `npm run e2e` | **58/58** | 214 s |

- **Console e rede:** zero erros, avisos e 404 em todos os meus scripts.
- **Partes 1–3:** nenhuma regressão. As suítes antigas continuam todas verdes, e as capturas de jogo, menu, pausa e resultado mantêm a qualidade aprovada na Parte 3.

## 1. Jogar no celular (medido)

### Nenhum controle cortado ou inalcançável (`alcance.mjs`)

**Onde:** 11 combinações de tela.

- Com toque: 390×844, 844×390, 740×360, 915×412, 360×640, 1024×768, 1280×800 e 768×1024.
- Sem toque: 1280×720, 360×640 e 1024×768.

**Em que estados:** 8 estados em cada uma.

1. menu;
2. "Como jogar";
3. escolha de personagem (Cristalino, o nome mais longo);
4. escolha de arena;
5. partida com o bichinho montado;
6. pausa;
7. faixa de eliminado;
8. resultado.

**O que confere em cada botão visível:**

- está inteiro na tela;
- não é cortado por ancestral com `overflow`;
- `elementFromPoint` no centro acerta o próprio botão;
- tem pelo menos 44 px, ou 56 px nos controles de toque;
- os controles de toque não ficam sobre a arena nem sobre outros botões;
- não há rolagem do documento.

**Resultado:** **88/88 "ok"**.

**Botão de som:**

| Tela | Largura | Captura |
|---|---|---|
| 740×360 | 53 px | `alc-740x360t-jogando-montado.png` |
| 1024×768 | 65 px | `alc-1024x768t-jogando-montado.png` |

Ele fica inteiro e lado a lado com Pausar e Sair, e o B1 da rodada 1 está resolvido. O painel deitado com *container query* ficou elegante: três botões só com ícone, do mesmo tamanho.

### Trajeto por toque reproduz o esperado (`trajeto.mjs`)

**Como montei o teste:**

- Procurei entre 400 sementes o caminho mais "curvo" a partir de (1,1). O resultado foi a semente 112, com o trajeto `1,1 > 1,2 > 1,3 > 2,3 > 3,3 > 3,2` e 2 curvas (o "L" livre não permite mais do que isso).
- Os robôs ficaram parados.
- Executei o trajeto em tempo real de dois jeitos:
  - **rolando** o polegar sem tirá-lo da tela, num arco para a direção nova;
  - **levantando** o dedo a cada trecho.
- Durante o caminho, o polegar tremia de 1 px.

| Tela | Rolando | Levantando | Tempo | Desvio lateral máx. |
|---|---|---|---|---|
| 390×844, 844×390, 740×360, 915×412, 360×640, 1024×768, 1280×800, 768×1024 | **8/8 idêntico** | **8/8 idêntico** | 2,0–2,3 s | 0–0,15 casa |

- Parou sempre no centro da casa final (3,5; 2,5).
- Com tremor perpendicular de **±5 e ±8 px** (390×844), o trajeto continua idêntico nos dois modos.
- Pelo teclado (1280×720), com setas e WASD, o mesmo trajeto também sai idêntico.

### Gestos (`gestos.mjs`), iguais nas 8 telas com toque

| Verificação | Resultado |
|---|---|
| Zona morta | dedo 9 px fora do centro por 0,6 s → direção vazia, **0 casa** |
| Polegar parado a **2 px** da borda de baixo, da esquerda e no canto, com tremor de 1 px | direção vazia, **0 casa**. A alavanca é desenhada inteira dentro da tela, e um empurrão de 30 px para dentro anda na hora. O M1 da rodada 1 está resolvido. |
| Diagonal (22, 26) tremendo ±3 px | só "baixo", **0,00** de desvio lateral |
| Virada com a alavanca toda inclinada: escorregão de 20 px | "baixo" → **"dir"**. O M5 da rodada 1 está resolvido. |
| Deriva lenta de 24 px em 1,2 s segurando "baixo" | continua "baixo" (não vira) |
| Puxar o polegar de volta para parar | "baixo" → "" → "cima" só depois de cruzar o centro (não dá meia-volta antes) |
| Botão de gota (80–88 px) | gota em (1,1); a contagem passa de "1" para "0" |
| **Os 3 bichinhos pelo botão de poder** (60–64 px, `aria-label` com o nome) | **Cascudo:** carapaça fecha (`escudo: true`). **Disparada:** arrancada até (2,5). **Saltinho:** pula pelo ar (`noAr: true`) de (1,5; 2,6) para (1,5; 4,5). Ver a nota abaixo. Sem bichinho, o botão some. |
| Canhoto pelo "Como jogar" | `aria-pressed=true`; depois de **recarregar** continua canhoto. Gota à esquerda; a metade esquerda não move (0) e a direita move (1,15 casa); polegar parado na borda direita → 0. "Trocar lados" na pausa volta ao destro. |
| Pinça de dois dedos, arrasto do topo (puxar para atualizar), dois toques rápidos e toque longo de 1,1 s num texto: no jogo, no menu inicial e na escolha de personagem | `visualViewport.scale = 1`, rolagem 0/0, seleção vazia, 0 `contextmenu` que passasse, página não recarregou |

**Nota sobre o Saltinho.** Eu esperava que ele pousasse em (3,2), depois do pilar. Em vez disso, ele pulou para baixo, de (1,2) para (1,4), porque a direção registrada era a do último movimento. O meu posicionamento por `input` virou para a direita por um único tick, o que não bastou para mudar `dir`. Isso é do meu roteiro, não do jogo. O salto pelo botão de toque funciona (`noAr: true`), e as regras do salto já têm teste na suíte desde a Parte 2.

### Toque múltiplo (`multitoque.mjs`)

**Cuidado com a ferramenta.** No CDP, `touchEnd` com uma lista de pontos solta **os dedos listados**. Medi isso em `cdp-dedos.mjs`. O comentário de `qa/navegador/apoio.mjs:77–78` diz o contrário ("a lista dos dedos que continuam na tela"). Na primeira versão do meu `gestos.mjs` isso me deu um falso "parou de andar". Refiz a medição do jeito certo, em 4 telas:

| Sequência | Resultado |
|---|---|
| Dedo 1 andando para baixo, dedo 2 na gota, dedo 3 arrastando do lado da alavanca | a direção continua "baixo"; o dedo 3 é ignorado |
| Só o dedo da gota sai | a direção continua "baixo" e o boneco **anda +0,38 a +0,44 casa em 120 ms** |
| Sai o dedo 3 | a direção continua "baixo" |
| Sai a alavanca | para (0) |
| Alavanca sai primeiro e a gota fica segurada | o boneco para e o botão fica `apertado` até o dedo sair |

## 2. Desempenho e peso

**Peso** (`peso.mjs`, CDP `encodedDataLength`):

| Entrada | Peso | Pedidos | Externos |
|---|---|---|---|
| Menu ou jogo direto | **416,8 kB** | 52 | 0 |
| Com `?ajuste=1` | 426,2 kB | 54 | 0 |

- O orçamento de 600 kB é cumprido com folga.
- Sem `?ajuste=1`, a bancada não é baixada, como diz o README.

**fps** (`fps.mjs`). Cenários diferentes dos do executor; "estável" é a janela de 5 s depois de 1,5 s de acomodação.

| Aparelho | Caverna/Médio (começo · meio · aperto · aperto fim) | Vale/Difícil |
|---|---|---|
| Desktop 1280×720 | 60 · 60 · 60 · 60 (mín. de 500 ms ≥ 58) | 60 · 60 · 60 · 60 |
| 390×844, DPR 3, CPU 4× | 47 · 59 · 51 · 54 (mín. 34–54) | 53 · 42 · 45 · 54 (**mín. 24** no meio) |
| 740×360, DPR 3, CPU 4× | 51 · 55 · 52 · 56 (mín. 35–37) | 55 · 50 · 50 · 54 (mín. 32–46) |
| 360×640, DPR 2, CPU 6× (mais duro que o plano) | 42 · 44 · **32** · 38 (mín. 20–28) | 48 · **27 · 27** · 41 (mín. 16–28) |

- **Desktop:** 60 fps cravados.
- **Celular de entrada (CPU 4×, a mesma régua das rodadas anteriores):** média de 42 a 59 fps em todos os momentos, inclusive no aperto. Melhor que os 34–35 que o verificador da rodada 1 mediu no aperto.
- **Ainda há buracos transitórios abaixo de 30 fps:**
  - 18–29 fps em janelas de 0,5 s, nos 1,5 s "frios" depois de saltar de momento;
  - uma vez no meio de Vale/Difícil.
- **CPU 6×** fica abaixo de 30 fps no Vale/Difícil.

**A ferramenta oficial** (`npm run desempenho`, rodada por mim) agora chega mesmo a cada momento: o relógio, de 114 a 37 s, é impresso como prova, e termina com código 0. O M2 da rodada 1 está resolvido. Os números dela batem com os meus:

| Momento | Média | Pior janela de 500 ms |
|---|---|---|
| Começo, estável | 39 fps | 18 fps |
| Meio | 45 fps | 29 fps |
| Aperto | 42 fps | 24 fps |
| Entrada no aperto, 2 s após ligar | 43 fps | 24 fps |
| Menu | 36 fps | 24 fps |

O relatório do ajudante registra esses mínimos com honestidade.

**Memória** (`memoria.mjs`): 5 min em 390×844 com toque, demo no Médio a 2–3×, **14 giros de tela** e pausas a cada 45 s.

- Heap depois da coleta de lixo: 3,58 a 4,16 MB entre 30 e 270 s.
- Ouvintes: **57 constantes**.
- Nós do DOM: 1 145 a 1 386, sem tendência.
- **Sem vazamento.**

Ressalva: nessa janela nenhuma partida chegou ao resultado. O relógio anda (conferido em `sonda-relogio.mjs`), mas as rodadas terminaram empatadas ou a partida ainda não tinha acabado. A série com muitas partidas está no relatório do executor e no parecer da rodada 1, e é coerente com a minha.

## 3. Robustez (`robustez.mjs`)

| Situação | Resultado |
|---|---|
| Aba escondida durante a contagem | `pausado`, contagem congelada em 3 e relógio parado em 120 por 1,5 s escondida |
| Ao voltar | continua pausada (a criança escolhe continuar) |
| Dedo segurando "baixo" quando a aba some | pausa; ao continuar, o boneco **não** anda sozinho (0) |
| Perda de foco com a seta ↓ presa | `pausado` |
| Girar 390×844 → 844×390 com o dedo na alavanca | alavanca em repouso; o boneco não anda sozinho (0); a arena cabe |
| Redimensionar 360×640 → 768×1024 → 640×360 → 1280×720 → 1024×768 → 390×844 | a arena fica dentro da tela e sem rolagem em todas |
| Resultado com a aba escondida e mostrada de novo | continua no resultado, sem quebrar |
| Recarregar no meio da partida | volta limpo, sem erro |

- **Segundo plano real:** abrir outra aba e pô-la na frente com `bringToFront` não muda `visibilityState` no Chromium sem janela (continua `visible`). Por isso o segundo plano foi provado pelo evento `visibilitychange`, como nas rodadas anteriores.
- **Código:** `main.js:304–314` pausa com a aba escondida e ao perder o foco, e solta as entradas. `nucleo/relogio.js` limita o quadro a 250 ms, então não há avalanche de ticks na volta.

## 4. Acessibilidade

| Item | Resultado |
|---|---|
| **Teclado, 1280×720** (`teclado.mjs`) | fluxo menu → personagem (setas) → Próximo → arena → Começar! inteiro pelo teclado. O foco é sempre visível: contorno sólido de 3 px, `#0B57C2`. P pausa, o foco vai para "Continuar", Tab percorre Recomeçar e Menu, e Esc volta ao jogo. |
| **Contraste** (`contraste.mjs`, fundos translúcidos compostos) | nenhum texto abaixo de 4,5:1 (ou 3:1 em texto grande) no menu, na ajuda, nas escolhas de personagem e arena, no jogo, na pausa e no resultado |
| **Reduzir movimento** | 0 animações CSS rodando |
| **Alvos** | ≥ 44 px em toda a interface; gota com 80–88 px, bichinho com 60–64 px, alavanca com 112 px |
| **Desconto** | ver a melhoria M2 (botões do painel pelo teclado durante a partida) |

## 5. Limpeza, README, integração e originalidade

### Código do jogo

- Sem `console.log`, `debugger`, TODO nem FIXME.
- Todos os módulos são importados.
- O `toque.js` novo é claro e bem comentado. A virada é uma função pura (`viradaPeloMovimento`), testada em Node, e o desenho preso na tela é separado do centro lógico.

### Repositório

- O `qa/lote/p4.json` e os outros ~9 MB de JSON gerado saíram do índice.
- Os `.gitignore` foram conferidos, e o M3 está resolvido.
- O `npm run capturas` voltou a funcionar.

### README, conferido comando a comando

| Item | Conferência |
|---|---|
| Instalação numa máquina nova | inclui `npx playwright install chromium` (M4 resolvido) |
| Tempos das suítes | batem com o que medi |
| `npm run desempenho` | a descrição bate com o que a ferramenta faz |
| Parâmetros de URL e métodos do gancho | conferem |

### Integração da etapa 2: segui o README sozinho (`integracao.mjs`)

1. Copiei a pasta com `cp -R bomberolho <site>/` e também para `<site>/jogos/`.
2. Pus na raiz do site uma página com o link sugerido.
3. Servi tudo com `python3 -m http.server`.
4. Entrei pelo link e também direto por `/jogos/bomberolho` (com e sem barra no fim).

**Em todos os casos o jogo abriu, e o fluxo Jogar → Próximo → Começar! chegou a `jogando`:**

- 52–53 pedidos;
- 0 externos;
- 0 erros;
- 0 respostas 404 no log do servidor.

Outro agente consegue fazer a integração sem ajuda.

### Originalidade (seção 2)

- Nenhum nome de terceiros no jogo, no README ou nos relatórios.
- Nenhuma URL externa nem `fetch`, cookie ou beacon.
- Arte e som feitos por código.
- **Respeitada.**

## 6. Itens do parecer da rodada 1

| Item | Situação (medida por mim) |
|---|---|
| **B1:** som cortado em paisagem com toque e em tablets | **resolvido:** 88/88 telas e estados sem nada cortado |
| **M1:** movimento fantasma e empurrão perdido nas bordas | **resolvido:** 0 casa a 2 px da borda; empurrão do contorno anda |
| **M2:** `npm run desempenho` não media o meio nem o aperto | **resolvido:** o relógio prova cada momento |
| **M3:** JSON gerado versionado | **resolvido** |
| **M4:** README sem instalar o Chromium | **resolvido** |
| **M5:** virada lenta com a alavanca toda inclinada | **resolvido:** 20 px viram |
| **M6:** troféu cortado, "Rodada 1" em duas linhas, contorno sobre o placar | **resolvido:** Cristalino com 3 troféus desce de linha em 360 px; "Rodada 1" numa linha em 740×360; o contorno some deitado depois do primeiro uso |
| Retina × Mácula em deuteranopia (pendência baixa da Parte 3) | continua sem tratamento; declarado |

---

## Bloqueadores

Nenhum.

## Melhorias priorizadas

### M1 (média) — Folga de fps no celular lento

**Medido:**

- CPU 4×: média de 42–59 fps, mas mínimos de 0,5 s em 18–29 fps:
  - nos 1,5 s "frios";
  - na entrada no aperto (`npm run desempenho`: 24 fps);
  - uma vez no meio de Vale/Difícil (24 fps).
- 360×640 com CPU 6×: 27 fps de média no Vale/Difícil (meio e aperto).

**Leitura:** o plano ("≥ 30 fps estáveis em celular de entrada") é cumprido na média com a régua de CPU 4×, mas sem margem para um aparelho mais fraco. Nesta rodada, nada foi otimizado no renderizador.

**Sugestão:**

- partir com densidade 1 quando `devicePixelRatio × área` for grande e o primeiro segundo for lento, em vez de começar em 2× e descer;
- pré-rasterizar a peça do aperto e não refazer o fundo estático a cada queda;
- no Vale, conferir o custo dos cones e bastonetes animados.

### M2 (baixa-média) — Botões do painel pelo teclado durante a partida

**Medido** (`teclado-som.mjs`): Tab dá foco visível a Som e Sair durante o jogo, mas:

- **Enter** nesses botões não faz nada: `mudo` continua `false` e a partida continua;
- **Espaço** solta uma gota.

**Causa:** `input/teclado.js:30–31` só deixa Enter e Espaço para o botão em foco quando não se está jogando. Com o teclado, o som e a saída só são alcançáveis passando pela pausa (P → Tab → Som ou Menu), o que funciona.

**Sugestão:**

- deixar Enter acionar o botão em foco também durante o jogo, mantendo Espaço para a gota;
- ou tirar os botões do painel da ordem de Tab durante a partida;
- e/ou criar a tecla **M** para o mudo.

### M3 (baixa) — Virada indesejada com polegar "nervoso"

**Medido** (`gestos.mjs`, nas 8 telas): segurando "baixo" com o polegar além do raio, uma oscilação lateral de **±8 px** (~12 Hz) vira para "dir".

- Ela também fica presa em "dir", porque a base é reposicionada.
- Com ±5 px, não vira.
- No trajeto real com tremor de ±8 px, nada se perdeu (8/8 idêntico).

**Por que acontece:** `viradaPeloMovimento` compara a posição atual com a mais antiga da janela de 200 ms, e uma oscilação conta como escorregão.

**Sugestão:** exigir movimento monotônico na janela (todos os passos no mesmo sentido lateral) ou subir `VIRADA` para ~20 px.

### M4 (baixa) — Documentação da ferramenta de toque

`qa/navegador/apoio.mjs:77–78` descreve `touchEnd` ao contrário: no CDP, a lista são os dedos que **saem**, como provei em `cdp-dedos.mjs`. Hoje nenhum teste usa a forma parcial, mas o próximo agente vai se enganar. Basta corrigir o comentário. Se quiser, dá para acrescentar à suíte o caso "solta só o dedo da gota e continua andando" (`multitoque.mjs` serve de modelo).

### M5 (baixa) — Detalhes visuais

- **Contorno da alavanca em repouso deitado:** fica sobre o cartão de Retina até o primeiro uso, inclusive na pausa (`alc-844x390t-pausado.png`). É intencional e some depois de usado.
- **Etiqueta "Você":** o ícone do item recém-pego cobre a letra "o" por alguns instantes (`zoom-voce.png`).

## Nota pela rubrica

| Item | Peso | Nota | Por quê |
|---|---|---|---|
| Jogar no celular | 35 | **33** | Trajeto por toque idêntico casa a casa em 16/16 execuções (8 telas × rolando e levantando), também com tremor de ±8 px. Zona morta e bordas sem movimento fantasma. Virada de 20 px. Os 3 bichinhos pelo botão, toque múltiplo correto soltando um dedo de cada vez, canhoto lembrado e reversível. Nenhum controle cortado em 88 combinações; nenhuma rolagem, zoom, seleção, menu de contexto ou puxar-para-atualizar, nem no jogo nem nos menus. **Desconto:** virada indesejada com oscilação de ±8 px (M3). |
| Desempenho e peso | 20 | **16** | 417 kB, 0 externos; 60 fps cravados no desktop; celular CPU 4× com média de 42–59 fps em todos os momentos; sem vazamento; ferramenta oficial corrigida e honesta. **Desconto:** mínimos transitórios de 18–29 fps e CPU 6× abaixo de 30 no Vale/Difícil, sem otimização nesta rodada (M1). |
| Robustez | 20 | **19** | Pausa com a aba escondida (também na contagem) e ao perder o foco; entradas soltas; girar com o dedo na tela; redimensionar; recarregar; resultado em segundo plano. **Desconto:** não dá para provar o segundo plano real no Chromium sem janela. |
| Limpeza e documentação | 15 | **14** | Código limpo e bem comentado; repositório enxuto; README completo, com a integração da etapa 2 seguida por mim sem ajuda e funcionando em raiz e subpasta. **Desconto:** comentário errado em `apoio.mjs` (M4). |
| Acessibilidade | 10 | **8** | Foco forte e visível, fluxo inteiro pelo teclado, contraste ok, reduzir movimento, alvos grandes. **Descontos:** Enter e Espaço não acionam os botões do painel durante o jogo (M2); deuteranopia Retina × Mácula ainda pendente. |
| **Total** | 100 | **90** | |

## Fiquei impressionado? **Sim**

O que faltou na rodada 1 foi resolvido, e o resultado supera a lista:

- **O executor foi além do parecer.** Achou sozinho o mesmo defeito no desktop pausado ("Continuar" empurrando o som) e mediu 8 personagens × troféus × 9 telas, em vez de só o caso citado.
- **Os testes novos pegam o defeito antigo.** O `telas.test.mjs`, com 14 telas e 5 estados, falha contra o CSS antigo. A minha auditoria independente, com outras telas e outros estados, deu **88/88 sem nada cortado**.
- **O toque ficou de console.** O polegar descansando na borda não mexe o boneco, a virada rolando o polegar funciona, e um trajeto com curvas sai **idêntico casa a casa em todas as 16 execuções** por toque, nas 8 telas, inclusive com o polegar tremendo. Para uma criança na sala de espera, esse é o produto.
- **Os números são honestos.** A ferramenta de desempenho agora prova o momento que mede, e o relatório mostra os mínimos ruins em vez de escondê-los.
- **A integração funciona.** Segui o README de olhos fechados e o jogo abriu limpo numa subpasta de um "site".

Fica a folga de fps em aparelho mais fraco (M1) como a melhoria mais valiosa para a avaliação do todo.

NOTA: 90
IMPRESSIONADO: sim
BLOQUEADORES: 0
VEREDITO: APROVADO
