# Parte 2 — Batalha completa · Rodada 1 (relatório do executor)

## Resumo

A batalha está completa e jogável do começo ao fim, com tudo o que a seção 4 e as seções 3.7 e 3.8 pedem:

- **Partida em rodadas**: contagem "3, 2, 1, Já!" (todos travados), relógio de 2:00 no placar, **aperto final em espiral** com aviso da próxima peça, vitória, empate (todos caem juntos ou o tempo acaba), **troféus**, placar entre rodadas e taça. Partida de 1 a 3 vitórias (`?rodadas=`), com limite de rodadas (e desempate por rivais molhados) contra partida infinita.
- **Itens avançados**: Chute-Pisca, Super Lupa, Cisco (3 azares, contagioso), **Pinça** (levantar/arremessar com quique e volta pela borda), **Colírio Penetrante** e **Estojo Surpresa** com três bichinhos — **Saltinho**, **Cascudo** e **Disparada** —, vida extra com ~1,1 s piscando e poder no segundo botão (Shift/E/K; `acao` no gancho).
- **Cinco arenas** com layout, peças e paleta próprios; três delas com elemento de arena: **correnteza** (Lago Lacrimal), **túneis** (Caverna da Pupila) e **lentes +2** (Consultório das Lentes). O Vale da Retina tem layout próprio (clareira central, menos blocos, mais itens).
- **IA em três níveis**, refeita do zero: leitura de perigo com **janelas de tempo** (cadeia, gotas chutadas, na mão, no ar com quiques, peças do aperto), planejador de fuga que sabe **esperar** a hora certa, emboscadas, táticas com Pinça e chute, uso dos bichinhos e "aposta final" nos últimos segundos.
- **Bancada de ajuste** em `?ajuste=1` (12 controles, efeito imediato, "Restaurar padrão", "Copiar ajuste"); fora disso nem o arquivo é baixado.
- **Simulação em lote** sem cabeça e reproduzível (`npm run lote`), com tabelas abaixo.
- **Testes**: suíte de simulação de 81 → 154 testes; navegador de 13 → 26 testes, todos passando.

## Como rodar e testar

```bash
node dev-server.mjs --port 7200        # → http://localhost:7200/bomberolho/
cd qa && npm i                          # só o Playwright (devDependency)
npm test                                # simulação + IA + amostra do lote (node --test)
npm run test:regras                     # só as regras (≈ 4 s), sem as partidas inteiras de robôs
npm run e2e                             # navegador (sobe o servidor sozinho numa porta livre)
npm run capturas                        # capturas em qa/capturas/
npm run lote                            # lote completo: ≈ 2 300 partidas, tabelas em lote/resultado.md
npm run lote:rapido                     # 5% do lote, para conferir em ~3 min
node navegador/desempenho.mjs           # fps em desktop e "celular de entrada"
```

**Parâmetros de URL** (novos em negrito): `?semente=`, `?dificuldade=facil|medio|dificil`, `?arena=jardim|lago|caverna|vale|consultorio`, `?demo=1`, `?personagem=`, `?escala=`, **`?rodadas=1|2|3`**, **`?ajuste=1`** (bancada).

**Teclado:** setas/WASD andam · Espaço (ou X/J) solta a gota — com a Pinça, apertar em cima da gota (ou colado nela, de frente) **levanta** e soltar o botão **arremessa** · **Shift (ou E/K) usa o poder do bichinho**; uma seta apertada junto escolhe a direção do pulo/arrancada · P/Esc pausa · Enter continua, pula o placar entre rodadas e joga de novo.

**Gancho `window.__bomberolho`** (versão `2.0.0-parte2`): tudo da parte 1, mais
- `input(j, {..., acao})` — o segundo botão;
- `start({..., rodadas, contagem: false})` — `contagem: false` começa sem o "3, 2, 1" (útil para testes);
- `ajustar({chave: valor})` / `restaurarAjuste()` — o mesmo efeito da bancada;
- `darItem(j, tipo)` — **só para testes**: entrega um item como se o competidor o pegasse;
- `hashCompleto()` — impressão digital de mundo + robôs + placar (M4);
- `state` ganhou `fase`, `contagem` (s), `relogio` (s), `aperto` (ativo, caídas, próxima casa e em quantos ticks), `partida` (alvo, vitórias, histórico, campeão, intervalo), `piso` (correnteza/lentes), `ajuste`, e por jogador `poderes.chute/pinca/penetrante`, `cisco`, `montaria`, `invulneravel`, `segurando`, `noAr`, `escudo`, `disparando`; por gota `estado` (`chao`/`mao`/`voo`), `deslizando`, `destino`, `penetrante`.

