# Comenta — app iOS (protótipo)

App nativo em SwiftUI que fala com a API do Comenta rodando no seu Mac. Faz
login, lista as conversas e responde — o suficiente para atender pelo celular.

## Rodar no seu iPhone

1. **Exponha a API na rede** (o app não enxerga `localhost` do Mac):

   ```bash
   cd deploy
   bash local-mac.sh --lan
   ```

   Anote o IP que ele imprime, algo como `192.168.1.126`.

2. **Abra o projeto**: `open apps/ios/Comenta.xcodeproj`

3. **Escolha seu time de assinatura** — Xcode não deixa instalar no aparelho sem
   isso. No alvo `Comenta` → aba **Signing & Capabilities** → **Team**: sua conta
   Apple pessoal serve (a gratuita instala por 7 dias, depois é só reinstalar).

4. **Conecte o iPhone por cabo**, selecione-o na barra do topo e aperte ▶.

5. No **primeiro acesso ao app**: confirme o endereço do servidor
   (`http://SEU-IP:4000`) e entre com `admin@comenta.com.br` / `comenta123`.
   O iOS vai pedir permissão de **rede local** — aceite, sem isso nada carrega.

O iPhone e o Mac precisam estar no **mesmo Wi-Fi**.

## Estrutura

```
Comenta/
  ComentaApp.swift    ponto de entrada; alterna login ↔ conversas
  API.swift           cliente HTTP + modelos
  LoginView.swift     e-mail, senha e endereço do servidor
  ConversasView.swift lista com status e não-lidas
  ConversaView.swift  balões e envio de resposta
Info.plist            fora da pasta sincronizada, de propósito
```

O alvo usa **grupo sincronizado com o sistema de arquivos** (Xcode 16+): criar um
`.swift` dentro de `Comenta/` já o inclui no build, sem editar o `.xcodeproj`.

## Decisões que não são óbvias

**Endereço configurável na tela de login.** No protótipo a API vive no Mac, e o
IP da rede muda com o DHCP. Cravar no código obrigaria a recompilar a cada troca
de rede.

**`NSAppTransportSecurity` liberado.** A API local é HTTP simples e o iOS bloqueia
cleartext por padrão — sem a exceção, toda chamada falha com "cannot connect to
server", sem pista do motivo. **Isto é só para o protótipo**; com a API atrás de
HTTPS, remova a chave do `Info.plist`.

**Decodificador de data customizado.** A API devolve ISO-8601 **com
milissegundos** (`2026-07-25T21:34:37.693Z`), e a estratégia `.iso8601` do
`JSONDecoder` não aceita fração de segundo — usá-la faria toda conversa falhar ao
decodificar.

**O texto continua no campo quando o envio falha.** Perder o que foi digitado por
causa de uma oscilação de Wi-Fi é pior que ver a mensagem de erro.

## Estado

Compila limpo contra o SDK do iOS 26.5 e gera um `.app` arm64 válido.

**Ainda não foi executado em aparelho nem em simulador**: o runtime do iOS não
está instalado neste Xcode (Settings → Components) e o iPhone estava offline. A
verificação foi de compilação e do `Info.plist` gerado — o comportamento em tela
depende de você rodar.
