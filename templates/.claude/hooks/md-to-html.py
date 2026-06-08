#!/usr/bin/env python3
"""
ai-founder-workflow — jumeau HTML automatique des livrables Markdown.

Hook PostToolUse (matcher Write|Edit) : chaque fois qu'une session écrit un
fichier `*.md` qui est un *livrable* du workflow (SPEC, TICKET, PLAN, research,
content, reports…), on régénère à côté un `<fichier>.html` au contenu identique,
avec un thème sombre responsive (mobile-first) cohérent avec la landing/`/status`.

Doctrine du kit : garde-fou DÉTERMINISTE (cf. preflight-guard.py, test-gate.sh)
— pas de consigne « pense à faire » dépendante du LLM. Fiable, 0 token, jamais
oublié, style cohérent, « même contenu » garanti.

Contrat hook : lit le JSON PostToolUse sur stdin (`tool_input.file_path`).
Ne bloque JAMAIS l'écriture (toujours exit 0). Zéro dépendance externe (stdlib).

Scope : n'agit que dans un repo où le workflow est installé (présence d'un
`docs/WORKFLOW.md` en remontant depuis le fichier) — ainsi le hook est sûr
même installé en GLOBAL (~/.claude/) : aucun jumeau dans les repos non-workflow.

Denylist (pas de jumeau) : CLAUDE.md, README.md (déjà jumelé à la main),
MEMORY.md, AGENTS.md, CONTRIBUTING.md, LICENSE*, et tout chemin sous
`.cc-scratch/`, `.claude/`, `.git/`, `node_modules/`, `memory/`, `dist/`,
`build/`, `.next/`, `vendor/`.
"""
from __future__ import annotations

import html
import json
import os
import re
import sys

# ─────────────────────────────────────────────────────────────────────────
# Portée : quels Markdown obtiennent un jumeau HTML
# ─────────────────────────────────────────────────────────────────────────
DENY_BASENAMES = {
    "claude.md", "readme.md", "memory.md", "agents.md",
    "contributing.md", "license.md", "license", "changelog.md",
    "claude.local.md",
}
DENY_DIR_SEGMENTS = {
    ".cc-scratch", ".claude", ".git", "node_modules", "memory",
    "dist", "build", ".next", "vendor", "__pycache__", ".venv",
}


def should_skip(path: str) -> bool:
    base = os.path.basename(path).lower()
    if not base.endswith(".md"):
        return True
    if base in DENY_BASENAMES:
        return True
    parts = {p.lower() for p in path.replace("\\", "/").split("/")}
    return bool(parts & DENY_DIR_SEGMENTS)


def in_workflow_repo(path: str) -> bool:
    """True ssi un `docs/WORKFLOW.md` existe en remontant depuis `path`.

    Scope le hook aux repos où le workflow est installé — pour qu'il soit
    sûr en hook GLOBAL (~/.claude/) : aucun jumeau généré dans les repos
    non-workflow. Remontée d'arborescence (pas de subprocess git).
    """
    d = os.path.dirname(os.path.abspath(path))
    prev = None
    while d and d != prev:
        if os.path.isfile(os.path.join(d, "docs", "WORKFLOW.md")):
            return True
        prev, d = d, os.path.dirname(d)
    return False


# ─────────────────────────────────────────────────────────────────────────
# Conversion Markdown → HTML (sous-ensemble GFM, suffisant pour les livrables)
# ─────────────────────────────────────────────────────────────────────────
_SLUGS: dict[str, int] = {}


def slugify(text: str) -> str:
    s = re.sub(r"<[^>]+>", "", text)          # strip inline tags already rendered
    s = re.sub(r"&[a-z]+;", "", s)            # strip entities
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9\s\-_]", "", s)
    s = re.sub(r"[\s_]+", "-", s).strip("-") or "section"
    n = _SLUGS.get(s, 0)
    _SLUGS[s] = n + 1
    return s if n == 0 else f"{s}-{n}"


