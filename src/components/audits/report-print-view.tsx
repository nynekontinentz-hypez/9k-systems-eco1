"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

/**
 * Client-facing, print-optimised audit report. Renders on white with brand
 * accents so "Print → Save as PDF" produces a clean branded deliverable.
 * Deliberately dependency-free: a small markdown subset renderer covers the
 * report format our composer emits (#/##/###, -, 1., [ ]/[x], **bold**).
 */

type Counts = { total: number; high: number; med: number; low: number };

export function ReportPrintView({
  clientName,
  report,
  counts,
}: {
  clientName: string;
  report: string;
  counts: Counts;
}) {
  return (
    <div className="report-root">
      {/* Screen-only toolbar */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href="/app/audits"
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to audits
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <article className="report-page">
        {/* Cover header */}
        <header className="report-header">
          <div className="report-brand">
            <span className="report-mark">9K</span>
            <div>
              <div className="report-brandname">9K Systems</div>
              <div className="report-brandsub">
                Managed IT · Colorado Springs
              </div>
            </div>
          </div>
          <div className="report-meta">
            <div>Prepared for</div>
            <strong>{clientName}</strong>
            <div>
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        </header>

        <h1 className="report-title">AI Readiness Audit</h1>
        <p className="report-subtitle">
          43 checkpoints across 8 domains — what&apos;s exposed, what&apos;s
          wasted, and what to fix first.
        </p>

        {/* Findings summary */}
        <section className="report-summary">
          <Stat label="Checkpoints reviewed" value={counts.total} />
          <Stat label="High priority" value={counts.high} tone="high" />
          <Stat label="Medium" value={counts.med} tone="med" />
          <Stat label="Low" value={counts.low} tone="low" />
        </section>

        {report ? (
          <div className="report-body">{renderMarkdown(report)}</div>
        ) : (
          <p className="report-empty">
            No report generated yet. Return to the workspace and select
            &ldquo;Generate&rdquo;.
          </p>
        )}

        <footer className="report-footer">
          <p>
            Prepared by 9K Systems · 9ksystems.net · admin@9ksystems.net
            <br />
            This report identifies areas of potential exposure and is not legal
            advice. Where regulatory duties are flagged, consult qualified
            counsel.
          </p>
        </footer>
      </article>

      <style jsx global>{`
        .report-root {
          max-width: 8.5in;
          margin: 0 auto;
        }
        .report-page {
          background: #ffffff;
          color: #18181b;
          padding: 0.75in;
          border-radius: 12px;
          font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
          line-height: 1.6;
        }
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #8251ee;
          padding-bottom: 16px;
          margin-bottom: 28px;
        }
        .report-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .report-mark {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border-radius: 9px;
          background: #8251ee;
          color: #fff;
          font-weight: 700;
          font-size: 15px;
        }
        .report-brandname {
          font-weight: 600;
          font-size: 15px;
        }
        .report-brandsub {
          font-size: 12px;
          color: #52525b;
        }
        .report-meta {
          text-align: right;
          font-size: 12px;
          color: #52525b;
        }
        .report-meta strong {
          display: block;
          font-size: 15px;
          color: #18181b;
        }
        .report-title {
          font-size: 30px;
          font-weight: 650;
          letter-spacing: -0.02em;
          margin: 0 0 6px;
        }
        .report-subtitle {
          color: #52525b;
          margin: 0 0 26px;
        }
        .report-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 30px;
          break-inside: avoid;
        }
        .report-stat {
          border: 1px solid #e4e4e7;
          border-radius: 10px;
          padding: 12px;
        }
        .report-stat-value {
          font-size: 24px;
          font-weight: 650;
        }
        .report-stat-label {
          font-size: 11px;
          color: #52525b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .tone-high .report-stat-value {
          color: #dc2626;
        }
        .tone-med .report-stat-value {
          color: #d97706;
        }
        .tone-low .report-stat-value {
          color: #2563eb;
        }
        .report-body h1 {
          display: none;
        }
        .report-body h2 {
          font-size: 19px;
          font-weight: 620;
          margin: 26px 0 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid #e4e4e7;
          break-after: avoid;
        }
        .report-body h3 {
          font-size: 15px;
          font-weight: 620;
          margin: 18px 0 7px;
          color: #3f3f46;
          break-after: avoid;
        }
        .report-body p {
          margin: 0 0 10px;
        }
        .report-body ul,
        .report-body ol {
          margin: 0 0 12px;
          padding-left: 20px;
        }
        .report-body li {
          margin-bottom: 5px;
        }
        .report-body .check {
          list-style: none;
          margin-left: -20px;
        }
        .report-body em {
          color: #52525b;
        }
        .report-empty {
          color: #71717a;
        }
        .report-footer {
          margin-top: 34px;
          padding-top: 14px;
          border-top: 1px solid #e4e4e7;
          font-size: 11px;
          color: #71717a;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
          .report-root {
            max-width: none;
          }
          .report-page {
            padding: 0;
            border-radius: 0;
          }
          @page {
            margin: 0.6in;
          }
        }
      `}</style>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "high" | "med" | "low";
}) {
  return (
    <div className={`report-stat ${tone ? `tone-${tone}` : ""}`}>
      <div className="report-stat-value">{value}</div>
      <div className="report-stat-label">{label}</div>
    </div>
  );
}

/** Inline **bold** → <strong>, everything else escaped by React. */
function inline(text: string, keyBase: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyBase}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}

/** Minimal markdown renderer for the report format our composer emits. */
function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let list: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;

  const flush = () => {
    if (!list.length) return;
    out.push(
      listType === "ol" ? (
        <ol key={`l-${out.length}`}>{list}</ol>
      ) : (
        <ul key={`l-${out.length}`}>{list}</ul>
      ),
    );
    list = [];
    listType = null;
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      return;
    }
    if (line.startsWith("### ")) {
      flush();
      out.push(<h3 key={i}>{inline(line.slice(4), `h${i}`)}</h3>);
    } else if (line.startsWith("## ")) {
      flush();
      out.push(<h2 key={i}>{inline(line.slice(3), `h${i}`)}</h2>);
    } else if (line.startsWith("# ")) {
      flush();
      out.push(<h1 key={i}>{inline(line.slice(2), `h${i}`)}</h1>);
    } else if (/^- \[[ x]\] /.test(line)) {
      if (listType !== "ul") flush();
      listType = "ul";
      const done = line[3] === "x";
      list.push(
        <li key={i} className="check">
          {done ? "☑" : "☐"} {inline(line.slice(6), `c${i}`)}
        </li>,
      );
    } else if (line.startsWith("- ")) {
      if (listType !== "ul") flush();
      listType = "ul";
      list.push(<li key={i}>{inline(line.slice(2), `u${i}`)}</li>);
    } else if (/^\d+\.\s/.test(line)) {
      if (listType !== "ol") flush();
      listType = "ol";
      list.push(
        <li key={i}>{inline(line.replace(/^\d+\.\s/, ""), `o${i}`)}</li>,
      );
    } else if (line.startsWith("_") && line.endsWith("_")) {
      flush();
      out.push(
        <p key={i}>
          <em>{line.slice(1, -1)}</em>
        </p>,
      );
    } else {
      flush();
      out.push(<p key={i}>{inline(line, `p${i}`)}</p>);
    }
  });
  flush();
  return out;
}
