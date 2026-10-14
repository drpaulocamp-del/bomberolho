# Parte 2 — Batalha completa · Rodada 1 (parecer do verificador)

Verificador independente. Li o `PLAN.md` inteiro, o `CLAUDE.md`, o relatório do executor e o parecer aprovado da Parte 1. Não editei nada em `bomberolho/`. Meus scripts estão em `qa/verificacao/p2r1/` e minhas capturas em `qa/capturas/v2-*.png`.

## O que fiz

- **Suítes.** `npm test` deu **154/154** em 23 s. `npm run e2e` deu **26/26**. Os 13 testes de navegador da Parte 1 continuam passando, então não houve regressão de suíte.
- **Lote.** Rodei o lote completo, mas o contêiner reiniciou no meio. Refiz a 20% (`--escala 0.2`, 468 partidas, 1906 rodadas; tabelas em `qa/verificacao/p2r1/lote02.md`). Os números batem com as tabelas do relatório dentro da variação de amostra. Por exemplo, na auto-eliminação por rodada, Médio deu 5,3% (relatório: 6,1%) e Difícil 5,4% (relatório: 5,3%). A robustez também confere: 0 NaN e 0 partida sem fim. **As tabelas são reproduzíveis.**
- **Navegador, jogando pelo teclado** (`jogar.mjs`). Fiz 4 telas (1280×720, 390×844, 844×390, 360×640) × 3 níveis = 12 partidas inteiras: contagem, jogo com setas e Espaço, aperto, placar entre rodadas e taça.
  - Zero erro ou aviso de console, zero 404, zero pedido externo.
  - Nenhuma rolagem: `scrollWidth`/`scrollHeight` = viewport.
- **Capturas que olhei:** contagem, aperto, intervalo e resultado em todas as telas; as 5 arenas no meio da partida; close dos bichinhos; bancada nas 4 telas.
- **Bancada `?ajuste=1` nas 4 telas** (`bancada.mjs`, incluindo 360×640, que o executor não testou):
  - As setas do teclado mexem no controle focado e não no boneco.
  - A velocidade medida na partida em andamento passou de 0,55 para 0,75 casa em 10 ticks.
  - "Copiar ajuste" põe na área de transferência o JSON `{"bomberolhoAjuste":{…}}`; "Restaurar padrão" volta a 55; o ✕ fecha.
  - Nenhum alvo menor que 44 px.
- **Regras sondadas em Node** (`regras.mjs`, `cisco.mjs`), cada uma conferida contra o valor esperado:
  - **Chute:** para em (7,1), centrada, antes do bloco; para antes do rival.
  - **Pinça:** levanta, arremessa 3 casas e dá a volta pela borda (9 → 2).
  - **Penetrante + Super Lupa:** desfaz os 4 blocos do braço; alcance 8.
  - **Cisco:** é contagioso e expira.
  - **Vida extra:** depois de molhado, segue vivo, sem bichinho e com 60 ticks de invulnerável; na segunda vez sai.
  - **Saltinho:** passa por cima do pilar.
  - **Disparada:** para antes do bloco.
  - **Cascudo:** a frente defende; molhado pelas costas, perde o bichinho.
  - **Aperto final:** esmaga mesmo montado.
  - **Ajuste:** é determinístico e muda o resultado.
- **IA:**
  - **Humano parado contra os 3 níveis** (`parado.mjs`): robô parado no máximo 3,1 s fora do túnel.
  - **Primeiros segundos no Fácil** (`cedo.mjs`): de onde vieram as quedas cedo.
  - **Esconderijo no túnel** (`tunel.mjs`, `tunel-ia.mjs`, `tunel-nav.mjs`).
- **Originalidade:** grep sem "Bomberman", sem nomes de empresas ou jogos e sem URL externa; nenhum `console.log`. Os bichinhos têm formas próprias:
  - **Saltinho:** sapinho verde de olhos saltados (`v2-bichinho-2.png`);
  - **Disparada:** "gota-foguete" laranja com raio e rodinhas (`v2-bichinho-1.png`);
  - **Cascudo:** lente azul com olhinhos.

  Nenhum lembra montaria de jogo existente.

## Bloqueadores

### B1 — Túnel da Caverna da Pupila é um esconderijo imune: o aperto final e o respingo não alcançam quem está na boca do túnel