def inline(text: str) -> str:
    """Inline formatting: code, images, links, bold, italic, strikethrough."""
    spans: list[str] = []

    def stash(m: re.Match) -> str:
        spans.append(html.escape(m.group(1)))
        return f"\x00C{len(spans) - 1}\x00"

    # 1. Protéger les code spans (leur contenu n'est pas re-formaté).
    text = re.sub(r"`([^`]+)`", stash, text)
    # 2. Échapper le reste.
    text = html.escape(text, quote=False)
    # 3. Images puis liens (l'URL est échappée pour l'attribut).
    text = re.sub(
        r"!\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)",
        lambda m: f'<img src="{html.escape(m.group(2), quote=True)}" '
                  f'alt="{html.escape(m.group(1), quote=True)}" loading="lazy">',
        text,
    )
    text = re.sub(
        r"\[([^\]]+)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)",
        lambda m: f'<a href="{html.escape(m.group(2), quote=True)}">{m.group(1)}</a>',
        text,
    )
    # 4. Emphase.
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"__(.+?)__", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", text)
    text = re.sub(r"(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?![\w_])", r"<em>\1</em>", text)
    text = re.sub(r"~~(.+?)~~", r"<del>\1</del>", text)
    # 5. Restaurer les code spans.
    text = re.sub(r"\x00C(\d+)\x00", lambda m: f"<code>{spans[int(m.group(1))]}</code>", text)
    return text


LIST_RE = re.compile(r"^(\s*)([-*+]|\d+[.)])\s+(.*)$")
TASK_RE = re.compile(r"^\[([ xX])\]\s+(.*)$")


def render_list(lines: list[str], start: int, base_indent: int, toc: list) -> tuple[str, int]:
    """Rendu d'une liste (et de ses sous-listes par indentation). Retourne (html, next_index)."""
    m0 = LIST_RE.match(lines[start])
    ordered = bool(re.match(r"\d+[.)]", m0.group(2)))
    tag = "ol" if ordered else "ul"
    out = [f"<{tag}>"]
    i = start
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            # blank line inside list — peek if list continues
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            if j < len(lines) and LIST_RE.match(lines[j]) and len(LIST_RE.match(lines[j]).group(1)) >= base_indent:
                i = j
                continue
            break
        m = LIST_RE.match(line)
        if not m:
            break
        indent = len(m.group(1))
        if indent < base_indent:
            break
        if indent > base_indent:
            sub, i = render_list(lines, i, indent, toc)
            if out[-1].endswith("</li>"):
                out[-1] = out[-1][:-len("</li>")] + sub + "</li>"
            else:
                out.append(sub)
            continue
        content = m.group(3)
        task = TASK_RE.match(content)
        if task:
            checked = task.group(1).lower() == "x"
            box = ('<input type="checkbox" disabled checked>' if checked
                   else '<input type="checkbox" disabled>')
            cls = ' class="task done"' if checked else ' class="task"'
            out.append(f"<li{cls}>{box}<span>{inline(task.group(2))}</span></li>")
        else:
            out.append(f"<li>{inline(content)}</li>")
        i += 1
    out.append(f"</{tag}>")
    return "".join(out), i


def render_table(lines: list[str], start: int) -> tuple[str, int]:
    def cells(row: str) -> list[str]:
        row = row.strip()
        if row.startswith("|"):
            row = row[1:]
        if row.endswith("|"):
            row = row[:-1]
        return [c.strip() for c in row.split("|")]

    header = cells(lines[start])
    aligns = []
    for spec in cells(lines[start + 1]):
        left, right = spec.startswith(":"), spec.endswith(":")
        aligns.append("center" if left and right else "right" if right else "left" if left else "")
    out = ['<div class="table-wrap"><table><thead><tr>']
    for h, a in zip(header, aligns):
        sty = f' style="text-align:{a}"' if a else ""
        out.append(f"<th{sty}>{inline(h)}</th>")
    out.append("</tr></thead><tbody>")
    i = start + 2
    while i < len(lines) and "|" in lines[i] and lines[i].strip():
        row = cells(lines[i])
        out.append("<tr>")
        for idx, c in enumerate(row):
            a = aligns[idx] if idx < len(aligns) else ""
            sty = f' style="text-align:{a}"' if a else ""
            out.append(f"<td{sty}>{inline(c)}</td>")
        out.append("</tr>")
        i += 1
    out.append("</tbody></table></div>")
    return "".join(out), i


HEADING_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
FENCE_RE = re.compile(r"^(\s*)(```+|~~~+)\s*([\w+-]*)\s*$")
HR_RE = re.compile(r"^\s*([-*_])(\s*\1){2,}\s*$")
TABLE_SEP_RE = re.compile(r"^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$")


