import clsx from 'clsx';
import { useState } from 'react';
import type { DocumentBlock, DocumentTextRun, ThemeMode } from '../../types/book';
import { themeConfig } from '../../config/theme';

const QUESTION_START =
  /^(What|Why|How|When|Where|Who|Which|Can|Could|Does|Do|Is|Are|Will|Would|Should|Explain|Describe|Define|Write|Compare|List|Name|State|Differentiate|Discuss|Outline|Show|Give|Mention|Draw|Convert|Identify|Justify|Illustrate|Apply|Create|Print|Read|Check|Calculate)\b/i;

function flattenRuns(runs: DocumentTextRun[]): string {
  return runs.map((run) => run.text ?? '').join('').trim();
}

/**
 * Numbered / interrogative lines — same serif family as answers (Taking User Input pattern).
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

  if (/^\d+[G]?[.)]\s*\S/i.test(raw) && cleaned.endsWith('?')) return true;
  if (/^\d+[G]?[.)]\s*\S/i.test(raw) && QUESTION_START.test(cleaned)) return true;
  if (cleaned.endsWith('?') && QUESTION_START.test(cleaned)) return true;

  return false;
}

/**
 * One standard body style for all prose (matches Taking User Input):
 * Cormorant serif + normal weight. Ignore Word bold so answers never look “highlighted”.
 */
function Runs({
  runs,
}: {
  runs: DocumentTextRun[];
}) {
  return (
    <>
      {runs.map((run, index) => {
        const text = run.text ?? '';
        if (!text) return null;
        return (
          <span
            key={index}
            className={clsx(run.italic && 'italic', run.underline && 'underline')}
            style={{ fontWeight: 400 }}
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

/** Question line: same serif + weight as answers; slightly larger for scan. */
function questionClassName(): string {
  return 'mt-4 mb-2 font-serif text-[15px] font-normal leading-snug first:mt-0 md:text-base';
}

/** Answer / body line: identical family and weight everywhere. */
function answerClassName(extra?: string): string {
  return clsx('mb-3 font-serif text-[13px] font-normal leading-relaxed last:mb-0 md:text-sm', extra);
}

interface DocumentBlocksProps {
  blocks: DocumentBlock[];
  theme: ThemeMode;
}

/**
 * Document-mode page body — typography aligned to Taking User Input:
 * one serif for Q+A, normal weight, code only inside dark mono blocks.
 */
export function DocumentBlocks({ blocks, theme }: DocumentBlocksProps) {
  const colors = themeConfig[theme];
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  return (
    <>
      <div
        className={clsx(
          'document-blocks mx-auto flex w-full max-w-lg flex-col gap-0',
          'font-serif text-[13px] font-normal leading-relaxed md:text-sm',
        )}
        style={{ fontWeight: 400 }}
      >
        {blocks.map((block, index) => {
          switch (block.type) {
            case 'blank':
              return <div key={index} className="h-3 shrink-0" aria-hidden />;
            case 'heading': {
              const asQuestion = isQuestionText(flattenRuns(block.runs));
              // Questions and short labels both use the same serif/normal body language.
              return (
                <p
                  key={index}
                  className={clsx(
                    asQuestion ? questionClassName() : answerClassName('mt-3 first:mt-0'),
                    alignClass(block.align),
                    colors.text,
                  )}
                  style={{ fontWeight: 400 }}
                >
                  <Runs runs={block.runs} />
                </p>
              );
            }
            case 'paragraph': {
              const asQuestion = isQuestionText(flattenRuns(block.runs));
              return (
                <p
                  key={index}
                  className={clsx(
                    asQuestion ? questionClassName() : answerClassName(block.indent ? 'pl-3' : undefined),
                    'whitespace-pre-line',
                    alignClass(block.align),
                    colors.text,
                  )}
                  style={{ fontWeight: 400 }}
                >
                  <Runs runs={block.runs} />
                </p>
              );
            }
            case 'quote':
              return (
                <blockquote
                  key={index}
                  className={clsx(
                    answerClassName('border-l-2 border-[#C6A43B]/70 pl-3 italic'),
                    colors.muted,
                  )}
                  style={{ fontWeight: 400 }}
                >
                  <Runs runs={block.runs} />
                </blockquote>
              );
            case 'list':
              return block.ordered ? (
                <ol
                  key={index}
                  className={clsx(
                    'mb-3 list-decimal space-y-1.5 pl-5 font-serif font-normal',
                    colors.text,
                  )}
                  style={{ fontWeight: 400 }}
                >
                  {block.items.map((item, itemIndex) => {
                    const asQuestion = isQuestionText(flattenRuns(item.runs));
                    return (
                      <li
                        key={itemIndex}
                        className={clsx(
                          'whitespace-pre-line pl-1 font-serif font-normal',
                          asQuestion && 'text-[15px]',
                        )}
                        style={{ fontWeight: 400 }}
                      >
                        <Runs runs={item.runs} />
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <ul
                  key={index}
                  className={clsx(
                    'mb-3 list-disc space-y-1.5 pl-5 font-serif font-normal',
                    colors.text,
                  )}
                  style={{ fontWeight: 400 }}
                >
                  {block.items.map((item, itemIndex) => {
                    const asQuestion = isQuestionText(flattenRuns(item.runs));
                    return (
                      <li
                        key={itemIndex}
                        className={clsx(
                          'whitespace-pre-line pl-1 font-serif font-normal',
                          asQuestion && 'text-[15px]',
                        )}
                        style={{ fontWeight: 400 }}
                      >
                        <Runs runs={item.runs} />
                      </li>
                    );
                  })}
                </ul>
              );
            case 'code':
              return (
                <pre
                  key={index}
                  className="mb-3 max-w-full overflow-x-auto rounded-md bg-stone-900/90 p-3 font-mono text-[11px] font-normal leading-snug text-stone-100 md:text-xs"
                >
                  <code className="whitespace-pre font-mono font-normal">{block.text}</code>
                </pre>
              );
            case 'table':
              return (
                <div key={index} className="mb-3 max-w-full overflow-x-auto">
                  <table className="w-full min-w-[240px] border-collapse text-left font-serif text-[12px] font-normal">
                    <tbody>
                      {block.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex === 0 ? 'bg-[#C6A43B]/15' : undefined}>
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className={clsx(
                                'border border-stone-300 px-2 py-1.5 align-top font-serif font-normal whitespace-pre-line dark:border-stone-600',
                                colors.text,
                              )}
                              style={{ fontWeight: 400 }}
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
                    <figcaption
                      className={clsx('mt-1 text-center font-serif text-[11px] font-normal', colors.muted)}
                      style={{ fontWeight: 400 }}
                    >
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