## Regras novas e decisões (todas determinísticas e cobertas por teste)

| Regra | Decisão | Teste |
|---|---|---|
| Contagem | 3 s de "3, 2, 1" com todos travados; o botão segurado na contagem não vira gota na largada; "Já!" aparece quando todos são soltos. O relógio só corre depois. | `batalha.test` |
| Relógio | 2:00 por rodada; acabou com mais de um de pé → **empate** (troféu para ninguém). | `batalha.test` |
| Aperto final | Com **1:00** no relógio, peças sólidas caem uma a uma em espiral **de fora para dentro, sentido horário**, a partir do canto de cima à esquerda, pulando pilares; 4 anéis e depois as duas colunas das pontas do miolo, sobrando um **"H" de 7 casas** no centro. O ritmo é calculado para terminar 20 s antes do fim. A **próxima casa** fica marcada no chão (sombra que cresce + moldura piscando) durante todo o intervalo. Quem está na casa é esmagado (mesmo montado); quem tem só meio corpo embaixo é empurrado para o centro da própria casa; gota e item embaixo somem. | `batalha.test` |
| Partida | Vence quem fizer `alvo` troféus (1–3, padrão 2). Placar de 4,5 s entre rodadas (Enter/botão pula). Cada rodada sorteia a própria arena a partir da semente. **Limite de `2 × alvo + 1` rodadas**: leva quem tem mais troféus; empatados no topo, desempata quem molhou mais rivais na partida (o cartão final explica); se ainda empatar, "partida empatada". | `batalha.test` |
| Chute-Pisca | Andar contra uma gota parada (alinhado, colado) a chuta: ela desliza de centro em centro e **para no centro** da última casa livre antes de pilar, bloco, gota ou jogador (itens não seguram). Enquanto desliza ocupa as duas casas que toca; atingida por respingo, estoura **na hora**, na casa mais próxima (entra na cadeia). Velocidade ajustável. | `chute.test` |
| Super Lupa | Alcance vai ao máximo (8). | `itens2.test` |
| Cisco | 10 s de azar sorteado pela semente: **lento** (olho embaçado), **ligeiro** (depressa demais, ainda < 1/10 de casa por tick) ou **espirro** (uma gota sem querer a cada 0,75 s). **Pega**: encostar em quem está com Cisco passa o azar adiante. Inofensivo por si só. Médio e Difícil evitam o item. | `itens2.test` |
| Pinça | Apertar em cima da gota (ou colado nela, de frente; sua ou alheia, o dono não muda) **levanta**; **soltar** o botão arremessa 3 casas para onde olha, por cima de tudo. Pousa sempre centrada; casa ocupada (sólido, gota ou jogador) → **quica** uma casa adiante, quantas vezes for preciso; ao passar da borda **dá a volta** e reaparece do lado oposto. O pavio corre na mão e no ar; **no ar nunca estoura** (espera pousar) e não é atingida; se acabar **na mão**, estoura ali. Toque rápido = levanta e arremessa na hora. | `pinca.test` |
| Colírio Penetrante | Item raro: o respingo atravessa **todos** os blocos do alcance (desfaz todos), mas para em pilar, moldura, muro e gota (cadeia). Gota e respingo **violeta**, gota com losango e anel tracejado. | `itens2.test` |
| Estojo Surpresa | Monta um bichinho sorteado; já montado, **troca por outro diferente**. Respingo queima estojo exposto. | `itens2.test` |
| Vida extra | Molhado montado: perde o bichinho, pisca **invulnerável 1,1 s** (ajustável) e segue na rodada. A peça do aperto ignora a vida extra. | `bichinhos.test` |
| Saltinho | Botão: pula **2 casas** para a frente por cima do que houver no meio (bloco, pilar, gota, jogador), se a casa de pouso estiver livre e dentro da arena; 20 ticks no ar sem colidir e sem ser molhado; recarga de 0,75 s. | `bichinhos.test` |
| Cascudo | **Segurar** o botão fecha a carapaça virada para a frente: fica parado (as setas só giram) e o respingo que vem **da frente** não o molha; costas e lados continuam vulneráveis. Arco tracejado mostra o lado protegido; fechada, vira um arco azul forte. | `bichinhos.test` |
| Disparada | Botão: arrancada reta a 9 casas/s enquanto estiver apertado (até 6 casas), parando no primeiro obstáculo (em dois meios-passos por tick, nunca atravessa nada); com Chute-Pisca, chuta a gota em que bate. | `bichinhos.test` |
| Correnteza (Lago) | Anel de água no sentido horário (linhas 3 e 9, colunas 3 e 11), sem blocos; empurra a 20 un/tick quem está alinhado à faixa (parado anda com a água; contra, mais devagar; a favor, mais rápido); quem atravessa de lado quase não é puxado; nunca empurra para dentro de sólido ou gota. Setinhas animadas mostram o sentido. Gotas não são levadas (decisão: legível e previsível). | `arenas.test` |
| Túneis (Caverna) | Bocas na moldura das linhas 3 e 9: quem passa do centro do túnel reaparece do outro lado, no mesmo sentido. Respingo e gota chutada não atravessam; não se solta gota dentro. A IA usa os túneis (vizinhança com volta). | `arenas.test` |
| Lentes (Consultório) | Cinco lentes no chão (sem blocos em cima): gota solta sobre uma lente ganha **+2 de alcance** — vale para todos e a IA leva em conta. | `arenas.test` |
| Itens por quadrante (M6) | Os itens escondidos são repartidos em rodízio pelos 4 quadrantes: cada canto recebe a sua parte de cada tipo (≥ 2 Frasquinho/Lupa por quadrante em todas as sementes testadas). | `arenas.test` |

