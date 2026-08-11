import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Estilos Personalizados
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#6d28d9'),
        spaceAfter=10
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#475569'),
        spaceAfter=15
    )

    heading2_style = ParagraphStyle(
        'Heading2Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=14,
        spaceAfter=8
    )

    body_style = ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0f172a'),
        backColor=colors.HexColor('#f1f5f9'),
        borderColor=colors.HexColor('#cbd5e1'),
        borderWidth=0.5,
        borderPadding=6,
        spaceAfter=8
    )

    story = []

    # Cabeçalho Principal
    story.append(Paragraph("🤖 MANUALL COMPLETO DE EXECUÇÃO, CRIAÇÃO E MELHORIAS — COMENTA SAAS", title_style))
    story.append(Paragraph("Guia Mestre de Comandos, Integrações ABACS, Hotmart, Google Gemini IA, n8n e Dicas Estratégicas", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#6d28d9'), spaceAfter=15))

    # Seção 1: Resumo da Arquitetura
    story.append(Paragraph("1. VISÃO GERAL DA ARQUITETURA DO SISTEMA", heading2_style))
    story.append(Paragraph("O Comenta é uma plataforma SaaS multicanal de atendimento e vendas automatizada com IA generativa (Google Gemini), integrada aos ecossistemas da Hotmart, ABACS (Escola Avançada), n8n Workflows e WhatsApp Cloud API.", body_style))

    # Tabela de Módulos
    data_modulos = [
        ["Módulo / Serviço", "URL / Porta", "Descrição & Função Principal"],
        ["Comenta AI App", "http://localhost:3000/agentes", "Interface full-screen dos robôs de IA generativa."],
        ["Comenta Play", "http://localhost:3000/", "Plataforma de streaming de treinamentos e videoaulas HD."],
        ["Painel AtendeChat", "http://localhost:8080/", "Caixa de entrada multicanal, Kanban CRM e Cursos."],
        ["Fastify API & Swagger", "http://localhost:4000/docs", "API REST, webhooks e automações de atendimento."],
        ["n8n Workflows", "http://localhost:5678/", "Motor de automação de processos e agendamento cron."],
        ["Portal ABACS", "https://abacs.org.br/login.php", "Portal de autenticação e sincronismo de alunos."],
    ]

    t = Table(data_modulos, colWidths=[130, 150, 260])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#6d28d9')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8.5),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    # Seção 2: Comandos de Execução e Inicialização
    story.append(Paragraph("2. COMANDOS DE INICIALIZAÇÃO E COMPOSE DOCKER", heading2_style))
    story.append(Paragraph("Para iniciar todo o ecossistema localmente usando Docker Compose:", body_style))
    story.append(Paragraph("cd deploy && docker compose -f docker-compose.yml -f compose.local.yml up -d --build", code_style))

    story.append(Paragraph("Para verificar a saúde dos containers ativos:", body_style))
    story.append(Paragraph("docker ps --format \"table {{.Names}}\\t{{.Status}}\\t{{.Ports}}\"", code_style))

    # Seção 3: Webhooks & Integração ABACS / Hotmart
    story.append(Paragraph("3. CONFIGURAÇÃO DE WEBHOOKS HOTMART & ABACS", heading2_style))
    story.append(Paragraph("Credenciais de Segurança e Tokens Oficiais:", body_style))
    story.append(Paragraph("Hottok de Verificação Hotmart: i3PKT8y4IDZIJ6ZK5xEMraSXppomf12d610670-551e-497b-8f6c-3f32cb10f3bc\nToken da Escola Avançada / ABACS: 89945.18284682318tokenavancada\nCurso ID Mapeado: 77 (Operador de Caixa)", code_style))

    story.append(Paragraph("URL de Integração Hotmart (Cadastrar no painel da Hotmart):", body_style))
    story.append(Paragraph("https://abacs.org.br/integracao/hotmart/hotmart.php?token=89945.18284682318tokenavancada&curso=77", code_style))

    story.append(Paragraph("Comando Curl para testar a integração ABACS Operador de Caixa localmente:", body_style))
    story.append(Paragraph("curl -i -X POST -H \"Content-Type: application/json\" -d '{\"data\":{\"buyer\":{\"name\":\"Aluno Operador de Caixa\",\"email\":\"caixa@abacs.org.br\",\"checkout_phone\":\"5566999999999\"},\"product\":{\"name\":\"Operador de Caixa\"},\"purchase\":{\"transaction\":\"TRX_CAIXA_77\"}}}' \"http://localhost:4000/integracao/hotmart/hotmart.php?token=89945.18284682318tokenavancada&curso=77\"", code_style))

    story.append(Spacer(1, 10))

    # Seção 4: Automação n8n
    story.append(Paragraph("4. CONFIGURAÇÃO E AUTOMAÇÃO NO N8N WORKFLOWS", heading2_style))
    story.append(Paragraph("Comando para importar e ativar o fluxo de automação no n8n (http://localhost:5678):", body_style))
    story.append(Paragraph("docker cp deploy/n8n/workflows/hotmart-abacs-comenta-automation.json comenta-n8n-1:/tmp/workflow.json && docker exec comenta-n8n-1 n8n import:workflow --input=/tmp/workflow.json && docker restart comenta-n8n-1", code_style))

    # Seção 5: Dicas de Melhoria e Expansão
    story.append(Paragraph("5. DICAS DE MELHORIA E RECOMENDAÇÕES ESTRATÉGICAS", heading2_style))
    story.append(Paragraph("• <b>1. Cache Redis para Respostas de IA</b>: Implementar cache com expiração de 24h para perguntas frequentes na API, reduzindo custos com a API do Google Gemini.", body_style))
    story.append(Paragraph("• <b>2. Fila de Retry com Backoff Exponencial</b>: Configurar tentativas de reenvio com BullMQ para mensagens de WhatsApp caso o número esteja temporariamente fora de área.", body_style))
    story.append(Paragraph("• <b>3. Monitoramento de Saúde das Conexões</b>: Adicionar alertas automáticos via Webhook no Telegram/E-mail quando a conexão de um número de WhatsApp desconectar.", body_style))
    story.append(Paragraph("• <b>4. Relatórios de Desempenho dos Atendentes</b>: Exibir no Metabase (http://localhost:3001) a taxa de resolução dos Robôs de IA versus Atendentes Humanos.", body_style))

    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=10))
    story.append(Paragraph("<i>Documento Gerado Automáticamente pelo Antigravity AI Agent · Comenta SaaS v1.0</i>", ParagraphStyle('Footer', parent=body_style, fontSize=8, textColor=colors.HexColor('#94a3b8'), alignment=1)))

    doc.build(story)
    print(f"✓ PDF gerado com sucesso em: {filename}")

if __name__ == "__main__":
    artifact_path = "/Users/hebertpaes/.gemini/antigravity-cli/brain/9a4f4c99-8669-4844-a990-b853353da6e9/manual_execucao_e_melhorias_comenta.pdf"
    workspace_path = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/manual_execucao_e_melhorias_comenta.pdf"

    generate_pdf(artifact_path)
    generate_pdf(workspace_path)
