"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Рендерит текст с inline-формулами в $...$ и блочными $$...$$.
 * Использовать в карточках (вопрос/ответ), редакторе, плеере, print.
 */
export function KatexRender({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = renderInlineLatex(text);
  }, [text]);

  return <div ref={ref} className={className} />;
}

function renderInlineLatex(input: string): string {
  // Сначала блочные $$...$$
  let out = input.replace(/\$\$([^$]+)\$\$/g, (_, expr) => {
    try {
      return `<div class="my-1">${katex.renderToString(expr.trim(), {
        displayMode: true,
        throwOnError: false,
      })}</div>`;
    } catch {
      return `<code>$$${escapeHtml(expr)}$$</code>`;
    }
  });
  // Затем inline $...$
  out = out.replace(/\$([^$\n]+)\$/g, (_, expr) => {
    try {
      return katex.renderToString(expr.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `<code>$${escapeHtml(expr)}$</code>`;
    }
  });
  // Перенос строк → <br>
  out = out.replace(/\n/g, "<br />");
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]!);
}