**Vale da Retina** não tem mecânica nova, mas tem layout próprio (clareira 5×3 sem blocos no centro, 70% de blocos, 42% com item). Cada arena tem desenho próprio de **pilar** (lente, pedra de ondas, pupila, cone, armação de óculos) e de **bloco** (pólen, cristal de sal, pedrinha, bastonetes, caixinha de lente) — verificado em teste que os cinco são distintos. Na Caverna escura os blocos são claros e os pilares têm aro claro (contraste garantido).

## Bancada de ajuste (3.7)

- `?ajuste=1` carrega `js/ui/bancada.js` e `css/bancada.css` por `import()` dinâmico; sem o parâmetro nada disso é pedido (testado olhando as requisições).
- 12 controles com efeito **imediato** na partida em andamento: velocidade base, ganho por Lágrima Veloz, pavio, duração do respingo, tolerância do deslize de quina, janela para virar a esquina (M1), velocidade do chute, início do aperto final, distância da Pinça, pisca-pisca do bichinho, arrancada da Disparada, duração do Cisco. Valores mostrados em unidades de gente (casas/s, s); os mudados ficam azuis.
- **Restaurar padrão** e **Copiar ajuste**: copia uma linha JSON curta (`{"bomberolhoAjuste":{...}}`); se a área de transferência estiver bloqueada, o texto aparece selecionado para copiar à mão. `criarAjuste(lido)` aceita exatamente esse texto.
- Todos os parâmetros vivem em `js/sim/ajustes.js`; a simulação lê `m.ajuste` (teste confere que nenhum módulo da simulação usa as constantes antigas). O controlador passa **o mesmo objeto** a cada rodada, então o ajuste vale até o fim da partida. Mesma configuração + mesma semente = mesmo resultado (testado).
- Celular: gaveta embaixo (34% da altura) em retrato, painel lateral estreito em paisagem; alvos ≥ 44 px; fecha com um toque no ✕ e reabre no botão "Ajuste". As setas do teclado mexem no controle focado, não no boneco.

## IA (3.3 + 3.8)

Arquivos: `ia/perigo.js` (leitura), `ia/caminhos.js` (busca e fuga com tempo), `ia/taticas.js` (itens avançados e bichinhos), `ia/robo.js` (decisão e níveis).

