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
        fontSize=20,
        leading=24,
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
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=12,
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

    story.append(Paragraph("📢 ESTRATÉGIA DE ANÚNCIOS GOOGLE ADS — CURSOS ABACS & ESCOLA AVANÇADA", title_style))
    story.append(Paragraph("Palavras-Chave, Copys Responsivas (RSA), Extensões e URLs da Hotmart e Portal ABACS", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#6d28d9'), spaceAfter=15))

    story.append(Paragraph("1. RESUMO DA CAMPANHA DE PESQUISA (GOOGLE SEARCH)", heading2_style))
    story.append(Paragraph("• <b>URL do Portal ABACS</b>: https://abacs.org.br/login.php", body_style))
    story.append(Paragraph("• <b>URL de Acompanhamento Hotmart (Curso 77)</b>: https://abacs.org.br/integracao/hotmart/hotmart.php?token=89945.18284682318tokenavancada&curso=77", body_style))

    story.append(Paragraph("2. PALAVRAS-CHAVE DE ALTA INTENÇÃO DE COMPRA", heading2_style))
    story.append(Paragraph("[curso operador de caixa abacs]\n[escola avançada operador de caixa]\n\"curso operador de caixa com certificado\"\n\"curso de operador de caixa online\"\n\"inscrição operador de caixa abacs\"", code_style))

    story.append(Paragraph("3. TÍTULOS E DESCRIÇÕES RESPONSIVAS (RSA)", heading2_style))

    data_headlines = [
        ["#", "Título (Headline - máx 30 caracteres)", "Posição Recomendada"],
        ["H1", "Curso Operador de Caixa", "Fixado na Posição 1"],
        ["H2", "Escola Avançada ABACS", "Fixado na Posição 2"],
        ["H3", "Certificado Reconhecido", "Fixado na Posição 3"],
        ["H4", "Aulas 100% Online HD", "Livre"],
        ["H5", "Matrícula Imediata Hotmart", "Livre"],
        ["H6", "Suporte por IA no WhatsApp", "Livre"],
        ["H7", "Aprenda Operar Caixas e Pix", "Livre"],
    ]

    t = Table(data_headlines, colWidths=[30, 310, 200])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#6d28d9')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('FONTSIZE', (0,1), (-1,-1), 8.5),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Descrições Responsivas (Descriptions - máx 90 caracteres):", body_style))
    story.append(Paragraph("• <b>D1</b>: Formação completa em Operação de Caixa e Atendimento da Escola Avançada ABACS. Inscreva-se!", body_style))
    story.append(Paragraph("• <b>D2</b>: Aprenda Sangria, Abertura/Fechamento de Caixa, Pix e Máquina de Cartão. Certificado Válido!", body_style))
    story.append(Paragraph("• <b>D3</b>: Acesso imediato às videoaulas e suporte exclusivo por robôs de IA no WhatsApp. Confira!", body_style))

    story.append(Paragraph("4. EXTENSÕES DE SITELINKS E CALLOUTS", heading2_style))
    story.append(Paragraph("• <b>Sitelink 1</b>: Conheça os Cursos ABACS -> https://abacs.org.br/login.php", body_style))
    story.append(Paragraph("• <b>Sitelink 2</b>: Inscrição Operador de Caixa -> https://abacs.org.br/integracao/hotmart/hotmart.php?token=89945.18284682318tokenavancada&curso=77", body_style))
    story.append(Paragraph("• <b>Callouts</b>: Certificado Nacional | Suporte por IA 24h | Plataforma Comenta Play | Pagamento Seguro Hotmart", body_style))

    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=10))
    story.append(Paragraph("<i>Documento Gerado Automáticamente pelo Antigravity AI Agent · Comenta SaaS Google Ads Suite</i>", ParagraphStyle('Footer', parent=body_style, fontSize=8, textColor=colors.HexColor('#94a3b8'), alignment=1)))

    doc.build(story)
    print(f"✓ PDF Google Ads gerado em: {filename}")

if __name__ == "__main__":
    artifact_path = "/Users/hebertpaes/.gemini/antigravity-cli/brain/9a4f4c99-8669-4844-a990-b853353da6e9/anuncios_google_ads_abacs.pdf"
    workspace_path = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/anuncios_google_ads_abacs.pdf"

    generate_pdf(artifact_path)
    generate_pdf(workspace_path)
