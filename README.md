# Bomberolho — A batalha das gotinhas

Jogo de batalha em arena para o navegador, feito para crianças jogarem no
celular enquanto esperam a consulta. O tema é oftalmologia. Você é uma
criaturinha-olho e enfrenta três robôs numa arena de blocos. Cada um solta
gotas de colírio que estouram em cruz. Quem fica sequinho por último ganha o
troféu da rodada, e quem junta os troféus leva a taça.

- **Feito do zero:** personagens, arenas, sons e música são todos originais,
  desenhados e sintetizados por código. Nenhum material de outros jogos.
- **Tudo dentro da pasta `bomberolho/`:** HTML, CSS e JavaScript (módulos
  nativos). Não depende de nada, não tem etapa de build, usa só caminhos
  relativos e nunca acessa a rede.
- **Privacidade:** sem login, cookies, analytics ou coleta de dados.
  - O `localStorage` guarda só as preferências: som, lado dos controles de
    toque, último personagem, arena e dificuldade.
  - Guarda também um placar local de taças, que fica no próprio aparelho.
- **Celular primeiro:** funciona em retrato e paisagem, de 360 px de largura
  para cima, com controles de toque. No computador, joga-se com o teclado.

O plano completo, com as decisões, as partes e as rubricas, está em
[PLAN.md](PLAN.md).

## Como rodar

Precisa só do Node 18 ou mais novo, porque o servidor de desenvolvimento não
tem dependências.

```bash
node dev-server.mjs --port 7200
```

Depois abra **http://localhost:7200/bomberolho/**.

Qualquer servidor estático serve, pois o jogo é só arquivos. Abrir o
`index.html` direto do disco (`file://`) **não** funciona: o navegador bloqueia
módulos ES fora de um servidor.

## Como jogar

| | Teclado (computador) | Toque (celular/tablet) |
|---|---|---|
| Andar | setas ou W A S D | arraste o polegar na metade esquerda da tela. A alavanca nasce onde o dedo encosta. |
| Soltar gota | Espaço (ou X / J) | botão azul grande. O número mostra as gotas livres. |
| Poder do bichinho | Shift (ou E / K) | botão branco ao lado da gota. Só aparece quando você está montado. |
| Pausar | P ou Esc | botão ⏸ no topo |
| Pinça | segure a gota e solte para jogar | segure o botão azul e solte para jogar |

- **Canhotos:** em "Como jogar", ligue **Gota na mão esquerda**. Também dá para
  trocar no meio da partida, pelo botão **Trocar lados** da pausa. A escolha
  fica guardada no aparelho.
- **Pausa automática:** se a aba vai para o segundo plano ou a janela perde o
  foco, o jogo pausa sozinho. Isso acontece, por exemplo, quando a criança é
  chamada para a consulta ou quando chega uma notificação.

## Como testar (`qa/`)

Os testes ficam em `qa/` e usam a única dependência do projeto, o Playwright
(versão fixa em `qa/package.json`). Ele serve só para desenvolvimento e não vai
para o site.

### Instalação numa máquina nova (uma vez só)

Precisa do Node 18 ou mais novo e de acesso à internet nesta etapa:

```bash
cd qa
npm i                               # baixa o Playwright para qa/node_modules
npx playwright install chromium     # baixa o Chromium que essa versão do Playwright usa
```

