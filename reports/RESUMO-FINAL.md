# Bomberolho — resumo final da construção

Jogo de batalha em arena com tema de oftalmologia, para crianças jogarem no
celular na sala de espera. Foi construído pelo ciclo da seção 5 do
[PLAN.md](../PLAN.md). Cada parte foi feita por um agente executor e avaliada
por um agente verificador novo e independente. A régua de aprovação foi
**nota ≥ 85, zero bloqueadores e verificador impressionado**. Depois das 4
partes veio a avaliação do todo, feita por um verificador que não participou de
nenhuma delas.

## Resultado

| Etapa | Rodadas | Notas por rodada | Veredito |
|---|---|---|---|
| Parte 1 — Motor e regras centrais | 1 | 94 | Aprovada |
| Parte 2 — Batalha completa | 2 | 70 → 89 | Aprovada |
| Parte 3 — Estética, identidade e som | 2 | 84 → 91 | Aprovada |
| Parte 4 — Celular e acabamento | 2 | 78 → 90 | Aprovada |
| **Avaliação do todo** | 1 | **91** | **Aprovada** |

Nenhuma parte chegou perto do limite de 6 rodadas, e não houve impasse. Os
pareceres completos estão em [`reviews/`](../reviews/) e os relatórios dos
executores em [`reports/`](./).

Notas do todo por item da rubrica:

| Item | Nota |
|---|---|
| Diversão e "sentir" clássico | 27/30 |
| Estética e identidade | 24/25 |
| Adequação a crianças | 17/20 |
| Acabamento técnico | 13/15 |
| Pronto para a etapa 2 | 10/10 |

## O que cada rodada mudou

- **Parte 1, rodada 1 (94):**
  - Simulação pura e determinística a 60 Hz, com o mesmo resultado no Node e no navegador.
  - Movimento contínuo com deslize de quina, gota de colírio com pavio de 2,75 s, respingo em cruz e cadeia no mesmo tick.
  - Primeiros itens, desenho por código, teclado e o gancho `window.__bomberolho`.
- **Parte 2, rodada 1 (70, reprovada):**
  - O que entrou: IA em 3 níveis, rodadas, aperto final em espiral, troféus, 5 arenas, Chute, Super Lupa, Cisco, Pinça, Colírio Penetrante, os bichinhos Saltinho, Cascudo e Disparada, e a bancada `?ajuste=1`.
  - Bloqueador: o túnel da Caverna servia de esconderijo imune.
  - Outras falhas: o Difícil perdia para o Médio, o canto do humano era desfavorecido e o Difícil quase não chutava.
- **Parte 2, rodada 2 (89):**
  - O túnel virou passagem direta, e o verificador não achou brecha em cerca de 900 mil ticks aleatórios.
  - A escada de dificuldade foi corrigida: num lote com os três níveis, o Difícil leva 66% das taças e o Médio 33%.
  - A justiça entre os cantos ficou em 24–26%.
  - O Difícil passou a chutar.
- **Parte 3, rodada 1 (84, reprovada):**
  - O que entrou: menus completos, 8 personagens animados, arenas temáticas, som e música sintetizados, e 24 curiosidades sobre os olhos.
  - Faltaram 1 ponto e o "impressionado". Os motivos foram o retrato vazio no "Você sabia?", a prévia do perigo quase invisível, o som baixo demais e a música curta.
- **Parte 3, rodada 2 (91):**
  - Prévia do perigo com listras e tracejado, de contraste 2,6–4:1.
  - Som medido pela cadeia real, com o fim de um estalo aleatório que existia em todo som com ruído.
  - Música com ciclo de 69–91 s.
  - Botões com ≥ 44 px.
- **Parte 4, rodada 1 (78, reprovada):**
  - O que entrou: controles de toque (alavanca flutuante, botão de gota, botão do bichinho, modo canhoto), fps no aperto final do desktop de 38 para 60, memória sem vazamento e README.
  - Bloqueador: o botão de mudo ficava cortado no celular deitado e em tablets.
