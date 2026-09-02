/**
 * Convert chapter .docx files into .document.json
 * (structured blocks that preserve paragraphs, breaks, lists, tables, basic inline format).
 *
 * Parallel to docxToContent.mjs (Q&A). Does not modify Q&A output.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CHAPTERS_DIR = path.join(ROOT, 'public', 'chapters');

const EXTRACT_PY = `
import zipfile, xml.etree.ElementTree as ET, json, re, sys, os, base64, hashlib

path = sys.argv[1]
media_dir = sys.argv[2] if len(sys.argv) > 2 else ""
media_url_prefix = sys.argv[3] if len(sys.argv) > 3 else ""

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
RP = "{http://schemas.openxmlformats.org/package/2006/relationships}"

NS = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}

def local(tag):
    return tag.split("}")[-1] if "}" in tag else tag

with zipfile.ZipFile(path) as z:
    root = ET.fromstring(z.read("word/document.xml"))
    rels = {}
    try:
        rel_root = ET.fromstring(z.read("word/_rels/document.xml.rels"))
        for rel in rel_root:
            rid = rel.attrib.get("Id")
            target = rel.attrib.get("Target")
            if rid and target:
                rels[rid] = target.replace("\\\\", "/")
    except KeyError:
        pass

    def extract_image(rid):
        target = rels.get(rid)
        if not target:
            return None
        if target.startswith("/"):
            zip_path = target.lstrip("/")
        else:
            zip_path = "word/" + target
        try:
            data = z.read(zip_path)
        except KeyError:
            return None
        ext = os.path.splitext(zip_path)[1].lower() or ".png"
        if ext not in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"):
            ext = ".png"
        if not media_dir:
            mime = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"
            return {"src": f"data:{mime};base64," + base64.b64encode(data).decode("ascii"), "alt": ""}
        os.makedirs(media_dir, exist_ok=True)
        digest = hashlib.sha1(data).hexdigest()[:12]
        name = f"img-{digest}{ext}"
        out = os.path.join(media_dir, name)
        if not os.path.exists(out):
            with open(out, "wb") as f:
                f.write(data)
        return {"src": media_url_prefix.rstrip("/") + "/" + name, "alt": ""}

    def run_props(rPr):
        bold = italic = underline = False
        mono = False
        if rPr is None:
            return bold, italic, underline, mono
        if rPr.find(W + "b") is not None or rPr.find(W + "bCs") is not None:
            bold = True
        if rPr.find(W + "i") is not None or rPr.find(W + "iCs") is not None:
            italic = True
        u = rPr.find(W + "u")
        if u is not None and u.attrib.get(W + "val", "single") != "none":
            underline = True
        fonts = rPr.find(W + "rFonts")
        if fonts is not None:
            for attr in fonts.attrib.values():
                if re.search(r"consolas|courier|monaco|menlo|source.?code|fira.?code|cascadia", attr or "", re.I):
                    mono = True
                    break
        return bold, italic, underline, mono

    def collect_runs(p):
        runs = []
        def walk(el):
            for child in list(el):
                ctag = local(child.tag)
                if ctag == "r":
                    rPr = child.find(W + "rPr")
                    b, i, u, mono = run_props(rPr)
                    text_parts = []
                    for sub in child:
                        st = local(sub.tag)
                        if st == "t" and sub.text:
                            text_parts.append(sub.text)
                        elif st == "tab":
                            text_parts.append("\\t")
                        elif st == "br":
                            text_parts.append("\\n")
                        elif st == "drawing":
                            blip = None
                            for d in sub.iter():
                                if local(d.tag) == "blip":
                                    blip = d
                                    break
                            if blip is not None:
                                rid = None
                                for k, v in blip.attrib.items():
                                    if k.endswith("}embed") or k == "embed":
                                        rid = v
                                        break
                                img = extract_image(rid) if rid else None
                                if img:
                                    runs.append({"type": "image", **img})
                    if text_parts:
                        runs.append({
                            "text": "".join(text_parts),
                            "bold": b,
                            "italic": i,
                            "underline": u,
                            "mono": mono,
                        })
                elif ctag == "hyperlink":
                    walk(child)
                elif ctag in ("ins", "smartTag", "sdt", "sdtContent"):
                    walk(child)
        walk(p)
        return runs

    def p_style(p):
        pPr = p.find(W + "pPr")
        if pPr is None:
            return "Normal", False, "left", False
        style_el = pPr.find(W + "pStyle")
        style = style_el.attrib.get(W + "val", "Normal") if style_el is not None else "Normal"
        num = pPr.find(W + "numPr") is not None
        jc = pPr.find(W + "jc")
        align = jc.attrib.get(W + "val", "left") if jc is not None else "left"
        ind = pPr.find(W + "ind")
        indented = ind is not None
        return style, num, align, indented

    def is_junk_text(s):
        s = s.strip()
        if not s:
            return False
        # Do NOT drop bare numbers — answers like "65" / "66" are real content.
        if re.search(r"BTM Layout|Bengaluru|560076|8050749191", s, re.I):
            return True
        if re.match(r"^StringStack\\.ai", s, re.I) and len(s) < 40:
            return True
        return False

    def is_code_line(s):
        line = (s or "").replace("\\u00a0", " ").replace("\\xa0", " ").strip()
        # Also normalize real NBSP if present in XML text
        line = line.replace("\u00a0", " ").strip()
        if not line:
            return False
        # Numbered questions are never code: "16. What is the truth table of &&?"
        if re.match(r"^\\d+[G]?[.)]\\s+", line):
            return False
        # Type section labels in notes: float: / double: — not code
        if re.fullmatch(
            r"(?:byte|short|int|long|float|double|boolean|char|void|String):",
            line,
            re.I,
        ):
            return False
        # English answer sentences mis-styled as mono in Word
        if line.endswith(".") and len(line) > 30 and re.search(
            r"\\b(is|are|was|were|can|uses|use|than|more|less|when|because|while|provides|represents|means|allows|since|therefore)\\b",
            line,
            re.I,
        ) and not re.search(r"[{}();]", line):
            return False
        # Sample outputs / short English labels — never code
        # e.g. "Grade B", "Child Ticket", "Invalid Day", "Not divisible"
        if re.fullmatch(r"[A-Za-z][A-Za-z]*(?:\\s+[A-Za-z][A-Za-z]*){1,4}", line) and not re.search(
            r"[(){};=<>.%/+\\-]|\\b(import|class|public|private|return|new|void|int|if|else)\\b",
            line,
        ):
            return False
        if re.fullmatch(r"[(){}\\s;]+", line) and re.search(r"[(){};]", line):
            return True
        if re.match(r"^(//|/\\*|\\*|@\\w+)", line):
            return True
        # Bare operators / operator + label (catalog lists)
        if re.fullmatch(
            r"(?:[+\\-*/%]=?|==|!=|<=|>=|>>>|<<|>>|<|>|&&|\\|\\||!|\\+\\+|--|&|\\||\\^|~)",
            line,
        ):
            return True
        if re.fullmatch(
            r"(?:[+\\-*/%]=?|==|!=|<=|>=|>>>|<<|>>|<|>|&&|\\|\\||!|\\+\\+|--)\\s+[A-Za-z][A-Za-z ]+$",
            line,
        ):
            return True
        # Bare Java type names used as catalogs: byte / short / int / double
        if re.fullmatch(
            r"(?:byte|short|int|long|float|double|boolean|char|void|String)",
            line,
        ):
            return True
        # Teaching catalogs with arrow: float → 23 mantissa bits / 1 bit → Sign
        if re.match(
            r"^(?:(?:\\d+\\s+bits?)|(?:byte|short|int|long|float|double|boolean|char|String))\\s*(?:→|->)\\s*.+$",
            line,
            re.I,
        ):
            return True
        # Short spec lines: 4 bytes / 8 bytes / Lower precision
        if re.fullmatch(r"\\d+\\s+bytes", line, re.I):
            return False
        if re.fullmatch(r"(?:Lower|Higher)\\s+precision", line, re.I):
            return False
        # Short comparison used as an example: a == 10
        if re.fullmatch(r"[A-Za-z_]\\w*\\s*(?:==|!=|<=|>=)\\s*\\d+", line):
            return True
        # Continuation lines inside expressions / println args — not English sentences
        if re.match(r"^[+*/,.]\\s*", line) and not re.search(r"\\bis\\b", line, re.I):
            return True
        if '"' in line and "+" in line:
            return True
        # Field / chained access used as println continuation: bird1.cost
        if re.fullmatch(r"[A-Za-z_]\\w*(?:\\.[A-Za-z_]\\w*)+(?:\\(\\))?", line):
            return True
        # } else {  |  else {  |  else if (...) {
        if re.match(r"^}\\s*else\\b", line) or re.match(r"^else(\\s+if\\b|\\s*\\{|\\s*$)", line):
            return True
        # for-loop increment continuation split onto its own line: divisor++) {
        if re.search(r"(?:\\+\\+|--)", line) and re.search(r"[){};]", line):
            return True
        # Incomplete assignment / logical continuation: FindNumber findNumber =  |  ... &&
        if re.search(r"[=&|]$", line) or line.endswith(("&&", "||")):
            return True
        # Multi-line method / call opening: Page<Order> findByUserId...(
        if re.search(r"[\\w>]\\s*\\(\\s*$", line):
            return True
        # Parameter lines only: Type varName  where var starts lowercase (Java style)
        # Do NOT match "Grade B" / "Child Ticket" (both words capitalized).
        if re.match(
            r"^(?:final\\s+)?(?:[A-Z][\\w.<>,\\[\\]?]*|(?:boolean|byte|short|int|long|float|double|char|var))\\s+[a-z]\\w*\\s*,?\\s*$",
            line,
        ):
            return True
        # Condition / expression fragment: number % 4 == 0) {
        if re.search(r"(%|==|!=|<=|>=|&&|\\|\\|)", line) and re.search(r"[){}]", line):
            return True
        # Method / constructor signatures: void eat() {  |  public void start() {
        if re.match(
            r"^(?:public|private|protected|static|final|synchronized|native|abstract|default|\\s)*"
            r"(?:void|[A-Za-z_][\\w.<>,\\[\\]?]*)\\s+[A-Za-z_]\\w*\\s*\\([^;]*\\)\\s*\\{?\\s*$",
            line,
        ):
            return True
        if re.match(
            r"^(?:public|private|protected|\\s)*[A-Z]\\w*\\s*\\([^;]*\\)\\s*\\{?\\s*$",
            line,
        ):
            return True
        if re.match(
            r"^(package|import|class|interface|enum|record|public|protected|private|static|final|"
            r"abstract|return|throw|try|catch|finally|if|else|for|while|do|switch|case|default|"
            r"break|continue|new|System\\.|Page\\s*<)",
            line,
        ):
            return True
        # Java statements end with ; — teaching placeholders like statement1; too
        if line.endswith(";"):
            return True
        return False

    def code_looks_open(text):
        """True when a code chunk ends mid-expression (not merely inside a class body)."""
        t = (text or "").rstrip()
        if not t:
            return False
        if t.endswith(("(", "+", ",", ".", "=", "&&", "||", "&", "|")):
            return True
        # Split for-header: for (int divisor = 2;  /  divisor * divisor <= number;
        last = t.splitlines()[-1].strip() if t else ""
        if last.endswith(";") and t.count("(") > t.count(")"):
            return True
        # Unbalanced parentheses only — braces stay open for whole classes
        return t.count("(") > t.count(")")

    def is_expression_fragment(s):
        """Short non-prose line that belongs inside an open println / expression."""
        st = (s or "").strip()
        if not st:
            return False
        if is_code_line(st):
            return True
        if st.startswith("+") or st[:1] in (chr(34), chr(39)):
            return True
        # Avoid swallowing real answer sentences
        if st.endswith(".") and " " in st and len(st) > 40:
            return False
        if re.match(r"^\\d+[.)]\\s*", st):
            return False
        # Identifiers / dotted paths / partial expressions
        if re.fullmatch(r"[A-Za-z_][\\w.]*", st):
            return True
        return False

    def stitch_open_code_with_paragraphs(items):
        """Pull expression/string fragments that sit between split code chunks back into code."""
        out = []
        i = 0
        while i < len(items):
            b = items[i]
            if b.get("type") != "code":
                out.append(b)
                i += 1
                continue
            text = b.get("text") or ""
            j = i + 1
            while j < len(items):
                nxt = items[j]
                if nxt.get("type") == "blank" and code_looks_open(text):
                    text += "\\n"
                    j += 1
                    continue
                if nxt.get("type") == "code" and code_looks_open(text):
                    text += "\\n" + (nxt.get("text") or "")
                    j += 1
                    continue
                if nxt.get("type") == "paragraph" and code_looks_open(text):
                    para = "".join((r.get("text") or "") for r in (nxt.get("runs") or []))
                    if is_expression_fragment(para) or text.rstrip().endswith(("+", "=", "&&", "||")):
                        if not (para.strip().endswith(".") and " " in para.strip() and len(para.strip()) > 40):
                            text += "\\n" + para
                            j += 1
                            continue
                break
            out.append({"type": "code", "text": text})
            i = j
        return out

    def peel_sample_output_from_code(items):
        """If a code block starts with sample output then import/class, split the label out."""
        out = []
        for b in items:
            if b.get("type") != "code":
                out.append(b)
                continue
            text = b.get("text") or ""
            lines = text.split("\\n")
            if len(lines) < 2:
                out.append(b)
                continue
            first = lines[0].strip()
            rest = "\\n".join(lines[1:]).lstrip("\\n")
            rest_l = rest.lstrip()
            starts_java = bool(
                re.match(
                    r"^(package|import|class|interface|enum|record|public|private|protected|@)\\b",
                    rest_l,
                )
            )
            first_is_java = bool(
                re.search(r"[;{}()=]|\\b(import|class|public|private|void|return|new)\\b", first)
            )
            if first and starts_java and not first_is_java:
                out.append({
                    "type": "paragraph",
                    "runs": [{
                        "text": lines[0],
                        "bold": False,
                        "italic": False,
                        "underline": False,
                        "mono": False,
                    }],
                    "align": "left",
                    "indent": False,
                })
                out.append({"type": "code", "text": rest})
            else:
                out.append(b)
        return out

    def stitch_code_sandwiched_paragraphs(items):
        """Merge code + code-looking paragraphs + code (e.g. '} else {' between two blocks)."""
        out = []
        i = 0
        while i < len(items):
            b = items[i]
            if b.get("type") != "code":
                out.append(b)
                i += 1
                continue
            text = b.get("text") or ""
            j = i + 1
            while j < len(items):
                nxt = items[j]
                if nxt.get("type") == "blank":
                    k = j
                    while k < len(items) and items[k].get("type") == "blank":
                        k += 1
                    if k >= len(items):
                        break
                    nxt2 = items[k]
                    if nxt2.get("type") == "code":
                        text += "\\n" * (k - j)
                        j = k
                        continue
                    if nxt2.get("type") == "paragraph":
                        para = "".join((r.get("text") or "") for r in (nxt2.get("runs") or []))
                        if is_code_line(para):
                            text += "\\n" * (k - j)
                            j = k
                            continue
                    break
                if nxt.get("type") == "paragraph":
                    para = "".join((r.get("text") or "") for r in (nxt.get("runs") or []))
                    if is_code_line(para):
                        text += "\\n" + para
                        j += 1
                        continue
                    break
                if nxt.get("type") == "code":
                    text += "\\n" + (nxt.get("text") or "")
                    j += 1
                    continue
                break
            out.append({"type": "code", "text": text})
            i = j
        return out

    def is_question_or_title(text):
        t = re.sub(r"\\s+", " ", (text or "")).strip()
        if not t:
            return False
        if re.match(r"^\\d+[G]?[.)]\\s*", t, re.I):
            return True
        if t.endswith("?"):
            return True
        # Short title-like headings (not a full answer sentence)
        if len(t) <= 48 and not t.endswith("."):
            return True
        return False

    def runs_are_mono(runs):
        text_runs = [r for r in runs if r.get("type") != "image"]
        if not text_runs:
            return False
        return all(r.get("mono") for r in text_runs if (r.get("text") or "").strip())

    def heading_level(style):
        m = re.match(r"Heading\\s*(\\d+)", style or "", re.I)
        if m:
            return int(m.group(1))
        if style and style.lower() in ("title",):
            return 1
        if style and style.lower() in ("subtitle",):
            return 2
        return None

    def flatten_run_text(runs):
        parts = []
        for r in runs:
            if r.get("type") == "image":
                continue
            parts.append(r.get("text") or "")
        return "".join(parts)

    def p_is_code_style(style):
        return bool(style and re.search(r"code|source|consolas|courier|plaintext|html.?code", style, re.I))

    blocks = []
    body = root.find(W + "body")
    if body is None:
        body = root

    for child in list(body):
        tag = local(child.tag)
        if tag == "p":
            style, is_list, align, indented = p_style(child)
            runs = collect_runs(child)
            text_runs = [r for r in runs if r.get("type") != "image"]
            images = [r for r in runs if r.get("type") == "image"]
            text = flatten_run_text(text_runs)
            if is_junk_text(text) and not images:
                continue
            if not text.strip() and not images:
                blocks.append({"type": "blank"})
                continue
            for img in images:
                blocks.append({"type": "image", "src": img["src"], "alt": img.get("alt") or ""})
            if not text.strip():
                continue
            level = heading_level(style)
            looks_code = p_is_code_style(style) or is_code_line(text) or runs_are_mono(text_runs)
            if level and not looks_code and is_question_or_title(text):
                blocks.append({
                    "type": "heading",
                    "level": min(max(level, 1), 4),
                    "runs": text_runs,
                    "align": align,
                })
            elif level and not looks_code and not is_question_or_title(text):
                # Word heading style on answer prose → keep as normal paragraph
                blocks.append({
                    "type": "paragraph",
                    "runs": text_runs,
                    "align": align,
                    "indent": bool(indented),
                })
            elif is_list and not looks_code:
                blocks.append({
                    "type": "listItem",
                    "ordered": False,
                    "runs": text_runs,
                    "align": align,
                })
            elif style and "quote" in style.lower() and not looks_code:
                blocks.append({"type": "quote", "runs": text_runs, "align": align})
            elif looks_code:
                blocks.append({"type": "codeLine", "text": text.replace("\\r\\n", "\\n")})
            else:
                blocks.append({
                    "type": "paragraph",
                    "runs": text_runs,
                    "align": align,
                    "indent": bool(indented),
                })
        elif tag == "tbl":
            rows = []
            for tr in child.findall(W + "tr"):
                cells = []
                for tc in tr.findall(W + "tc"):
                    cell_paras = []
                    for p in tc.findall(W + "p"):
                        runs = collect_runs(p)
                        t = flatten_run_text(runs)
                        if t.strip():
                            cell_paras.append(t)
                        elif not cell_paras:
                            cell_paras.append("")
                    cells.append("\\n".join(cell_paras) if cell_paras else "")
                if cells:
                    rows.append(cells)
            if rows:
                blocks.append({"type": "table", "rows": rows})

    # Merge consecutive listItems → list; consecutive codeLine → code block
    merged = []
    i = 0
    while i < len(blocks):
        b = blocks[i]
        if b["type"] == "listItem":
            items = []
            while i < len(blocks) and blocks[i]["type"] == "listItem":
                items.append({"runs": blocks[i]["runs"]})
                i += 1
            merged.append({"type": "list", "ordered": False, "items": items})
        elif b["type"] == "codeLine":
            lines = []
            while i < len(blocks) and blocks[i]["type"] == "codeLine":
                lines.append(blocks[i]["text"])
                i += 1
            while i < len(blocks) and blocks[i]["type"] == "blank":
                j = i + 1
                while j < len(blocks) and blocks[j]["type"] == "blank":
                    j += 1
                if j < len(blocks) and blocks[j]["type"] == "codeLine":
                    while i < j:
                        lines.append("")
                        i += 1
                    while i < len(blocks) and blocks[i]["type"] == "codeLine":
                        lines.append(blocks[i]["text"])
                        i += 1
                else:
                    break
            merged.append({"type": "code", "text": "\\n".join(lines)})
        else:
            merged.append(b)
            i += 1

    def para_text(b):
        return "".join((r.get("text") or "") for r in (b.get("runs") or []))

    def as_list_item_runs(text):
        return {
            "runs": [{
                "text": text,
                "bold": False,
                "italic": False,
                "underline": False,
                "mono": False,
            }],
        }

    def looks_like_bullet_prose(s):
        st = re.sub(r"\\s+", " ", (s or "")).strip()
        if not st or st.endswith(":") or re.match(r"^\\d+[G]?[.)]\\s+", st):
            return False
        if is_code_line(st) or re.search(r"[{};]", st):
            return False
        return 2 <= len(st) <= 90

    def attach_loose_bullets(items):
        """Turn stray prose next to a Word list into list items (Q2 / Q15)."""
        out = []
        i = 0
        while i < len(items):
            b = items[i]
            nxt = items[i + 1] if i + 1 < len(items) else None
            if b.get("type") == "paragraph" and nxt and nxt.get("type") == "list":
                t = para_text(b)
                if looks_like_bullet_prose(t):
                    nxt = dict(nxt)
                    nxt["items"] = [as_list_item_runs(t)] + list(nxt.get("items") or [])
                    out.append(nxt)
                    i += 2
                    continue
            if b.get("type") == "list" and nxt and nxt.get("type") == "paragraph":
                t = para_text(nxt)
                if looks_like_bullet_prose(t):
                    extra = dict(b)
                    extra["items"] = list(b.get("items") or []) + [as_list_item_runs(t)]
                    out.append(extra)
                    i += 2
                    continue
            out.append(b)
            i += 1
        return out

    def demote_misclassified_code(items):
        """Move prose / type labels out of lone code blocks."""
        out = []
        for b in items:
            if b.get("type") != "code":
                out.append(b)
                continue
            text = (b.get("text") or "").strip()
            lines = [ln for ln in text.split("\\n") if ln.strip()]
            if len(lines) != 1:
                out.append(b)
                continue
            line = lines[0].strip()
            demote = False
            if re.fullmatch(
                r"(?:byte|short|int|long|float|double|boolean|char|void|String):",
                line,
                re.I,
            ):
                demote = True
            elif line.endswith(".") and not re.search(r"[{}();=]", line) and re.search(
                r"\\b(is|are|can|uses|use|than|more|less|when|because|while|provides|represents|means|allows|since|therefore)\\b",
                line,
                re.I,
            ):
                demote = True
            if demote:
                out.append({
                    "type": "paragraph",
                    "runs": [{
                        "text": line,
                        "bold": False,
                        "italic": False,
                        "underline": False,
                        "mono": False,
                    }],
                    "align": "left",
                    "indent": False,
                })
            else:
                out.append(b)
        return out

    merged = stitch_open_code_with_paragraphs(merged)
    merged = stitch_code_sandwiched_paragraphs(merged)
    merged = peel_sample_output_from_code(merged)
    merged = demote_misclassified_code(merged)
    merged = attach_loose_bullets(merged)
    print(json.dumps(merged, ensure_ascii=True))
