"""PDF extraction tool for the LangGraph agent — parse pitch decks and documents."""

import io
import httpx
import pymupdf

from langchain_core.tools import tool


@tool
def read_pdf(url: str) -> str:
    """Download and extract text from a PDF document at the given URL.
    Use this to read pitch decks, financial reports, term sheets, or any
    PDF a founder shares. Returns the full text content of the PDF."""
    try:
        resp = httpx.get(url, follow_redirects=True, timeout=30)
        resp.raise_for_status()
    except httpx.HTTPError as e:
        return f"Failed to download PDF from {url}: {e}"

    content_type = resp.headers.get("content-type", "")
    if "pdf" not in content_type and not url.lower().endswith(".pdf"):
        return f"URL does not appear to be a PDF (content-type: {content_type})."

    try:
        doc = pymupdf.open(stream=io.BytesIO(resp.content), filetype="pdf")
    except Exception as e:
        return f"Failed to parse PDF: {e}"

    pages = []
    for i, page in enumerate(doc):
        text = page.get_text().strip()
        if text:
            pages.append(f"--- Page {i + 1} ---\n{text}")
    doc.close()

    if not pages:
        return "PDF was parsed but no text content was found (may be image-only)."

    full_text = "\n\n".join(pages)
    # Truncate to avoid blowing up context
    if len(full_text) > 15000:
        full_text = full_text[:15000] + "\n\n[... truncated — PDF too long]"

    return f"# PDF Content ({len(pages)} pages)\nSource: {url}\n\n{full_text}"


PDF_TOOLS = [read_pdf]
