---
name: hojemt-radar-autoridades
description: Atualiza as manchetes das autoridades extras do Radar Eleitoral (prefeitos de Rondonópolis, Sinop e outras cidades de MT) e republica a página. Use ao rodar essa rotina ou ao mexer na lista de autoridades.
---

# hojemt-radar-autoridades

Pedido do editor em 08/10/2026 (print do grupo "Autoridades monitoradas"): "Das autoridades que participaram inclua também as outras: como o prefeito de Rondonópolis e de Sinop".

## Como funciona

- A lista principal do radar vem do **servidor** (`/content/media/apuracao/radar-candidatos.json`, gerado fora do repositório, sem acesso nosso — SSH é proibido). Ela só traz Abilio Brunini e Flávia Moretti como autoridades.
- Os nomes extras ficam em `content/paginas/radar-autoridades.json` (nome, cidade, partido conferido com fonte oficial ou dois veículos em `fontes_partido`, `situacao`, `termos` do Google Notícias e `cita` = trechos que a manchete precisa conter).
- `content/tools/radar-autoridades.mjs` busca as manchetes dos últimos 7 dias, classifica por palavras (polêmica, proposta ou rotina — a página avisa que a classificação é automática e que polêmica não é veredito) e grava em `content/paginas/radar-dados.json` → `autoridades` (pelo Python, para não mudar o formato do arquivo).
- O card do radar (`content/paginas/radar-eleitoral.html`, função `prepara`) junta esses nomes aos do servidor **só se o servidor ainda não trouxer o nome**. Nos cards extras, a linha "Checagem não localizada" do script da teia é trocada por `situacao` ("Prefeito em exercício · sem candidatura em 2026").

## Preparo

1. `git pull --rebase origin claude/exciting-thompson-4rhut2` (outras rotinas mexem no mesmo branch).
2. `bash content/tools/preparar-sessao.sh` e `source content/tools/ambiente.sh --checar` (variáveis do Ghost; se faltarem, pare e avise em uma linha).

## Procedimento

1. `cd content && source tools/ambiente.sh >/dev/null && node tools/radar-autoridades.mjs --seco` — leia a lista: manchete que não cita a pessoa, classificação injusta (ex.: vitória eleitoral como polêmica) ou título duplicado → ajuste `POL`/`PROP`/`cita` no script ou na configuração antes de gravar.
2. `node tools/radar-autoridades.mjs` (grava) e `python3 paginas/radar-build.py`.
3. Publicar: `node pagina-ghost.mjs --slug=radar-eleitoral --arquivo=paginas/radar-eleitoral.html`. O script guarda a versão no ar em `paginas/backup/` antes. **Antes de publicar, compare o cartão no ar (fora do bloco de dados) com o do repositório**: se mudou no servidor (a teia e outros ajustes são feitos lá), traga a mudança para o repositório em vez de apagá-la.
4. Commit de `content/paginas/radar-dados.json`, `content/paginas/radar-eleitoral.html` e o backup novo; push. Sem novidade relevante, não responda.

## Mudar a lista

- Nome novo: conferir cargo e partido atuais com fonte oficial (prefeitura, TSE/TRE, Câmara) ou dois veículos de 2025-2026, inclusive troca de partido (ex.: Eliene Liberato saiu do PSB para o Podemos em 01/2026). Grafia de partido igual à do radar ("União Brasil", "PL", "Republicanos", "Podemos").
- Se o servidor passar a trazer o nome, o do servidor prevalece sozinho; pode tirar da configuração.
