"use client";

import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/schemas";

interface Props {
  history: ChatMessage[];
  onSend: (message: string) => void;
  loading: boolean;
}

export function ChatThread({ history, onSend, loading }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  function handleSend() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    onSend(msg);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
        {history.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-foreground text-background rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="flex gap-2 pt-3 border-t mt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder="Type a message…"
          disabled={loading}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
