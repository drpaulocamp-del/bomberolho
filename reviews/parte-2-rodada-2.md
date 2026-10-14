# Parte 2 — Batalha completa · Rodada 2 (parecer do verificador)

Sou um verificador independente e novo. Li inteiros o `PLAN.md` (seções 2, 3 inteira com 3.7 e 3.8, 4, 7 e 8) e o `CLAUDE.md`. Li também o relatório do executor (`reports/parte-2-rodada-2.md`), o parecer anterior (`reviews/parte-2-rodada-1.md`) e o parecer aprovado da Parte 1.

Não editei nada em `bomberolho/`. Meus scripts estão em `qa/verificacao/v-p2r2/`. Minhas capturas estão em `qa/capturas/vr2-*.png`, pasta ignorada pelo git. Usei o servidor na porta 7233, iniciado e encerrado por mim pelo PID.

## O que conferi, e como

### Suítes
- `npm test`: **164/164** em 27 s.
- `npm run e2e`: **26/26** em 42 s. Os 13 testes de navegador da Parte 1 passam.
- O roteiro de navegador do verificador da Parte 1 (`qa/verificacao/jogar.mjs`) não roda mais como está: o `start()` agora tem a contagem "3, 2, 1", introduzida de propósito na Parte 2. Fiz uma cópia que só desliga a contagem (`v-p2r2/jogar-p1.mjs`), e ela confirma:
  - deslize de quina igual ao aprovado: em x = 2,325, apertando ↓ contra o pilar, escorrega para a coluna 1 e desce;
  - sair de cima da gota em 19 ticks;
  - cadeia no mesmo tick;
  - hash igual em Node e no navegador.

**Não há regressão da Parte 1.**

### Lote independente
Rodei a 25% (`--escala 0.25`, em 2 pedaços): 683 partidas e 2680 rodadas. As tabelas estão em `v-p2r2/lote.md`. Comparação com o relatório:

| Medida | Relatório (escala 1) | Meu lote (escala 0,25) |
|---|---|---|
| Misto: taças do Difícil / Médio / cada Fácil | 66,0 / 32,5 / 0,2% | **66,7 / 33,3 / 0,0%** |
| Novato × Fácil (taça) | 92,0% | **90,7% ± 6,6** |
| Novato × Médio | 22,0% | **26,7% ± 10** |
| Bom × Difícil | 25,3% | **26,7% ± 10** |
| Bom × Médio | 35,3% | **34,2% ± 15** |
| Chutes por rodada (Difícil / Médio / Fácil) | 1,23 / 0,56 / 0,03 | **1,25 / 0,55 / 0,03** |
| Auto-eliminação sem apostas (Fácil / Médio / Difícil) | 2,5 / 6,2 / 5,6% | **2,5 / 6,4 / 5,6%** |
| Vitórias por canto, por rodada (todos os níveis) | 25,2 / 25,6 / 25,3 / 23,9 | **24,6 / 27,1 / 25,6 / 22,7** (± 3) |
| Empates por arena | 34,7–39,0% | **29,8–39,4%** (a Caverna fica no meio, com 33,6%) |
| NaN / partidas sem fim / maior tempo de robô parado | 0 / 0 / 15,8 s | **0 / 0 / 7,7 s** |

**As tabelas são reproduzíveis.**

Uma única casa do meu lote fica fora do intervalo de 95%: canto 3 no Difícil, 18,9% ± 4,8. Em 12 casas, isso é esperado pelo acaso, e o lote completo do executor dá 24,2% nessa mesma casa.

### Fuzz de invariantes
O script é `v-p2r2/fuzz.mjs`. Foram 180 rodadas nas 5 arenas e **897 310 ticks**, nas seguintes condições:
- 4 jogadores com entradas aleatórias, incluindo diagonais, gota e poder;
- metade com chute, Pinça, velocidade máxima, +gotas e Estojo;
- três conjuntos de ajuste, inclusive os extremos da bancada: velocidade 85, chute 250, Disparada 250, tolerância 0 e pavio 90;
- jogadores imortais, para que o fuzz não acabe cedo.

O fuzz exercitou 389 travessias de túnel, 1498 saltos, 2087 chutes e 1356 arremessos. Resultado: **0 violações** de:
- centro do corpo sempre no interior;
- corpo nunca sobreposto a casa sólida, fora do salto;
- nada NaN;
- uma gota por casa, sempre em casa vazia.

