#!/usr/bin/env python3
"""Dependency-free static checks for the portfolio's shared UI/theme contract."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
SITE_ROOT = ROOT / "develop-with-raman"
HTML_FILES = sorted(ROOT.rglob("*.html"))
SCRIPT_RE = re.compile(r"<script\b([^>]*)>([\s\S]*?)</script\s*>", re.I)
ID_RE = re.compile(r"\bid\s*=\s*(['\"])(.*?)\1", re.I)
BUTTON_RE = re.compile(r"<button\b([^>]*)>", re.I)
ANCHOR_RE = re.compile(r"<a\b([^>]*)>", re.I)
ATTR_RE = lambda name: re.compile(r"\b" + re.escape(name) + r"\s*=\s*(['\"])(.*?)\1", re.I)
failures = []
checked_inline = 0

def fail(path, message):
    failures.append(f"{path}: {message}")

def attr(tag_attrs, name):
    m = ATTR_RE(name).search(tag_attrs)
    return m.group(2).strip() if m else None

if not HTML_FILES:
    print("No HTML pages found.", file=sys.stderr)
    sys.exit(1)

for page in HTML_FILES:
    source = page.read_text(encoding="utf-8")
    relative = page.relative_to(ROOT).as_posix()
    if source.count('/ui-controls.css?v=20261013') != 1:
        fail(relative, "expected exactly one shared ui-controls.css link")
    if source.count('/theme.js?v=20261013') != 1:
        fail(relative, "expected exactly one shared theme.js script")
    head = source.split("</head>", 1)[0] if "</head>" in source else source
    if "localStorage.getItem('t')" not in head:
        fail(relative, "theme bootstrap must read the shared preference before page styles load")
    elif re.search(r"<link\b[^>]*rel\s*=\s*['\"]stylesheet['\"]", head, re.I) and head.index("localStorage.getItem('t')") > re.search(r"<link\b[^>]*rel\s*=\s*['\"]stylesheet['\"]", head, re.I).start():
        fail(relative, "theme bootstrap appears after a stylesheet and may cause a light/dark flash")

    # Check button types across both static HTML and HTML strings used to render UI.
    missing_types = [m.group(0)[:150] for m in BUTTON_RE.finditer(source) if not re.search(r"(?:^|\s)type\s*=", m.group(1), re.I)]
    if missing_types:
        fail(relative, f"{len(missing_types)} button(s) are missing an explicit type; first: {missing_types[0]}")

    # Do not treat IDs and links inside JavaScript templates as existing static DOM.
    static = SCRIPT_RE.sub("", source)
    static = re.sub(r"<!--[\s\S]*?-->", "", static)
    ids = [m.group(2) for m in ID_RE.finditer(static)]
    duplicates = sorted({item for item in ids if ids.count(item) > 1})
    if duplicates:
        fail(relative, "duplicate static id(s): " + ", ".join(duplicates[:8]))
    id_set = set(ids)
    placeholders = [m.group(0) for m in ANCHOR_RE.finditer(source) if attr(m.group(1), "href") == "#"]
    if placeholders:
        fail(relative, f"{len(placeholders)} placeholder href=\"#\" link(s) remain")
    empty_links = [m.group(0) for m in ANCHOR_RE.finditer(static) if attr(m.group(1), "href") == ""]
    if empty_links:
        fail(relative, f"{len(empty_links)} empty href link(s) remain")
    for m in ANCHOR_RE.finditer(static):
        href = attr(m.group(1), "href")
        if href and href.startswith("#") and len(href) > 1 and href[1:] not in id_set:
            fail(relative, f"broken in-page link #{href[1:]}")
            break
        if attr(m.group(1), "target") == "_blank":
            rel = (attr(m.group(1), "rel") or "").lower().split()
            if not ({"noopener", "noreferrer"} & set(rel)):
                fail(relative, f"external new-tab link needs rel=noopener/noreferrer: {href}")

    # All local stylesheet and script references must resolve from the Pages site root.
    for match in re.finditer(r"<link\b([^>]*)>", source, re.I):
        attrs = match.group(1)
        rel = (attr(attrs, "rel") or "").lower().split()
        href = attr(attrs, "href")
        if "stylesheet" not in rel or not href or not href.startswith("/"):
            continue
        asset_path = href.split("?", 1)[0].lstrip("/")
        if not (SITE_ROOT / asset_path).is_file():
            fail(relative, f"missing local stylesheet asset: {href}")
    for match in re.finditer(r"<script\b([^>]*)>", source, re.I):
        src = attr(match.group(1), "src")
        if src and src.startswith("/"):
            asset_path = src.split("?", 1)[0].lstrip("/")
            if not (SITE_ROOT / asset_path).is_file():
                fail(relative, f"missing local script asset: {src}")

    # The client dashboard must use one shared site-style sign-out control.
    if relative == "develop-with-raman/client-dashboard.html":
        signout_buttons = [m.group(1) for m in BUTTON_RE.finditer(static) if attr(m.group(1), "data-sign-out") is not None]
        if len(signout_buttons) != 1:
            fail(relative, f"expected one shared sign-out control, found {len(signout_buttons)}")
        elif not all(token in signout_buttons[0] for token in ("site-topbar-signout", "top-link")):
            fail(relative, "sign-out control must use the shared site top-bar button styling")
        if "auth-manager.js" in source:
            fail(relative, "client dashboard should not load the unused legacy auth-manager.js")

    # Syntax-check executable inline JavaScript, including generated UI templates.
    for match in SCRIPT_RE.finditer(source):
        attrs, body = match.group(1), match.group(2)
        if attr(attrs, "src") or not body.strip():
            continue
        script_type = (attr(attrs, "type") or "").lower()
        if script_type and script_type not in ("text/javascript", "application/javascript", "module"):
            continue
        command = ["node", "--check", "--input-type=module"] if script_type == "module" else ["node", "--check"]
        result = subprocess.run(command, input=body, text=True, capture_output=True)
        if result.returncode:
            fail(relative, "inline JavaScript syntax error: " + result.stderr.strip().splitlines()[-1])
        checked_inline += 1

print(f"Audited {len(HTML_FILES)} HTML page(s); syntax-checked {checked_inline} inline JavaScript block(s).")
if failures:
    print("UI audit failed:")
    for item in failures:
        print(" - " + item)
    sys.exit(1)
print("Theme parity, explicit button types, static IDs, local links, local assets, and inline script syntax passed.")
