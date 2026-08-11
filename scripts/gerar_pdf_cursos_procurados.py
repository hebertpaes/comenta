import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
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

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#6d28d9'),
        spaceAfter=8
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569'),
        spaceAfter=12
    )

    heading2_style = ParagraphStyle(
        'Heading2Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=10,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155'),
        spaceAfter=5
    )

    story = []

    story.append(Paragraph("🚀 CURSOS E TREINAMENTOS MAIS PROCURADOS DE 2026", title_style))
    story.append(Paragraph("Pesquisa de Mercado de Trabalho e Matriz de Conteúdos Criados no Comenta SaaS", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#6d28d9'), spaceAfter=10))

    courses = [
        ("Engenharia de Prompt & IA", "R$ 149,00", "Fundamentos LLM, Agentes Autônomos, Automação WhatsApp Gemini API e N8N."),
        ("Cibersegurança & LGPD", "R$ 199,00", "Defesa cibernética, análise de vulnerabilidades, firewalls e adequação à LGPD."),
        ("Gestão de Tráfego Pago & Performance", "R$ 149,00", "Google Search/Display, Instagram Ads, TikTok Ads e métricas ROAS/CPA."),
        ("Análise de Dados com Power BI & Excel", "R$ 129,00", "Power Query, fórmulas DAX, tabela dinâmica e dashboards executivos na nuvem."),
        ("Gestão de Logística & E-commerce 4.0", "R$ 99,00", "Armazenagem WMS, logística reversa, integração Mercado Livre/Shopee e frete.")
    ]

    table_data = [["Curso / Treinamento", "Preço", "Conteúdo Programático Principal"]]
    for name, price, summary in courses:
        table_data.append([name, price, summary])

    t = Table(table_data, colWidths=[150, 60, 330])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#6d28d9')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8.5),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('FONTSIZE', (0,1), (-1,-1), 8),
    ]))
    story.append(t)

    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=8))
    story.append(Paragraph("<i>Relatório de Pesquisa e Criação de Conteúdos · Comenta SaaS Learning Suite</i>", ParagraphStyle('Footer', parent=body_style, fontSize=8, textColor=colors.HexColor('#94a3b8'), alignment=1)))

    doc.build(story)
    print(f"✓ PDF Cursos Mais Procurados gerado em: {filename}")

if __name__ == "__main__":
    artifact_path = "/Users/hebertpaes/.gemini/antigravity-cli/brain/9a4f4c99-8669-4844-a990-b853353da6e9/cursos_mais_procurados_2026.pdf"
    workspace_path = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/cursos_mais_procurados_2026.pdf"

    generate_pdf(artifact_path)
    generate_pdf(workspace_path)