### B1 (túnel) conferido de forma independente
- **Fuzz:** ninguém para na moldura em nenhuma condição.
- **Robôs no túnel** (`p2r2/tunel-ia.mjs`, 20 rodadas por nível na Caverna): tempo na moldura **0,0%** nos três níveis. Os empates no relógio caíram para 2, 4 e 3 em 20.
- **Navegador, só pelo teclado** (`v-p2r2/tunel-nav.mjs`, 390×844):
  - abri o caminho com duas gotas, desci até (1,5) e segurei ←;
  - x foi de 1,06 para **13,89** num tick e parou centrado em 13,5 diante do bloco;
  - as bocas aparecem como setas « » na moldura (`vr2-tunel-0.png`).
- **Aperto** (`v-p2r2/aperto.mjs`): nas 5 arenas e para os 4 cantos iniciais, a espiral derruba 106 peças, sem casa repetida. Sobra exatamente o miolo de 7 casas.
- **Canto inicial:** distribuição 999 / 1000 / 1000 / 1001 nas sementes 0–3999.

### IA, vivacidade e justiça
O script é `v-p2r2/vivacidade.mjs`, com o humano parado no canto. Foram 3 níveis × 5 arenas × 6 sementes = 90 rodadas.

| Nível | Robô parado: máximo | Robô confinado a ≤ 2 casas por 8 s | Humano molhado antes de 10 s / de 20 s | Primeira molhada / mediana |
|---|---|---|---|---|
| Fácil | 3,1 s | 0 | 0 / 0 | 22,8 s / 37 s |
| Médio | 5,1 s | 0 | 0 / 0 | 23,3 s / 53 s |
| Difícil | 4,2 s | 0 | 0 / 0 | 22,8 s / 46 s |

A segurança da largada (3.2) está garantida em todas as arenas, inclusive a Caverna. A IA não lê `ocultos`: o grep em `ia/` dá zero. Cada robô tem rng próprio e nenhum usa `Math.random`.

### Regras e itens em Node
Foram 15 sondas, nos scripts `p2r1/regras.mjs`, `v-p2r2/regras.mjs`, `cisco2.mjs` e `cascudo.mjs`:
- chute para antes do bloco e antes do rival;
- Pinça: 3 casas, quique e volta pela borda;
- Penetrante: atravessa os blocos, para no pilar e queima o item no caminho;
- Super Lupa leva o alcance a 8; a Lupa depois não passa do limite; os limites de gotas e velocidade valem;
- Estojo montado troca de bichinho;
- vida extra: depois de molhado, segue vivo com 60 ticks de pisca;
- Saltinho passa por cima do pilar;
- Disparada para no obstáculo;
- Cascudo defende pela frente e perde o bichinho pelas costas;
- o aperto esmaga quem está montado;
- empate quando todos caem juntos;
- Cisco agora **passa** em vez de copiar.

### Bancada `?ajuste=1` nas 4 telas
O script é `v-p2r2/bancada.mjs`, com o teclado no deslizante.
- A velocidade passa de 55 para 70, e a medida na partida em andamento vai de 0,55 para **0,70** casa em 10 ticks.
- "Copiar ajuste" dá `{"bomberolhoAjuste":{"velocidadeBase":70}}`. "Restaurar padrão" volta a 55. O ✕ fecha.
- Nenhum alvo menor que 44 px. Sem rolagem.
- Fração da arena coberta (aberta → recolhida):

| Tela | Aberta | Recolhida |
|---|---|---|
| 1280×720 | 30% | 6% |
| 390×844 | 9% | 0% |
| 844×390 | 44% | 18% |
| 360×640 | 50% | 21% |

### Jogando de verdade no Chromium
O script é `v-p2r2/jogador.mjs`. É um jogador heurístico meu, em malha fechada: lê o estado, decide e aperta as teclas com `keyboard.down/up` em tempo real. Tem dois perfis, "bom" e "criança".
- **Partidas:** 12 nas 4 telas × 3 níveis × 5 arenas (`jogos.out`), mais 6 só no Fácil, sem concorrência de CPU (`fac.out`).
- **Limpeza:** zero erro ou aviso de console, zero 404, zero pedido externo e `scrollWidth/Height` igual ao viewport em todas.
- **Capturas olhadas:** meio de partida, aperto, intervalo e resultado nas 4 telas, nas 5 arenas.
- **Resultado do meu jogador:** perde bastante, inclusive no Fácil. Nas 6 partidas só de Fácil, sem concorrência de CPU, ganhou 1 partida e 4 de 22 rodadas (tabela no fim). As mortes dele são, na maioria, **no aperto** (`eliminadoPor = null` entre 0:27 e 0:42) ou com a **própria gota**: o meu jogador só enxerga a próxima peça do aperto. Isso mede a minha heurística, não o jogo. As mortes por robô no Fácil vieram entre 33 s e 62 s de rodada, sempre depois da "calma" de 20 s.
- **Fonte para a escada de dificuldade:** uso os perfis-proxy do lote, que reproduzi.