def parse_blocks(text: str, toc: list, first_h1: list) -> str:
    lines = text.split("\n")
    out: list[str] = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        # Code fence
        fence = FENCE_RE.match(line)
        if fence:
            marker, lang = fence.group(2), fence.group(3)
            buf = []
            i += 1
            while i < n and not re.match(rf"^\s*{re.escape(marker[0])}{{{len(marker)},}}\s*$", lines[i]):
                buf.append(lines[i])
                i += 1
            i += 1  # closing fence
            code = html.escape("\n".join(buf))
            cls = f' class="language-{lang}"' if lang else ""
            out.append(f"<pre><code{cls}>{code}</code></pre>")
            continue
        # Heading
        h = HEADING_RE.match(line)
        if h:
            level = len(h.group(1))
            rendered = inline(h.group(2))
            slug = slugify(h.group(2))
            if level == 1 and not first_h1:
                first_h1.append(re.sub(r"<[^>]+>", "", rendered))
            if level in (2, 3):
                toc.append((level, re.sub(r"<[^>]+>", "", rendered), slug))
            out.append(f'<h{level} id="{slug}">{rendered}</h{level}>')
            i += 1
            continue
        # Horizontal rule
        if HR_RE.match(line):
            out.append("<hr>")
            i += 1
            continue
        # Table (header line followed by a separator line)
        if "|" in line and i + 1 < n and TABLE_SEP_RE.match(lines[i + 1]):
            tbl, i = render_table(lines, i)
            out.append(tbl)
            continue
        # Blockquote (one level, inner content reparsed)
        if line.lstrip().startswith(">"):
            buf = []
            while i < n and lines[i].lstrip().startswith(">"):
                buf.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            out.append(f"<blockquote>{parse_blocks(chr(10).join(buf), toc, first_h1)}</blockquote>")
            continue
        # List
        if LIST_RE.match(line):
            lst, i = render_list(lines, i, len(LIST_RE.match(line).group(1)), toc)
            out.append(lst)
            continue
        # Paragraph
        buf = [line]
        i += 1
        while i < n and lines[i].strip() and not (
            HEADING_RE.match(lines[i]) or FENCE_RE.match(lines[i]) or HR_RE.match(lines[i])
            or LIST_RE.match(lines[i]) or lines[i].lstrip().startswith(">")
            or ("|" in lines[i] and i + 1 < n and TABLE_SEP_RE.match(lines[i + 1]))
        ):
            buf.append(lines[i])
            i += 1
        out.append(f"<p>{inline(' '.join(s.strip() for s in buf))}</p>")
    return "\n".join(out)


def split_frontmatter(text: str) -> tuple[list[tuple[str, str]], str]:
    """Extrait un frontmatter YAML simple (clé: valeur) en tête, s'il existe."""
    if not text.startswith("---\n") and not text.startswith("---\r\n"):
        return [], text
    end = re.search(r"\n---\s*\n", text[3:])
    if not end:
        return [], text
    block = text[4:3 + end.start() + 1]
    rest = text[3 + end.end():]
    pairs = []
    for ln in block.split("\n"):
        m = re.match(r"^([A-Za-z0-9_.\- ]+):\s*(.*)$", ln)
        if m:
            pairs.append((m.group(1).strip(), m.group(2).strip().strip("\"'")))
    return pairs, rest


