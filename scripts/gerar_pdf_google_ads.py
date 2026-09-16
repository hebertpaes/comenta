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
        fontSize=12,
        leading=15,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=10,
        spaceAfter=6
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

    story.append(Paragraph("📢 ESTRATÉGIA GOOGLE ADS — 17 CURSOS LOJA VIRTUAL ABACS", title_style))
    story.append(Paragraph("Palavras-Chave, Anúncios Responsivos (RSA) e Links Oficiais da Loja Virtual (https://abacs.org.br/loja_virtual/index.php)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#6d28d9'), spaceAfter=10))

    story.append(Paragraph("1. TABELA DOS 17 CURSOS ABACS SINCRONIZADOS NO GOOGLE ADS", heading2_style))

    data_courses = [
        ["#", "Curso ABACS", "Categoria", "Preço", "Link Direto"],
        ["1", "Operador de Caixa", "Administrativo", "R$ 99,00", "Hotmart ID 77 / ABACS"],
        ["2", "Administrativo Completo", "Combo Gestão", "R$ 99,00", "vercombo.php?curso=Administrativo"],
        ["3", "Curso Preparatório ENEM", "Educação", "R$ 99,00", "vercombo.php?curso=ENEM"],
        ["4", "Criação de Game", "Tecnologia", "R$ 99,00", "vercombo.php?curso=Criação de Game"],
        ["5", "Pacote Office Pro", "Informática", "R$ 99,00", "vercombo.php?curso=Office Pro"],
        ["6", "Design Gráfico", "Design", "R$ 99,00", "vercombo.php?curso=Design Gráfico"],
        ["7", "Marketing Digital", "Web / Vendas", "R$ 99,00", "vercombo.php?curso=Marketing"],
        ["8", "Curso Hardware", "Manutenção TI", "R$ 99,00", "vercombo.php?curso=Hardware"],
        ["9", "Eletricista com NR-10", "Indústria", "R$ 99,00", "vercombo.php?curso=NR-10"],
        ["10", "Barbeiro Profissional", "Estética", "R$ 99,90", "vercursos.php?curso=Barbeiro"],
        ["11", "Ponte Rolante", "Indústria / NR", "R$ 99,90", "vercursos.php?curso=Ponte Rolante"],
        ["12", "Criação de App Android/iOS", "Programação", "R$ 99,90", "vercursos.php?curso=App"],
        ["13", "Energia Solar", "Sustentabilidade", "R$ 99,90", "vercursos.php?curso=Energia Solar"],
        ["14", "JavaScript", "Programação", "R$ 69,90", "vercursos.php?curso=JavaScript"],
        ["15", "Interactive English", "Idiomas", "R$ 99,90", "vercursos.php?curso=English"],
        ["16", "Dropshipping", "E-commerce", "R$ 69,90", "vercursos.php?curso=Dropshipping"],
        ["17", "Canva", "Design Rápido", "R$ 69,90", "vercursos.php?curso=Canva"]
    ]

    t = Table(data_courses, colWidths=[20, 150, 100, 60, 210])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#6d28d9')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('FONTSIZE', (0,1), (-1,-1), 7.5),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    story.append(Paragraph("2. ESTRUTURA DOS ANÚNCIOS RESPONSIVOS E EXTENSÕES", heading2_style))
    story.append(Paragraph("• <b>Headlines</b>: Curso [NomeCurso] ABACS | Escola Avançada Certificado | Aulas 100% Online HD | Suporte por IA no WhatsApp", body_style))
    story.append(Paragraph("• <b>Descriptions</b>: Formação profissionalizante reconhecida pela Escola Avançada ABACS. Inscreva-se com desconto e acesso imediato!", body_style))
    story.append(Paragraph("• <b>Sitelinks</b>: Loja Virtual ABACS (https://abacs.org.br/loja_virtual/index.php) | Inscrição Hotmart | Comenta Play | Suporte IA", body_style))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=8))
    story.append(Paragraph("<i>Documento Gerado Automaticamente pelo Antigravity AI Agent · ABACS Loja Virtual Ads Suite</i>", ParagraphStyle('Footer', parent=body_style, fontSize=8, textColor=colors.HexColor('#94a3b8'), alignment=1)))

    doc.build(story)
    print(f"✓ PDF Google Ads 17 Cursos gerado em: {filename}")

if __name__ == "__main__":
    artifact_path = "/Users/hebertpaes/.gemini/antigravity-cli/brain/9a4f4c99-8669-4844-a990-b853353da6e9/anuncios_google_ads_abacs.pdf"
    workspace_path = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/anuncios_google_ads_abacs.pdf"

    generate_pdf(artifact_path)
    generate_pdf(workspace_path)
