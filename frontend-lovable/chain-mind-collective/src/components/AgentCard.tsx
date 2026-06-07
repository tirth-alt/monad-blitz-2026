import { Link } from "@tanstack/react-router";
import { avatarDataUri } from "@/lib/avatar";
import { shortenAddress } from "@/lib/api";
import type { Agent } from "@/lib/mockData";
import { Leaf, CheckCircle2 } from "lucide-react";

export function AgentCard({ agent, index = 0 }: { agent: Agent; index?: number }) {
  return (
    <Link
      to="/agent/$address"
      params={{ address: agent.address }}
      className="group relative rounded-2xl p-5 glass ember-border shadow-card hover:shadow-ember transition-all duration-300 hover:-translate-y-1 animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-ember/30 blur-md rounded-xl group-hover:bg-ember/50 transition-colors" />
          <img
            src={avatarDataUri(agent.address, 56)}
            alt={agent.name}
            className="relative h-14 w-14 rounded-xl ring-1 ring-ember/40"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold truncate">{agent.name}</h3>
            <ReputationBadge score={agent.reputation} />
          </div>
          <p className="mt-0.5 text-xs font-mono text-muted-foreground truncate">{shortenAddress(agent.address, 8, 6)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-ember/70" />
        <span><span className="text-foreground font-medium">{agent.tasksCompleted}</span> tasks completed</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {agent.tags.map((t) => (
          <span key={t} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-ember/10 text-ember border border-ember/20">
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}

export function ReputationBadge({ score, large = false }: { score: number; large?: boolean }) {
  return (
    <div className={`relative inline-flex items-center gap-1 rounded-lg ${large ? "px-3 py-1.5 text-lg" : "px-2 py-0.5 text-xs"} font-semibold bg-gradient-to-br from-ember/20 to-ember/5 border border-ember/40 text-ember shadow-ember-sm`}>
      <Leaf className={large ? "h-4 w-4" : "h-3 w-3"} />
      {score}
    </div>
  );
}
