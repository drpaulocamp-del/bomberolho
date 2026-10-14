# Avaliação do todo — rodada 1 (verificador independente)

Não participei de nenhuma parte. Li o `PLAN.md` inteiro e o `CLAUDE.md`. Usei os relatórios e pareceres anteriores só como contexto. Tudo o que está abaixo foi medido, jogado ou lido por mim. Meus scripts estão em `qa/verificacao/v-todo-r1/` e as capturas em `qa/capturas/todo/` (fora do git).

## O que fiz

1. **Rodei as suítes:**
   - `cd qa && npm test`: **189/189** em 21 s;
   - `npm run e2e`: **58/58**.
   - Os logs estão em `v-todo-r1/npm-test.log` e `e2e.log`.
2. **Joguei como uma criança** (`jogar-real.mjs`):
   - abri o jogo **sem parâmetros** e percorri o menu com toques/cliques de verdade: Como jogar → Entendi → Jogar → personagem → Próximo → arena, robôs e troféus → Começar;
   - joguei partidas **inteiras e em tempo real**, com entradas reais: toque por CDP (alavanca + botão da gota) e teclado;
   - quem decidia as jogadas era uma política escrita por mim fora do jogo, que lê só o estado público;
   - no fim, voltei ao menu pelo cartão de resultado.

   | Execução | Tela | Entrada | Arena / nível / troféus | Resultado |
   |---|---|---|---|---|
   | A | 390×844 | toque | Jardim / Fácil / 1 | 2 rodadas, 177 s, Retina levou |
   | B | 844×390 | toque | Lago / Médio / 1 | 100 s |
   | C | 360×640 | toque | Caverna / Fácil / 2 | 3 rodadas, 262 s; montei Saltinho, peguei Cisco |
   | D | 1280×720 | teclado | Vale / Difícil / 1 | 104 s; Cisco lento, Penetrante |

   Nas 4 execuções: **zero** erros ou avisos de console, **zero** respostas ≥ 400 e **zero** requisições externas. Nenhuma rolagem: `scrollWidth`/`scrollHeight` sempre igual à janela, em todas as etapas do menu.
3. **Telas de vitória do humano** (`vitoria.mjs`): rodada e taça, em retrato e desktop.
4. **Sondas do "sentir"** na simulação real (`sentir.mjs`, `chute.mjs`).
5. **Tempo assistindo depois de cair e duração da partida** (`espera.mjs`): 60 partidas do perfil "criança" e 60 do "novato" contra o Fácil, pelo controlador real.
6. **Desempenho:** `npm run desempenho`, duas vezes.
7. **Integração da etapa 2, seguindo só o README** (`integracao.mjs`):
   - copiei `bomberolho/` para um "site" temporário, na raiz e em `jogos/bomberolho/`;
   - servi com outro servidor (`python3 -m http.server`);
   - abri pelo link de uma página do site e joguei.
8. **Originalidade e privacidade:**
   - grep em todo o repositório versionado e nas mensagens de commit;
   - inventário de arquivos binários;
   - leitura do código: rede, cookies, `innerHTML`, `console`.

## Resultados por eixo

### Diversão e "sentir" clássico

Sondas pela simulação:

- **Deslize de quina:** generoso e sem enganchar. Com desvio de 0,10 a 0,49 casa contra um pilar, o boneco escorrega e entra no corredor em 11 a 18 ticks, sempre centrado (x = 1,5). No jogo real, por toque e teclado, as curvas da minha política nunca prenderam.
- **Velocidade:** base de 3,3 casas/s; com 4 Lágrimas Velozes, 5,46 casas/s. Dá para sentir a diferença.
- **Pavio e respingo:** pavio de **2,75 s** e respingo de **0,5 s**.
- **Cadeia:** imediata. A segunda gota estoura **no mesmo tick** (`cadeia: true`).
- **Chute:** a gota desliza a ≈ 7,8 casas/s e para encostada na moldura (5 → 2).
- **Aperto final:** forte e legível. Aparece a faixa "Aperto final!", a próxima peça vem marcada no chão e o relógio fica vermelho (`A-retrato/09`, `D-desktop/09`). No Difícil, a arena fecha inteira antes do fim do relógio (`D-desktop/12`).
- **Itens e bichinhos:** apareceram em jogo de verdade. Montei o Saltinho, e o botão branco surgiu ao lado da gota com o ícone do bichinho (`C-pequeno/08`). O HUD mostra os poderes de cada um e o selo "cisco!".

