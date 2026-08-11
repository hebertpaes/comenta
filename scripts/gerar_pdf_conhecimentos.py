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
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#334155'),
        spaceAfter=4
    )

    story = []

    story.append(Paragraph("🧠 BASE DE CONHECIMENTO & TREINAMENTO IA — 17 CURSOS ABACS", title_style))
    story.append(Paragraph("Estudo completo dos cursos da Escola Avançada ABACS ingeridos no modelo Gemini IA para suporte e vendas automatizadas", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#6d28d9'), spaceAfter=10))

    courses = [
        ("1. Operador de Caixa (ID 77)", "R$ 99,00", "Sangria, abertura/fechamento de caixa, pagamentos Pix/Cartão, notas falsas e atendimento."),
        ("2. Administrativo Completo", "R$ 99,00", "Rotinas administrativas, faturamento, gestão comercial e redação corporativa."),
        ("3. Curso Preparatório ENEM", "R$ 99,00", "Redação Nota 1000, simulados com correção oficial, Matemática e Ciências."),
        ("4. Criação de Game", "R$ 99,00", "Lógica de programação para jogos 2D/3D, pixel art e publicação na Steam/Mobile."),
        ("5. Pacote Office Pro", "R$ 99,00", "Microsoft Word avançado, Excel (PROCV, Tabela Dinâmica) e PowerPoint corporativo."),
        ("6. Design Gráfico", "R$ 99,00", "Adobe Photoshop, Illustrator, teoria das cores e criação de identidade visual."),
        ("7. Marketing Digital", "R$ 99,00", "Tráfego pago (Google/Meta Ads), copywriting, mídias sociais e funis de vendas."),
        ("8. Curso Hardware", "R$ 99,00", "Montagem e manutenção de PCs, formatação, troca de peças e assistência técnica."),
        ("9. Eletricista com NR-10", "R$ 99,00", "Instalações elétricas prediais, esquemas elétricos e norma de segurança NR-10."),
        ("10. Barbeiro Profissional", "R$ 99,90", "Cortes modernos (Fade, Degradê), barba com toalha quente e gestão de barbearia."),
        ("11. Ponte Rolante", "R$ 99,90", "Operação segura de pontes rolantes, cabos de aço e inspeção industrial."),
        ("12. Criação de App Android/iOS", "R$ 99,90", "Desenvolvimento de aplicativos para smartphones, banco de dados e APIs."),
        ("13. Energia Solar", "R$ 99,90", "Dimensionamento de painéis fotovoltaicos, inversores e homologação técnica."),
        ("14. JavaScript", "R$ 69,90", "Sintaxe moderna ES6+, manipulação de DOM, Fetch API e chamadas assíncronas."),
        ("15. Interactive English", "R$ 99,90", "Conversação prática, áudios com nativos e vocabulário corporativo para trabalho."),
        ("16. Dropshipping", "R$ 69,90", "Mineração de produtos, criação de loja virtual e vendas online sem estoque."),
        ("17. Canva", "R$ 69,90", "Criação de banners, posts no Instagram, vídeos curtos e apresentações em segundos.")
    ]

    table_data = [["Curso ABACS", "Preço", "Síntese do Conhecimento Ingerido na IA"]]
    for name, price, summary in courses:
        table_data.append([name, price, summary])

    t = Table(table_data, colWidths=[140, 55, 345])
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
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=8))
    story.append(Paragraph("<i>Base de Conhecimento Ingerida na Sofia Gemini IA · Escola Avançada ABACS</i>", ParagraphStyle('Footer', parent=body_style, fontSize=8, textColor=colors.HexColor('#94a3b8'), alignment=1)))

    doc.build(story)
    print(f"✓ PDF Conhecimentos gerado em: {filename}")

if __name__ == "__main__":
    artifact_path = "/Users/hebertpaes/.gemini/antigravity-cli/brain/9a4f4c99-8669-4844-a990-b853353da6e9/conhecimentos_cursos_abacs.pdf"
    workspace_path = "/Users/hebertpaes/.gemini/antigravity/scratch/comenta/conhecimentos_cursos_abacs.pdf"

    generate_pdf(artifact_path)
    generate_pdf(workspace_path)
