#!/usr/bin/env python3
"""
Exemplo Oficial de Uso do Modelo Jev (TypeSafe AI - System One Models)
DOCS: https://typesafe.ai/blog/introducing-system-one-models-and-jev
"""

import os
from typesafe_sdk import TypeSafeClient, Choice, Score, Noul

def main():
    api_key = os.getenv("TYPESAFE_API_KEY", "")
    print("🤖 TypeSafe AI — Jev (System One Model) instalado com sucesso!")
    print(f"📦 Pacote Python: typesafe-sdk")
    print(f"📦 Pacote Node.js: @typesafe-ai/sdk")
    print(f"🔑 Chave de API: {'Configurada em TYPESAFE_API_KEY' if api_key else 'Não detectada (obtenha em https://console.typesafe.ai)'}")

    print("\n💡 Exemplo de Código Python:")
    print('''
from typesafe_sdk import TypeSafeClient, Choice, Score, Noul

client = TypeSafeClient(api_key=os.getenv("TYPESAFE_API_KEY"))

# Jev processa entradas não estruturadas em decisões estruturadas paralelas de baixa latência (70-500ms)
response = client.models.run(
    model="jev",
    input="O cliente relatou instabilidade na conexão e quer solicitar reembolso parcial.",
    questions=[
        Choice(name="categoria", choices=["suporte_tecnico", "financeiro", "vendas", "spam"]),
        Score(name="urgencia", min=1, max=5),
        Noul(name="solicita_reembolso", criteria="O usuário solicita estorno de valores?")
    ]
)

print(response)
''')

if __name__ == "__main__":
    main()