### Originalidade (seção 2)
- O grep não encontra "Bomberman", nomes de empresas ou jogos, URLs externas, ROMs nem `console.log` em `bomberolho/`, no relatório nem no `resultado.md`.
- Os bichinhos, personagens e peças continuam próprios: sapinho, gota-foguete, lente com olhinhos e criaturinhas-olho.

## Bloqueadores

**Nenhum.**
- O B1 da rodada 1 está resolvido por construção: o túnel virou portal sem largura. Também está resolvido por medida: 0 violação em 897 mil ticks de fuzz, 0% de tempo na moldura e a espiral fecha tudo menos o miolo.
- Suítes verdes, console limpo, sem rede externa e sem regressão da Parte 1.
- Os entregáveis de 3.7 e 3.8 estão presentes e funcionam.

## Melhorias priorizadas

### M1 (média) — Cascudo num beco é imune a respingo indefinidamente
- **Causa:** a carapaça dura enquanto o botão estiver apertado (`sim/bichinhos.js:136-144`) e não tem limite de tempo nem de defesas.
- **Por que vira imunidade:** num beco (3 lados sólidos), o único respingo possível vem da frente.
- **Reprodução:** `v-p2r2/cascudo.mjs`, mapa `#1...2#`. A Íris, montada no Cascudo e virada para a saída, segura o botão. O rival solta 8 gotas de alcance 4 seguidas, uma a cada ~3,3 s. Ela continua **viva e montada**; só o aperto final a tira dali.
- **Efeito:** não quebra uma regra; é um poder forte demais. Uma criança que descubra o truque força a rodada até o aperto. A IA quase não usa isso (0,05 defesa por rodada).
- **Sugestão:** a carapaça fecha por no máximo ~1,5 s e depois tem recarga, como a Disparada (`RECARGA_PODER`). Outra saída: cada defesa gasta "força" e, na segunda defesa seguida, o bichinho se cansa. Cobrir com teste do tipo "Cascudo segurado não defende duas gotas seguidas".

### M2 (média) — Auto-eliminação do Difícil ≈ Médio
- **Medido:** 5,6% contra 6,4% por rodada; erro "puro" 3,1% contra 3,5%, no meu lote e no do executor.
- **O que diz o plano:** 3.3 diz "Difícil: … quase nunca se matam sozinhos".
- **Situação:** o executor documentou isso com honestidade nas limitações. A taxa é baixa em termos absolutos, e por isso não é bloqueador, mas o Difícil não é visivelmente mais cuidadoso que o Médio.
- **Sugestão:** usar a leitura de "encurralado por rival" como sinal para o Difícil não soltar gota quando a saída depende de uma casa vizinha de uma gota rival com pavio ≤ o seu. Aplicar só ao Difícil e medir de novo.

### M2b (média) — Confirmar o "iniciante vence o Fácil" com um proxy que não seja o próprio robô
- **O que falta:** o 91–92% do novato contra o Fácil foi medido com um robô do próprio jogo com desvantagens (`qa/lote/cenarios.mjs`). Esse robô já sabe ler o aperto e fugir.
- **Meu jogador heurístico externo, pelo teclado:**
  - perdeu 5 de 6 partidas no Fácil;
  - morreu sobretudo no aperto, que ele lê mal, e com a própria gota;
  - nas sementes 52–54, também caiu para robôs Fácil com 1:27 a 0:58 no relógio (33 s a 62 s de rodada), antes do aperto.
- **Por que não é bloqueador:** é um jogador fraco e não prova nada contra o jogo.
- **O risco que fica:** uma criança que não entende o aperto perde muitas rodadas para ele, e não para os robôs.
- **Sugestão:**
  - incluir no lote um proxy "criança" escrito de fora da IA (sem `planejarFuga`, só com a regra "fujo da cruz que vejo");
  - no Fácil, considerar aperto mais tardio ou mais lento (`inicioAperto` por nível).

