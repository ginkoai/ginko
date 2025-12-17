/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-17
 * @tags: [markdown, renderer, display, read-only]
 * @related: [NodeView.tsx, MarkdownEditor.tsx]
 * @priority: medium
 * @complexity: low
 * @dependencies: [react, react-syntax-highlighter]
 */
'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Simple markdown renderer for read-only display
 * Supports: headings, lists, code blocks, inline code, paragraphs
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let codeBlock = false;
  let codeLanguage = '';
  let codeLines: string[] = [];
  let listItems: JSX.Element[] = [];
  let inList = false;

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

  lines.forEach((line, idx) => {
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
      return;
    }

    if (codeBlock) {
      codeLines.push(line);
      return;
    }

    // Headings
    if (line.startsWith('#### ')) {
      flushList();
      inList = false;
      elements.push(
        <h4 key={idx} className="text-base font-semibold font-mono mt-4 mb-2 text-foreground">
          {line.slice(5)}
        </h4>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      inList = false;
      elements.push(
        <h3 key={idx} className="text-lg font-semibold font-mono mt-4 mb-2 text-foreground">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      inList = false;
      elements.push(
        <h2 key={idx} className="text-xl font-semibold font-mono mt-6 mb-3 text-foreground">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      flushList();
      inList = false;
      elements.push(
        <h1 key={idx} className="text-2xl font-bold font-mono mt-6 mb-4 text-foreground">
          {line.slice(2)}
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
          {line.replace(/^\d+\.\s/, '')}
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
          {line.slice(2)}
        </li>
      );
    }
    // Inline code and bold
    else if (line.includes('`') || line.includes('**')) {
      if (inList) {
        flushList();
        inList = false;
      }
      // Handle inline code
      let formattedLine = line;
      const parts: (string | JSX.Element)[] = [];
      let lastIndex = 0;

      // Process inline code
      const codeRegex = /`([^`]+)`/g;
      let match;
      while ((match = codeRegex.exec(formattedLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(formattedLine.slice(lastIndex, match.index));
        }
        parts.push(
          <code
            key={`code-${idx}-${match.index}`}
            className="bg-secondary text-foreground px-1 py-0.5 rounded text-sm font-mono"
          >
            {match[1]}
          </code>
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < formattedLine.length) {
        parts.push(formattedLine.slice(lastIndex));
      }

      elements.push(
        <p key={idx} className="text-sm leading-relaxed my-2 text-foreground/90">
          {parts.length > 0 ? parts : formattedLine}
        </p>
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
    // Regular paragraph
    else {
      if (inList) {
        flushList();
        inList = false;
      }
      elements.push(
        <p key={idx} className="text-sm leading-relaxed my-2 text-foreground/90">
          {line}
        </p>
      );
    }
  });

  // Flush any remaining list
  flushList();

  return <div className={className}>{elements}</div>;
}

export default MarkdownRenderer;
