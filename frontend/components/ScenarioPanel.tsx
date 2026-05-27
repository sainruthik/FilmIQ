"use client";

import { useRef, useEffect, useState } from "react";
import { MessageSquarePlus, Send } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { askScenario } from "@/lib/api";
import type { AcquisitionReport } from "@/lib/types";

const PRESET_QUESTIONS = [
  "What happens if we counter at 15% above fair value?",
  "How does this compare to similar Sundance 2024 deals?",
  "What's the downside if post-premiere buzz fades?",
  "Which risk flags will most impact final pricing?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ScenarioPanelProps {
  report: AcquisitionReport | null;
  filmTitle: string;
}

export function ScenarioPanel({ report, filmTitle }: ScenarioPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const submit = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await askScenario({
        question: q,
        report_json: report,
        film_title: filmTitle,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to get a response. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold transition-colors"
          style={{
            background: "var(--color-accent-dim)",
            border: "1px solid var(--color-accent-border)",
            color: "var(--color-accent)",
          }}
        >
          <MessageSquarePlus size={12} />
          Scenario Testing
        </button>
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>Scenario Testing</SheetTitle>
          <p
            className="text-xs"
            style={{ color: "var(--color-text-dim)" }}
          >
            Ask hypothetical questions about this acquisition
          </p>
        </SheetHeader>

        {/* Preset questions */}
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--color-text-dim)" }}
          >
            Quick Scenarios
          </p>
          <div className="flex flex-col gap-1.5">
            {PRESET_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => submit(q)}
                disabled={loading}
                className="text-left text-xs px-3 py-2 rounded transition-opacity disabled:opacity-40"
                style={{
                  background: "var(--color-surface-raised)",
                  color: "var(--color-text-muted)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
          {messages.length === 0 && (
            <p
              className="text-xs text-center mt-8"
              style={{ color: "var(--color-text-dim)" }}
            >
              Select a scenario or type a custom question below.
            </p>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="rounded-lg px-3 py-2 text-xs leading-relaxed max-w-[88%]"
                style={
                  msg.role === "user"
                    ? {
                        background: "var(--color-accent-dim)",
                        color: "var(--color-accent)",
                        border: "1px solid var(--color-accent-border)",
                      }
                    : {
                        background: "var(--color-surface-raised)",
                        color: "var(--color-text-muted)",
                        border: "1px solid var(--color-border)",
                      }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div
                className="rounded-lg px-3 py-2 text-xs"
                style={{
                  background: "var(--color-surface-raised)",
                  color: "var(--color-text-dim)",
                  border: "1px solid var(--color-border)",
                }}
              >
                Analyzing…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div
          className="px-4 py-3 border-t flex gap-2 items-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            placeholder="Ask a scenario question…"
            disabled={loading}
            className="flex-1 text-xs px-3 py-2 rounded outline-none"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
          <button
            onClick={() => submit(input)}
            disabled={loading || !input.trim()}
            className="p-2 rounded transition-opacity disabled:opacity-40"
            style={{
              background: "var(--color-accent)",
              color: "white",
            }}
          >
            <Send size={13} />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