- **Leitura do que está na tela**: para cada casa, as janelas `[início, fim)` em que ela estará molhada — respingos atuais, gotas paradas (com cadeia propagada), chutadas (onde vão parar), **na mão** (onde serão jogadas), **no ar** (seguindo os quiques), lentes, e as próximas 6 peças do aperto (perigo "para sempre"). Calculada uma vez por tick e repartida entre os robôs. **Nunca lê os itens escondidos** nem o gerador do mundo (teste lê o código).
- **Fuga planejada com tempo**: busca em camadas ("onde posso estar no passo k"), que aceita **esperar** numa casa seca e só atravessa uma casa quando ela está seca durante a passagem, com folga por nível. O primeiro passo usa o tempo real até a casa vizinha (quem está a meio caminho chega antes nela). O refúgio escolhido é mantido enquanto servir (sem "vai e volta" na fronteira entre casas). Sem fuga a pé: bichinho (pulo para casa seca, carapaça virada para o único lado da ameaça, arrancada por corredor reto) ou Pinça (levanta a gota de baixo de si e joga longe).
- **Soltar gota** só depois de simular a gota hipotética (com cadeia) e achar fuga; Médio/Difícil exigem duas saídas quando há rival por perto. Pontos de quebrar bloco são escolhidos já conferindo a fuga.
- **Ataque**: nota da gota (3 = rival sem fuga, 2 = fuga apertada, 1 = na cruz); Difícil também enxerga armadilhas fora da cruz (cadeias, corredores). **Emboscada** (Médio/Difícil): procura perto dos rivais a casa de onde a gota os encurrala e vai até lá. **Segunda gota na fuga** para fechar a saída de alguém. **Aposta final**: com o relógio quase no fim (empate certo), uma gota que estoura antes do 0:00 e encurrala alguém só pode melhorar o resultado — Médio e Difícil arriscam.
- **Táticas**: Pinça (em cima da própria gota, arremessa onde a cruz do pouso pega um rival), chute (gota colada cuja parada põe rival na cruz), atalho do Saltinho (pular encurta o caminho em 3+ casas), arrancada da Disparada em fuga reta urgente.
- **Nunca parada sem motivo**: sem alvo, passeia; maior tempo parado medido no lote (tabela 8).

| | Fácil | Médio | Difícil |
|---|---|---|---|
| Folga na fuga | 0 ticks | 2 | 8 |
| Reação a gota alheia | 0,5 s | 0,23 s | imediata |
| Alcance alheio que enxerga | no máximo 2 (subestima Lupas) | real | real |
| Prevê cadeia | não | sim | sim |
| Planeja a fuga | 6 passos | 9 | 16 |
| Ataca | só depois de 20 s, raramente persegue | após 6 s; encurrala às vezes | após 3 s; armadilhas, emboscada a cada 0,25 s |
| Itens avançados / bichinhos | tímido (12% / 35%) | 60% / 85% | sempre que vale |
| Cisco | pega (é engraçado) | evita | evita |
| Distração | 10% das gotas sem conferir a fuga direito | — | — |

## Melhorias do parecer da parte 1

- **M1** (diagonal que passa da esquina): "rolar" as teclas (→ e depois ↓) abre uma janela de 0,22 casa para voltar e pegar a esquina; com a diagonal segurada desde o começo continua a escadinha sem ir e voltar. Parâmetro `janelaVirada` na bancada. Teste: desce em ≤ 24 ticks (antes 53).
- **M2** (toque rápido na seta): setas tocadas entre dois ticks são entregues por 1 tick (teste com teclado falso em Node).
- **M3**: tolerância do deslize de quina virou parâmetro (`toleranciaQuina`, 0–0,5 casa).
- **M4**: `impressaoCompleta()`/`hashCompleto()` incluem robôs e placar; teste de partida completa reprodutível.
- **M5**: `npm run test:regras` roda só as regras em ~4 s; `npm test` continua com tudo.
- **M6**: itens por quadrante garantidos por semente (ver tabela de regras).
- **M7**: IA refeita (seção IA e tabelas).
- **M8**: respingos e partículas recortados ao interior da moldura.

## Testes da parte 1 que mudaram (de propósito, com a regra nova)

