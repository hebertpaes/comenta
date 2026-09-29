#!/usr/bin/env python3
"""Barra segredos antes que entrem no git (protocolo de segurança, SECURITY.md).

  git diff --cached -U0 | python3 scripts/verificar-segredos.py      # gancho pre-commit
  git diff A..B -U0     | python3 scripts/verificar-segredos.py      # CI (só o que mudou)
  python3 scripts/verificar-segredos.py --arquivos a.txt b.json      # arquivos inteiros

Olha só as linhas ADICIONADas (diff) ou o conteúdo dos arquivos. Imprime o
arquivo, a linha e o tipo com o valor MASCARADO (nunca o segredo inteiro) e sai
com código 1 se achar algo. Falso positivo raro: marque a linha com
"segredo-ok" (ex.: chave de teste fictícia) e explique no commit.
"""
import hashlib, re, sys

PADROES = {
    "chave Admin do Ghost": r"\b[0-9a-f]{24}:[0-9a-f]{64}\b",
    "token do GitHub": r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b",
    "chave AWS": r"\bAKIA[0-9A-Z]{16}\b",
    "chave de API Google": r"\bAIza[0-9A-Za-z_\-]{35}\b",
    "token Slack": r"\bxox[baprs]-[A-Za-z0-9-]{10,}",
    "chave OpenAI": r"\bsk-(?:proj-)?[A-Za-z0-9_\-]{32,}\b",
    "chave Anthropic": r"\bsk-ant-[A-Za-z0-9_\-]{20,}",
    "chave privada": r"-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----",
    "chave Stripe": r"\b(?:sk|rk)_live_[A-Za-z0-9]{20,}",
    "token Meta/Facebook": r"\bEAA[A-Za-z0-9]{60,}",
    "chave SendGrid": r"\bSG\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}",
    "token de bot Telegram": r"\b\d{8,10}:AA[A-Za-z0-9_\-]{33}\b",
    "token Mercado Pago": r"\b(?:APP_USR|TEST)-\d{10,}-\d{6}-[0-9a-f]{32}-\d{6,}\b",
    "token Zapier/HeyGen/Eleven": r"\b(?:sk_[0-9a-f]{40,}|xi-api-key\s*[:=]\s*['\"][0-9a-f]{32})",
}
# Valores que já vazaram quando o repositório era público (token ABACS e hottok
# do Hotmart): guardados só como SHA-256, para o verificador não carregar nem um
# pedaço deles. Qualquer palavra longa do diff é comparada com esses hashes.
VAZADOS = {
    "de251192000bb54fb4f9a78e9b17db88bde4cc3ea1449a8da018605b467ecc68": "token ABACS antigo",
    "1a71ce1fc16ca3556bef4adb09bd37a483d0aeefc581788d0ede54a764acac3c": "hottok Hotmart antigo",
}
PALAVRA = re.compile(r"[A-Za-z0-9._\-]{24,}")
RX = [(nome, re.compile(p)) for nome, p in PADROES.items()]
ARQ_PROIBIDO = re.compile(r"(^|/)(\.env(\.[^/]*)?|[^/]*\.pem|[^/]*\.p12|[^/]*\.pfx|id_rsa[^/]*|id_ed25519[^/]*|\.env\.ghost)$")
PERMITIDO = re.compile(r"\.env\.example$")


def mascara(v):
    return v[:4] + "…" + f"({len(v)})"


def checa_linha(arq, n, linha, achados):
    if "segredo-ok" in linha:
        return
    for nome, rx in RX:
        for m in rx.finditer(linha):
            achados.append(f"{arq}:{n}: {nome}: {mascara(m.group(0))}")
    for m in PALAVRA.finditer(linha):
        nome = VAZADOS.get(hashlib.sha256(m.group(0).encode()).hexdigest())
        if nome:
            achados.append(f"{arq}:{n}: {nome}: {mascara(m.group(0))}")


def main():
    achados = []
    if len(sys.argv) > 2 and sys.argv[1] == "--arquivos":
        for arq in sys.argv[2:]:
            if ARQ_PROIBIDO.search(arq) and not PERMITIDO.search(arq):
                achados.append(f"{arq}: arquivo de credencial não pode ser versionado")
            try:
                with open(arq, encoding="utf-8", errors="ignore") as f:
                    for n, linha in enumerate(f, 1):
                        checa_linha(arq, n, linha, achados)
            except (IsADirectoryError, FileNotFoundError):
                pass
    else:
        arq, n = "?", 0
        for linha in sys.stdin:
            if linha.startswith("+++ "):
                arq = linha[6:].strip() if linha.startswith("+++ b/") else linha[4:].strip()
                if ARQ_PROIBIDO.search(arq) and not PERMITIDO.search(arq):
                    achados.append(f"{arq}: arquivo de credencial não pode ser versionado")
                continue
            if linha.startswith("@@"):
                m = re.search(r"\+(\d+)", linha)
                n = int(m.group(1)) - 1 if m else 0
                continue
            if linha.startswith("+"):
                n += 1
                checa_linha(arq, n, linha[1:], achados)
            elif not linha.startswith("-"):
                n += 1
    if achados:
        print("SEGREDO BARRADO — tire o valor do arquivo, use variável de ambiente e troque a credencial se ela já saiu do seu computador:")
        for a in achados:
            print("  " + a)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
