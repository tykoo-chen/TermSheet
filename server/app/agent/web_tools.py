"""Exa-powered web search and page reading tools for the LangGraph agent."""

from langchain_core.tools import tool
from exa_py import Exa

from app.core.config import get_settings


def _get_exa() -> Exa:
    settings = get_settings()
    return Exa(api_key=settings.exa_api_key)


@tool
def search_web(query: str) -> str:
    """Search the web for real-time information about companies, founders, markets,
    technologies, or any topic relevant to evaluating a startup pitch.
    Returns titles, URLs, and text snippets from the top results."""
    exa = _get_exa()
    results = exa.search(
        query,
        num_results=5,
        contents={"text": {"max_characters": 3000}},
    )
    if not results.results:
        return "No results found."

    parts = []
    for r in results.results:
        title = r.title or "Untitled"
        url = r.url
        text = (r.text or "")[:2000]
        parts.append(f"### {title}\nURL: {url}\n{text}")
    return "\n\n---\n\n".join(parts)


@tool
def read_webpage(url: str) -> str:
    """Fetch and read the full text content of a specific web page.
    Use this when you have a URL and want to read its contents — for example,
    a company website, a news article, or a founder's profile."""
    exa = _get_exa()
    result = exa.get_contents(
        url,
        text={"max_characters": 8000},
        livecrawl="fallback",
    )
    if not result.results:
        return f"Could not retrieve content from {url}."

    page = result.results[0]
    title = page.title or "Untitled"
    text = page.text or "No content available."
    return f"# {title}\nURL: {page.url}\n\n{text}"


WEB_TOOLS = [search_web, read_webpage]
