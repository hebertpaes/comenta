# Apuração 2026 — validação da API do TSE por bairro, local e seção

Teste feito em 25/09/2026 para a página https://hojemt.com.br/apuracao-2026/. O 1º turno é no domingo, 04/10/2026.

- Script: `content/apuracao-tse.py`. Usa só a biblioteca padrão do Python 3, abre no máximo 8 conexões persistentes, repete com backoff quando falha e guarda cache em disco com ETag.
- Mapa local → bairro: `content/pautas/eleicoes/locais-votacao-mt.csv`.
- Demonstração gerada no formato da página, com dados de 2022: `/tmp/claude-0/-home-user-comenta/ff03d673-f500-59f9-930f-1d445e49d183/scratchpad/apuracao-demo-2022/`. São 525 arquivos, 3,7 MB. Nada foi publicado no site.

## Resumo

1. **Os dados por seção funcionam daqui**, sempre pelo mesmo servidor, `resultados.tse.jus.br`. Cada seção tem um índice (`-aux.json`) e um boletim de urna, o BU binário em ASN.1. O script decodifica o BU direto, sem precisar do imgbu em texto. Depois soma por local de votação, por bairro e pelo município.
2. **A validação bateu exatamente, com diferença 0 em todas as linhas.**
   - 2022, Cuiabá, 1.275 seções: governador, senador, deputado federal, deputado estadual e presidente.
   - 2022, Várzea Grande, 557 seções: governador e senador.
   - 2024, Cuiabá, no formato novo do BU: prefeito e vereador.
   - Em todos os casos conferimos votos por candidato, brancos, nulos, nulos técnicos, anulados, legenda, comparecimento, eleitorado, abstenção e seções.
3. **Bairros.** A fonte oficial é o dataset do TSE `eleitorado_local_votacao_2024`, gerado em 05/10/2024 às 02:00:41. Ele chegou por uma cópia fiel no GitHub, porque o CDN do TSE está bloqueado daqui.
   - Cobertura: 266 locais, sendo 162 em Cuiabá (109 bairros) e 104 em VG (61 bairros).
   - Todos os BUs de 2024 e de 2022 caíram num bairro. Em 2022, 31 seções de Cuiabá foram associadas pelo número da seção, e não pelo número do local.
   - **Para 2026, o editor precisa baixar o dataset de 2026** (instruções na seção 4).
4. **Tempos.** Cuiabá inteira, com cache vazio, levou 57 s: 2.551 requisições, 17,3 MB. Revarrer tudo com ETag levou 32 s e baixou 0 MB. Buscar só as seções pendentes leva segundos. Mato Grosso inteiro deve levar cerca de 6 min a frio (~100 MB).
5. **Falta para ligar na página:**
   - saber os códigos de 2026 (o `ele-c.json` ainda aponta para o ciclo `ele2024`);
   - publicar os JSON em `/content/media/apuracao/` (o gerador atual do site não está neste repositório);
   - acrescentar a interface de bairro e local no JavaScript da página;
   - carregar o mapa de 2026.

## 1. Endpoints testados

As medidas são de uma requisição avulsa com `curl`, incluindo a abertura TLS pelo proxy. Com as conexões persistentes do script, cada requisição cai para cerca de 180–190 ms.