**Causa no código:**
- As bocas do túnel ficam **na moldura**, nas casas (0,3), (0,9), (14,3) e (14,9), de tipo `TUNEL` (`sim/arenas.js:27`, `sim/grade.js:44`).
- O personagem pode parar ali: `movimento.js:149-157` deixa entrar em `TUNEL`, e o teletransporte de `atravessarTunel` (`movimento.js:247-251`) só acontece depois de passar do centro da casa.
- Nessa casa:
  - **o respingo nunca chega**: `respingo.js:229` interrompe o braço em tudo que não é `VAZIO`;
  - **não se solta gota**: `gotas.js:41` exige `VAZIO`;
  - **o aperto final nunca cai**: `aperto.js:19-20` percorre só o interior, a partir da coluna 1. Quem tem meio corpo lá dentro ainda é empurrado *para o centro do túnel* (`aperto.js:92`).

**Reprodução em Node** (`node qa/verificacao/p2r1/tunel.mjs`): o jogador anda até x = 0,675 (coluna 0, linha 3). Um rival solta gota de alcance 8 na mesma linha: ele continua vivo. Depois disso o aperto final roda inteiro, ele continua vivo e **vence a rodada**.

**Reprodução no navegador, só com o teclado** (`tunel-nav.mjs`):
- Na Caverna, no Difícil, `?arena=caverna&semente=5&dificuldade=dificil`.
- Na largada, ↓ por 0,65 s e ← por 0,25 s. São duas casas do "L" livre: (1,3) é reservada para a boca do túnel.
- Sem tocar em mais nada, o humano sobrevive às 106 quedas do aperto com 0:20 no relógio.
- Captura `qa/capturas/v2-tunel-imune.png`: a arena toda murada, os robôs espremidos no "H" central e a Íris tranquila em cima da moldura.

**Os robôs exploram isso** (`tunel-ia.mjs`, 12 rodadas por nível na Caverna):

| Nível | Rodadas | Empates | Empates com sobrevivente no túnel | Fração do tempo vivo no túnel |
|---|---|---|---|---|
| Difícil | 12 | 10 | 10 | 29% |
| Médio | 12 | 9 | 7 | 20% |
| Fácil | 12 | 2 | 1 | 11% |

Às vezes três robôs se empilham na mesma boca (0,50; 9,50). A IA trata `TUNEL` como casa transitável (`ia/caminhos.js:39`), e o mapa de perigo nunca a marca, então a casa vira "refúgio perfeito".

**Efeito nos dados:**
- É isso que explica a Caverna ter **58% (relatório) / 64,8% (meu lote)** de rodadas empatadas, contra 29–42% nas outras arenas.
- O relatório atribui isso a "os túneis dão rotas de fuga" (`reports/parte-2-rodada-1.md:240`). Não é rota de fuga: é imunidade.
- Também explica o "maior tempo parado = 17 s" da tabela 8. Fora do túnel medi no máximo 3,1 s.

**Efeito colateral do mesmo elemento:** a boca do túnel fica a duas casas do canto de largada. No Fácil, um robô atravessa o túnel e chega ao "L" do humano em ~3 s.
- `cedo.mjs`, sementes 53 e 118: o robô 1 solta gota "para abrir bloco" em (1,2) aos 3,3 s, e o humano parado no próprio canto é molhado aos **6,0 s**.
- Isso fura a segurança de largada de 3.2 ("a segurança vem do 'L' livre e de os robôs não atacarem nos primeiros segundos no nível fácil").

**Por que é bloqueador:** numa das 5 arenas, duas regras da batalha deixam de valer: "quem for atingido sai" e o aperto final que encolhe a arena até decidir. Isso vale para robôs e para qualquer criança que descubra o truque. O elemento de arena não é "justo e legível" (rubrica de Arenas). É um defeito de regra, não de ajuste fino.

**Sugestões (escolher uma e cobrir com teste):**
- (a) Teleportar ao **entrar** na casa-túnel. Ninguém pode parar na moldura: ao cruzar a borda interna (x < 1000 na coluna 1, indo para a esquerda), o personagem reaparece na coluna 13 do lado oposto, já dentro da arena.
- (b) Tratar a casa-túnel como extensão da casa vizinha para respingo, aperto e encharcamento. Por exemplo, o aperto derruba a boca junto com a casa (1,3), e o respingo que chega a (1,3) molha também a boca.
- Afastar a boca do "L" de largada (ex.: linhas 5 e 7 em vez de 3 e 9), ou deixar o túnel inativo nos primeiros ~10 s.
- Teste de regressão: "ninguém sobrevive ao aperto completo em nenhuma casa" para as 5 arenas, e "não existe casa onde o respingo não chega e um jogador pode ficar".