O ritmo é o do gênero: a arena abre em ~40 s e há disputa no miolo. Em uma partida (`C-pequeno/10`), no fim do aperto, dois robôs ficaram presos lado a lado na última casa e o tempo empatou a rodada (`A-retrato/12`, `13`).

### Estética e identidade

- **Original e coesa.** As 8 criaturinhas-olho são carismáticas e se distinguem pela silhueta: flor, antenas, cristal, coroa, faixa, broto, laço e óculos. O logo tem os "o" como olhos.
- **Arenas de personalidade própria:**
  - Jardim: flores e lentes;
  - Lago: correnteza com setas;
  - Caverna: escura, com contraste bom;
  - Vale: cones e bastonetes;
  - Consultório: lentes que dão bônus.
- **Respingo:** um tubo de água na cor de quem soltou, nada de fogo.
- **Tom:** os cartões de resultado têm tom acolhedor ("Na próxima é você. Vamos de novo?") e cena animada. No empate, as quatro criaturas aparecem molhadas, sem nada assustador.
- **Visual do site da clínica:** vidro fosco, `#0071E3` e cantos arredondados.
- **Curiosidades:** as 24 são verdadeiras, simples e sem promessa médica (`js/dados/curiosidades.js`).
- **Arquivos:** nenhum binário de terceiros no repositório. Os únicos arquivos de imagem são SVG/canvas gerados no próprio projeto.

### Adequação a crianças, no celular

- **Do menu à partida em ~10 s**, com poucos toques. "Surpresa!" sorteia a arena.
- **Botões sempre visíveis:** Pausar, Sair (com confirmação "Sair da partida?") e som.
- **Toque:** a alavanca flutuante e o botão grande funcionaram nas 3 telas de celular.
- **Privacidade:** sem rede, sem login e sem coleta. O `localStorage` guarda só as preferências e o placar local (`js/ui/preferencias.js`).
- **Partida longa:** pelo `espera.mjs`, uma partida padrão (2 troféus) do perfil "criança" contra o Fácil dura **mediana ≈ 8,8 min, p90 ≈ 9,6 min**, com 4,4 rodadas por partida. Essa duração vem das decisões do dono (2:00, 2 troféus) e dos empates no tempo do Fácil, que ele já aceitou (3.9). Por isso não desconto pela duração em si, mas ela piora o problema descrito em M1.

### Acabamento técnico

- **Suítes:** verdes (189 + 58).
- **Console e rede:** limpos em todas as telas e execuções.
- **Desempenho no desktop:** 60 fps cravados.
- **Desempenho no celular lento emulado** (DPR 3, CPU 4×), em duas execuções:
  - média estável de 35–47 fps;
  - mínimos de 16–23 fps em janelas de 0,5 s;
  - p95 de 50 ms.
- **Peso:** 431 kB transferidos, dentro do orçamento de 600 kB.
- **Código:** modular, com simulação pura em `js/sim/`, comentários em português e sem `console.log`. Todo `innerHTML` monta só constantes internas.

### Etapa 2

- **Integração seguindo o README:** funcionou de primeira na raiz, em `jogos/bomberolho/` e entrando pelo link de uma página do site.
- **Resultado:** 52 requisições, todas locais, zero problemas.
- **Pasta autocontida:** 564 kB em disco, 54 arquivos, caminhos relativos.
- **README:** claro sobre o que copiar e o que não copiar.

## Bloqueadores

**Nenhum.**

- Nenhuma violação da seção 2.
- Nenhum erro de console nem 404.
- O jogo inicia, e nenhuma suíte falha.
- Nenhuma regressão encontrada.
- Nenhuma tela quebrada em 360–390 px.
- Nenhuma rede, login ou coleta, e nenhum conteúdo inadequado.

## Melhorias priorizadas

### M1 (alta) — Depois de cair, a criança só assiste, e o único botão joga fora a partida

**O que acontece.** Quando o humano cai, aparece a faixa "Você foi descansar!", cujo único botão é **Recomeçar** (`bomberolho/index.html:48`, `js/main.js:267` → `reiniciar()`). Esse botão começa uma partida **nova**, sem confirmar, e descarta os troféus já ganhos. Não há como acelerar o resto da rodada.

**Medição** (`espera.mjs`, perfil "criança" × Fácil, 60 partidas):

- a criança cai em 58% das rodadas;
- depois de cair, assiste em média **27 s** (mediana de 12,6 s, p90 de **74 s**);
- em **39%** das quedas assiste mais de 30 s, e em **18%** mais de 60 s.

**Reprodução.** No meu jogo real A (`A-retrato/12`, `13`), caí com 0:59 no relógio. Assisti aos robôs por 1 minuto e a rodada acabou empatada no tempo. Uma criança impaciente toca "Recomeçar" e perde o troféu que tinha.

