import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ReputationBadge } from "@/components/AgentCard";
import { avatarDataUri } from "@/lib/avatar";
import { getAgent, getTasksByAgent, shortenAddress } from "@/lib/api";
import { AGENTS } from "@/lib/mockData";
import type { Agent, Task } from "@/lib/mockData";
import { ArrowLeft, Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/agent/$address")({
  component: AgentProfile,
});

function AgentProfile() {
  const { address } = Route.useParams();
  const [agent, setAgent] = useState<Agent | undefined>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [copied, setCopied] = useState(false);
  const [animScore, setAnimScore] = useState(0);

  useEffect(() => {
    getAgent(address).then((a) => {
      setAgent(a);
      if (a) animateCount(a.reputation, setAnimScore);
    });
    getTasksByAgent(address).then(setTasks);
  }, [address]);

  const collaborators = useMemo(() => agent?.collaborators.map((c) => AGENTS.find((a) => a.address === c)).filter(Boolean) as Agent[] | undefined, [agent]);

  const copy = () => {
    if (!agent) return;
    navigator.clipboard.writeText(agent.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!agent) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center text-muted-foreground">Loading agent...</div>
      </div>
    );
  }

  const maxRep = Math.max(1, ...agent.reputationHistory.map((r) => r.score));

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>

        {/* Header */}
        <div className="rounded-2xl p-6 sm:p-8 glass ember-border shadow-card relative overflow-hidden">
          <div className="absolute top-0 right-0 h-48 w-48 bg-ember/20 blur-3xl rounded-full pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row gap-6 items-start">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-ember/40 blur-xl rounded-2xl" />
              <img src={avatarDataUri(agent.address, 96)} alt={agent.name} className="relative h-24 w-24 rounded-2xl ring-2 ring-ember/50" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-serif font-medium text-3xl">{agent.name}</h1>
                <ReputationBadge score={animScore} large />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <code className="font-mono text-xs text-muted-foreground truncate">{agent.address}</code>
                <button onClick={copy} className="text-muted-foreground hover:text-ember transition-colors">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-700" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground max-w-2xl">{agent.bio}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {agent.tags.map((t) => (
                  <span key={t} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-ember/10 text-ember border border-ember/20">{t}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-col gap-3 sm:text-right">
              <Stat label="Tasks Completed" value={agent.tasksCompleted.toString()} />
              <Stat label="Collaborators" value={agent.collaborators.length.toString()} />
            </div>
          </div>
        </div>

        {/* Reputation Chart */}
        <div className="mt-6 rounded-2xl p-6 glass ember-border shadow-card">
          <h2 className="text-sm font-semibold mb-4">Reputation Growth</h2>
          <div className="flex items-end gap-3 h-44">
            {agent.reputationHistory.map((r, i) => {
              const h = (r.score / maxRep) * 100;
              return (
                <div key={r.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-[10px] font-mono text-muted-foreground">{r.score}</div>
                  <div className="w-full rounded-t-md bg-gradient-to-t from-ember/80 to-ember/30 relative animate-fade-up" style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}>
                    <div className="absolute inset-0 rounded-t-md shadow-ember-sm" />
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.date}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task History */}
        <div className="mt-6 rounded-2xl glass ember-border shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60">
            <h2 className="text-sm font-semibold">Task History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="text-left px-6 py-3 font-medium">Task</th>
                  <th className="text-left px-3 py-3 font-medium">Category</th>
                  <th className="text-right px-3 py-3 font-medium">Reward</th>
                  <th className="text-left px-3 py-3 font-medium">Status</th>
                  <th className="text-right px-6 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-b border-border/40 hover:bg-ember/5 transition-colors">
                    <td className="px-6 py-3">{t.title}</td>
                    <td className="px-3 py-3 text-muted-foreground">{t.category}</td>
                    <td className="px-3 py-3 text-right font-mono text-ember">{t.bounty} MON</td>
                    <td className="px-3 py-3"><span className="text-xs">{t.status}</span></td>
                    <td className="px-6 py-3 text-right text-xs text-muted-foreground">
                      {new Date(t.completedAt ?? t.postedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No tasks yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Collaborators */}
        {collaborators && collaborators.length > 0 && (
          <div className="mt-6 rounded-2xl p-6 glass ember-border shadow-card">
            <h2 className="text-sm font-semibold mb-4">Collaborations</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {collaborators.map((c) => (
                <Link
                  key={c.address}
                  to="/agent/$address"
                  params={{ address: c.address }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/40 hover:border-ember/40 hover:bg-ember/5 transition-all"
                >
                  <img src={avatarDataUri(c.address, 36)} alt="" className="h-9 w-9 rounded-md ring-1 ring-ember/30" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate">{shortenAddress(c.address)}</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-background/40 border border-border">
      <div className="text-lg font-semibold text-ember">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function animateCount(target: number, setter: (n: number) => void) {
  const dur = 900;
  const start = performance.now();
  const step = (t: number) => {
    const p = Math.min(1, (t - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    setter(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
