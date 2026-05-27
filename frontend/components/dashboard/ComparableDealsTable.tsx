"use client";

import { useState } from "react";
import { ExternalLink, ArrowUpDown } from "lucide-react";
import type { ComparableDeal } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ComparableDealsTableProps {
  deals: ComparableDeal[];
}

type SortKey = "price" | "buyer" | "festival";

function parsePrice(p: string): number {
  const m = p.replace(/,/g, "").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

export function ComparableDealsTable({ deals }: ComparableDealsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...deals].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "price") cmp = parsePrice(a.price) - parsePrice(b.price);
    else if (sortKey === "buyer") cmp = a.buyer.localeCompare(b.buyer);
    else cmp = a.festival.localeCompare(b.festival);
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <TooltipProvider>
      <div
        className="rounded-lg overflow-hidden h-full flex flex-col"
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border-strong)",
        }}
      >
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-text-dim)" }}
          >
            Comparable Deals
          </p>
        </div>

        {deals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>
              No comparable deals found.
            </p>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th onClick={() => toggleSort("price")} className="cursor-pointer">
                    <span className="flex items-center gap-1">
                      Price <ArrowUpDown size={10} />
                    </span>
                  </th>
                  <th onClick={() => toggleSort("buyer")}>
                    <span className="flex items-center gap-1">
                      Buyer <ArrowUpDown size={10} />
                    </span>
                  </th>
                  <th onClick={() => toggleSort("festival")}>
                    <span className="flex items-center gap-1">
                      Festival <ArrowUpDown size={10} />
                    </span>
                  </th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((deal, i) => (
                  <tr key={i}>
                    <td className="font-medium">{deal.title}</td>
                    <td className="tabular-nums font-semibold" style={{ color: "var(--color-accent)" }}>
                      {deal.price}
                    </td>
                    <td>{deal.buyer}</td>
                    <td>{deal.festival}</td>
                    <td>
                      {deal.url ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={deal.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] transition-colors"
                              style={{ color: "var(--color-accent)", textDecoration: "underline", textDecorationStyle: "dotted" }}
                            >
                              <ExternalLink size={11} />
                              Source
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-[260px] truncate">{deal.url}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span style={{ color: "var(--color-text-dim)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
