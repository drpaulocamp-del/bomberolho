# Bomberolho — plano de construção (documento compartilhado por todos os agentes)

Leia este arquivo inteiro antes de fazer qualquer coisa. Ele é a fonte da verdade.

## 1. O que o dono pediu

O Dr. Paulo (oftalmologista, Hospital Dia Goianésia/GO) quer um jogo para as **crianças jogarem no navegador do celular enquanto esperam a consulta**. Ele tem carinho pelos jogos clássicos de "soltar bombas em labirinto" dos anos 90 e pediu um jogo **novo**, chamado **Bomberolho**, que:

- aproveite **a física e a mecânica clássicas do gênero** (grade, bombas com pavio, explosão em cruz, reação em cadeia, blocos destrutíveis, power-ups, batalha em arena);
- tenha **personagens e cenários com nomes e visual inspirados na oftalmologia**;
- tenha **estética e cores próprias** — nada pode parecer cópia de um jogo existente.

Decisões do dono (não rediscutir):

- **Só o modo Batalha**: 1 jogador humano contra 3 adversários controlados pelo computador, em arena. Sem modo aventura/fases.
- **Etapa 1 (este plano):** jogo completo e testável sozinho. **Etapa 2 (futura, fora deste plano):** o dono testa e depois pede a integração ao site da clínica. Não mexer em site nenhum agora; só deixar o jogo pronto para ser copiado para `/<site>/bomberolho/`.
- Método: cada parte é feita por um **subagente executor** e avaliada por um **subagente verificador independente**, em ciclo, até **nota ≥ 85/100, zero bloqueadores e verificador impressionado**. Depois, o mesmo critério para o todo.

## 2. Regra de originalidade (bloqueador em qualquer parte)

- **Nenhum arquivo, sprite, música, efeito sonoro, mapa de fase, nome de personagem ou texto de jogo de terceiros.** Não há ROM neste repositório e nenhuma deve ser baixada, lida ou referenciada.
- Regras gerais do gênero (grade, pavio, cruz, cadeia, power-ups) são livres e devem ser implementadas do zero. **Aparência, nomes, músicas e layouts são criação própria.**
- Os personagens **não** podem lembrar o herói clássico do gênero (boneco branco de capacete com antena, cinto e luvas rosa). Aqui eles são criaturinhas-olho originais (ver 3.6).
- Não usar a palavra "Bomberman" nem nomes de empresas/jogos de terceiros em código, textos, metadados ou relatórios públicos do jogo.
- Sem fontes, bibliotecas ou imagens baixadas da internet. Tudo desenhado por código (Canvas/SVG) ou criado no próprio repositório.

## 3. Decisões de projeto (já tomadas — não rediscutir)

### 3.1 Arquitetura
1. O jogo vive em `bomberolho/` (entrada `bomberolho/index.html`). **100% estático, zero dependências em tempo de execução, zero build**, ES modules nativos em `bomberolho/js/`, **caminhos relativos** (vai rodar em uma subpasta do site). Sem `fetch` para API, sem login, sem cookies, sem analytics, sem coleta de dados (público infantil). `localStorage` só para preferências (mudo, dificuldade, personagem) e placar local.
2. **Simulação separada da apresentação.** `js/sim/` é JavaScript puro, determinístico, com passo fixo (60 Hz) e gerador aleatório com semente, sem tocar em DOM/Canvas/tempo real — tem de rodar em Node para testes. `js/render/`, `js/ui/`, `js/audio/`, `js/input/` consomem o estado da simulação.
3. Renderização em **Canvas 2D**, arte **procedural** (desenhada por código, pré-rasterizada em canvases fora da tela), nítida em qualquer densidade de pixels. Estilo: ilustração "fofa" e limpa, contorno suave, cores vivas, sem pixel-art copiada.
4. **Gancho de teste obrigatório** `window.__bomberolho`: `state` (tela atual, rodada, tempo, grade, jogadores com posição/vida/poderes, bombas, explosões, itens), `start({personagem, arena, dificuldade, semente, rodadas})`, `setTimeScale(n)`, `input(jogador, {cima,baixo,esq,dir,bomba})`, `step(n)`, `demo(true)` (humano no piloto automático). Parâmetros de URL equivalentes (`?arena=`, `?dificuldade=`, `?semente=`, `?demo=1`).
5. Testes: `qa/` contém testes da simulação com `node --test` (sem dependências) e testes de navegador com Playwright (única dependência permitida, só de desenvolvimento, isolada em `qa/package.json`). Servidor local: `node dev-server.mjs --port <porta>` → `http://localhost:<porta>/bomberolho/`.
6. Orçamento: primeira carga ≤ **600 kB**; 60 fps em desktop; jogável (≥ 30 fps estáveis) em celular de entrada.