**Sugestão:**

- trocar o botão da faixa por **"Ver mais rápido"**, que põe a escala em 3× até o fim da rodada sem mudar a simulação;
- ou mostrar "Pular para o fim da rodada";
- deixar "Recomeçar" só na pausa, onde já existe;
- se ficar na faixa, pedir confirmação quando houver troféu em jogo.

### M2 (média) — Quedas de quadro no celular de entrada emulado

**Medição** (`npm run desempenho`, 2 execuções):

- no começo e no aperto, o mínimo em janela de 0,5 s ficou em 16–23 fps e o p95 em 50 ms;
- na adaptação ao entrar no aperto, a média de 1,5 s chegou a cair para 18–22 fps;
- o menu no celular lento ficou em 34–35 fps, com mínimo de 16 fps.

A média fica acima de 30, mas "estáveis" (3.1) não fica garantido.

**Sugestão:**

- pré-rasterizar o tubo do respingo e as peças do aperto por arena;
- limitar as partículas ao mínimo no degrau de densidade 1;
- baixar a densidade logo de saída quando o primeiro segundo medir mais de 25 ms por quadro;
- no menu, pausar a vitrine atrás do vidro fosco ou desenhá-la a 30 Hz.

### M3 (baixa) — A alavanca cobre a arena ou o HUD em telas baixas

- **Em 360×640:** a faixa de controle sob a arena tem pouco mais de 100 px. A alavanca que nasce onde o polegar encosta fica sobre o canto inferior esquerdo da arena (`C-pequeno/08`, `10`).
- **Em 844×390:** ela cobre os cartões do placar (`B-paisagem/07`).

**Sugestão:** deixar a base da alavanca mais transparente (aro só com contorno) quando estiver sobre a arena ou o placar.

### M4 (baixa) — Final de rodada do Fácil

Quando o aperto suave do Fácil não fecha a arena, a rodada pode terminar com dois robôs vivos lado a lado e "Empate! O tempo acabou" (`A-retrato/12`, `13`). O dono aceitou essa taxa de empate (3.9), então isto não conta como desconto. Mesmo assim, fechar a última casa nos 3 s finais deixaria o fim mais claro, sem mudar o equilíbrio medido.

## Nota pela rubrica do todo

| Item | Peso | Nota | Por quê |
|---|---|---|---|
| Diversão e "sentir" clássico | 30 | **27** | Deslize de quina generoso, pavio de 2,75 s, cadeia no mesmo tick, chute que desliza e para certo, velocidade que se sente, aperto tenso, 9 itens e 3 bichinhos funcionando em jogo real. **Desconto:** o tempo morto depois de cair (M1) tira a vontade de "mais uma". |
| Estética e identidade | 25 | **24** | Personagens e arenas originais, bonitos e coerentes com o tema; respingo de água; interface no padrão do site. **Desconto:** a alavanca cobrindo arena ou HUD em telas baixas (M3). |
| Adequação a crianças | 20 | **17** | Tom acolhedor, menu em ~10 s, pausa e sair sempre à mão, privacidade total. **Descontos:** "Recomeçar" descarta a partida sem confirmar e a criança assiste por muito tempo depois de cair (M1); partida padrão de ~9 min. |
| Acabamento técnico | 15 | **13** | 247 testes verdes, console e rede limpos, 431 kB, código modular. **Desconto:** mínimos de 16–23 fps no celular lento emulado (M2). |
| Pronto para a etapa 2 | 10 | **10** | Segui o README sozinho: funcionou na raiz e em subpasta, servido por outro servidor e aberto por link. |
| **Total** | 100 | **91** | |

## Fiquei impressionado? **Sim**

O jogo supera a lista.

- **Parece um produto.** Uma criança abre, escolhe "quem é você", toca "Começar!" e em 10 s está jogando, com controles de console no toque. O resultado tem confete, troféu e uma curiosidade verdadeira sobre os olhos.
- **O tema é original, charmoso e consistente** do logo ao respingo.
- **Não achei uma única falha técnica.** Nas minhas próprias partidas reais nas 4 telas, nos 2 modos de entrada, em 4 arenas e nos 3 níveis, não houve nenhum erro de console nem requisição externa.
- **A integração é mesmo "copiar a pasta e pôr um link".**
- **O que falta é de experiência, não de defeito:** o tempo assistindo depois de cair (M1) e a folga de quadros no aparelho fraco (M2).

NOTA: 91
IMPRESSIONADO: sim
BLOQUEADORES: 0
VEREDITO: APROVADO