- O `npm test` não precisa de nada disso: roda só com o Node.
- **Chromium já instalado** (contêineres e máquinas de CI costumam trazer um, por
  exemplo em `/opt/pw-browsers`): dá para pular o `npx playwright install` e
  usar esse navegador pelo `executablePath` do Playwright. O
  `qa/navegador/apoio.mjs` já faz isso sozinho quando o Chromium do pacote não
  existe e há um em `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; em
  outro caminho, troque a constante `local` na função `abrirNavegador()`.

### Suítes

```bash
cd qa
npm test             # simulação e lógica pura, com node --test, sem navegador (~30 s)
npm run e2e          # navegador (Chromium): jogo, menus, toque, robustez (~2–3 min)
npm run todos        # as duas, em sequência
npm run test:regras  # só as regras, pulando os testes de partida inteira e de IA (mais rápido)
```

Os testes de navegador sobem sozinhos o `dev-server.mjs` numa porta livre; não
é preciso deixar o servidor rodando.

### Ferramentas de medição

Todas rodam de dentro de `qa/` e também sobem o servidor sozinhas.

| Comando | O que faz |
|---|---|
| `npm run desempenho` | Quadros por segundo numa partida em modo demo (Jardim, Difícil), no desktop 1280×720 e num "celular de entrada" emulado (390×844, DPR 3, CPU 4× mais lenta). Para cada momento da rodada — **começo** (relógio em 1:55), **meio** (1:25) e **aperto final** (0:45, com o aperto já ligado) — dá o fps médio, o p95 do tempo de quadro, o pior fps numa janela de 0,5 s e a fatia de quadros acima de 34 ms, separando o 1,5 s logo após chegar (adaptação da nitidez) dos 6 s seguintes. Mede também, em tempo real, a **entrada no aperto** (antes, nos 2 s depois de ligar e em seguida) e o menu no celular lento. Opções: `-- --vezes N` (repetições) e `-- --json arquivo.json`. Termina com erro se não conseguir chegar a algum momento. ~1,5 min por repetição. |
| `npm run memoria` | 5 min de partidas seguidas, medindo o heap, os nós do DOM e os ouvintes de evento a cada 30 s. |
| `npm run capturas:p4` | Capturas das telas de celular e acabamento em `qa/capturas/p4/`. `npm run capturas:p3` faz as da parte 3 (em `qa/capturas/p3/`). |
| `npm run lote` | Simulação em lote sem cabeça (≈ 2 300 partidas, sementes fixas), com tabelas de balanceamento em `qa/lote/resultado.md`. Inclui o perfil "criança", escrito fora da IA do jogo (`qa/lote/crianca.mjs`). Demora (dezenas de minutos). |
| `npm run lote:rapido` | O mesmo lote a 5% (`qa/lote/rapido.md`), em poucos minutos. |
| `npm run som` | Volume (pico e LUFS) dos efeitos e das trilhas, medido pela cadeia de áudio real. |

Os JSON brutos que o lote e os scripts de verificação gravam (`qa/lote/*.json`,
`qa/verificacao/**/*.json`) ficam fora do git: são grandes e se recriam rodando
o script de novo. Versionam-se só as tabelas em `.md`. As capturas
(`qa/capturas/`) também ficam fora do git.

## Parâmetros de URL (para testes e links diretos)

Sem parâmetros, o jogo abre o menu. Com qualquer parâmetro de jogo, começa
direto na partida.

| Parâmetro | Valores | Efeito |
|---|---|---|
| `?arena=` | `jardim`, `lago`, `caverna`, `vale`, `consultorio` | arena |
| `?dificuldade=` | `facil` (padrão), `medio`, `dificil` | nível dos robôs |
| `?personagem=` | `iris`, `pupilo`, `cornea`, `retina`, `cristalino`, `macula`, `cilio`, `lente` | quem você é |
| `?rodadas=` | `1`, `2` (padrão), `3` | troféus para levar a taça |
| `?semente=` | número ou texto | mapa e sorteios fixos (reprodutível) |
| `?demo=1` | | seu personagem joga sozinho (piloto automático) |
| `?escala=` | número maior que `0`, até `8` | velocidade do tempo (2 = dobro); fora disso, 1 |
| `?ajuste=1` | | abre a bancada de ajuste do "sentir" (ver abaixo) |
| `?toque=1` / `?toque=0` | | força ou esconde os controles de toque. Com `1`, o mouse também move a alavanca, para testar no computador. |
| `?densidade=` | `1` a `3` | fixa a nitidez do canvas. Sem o parâmetro, ela começa em até 2× e desce sozinha se o aparelho estiver lento. |

Valores desconhecidos caem no padrão em silêncio (`bomberolho/js/parametros.js`).

Para testes automatizados, existe o gancho `window.__bomberolho`, com `state`,
`start()`, `step()`, `input()`, `setTimeScale()`, `demo()`, `pause()`,
`menu()`, `ajustar()`, `restaurarAjuste()`, `darItem()`, `hash()` e
`hashCompleto()`. Ele está descrito em `bomberolho/js/gancho.js`. No `state`, o
relógio da rodada é `relogio` (segundos que faltam) e o aperto final é
`aperto.ativo`.

## Bancada de ajuste (`?ajuste=1`)

Abra `http://localhost:7200/bomberolho/?ajuste=1`. Aparece um painel recolhível
com controles deslizantes, e cada mudança vale na hora, na partida em
andamento. Dá para ajustar:

- a velocidade e o ganho da Lágrima Veloz;
- o pavio e o respingo;
- o deslize de quina;
- o chute;
- o início do aperto final;
- a Pinça e os bichinhos, incluindo o tempo máximo da carapaça do Cascudo;
- o Cisco.

Os botões são:

- **Restaurar padrão:** volta aos valores de fábrica.
- **Copiar ajuste:** copia um JSON curto só com o que mudou, para virar o novo
  padrão em `bomberolho/js/sim/ajustes.js`.

Sem `?ajuste=1`, o módulo da bancada nem é baixado.