- `grade.test` "itens escondidos": a mistura agora inclui os itens avançados; o teste confere a mistura da tabela da arena, ~1/3 dos blocos e que Frasquinho e Lupa continuam os mais frequentes.
- `robos.test` "controlador": `iniciar({..., contagem: false})` (sem o "3, 2, 1" para medir o passo).
- `parametros.test`: os objetos esperados ganharam `rodadas` e `ajuste`.
- `navegador/jogo.test`: `start({..., contagem: false})` nos testes de passo exato; espera de 4,5 s no `?demo=1` (contagem); o hash Node × navegador compara 360 ticks (dentro da primeira rodada) com o relógio ligado nos dois; o título do fim agora é "levou a taça"/"Partida empatada".
Nenhum teste foi removido; nenhuma regra da parte 1 mudou.

## Arquivos

**Novos:** `js/sim/ajustes.js`, `aperto.js`, `partida.js`, `chute.js`, `pinca.js`, `bichinhos.js`; `js/ia/caminhos.js`, `taticas.js`; `js/render/bichinhos.js`; `js/ui/bancada.js`; `css/bancada.css`; `qa/lote/{cenarios,partida,simular}.mjs`; `qa/sim/{batalha,chute,pinca,itens2,bichinhos,arenas,ajuste,ia,lote}.test.mjs`; `qa/navegador/parte2.test.mjs`.
**Alterados:** quase todos os módulos de `js/` (simulação, IA, desenho, interface, gancho, teclado, parâmetros), `index.html`, `css/estilo.css`, os testes listados acima, `qa/navegador/capturas.mjs`, `qa/package.json`.

## Medições

- **Suítes:** `npm test` **154/154** em ~22 s (81 da parte 1, todos mantidos, + 73 novos; `npm run test:regras` roda as 134 de regras em ~4 s); `npm run e2e` **26/26** em ~44 s (13 da parte 1 + 13 novos: contagem/relógio, placar entre rodadas e taça, Shift → Saltinho, Pinça pelo teclado, bancada ausente sem o parâmetro, bancada em 3 telas, partida inteira em cada uma das 5 arenas a 360×640).
- **Navegador:** zero erro, aviso ou 404 em todas as capturas e testes (o `apoio.mjs` coleta console, `pageerror`, respostas ≥ 400 e falhas de requisição). Capturas em `qa/capturas/` — 4 telas × 5 momentos (largada com contagem, partida, aperto, placar entre rodadas, taça), as 5 arenas, a cena dos poderes e a bancada em desktop, retrato e paisagem. Olhei todas; corrigi: pilar do Lago parecido com gota (virou pedra de ondas), cartões do placar transbordando em 390/360 px, borrifo do respingo vazando pela moldura, barra mostrando a rodada seguinte durante o placar, bichinho escondido debaixo do personagem (personagem montado agora menor e mais alto), gaveta da bancada alta demais no retrato.
- **Peso:** `bomberolho/` = **249 kB** sem compressão (41 arquivos, ~5 900 linhas de JS); a bancada (9 kB) só é baixada com `?ajuste=1`. Orçamento: 600 kB.
- **fps** (`node navegador/desempenho.mjs`, Chromium headless com rasterização por software): desktop **60 fps** (p95 16,7 ms); "celular de entrada" (390×844, DPR 3, CPU 4× mais lenta) **42 fps** (p95 33 ms) — igual à parte 1. A IA custa em média 0,1–0,2 ms por tick para os 4 robôs (pior caso medido 6,8 ms).

## Simulação em lote (balanceamento)

Comando: `cd qa && npm run lote` (sementes fixas → reproduzível; 4 trabalhadores; tabelas em `qa/lote/resultado.md`, detalhes em `resultado.json`, que fica fora do git por ter 6 MB). Cenários em `qa/lote/cenarios.mjs`; cada partida passa pelo controlador real (`js/jogo.js`), com contagem, relógio, aperto, troféus, intervalo e desempate. "novato" e "bom" são **perfis-proxy** de gente (robôs com parâmetros explícitos: o novato reage devagar, não prevê cadeias e planeja pouco à frente; o "bom" tem a leitura do Difícil). Não substituem testes com crianças de verdade.

Escala 1, 4 trabalhadores, 2592 s. Cada partida é "melhor de 2 vitórias" pelo controlador real (contagem, relógio de 2:00, aperto final, troféus).

#### 1. Visão geral por cenário