## Melhorias priorizadas

### M1 (alta) — Difícil é mais fraco que o Médio
- **Medido no relatório e no meu lote.** Na tabela 6 (misto), o Médio leva **60% / 68,8%** das taças e o Difícil **36% / 29,2%**.
- **O proxy "bom".** Ele ganha 21% contra o Difícil e 19% contra o Médio; no meu lote, 20% contra 16,7%. O Médio desafia tanto quanto o Difícil, ou mais.
- **Por que importa.** 3.3 pede uma escada clara, e a rubrica pede: "no Difícil um bom jogador é desafiado". A explicação do relatório ("o Difícil é mais cauteloso") descreve o defeito, não o justifica.
- **Sugestão.** Dar ao Difícil a disposição de ataque do Médio, ou maior: menos margem de segurança no ataque, aposta e perseguição mais cedo. Mantê-lo melhor na fuga. Aceitar só quando, no misto, Difícil > Médio > Fácil com folga estatística.

### M2 (alta) — O canto do humano (0) é desfavorecido e o canto 3 é favorecido em todos os níveis
- **No relatório (400 partidas por nível):**
  - canto 0: 20,8% / 14,3% / 19,8%;
  - canto 3: 29,5% / 29,0% / 27,5%.
- **Somados (1200 partidas):** canto 0 = 18,3% e canto 3 = 28,7%, contra ~23,4% esperados. São ≈ −4 e +4 desvios-padrão.
- **Meu lote** repete o desenho no Difícil: 13,8% no canto 0 e 28,8% no canto 3.
- **Não é ruído.** O relatório diz que "nenhum canto domina em todos os níveis" (linha 234), mas o canto 3 é o maior nos três.
- **Por que importa.** O humano sempre larga no canto 0.
- **Prováveis causas a investigar:**
  - o aperto começa pelo canto (1,1) e gira em sentido horário: o canto 0 é espremido primeiro e o canto 3 só no meio do anel;
  - a ordem fixa de processamento por id (`mundo.js:112-119`).
- **Sugestão.** Sortear o canto de início da espiral por rodada (com a semente), ou começar pelo meio de um lado. Rodar o lote com os cantos permutados para separar "canto" de "id".

### M3 (média) — Chute quase não é usado pela IA
- O Difícil chuta **0,05 vez por rodada** (tabela 7; meu lote: 0,051).
- 3.3 diz que o Difícil "usa cadeia e chute". Hoje, na prática, não usa.
- **Sugestão.** Incluir o chute no planejador de ataque, com a mesma nota que a Pinça já tem: gota colada cuja parada põe rival na cruz. Incluir também o chute de fuga, empurrando a gota que bloqueia o corredor.

### M4 (média) — Muitos empates entre robôs bons, mesmo fora da Caverna
- Médio×Médio e Difícil×Difícil têm 30–37% de rodadas no relógio e 5–12% de partidas empatadas.
- Parte disso é o B1. Depois de corrigi-lo, refazer as tabelas e ver se o "H" final de 7 casas não é largo demais.
- **Sugestão.** Fechar até 3–5 casas, ou acelerar o último trecho.
- Contra o proxy de criança está ótimo (0,7–1,7% de partidas empatadas).

### M5 (média) — Salto de dificuldade Fácil → Médio grande demais para o público
- O novato vence **91%** das partidas no Fácil, mas só **5–10%** no Médio.
- Para crianças de 5 a 12 anos, um Médio que se vence 1 vez em 10–20 é quase um Difícil.
- **Sugestão.** Um Médio um pouco mais lento de reação (`reacao` ~20) e com `atacaNaFuga` menor. Ou deixar isso explícito na parte 3 ("Médio: para quem já joga bem").

### M6 (baixa) — Cisco "pega" mas não "passa"
- Encostar copia o azar (`mundo.js:237`) e quem tinha continua com ele. O relatório diz "passa o azar adiante".
- Decidir e documentar. No gênero, passar (trocar) é o mais divertido e evita contágio em cadeia de 4 jogadores.