| Arquivo | URL-modelo (`R` = `https://resultados.tse.jus.br/oficial`) | Status | Latência | Tamanho |
|---|---|---|---|---|
| config geral | `R/comum/config/ele-c.json` | 200 | 0,90 s | 18,8 KB |
| municípios | `R/ele2022/546/config/mun-e000546-cm.json` | 200 | 2,06 s | 519 KB |
| **unificado** município | `R/ele2022/546/dados/mt/mt90670-c0003-e000546-u.json` | 200 | 0,57 s | 4,7 KB |
| unificado por zona | `R/ele2022/546/dados/mt/mt90670-z0001-c0003-e000546-u.json` | 200 | 0,55 s | 4,6 KB |
| unificado 2024 | `R/ele2024/619/dados/mt/mt90670-c0011-e000619-u.json` | 200 | 0,53 s | 4,5 KB |
| variável município | `R/ele2022/546/dados/mt/mt90670-c0003-e000546-v.json` | 200 | 0,53 s | 6,5 KB |
| variável UF | `R/ele2022/546/dados/mt/mt-c0003-e000546-v.json` | 200 | 0,51 s | 1,5 KB |
| fixo (nomes; o nome vem no campo `nadf` do -v) | `R/ele2022/546/dados/mt/mt-c0003-e000546-005-f.json` | 200 | 0,56 s | 2,7 KB |
| simplificado UF | `R/ele2022/546/dados-simplificados/mt/mt-c0003-e000546-r.json` | 200 | 0,51 s | 2,1 KB |
| simplificado Brasil | `R/ele2022/544/dados-simplificados/br/br-c0001-e000544-r.json` | 200 | 0,52 s | 3,6 KB |
| simplificado município | `R/ele2022/546/dados-simplificados/mt/mt90670-c0003-e000546-r.json` | **404** | — | — |
| abrangência UF | `R/ele2022/546/dados/mt/mt-e000546-ab.json` | 200 | 0,93 s | 118 KB |
| seções da UF (cs) | `R/ele2022/arquivo-urna/406/config/mt/mt-p000406-cs.json` | 200 | 1,34 s | 209 KB |
| índice da seção (aux) | `R/ele2022/arquivo-urna/406/dados/mt/90670/0001/0147/p000406-mt-m90670-z0001-s0147-aux.json` | 200 | 0,52 s | 0,5 KB |
| BU 2022 | `…/0147/<hash>/o00406-9067000010147.bu` | 200 | 0,55 s | 8,7 KB |
| imgbu 2022 | `…/0147/<hash>/o00406-9067000010147.imgbu` | 200 | 0,53 s | 15,7 KB |
| BU 2024 | `R/ele2024/arquivo-urna/452/…/0147/<hash>/o00452mt9067000010147-bu.dat` | 200 | 0,54 s | 11,6 KB |
| imgbu 2024 | `…/o00452mt9067000010147-imgbu.dat` | 200 | 0,55 s | 14,1 KB |
| BU em JSON (existe no código do app, mas não é publicado) | `R/ele2024/boletim-urna/452/dados/mt/p000452-mt-m90670-z0001-s0147.json` | 404 | — | — |
| ciclo 2026 | `R/ele2026/` | 404 | — | — |
| ambiente simulado | `https://resultados.tse.jus.br/simulado/comum/config/ele-c.json` | resposta vazia | — | — |
| outro servidor do simulado | `https://resultados-sim.tse.jus.br/…` | 403 | — | — |
| CDN de dados abertos | `https://cdn.tse.jus.br/estatistica/sead/odsele/…` | **403** | — | — |
| portal de dados abertos | `https://dadosabertos.tse.jus.br/…` | **403** | — | — |
| site do TSE (inclui “Informações técnicas…” e os PDFs de especificação) | `https://www.tse.jus.br/…` | **403** | — | — |
| TRE-MT | `https://www.tre-mt.jus.br/` | **403** | — | — |
| DivulgaCandContas (gastos) | `https://divulgacandcontas.tse.jus.br/…` | **403** | — | — |
| QR Code do BU | `https://qrcodenobu.tse.jus.br/` | **403** | — | — |
| espelho do cadastro de locais 2024 (GitHub) | `raw.githubusercontent.com/hermesalvesbr/checkin-eleitoral/main/public/locais/eleitorado_local_votacao_2024_MT_part1.json` | 200 | 0,65 s | 12,2 MB |
| spec do BU, versão 1 (2022) | `raw.githubusercontent.com/danarrib/TSEParser/master/TSE_Docs/spec/bu.asn1` | 200 | 0,20 s | 21,9 KB |
| spec do BU, versão 2 (2024) | `raw.githubusercontent.com/doccaz/urnas-br/main/docv2/spec/bu.asn1` | 200 | — | 24,4 KB |