- **Parte 4, rodada 2 (90):**
  - Feita por dois executores em paralelo, em arquivos separados.
  - Mudo inteiro em todas as telas e alavanca sem andar sozinha perto da borda.
  - Medição de desempenho corrigida.
  - 9 MB de dados gerados tirados do versionamento.
  - README revisado e seguido de ponta a ponta pelo verificador.
- **Todo, rodada 1 (91):**
  - 4 partidas reais, por toque e por teclado, a partir do menu.
  - O "sentir" foi conferido medindo deslize de quina, pavio, cadeia, chute e ganho de velocidade.
  - A integração foi seguida só pelo README, na raiz e em subpasta.

## Decisões do dono tomadas durante a construção

Estão registradas no plano:

- **Seção 3.7:** bancada de ajuste do "sentir" em `?ajuste=1`.
- **Seção 3.8:** Pinça, Colírio Penetrante e bichinhos de montar (vida extra e poderes).
- **Seção 3.9:** três aceites.
  - O Fácil fica como está: o perfil "criança" leva cerca de 15% das taças, com cerca de 30% de rodadas empatadas.
  - A IA do Médio e do Difícil fica como está.
  - A medição em celular emulado basta.
- **ROM:** um arquivo de ROM de um jogo comercial foi oferecido como referência e **não foi aberto, lido nem usado**. O jogo foi todo feito do zero (seção 2).

## Números finais

- **Peso:** cerca de 417–431 kB na primeira carga, contra o orçamento de 600 kB. Nenhuma requisição externa.
- **Testes:** `npm test` 189/189 (simulação) e `npm run e2e` 58/58 (navegador, Chromium).
- **Desempenho:**
  - desktop a 60 fps no começo, no meio e no aperto;
  - celular de entrada emulado (CPU 4×, DPR 3) com média de 42–59 fps, conforme o verificador da parte 4.
- **Memória:** heap estável entre 3,6 e 4,9 MB em 5 min de partidas seguidas.

## Limitações honestas

1. **Nada foi testado num aparelho físico.** Toque, desempenho e som foram
   emulados ou medidos. O dono aceitou isso (3.9), mas vale jogar num celular
   real antes de divulgar.
2. **Ninguém ouviu o som num alto-falante.** Volume, estalos e repetição foram
   medidos pela cadeia de áudio real, não pelo ouvido.
3. **Quedas curtas de fps em celular fraco.** A média passa de 30 fps, mas há
   trechos de cerca de 0,5 s entre 16 e 29 fps: no início frio, na entrada do
   aperto final e no menu.
4. **Depois de cair, a criança só assiste.** O único botão disponível é
   "Recomeçar", que abre outra partida sem confirmar e perde os troféus. Contra
   o Fácil, a espera média é de 27 s. É a melhoria de maior prioridade apontada
   na avaliação do todo.
5. **Fácil ainda exigente** para uma criança muito pequena e com bastante
   empate no tempo. Isso foi aceito pelo dono.
6. **Retina e Mácula ficam com a mesma cor em deuteranopia.** Elas se
   distinguem pelo acessório.
7. **Navegadores antigos.** O ajuste do painel em tablet deitado usa um recurso
   CSS de 2022 (Chrome 105+, Safari 16+). Em navegadores mais velhos, o botão
   de som pode ficar parcialmente cortado.
8. **Teclado durante a partida.** Os botões Som e Sair do painel não respondem
   ao Enter quando focados pelo teclado; pela pausa, funcionam.

## Como usar

Veja o [README.md](../README.md): como rodar, testar e jogar, os parâmetros de
URL, a bancada `?ajuste=1` e a seção **Integração ao site (etapa 2)**, escrita
para ser seguida por outro agente. A integração é copiar só a pasta
`bomberolho/` para o site e pôr um link.