### 3.2 Regras clássicas a reproduzir (o "sentir" do gênero — é o coração do pedido)
- **Grade** de 13×11 casas jogáveis (15×13 com a moldura). Pilares indestrutíveis fixos nas casas de linha e coluna pares; blocos destrutíveis sorteados (≈ 75–80% das casas livres), **sempre** deixando o "L" de 3 casas livre em cada canto de largada.
- **Movimento** contínuo (não casa a casa), com **deslize de quina**: ao empurrar contra um pilar estando levemente desalinhado, o personagem escorrega para o corredor. Sem isso o jogo fica travado — é item crítico da rubrica.
- **Bomba** (aqui: "gota de colírio", ver 3.6) é posta **centrada na casa** do personagem; ele pode sair de cima dela, mas depois ela vira obstáculo sólido para todos. Pavio ≈ 2,5–3 s (ajustar pelo sentir). Limite de bombas simultâneas por jogador.
- **Explosão em cruz** com alcance em casas: para em pilar; destrói o **primeiro** bloco destrutível de cada braço e para; atravessa casas vazias; dura ≈ 0,5 s e é letal durante todo esse tempo; **detona na hora** outras bombas atingidas (reação em cadeia); **destrói itens** expostos.
- **Itens** aparecem sob parte dos blocos destruídos (≈ 30–35%). Conjunto mínimo: +1 bomba, +1 alcance, +velocidade, **chute** (empurrar a bomba ao andar contra ela: ela desliza até bater em algo) e um item raro de **alcance máximo**. Um item "azar" temporário e inofensivo-engraçado (ex.: controles lentos ou soltar bombas sem querer por alguns segundos) é bem-vindo. Limites máximos por atributo.
- **Batalha**: 4 competidores nos 4 cantos; quem for atingido sai da rodada; último de pé vence a rodada; empate se todos caírem juntos ou o tempo acabar. Rodada de 2:00; no último trecho, **aperto final**: blocos indestrutíveis caem em espiral de fora para dentro, encolhendo a arena. Partida = primeiro a ganhar N rodadas (padrão 2; opções 1–3).
- Largada com contagem "3, 2, 1, já!" e breve invulnerabilidade? **Não** — sem invulnerabilidade na batalha; a segurança vem do "L" livre e de os robôs não atacarem nos primeiros segundos no nível fácil.

### 3.3 Adversários (IA)
Três níveis. **Fácil** (padrão): uma criança de 6 anos tem de conseguir ganhar partidas; os robôs andam, abrem blocos, pegam itens, às vezes se atrapalham sozinhos, e raramente perseguem. **Médio**: fogem de explosões com competência, encurralam de vez em quando. **Difícil**: leem o perigo com antecedência (mapa de perigo com tempo), usam cadeia e chute, quase nunca se matam sozinhos. Em todos: nunca ficar parado sem motivo, nunca "trapacear" (mesmas regras e mesma leitura de estado que o humano tem).

### 3.4 Público e tom
- Crianças de ~5 a 12 anos numa sala de espera, em celular, muitas vezes sem som. **Tudo em português do Brasil**, frases curtas, tom leve e acolhedor.
- **Sem violência gráfica**: ninguém "morre". Quem é atingido por respingo fica encharcado, pisca e "vai descansar" (animação fofa). Sem sangue, sem caveiras assustadoras, sem armas.
- Nada de promessa médica ("não é teste de visão"). Pode haver **curiosidades curtas sobre os olhos** nas telas de espera/resultado (verdadeiras, simples, revisadas: ex. "A pupila aumenta no escuro para deixar entrar mais luz.").
- Partidas curtas; dá para largar a qualquer momento (a criança pode ser chamada para a consulta). Botão de pausa e de sair sempre visíveis.

