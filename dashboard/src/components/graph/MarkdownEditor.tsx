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

  // Simple markdown parser for preview
  const parseMarkdown = (text: string): JSX.Element => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let codeBlock = false;
    let codeLanguage = '';
    let codeLines: string[] = [];
    let listItems: JSX.Element[] = [];
    let inList = false;

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
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
      if (line.startsWith('### ')) {
        flushList();
        inList = false;
        elements.push(
          <h3 key={idx} className="text-lg font-semibold font-mono mt-4 mb-2">
            {line.slice(4)}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        flushList();
        inList = false;
        elements.push(
          <h2 key={idx} className="text-xl font-semibold font-mono mt-6 mb-3">
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        flushList();
        inList = false;
        elements.push(
          <h1 key={idx} className="text-2xl font-bold font-mono mt-6 mb-4">
            {line.slice(2)}
          </h1>
        );
      }
      // Lists
      else if (line.match(/^[-*]\s/)) {
        inList = true;
        listItems.push(
          <li key={idx} className="text-sm">
            {line.slice(2)}
          </li>
        );
      }
      // Inline code
      else if (line.includes('`')) {
        if (inList) {
          flushList();
          inList = false;
        }
        const parts = line.split('`');
        const formatted = parts.map((part, i) =>
          i % 2 === 0 ? (
            part
          ) : (
            <code
              key={i}
              className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono"
            >
              {part}
            </code>
          )
        );
        elements.push(
          <p key={idx} className="text-sm leading-relaxed my-2">
            {formatted}
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
          <p key={idx} className="text-sm leading-relaxed my-2">
            {line}
          </p>
        );
      }
    });

    // Flush any remaining list
    flushList();

    return <div className="prose prose-sm max-w-none">{elements}</div>;
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

      {/* Content Area */}
      <div
        className="border border-border rounded-lg overflow-hidden"
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
          <div className="p-4 bg-secondary/30 overflow-y-auto" style={{ minHeight: isExpanded ? '70vh' : minHeight }}>
            {value ? parseMarkdown(value) : <p className="text-muted-foreground text-sm">Nothing to preview</p>}
          </div>
        )}
      </div>

      {/* Helper Text */}
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
