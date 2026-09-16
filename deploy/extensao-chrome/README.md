# Comenta — Hub local (extensão do Chrome)

Um popup que lista **todos** os serviços do Comenta rodando no seu Mac, mostra
quais estão no ar e abre cada um com um clique. Substitui o punhado de abas
fixadas e o "qual era mesmo a porta do NocoDB?".

| Serviço  | Porta | Sobe por padrão?         |
| -------- | ----- | ------------------------ |
| Painel   | 8080  | sim                      |
| Site     | 3000  | sim                      |
| API      | 4000  | sim                      |
| Ghost    | 2368  | sim                      |
| n8n      | 5678  | só com `--profile tools` |
| NocoDB   | 8090  | só com `--profile tools` |
| Metabase | 3001  | só com `--profile tools` |
| Moodle   | 8088  | container à parte        |

## Instalar

Não vai para a Chrome Web Store — é uma ferramenta de desenvolvimento, carregada
localmente:

1. Abra `chrome://extensions`
2. Ligue o **Modo do desenvolvedor** (canto superior direito)
3. **Carregar sem compactação** → selecione esta pasta (`deploy/extensao-chrome`)
4. Fixe o ícone roxo na barra

Depois de editar qualquer arquivo, clique em **Atualizar** no card da extensão.

## Como funciona

Cada serviço é sondado com um `fetch` de 2,5 s. **Qualquer** resposta HTTP conta
como "no ar" — incluindo 401, 302 e 404: o que importa é se algo atendeu naquela
porta. Só recusa de conexão marca vermelho. Por isso o n8n aparece verde mesmo
na tela de login.

A sonda roda a partir do popup, que tem `host_permissions` para `localhost` e
`127.0.0.1` — é isso que permite consultar serviços sem CORS liberado (Metabase
e NocoDB não mandam cabeçalho nenhum).

Serviços fora do ar ficam desabilitados, e o `title` do card traz o comando para
subir (`docker compose --profile tools up -d n8n`).

## Abrir no iPhone

O campo do rodapé guarda o IP do Mac na rede (em `chrome.storage.local`). Com um
IP válido, painel, site e API ganham um link `📱 http://SEU-IP:porta`.

O link só funciona se a stack tiver sido exposta na LAN:

```bash
cd deploy
bash local-mac.sh --lan     # descobre o IP, publica e ajusta o CORS
```

Sem `--lan`, tudo fica preso a `127.0.0.1` e o iPhone não alcança nada. As
ferramentas (n8n, NocoDB, Metabase) e os bancos **nunca** são expostos — sobem
sem senha forte no primeiro acesso.

## Mexer na lista

`servicos.js` é o único arquivo a editar quando a stack mudar. O popup e os
agrupamentos derivam dele.

```js
{
  id: "novo",
  nome: "Novo",
  descricao: "O que ele faz",
  porta: 9000,
  sonda: "/health",   // caminho do teste de saúde
  grupo: "ferramenta",
  lan: false,         // true = publicado por --lan, ganha link do iPhone
  abrirEm: "/admin",  // opcional: caminho ao clicar
}
```

Se a porta nova não for `localhost`/`127.0.0.1`, acrescente o padrão em
`host_permissions` no `manifest.json`.