| Cenário | Partidas | Rodadas | Rodadas com vencedor | Empate (relógio) | Empate (todos caíram) | Duração média | p90 | Máx. | Rodadas/partida (máx.) | Taça no desempate | Partida empatada |
|---|---|---|---|---|---|---|---|---|---|---|---|
| mesmo:facil | 400 | 1433 | 87.0% | 7.0% | 5.9% | 71 s | 106 s | 120 s | 3.58 (5) | 5.3% | 3.0% |
| mesmo:medio | 400 | 1752 | 51.8% | 31.8% | 16.4% | 110 s | 120 s | 120 s | 4.38 (5) | 30.8% | 8.5% |
| mesmo:dificil | 400 | 1821 | 44.0% | 37.4% | 18.6% | 114 s | 120 s | 120 s | 4.55 (5) | 34.3% | 7.8% |
| novato×facil | 300 | 882 | 83.4% | 12.2% | 4.3% | 82 s | 120 s | 120 s | 2.94 (5) | 0.7% | 0.7% |
| novato×medio | 150 | 632 | 55.5% | 29.4% | 15.0% | 109 s | 120 s | 120 s | 4.21 (5) | 24.7% | 6.0% |
| bom×dificil | 300 | 1373 | 44.4% | 35.9% | 19.7% | 114 s | 120 s | 120 s | 4.58 (5) | 35.0% | 9.0% |
| bom×medio | 150 | 663 | 50.2% | 33.0% | 16.7% | 110 s | 120 s | 120 s | 4.42 (5) | 30.0% | 5.3% |
| misto | 240 | 914 | 55.4% | 33.8% | 10.8% | 106 s | 120 s | 120 s | 3.81 (5) | 17.5% | 2.1% |

#### 2. Vitórias de partida por canto (todos do mesmo nível)

Cantos: 0 = cima/esquerda, 1 = cima/direita, 2 = baixo/esquerda, 3 = baixo/direita. O esperado, se for justo, é ~25% cada (o resto até 100% são partidas empatadas até no desempate).

| Nível | Partidas | Canto 0 | Canto 1 | Canto 2 | Canto 3 | Partida sem campeão |
|---|---|---|---|---|---|---|
| facil | 400 | 20.8% | 21.8% | 25.0% | 29.5% | 3.0% |
| medio | 400 | 14.3% | 25.3% | 23.0% | 29.0% | 8.5% |
| dificil | 400 | 19.8% | 24.8% | 20.3% | 27.5% | 7.8% |

#### 3. Por arena (todos do mesmo nível, os três níveis juntos)

| Arena | Rodadas | Com vencedor | Empate | Duração média | Quedas no aperto | Itens pegos/rodada |
|---|---|---|---|---|---|---|
| jardim | 981 | 64.7% | 35.3% | 99 s | 7.7% | 20.3 |
| lago | 976 | 61.3% | 38.7% | 99 s | 10.2% | 16.1 |
| caverna | 1079 | 41.9% | 58.1% | 105 s | 6.7% | 17.9 |
| vale | 996 | 62.9% | 37.1% | 98 s | 8.0% | 19.8 |
| consultorio | 974 | 66.1% | 33.9% | 99 s | 7.9% | 18.8 |

#### 4. Por que cada um caiu (por nível de quem caiu, todos os cenários)

"Própria gota" = só respingos dele cobriam a casa e nenhum foi disparado por gota alheia. "Própria, em cadeia" = respingo dele, mas a gota foi detonada pela cadeia de um rival. "Rival" = respingo de outro. A última coluna é a taxa de auto-eliminação por robô por rodada jogada.

"Aposta final" = caiu com a própria gota nos últimos 5 s do relógio, quando um empate já era certo (Médio e Difícil arriscam de propósito: pior que o empate não fica). A última coluna exclui essas apostas.

| Quem caiu | Rodadas jogadas | Quedas | Própria gota | …dessas, aposta final | Própria, em cadeia | Rival | Aperto final | Auto-eliminação por rodada (sem apostas) |
|---|---|---|---|---|---|---|---|---|
| facil | 10206 | 8383 | 3.0% | 0.1% | 5.1% | 91.5% | 0.5% | 2.4% |
| medio | 11807 | 7835 | 11.2% | 2.0% | 20.3% | 56.2% | 12.3% | 6.1% |
| dificil | 12317 | 8057 | 10.2% | 2.0% | 22.9% | 55.7% | 11.1% | 5.3% |
| novato | 1514 | 755 | 16.6% | 0.9% | 14.2% | 63.6% | 5.7% | 7.8% |
| bom | 2036 | 1425 | 10.5% | 1.3% | 22.9% | 53.8% | 12.9% | 6.4% |