# ─────────────────────────────────────────────────────────────────────────
# Thème HTML (sombre, responsive, offline — palette du kit / README.html)
# ─────────────────────────────────────────────────────────────────────────
CSS = """
:root{
  --bg:#13151A; --bg-2:#171A20; --card:#1B1F27; --card-2:#222732;
  --line:rgba(255,255,255,.09); --line-2:rgba(255,255,255,.16);
  --tx:#E7E9EE; --tx-soft:#9BA2AE; --tx-faint:#69707C;
  --coral:#E0855B; --coral-soft:#EBA989; --code:#5EE0A0; --code-tx:#8FECC0;
  --code-bg:rgba(94,224,160,.10);
  --sans:"IBM Plex Sans",-apple-system,system-ui,Segoe UI,Roboto,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  --maxw:820px;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0; background:var(--bg); color:var(--tx);
  font-family:var(--sans); font-size:16.5px; line-height:1.72;
  -webkit-font-smoothing:antialiased;
  background-image:linear-gradient(var(--line) 1px,transparent 1px),
    linear-gradient(90deg,var(--line) 1px,transparent 1px);
  background-size:48px 48px,48px 48px; background-position:center;
}
body::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;
  background:radial-gradient(80% 45% at 50% -5%,rgba(224,133,91,.14),transparent 60%),
  linear-gradient(180deg,rgba(19,21,26,.45),var(--bg) 28%)}
.wrap{position:relative;z-index:1;max-width:var(--maxw);margin:0 auto;padding:0 24px 120px}
.topbar{display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:12.5px;
  color:var(--tx-soft);padding:18px 0 0;flex-wrap:wrap}
.topbar .g{width:8px;height:8px;border-radius:50%;background:var(--code);flex:none}
.topbar .file{color:var(--tx)}
.topbar .sep{color:var(--tx-faint)}
header.doc{padding:30px 0 6px;border-bottom:1px solid var(--line);margin-bottom:8px;animation:rise .6s ease both}
h1{font-weight:600;font-size:clamp(28px,5vw,44px);line-height:1.08;letter-spacing:-.02em;margin:.2em 0 .35em;color:#F4F6F9}
h2{font-weight:600;font-size:clamp(21px,3vw,28px);letter-spacing:-.01em;margin:1.7em 0 .55em;
  padding-top:.5em;border-top:1px solid var(--line);color:#F1F3F7;line-height:1.2}
h3{font-weight:600;font-size:19px;margin:1.5em 0 .4em;color:#EDEFF3}
h4,h5,h6{font-weight:600;margin:1.3em 0 .4em;color:#E7E9EE}
h2:first-of-type{border-top:none}
p{margin:0 0 1em}
a{color:var(--coral-soft);text-decoration:none;border-bottom:1px solid rgba(224,133,91,.3)}
a:hover{border-bottom-color:var(--coral)}
strong{font-weight:600;color:#F1F3F7}
em{color:var(--tx-soft)}
del{color:var(--tx-faint)}
code{font-family:var(--mono);font-size:.84em;background:var(--card-2);padding:.12em .42em;
  border-radius:5px;border:1px solid var(--line);color:#D7DBE2}
pre{background:var(--bg-2);border:1px solid var(--line);border-left:2px solid var(--code);
  border-radius:10px;padding:15px 17px;overflow-x:auto;margin:0 0 1.2em;line-height:1.55}
pre code{background:none;border:none;padding:0;font-size:13.5px;color:#D7DBE2}
blockquote{margin:0 0 1.2em;padding:.5em 1em;border-left:3px solid var(--coral);
  background:var(--card);border-radius:0 10px 10px 0;color:var(--tx-soft)}
blockquote p:last-child{margin-bottom:0}
ul,ol{margin:0 0 1.1em;padding-left:0}
ol{counter-reset:li;list-style:none}
ul{list-style:none}
li{position:relative;padding-left:26px;margin:0 0 .5em;line-height:1.6}
ul>li::before{content:"";position:absolute;left:5px;top:.62em;width:7px;height:7px;
  border-radius:2px;background:var(--coral);opacity:.75}
ol>li{counter-increment:li}
ol>li::before{content:counter(li);position:absolute;left:0;top:0;font-family:var(--mono);
  font-size:12px;color:var(--coral);background:var(--card-2);border:1px solid var(--line);
  width:19px;height:19px;border-radius:5px;display:flex;align-items:center;justify-content:center}
li.task{padding-left:28px}
li.task::before{display:none}
li.task input{position:absolute;left:2px;top:.28em;width:15px;height:15px;accent-color:var(--code);
  margin:0;border-radius:4px}
li.task.done>span{color:var(--tx-faint);text-decoration:line-through}
li>ul,li>ol{margin:.5em 0 .2em}
hr{border:none;border-top:1px solid var(--line-2);margin:2em 0}
img{max-width:100%;height:auto;border-radius:10px;border:1px solid var(--line);margin:.4em 0}
.table-wrap{overflow-x:auto;margin:0 0 1.3em;border:1px solid var(--line);border-radius:10px}
table{border-collapse:collapse;width:100%;font-size:14.5px}
th,td{padding:9px 14px;border-bottom:1px solid var(--line);text-align:left}
thead th{background:var(--bg-2);color:#F1F3F7;font-weight:600;font-family:var(--mono);
  font-size:12px;letter-spacing:.04em;text-transform:uppercase}
tbody tr:nth-child(even){background:rgba(255,255,255,.02)}
tbody tr:last-child td{border-bottom:none}
.toc{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 20px;margin:0 0 2em}
.toc .th{font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;
  color:var(--coral);margin:0 0 10px}
.toc ul{margin:0;padding:0}
.toc li{padding-left:0;margin:0 0 .35em}
.toc li::before{display:none}
.toc li.l3{padding-left:16px;font-size:14px}
.toc a{color:var(--tx-soft);border:none}
.toc a:hover{color:var(--coral-soft)}
.meta{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 18px;margin:0 0 1.6em}
.meta dl{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:0}
.meta dt{font-family:var(--mono);font-size:12px;color:var(--coral);text-transform:uppercase;letter-spacing:.04em}
.meta dd{margin:0;color:var(--tx)}
footer.gen{margin-top:48px;padding-top:18px;border-top:1px solid var(--line);
  font-family:var(--mono);font-size:11.5px;color:var(--tx-faint);line-height:1.6}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (max-width:640px){
  body{font-size:16px}
  .wrap{padding:0 16px 90px}
  pre{font-size:12.5px}
  .meta dl{grid-template-columns:1fr;gap:2px 0}
  .meta dt{margin-top:6px}
}
@media print{
  body{background:#fff;color:#111}
  body::before{display:none}
  a{color:#111}
}
"""