### M3 (baixa) — Empates entre robôs bons continuam altos
- **Medido:** cerca de 40% das rodadas no Médio×Médio e no Difícil×Difícil (meu lote: 40,4% e 39,7%), metade delas por "todos caíram juntos" no miolo.
- **Para quem importa pouco:** contra o proxy de criança no Fácil, só 18% das rodadas e 2,7% das partidas empatam.
- **Sugestão (parte 3 ou acabamento):** uma "morte súbita" nos últimos 10 s, por exemplo o miolo marcado com aviso, para que a criança veja menos "Empate!".

### M4 (baixa) — Boca do túnel continua desenhada aberta quando o outro lado foi murado
- **Captura:** `vr2-jogo-paisagem-medio-caverna-resultado.png`. Com a arena toda murada, as setas « » continuam vivas, mas a passagem está fechada (`movimento.js:16-19`).
- **Sugestão (parte 3):** escurecer ou "fechar" a boca quando a casa de chegada estiver murada.
- Junto disso, o corte do boneco na travessia, que o executor já declarou.

### M5 (baixa) — Cisco vira "batata quente" entre dois parados encostados
- **Medido** (`cisco2.mjs`): parados e encostados, o azar troca de dono 10 vezes em 10 s, porque a imunidade é de 1 s.
- Não é defeito; o tempo total continua o mesmo e expira. É só registrar como decisão, ou subir a imunidade para ~2 s.

### M6 (baixa) — Bancada aberta cobre 44–50% da arena em paisagem e em 360×640
- Recolhida, cobre 18–21%. Está dentro do pedido.
- **Sugestão:** abrir já recolhida no celular.

## Rubrica (Parte 2)

| Item | Peso | Nota | Justificativa |
|---|---|---|---|
| IA | 30 | 25 | **Pontos fortes:**<br>• A escada agora é clara e reproduzida: Difícil 66,7% > Médio 33,3% > Fácil 0% no misto.<br>• Novato vence o Fácil em ~91%; bom jogador vence o Difícil em ~26% (desafiado).<br>• Chute virou arma de verdade no Difícil (1,25 por rodada) e é tímido no Fácil (0,03).<br>• Pinça e bichinhos são usados com escada (Fácil 0,12 arremessos por rodada; Médio e Difícil, 0,53–0,57).<br>• Nunca travam: máximo parado de 7,7 s no lote e 5 s nas minhas sondas; zero confinamento.<br>• Largada segura nas 5 arenas; não trapaceiam.<br>• Nas capturas parecem vivos: emboscam e montam bichinhos.<br><br>**Descontos:**<br>• Difícil ≈ Médio em auto-eliminação (M2).<br>• Médio ainda é um degrau alto para crianças pequenas (novato 22–27%).<br>• A vitória do iniciante no Fácil só foi medida com proxy interno (M2b). |
| Regras da batalha | 20 | 18 | **Pontos fortes:**<br>• Contagem, relógio e aperto em espiral com canto sorteado e aviso.<br>• Vitória e empate, troféus, limite de rodadas com desempate.<br>• 0 inconsistência em 683 + 2730 partidas e no fuzz.<br>• Bancada excelente nas 4 telas: efeito imediato, recolher, copiar só o que mudou, restaurar, fechar.<br><br>**Descontos:**<br>• Taxa de empates alta entre robôs bons (M3).<br>• Boca de túnel fechada sem sinal visual (M4). |
| Itens avançados | 20 | 18 | **Pontos fortes:**<br>• Chute (desliza, para centrado, estoura na hora se atingido), Super Lupa, Cisco (agora passa), Pinça com quique e volta pela borda.<br>• Penetrante legível; Estojo com 3 bichinhos originais; vida extra com pisca.<br>• Tudo determinístico e coberto por teste; os parâmetros novos estão na bancada.<br><br>**Descontos:**<br>• Carapaça do Cascudo sem limite (M1).<br>• "Batata quente" do Cisco (M5). |
| Arenas | 15 | 14 | **Pontos fortes:**<br>• 5 arenas distintas e bonitas: correnteza, túnel, lentes +2, clareira.<br>• O túnel agora é justo e legível, longe das largadas.<br>• Empates por arena equilibrados (29,8–39,4%; Caverna 33,6%).<br><br>**Desconto:**<br>• Detalhe visual da boca fechada (M4). |
| Balanceamento e robustez | 15 | 14 | **Pontos fortes:**<br>• Tabelas completas, com IC 95% e reproduzidas por mim em pedaços.<br>• Antes → depois para cada item do parecer.<br>• Causa raiz do viés de canto achada além do pedido: a cota de itens da cruz do meio.<br>• 0 NaN e 0 partida sem fim.<br>• Leitura dos números agora honesta: admite que a auto-eliminação não caiu e que os empates continuam.<br><br>**Desconto:**<br>• Empates entre robôs bons ainda altos. |
| **Total** | 100 | **89** | |