- O ambiente simulado (`--ambiente simulado` no script) só responde nas janelas de teste do TSE. Fora delas vem “Empty reply”, e o script avisa isso.
- Os PDFs de especificação do TSE (EA…) não têm espelho público que eu tenha achado; a especificação de fato usada foi o `bu.asn1` publicado pelo TSE junto dos BUs, nas duas versões da tabela acima.
- A integração oficial de 2026, segundo a página de informações técnicas, usa os mesmos JSON de `resultados.tse.jus.br`. O app oficial (`/oficial/app/`, versão 24.10.7) usa `ambiente` e `ambienteBU` = `oficial` e monta todas as URLs como `<ambiente>/<ciclo>/…`.

## 2. O que muda de 2022 para 2024/2026 (e o script já trata)

- **O arquivo unificado `-u.json` substitui o par `-v` + `-f`.** Ele traz os totais e os candidatos com nome no mesmo arquivo. Foi o formato de 2024, e o TSE **regerou os arquivos de 2022 nesse formato em 18/09/2026**. Os `cs.json` e os aux também têm essa data, o que indica preparação para 2026.
  - Conferi: os totais de `-u` e `-v` de 2022 são idênticos.
  - O script tenta `-u` primeiro e usa `-v` + `-f` como alternativa. Presidente por município em 2022 só tem `-v`.
- **O BU mudou de versão.** A versão 1 (2022) traz os resultados na tag `[3]`. A versão 2 (2024) traz, no topo, `qtdEleitoresCompareceram` e o detalhamento de biometria; os resultados vêm sem tag; e cada eleição tem aptos da seção e aptos em trânsito (TTE). O decodificador localiza os campos pela estrutura e lê as duas versões.
- **Os nomes dos arquivos da seção mudam**: `o00406-9067000010147.bu` em 2022 e `o00452mt9067000010147-bu.dat` em 2024. O script nunca monta esses nomes; ele sempre lê de `aux.hashes[].arq[]`.
- **Seções agregadas.** No `cs.json`, `nsa` lista as seções agregadas e `nsp` indica a principal. Os votos das agregadas saem no BU da principal. A contagem oficial é o número de seções sem `nsp`: MT tem 7.652 em 2022, das quais 1.275 em Cuiabá e 557 em VG.
- **Classificação dos votos igual à do TSE** (sem isso a soma não fecha):
  - Voto num número que não está no arquivo fixo vira nulo técnico (`vnt`). É o caso de candidato indeferido antes da carga da urna, como o 111 no Senado/MT 2022: 62.018 votos em Cuiabá.
  - `dvt` “Anulado” conta como `van`; “sub judice” conta como `vansj`.
  - Voto de legenda em partido que só aparece em agremiação marcada com `**` também vira nulo técnico. Em 2022 foram DC e uma das entradas do PDT na deputação estadual: 55 votos em Cuiabá.
  - Os nulos exibidos na página são `tvn = vn + vnt`.
- **Local do BU é o local ORIGINAL.** Quando a seção vota num local temporário (escola em reforma, por exemplo), o BU traz o número original, que no cadastro está em `NR_LOCAL_VOTACAO_ORIGINAL`; o campo `NR_LOCAL_VOTACAO` traz o local temporário. Isso acontece em 140 seções de Cuiabá e VG. O mapa agrupa pelo número que aparece no BU e registra o local temporário na coluna `votando_em`.
- **O TSE marca `e: "s"` também para quem vai ao 2º turno.** A página trata `e === "s"` como eleito, então mostraria “Eleito” para Lula e Bolsonaro no 1º turno de 2022. O gerador passou a calcular `e` a partir de `st` (“Eleito…”).
- **Situação da seção.** O aux traz `st` (“Totalizada”) e `hashes[].st` (“Totalizado”). Se houver mais de um hash, vale o totalizado mais recente. Aux ainda inexistente (404) significa seção pendente. O script também separa “Não instalada” e “Anulada”.

## 3. Validação numérica (1º turno de 2022, soma de todos os BUs contra o total oficial do TSE)

### Cuiabá — Governador (eleição 546, 1.275 seções)

