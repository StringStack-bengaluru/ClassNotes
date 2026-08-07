/**
 * Convert chapter .docx files in public/chapters into .content.json
 * (Q&A list used by the reader — 2 questions per page).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CHAPTERS_DIR = path.join(ROOT, 'public', 'chapters');

const EXTRACT_PY = `
import zipfile, xml.etree.ElementTree as ET, json, re, sys
path = sys.argv[1]
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
with zipfile.ZipFile(path) as z:
    root = ET.fromstring(z.read("word/document.xml"))
paras = []
for p in root.iter(W + "p"):
    texts = [t.text or "" for t in p.iter(W + "t")]
    line = "".join(texts).strip()
    if line:
        paras.append(line)

def is_junk(s):
    # Do NOT drop bare numbers — answers like "65" / "66" are real content.
    if re.search(r"BTM Layout|Bengaluru|560076|8050749191", s, re.I):
        return True
    if re.match(r"^StringStack\\.ai", s, re.I):
        return True
    if re.fullmatch(r"Introduction to Java", s, re.I):
        return True
    # Meta footer sometimes pasted into Q&A docs
    if re.search(r"based only on the technical concepts discussed in the transcript", s, re.I):
        return True
    return False

clean = [p for p in paras if not is_junk(p)]

def strip_answer_label(s):
    """Word often puts 'Question? Answer:' on one line — peel the label off."""
    return re.sub(r"\\s*Answer\\s*:?\\s*$", "", s, flags=re.I).strip()

def normalize_q(s):
    s = re.sub(r"^\\d*G\\.\\s*", "", s)
    s = re.sub(r"^\\d+\\.\\s*", "", s)
    s = strip_answer_label(s)
    return s.strip()

QUESTION_START = (
    r"^(What|Why|How|When|Where|Who|Which|Can|Could|Does|Do|Is|Are|Will|"
    r"Would|Should|Explain|Describe|Define|Write|Compare|List|Name|State|"
    r"Differentiate|Discuss|Outline|Show|Give|Mention|Draw|Convert|"
    r"Identify|Justify|Illustrate)\\b"
)

def is_question(s):
    s2 = normalize_q(s)
    if s2.endswith("?"):
        return True
    # Numbered lines (e.g. "27. When ...") can be questions without "?".
    # Do NOT treat bare "When/What ..." answer bodies as questions.
    if re.match(r"^\\d+[G]?\\.\\s*", s):
        return bool(re.match(QUESTION_START, s2, re.I))
    # 'What is X? Answer:' (label on same line) — already stripped above.
    if re.match(QUESTION_START, s2, re.I) and "?" in s:
        return True
    return False

def expand_glued_qa(line):
    """
    Word often glues Q+A in one paragraph with no break, e.g.:
      1. Explain ... format.The char data type is used...
      2. Why ... memory?A computer stores...
    Split once on '.'/'?' immediately followed by a capital letter.
    """
    if not re.match(r"^\\d+[G]?\\.\\s+", line):
        return [line]
    if not re.match(QUESTION_START, normalize_q(line), re.I):
        return [line]
    match = re.search(r"[.?](?=[A-Z])", line)
    if not match:
        return [line]
    left = line[: match.end()].strip()
    right = line[match.end() :].strip()
    if len(normalize_q(left)) < 20 or len(right) < 10:
        return [line]
    return [left, right]

expanded = []
for para in clean:
    expanded.extend(expand_glued_qa(para))
clean = expanded

def is_code_line(s):
    line = s.strip()
    if not line:
        return False
    # Brace-only lines, including spaced closers like "} }" from Word
    if re.fullmatch(r"[{}\\s;]+", line) and re.search(r"[{}]", line):
        return True
    if re.match(r"^(//|/\\*|\\*|@\\w+)", line):
        return True
    if re.match(
        r"^(package|import|class|interface|enum|record|public|protected|private|static|final|"
        r"abstract|return|throw|try|catch|finally|if|else|for|while|do|switch|case|default|"
        r"break|continue|new|System\\.|boolean\\s+\\w+|byte\\s+\\w+|short\\s+\\w+|"
        r"int\\s+\\w+|long\\s+\\w+|float\\s+\\w+|double\\s+\\w+|char\\s+\\w+|"
        r"String\\s+\\w+|var\\s+\\w+)",
        line,
    ):
        return True
    return line.endswith(";") and bool(re.search(r"[=()?:]|\\+\\+|--", line))

def format_answer(chunks):
    sections = []
    prose = []
    code = []

    def flush_prose():
        if prose:
            sections.append(" ".join(prose))
            prose.clear()

    def flush_code():
        if code:
            sections.append("\`\`\`java\\n" + "\\n".join(code) + "\\n\`\`\`")
            code.clear()

    for chunk in chunks:
        line = chunk.strip()
        if not line or re.fullmatch(r"Answer\\s*:?", line, re.I):
            continue
        if is_code_line(line):
            flush_prose()
            code.append(line)
        else:
            flush_code()
            prose.append(re.sub(r"\\s+", " ", line))

    flush_prose()
    flush_code()
    body = "\\n\\n".join(sections).replace("Network Without", "Network. Without")
    return f"Answer: {body}" if body else ""

items = []
i = 0
while i < len(clean):
    line = clean[i]
    if is_question(line):
        q = normalize_q(line)
        ans = []
        i += 1
        while i < len(clean) and not is_question(clean[i]):
            ans.append(clean[i])
            i += 1
        answer = format_answer(ans)
        if answer:
            items.append({"question": q, "answer": answer})
    else:
        i += 1

print(json.dumps(items, ensure_ascii=True))
`;

function runPython(script, docxPath) {
  const bins = process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];
  let lastError;
  for (const bin of bins) {
    try {
      return execFileSync(bin, ['-c', script, docxPath], {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
      });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('Python is required to convert .docx chapters');
}

export function extractDocxItems(docxPath) {
  return JSON.parse(runPython(EXTRACT_PY, docxPath));
}

export function convertDocxChapters() {
  if (!fs.existsSync(CHAPTERS_DIR)) return [];

  const converted = [];
  const files = fs.readdirSync(CHAPTERS_DIR).filter((f) => f.toLowerCase().endsWith('.docx'));

  for (const filename of files) {
    const docxPath = path.join(CHAPTERS_DIR, filename);
    const base = filename.replace(/\.docx$/i, '');
    const outPath = path.join(CHAPTERS_DIR, `${base}.content.json`);

    let items;
    try {
      items = extractDocxItems(docxPath);
    } catch (err) {
      console.warn(`Skipping docx convert for ${filename}:`, err instanceof Error ? err.message : err);
      continue;
    }

    if (!Array.isArray(items) || items.length === 0) {
      console.warn(`No Q&A items found in ${filename}`);
      continue;
    }

    const title = base
      .replace(/^\d+[-_.\s]+/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const payload = {
      title,
      itemsPerPage: 2,
      source: filename,
      items,
    };

    const next = `${JSON.stringify(payload, null, 2)}\n`;
    const prev = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
    if (prev === next) continue;

    fs.writeFileSync(outPath, next, 'utf8');
    converted.push({ filename, outPath, count: items.length });
  }

  return converted;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const converted = convertDocxChapters();
  console.log(`Converted ${converted.length} docx chapter(s)`);
  for (const item of converted) {
    console.log(`  ${item.filename} → ${path.basename(item.outPath)} (${item.count} Q&As)`);
  }
}
