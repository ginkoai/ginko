/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-15
 * @tags: [markdown, editor, preview, knowledge-editing]
 * @related: [NodeEditor.tsx, NodeEditorForm.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, react-syntax-highlighter]
 */
'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import {
  EyeIcon,
  PencilSquareIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  minHeight?: string;
  required?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Enter markdown content...',
  label,
  helperText,
  minHeight = '300px',
  required = false,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Parse inline formatting (bold, italic, strikethrough, code, links)
  const parseInline = (text: string, keyPrefix: string): (string | JSX.Element)[] => {
    const result: (string | JSX.Element)[] = [];
    let remaining = text;
    let keyIndex = 0;

    while (remaining.length > 0) {
      // Inline code (must be first to avoid conflicts)
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        result.push(
          <code key={`${keyPrefix}-code-${keyIndex++}`} className="bg-white/10 text-primary px-1 py-0.5 rounded text-sm font-mono">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Bold
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        result.push(<strong key={`${keyPrefix}-bold-${keyIndex++}`} className="font-bold">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic
      const italicMatch = remaining.match(/^\*([^*]+)\*/);
      if (italicMatch) {
        result.push(<em key={`${keyPrefix}-italic-${keyIndex++}`} className="italic">{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Strikethrough
      const strikeMatch = remaining.match(/^~~([^~]+)~~/);
      if (strikeMatch) {
        result.push(<del key={`${keyPrefix}-strike-${keyIndex++}`} className="line-through opacity-60">{strikeMatch[1]}</del>);
        remaining = remaining.slice(strikeMatch[0].length);
        continue;
      }

      // Links
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        result.push(
          <a key={`${keyPrefix}-link-${keyIndex++}`} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Regular character
      const nextSpecial = remaining.search(/[`*~\[]/);
      if (nextSpecial === -1) {
        result.push(remaining);
        break;
      } else if (nextSpecial === 0) {
        // Special char but no match - treat as regular text
        result.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        result.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      }
    }

    return result;
  };

  // Simple markdown parser for preview
  const parseMarkdown = (text: string): JSX.Element => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let codeBlock = false;
    let codeLanguage = '';
    let codeLines: string[] = [];
    let listItems: JSX.Element[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
      if (listItems.length > 0 && listType) {
        if (listType === 'ul') {
          elements.push(
            <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
              {listItems}
            </ul>
          );
        } else {
          elements.push(
            <ol key={`list-${elements.length}`} className="list-decimal list-inside space-y-1 my-2">
              {listItems}
            </ol>
          );
        }
        listItems = [];
        listType = null;
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
      if (line.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={idx} className="text-lg font-semibold font-mono mt-4 mb-2 text-inherit">
            {parseInline(line.slice(4), `h3-${idx}`)}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={idx} className="text-xl font-semibold font-mono mt-6 mb-3 text-inherit">
            {parseInline(line.slice(3), `h2-${idx}`)}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={idx} className="text-2xl font-bold font-mono mt-6 mb-4 text-inherit">
            {parseInline(line.slice(2), `h1-${idx}`)}
          </h1>
        );
      }
      // Blockquotes
      else if (line.startsWith('> ')) {
        flushList();
        elements.push(
          <blockquote key={idx} className="border-l-4 border-primary/50 pl-4 my-3 text-sm italic opacity-80">
            {parseInline(line.slice(2), `quote-${idx}`)}
          </blockquote>
        );
      }
      // Unordered lists
      else if (line.match(/^[-*]\s/)) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        listItems.push(
          <li key={idx} className="text-sm">
            {parseInline(line.slice(2), `li-${idx}`)}
          </li>
        );
      }
      // Ordered lists
      else if (line.match(/^\d+\.\s/)) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        const content = line.replace(/^\d+\.\s/, '');
        listItems.push(
          <li key={idx} className="text-sm">
            {parseInline(content, `oli-${idx}`)}
          </li>
        );
      }
      // Empty line
      else if (line.trim() === '') {
        flushList();
        elements.push(<div key={idx} className="h-2" />);
      }
      // Regular paragraph
      else {
        flushList();
        elements.push(
          <p key={idx} className="text-sm leading-relaxed my-2">
            {parseInline(line, `p-${idx}`)}
          </p>
        );
      }
    });

    // Flush any remaining list
    flushList();

    return <div className="max-w-none space-y-1">{elements}</div>;
  };

  return (
    <div className={`space-y-2 ${isExpanded ? 'fixed inset-4 z-50 bg-background' : ''}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Tabs + Controls */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 text-sm font-mono transition-colors ${
              activeTab === 'edit'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PencilSquareIcon className="inline h-4 w-4 mr-1" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-mono transition-colors ${
              activeTab === 'preview'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <EyeIcon className="inline h-4 w-4 mr-1" />
            Preview
          </button>
        </div>
        <div className="flex items-center">
          {isExpanded && (
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className={`px-3 py-2 transition-colors ${
                showGuide ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Markdown Guide"
            >
              <QuestionMarkCircleIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ArrowsPointingInIcon className="h-4 w-4" />
            ) : (
              <ArrowsPointingOutIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex gap-4 ${isExpanded && showGuide ? 'flex-row' : 'flex-col'}`}>
        <div
          className={`border border-border rounded-lg overflow-hidden ${isExpanded && showGuide ? 'flex-1' : 'w-full'}`}
          style={{ minHeight: isExpanded ? '70vh' : minHeight }}
        >
          {activeTab === 'edit' ? (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full h-full p-4 bg-background text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
              style={{ minHeight: isExpanded ? '70vh' : minHeight }}
            />
          ) : (
            <div
              className="p-4 overflow-y-auto text-[hsl(var(--ginko-text))]"
              style={{
                minHeight: isExpanded ? '70vh' : minHeight,
                backgroundColor: 'hsl(var(--ginko-surface))'
              }}
            >
              {value ? parseMarkdown(value) : <p className="text-[hsl(var(--ginko-text-secondary))] text-sm">Nothing to preview</p>}
            </div>
          )}
        </div>

        {/* Markdown Guide Panel */}
        {isExpanded && showGuide && (
          <div
            className="w-80 border border-border rounded-lg overflow-y-auto p-4 text-sm"
            style={{
              minHeight: '70vh',
              backgroundColor: 'hsl(var(--ginko-surface))',
              color: 'hsl(var(--ginko-text))'
            }}
          >
            <h3 className="text-base font-semibold font-mono mb-4 text-primary">Markdown Guide</h3>

            <div className="space-y-4">
              <div>
                <h4 className="font-mono font-medium text-[hsl(var(--ginko-text-secondary))] mb-1">Headings</h4>
                <code className="block bg-white/10 p-2 rounded text-xs font-mono">
                  # Heading 1{'\n'}
                  ## Heading 2{'\n'}
                  ### Heading 3
                </code>
              </div>

              <div>
                <h4 className="font-mono font-medium text-[hsl(var(--ginko-text-secondary))] mb-1">Emphasis</h4>
                <code className="block bg-white/10 p-2 rounded text-xs font-mono">
                  **bold text**{'\n'}
                  *italic text*{'\n'}
                  ~~strikethrough~~
                </code>
              </div>

              <div>
                <h4 className="font-mono font-medium text-[hsl(var(--ginko-text-secondary))] mb-1">Lists</h4>
                <code className="block bg-white/10 p-2 rounded text-xs font-mono">
                  - Bullet item{'\n'}
                  * Another bullet{'\n'}
                  1. Numbered item{'\n'}
                  2. Second item
                </code>
              </div>

              <div>
                <h4 className="font-mono font-medium text-[hsl(var(--ginko-text-secondary))] mb-1">Links</h4>
                <code className="block bg-white/10 p-2 rounded text-xs font-mono">
                  [Link text](https://url.com)
                </code>
              </div>

              <div>
                <h4 className="font-mono font-medium text-[hsl(var(--ginko-text-secondary))] mb-1">Code</h4>
                <code className="block bg-white/10 p-2 rounded text-xs font-mono whitespace-pre">
                  {`\`inline code\`

\`\`\`javascript
code block
\`\`\``}
                </code>
              </div>

              <div>
                <h4 className="font-mono font-medium text-[hsl(var(--ginko-text-secondary))] mb-1">Blockquotes</h4>
                <code className="block bg-white/10 p-2 rounded text-xs font-mono">
                  {'>'} Quoted text
                </code>
              </div>

              <div className="pt-2 border-t border-border">
                <a
                  href="https://www.markdownguide.org/basic-syntax/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-mono text-xs"
                >
                  Full Markdown Guide →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Helper Text */}
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
