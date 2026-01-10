import re
from html import unescape

def count_words(html: str) -> int:
    """
    Convert HTML to plain text and count words.
    Used for scene, chapter, and book wordcounts.
    """
    if not html:
        return 0

    text = re.sub(r"<[^>]+>", " ", html)
    text = unescape(text)
    words = re.findall(r"\b\w+\b", text)
    return len(words)

def sum_scene_wordcounts(scenes: list) -> int:
    return sum(scene.get("wordcount", 0) for scene in scenes)