| Candidato / item | Soma das seções | Total oficial | Diferença |
|---|---:|---:|---:|
| 44 Mauro Mendes | 215.550 | 215.550 | 0 |
| 43 Marcia Pinheiro | 66.699 | 66.699 | 0 |
| 14 Pastor Marcos Ritela | 23.666 | 23.666 | 0 |
| 50 Moisés Franz | 5.257 | 5.257 | 0 |
| Válidos | 311.172 | 311.172 | 0 |
| Brancos | 16.452 | 16.452 | 0 |
| Nulos (tvn) | 30.102 | 30.102 | 0 |
| Comparecimento | 357.726 | 357.726 | 0 |
| Eleitorado apto | 426.764 | 426.764 | 0 |
| Abstenção | 69.038 | 69.038 | 0 |
| Seções | 1.275 | 1.275 | 0 |

### Cuiabá — Senador (546)

| Candidato / item | Soma das seções | Total oficial | Diferença |
|---|---:|---:|---:|
| 222 Wellington Fagundes | 146.447 | 146.447 | 0 |
| 144 Antônio Galvan | 43.723 | 43.723 | 0 |
| 510 Kássio Coelho | 14.546 | 14.546 | 0 |
| 300 Feliciano Azuaga | 12.711 | 12.711 | 0 |
| 500 José Roberto | 9.740 | 9.740 | 0 |
| 270 Dr. Jorge Yanai | 4.056 | 4.056 | 0 |
| Brancos | 31.387 | 31.387 | 0 |
| Nulos (vn) + nulos técnicos (vnt) = tvn | 33.098 + 62.018 = 95.116 | 95.116 | 0 |
| Comparecimento / eleitorado / seções | 357.726 / 426.764 / 1.275 | igual | 0 |

### Várzea Grande — Governador e Senador (546, 557 seções)

| Candidato / item | Soma das seções | Total oficial | Diferença |
|---|---:|---:|---:|
| Gov. 44 Mauro Mendes | 86.018 | 86.018 | 0 |
| Gov. 43 Marcia Pinheiro | 25.098 | 25.098 | 0 |
| Gov. 14 Pastor Marcos Ritela | 11.482 | 11.482 | 0 |
| Gov. 50 Moisés Franz | 1.319 | 1.319 | 0 |
| Gov. brancos / nulos | 9.079 / 14.149 | 9.079 / 14.149 | 0 |
| Sen. 222 Wellington Fagundes | 64.750 | 64.750 | 0 |
| Sen. 144 Antônio Galvan | 15.549 | 15.549 | 0 |
| Sen. 510 Kássio Coelho | 3.925 | 3.925 | 0 |
| Sen. 300 Feliciano Azuaga | 3.266 | 3.266 | 0 |
| Sen. 500 José Roberto | 2.339 | 2.339 | 0 |
| Sen. 270 Dr. Jorge Yanai | 1.022 | 1.022 | 0 |
| Sen. brancos / nulos (tvn = 13.735 + 28.491) | 14.068 / 42.226 | 14.068 / 42.226 | 0 |
| Comparecimento / eleitorado / seções | 147.145 / 178.502 / 557 | igual | 0 |

### Outras validações

Todas com diferença 0 em todas as linhas:

- **Cuiabá, 2022**
  - Presidente: 11 candidatos, 358.944 de comparecimento.
  - Deputado federal: 322.081 válidos, 11.152 de legenda, 188 anulados.
  - Deputado estadual: 320.864 válidos, 1.704 nulos técnicos, 100 anulados, 1.553 anulados sub judice.
- **Cuiabá, 2024 (BU versão 2 + arquivo `-u`)**
  - Prefeito: Abilio 126.944, Lúdio 90.719, Botelho 88.977, Kennedy 13.805.
  - Vereador: 316.454 válidos, 993 nulos técnicos, 394 anulados, 2.975 anulados sub judice.

Esta segunda validação é a que dá segurança para 2026, porque usa o formato mais novo.

## 4. Mapa local de votação → bairro

