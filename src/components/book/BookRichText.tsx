import clsx from 'clsx';
import type { ThemeMode } from '../../types/book';

interface BookRichTextProps {
  text: string;
  theme: ThemeMode;
  className?: string;
}

interface TextSegment {
  kind: 'text';
  value: string;
}

interface CodeSegment {
  kind: 'code';
  value: string;
  language?: string;
}

type RichTextSegment = TextSegment | CodeSegment;

const FENCED_CODE_PATTERN = /```([a-z0-9+#.-]*)\r?\n([\s\S]*?)```/gi;

function splitRichText(text: string): RichTextSegment[] {
  const segments: RichTextSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(FENCED_CODE_PATTERN)) {
    const index = match.index;
    if (index > cursor) {
      segments.push({ kind: 'text', value: text.slice(cursor, index) });
    }

    segments.push({
      kind: 'code',
      language: match[1] || undefined,
      value: match[2].trimEnd(),
    });
    cursor = index + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({ kind: 'text', value: text.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ kind: 'text', value: text }];
}

export function BookRichText({ text, theme, className }: BookRichTextProps) {
  const segments = splitRichText(text);

  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (segment.kind === 'code') {
          return (
            <pre
              key={`code-${index}`}
              className={clsx(
                'my-2 overflow-x-auto rounded-md border px-3 py-2 text-left font-mono text-[11px] leading-relaxed md:text-xs',
                theme === 'dark'
                  ? 'border-zinc-700 bg-zinc-950/80 text-zinc-100'
                  : 'border-stone-300/80 bg-stone-900 text-stone-100',
              )}
              aria-label={segment.language ? `${segment.language} code example` : 'Code example'}
            >
              <code>{segment.value}</code>
            </pre>
          );
        }

        const value = segment.value.trim();
        return value ? (
          <p key={`text-${index}`} className="whitespace-pre-line">
            {value}
          </p>
        ) : null;
      })}
    </div>
  );
}
