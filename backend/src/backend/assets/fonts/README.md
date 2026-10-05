# PDF report fonts

DejaVu Sans and DejaVu Sans Bold match the supplied reference report. ReportLab embeds the used glyphs in each generated PDF.

The full fonts are included in the Python package and Docker image, so report generation needs neither system fonts nor network access. They support Latin, Greek and Cyrillic text; complete CJK/emoji coverage is not provided.

## Source and license

The unmodified fonts and `LICENSE_DEJAVU` come from the [Matplotlib v3.10.8 font distribution](https://github.com/matplotlib/matplotlib/tree/v3.10.8/lib/matplotlib/mpl-data/fonts/ttf).

Keep the license alongside the fonts when redistributing the backend. The user's reference PDF and personal financial data are not included in this directory.

## Files

- `DejaVuSans.ttf`: regular labels and table text.
- `DejaVuSans-Bold.ttf`: headings and totals.
- `LICENSE_DEJAVU`: redistribution terms.

## Integration and verification

Registration and usage live in [services/report_pdf.py](../../services/report_pdf.py). Paths resolve relative to the backend package, so rendering does not depend on the shell's working directory. Keep both font files and the license together in this directory.

If assets change, rebuild the backend image and check styled and basic PDF output. From `backend/`, run:

```powershell
uv run python -B -m unittest discover -s tests -p test_exports.py -q
```

The export tests parse generated PDFs with the dev-only `pypdf` dependency. Also inspect visual output when changing fonts: extracted text alone cannot confirm spacing, wrapping or glyph appearance.

See the [backend download guide](../../../../README.md#downloads) for report behavior and limits.