- **Arquivo:** `content/pautas/eleicoes/locais-votacao-mt.csv`, separado por `;` e em UTF-8.
- **Colunas:**
  - pedidas: `zona;local;nome;endereco;bairro;cep;lat;lon;fonte;ano`;
  - extras: `cd_municipio;municipio;bairro_tse;tipo_local;secoes;secoes_agregadas;eleitores;votando_em;obs`.
- **Fonte:** dataset oficial do TSE `eleitorado_local_votacao_2024`, 1º turno de 2024, gerado em 05/10/2024 às 02:00:41. Veio pela cópia fiel em `raw.githubusercontent.com/hermesalvesbr/checkin-eleitoral/main/public/locais/eleitorado_local_votacao_2024_MT_part1.json`.
  - A cópia tem 8.790 linhas, todas de MT, com as 42 colunas originais.
  - Não houve linhas corrompidas em MT. Em outros estados a conversão dessa cópia quebrou registros com quebra de linha, mas isso não afeta MT.
- **Cobertura:**
  - Cuiabá: 162 locais, 109 bairros, 1.363 seções.
  - VG: 104 locais, 61 bairros, 615 seções.
  - Coordenadas faltam em 4 seções de Cuiabá e 13 de VG no cadastro original.
  - BUs de 2024: 100% dos locais aparecem no mapa pelo número.
  - BUs de 2022: VG 100%; Cuiabá 1.244 seções pelo número do local e 31 pela seção.
- **Normalização dos bairros:**
  - maiúsculas, espaços e abreviações (JD → JARDIM, RES → RESIDENCIAL etc.);
  - agrupamento por chave sem acento;
  - exibição na grafia mais frequente, com acento;
  - correções pontuais: CONCEIÇÃO, VITÓRIA RÉGIA, MARINGÁ;
  - a grafia original fica em `bairro_tse`.
- **Para 2026, o editor precisa baixar no navegador:**
  1. Abrir https://dadosabertos.tse.jus.br/dataset/eleitorado-2026 e escolher o recurso “Eleitorado por local de votação”. O arquivo é `https://cdn.tse.jus.br/estatistica/sead/odsele/eleitorado_locais_votacao/eleitorado_local_votacao_2026.zip`, no mesmo padrão dos anos anteriores. Tem CSV em latin-1, separado por `;`.
  2. Salvar o zip no repositório e rodar `python3 content/apuracao-tse.py locais --entrada eleitorado_local_votacao_2026.zip --uf mt --mun 90670,91677 --ano 2026`. O zip é lido direto, sem descompactar.
  3. Se for gerar para outras cidades, basta acrescentar os códigos TSE em `--mun`. Os códigos estão em `mun-e<ele>-cm.json`.

## 5. Volumes e tempos (medidos daqui, 8 conexões)

| Operação | Seções | Tempo | Requisições | Baixado |
|---|---:|---:|---:|---:|
| `secoes --limite 30`, cache frio | 30 | 2,1 s (71 ms/seção; 380 ms por seção isolada: aux + BU) | 61 | 0,54 MB |
| Cuiabá inteira, cache frio | 1.275 | 57,4 s (45 ms/seção) | 2.551 (aux 0,65 MB, BU 16,44 MB, cs 0,21 MB) | 17,3 MB |
| Várzea Grande, cache frio | 557 | 27,6 s | 1.114 | 6,8 MB |
| Cuiabá 2024, cache frio | 1.274 | 61,1 s | 2.549 | 15,1 MB |
| Cuiabá, revalidando tudo com ETag | 1.275 | 31,7 s | 1.276 (todas 304) | 0 MB |
| Cuiabá, só pendentes (simulação com 327 pendentes) | 327 | 8,5 s | 328 | 0,19 MB |
| Cuiabá, tudo já totalizado | 0 | 1,2 s | 1 | 0 MB |
| Arquivos da página: 27 UFs + Brasil + exterior, 3 cargos, 141 municípios de MT, bairros e locais de Cuiabá/VG (seções já no cache) | — | 13–15 s | ~420–500 | 1,6 MB |

Estimativas:

- **MT inteiro:** 7.652 seções em 2022 e 7.934 em 2024, em 142 municípios; 2026 deve ficar perto disso.
  - A frio: cerca de 6–6,5 min e 95–110 MB (~13 KB por seção).
  - Revarredura com ETag: cerca de 3,3 min.
  - Só pendentes: proporcional ao que falta.
- **Só Cuiabá + VG (~1.830 seções):** cerca de 85 s a frio (~24 MB); cerca de 45 s revalidando tudo; segundos quando só faltam poucas.

## 6. Recomendações para a noite de 04/10

1. **Códigos de 2026.** Rodar `python3 content/apuracao-tse.py config` a partir da véspera.
   - Hoje o `ele-c.json`, gerado em 12/05/2026, ainda tem `c: "ele2024"`.
   - Quando mudar para `ele2026`, o comando lista o pleito do 1º turno (diretório `arquivo-urna/<pleito>`), a eleição federal (presidente, cargo 0001), a estadual (0003/0005/0006/0007) e os códigos do 2º turno (`cdt2`).
   - Em 2022 eram 544/546 e pleito 406, com 545/547 e pleito 407 no 2º turno.
2. **Resultado principal a cada 60 s**, no mesmo ritmo do `setInterval` da página. Comando: `pagina ... --ufs todas --municipios-uf mt --bairros ""`. Ele usa os arquivos `-u` e `-r` e revalida com ETag, então custa poucas centenas de requisições pequenas.
3. **Bairros e locais de Cuiabá/VG a cada 2–3 min.** Comando: `pagina ... --bairros 90670,91677 --pleito <pleito>`.
   - O padrão é buscar só as seções pendentes.
   - Aux em 404 significa seção ainda não publicada.
   - Uma seção com `st` “Totalizada” e hash “Totalizado” não é consultada de novo.
4. **Varredura completa a cada ~30 min**, com `--rechecar-totalizadas` e ETag, para pegar BU substituído ou retotalização.
5. **Não passar de 8 conexões nem de 1 rodada por minuto por arquivo.** O cache com ETag faz a maior parte das respostas serem 304 vazias.
6. **Senado 2026 tem 2 vagas.** Cada eleitor vota duas vezes.
   - O comparecimento continua sendo de pessoas.
   - Os percentuais de brancos e nulos são calculados sobre o total de votos (válidos + brancos + nulos + anulados), como o TSE.
   - Dois candidatos terão `e: "s"`.
   - Não há como validar isso com dados de 2022, que tinha uma vaga.
7. **Simulado do TSE.** Nas janelas de teste, use `--ambiente simulado --cache <outro dir>` e uma pasta de saída separada. Os arquivos começam zerados e vão de 0% a 100%. É o ensaio geral ideal. O cache precisa ser outro diretório para não misturar com o oficial.
8. **Mapa 2026.** Carregar o dataset de 2026 antes do dia (seção 4). Com ele, as seções pendentes já aparecem no bairro certo, com contagem “x de y seções”.
9. **Fuso.** O TSE divulga a partir das 17h de Brasília, que são 16h em Mato Grosso. O `indice.json` ao vivo já diz “a partir das 17h”.

## 7. JSON que a página espera e formato proposto para bairro, local e seção

A página lê os arquivos de `/content/media/apuracao/` (ou de `demo/` com `?demo=1`). O `apuracao.js` usa os campos abaixo, e o script `pagina` gera todos eles.

- **`indice.json`**
  - `status`: só com `"apurando"` a tela de resultados aparece.
  - `motivo`, `eleicao.nome`: se o nome contiver “SIMULA”, a página mostra o aviso de demonstração.
  - `disponivel: {"<cargo>": {"rotulo", "abr": [ufs]}}`.
  - Novo: `bairros: {"<cargo>": ["mt90670", "mt91677"]}`.