### 3.5 Celular primeiro
- Funciona em **retrato e paisagem**, de 360 px de largura para cima; a arena inteira sempre visível, sem rolagem nem zoom acidental (`touch-action`, sem seleção de texto, sem menu de contexto, sem "puxar para atualizar").
- Controle de toque: **direcional virtual grande** (alavanca flutuante que nasce onde o polegar toca na metade esquerda/inferior, com zona morta e 4 direções bem definidas) + **botão grande de gota**. Alvos ≥ 56 px. Opção de inverter lados (canhotos).
- Desktop: setas/WASD + espaço; gamepad é bônus. Nenhuma tecla rola a página.
- Áudio só depois de um gesto; botão de mudo persistente; começa respeitando `prefers-reduced-motion` (menos tremor/partículas).

### 3.6 Identidade oftalmológica (ponto de partida — o executor pode refinar, mantendo o espírito)
- **Nome:** Bomberolho. Subtítulo sugerido: "A batalha das gotinhas".
- **Personagens** (8 selecionáveis, 4 por partida, cada um com cor, formato de íris/acessório e personalidade próprios; criaturinhas redondas em forma de olho com perninhas e bracinhos, expressivas — piscam, arregalam, apertam os olhos): **Íris** (violeta), **Pupilo** (azul-petróleo), **Córnea** (ciano cristal), **Retina** (coral), **Cristalino** (âmbar), **Mácula** (verde-menta), **Cílio** (rosa-choque), **Lente** (azul-marinho com óculos). Devem ser distinguíveis também por daltônicos (forma/acessório, não só cor).
- **"Bomba" = Gota de Colírio**: uma gota/bolha que incha e pulsa e estoura em **respingo** em cruz (água/brilho, não fogo).
- **Blocos destrutíveis**: por arena (ex.: cubinhos de "cisco/poeira", cristais de sal de lágrima, pólen). **Pilares**: peças temáticas (armações, lentes, cones e bastonetes estilizados).
- **Itens**: Frasquinho Extra (+1 gota), Lupa (+1 alcance), Lágrima Veloz (+velocidade), Chute-Pisca (chute), Super Lupa (alcance máximo), Cisco (azar passageiro).
- **Arenas** (mínimo 4, cada uma com paleta, peças e trilha próprias; ao menos 2 com um elemento de arena simples e justo, p.ex. esteiras, túneis de lado a lado, casas escorregadias): **Jardim da Íris**, **Lago Lacrimal**, **Caverna da Pupila** (mais escura, com contraste garantido), **Vale da Retina** (cones e bastonetes), opcional **Consultório das Lentes**.
- **Interface** no padrão do site da clínica: fonte do sistema/Inter se disponível localmente (não baixar), cantos arredondados, vidro fosco, azul `#0071E3`, texto `#1D1D1F`, fundo `#F5F5F7`, escuro `#0B0D12`. O jogo em si pode e deve ser mais colorido que o site.

## 4. Partes

| # | Parte | Entrega |
|---|---|---|
| 1 | Motor e regras centrais | Estrutura de módulos; simulação determinística (grade, movimento contínuo com deslize de quina, gotas, respingo em cruz, cadeia, blocos, itens básicos +gota/+alcance/+velocidade, eliminação); renderização funcional (ainda simples, mas já original); teclado; gancho `__bomberolho`; suíte `node --test` da simulação; uma arena jogável com 4 competidores (os 3 rivais podem ser bonecos parados ou aleatórios nesta parte). |
| 2 | Batalha completa | IA em 3 níveis; rodadas, cronômetro, aperto final, vitória/empate, placar de troféus; chute, Super Lupa, Cisco; 4+ arenas com layout e elementos próprios; balanceamento medido por simulação em lote (milhares de partidas sem cabeça). |
| 3 | Estética, identidade e som | 8 personagens originais animados; peças e paleta por arena; efeitos (respingo, blocos quebrando, itens, vitória); menus, seleção de personagem/arena/dificuldade, HUD, pausa, resultado, curiosidades; áudio procedural WebAudio (efeitos + música leve por arena, mudo). |
| 4 | Celular e acabamento | Controles de toque; retrato/paisagem; desempenho e peso; robustez (aba em segundo plano, girar, redimensionar, recarregar); acessibilidade; limpeza; `README.md` com como rodar, como testar e **como integrar ao site na etapa 2** (copiar a pasta, link sugerido, nada mais). |

Depois da parte 4 há a **avaliação do todo** por um verificador novo, que não participou de nenhuma parte.

