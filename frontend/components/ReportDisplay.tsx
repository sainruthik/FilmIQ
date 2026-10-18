import { Children, isValidElement, useMemo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { citationKind, reportHeadings, slugify, tagCitations } from "@/lib/report";

function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? textOf(child.props.children)
          : "",
    )
    .join("");
}

interface ReportDisplayProps {
  report: string;
}

// The markdown report with a sticky contents list on wide screens.
// Citation tags become styled spans: [PDF p.N] in the script typeface,
// [unverified] in cherry.
export function ReportDisplay({ report }: ReportDisplayProps) {
  const markdown = useMemo(() => tagCitations(report), [report]);
  const headings = useMemo(() => reportHeadings(markdown), [markdown]);

  return (
    <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-18">
      {headings.length > 1 ? (
        <nav aria-label="Report contents" className="hidden lg:block print:hidden sticky top-32 self-start text-13">
          <ol className="border-l border-rule">
            {headings.map((h) => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  className="block -ml-px py-1 px-3 border-l border-transparent text-graphite hover:text-ink hover:border-ink transition-colors"
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : (
        <div className="hidden lg:block" />
      )}

      <article className="report min-w-0">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: ({ children }) => <h2 id={slugify(textOf(children))}>{children}</h2>,
            table: ({ children }) => (
              <div className="my-6 overflow-x-auto">
                <table>{children}</table>
              </div>
            ),
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
            code: ({ children, className }) => {
              const text = textOf(children);
              const kind = className ? null : citationKind(text);
              if (kind === "pdf") return <span className="cite-pdf">{text}</span>;
              if (kind === "unverified") return <span className="cite-unverified">unverified</span>;
              return <code className={className}>{children}</code>;
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}