- **`<uf>-c<cargo>.json` e `<uf><mun>-c<cargo>.json`**
  - Totais: `secoes`, `secoes_totalizadas`, `secoes_totalizadas_pct`, `comparecimento(_pct)`, `abstencao(_pct)`, `brancos(_pct)`, `nulos(_pct)`, `atualizado`, `total_candidatos`, `municipio`; mais `eleitorado`, `votos_validos`, `turno`, `abr`.
  - `candidatos[]` com `n`, `nm`, `cc`, `nv`, `st`, `e` (`"s"` só para eleito), `vap`, `pvap`.
  - Números como string e percentuais com vírgula, como o TSE.
- **`municipios-<uf>-c<cargo>.json`:** `{municipios: [{cd, nm, capital}]}`, em ordem alfabética.
- **`placar-c<cargo>.json`:** `{estados: [{uf, pct_apurado, lider, n, cc, pvap, st, e, segundo, segundo_pvap}]}`.
- **`gastos-<uf>.json`** (`{candidatos: [{urna|nome, partido, cargo, receitas, despesas}], fonte, ano, gerado}`): **não gerado**. A fonte, prestação de contas no DivulgaCandContas e nos dados abertos, está bloqueada daqui. A página esconde a aba se o arquivo não existir.

**Novos arquivos propostos**, gerados pelo script:

- **`<uf><mun>-c<cargo>-bairros.json`**, com 40–85 KB por cargo em Cuiabá/VG. O topo traz:
  - identificação: `uf`, `cd`, `municipio`, `cargo`, `rotulo`, `eleicao`, `gerado`;
  - `atualizado` (último BU recebido);
  - `total` (totais do município, somados das seções);
  - `candidatos` (legenda única com `n`, `nm`, `cc`, `nv`, `st`, `e`);
  - `mapa` (fonte e cobertura).

  Cada item de `bairros[]` tem:
  - identificação: `id`, `nm`, `locais`, `lat`/`lon` (centro dos locais);
  - os mesmos totais do arquivo de município: `secoes`, `secoes_totalizadas(_pct)`, comparecimento, abstenção, brancos, nulos, válidos, `nulos_tecnicos`, `legenda`, `anulados`;
  - `lider`;
  - `candidatos: [{n, vap, pvap}]`, com todos os candidatos nos cargos majoritários e os 30 primeiros nos proporcionais.
- **`<uf><mun>-c<cargo>-locais.json`**, com 135–300 KB. O topo é igual. Cada item de `locais[]` tem:
  - `id` (`zona-local`), `zona`, `local`, `nm`, `bairro`, `endereco`, `cep`, `lat`, `lon`;
  - `aproximado` (true quando o local veio pela seção);
  - os mesmos totais e `candidatos`;
  - `por_secao: [{s, st, ap, c, b, nl, v: {numero: votos}}]`. Os votos por seção (`v`) só vêm nos cargos majoritários.
- **JSON bruto por seção:** o comando `secoes` grava `secoes/z<zona>-s<secao>.json` no diretório de saída, com o BU decodificado de todos os cargos, o hash, a hora de recebimento e a situação. Serve para checagens e matérias.

Exemplo do que isso mostra (Cuiabá, presidente, 1º turno 2022): Lula liderou em 7 dos 81 bairros com 1.500 votos válidos ou mais. O maior percentual dele foi no Jardim Fortaleza (51,9% a 42,4%); o de Bolsonaro foi no Jardim Cuiabá (67,1%). O maior local de votação da cidade é a E.E. Malik Nomer Zahafi Didier, no Pedra 90, com 18 seções e 7.020 eleitores.

Encaixe na página (ES5, mesmo estilo do `apuracao.js`): quando o município escolhido estiver em `indice.bairros[cargo]`, mostrar um seletor “Bairro” e uma tabela “Por bairro”, reaproveitando `render()`:

```js
function carregarBairros(uf, mun, cargo) {
  return pega(uf + mun + "-c" + cargo + "-bairros.json").then(function (d) {
    if (!d) return null;
    var leg = {};
    d.candidatos.forEach(function (c) { leg[c.n] = c; });
    d.bairros.forEach(function (b) {          // completa nome/coligação/situação a partir da legenda
      b.candidatos = b.candidatos.map(function (c) {
        var x = {}, k; for (k in leg[c.n]) x[k] = leg[c.n][k]; for (k in c) x[k] = c[k]; return x;
      });
      b.atualizado = d.atualizado; b.municipio = d.municipio + " — " + b.nm;
    });
    return d;   // render(d.bairros[i], d.bairros[i].municipio) usa a mesma tela do município
  });
}
// Tabela "Por bairro": b.nm | b.secoes_totalizadas + "/" + b.secoes | leg[b.lider].nm | b.candidatos[0].pvap + "%"
// Locais: pega(uf + mun + "-c" + cargo + "-locais.json"), filtra por l.bairro === b.nm; l.por_secao abre as seções.
```

## 8. O que falta para ligar na página

1. **Publicação.** Nada deste repositório escreve em `/content/media/apuracao/`. O `indice.json` ao vivo (status “aguardando”, gerado em 25/09 às 18:02) e o `demo/` (de 02/09) vêm de um processo externo. É preciso ligar a saída do comando `pagina --saida <dir>` a esse processo: sincronizar a pasta com o `content/media/apuracao` do Ghost, ou rodar o script no próprio servidor com cron ou systemd e `--repetir 60`.
   - O servidor, no Brasil, acessa o TSE sem bloqueio.
   - O cache é configurado com `TSE_CACHE=/var/cache/tse` ou `--cache`.
2. **JavaScript da página:** seletor de bairro, tabela por bairro e lista de locais e seções, conforme a seção 7.
3. **Demonstração atual do site.** Tem incoerências:
   - `demo/indice.json` diz `turno: "2"`;
   - `demo/br-c0001.json` traz o resultado do 2º turno (Lula “Eleito”) misturado ao 1º turno dos outros cargos;
   - os arquivos por município usam `e: "S"`/`"N"` em maiúsculas.

   A pasta gerada agora (`scratchpad/apuracao-demo-2022/`) tem tudo coerente com o 1º turno, mais bairros e locais de Cuiabá/VG. Cabe ao editor decidir se substitui.
4. **No dia:**
   - códigos de 2026 pelo `config`;
   - mapa de 2026 pelo dataset;
   - comando de produção, por exemplo: `python3 content/apuracao-tse.py pagina --ano 2026 --federal <F> --estadual <E> --pleito <P> --cargos 0001,0003,0005,0006,0007 --ufs todas --municipios-uf mt --bairros 90670,91677 --nome "Eleições 2026 — 1º turno" --repetir 60 --saida <dir publicado>`.
5. **Gastos:** exigem o dataset de prestação de contas de 2026, também em `dadosabertos.tse.jus.br`. Não foram tratados aqui.

## 9. Comandos de referência

```sh
python3 content/apuracao-tse.py config
python3 content/apuracao-tse.py municipio --ano 2022 --ele 546 --uf mt --mun 90670 --cargo 0003
python3 content/apuracao-tse.py secoes --ano 2022 --pleito 406 --uf mt --mun 90670 --validar-ele 546 --cargos 0003,0005,0006,0007
python3 content/apuracao-tse.py secoes --ano 2022 --pleito 406 --uf mt --mun 90670 --validar-ele 544 --cargos 0001
python3 content/apuracao-tse.py secoes --ano 2022 --pleito 406 --uf mt --mun 91677 --validar-ele 546 --cargos 0003,0005
python3 content/apuracao-tse.py secoes --ano 2024 --pleito 452 --uf mt --mun 90670 --validar-ele 619 --cargos 0011,0013
python3 content/apuracao-tse.py locais --entrada <eleitorado_local_votacao_AAAA.zip|.csv|.json> --uf mt --mun 90670,91677
python3 content/apuracao-tse.py pagina --ano 2022 --federal 544 --estadual 546 --pleito 406 --cargos 0001,0003,0005 \
    --ufs todas --municipios-uf mt --bairros 90670,91677 \
    --nome "SIMULAÇÃO — Eleições Gerais 2022 (1º turno), resultados oficiais do TSE" --saida <dir>
# opções gerais (antes do subcomando): --ambiente oficial|simulado  --cache DIR  --conexoes N (máx. 8)  --revalidar SEG  --offline
```
