"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import {
  askAiCoachAction,
  confirmAiDraftAction,
  resolveAiDraftForBuilderAction,
} from "@/features/ai-coach/actions";
import { writeAiCoachDraftToSession } from "@/features/ai-coach/lib/draft-storage";
import {
  aiCoachSuggestionPrompts,
  draftMetaLine,
  formatChipLabel,
  type AiRoutineDraft,
} from "@/features/ai-coach/validation";
import { AI_COACH_DAILY_LIMIT_DEFAULT } from "@/features/ai-coach/lib/limits";

type ChatMessage =
  | { id: string; role: "me"; text: string }
  | {
      id: string;
      role: "ai";
      text: string;
      draft: AiRoutineDraft | null;
      error?: boolean;
    };

type AiCoachChatProps = {
  displayName: string | null;
  subtitle: string;
};

let msgSeq = 0;
function nextId(prefix: string): string {
  msgSeq += 1;
  return `${prefix}-${msgSeq}`;
}

export function AiCoachChat({ displayName, subtitle }: AiCoachChatProps) {
  const router = useRouter();
  const inputId = useId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [savedDraftName, setSavedDraftName] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function ask(text: string) {
    const prompt = text.trim();
    if (!prompt || loading) {
      return;
    }

    setActionError(null);
    setLastPrompt(prompt);
    setMessages((prev) => [
      ...prev,
      { id: nextId("me"), role: "me", text: prompt },
    ]);
    setInput("");
    setLoading(true);

    try {
      const result = await askAiCoachAction(prompt);
      if (!result.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId("ai"),
            role: "ai",
            text: result.error,
            draft: null,
            error: true,
          },
        ]);
        return;
      }

      setRemaining(result.remaining);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("ai"),
          role: "ai",
          text: result.coachMessage,
          draft: result.draft,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("ai"),
          role: "ai",
          text: "Coach is unavailable right now. Try again.",
          draft: null,
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([]);
    setInput("");
    setLastPrompt(null);
    setSavedDraftName(null);
    setActionError(null);
  }

  function editDraft(draft: AiRoutineDraft) {
    setActionError(null);
    startTransition(async () => {
      const resolved = await resolveAiDraftForBuilderAction(draft);
      if (!resolved.ok) {
        setActionError(resolved.error);
        return;
      }
      writeAiCoachDraftToSession(draft);
      router.push("/app/routines/new?from=ai-coach");
    });
  }

  function saveDraft(draft: AiRoutineDraft) {
    setActionError(null);
    startTransition(async () => {
      const result = await confirmAiDraftAction(draft);
      if (result && !result.ok) {
        setActionError(result.error);
        return;
      }
      setSavedDraftName(draft.name);
    });
  }

  const empty = messages.length === 0 && !loading;

  return (
    <div className="border-border bg-surface flex min-h-[70dvh] flex-col overflow-hidden rounded-[28px] border lg:min-h-[640px]">
      <header className="border-border flex items-center gap-3 border-b px-4 py-3">
        <Link
          href="/app"
          className="text-muted hover:text-ink inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-lg"
          aria-label="Back to dashboard"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-wide uppercase">
            AI Coach
          </h1>
          <p className="text-muted truncate text-xs">
            {displayName ? `${displayName} · ${subtitle}` : subtitle}
          </p>
        </div>
        {remaining != null ? (
          <p className="text-muted shrink-0 text-xs">
            {remaining}/{AI_COACH_DAILY_LIMIT_DEFAULT} left
          </p>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {empty ? (
          <div className="flex flex-col gap-4">
            <p className="text-muted text-sm leading-relaxed">
              Ask for a session and I will draft a routine. Nothing is saved
              until you say so.
            </p>
            <div className="flex flex-wrap gap-2">
              {aiCoachSuggestionPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void ask(prompt)}
                  className="border-border bg-raised text-ink inline-flex min-h-11 items-center rounded-full border px-3.5 text-left text-sm font-semibold"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message) => {
          if (message.role === "me") {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="bg-ink text-ground max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed">
                  {message.text}
                </div>
              </div>
            );
          }

          return (
            <div key={message.id} className="flex flex-col gap-3">
              <div className="bg-raised text-ink max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed">
                {message.text}
              </div>

              {message.error && lastPrompt ? (
                <button
                  type="button"
                  onClick={() => void ask(lastPrompt)}
                  className="border-border bg-raised text-ink inline-flex min-h-11 w-fit items-center rounded-xl border px-3 text-sm font-semibold"
                >
                  Try again
                </button>
              ) : null}

              {message.draft ? (
                <div className="border-border bg-ground flex max-w-[92%] flex-col gap-3 rounded-2xl border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-muted text-[11px] font-semibold tracking-wide uppercase">
                        Draft · not saved
                      </p>
                      <p className="font-display text-xl font-extrabold tracking-wide uppercase">
                        {message.draft.name}
                      </p>
                      <p className="text-muted text-xs">
                        {draftMetaLine(message.draft)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {message.draft.sections.map((section, index) => (
                      <div
                        key={`${section.name}-${index}`}
                        className="bg-raised flex flex-col gap-0.5 rounded-[14px] px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold">
                            {section.name}
                          </span>
                          <span className="bg-accent text-ground rounded-full px-2 py-0.5 text-[11px] font-extrabold">
                            {formatChipLabel(section.format)}
                          </span>
                        </div>
                        <p className="text-muted text-xs leading-snug">
                          {section.summaryLine}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => editDraft(message.draft!)}
                      className="border-border bg-raised text-ink inline-flex h-12 flex-1 items-center justify-center rounded-[14px] border text-[15px] font-bold disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => saveDraft(message.draft!)}
                      className={`inline-flex h-12 flex-1 items-center justify-center rounded-[14px] text-[15px] font-bold disabled:opacity-60 ${
                        savedDraftName === message.draft.name
                          ? "bg-[#12301F] text-[#7BE0A4]"
                          : "bg-accent text-ground"
                      }`}
                    >
                      {savedDraftName === message.draft.name
                        ? "Saved"
                        : "Save to My Training"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}

        {loading ? (
          <div
            className="flex gap-1.5 px-1 py-2"
            aria-label="Coach is thinking"
          >
            <span className="bg-muted h-2 w-2 animate-pulse rounded-full" />
            <span className="bg-muted h-2 w-2 animate-pulse rounded-full [animation-delay:160ms]" />
            <span className="bg-muted h-2 w-2 animate-pulse rounded-full [animation-delay:320ms]" />
          </div>
        ) : null}

        {actionError ? (
          <p className="text-sm text-[#ff8f6b]" role="alert">
            {actionError}
          </p>
        ) : null}
      </div>

      <form
        className="border-border bg-surface flex gap-2 border-t px-4 pt-2.5 pb-5"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(input);
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Ask your coach
        </label>
        <input
          id={inputId}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask your coach"
          disabled={loading}
          className="border-border bg-ground text-ink placeholder:text-muted h-12 min-w-0 flex-1 rounded-[14px] border px-3.5 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-accent text-ground inline-flex h-12 min-w-12 items-center justify-center rounded-[14px] text-lg font-extrabold disabled:opacity-50"
          aria-label="Send"
        >
          ↵
        </button>
        <button
          type="button"
          onClick={resetChat}
          className="bg-accent text-ground inline-flex h-12 min-w-12 items-center justify-center rounded-[14px] text-xl font-extrabold"
          aria-label="New chat"
        >
          ↺
        </button>
      </form>
    </div>
  );
}
