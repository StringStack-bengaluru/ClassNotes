import clsx from 'clsx';
import { useState } from 'react';
import type { DocumentBlock, DocumentTextRun, ThemeMode } from '../../types/book';
import { themeConfig } from '../../config/theme';

const QUESTION_START =
  /^(What|Why|How|When|Where|Who|Which|Can|Could|Does|Do|Is|Are|Will|Would|Should|Explain|Describe|Define|Write|Compare|List|Name|State|Differentiate|Discuss|Outline|Show|Give|Mention|Draw|Convert|Identify|Justify|Illustrate)\b/i;

function flattenRuns(runs: DocumentTextRun[]): string {
  return runs.map((run) => run.text ?? '').join('').trim();
}

/**
 * Numbered / interrogative lines must always look like questions (bold + clear).
 * Matches: "1. What is…?", "2) Why…?", "What is a method in Java?"
 */
function isQuestionText(text: string): boolean {
  const raw = text.replace(/\s+/g, ' ').trim();
  if (!raw) return false;

  const cleaned = raw
    .replace(/^\d+[G]?[.)]\s*/i, '')
    .replace(/^G\.\s*/i, '')
    .replace(/\s*Answer\s*:?\s*$/i, '')
    .trim();
  if (!cleaned) return false;

  // Any numbered item that ends with ? (standard Q&A notes)
  if (/^\d+[G]?[.)]\s*\S/i.test(raw) && cleaned.endsWith('?')) return true;

  // Numbered + question-word stem (even if Word dropped the "?")
  if (/^\d+[G]?[.)]\s*\S/i.test(raw) && QUESTION_START.test(cleaned)) return true;

  // Unnumbered interrogative
  if (cleaned.endsWith('?') && QUESTION_START.test(cleaned)) return true;

  return false;
}

function Runs({
  runs,
  forceBold = false,
  forceNormal = false,
}: {
  runs: DocumentTextRun[];
  forceBold?: boolean;
  /** Ignore Word bold — keep answer body at one standard weight. */
  forceNormal?: boolean;
}) {
  return (
    <>
      {runs.map((run, index) => {
        const text = run.text ?? '';
        if (!text) return null;
        const bold = forceNormal ? false : forceBold || Boolean(run.bold);
        return (
          <span
            key={index}
            className={clsx(run.italic && 'italic', run.underline && 'underline')}
            style={bold ? { fontWeight: 700 } : { fontWeight: 400 }}
          >
            {text}
          </span>
        );
      })}
    </>
  );
}

function alignClass(align?: string): string {
  switch (align) {
    case 'center':
      return 'text-center';
    case 'right':
      return 'text-right';
    case 'both':
    case 'justify':
      return 'text-justify';
    default:
      return 'text-left';
  }
}

/** Shared look: every question is bold, slightly larger, clearly separated from answers. */
function questionClassName(): string {
  return 'mt-4 mb-2 font-serif text-[15px] leading-snug first:mt-0 md:text-base';
}

interface DocumentBlocksProps {
  blocks: DocumentBlock[];
  theme: ThemeMode;
}

/**
 * Renders structured DOCX blocks with preserved paragraph breaks (never joins lines).
 */
