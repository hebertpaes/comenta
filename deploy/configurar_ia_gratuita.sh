#!/bin/bash
set -e

echo "=========================================================================="
echo "🤖 CONFIGURAÇÃO DE IA GRATUITA — AUTOMAÇÃO DE NOTÍCIAS (GEMINI 2.0 FLASH / OLLAMA)"
echo "=========================================================================="

WORK_DIR="/home/hmt/automacao-noticias"
sudo mkdir -p "$WORK_DIR"
sudo chown -R $USER:$USER "$WORK_DIR" 2>/dev/null || true
cd "$WORK_DIR"

# 1. Instalar dependências Python (requests, beautifulsoup4, feedparser, schedule)
echo "📦 1/4 Instalando dependências Python e utilitários..."
sudo apt-get update -y || true
sudo apt-get install -y python3 python3-pip python3-venv cron curl wget git || true

python3 -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install --upgrade pip
pip install requests feedparser beautifulsoup4 schedule python-dotenv google-genai

# 2. Criar script de automação de notícias em Python
echo "⚡ 2/4 Gerando script auto_news_bot.py com Google Gemini 2.0 Flash..."
cat << 'EOF' > auto_news_bot.py
import os
import sys
import json
import time
import feedparser
import requests
from bs4 import BeautifulSoup
from google import genai

# Configuração da API do Google Gemini (Gratuito - 15 RPM / 1500 RPD)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GHOST_API_URL = os.environ.get("GHOST_API_URL", "http://localhost:2368")

FEEDS = [
    "https://g1.globo.com/rss/g1/mato-grosso/",
    "https://news.google.com/rss/search?q=Mato+Grosso+Cuiaba+Varzea+Grande&hl=pt-BR&gl=BR&ceid=BR:pt-419"
]

def reescrever_noticia_ia(titulo, conteudo_original):
    if not GEMINI_API_KEY:
        print("⚠️ GEMINI_API_KEY não configurada. Usando modo sintético básico.")
        return titulo, conteudo_original

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = f"""
Você é um Editor Chefe de Jornalismo Digital do Portal Hoje MT / Comenta.
Reescreva a seguinte notícia com tom jornalístico impecável, isento e envolvente (estilo USA TODAY / G1):

Título Original: {titulo}
Texto Original: {conteudo_original[:1500]}

Responda ESTRITAMENTE em formato JSON no modelo abaixo:
{{
  "titulo": "Novo título impactante",
  "subtitulo": "Resumo de 1 frase para a chamada",
  "conteudo_html": "<p>Parágrafo 1...</p><p>Parágrafo 2...</p>",
  "tags": ["Mato Grosso", "Notícias"]
}}
"""
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
        )
        data = json.loads(response.text.strip('```json').strip('```'))
        return data.get("titulo", titulo), data.get("conteudo_html", conteudo_original)
    except Exception as e:
        print(f"Erro ao processar com Gemini 2.0: {e}")
        return titulo, conteudo_original

def executar_rodada_automação():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 📰 Iniciando varredura de notícias...")
    noticias_processadas = 0

    for feed_url in FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            for item in feed.entries[:3]:
                titulo = item.title
                link = item.link
                resumo = item.get("summary", "")
                
                print(f"📌 Processando: {titulo}")
                novo_titulo, novo_conteudo = reescrever_noticia_ia(titulo, resumo)
                noticias_processadas += 1
                time.sleep(2)
        except Exception as e:
            print(f"Erro no feed {feed_url}: {e}")

    print(f"✅ Rodada concluída: {noticias_processadas} notícias verificadas/processadas.")

if __name__ == "__main__":
    executar_rodada_automação()
EOF

# 3. Criar script de execução wrapper
echo "⚙️ 3/4 Criando executor rodar_automação.sh..."
cat << 'EOF' > rodar_automação.sh
#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"
source venv/bin/activate
python3 auto_news_bot.py >> automacao.log 2>&1
EOF
chmod +x rodar_automação.sh

# 4. Configurar Cron Job para rodar a cada hora
echo "🕒 4/4 Agendando Cron Job automático (a cada 1 hora)..."
(crontab -l 2>/dev/null | grep -v "rodar_automação.sh" ; echo "0 * * * * $WORK_DIR/rodar_automação.sh") | crontab -

# Executar primeira rodada de teste
bash "$WORK_DIR/rodar_automação.sh" || true

echo "=========================================================================="
echo "🎉 CONFIGURAÇÃO DE IA GRATUITA CONCLUÍDA COM SUCESSO!"
echo "📍 Pasta: $WORK_DIR"
echo "📜 Log: $WORK_DIR/automacao.log"
echo "=========================================================================="