PAGE = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="ai-founder-workflow / md-to-html">
<title>__TITLE__</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>__CSS__</style>
</head>
<body>
<div class="wrap">
<div class="topbar"><span class="g"></span><span class="file">__FILE__</span><span class="sep">·</span><span>jumeau HTML auto-généré</span></div>
<header class="doc"><h1>__TITLE__</h1></header>
__META__
__TOC__
<main>
__BODY__
</main>
<footer class="gen">Généré automatiquement par le hook <code>md-to-html.py</code> du workflow ai-founder-workflow — jumeau de <code>__FILE__</code>. Édite le <code>.md</code> source, pas ce fichier (il sera réécrit).</footer>
</div>
</body>
</html>
"""


def build_toc(toc: list) -> str:
    if len(toc) < 3:
        return ""
    items = []
    for level, text, slug in toc:
        cls = ' class="l3"' if level == 3 else ""
        items.append(f'<li{cls}><a href="#{slug}">{html.escape(text)}</a></li>')
    return f'<nav class="toc"><div class="th">Sommaire</div><ul>{"".join(items)}</ul></nav>'


def build_meta(pairs: list) -> str:
    if not pairs:
        return ""
    rows = "".join(
        f"<dt>{html.escape(k)}</dt><dd>{inline(v)}</dd>"
        for k, v in pairs if v and k.strip().lower() not in ("title", "name")
    )
    return f'<div class="meta"><dl>{rows}</dl></div>' if rows else ""


def convert(md_text: str, filename: str) -> str:
    _SLUGS.clear()
    md_text = md_text.replace("\r\n", "\n").replace("\r", "\n").lstrip("﻿")
    frontmatter, body_md = split_frontmatter(md_text)
    toc: list = []
    first_h1: list = []
    body = parse_blocks(body_md, toc, first_h1)
    title = frontmatter and dict(frontmatter).get("title")
    title = title or (first_h1[0] if first_h1 else os.path.splitext(filename)[0])
    # Si le H1 du doc sert déjà de titre, on évite le doublon visuel.
    if first_h1 and body.startswith(f"<h1"):
        body = re.sub(r"^<h1[^>]*>.*?</h1>\s*", "", body, count=1)
    return (PAGE
            .replace("__CSS__", CSS)
            .replace("__BODY__", body)
            .replace("__TOC__", build_toc(toc))
            .replace("__META__", build_meta(frontmatter))
            .replace("__FILE__", html.escape(filename))
            .replace("__TITLE__", html.escape(title)))


# ─────────────────────────────────────────────────────────────────────────
# Entrée hook
# ─────────────────────────────────────────────────────────────────────────
def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0  # rien à faire, ne bloque pas

    tool_input = payload.get("tool_input") or {}
    path = tool_input.get("file_path") or tool_input.get("path") or ""
    if not path or should_skip(path):
        return 0
    if not os.path.isfile(path):
        return 0
    if not in_workflow_repo(path):
        return 0  # hors d'un repo workflow — sûr en hook global

    try:
        with open(path, encoding="utf-8") as f:
            md_text = f.read()
    except (OSError, UnicodeDecodeError):
        return 0

    out_path = os.path.splitext(path)[0] + ".html"
    try:
        html_doc = convert(md_text, os.path.basename(path))
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html_doc)
    except Exception:  # un jumeau raté ne doit jamais casser l'écriture du .md
        return 0

    # Note non bloquante visible dans le transcript.
    print(json.dumps({
        "systemMessage": f"📄 Jumeau HTML régénéré : {os.path.basename(out_path)}"
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
