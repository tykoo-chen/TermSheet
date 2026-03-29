"""PDF text extraction via PyMuPDF."""

import io

import pymupdf


MAX_PDF_CHARS = 15000
MAX_PDF_PAGES = 30


def extract_pdf(file_bytes: bytes) -> tuple[str, int]:
    """Extract text from a PDF.

    Returns (text, page_count).
    """
    try:
        doc = pymupdf.open(stream=io.BytesIO(file_bytes), filetype="pdf")
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {e}")

    if len(doc) > MAX_PDF_PAGES:
        doc.close()
        raise ValueError(f"PDF too long ({len(doc)} pages, max {MAX_PDF_PAGES}).")

    pages = []
    for i, page in enumerate(doc):
        text = page.get_text().strip()
        if text:
            pages.append(f"--- Page {i + 1} ---\n{text}")
    page_count = len(doc)
    doc.close()

    if not pages:
        raise ValueError("PDF contains no extractable text (may be image-only).")

    full_text = "\n\n".join(pages)
    if len(full_text) > MAX_PDF_CHARS:
        full_text = full_text[:MAX_PDF_CHARS] + "\n\n[... truncated]"

    return full_text, page_count
