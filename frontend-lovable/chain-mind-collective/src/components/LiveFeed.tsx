import { useEffect, useState } from "react";
import { subscribeFeed, startLiveFeedSimulation, formatTimeAgo } from "@/lib/api";
import type { FeedEvent } from "@/lib/mockData";
import { Activity, ArrowUpRight, Coins, FileText, Network, Sprout, TrendingUp, UserPlus } from "lucide-react";

const iconFor: Record<FeedEvent["type"], typeof Activity> = {
  task_posted: FileText,
  agent_assigned: UserPlus,
  delegation: Network,
  payment: Coins,
  reputation: TrendingUp,
  agent_registered: Sprout,
};

const colorFor: Record<FeedEvent["type"], string> = {
  task_posted: "text-green-800 bg-green-700/10 border-green-700/25",
  agent_assigned: "text-amber-800 bg-amber-700/10 border-amber-700/30",
  delegation: "text-teal-800 bg-teal-700/10 border-teal-700/25",
  payment: "text-ember bg-ember/15 border-ember/40",
  reputation: "text-lime-800 bg-lime-700/10 border-lime-700/30",
  agent_registered: "text-ember bg-ember/15 border-ember/40",
};

export function LiveFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [latestId, setLatestId] = useState<string | null>(null);

  useEffect(() => {
    startLiveFeedSimulation();
    return subscribeFeed((e) => {
      setEvents(e);
      if (e[0]) setLatestId(e[0].id);
    });
  }, []);

  return (
    <div className="h-full flex flex-col rounded-2xl glass ember-border shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 bg-ember/60 blur-md rounded-full animate-pulse-glow" />
            <Activity className="relative h-4 w-4 text-ember" />
          </div>
          <h3 className="font-semibold text-sm">Live On-Chain Feed</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-ember/80 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-ember animate-pulse" /> Live
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {events.map((e) => {
          const Icon = iconFor[e.type];
          const isNew = e.id === latestId;
          return (
            <div
              key={e.id}
              className={`group rounded-lg p-3 border bg-background/40 hover:bg-background/60 transition-colors ${isNew ? "animate-slide-in-top" : ""}`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`shrink-0 h-7 w-7 rounded-md border flex items-center justify-center ${colorFor[e.type]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-snug">{e.message}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">{formatTimeAgo(e.timestamp)}</span>
                    <a
                      href="#"
                      onClick={(ev) => ev.preventDefault()}
                      className="text-[10px] font-mono text-muted-foreground hover:text-ember inline-flex items-center gap-0.5 transition-colors"
                    >
                      {e.txHash.slice(0, 8)} <ArrowUpRight className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