#### 5. "Gente" contra os robôs (perfis-proxy, ver qa/lote/cenarios.mjs)

| Cenário | Partidas | Proxy campeão | Rodadas vencidas pelo proxy | Proxy caiu sozinho (por rodada) | Robôs campeões | Sem campeão |
|---|---|---|---|---|---|---|
| novato×facil | 300 | 91.0% | 63.7% | 7.0% | 8.3% | 0.7% |
| novato×medio | 150 | 5.3% | 6.0% | 10.0% | 88.7% | 6.0% |
| bom×dificil | 300 | 21.0% | 10.8% | 7.4% | 70.0% | 9.0% |
| bom×medio | 150 | 18.7% | 8.7% | 7.2% | 76.0% | 5.3% |

#### 6. Níveis misturados (1 Difícil, 1 Médio, 2 Fácil; cantos girando)

| Campeão | Partidas | % | Esperado se fossem iguais |
|---|---|---|---|
| Difícil | 87 | 36.3% | 25% |
| Médio | 144 | 60.0% | 25% |
| Fácil (cada um) | 2 | 0.8% | 25% |
| Sem campeão | 5 | 2.1% | — |

#### 7. Itens pegos e poderes usados (média por competidor por rodada, todos os cenários)

| Quem | gota | alcance | velocidade | chute | superLupa | cisco | pinca | penetrante | estojo |
|---|---|---|---|---|---|---|---|---|---|
| facil | 1.29 | 1.20 | 0.76 | 0.42 | 0.26 | 0.46 | 0.30 | 0.26 | 0.42 |
| medio | 1.23 | 1.16 | 0.72 | 0.40 | 0.26 | 0.00 | 0.28 | 0.25 | 0.41 |
| dificil | 1.06 | 1.02 | 0.61 | 0.35 | 0.23 | 0.00 | 0.24 | 0.21 | 0.36 |
| novato | 1.25 | 1.25 | 0.73 | 0.44 | 0.26 | 0.52 | 0.30 | 0.27 | 0.43 |
| bom | 1.06 | 0.97 | 0.59 | 0.33 | 0.23 | 0.00 | 0.25 | 0.22 | 0.35 |

Poderes: chute = gotas chutadas; arremesso = gotas jogadas com a Pinça; penetrante = respingos de Colírio Penetrante; montou = Estojos abertos; salto/disparada = poderes usados; defendeu = respingos barrados pela carapaça do Cascudo; perdeuBichinho = vidas extras gastas; cisco = vezes que pegou Cisco de outro; espirro = gotas soltas sem querer.

| Quem | chute | arremesso | penetrante | montou | salto | disparada | defendeu | perdeuBichinho | cisco | espirro |
|---|---|---|---|---|---|---|---|---|---|---|
| facil | 0.020 | 0.084 | 2.531 | 0.418 | 0.168 | 0.019 | 0.002 | 0.340 | 0.243 | 0.870 |
| medio | 0.087 | 0.787 | 7.383 | 0.414 | 0.524 | 0.176 | 0.041 | 0.276 | 0.060 | 0.047 |
| dificil | 0.054 | 0.667 | 9.039 | 0.361 | 0.390 | 0.180 | 0.044 | 0.247 | 0.025 | 0.012 |
| novato | 0.053 | 0.194 | 5.063 | 0.433 | 0.320 | 0.098 | 0.007 | 0.201 | 0.195 | 0.898 |
| bom | 0.064 | 0.657 | 9.157 | 0.353 | 0.430 | 0.180 | 0.043 | 0.247 | 0.001 | 0.006 |

#### 8. Robustez

| Checagem | Resultado |
|---|---|
| Posições NaN/infinitas | 0 |
| Rodadas além do limite (relógio + contagem + pausa) | 0 |
| Partidas sem fim | 0 |
| Partidas encerradas normalmente | 2340 de 2340 |
| Maior sequência parado (robô vivo, rodada valendo) — mediana / p95 / máx. | 2.8 s / 3.7 s / 17.0 s |

**Leitura das tabelas**

