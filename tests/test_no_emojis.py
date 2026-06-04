"""Guard test: the UI and backend must not contain emojis.

This is a project convention (see AGENTS.md). Use inline SVG icons instead.
Documentation files (Markdown) are intentionally excluded.
"""

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Files that must stay emoji-free.
CHECKED_FILES = ["static/index.html", "server.py", "run.sh"]

EMOJI = re.compile(
    "["
    "\U0001F000-\U0001FAFF"   # symbols & pictographs, emoji, etc.
    "\U00002600-\U000027BF"   # misc symbols + dingbats
    "\U00002B00-\U00002BFF"   # misc symbols and arrows
    "\U0001F1E6-\U0001F1FF"   # regional indicators (flags)
    "\U0000FE00-\U0000FE0F"   # variation selectors
    "\U00002300-\U000023FF"   # misc technical (incl. some emoji)
    "]"
)


def test_no_emojis_in_ui_and_backend():
    offenders = {}
    for rel in CHECKED_FILES:
        text = (ROOT / rel).read_text(encoding="utf-8")
        found = sorted(set(EMOJI.findall(text)))
        if found:
            offenders[rel] = found
    assert not offenders, f"emojis found (use SVG icons instead): {offenders}"
