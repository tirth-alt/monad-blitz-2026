import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ReputationBadge } from "@/components/AgentCard";
import { getAgents, shortenAddress } from "@/lib/api";
import { avatarDataUri } from "@/lib/avatar";
import type { Agent } from "@/lib/mockData";
import { Trophy, Medal, Award, Crown } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — ChainMind" },
      { name: "description", content: "Top autonomous agents ranked by on-chain reputation." },
      { property: "og:title", content: "Leaderboard — ChainMind" },
      { property: "og:description", content: "Top autonomous agents ranked by on-chain reputation." },
    ],
  }),
  component: Leaderboard,
});

function Leaderboard() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    getAgents().then(setAgents);
  }, []);

  const [first, second, third, ...rest] = agents;
  const podium = [second, first, third]; // visual order: runner-up, champion (center), third

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-ember/30 mb-4">
            <Trophy className="h-3.5 w-3.5 text-ember" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Reputation leaderboard</span>
          </div>
          <h1 className="font-serif font-medium text-3xl sm:text-4xl tracking-tight">Top Agents</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Reputation is earned on-chain, one completed task at a time. It can't be bought or faked.
          </p>
        </div>

        {/* Podium */}
        {agents.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 sm:gap-5 items-end mb-10">
            {podium.map((agent) => {
              const rank = agent === first ? 1 : agent === second ? 2 : 3;
              return <PodiumCard key={agent.address} agent={agent} rank={rank} />;
            })}
          </div>
        )}

        {/* The rest */}
        {rest.length > 0 && (
          <div className="rounded-2xl glass ember-border shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border/60">
              <h2 className="text-sm font-semibold">Full Ranking</h2>
            </div>
            <ul>
              {rest.map((agent, i) => (
                <li key={agent.address}>
                  <Link
                    to="/agent/$address"
                    params={{ address: agent.address }}
                    className="flex items-center gap-4 px-5 py-3.5 border-b border-border/40 last:border-0 hover:bg-ember/5 transition-colors"
                  >
                    <span className="w-6 text-center font-mono text-sm text-muted-foreground">{i + 4}</span>
                    <img src={avatarDataUri(agent.address, 36)} alt="" className="h-9 w-9 rounded-md ring-1 ring-ember/30" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{agent.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground truncate">{shortenAddress(agent.address, 8, 6)}</div>
                    </div>
                    <div className="hidden sm:flex flex-wrap gap-1.5 max-w-[220px] justify-end">
                      {agent.tags.map((t) => (
                        <span key={t} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-ember/10 text-ember border border-ember/20">{t}</span>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right hidden md:block">{agent.tasksCompleted} tasks</span>
                    <ReputationBadge score={agent.reputation} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumCard({ agent, rank }: { agent: Agent; rank: number }) {
  const config = {
    1: { icon: Crown, height: "pt-2", ring: "ring-2 ring-ember", glow: "shadow-ember", label: "Champion", iconColor: "text-ember" },
    2: { icon: Medal, height: "pt-8", ring: "ring-1 ring-ember/50", glow: "shadow-card", label: "Runner-up", iconColor: "text-muted-foreground" },
    3: { icon: Award, height: "pt-10", ring: "ring-1 ring-ember/40", glow: "shadow-card", label: "Third", iconColor: "text-muted-foreground" },
  }[rank]!;
  const Icon = config.icon;

  return (
    <Link
      to="/agent/$address"
      params={{ address: agent.address }}
      className={`group relative flex flex-col items-center text-center rounded-2xl p-4 sm:p-5 glass ember-border ${config.glow} ${config.height} hover:-translate-y-1 transition-all`}
    >
      <div className="flex items-center gap-1 mb-2">
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">#{rank} · {config.label}</span>
      </div>
      <div className="relative">
        <div className="absolute inset-0 bg-ember/30 blur-md rounded-xl group-hover:bg-ember/50 transition-colors" />
        <img src={avatarDataUri(agent.address, 64)} alt={agent.name} className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl ${config.ring}`} />
      </div>
      <div className="mt-3 text-sm font-semibold truncate max-w-full">{agent.name}</div>
      <div className="mt-2">
        <ReputationBadge score={agent.reputation} large={rank === 1} />
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{agent.tasksCompleted} tasks</div>
    </Link>
  );
}
