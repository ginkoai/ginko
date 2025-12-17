/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-17
 * @tags: [markdown, renderer, display, read-only]
 * @related: [NodeView.tsx, MarkdownEditor.tsx]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [react, react-syntax-highlighter]
 */
'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** Hide frontmatter by default and show in collapsible toggle */
  collapseFrontmatter?: boolean;
}

/**
 * Parse YAML frontmatter from markdown content
 * Returns { frontmatter: parsed key-value pairs, content: remaining markdown }
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, string> | null;
  content: string;
} {
  if (!content.startsWith('---')) {
    return { frontmatter: null, content };
  }

  const lines = content.split('\n');
  let endIdx = -1;

  // Find closing ---
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIdx = i;
      break;
    }
  }

  if (endIdx === -1) {
    return { frontmatter: null, content };
  }

  // Parse frontmatter lines
  const frontmatter: Record<string, string> = {};
  for (let i = 1; i < endIdx; i++) {
    const line = lines[i];
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      frontmatter[key] = value;
    }
  }

  // Return remaining content after frontmatter
  const remainingContent = lines.slice(endIdx + 1).join('\n').trim();

  return { frontmatter, content: remainingContent };
}

/**
 * Collapsible frontmatter display component
 */
function FrontmatterSection({ frontmatter }: { frontmatter: Record<string, string> }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const entries = Object.entries(frontmatter);
  if (entries.length === 0) return null;

  return (
    <div className="mb-4 border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-xs font-mono text-muted-foreground">
          Metadata ({entries.length} fields)
        </span>
      </button>
      {isExpanded && (
        <div className="p-3 bg-secondary/10 space-y-1">
          {entries.map(([key, value]) => (
            <div key={key} className="flex gap-2 text-xs font-mono">
              <span className="text-muted-foreground min-w-[100px]">{key}:</span>
              <span className="text-foreground/80">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Process inline formatting: bold, italic, inline code, links
 */
function processInlineFormatting(text: string, keyPrefix: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];

  // Combined regex for inline formatting: bold, italic, inline code, links
  // Order matters: bold (**) before italic (*) to avoid conflicts
  const inlineRegex = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))/g;

  let lastIndex = 0;
  let match;
  let matchIndex = 0;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];

    // Bold: **text**
    if (match[1]) {
      parts.push(
        <strong key={`${keyPrefix}-bold-${matchIndex}`} className="font-semibold text-foreground">
          {fullMatch.slice(2, -2)}
        </strong>
      );
    }
    // Italic: *text*
    else if (match[2]) {
      parts.push(
        <em key={`${keyPrefix}-italic-${matchIndex}`} className="italic">
          {fullMatch.slice(1, -1)}
        </em>
      );
    }
    // Inline code: `code`
    else if (match[3]) {
      parts.push(
        <code
          key={`${keyPrefix}-code-${matchIndex}`}
          className="bg-secondary text-foreground px-1 py-0.5 rounded text-sm font-mono"
        >
          {fullMatch.slice(1, -1)}
        </code>
      );
    }
    // Link: [text](url)
    else if (match[4]) {
      const linkMatch = fullMatch.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={`${keyPrefix}-link-${matchIndex}`}
            href={linkMatch[2]}
            className="text-ginko-400 hover:text-ginko-300 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }

    lastIndex = match.index + fullMatch.length;
    matchIndex++;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Parse markdown table into structured data
 */
function parseTable(lines: string[], startIdx: number): { rows: string[][]; endIdx: number } | null {
  const rows: string[][] = [];
  let idx = startIdx;

  while (idx < lines.length) {
    const line = lines[idx].trim();

    // Check if this looks like a table row (starts and ends with |, or has | separators)
    if (!line.includes('|')) {
      break;
    }

    // Skip separator rows (|---|---|)
    if (line.match(/^\|?[\s-:|]+\|?$/)) {
      idx++;
      continue;
    }

    // Parse cells
    const cells = line
      .split('|')
      .map(cell => cell.trim())
      .filter((_, i, arr) => {
        // Remove empty first/last cells from |cell|cell| format
        if (i === 0 && arr[i] === '') return false;
        if (i === arr.length - 1 && arr[i] === '') return false;
        return true;
      });

    if (cells.length > 0) {
      rows.push(cells);
    }
    idx++;
  }

  if (rows.length >= 1) {
    return { rows, endIdx: idx };
  }
  return null;
}

/**
 * Simple markdown renderer for read-only display
 * Supports: headings, lists, code blocks, inline code, bold, italic, links, tables, frontmatter
 */
export function MarkdownRenderer({ content, className, collapseFrontmatter = true }: MarkdownRendererProps) {
  if (!content) return null;

  // Parse frontmatter if present
  const { frontmatter, content: markdownContent } = parseFrontmatter(content);

  const lines = markdownContent.split('\n');
  const elements: JSX.Element[] = [];
  let codeBlock = false;
  let codeLanguage = '';
  let codeLines: string[] = [];
  let listItems: JSX.Element[] = [];
  let inList = false;
  let lineIdx = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2 ml-4">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  while (lineIdx < lines.length) {
    const line = lines[lineIdx];
    const idx = lineIdx;

    // Code blocks
    if (line.startsWith('```')) {
      if (!codeBlock) {
        codeBlock = true;
        codeLanguage = line.slice(3).trim() || 'text';
        codeLines = [];
        flushList();
        inList = false;
      } else {
        codeBlock = false;
        elements.push(
          <div key={`code-${idx}`} className="my-4">
            <SyntaxHighlighter
              language={codeLanguage}
              style={vscDarkPlus}
              customStyle={{ borderRadius: '0.5rem', fontSize: '0.875rem' }}
            >
              {codeLines.join('\n')}
            </SyntaxHighlighter>
          </div>
        );
      }
      lineIdx++;
      continue;
    }

    if (codeBlock) {
      codeLines.push(line);
      lineIdx++;
      continue;
    }

    // Table detection (line contains | and next line is separator or also contains |)
    if (line.includes('|') && !line.startsWith('```')) {
      const tableResult = parseTable(lines, lineIdx);
      if (tableResult && tableResult.rows.length >= 1) {
        flushList();
        inList = false;

        const [headerRow, ...bodyRows] = tableResult.rows;

        elements.push(
          <div key={`table-${idx}`} className="my-4 overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {headerRow.map((cell, cellIdx) => (
                    <th
                      key={cellIdx}
                      className="px-3 py-2 text-left font-semibold text-foreground bg-secondary/50"
                    >
                      {processInlineFormatting(cell, `th-${idx}-${cellIdx}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-border/50 hover:bg-secondary/20">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-3 py-2 text-foreground/90">
                        {processInlineFormatting(cell, `td-${idx}-${rowIdx}-${cellIdx}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

        lineIdx = tableResult.endIdx;
        continue;
      }
    }

    // Headings
    if (line.startsWith('#### ')) {
      flushList();
      inList = false;
      elements.push(
        <h4 key={idx} className="text-base font-semibold font-mono mt-4 mb-2 text-foreground">
          {processInlineFormatting(line.slice(5), `h4-${idx}`)}
        </h4>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      inList = false;
      elements.push(
        <h3 key={idx} className="text-lg font-semibold font-mono mt-4 mb-2 text-foreground">
          {processInlineFormatting(line.slice(4), `h3-${idx}`)}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      inList = false;
      elements.push(
        <h2 key={idx} className="text-xl font-semibold font-mono mt-6 mb-3 text-foreground">
          {processInlineFormatting(line.slice(3), `h2-${idx}`)}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      flushList();
      inList = false;
      elements.push(
        <h1 key={idx} className="text-2xl font-bold font-mono mt-6 mb-4 text-foreground">
          {processInlineFormatting(line.slice(2), `h1-${idx}`)}
        </h1>
      );
    }
    // Numbered lists
    else if (line.match(/^\d+\.\s/)) {
      if (!inList) {
        flushList();
        inList = true;
      }
      listItems.push(
        <li key={idx} className="text-sm text-foreground/90">
          {processInlineFormatting(line.replace(/^\d+\.\s/, ''), `li-${idx}`)}
        </li>
      );
    }
    // Bullet lists
    else if (line.match(/^[-*]\s/)) {
      if (!inList) {
        flushList();
        inList = true;
      }
      listItems.push(
        <li key={idx} className="text-sm text-foreground/90">
          {processInlineFormatting(line.slice(2), `li-${idx}`)}
        </li>
      );
    }
    // Empty line
    else if (line.trim() === '') {
      if (inList) {
        flushList();
        inList = false;
      }
      elements.push(<div key={idx} className="h-2" />);
    }
    // Regular paragraph (with inline formatting)
    else {
      if (inList) {
        flushList();
        inList = false;
      }
      elements.push(
        <p key={idx} className="text-sm leading-relaxed my-2 text-foreground/90">
          {processInlineFormatting(line, `p-${idx}`)}
        </p>
      );
    }

    lineIdx++;
  }

  // Flush any remaining list
  flushList();

  return (
    <div className={className}>
      {/* Collapsible frontmatter section */}
      {frontmatter && collapseFrontmatter && (
        <FrontmatterSection frontmatter={frontmatter} />
      )}
      {/* Main markdown content */}
      {elements}
    </div>
  );
}

export default MarkdownRenderer;