## Fiquei impressionado? **Sim** — por quê

Não foi só "cumpriu a lista".

**1. O executor resolveu o bloqueador por construção, e eu não consegui quebrar.** O túnel virou um portal sem largura. Tentei de todo jeito:
- quase 900 mil ticks de fuzz com velocidades, chutes, saltos, arremessos e Disparada nos extremos da bancada;
- robôs em 60 rodadas na Caverna;
- a travessia pelo teclado no navegador.

Ninguém para na moldura. O aperto fecha tudo menos o miolo nas 5 arenas e nos 4 cantos.

**2. O viés de canto foi investigado como um estúdio sério investigaria.** O executor corrigiu as duas hipóteses do parecer (espiral e ordem de processamento) e mediu que o viés **continuava**. Daí achou a causa real, que ninguém tinha apontado: a coluna e a linha do meio comiam a cota de itens dos quadrantes da esquerda e de cima.

**3. A escada de dificuldade se inverteu para o lado certo com margem estatística.** Reproduzi no meu lote: 66,7 / 33,3 / 0. O chute virou uma arma real do Difícil.

**4. O pacote como um todo supera o esperado para a parte:**
- 5 arenas com elementos próprios;
- Pinça com quique e volta pela borda;
- 3 bichinhos originais com poderes distintos;
- uma bancada que funciona redonda até em 360 px;
- um relatório que diz onde ainda não chegou.

As ressalvas (Cascudo sem limite, auto-eliminação do Difícil, empates entre robôs bons) são ajustes finos, não defeitos de regra.

## Apêndice — partidas no Chromium pelo teclado (meu jogador heurístico)

| Perfil | Tela | Nível | Arena | Campeão | Rodadas (vencedor) |
|---|---|---|---|---|---|
| bom | 1280×720 | Fácil | Jardim | robô 1 | [1] |
| criança | 390×844 | Fácil | Lago | **humano** | [—, —, 0] |
| criança | 360×640 | Médio | Vale | robô 3 | [3] |
| bom | 844×390 | Médio | Caverna | robô 3 | [—, 3] |
| bom | 390×844 | Difícil | Caverna | robô 3 | [—, 3] |
| bom | 1280×720 | Difícil | Consultório | robô 3 | [—, 3] |
| bom | 360×640 | Fácil | Caverna | robô 2 | [2] |
| criança | 844×390 | Difícil | Jardim | robô 2 | [2] |
| criança | 1280×720 | Fácil | Vale | robô 2 | [2] |
| bom | 360×640 | Difícil | Lago | robô 1 | [1] |
| bom | 390×844 | Médio | Jardim | robô 3 | [3] |
| criança | 1280×720 | Médio | Consultório | robô 1 | [1] |
| bom (sem concorrência de CPU), semente 51 | 1280×720 | Fácil | Jardim, melhor de 2 | **humano** | [0, 1, 2, 0] |
| bom, 52 | 1280×720 | Fácil | Jardim | robô 3 | [3, 2, 1, 3] |
| bom, 53 | 1280×720 | Fácil | Jardim | robô 2 | [1, —, 2, 2] |
| bom, 54 | 1280×720 | Fácil | Jardim | robô 1 | [3, —, 1, 1] |
| criança, 61 | 1280×720 | Fácil | Lago | robô 2 | [2, 1, 2] |
| criança, 62 | 1280×720 | Fácil | Lago | robô 2 | [2, 1, 0, 2] |

As 12 primeiras rodaram com dois navegadores em paralelo e com o lote ocupando os 4 núcleos. O laço de decisão caiu para 1 a 3 decisões por segundo, então essas partidas servem como prova de "joga do início ao fim pelo teclado, nas 4 telas, sem erro". Não servem como medida de dificuldade.

NOTA: 89
IMPRESSIONADO: sim
BLOQUEADORES: 0
VEREDITO: APROVADO