`;

function runPython(script, args) {
  const bins = process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];
  let lastError;
  for (const bin of bins) {
    try {
      return execFileSync(bin, ['-c', script, ...args], {
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
      });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('Python is required to convert .docx documents');
}

export function extractDocxDocumentBlocks(docxPath, options = {}) {
  const base = path.basename(docxPath, path.extname(docxPath));
  const mediaDir = options.mediaDir ?? path.join(CHAPTERS_DIR, 'media', base);
  const mediaUrlPrefix = options.mediaUrlPrefix ?? `/chapters/media/${encodeURIComponent(base)}`;
  const raw = runPython(EXTRACT_PY, [docxPath, mediaDir, mediaUrlPrefix]);
  return JSON.parse(raw);
}

/** Rough units for flip-page pagination (preserves block boundaries). */
function blockUnits(block) {
  switch (block.type) {
    case 'blank':
      return 0.5;
    case 'heading':
      return 2.5;
    case 'paragraph':
    case 'quote': {
      const text = (block.runs || []).map((r) => r.text || '').join('');
      return Math.max(1.5, Math.ceil(text.length / 110) + (text.match(/\n/g) || []).length * 0.5);
    }
    case 'list':
      return Math.max(1.5, (block.items?.length ?? 1) * 1.5);
    case 'code':
      return Math.max(2.5, Math.ceil((block.text || '').split('\n').length * 1.0));
    case 'table':
      return Math.max(3, (block.rows?.length ?? 1) * 1.5);
    case 'image':
      return 6;
    default:
      return 1.5;
  }
}

const QUESTION_START =
  /^(What|Why|How|When|Where|Who|Which|Can|Could|Does|Do|Is|Are|Will|Would|Should|Explain|Describe|Define|Write|Compare|List|Name|State|Differentiate|Discuss|Outline|Show|Give|Mention|Draw|Convert|Identify|Justify|Illustrate)\b/i;

function blockPlainText(block) {
  if (!block) return '';
  if (block.type === 'code') return block.text || '';
  if (block.type === 'list') {
    return (block.items || []).map((item) => (item.runs || []).map((r) => r.text || '').join('')).join(' ');
  }
  return (block.runs || []).map((r) => r.text || '').join('').trim();
}

function isQuestionBlock(block) {
  if (!block || (block.type !== 'heading' && block.type !== 'paragraph')) return false;
  const text = blockPlainText(block);
  const cleaned = text
    .replace(/^\d+[G]?[.)]\s*/i, '')
    .replace(/^G\.\s*/i, '')
    .replace(/\s*Answer\s*:?\s*$/i, '')
    .trim();
  if (!cleaned) return false;
  if (/^\d+[G]?[.)]\s*\S/i.test(text) && (cleaned.endsWith('?') || QUESTION_START.test(cleaned))) {
    return true;
  }
  return cleaned.endsWith('?') && QUESTION_START.test(cleaned);
}

/** Group each question with its following answer blocks until the next question. */
function sectionizeBlocks(blocks) {
  const sections = [];
  let current = [];

  for (const block of blocks) {
    if (isQuestionBlock(block) && current.length > 0) {
      sections.push(current);
      current = [block];
    } else {
      current.push(block);
    }
  }

  if (current.length > 0) sections.push(current);
  return sections;
}

function sectionUnits(section) {
  return section.reduce((sum, block) => sum + blockUnits(block), 0);
}

/**
 * Denser pagination tuned for flip-book pages that can scroll slightly.
 * Keeps each Q + answer together when they fit; avoids orphan questions at page bottoms.
 */
export function paginateDocumentBlocks(blocks, unitsPerPage = 46) {
  const pages = [];
  let current = [];
  let used = 0;
  const sections = sectionizeBlocks(blocks);
  /** If less than this remains, start a new page before the next question section. */
  const minRemainForQuestion = 10;

  const flush = () => {
    if (current.length === 0) return;
    // Drop trailing blanks so pages don't look padded
    while (current.length > 0 && current[current.length - 1].type === 'blank') {
      used -= blockUnits(current[current.length - 1]);
      current.pop();
    }
    if (current.length > 0) pages.push(current);
    current = [];
    used = 0;
  };

  const pushBlocks = (chunk) => {
    for (const block of chunk) {
      const u = blockUnits(block);
      if (current.length > 0 && used + u > unitsPerPage) {
        // Never leave a question heading alone on a page before its code/answer
        const onlyQuestion = current.length === 1 && isQuestionBlock(current[0]);
        if (!onlyQuestion) flush();
      }
      current.push(block);
      used += u;
    }
  };

  for (const section of sections) {
    const total = sectionUnits(section);
    const startsWithQuestion = section.length > 0 && isQuestionBlock(section[0]);

    // Prefer starting a question on a fresh page when remaining space is tiny
    if (
      startsWithQuestion &&
      current.length > 0 &&
      unitsPerPage - used < minRemainForQuestion &&
      total > unitsPerPage - used
    ) {
      flush();
    }

    // Whole section fits on current page
    if (current.length === 0 || used + total <= unitsPerPage) {
      pushBlocks(section);
      continue;
    }

    // Whole section fits on an empty page
    if (total <= unitsPerPage) {
      flush();
      pushBlocks(section);
      continue;
    }

    // Oversized section: keep question + as much answer as fits together first
    flush();
    if (startsWithQuestion && section.length > 1) {
      const question = section[0];
      const rest = section.slice(1);
      current.push(question);
      used = blockUnits(question);
      pushBlocks(rest);
    } else {
      pushBlocks(section);
    }
  }

  flush();
  return pages.length > 0 ? pages : [[]];
}

export function convertDocxDocuments() {
  if (!fs.existsSync(CHAPTERS_DIR)) return [];

  const converted = [];
  const files = fs.readdirSync(CHAPTERS_DIR).filter((f) => f.toLowerCase().endsWith('.docx'));

  for (const filename of files) {
    const docxPath = path.join(CHAPTERS_DIR, filename);
    const base = filename.replace(/\.docx$/i, '');
    const outPath = path.join(CHAPTERS_DIR, `${base}.document.json`);

    let blocks;
    try {
      blocks = extractDocxDocumentBlocks(docxPath);
    } catch (err) {
      console.warn(`Skipping document convert for ${filename}:`, err instanceof Error ? err.message : err);
      continue;
    }

    if (!Array.isArray(blocks) || blocks.length === 0) {
      console.warn(`No document blocks found in ${filename}`);
      continue;
    }

    const pages = paginateDocumentBlocks(blocks);
    const title = base
      .replace(/^\d+[-_.\s]+/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const payload = {
      title,
      mode: 'document',
      source: filename,
      pageCount: pages.length,
      blocks,
      pages,
    };

    const next = `${JSON.stringify(payload, null, 2)}\n`;
    const prev = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
    if (prev === next) continue;

    fs.writeFileSync(outPath, next, 'utf8');
    converted.push({ filename, outPath, blocks: blocks.length, pages: pages.length });
  }

  return converted;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const converted = convertDocxDocuments();
  console.log(`Converted ${converted.length} document chapter(s)`);
  for (const item of converted) {
    console.log(
      `  ${item.filename} → ${path.basename(item.outPath)} (${item.blocks} blocks / ${item.pages} pages)`,
    );
  }
}