export function DocumentBlocks({ blocks, theme }: DocumentBlocksProps) {
  const colors = themeConfig[theme];
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  return (
    <>
      <div className="document-blocks mx-auto flex w-full max-w-lg flex-col gap-0 text-[13px] leading-relaxed md:text-sm">
        {blocks.map((block, index) => {
          switch (block.type) {
            case 'blank':
              return <div key={index} className="h-3 shrink-0" aria-hidden />;
            case 'heading': {
              const asQuestion = isQuestionText(flattenRuns(block.runs));
              if (asQuestion) {
                return (
                  <p
                    key={index}
                    className={clsx(questionClassName(), alignClass(block.align), colors.text)}
                    style={{ fontWeight: 700 }}
                  >
                    <Runs runs={block.runs} forceBold />
                  </p>
                );
              }
              const Tag = (`h${Math.min(4, Math.max(1, block.level))}` as 'h1' | 'h2' | 'h3' | 'h4');
              return (
                <Tag
                  key={index}
                  className={clsx(
                    'mt-3 mb-1.5 font-serif leading-snug first:mt-0',
                    block.level <= 1 && 'text-lg md:text-xl',
                    block.level === 2 && 'text-base md:text-lg',
                    block.level >= 3 && 'text-sm md:text-base',
                    alignClass(block.align),
                    colors.text,
                  )}
                  style={{ fontWeight: 700 }}
                >
                  <Runs runs={block.runs} forceBold />
                </Tag>
              );
            }
            case 'paragraph': {
              const asQuestion = isQuestionText(flattenRuns(block.runs));
              if (asQuestion) {
                return (
                  <p
                    key={index}
                    className={clsx(questionClassName(), alignClass(block.align), colors.text)}
                    style={{ fontWeight: 700 }}
                  >
                    <Runs runs={block.runs} forceBold />
                  </p>
                );
              }
              return (
                <p
                  key={index}
                  className={clsx(
                    'mb-3 whitespace-pre-line font-normal last:mb-0',
                    block.indent && 'pl-3',
                    alignClass(block.align),
                    colors.text,
                  )}
                  style={{ fontWeight: 400 }}
                >
                  <Runs runs={block.runs} forceNormal />
                </p>
              );
            }
            case 'quote':
              return (
                <blockquote
                  key={index}
                  className={clsx(
                    'mb-3 border-l-2 border-[#C6A43B]/70 pl-3 italic whitespace-pre-line font-normal',
                    colors.muted,
                  )}
                  style={{ fontWeight: 400 }}
                >
                  <Runs runs={block.runs} forceNormal />
                </blockquote>
              );
            case 'list':
              return block.ordered ? (
                <ol
                  key={index}
                  className={clsx('mb-3 list-decimal space-y-1.5 pl-5 font-normal', colors.text)}
                >
                  {block.items.map((item, itemIndex) => {
                    const asQuestion = isQuestionText(flattenRuns(item.runs));
                    return (
                      <li
                        key={itemIndex}
                        className={clsx(
                          'whitespace-pre-line pl-1',
                          asQuestion && 'font-serif text-[15px]',
                        )}
                        style={{ fontWeight: asQuestion ? 700 : 400 }}
                      >
                        <Runs runs={item.runs} forceBold={asQuestion} forceNormal={!asQuestion} />
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <ul
                  key={index}
                  className={clsx('mb-3 list-disc space-y-1.5 pl-5 font-normal', colors.text)}
                >
                  {block.items.map((item, itemIndex) => {
                    const asQuestion = isQuestionText(flattenRuns(item.runs));
                    return (
                      <li
                        key={itemIndex}
                        className={clsx(
                          'whitespace-pre-line pl-1',
                          asQuestion && 'font-serif text-[15px]',
                        )}
                        style={{ fontWeight: asQuestion ? 700 : 400 }}
                      >
                        <Runs runs={item.runs} forceBold={asQuestion} forceNormal={!asQuestion} />
                      </li>
                    );
                  })}
                </ul>
              );
            case 'code':
              return (
                <pre
                  key={index}
                  className="mb-3 max-w-full overflow-x-auto rounded-md bg-stone-900/90 p-3 font-mono text-[11px] leading-snug text-stone-100 md:text-xs"
                >
                  <code className="whitespace-pre">{block.text}</code>
                </pre>
              );
            case 'table':
              return (
                <div key={index} className="mb-3 max-w-full overflow-x-auto">
                  <table className="w-full min-w-[240px] border-collapse text-left text-[12px]">
                    <tbody>
                      {block.rows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={rowIndex === 0 ? 'bg-[#C6A43B]/15 font-semibold' : undefined}
                        >
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className={clsx(
                                'border border-stone-300 px-2 py-1.5 whitespace-pre-line align-top dark:border-stone-600',
                                colors.text,
                              )}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            case 'image':
              return (
                <figure key={index} className="mb-3">
                  <button
                    type="button"
                    className="block w-full cursor-zoom-in border-0 bg-transparent p-0"
                    onClick={() => setZoomSrc(block.src)}
                  >
                    <img
                      src={block.src}
                      alt={block.alt || ''}
                      className="mx-auto max-h-56 max-w-full object-contain"
                    />
                  </button>
                  {block.alt ? (
                    <figcaption className={clsx('mt-1 text-center text-[11px]', colors.muted)}>
                      {block.alt}
                    </figcaption>
                  ) : null}
                </figure>
              );
            default: {
              const _exhaustive: never = block;
              return _exhaustive;
            }
          }
        })}
      </div>

      {zoomSrc ? (
        <button
          type="button"
          className="fixed inset-0 z-[80] flex cursor-zoom-out items-center justify-center bg-black/80 p-6"
          onClick={() => setZoomSrc(null)}
          aria-label="Close image"
        >
          <img src={zoomSrc} alt="" className="max-h-full max-w-full object-contain" />
        </button>
      ) : null}
    </>
  );
}
