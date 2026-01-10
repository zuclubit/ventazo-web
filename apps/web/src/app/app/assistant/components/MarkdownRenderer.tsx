'use client';

/**
 * Professional Markdown Renderer for AI Assistant
 *
 * Renders markdown content with beautiful styling optimized for CRM data display.
 * Supports tables, code blocks, lists, headers, and inline formatting.
 *
 * @module app/assistant/components/MarkdownRenderer
 */

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

// ============================================
// Custom Components
// ============================================

const components = {
  // Headings with proper hierarchy and styling
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0 text-foreground" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-base font-semibold mt-4 mb-2 first:mt-0 text-foreground flex items-center gap-2" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-sm font-semibold mt-3 mb-1.5 first:mt-0 text-foreground" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className="text-sm font-medium mt-2 mb-1 first:mt-0 text-muted-foreground" {...props}>
      {children}
    </h4>
  ),

  // Paragraphs with proper spacing
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-sm leading-relaxed mb-2 last:mb-0" {...props}>
      {children}
    </p>
  ),

  // Lists with custom styling
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-none space-y-1.5 my-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-inside space-y-1 my-2 text-sm" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="text-sm flex items-start gap-2" {...props}>
      <span className="text-[var(--tenant-primary)] mt-1.5 shrink-0">•</span>
      <span className="flex-1">{children}</span>
    </li>
  ),

  // Links
  a: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      className="text-[var(--tenant-primary)] hover:underline transition-colors"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),

  // Inline code
  code: ({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) => {
    const isInline = !className?.includes('language-');
    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded-md bg-muted text-xs font-mono text-[var(--tenant-primary)]"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={cn('text-xs', className)} {...props}>
        {children}
      </code>
    );
  },

  // Code blocks
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="my-2 p-3 rounded-lg bg-muted/50 border border-border overflow-x-auto text-xs"
      {...props}
    >
      {children}
    </pre>
  ),

  // Tables with premium styling
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-muted/50" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody className="divide-y divide-border" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="hover:bg-muted/30 transition-colors" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-3 py-2 text-sm" {...props}>
      {children}
    </td>
  ),

  // Blockquotes for important info
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-2 pl-3 border-l-2 border-[var(--tenant-primary)] text-sm text-muted-foreground italic"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-3 border-border" {...props} />
  ),

  // Strong/Bold
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),

  // Emphasis/Italic
  em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
};

// ============================================
// Main Component
// ============================================

export function MarkdownRenderer({ content, className, isStreaming }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'markdown-content prose prose-sm max-w-none dark:prose-invert',
        'prose-headings:text-foreground prose-p:text-foreground',
        'prose-strong:text-foreground prose-em:text-foreground',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-[var(--tenant-primary)] animate-pulse rounded-sm" />
      )}
    </div>
  );
}

MarkdownRenderer.displayName = 'MarkdownRenderer';
