# Parte 2 — Batalha completa · Rodada 1 (relatório do executor)

## Resumo

A batalha está completa e jogável do começo ao fim, com tudo o que a seção 4 e as seções 3.7 e 3.8 pedem:

- **Partida em rodadas**: contagem "3, 2, 1, Já!" (todos travados), relógio de 2:00 no placar, **aperto final em espiral** com aviso da próxima peça, vitória, empate (todos caem juntos ou o tempo acaba), **troféus**, placar entre rodadas e taça. Partida de 1 a 3 vitórias (`?rodadas=`), com limite de rodadas contra partida infinita.
- **Itens avançados**: Chute-Pisca, Super Lupa, Cisco (3 azares, contagioso), **Pinça** (levantar/arremessar com quique e volta pela borda), **Colírio Penetrante** e **Estojo Surpresa** com três bichinhos — **Saltinho**, **Cascudo** e **Disparada** —, vida extra com ~1,1 s piscando e poder no segundo botão (Shift/E/K; `acao` no gancho).
- **Cinco arenas** com layout, peças e paleta próprios; três delas com elemento de arena: **correnteza** (Lago Lacrimal), **túneis** (Caverna da Pupila) e **lentes +2** (Consultório das Lentes). O Vale da Retina tem layout próprio (clareira central, menos blocos, mais itens).
- **IA em três níveis**, refeita do zero: leitura de perigo com **janelas de tempo** (cadeia, gotas chutadas, na mão, no ar com quiques, peças do aperto), planejador de fuga que sabe **esperar** a hora certa, emboscadas, táticas com Pinça e chute, uso dos bichinhos e "aposta final" nos últimos segundos.
- **Bancada de ajuste** em `?ajuste=1` (12 controles, efeito imediato, "Restaurar padrão", "Copiar ajuste"); fora disso nem o arquivo é baixado.
- **Simulação em lote** sem cabeça e reproduzível (`npm run lote`), com tabelas abaixo.
- **Testes**: suíte de simulação de 81 → <<NTESTES>> testes; navegador de 13 → <<NE2E>> testes, todos passando.

<<RESTO>>
