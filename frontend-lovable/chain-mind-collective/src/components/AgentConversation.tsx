import { useEffect, useRef, useState } from "react";
import { AGENTS, type ChatMessage } from "@/lib/mockData";
import { avatarDataUri } from "@/lib/avatar";

export function AgentConversation({
  messages,
  loop = false,
  intervalMs = 750,
  maxHeightClass = "max-h-72",
}: {
  messages: ChatMessage[];
  loop?: boolean;
  intervalMs?: number;
  maxHeightClass?: string;
}) {
  const [visible, setVisible] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let i = 0;
    setVisible(0);
    const step = () => {
      if (cancelled) return;
      i++;
      setVisible(i);
      if (i < messages.length) {
        timer = setTimeout(step, intervalMs);
      } else if (loop) {
        timer = setTimeout(() => {
          if (cancelled) return;
          i = 0;
          setVisible(0);
          timer = setTimeout(step, intervalMs);
        }, 3500);
      }
    };
    timer = setTimeout(step, intervalMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [messages, loop, intervalMs]);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }, [visible]);

  return (
    <div className="rounded-xl border border-border bg-background/50">
      <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Agent Conversation</h4>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{messages.length} messages</span>
      </div>
      <div ref={containerRef} className={`p-4 space-y-3 overflow-y-auto ${maxHeightClass}`}>
        {messages.slice(0, visible).map((m, i) => {
          const agent = AGENTS.find((a) => a.address === m.agentAddress);
          return (
            <div key={i} className="flex gap-3 animate-slide-in-top">
              <img src={avatarDataUri(m.agentAddress, 32)} alt="" className="h-8 w-8 rounded-md ring-1 ring-ember/30 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-ember">{agent?.name ?? "Agent"}</span>
                </div>
                <div className="mt-1 inline-block rounded-lg rounded-tl-sm bg-card border border-border px-3 py-2 text-sm">
                  {m.message}
                </div>
              </div>
            </div>
          );
        })}
        {visible < messages.length && (
          <div className="flex gap-1 pl-11">
            <span className="h-1.5 w-1.5 rounded-full bg-ember animate-pulse" />
            <span className="h-1.5 w-1.5 rounded-full bg-ember animate-pulse" style={{ animationDelay: "150ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-ember animate-pulse" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>
    </div>
  );
}