- **Fácil é vencível por um iniciante:** o proxy "novato" leva a taça em **91%** das partidas contra três Fáceis (64% das rodadas). Contra o Médio cai para 5% — o salto de dificuldade é grande e intencional (Médio e Difícil foram feitos para quem já joga).
- **Difícil desafia quem joga bem:** o proxy "bom" (mesma leitura do Difícil) leva 21% contra três Difíceis — praticamente a parte justa de 1/4 — e 19% contra três Médios (os Médios arriscam mais).
- **Ordem dos níveis:** misturados, Difícil e Médio levam 96% das taças e cada Fácil, 0,8%. O Médio aparece à frente do Difícil porque arrisca mais (e o Difícil, mais cauteloso, termina mais vezes no desempate).
- **Justiça dos cantos:** no mesmo nível, cada canto leva entre 14% e 30% das taças (esperado ~25%, com variação de amostra de 400 partidas; nenhum canto domina em todos os níveis).
- **Auto-eliminação:** Fácil **2,4%** por rodada; Médio **6,1%**, Difícil **5,3%** (sem contar a aposta final, que é deliberada). Ver limitações sobre o que entra nessa conta.
- **Robustez:** 2 340 partidas e 9 470 rodadas sem nenhum NaN, nenhuma rodada além do limite e nenhuma partida sem fim; o maior tempo parado de um robô vivo foi 17 s (mediana 2,8 s, p95 3,7 s — esperando gota estourar).

## Limitações conhecidas (honestas)

- **Empates entre robôs bons.** Robôs Médios e Difíceis fogem muito bem uns dos outros: entre si, 30–37% das rodadas vão ao relógio (empate pela regra 3.2). Para que isso não vire partida sem fim, a partida tem no máximo 2 × alvo + 1 rodadas e, no limite, desempata por rivais molhados (31–35% das taças Médio×Médio e Difícil×Difícil saem assim; 8% das partidas ainda terminam empatadas). Contra o proxy de criança (Fácil) isso quase não acontece (0,7%). A Caverna, com os túneis, tem mais empates (58% das rodadas entre robôs) — os túneis dão rotas de fuga. Pode ser ajustado na parte 3/4 se o dono achar demais.
- **"Própria gota" inclui encurralamentos.** A conta de auto-eliminação considera "própria" toda queda em que só respingos do próprio robô cobriam a casa; nos casos que investiguei, boa parte é robô encurralado entre as próprias gotas depois que um rival fechou a saída, ou no "H" final do aperto, sem casa livre. "Própria, em cadeia" (20–23% das quedas de Médio/Difícil) é quando a gota dele foi detonada pela cadeia de outra — em geral uma gota alheia solta depois, que nenhuma leitura de estado consegue prever.
- **Chute pouco usado pela IA:** 0,05–0,09 chutes por robô por rodada (em ataque e em fuga). Pinça, bichinhos e emboscadas são bem mais usados.
- **Perfis-proxy não são crianças.** "Iniciante vence com frequência" foi medido com um robô que imita um iniciante; não houve teste com gente.
- **Controle de toque** (inclusive o botão menor do bichinho no celular) é da parte 4; nesta parte o segundo botão existe no teclado (Shift/E/K) e no gancho (`acao`).
- **Arte e som:** os bichinhos, itens e peças novos são desenhados por código, legíveis e originais, mas o acabamento fino (animações de montar, comemoração, partículas próprias de cada item) e todo o som ficam para a parte 3. Os bichinhos ficaram pequenos em telas de 360 px (o personagem montado encolhe para mostrá-los).
- **Correnteza não leva gotas** (só jogadores) — decisão de legibilidade; documentada acima.
- **fps no celular** continua medido só em emulação.
- O desempenho medido pelo script cobre os primeiros segundos de partida (contagem + início); a amostra de 2 340 partidas mede o custo da IA em Node.

## Originalidade

Tudo desenhado por código (Canvas e o SVG próprio do favicon); nomes de itens, bichinhos e arenas são do projeto e em português; os bichinhos têm formas próprias (cúpula-pálpebra com pernas de mola, carapaça-lente transparente, gota deitada com rodinhas) e não lembram montarias de jogos existentes. Nada foi baixado além do `playwright` que já estava em `qa/`. O teste `pureza.test` continua vigiando o nome proibido, endereços externos e `console.log`.