### M7 (baixa) — Bancada em 360×640 cobre metade da arena
- A gaveta tem 218 px de altura e a arena 273 px (`v2-bancada-pequeno.png`). Está dentro do pedido ("não cobre a arena inteira").
- **Sugestão.** Um botão "recolher" que deixe só o controle ativo à vista, para sentir enquanto mexe.

### M8 (baixa) — O "Copiar ajuste" copia os 12 valores, não só os mudados
- Funciona, e `criarAjuste` aceita o texto.
- **Sugestão.** Copiar só as diferenças (`diferencasDoPadrao` já existe), que é mais curto para o dono colar.

### M9 (baixa) — Frase do resultado em `?demo=1`
- Com a Íris campeã no piloto automático, aparece "Na próxima é você" (`ui/avisos.js:52`, captura `v2-paisagem-5-resultado.png`). Só no modo demo; vale um texto neutro.

## Rubrica (Parte 2)

| Item | Peso | Nota | Justificativa |
|---|---|---|---|
| IA | 30 | 19 | **Pontos fortes:**<br>• Viva: andam, abrem blocos, pegam itens, emboscam e usam Pinça e bichinhos.<br>• Justa: não lê itens escondidos; rng próprio.<br>• Auto-eliminação medida e baixa: 5–6% por rodada no Médio e no Difícil, 2% no Fácil.<br>• Fácil vencível (proxy 83–91%); sem travar.<br><br>**Descontos:**<br>• Exploram o esconderijo imune do túnel (B1).<br>• Difícil mais fraco que o Médio (M1).<br>• Chute quase ausente (M3).<br>• Médio pesado para criança (M5). |
| Regras da batalha | 20 | 14 | **Pontos fortes:**<br>• Contagem, relógio, aperto em espiral com aviso da próxima casa, vitória e empate, troféus, limite de rodadas com desempate explicado.<br>• Sem inconsistência em 468 + 2340 partidas.<br>• Bancada excelente: 4 telas, efeito imediato, copiar e restaurar.<br><br>**Descontos:**<br>• O aperto não decide na Caverna (B1).<br>• Viés do canto do humano (M2). |
| Itens avançados | 20 | 17 | **Pontos fortes:**<br>• Chute, Super Lupa, Cisco, Pinça (quique e volta pela borda), Penetrante (visual violeta legível), Estojo e os 3 bichinhos.<br>• Todos corretos nas minhas sondas e cobertos por teste; vida extra com pisca.<br><br>**Descontos:**<br>• Cisco copia em vez de passar (M6).<br>• Cascudo pouco usado pela IA.<br>• O botão de toque do bichinho fica para a parte 4 (aceitável). |
| Arenas | 15 | 9 | **Pontos fortes:**<br>• 5 arenas bonitas e distintas, com peças próprias.<br>• Correnteza e lentes justas e legíveis.<br>• Caverna com contraste bom.<br><br>**Descontos:**<br>• O túnel é um elemento quebrado: imunidade, e rival no "L" do humano aos 3 s. |
| Balanceamento e robustez | 15 | 11 | **Pontos fortes:**<br>• Tabelas completas e reproduzíveis (conferi).<br>• Sem NaN e sem partida infinita.<br><br>**Descontos:**<br>• Leituras enganosas: "nenhum canto domina" (falso); empates da Caverna atribuídos a "rotas de fuga" (é o B1).<br>• Taxa de empates alta entre robôs bons. |
| **Total** | 100 | **70** | |

## Fiquei impressionado? **Não** — por quê

Há muito trabalho de alto nível aqui:
- uma IA com mapa de perigo temporal que entende quiques da Pinça e cadeias;
- uma bancada redonda nas quatro telas;
- bichinhos originais e simpáticos;
- cinco arenas lindas;
- um lote reproduzível de milhares de partidas.

Mas não me impressionou, por três motivos:
1. **Um esconderijo invencível**, a dois passos da largada, numa das cinco arenas. Os próprios robôs o usam em ~80% das rodadas no Difícil, e o aperto final não o alcança. Um veterano do gênero acharia isso em uma partida; uma criança, em poucas.
2. **O "Difícil" perde para o "Médio".**
3. **O relatório leu os próprios números de forma otimista:** túnel como "rota de fuga", cantos "sem domínio".

Com B1 corrigido, M1 e M2 tratados e as tabelas refeitas, esta parte tem tudo para passar com folga.

NOTA: 70
IMPRESSIONADO: não
BLOQUEADORES: 1
VEREDITO: REPROVADO