## 5. Como o orquestrador conduz o ciclo

Para cada parte N, rodada M = 1, 2, 3…:

1. Lance um **subagente executor** com: este plano, o número da parte, a rodada e, se M > 1, o caminho do parecer da rodada anterior (`reviews/parte-N-rodada-(M-1).md`) — ele deve resolver **todos** os bloqueadores e as melhorias prioritárias.
2. Quando ele terminar, lance um **subagente verificador novo** (nunca o mesmo agente, nunca reaproveitado de rodada anterior), **sem lhe passar opinião nenhuma sua nem conclusões do executor** além do caminho do relatório. Ele recebe o plano, a parte e a rodada.
3. Leia o bloco final do parecer. **Aprovado = NOTA ≥ 85 E BLOQUEADORES = 0 E IMPRESSIONADO = sim.** Se reprovado, volte ao passo 1 com M+1. Se aprovado, faça commit (`parte N aprovada (rodada M, nota X)`) e siga para a parte seguinte.
4. Faça commit ao fim de **cada** rodada (trabalho + relatório + parecer), para nada se perder.
5. Limite de segurança: **6 rodadas por parte**. Se estourar, não baixe a régua: pare, registre em `reports/IMPASSE-parte-N.md` o que falta e por quê, e avise o dono.
6. Depois da parte 4: **avaliação do todo** com a rubrica final. Se reprovar, lance um executor de "acabamento geral" com o parecer e repita (mesmo limite).
7. Ao final: atualizar `README.md`, escrever `reports/RESUMO-FINAL.md` (notas por parte e rodada, o que cada rodada melhorou, limitações honestas), fazer push do branch e abrir um pull request para `main`.

O orquestrador **não escreve código do jogo nem edita pareceres**; só coordena, confere os artefatos (existem? o veredito bate com o texto?) e faz commits.

## 6. Regras para o agente executor

- Trabalhe em `bomberolho/` (jogo) e `qa/` (testes). Não regrida o que partes anteriores entregaram: leia `reports/` e `reviews/` anteriores e rode as suítes existentes antes e depois.
- **Teste de verdade no navegador** antes de declarar pronto: Playwright + Chromium (instale em `qa/` se faltar: `npm i` + `npx playwright install chromium`). Tire capturas em desktop 1280×720, celular 390×844 e 844×390, **olhe as capturas** e corrija o que estiver feio ou quebrado. Se o navegador não puder ser instalado no ambiente, diga isso com clareza no relatório — não finja que testou.
- Zero erros/avisos no console, zero 404.
- Código legível, modular, comentado em português com parcimônia (o porquê, não o óbvio), sem arquivo gigante de um bloco só, sem código morto, sem `console.log` de depuração.
- Ao terminar, escreva `reports/parte-N-rodada-M.md`: o que foi feito, decisões, como testar, medições (fps, peso, resultados de suíte), **limitações conhecidas** (seja honesto — o verificador vai conferir).
- Encerre apenas os processos que você iniciou (pelo PID da porta que usou); nunca mate processos por nome.

## 7. Regras para o agente verificador

- Você **não edita o jogo**. Pode criar scripts e capturas em `qa/`.
- Não confie no relatório do executor: **rode as suítes, rode o jogo, jogue** com Playwright (teclado e toque emulado; 1280×720, 390×844 retrato, 844×390 paisagem e 360×640), **olhe as capturas** e leia o código.
- Seja exigente como um diretor de produto de um estúdio de jogos e, ao mesmo tempo, como o dono da clínica que vai pôr isso na mão de crianças na sala de espera — e como alguém que jogou muito os clássicos do gênero e sabe quando o "sentir" está errado.
- Dê nota de 0 a 100 pela rubrica da parte (seção 8). Liste **bloqueadores** e **melhorias priorizadas**, cada um com evidência (arquivo:linha, captura, valor medido, passos para reproduzir) e sugestão concreta de correção.
- Responda explicitamente: **"Fiquei impressionado? sim/não — por quê"**. "Sim" só se o resultado **superar** a expectativa, não apenas cumprir a lista. Não arredonde para cima por simpatia; não reprove por capricho sem evidência.
- Escreva o parecer em `reviews/parte-N-rodada-M.md` (ou `reviews/todo-rodada-M.md`) e termine a resposta **e** o arquivo com o bloco:

```
NOTA: <0-100>
IMPRESSIONADO: sim|não
BLOQUEADORES: <n>
VEREDITO: APROVADO|REPROVADO
```

## 8. Rubricas (100 pontos cada)

**Bloqueadores automáticos em qualquer parte:** violação da seção 2 (originalidade); erro no console ou 404; jogo não inicia; suíte existente falhando; regressão de algo aprovado antes; tela quebrada em 360–390 px de largura (a partir da parte 3); qualquer rede externa, login ou coleta de dados; conteúdo inadequado para crianças.

**Parte 1 — Motor e regras centrais**
- 25 Movimento: contínuo, responsivo, **deslize de quina** natural, sem prender em quinas nem atravessar paredes; sair de cima da própria gota e ela virar sólida.
- 25 Gotas e respingo: pavio, cruz, parada em pilar, só o primeiro bloco por braço, duração letal, **cadeia imediata**, destruição de itens — cada regra coberta por teste.
- 20 Arquitetura: simulação pura e determinística (mesma semente + mesmas entradas = mesmo estado, provado em teste), passo fixo, independência de fps, módulos coesos, gancho `__bomberolho`.
- 15 Suíte de testes: abrangente, rápida, legível, roda com um comando.
- 10 Geração de arena: densidade certa, cantos livres, itens distribuídos com semente.
- 5 Relatório honesto e limpeza.

**Parte 2 — Batalha completa**
- 30 IA: nos 3 níveis os robôs parecem "vivos" e justos; no Fácil um iniciante vence com frequência, no Difícil um bom jogador é desafiado; taxa de auto-eliminação medida e baixa no Médio/Difícil; nunca travam nem ficam parados.
- 20 Regras da batalha: contagem, cronômetro, aperto final em espiral, vitória/empate, troféus, fim de partida — sem inconsistência em centenas de partidas simuladas.
- 20 Itens avançados: chute (desliza, para, encadeia corretamente), Super Lupa, Cisco — divertidos e equilibrados.
- 15 Arenas: 4+, distintas, elementos de arena justos e legíveis.
- 15 Evidência de balanceamento (tabelas de simulação em lote no relatório, reproduzíveis) e robustez (sem NaN, sem partida infinita).

**Parte 3 — Estética, identidade e som**
- 30 Beleza e originalidade: personagens carismáticos e inconfundivelmente próprios, tema oftalmológico presente e charmoso, arenas bonitas e distintas; uma criança acharia fofo, um adulto acharia caprichado.
- 20 Legibilidade em jogo: perigo, alcance do respingo, itens e personagens claros num relance, inclusive em tela pequena e para daltônicos.
- 20 Interface: menus, seleção, HUD, pausa, resultado — claros para uma criança que mal lê, coerentes com o padrão do site, sem becos sem saída.
- 15 Animação e efeitos: vida (piscar, andar, comemorar, encharcar), respingo satisfatório, sem poluir.
- 10 Áudio: agradável, não irritante em repetição, mudo persistente, só após gesto.
- 5 Textos e curiosidades: português correto, tom certo, fatos verdadeiros.

**Parte 4 — Celular e acabamento**
- 35 Jogar no celular: direcional e botão confortáveis e precisos (medir: sequência de comandos por toque emulado reproduz o trajeto esperado), retrato e paisagem, 360 px, sem rolagem/zoom/seleção acidental.
- 20 Desempenho e peso: orçamento da seção 3.1 medido; sem vazamento em 5 min de partidas seguidas.
- 20 Robustez: segundo plano (pausa automática), girar, redimensionar, recarregar, toque múltiplo, perda de foco.
- 15 Limpeza e documentação: sem órfãos/código morto; README completo, incluindo a integração da etapa 2.
- 10 Acessibilidade: foco de teclado nos menus, contraste, reduzir-movimento, alvos de toque.

**Avaliação do todo**
- 30 Diversão e fidelidade ao "sentir" clássico: dá vontade de jogar mais uma? As regras se comportam como um veterano do gênero espera?
- 25 Estética e identidade Bomberolho: original, bonita, oftalmológica.
- 20 Adequação a crianças numa sala de espera, no celular (facilidade, tom, partidas curtas, segurança/privacidade).
- 15 Acabamento técnico (desempenho, robustez, código, testes).
- 10 Pronto para a etapa 2 (pasta autocontida, caminhos relativos, README).
