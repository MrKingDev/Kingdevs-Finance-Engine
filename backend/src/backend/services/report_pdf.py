"""Portable, selectable-text PDFs matching the supplied monthly overview design."""

from decimal import Decimal
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import LongTable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, TableStyle

from backend.services.exports import CategorySpending, MonthlyReport, ZERO

FONT_DIR = Path(__file__).resolve().parents[1] / "assets" / "fonts"
pdfmetrics.registerFont(TTFont("FinanceSans", str(FONT_DIR / "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("FinanceSans-Bold", str(FONT_DIR / "DejaVuSans-Bold.ttf")))

NAVY = HexColor("#14283d")
MUTED = HexColor("#61758a")
PAPER = HexColor("#f5f7fb")
PALE = HexColor("#e8eef6")
TEAL = HexColor("#087f78")
CORAL = HexColor("#c55e4b")
BLUE = HexColor("#4263ba")

# sRGB equivalents of the approved -2 OKLCH tokens in frontend/src/app/globals.css.
CHART_COLORS = {
    "emerald": "#10b981", "red": "#ef4444", "amber": "#f59e0b", "blue": "#3b82f6",
    "cyan": "#06b6d4", "fuchsia": "#d946ef", "green": "#22c55e", "indigo": "#6366f1",
    "lime": "#84cc16", "orange": "#f97316", "pink": "#ec4899", "purple": "#a855f7",
    "rose": "#f43f5e", "sky": "#0ea5e9", "teal": "#14b8a6", "violet": "#8b5cf6",
    "yellow": "#eab308",
}


def money(value: Decimal) -> str:
    return f"-${abs(value):,.2f}" if value < 0 else f"${value:,.2f}"


def clean_text(value: str) -> str:
    return "".join(char if char.isprintable() else " " for char in value)


def label(canvas, text, x, y, size=10, color=NAVY, bold=False, max_width=None, align="left"):
    text = clean_text(str(text))
    font = "FinanceSans-Bold" if bold else "FinanceSans"
    if max_width:
        size = min(size, size * max_width / max(pdfmetrics.stringWidth(text, font, size), 1))
    canvas.setFont(font, size)
    canvas.setFillColor(color)
    draw = {"left": canvas.drawString, "right": canvas.drawRightString, "center": canvas.drawCentredString}[align]
    draw(x, y, text)


def short_label(text: str, width: float, size=9) -> str:
    text = clean_text(text)
    if pdfmetrics.stringWidth(text, "FinanceSans", size) <= width:
        return text
    while text and pdfmetrics.stringWidth(text + "…", "FinanceSans", size) > width:
        text = text[:-1]
    return text + "…"


def rectangle(canvas, x, y, width, height, color, radius=0):
    canvas.setFillColor(color)
    if radius:
        canvas.roundRect(x, y, width, height, radius, stroke=0, fill=1)
    else:
        canvas.rect(x, y, width, height, stroke=0, fill=1)


def footer(canvas, report: MonthlyReport, styled: bool):
    canvas.setStrokeColor(HexColor("#d8e1ec") if styled else black)
    canvas.setLineWidth(.5)
    canvas.line(40, 72, 572, 72)
    color = MUTED if styled else black
    label(canvas, f"Finance report  /  {report.period}", 40, 49, 8, color)
    label(canvas, f"{canvas.getPageNumber():02}", 572, 49, 8, color, align="right")


def cover(canvas, report: MonthlyReport):
    rectangle(canvas, 0, 0, 612, 792, PAPER)
    rectangle(canvas, 0, 610, 612, 182, NAVY)
    rectangle(canvas, 40, 750, 32, 4, HexColor("#56cfbb"), 2)
    label(canvas, "MONTHLY OVERVIEW", 40, 723, 9, HexColor("#8fe0d1"), True)
    label(canvas, "Finance report", 40, 676, 30, white, True)
    label(canvas, report.period, 40, 646, 13, HexColor("#cad6e3"))
    label(canvas, f"{report.year} / {report.month:02}", 572, 646, 10, HexColor("#cad6e3"), align="right")
    for x, title, amount, color in [
        (40, "Income", report.income, TEAL), (221, "Expenses", report.expenses, CORAL),
        (402, "Net cash flow", report.net, BLUE),
    ]:
        rectangle(canvas, x, 511, 170, 122, white, 12)
        rectangle(canvas, x + 14, 601, 25, 4, color, 2)
        label(canvas, title, x + 16, 578, 10, MUTED)
        label(canvas, money(amount), x + 16, 542, 25, color, True, 138)

    label(canvas, "Spending by category", 40, 476, 16, NAVY, True)
    rectangle(canvas, 40, 233, 532, 220, white, 12)
    visible = report.categories
    if len(visible) > 6:
        visible = visible[:5] + [CategorySpending("Other categories", sum((c.amount for c in visible[5:]), ZERO), "other")]
    cx, cy, radius = 139, 342, 67
    canvas.setFillColor(HexColor("#e3eaf2"))
    canvas.circle(cx, cy, radius, stroke=0, fill=1)
    angle = 90
    for category in visible:
        color = CHART_COLORS.get(category.color.removeprefix("chart-").removesuffix("-2"), "#94a3b8")
        extent = float(category.amount / report.expenses * 360)
        canvas.setFillColor(HexColor(color))
        canvas.wedge(cx-radius, cy-radius, cx+radius, cy+radius, startAng=angle, extent=-extent, stroke=0, fill=1)
        angle -= extent
    canvas.setFillColor(white)
    canvas.circle(cx, cy, 51, stroke=0, fill=1)
    label(canvas, money(report.expenses), cx, 345, 21, NAVY, True, 94, "center")
    label(canvas, "Total spending", cx, 326, 9, MUTED, align="center")
    if not visible:
        rectangle(canvas, 242, 389, 28, 4, TEAL, 2)
        label(canvas, "No spending recorded", 242, 363, 14, NAVY, True)
        label(canvas, "There are no category totals to display", 242, 340, 9.5, MUTED)
        label(canvas, "for this reporting period.", 242, 324, 9.5, MUTED)
    else:
        for index, category in enumerate(visible):
            y = 412 - index * 28
            color = CHART_COLORS.get(category.color.removeprefix("chart-").removesuffix("-2"), "#94a3b8")
            rectangle(canvas, 242, y-1, 7, 7, HexColor(color), 2)
            label(canvas, short_label(category.name, 145), 257, y, 9)
            label(canvas, money(category.amount), 552, y, 10, NAVY, True, 138, "right")
            share = category.amount / report.expenses * 100
            label(canvas, f"{share:.1f}% of spending", 257, y-11, 7, MUTED)

    rectangle(canvas, 40, 115, 532, 92, PALE, 12)
    label(canvas, "TRANSACTIONS", 58, 175, 9, MUTED, True)
    label(canvas, len(report.transactions), 58, 139, 26, NAVY, True, 58)
    title = "No transactions recorded" if not report.transactions else "Transactions recorded"
    label(canvas, title, 127, 151, 12, NAVY, True)
    label(canvas, f"Activity for {report.period}", 127, 132, 9, MUTED)
    if report.transactions:
        label(canvas, "Complete transaction details on the following pages.", 40, 93, 8, MUTED)
    footer(canvas, report, True)


def pdf_report(report: MonthlyReport, styled: bool = True) -> bytes:
    output = BytesIO()
    # Platypus frames add 6pt internal padding; these margins align content at x=40.
    doc = SimpleDocTemplate(output, pagesize=letter, leftMargin=34, rightMargin=34,
                           topMargin=98 if styled else 42, bottomMargin=82,
                           title=f"Finance report / {report.period}", author="KingDev's Finance Engine")
    body = ParagraphStyle("body", fontName="FinanceSans", fontSize=8, leading=12,
                          textColor=NAVY if styled else black, splitLongWords=True)
    heading = ParagraphStyle("heading", parent=body, fontName="FinanceSans-Bold",
                             fontSize=13, leading=19, spaceBefore=14, spaceAfter=10, keepWithNext=True)
    right = ParagraphStyle("right", parent=body, alignment=2)
    head = ParagraphStyle("head", parent=body, fontName="FinanceSans-Bold", textColor=white if styled else black)

    def paragraph(value, style=body):
        # Never interpret a merchant/category as ReportLab XML, links or external images.
        return Paragraph(escape(clean_text(str(value))), style)

    def table(headers, rows, widths, last_right=False):
        data = [[paragraph(cell, head) for cell in headers]]
        for row in rows:
            data.append([paragraph(cell, right if last_right and i == len(row)-1 else body)
                         for i, cell in enumerate(row)])
        result = LongTable(data, colWidths=widths, repeatRows=1, hAlign="LEFT", splitInRow=1)
        result.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY if styled else HexColor("#eeeeee")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, PAPER] if styled else [white]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("LINEBELOW", (0, 0), (-1, 0), .5, MUTED if styled else black),
        ]))
        return result

    def page(canvas, document):
        canvas.saveState()
        if styled and document.page == 1:
            cover(canvas, report)
        else:
            if styled:
                rectangle(canvas, 0, 0, 612, 792, PAPER)
                rectangle(canvas, 0, 704, 612, 88, NAVY)
                label(canvas, "Finance report", 40, 751, 18, white, True)
                label(canvas, report.period + " / Details", 40, 728, 10, HexColor("#cad6e3"))
            footer(canvas, report, styled)
        canvas.restoreState()

    story = []
    if styled:
        story.append(Spacer(1, 1))
        if report.transactions:
            story.append(PageBreak())
    else:
        story += [paragraph("Finance report", heading), paragraph(report.period), Spacer(1, 12)]
        story.append(table(["Income", "Expenses", "Net cash flow"],
                           [[money(report.income), money(report.expenses), money(report.net)]], [177, 177, 178]))

    if report.categories:
        story.append(paragraph("Spending by category", heading))
        story.append(table(["Category", "Share", "Amount"], [
            [c.name, f"{c.amount / report.expenses * 100:.1f}%", money(c.amount)] for c in report.categories
        ], [322, 70, 140], last_right=True))
    elif not styled:
        story.append(paragraph("No spending recorded", heading))

    if report.transactions:
        story.append(paragraph(f"Transactions ({len(report.transactions)})", heading))
        story.append(paragraph("Amounts are positive; the Type column identifies income and expenses. Currency: USD."))
        story.append(Spacer(1, 8))
        story.append(table(["Date", "Merchant", "Category", "Bank", "Type", "Amount"], [
            [r.date.isoformat(), r.merchant, r.category, r.bank, r.type, money(r.amount)]
            for r in report.transactions
        ], [64, 144, 92, 80, 52, 100], last_right=True))
    elif not styled:
        story.append(paragraph("No transactions recorded", heading))
    doc.build(story, onFirstPage=page, onLaterPages=page)
    return output.getvalue()