## Estrutura

```
bomberolho/            ← o jogo (é só esta pasta que vai para o site)
  index.html
  favicon.svg
  css/                 estilo.css, menu.css, toque.css, bancada.css (só com ?ajuste=1)
  js/
    main.js            liga tudo
    sim/               simulação pura e determinística (roda no Node)
    ia/                robôs
    render/            desenho no canvas
    ui/                menus, placar, avisos, bancada
    input/             teclado, toque
    audio/             síntese WebAudio
    dados/             personagens, curiosidades
    nucleo/            relógio de passo fixo (tempo real → ticks)
qa/                    testes e ferramentas (não vai para o site)
reports/, reviews/     relatórios e pareceres do desenvolvimento (não vão para o site)
dev-server.mjs         servidor local de desenvolvimento (não vai para o site)
```

---

## Integração ao site (etapa 2)

> Instruções para quem for integrar, pessoa ou agente (por exemplo, o Claude
> Code rodando no computador do dono, com o site numa pasta local). Siga **só**
> isto: o jogo é autocontido, e a integração é copiar uma pasta e pôr um link.
> Não é preciso instalar nada, rodar build nem mexer em outras páginas além do
> link.

### 1. Copiar a pasta do jogo

Copie **apenas** a pasta `bomberolho/` deste repositório para a raiz do site,
de modo que fique `/<pasta-do-site>/bomberolho/index.html`.

```bash
# exemplo: o site está em ~/meu-site (rode da raiz deste repositório)
cp -R bomberolho ~/meu-site/
# resultado esperado: ~/meu-site/bomberolho/index.html
```

Se já existir uma `bomberolho/` antiga no site, apague-a antes de copiar
(`rm -rf ~/meu-site/bomberolho`); senão o `cp` cria uma pasta dentro da outra
(`bomberolho/bomberolho/`).

Também funciona em outra subpasta (por exemplo
`/<site>/jogos/bomberolho/`), porque todos os caminhos dentro do jogo são
relativos. O endereço final do jogo é a pasta, terminada em barra:
`https://<domínio>/bomberolho/`.

**Não copie** nada do que fica fora dessa pasta:

- `qa/` (testes, `node_modules`, capturas);
- `reports/` e `reviews/`;
- `PLAN.md`, `CLAUDE.md` e `README.md`;
- `dev-server.mjs`;
- `.git` e `.gitignore`.

### 2. Pôr um link ou botão no site

Basta um link comum para a pasta. Sugestão, para a página da clínica ou da sala
de espera, ajustando a classe ao estilo do site:

```html
<a class="botao" href="bomberolho/">Jogar Bomberolho, a batalha das gotinhas</a>
```

- Use `href="bomberolho/"` (relativo) se o link estiver numa página da raiz do
  site.
- Use `href="/bomberolho/"` se o link estiver numa página dentro de subpastas.

Não é preciso `target="_blank"`. O jogo tem os botões Sair e Menu, e o botão
"voltar" do navegador leva de volta ao site.

**Não** coloque o jogo dentro de um `<iframe>` pequeno. Ele foi feito para
ocupar a tela inteira do celular.

### 3. Conferir se funcionou

1. Abra `https://<domínio>/bomberolho/`. Deve aparecer o logotipo
   "Bomberolho" com os personagens desfilando e o botão **Jogar**.
   - Para conferir antes de publicar, sirva a pasta do site localmente (de
     dentro dela, por exemplo `python3 -m http.server 8000`) e abra
     `http://localhost:8000/bomberolho/`.
   - Abrir o `index.html` direto do disco (`file://`) não funciona: o
     navegador bloqueia módulos ES fora de um servidor.
2. Toque em **Jogar**, escolha um personagem, toque em **Próximo**, escolha
   uma arena e toque em **Começar!**. A contagem "3, 2, 1, Já!" aparece e a
   partida começa.
3. No celular, a alavanca (canto de baixo à esquerda) e o botão azul da gota
   aparecem embaixo da arena, ou ao lado dela com o celular deitado.
4. No console do navegador (F12 → Console), não pode haver nenhum erro em
   vermelho. Na aba Rede (Network), nenhum arquivo pode estar com 404.
5. Se a página ficar em branco, confira três coisas:
   - a pasta foi copiada inteira, com `css/`, `js/` e `favicon.svg`;
   - o endereço termina em `/bomberolho/`;
   - o servidor entrega arquivos `.js` como `text/javascript`. Qualquer
     hospedagem comum já faz isso.

É só isso. Não há configuração, chave, banco de dados nem servidor
especial: atualizar o jogo no futuro é substituir a pasta `bomberolho/` inteira
pela nova.
