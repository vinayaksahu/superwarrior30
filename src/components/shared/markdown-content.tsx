"use client";

import React from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Parses inline formatting like **bold**, *italic*, `code`, and [link](url)
 */
function renderInline(text: string): React.ReactNode {
  // Regex to match inline tokens:
  // 1. **bold** or __bold__
  // 2. *italic* or _italic_
  // 3. `inline code`
  // 4. [link text](url)
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Check for bold: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
    if (boldMatch) {
      tokens.push(
        <strong key={keyIdx++} className="font-bold text-foreground">
          {renderInline(boldMatch[2])}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Check for inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code
          key={keyIdx++}
          className="rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary border border-border/50"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Check for links: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push(
        <a
          key={keyIdx++}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Check for italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
    if (italicMatch) {
      tokens.push(
        <em key={keyIdx++} className="italic text-foreground/90">
          {renderInline(italicMatch[2])}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Normal text slice up to next potential token
    const nextSpecial = remaining.search(/[\*_`\[]/);
    if (nextSpecial === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // If special char did not match full pattern, take it literally
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      tokens.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return tokens.length === 1 ? tokens[0] : tokens;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  if (!content || typeof content !== "string") return null;

  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const elements: React.ReactNode[] = [];
  let index = 0;

  let inList: "ul" | "ol" | null = null;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList === "ul") {
      elements.push(
        <ul key={`ul-${index++}`} className="my-4 space-y-2 pl-1">
          {listItems}
        </ul>
      );
    } else if (inList === "ol") {
      elements.push(
        <ol key={`ol-${index++}`} className="my-4 space-y-2 pl-1">
          {listItems}
        </ol>
      );
    }
    inList = null;
    listItems = [];
  };

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushCodeBlock = () => {
    if (inCodeBlock) {
      elements.push(
        <pre
          key={`code-${index++}`}
          className="my-4 overflow-x-auto rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs text-foreground"
        >
          <code>{codeBlockLines.join("\n")}</code>
        </pre>
      );
      inCodeBlock = false;
      codeBlockLines = [];
    }
  };

  let inBlockquote = false;
  let blockquoteLines: string[] = [];

  const flushBlockquote = () => {
    if (inBlockquote) {
      elements.push(
        <blockquote
          key={`bq-${index++}`}
          className="my-4 border-l-4 border-primary bg-primary/5 rounded-r-xl py-3 px-4 text-sm italic text-foreground/90"
        >
          {blockquoteLines.map((l, i) => (
            <p key={i}>{renderInline(l)}</p>
          ))}
        </blockquote>
      );
      inBlockquote = false;
      blockquoteLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code blocks: ```
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushList();
        flushBlockquote();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Blockquote: > text
    if (trimmed.startsWith(">")) {
      flushList();
      inBlockquote = true;
      blockquoteLines.push(trimmed.replace(/^>\s*/, ""));
      continue;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    // Blank lines
    if (trimmed === "") {
      flushList();
      continue;
    }

    // Horizontal Rule: --- or ***
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushList();
      elements.push(<hr key={`hr-${index++}`} className="my-6 border-border/80" />);
      continue;
    }

    // Headings: #, ##, ###, ####
    if (trimmed.startsWith("#")) {
      flushList();
      const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];

        if (level === 1) {
          elements.push(
            <h2
              key={`h1-${index++}`}
              className="mt-6 mb-3 text-xl sm:text-2xl font-black tracking-tight text-foreground border-b border-border/60 pb-2"
            >
              {renderInline(text)}
            </h2>
          );
        } else if (level === 2) {
          elements.push(
            <h3
              key={`h2-${index++}`}
              className="mt-5 mb-2.5 text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2"
            >
              <span className="h-2 w-2 rounded-full bg-primary inline-block" />
              {renderInline(text)}
            </h3>
          );
        } else if (level === 3) {
          elements.push(
            <h4
              key={`h3-${index++}`}
              className="mt-4 mb-2 text-base font-bold text-foreground"
            >
              {renderInline(text)}
            </h4>
          );
        } else {
          elements.push(
            <h5
              key={`h4-${index++}`}
              className="mt-3 mb-1.5 text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground"
            >
              {renderInline(text)}
            </h5>
          );
        }
        continue;
      }
    }

    // Unordered List item: - text or * text or + text
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (inList !== "ul") {
        flushList();
        inList = "ul";
      }
      listItems.push(
        <li key={`li-${index++}`} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
          <span className="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span className="flex-1">{renderInline(ulMatch[1])}</span>
        </li>
      );
      continue;
    }

    // Ordered List item: 1. text
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (inList !== "ol") {
        flushList();
        inList = "ol";
      }
      listItems.push(
        <li key={`li-${index++}`} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
          <span className="font-mono text-xs font-bold text-primary shrink-0 mt-0.5">
            {olMatch[1]}.
          </span>
          <span className="flex-1">{renderInline(olMatch[2])}</span>
        </li>
      );
      continue;
    }

    // Regular Paragraph
    flushList();
    elements.push(
      <p key={`p-${index++}`} className="my-2.5 text-sm sm:text-base leading-relaxed text-muted-foreground">
        {renderInline(trimmed)}
      </p>
    );
  }

  // Flush any trailing elements
  flushList();
  flushCodeBlock();
  flushBlockquote();

  return <div className={cn("space-y-1", className)}>{elements}</div>;
}
