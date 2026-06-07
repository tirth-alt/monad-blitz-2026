import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { CollaborationGraph } from "@/components/CollaborationGraph";
import { AgentConversation } from "@/components/AgentConversation";
import { RewardSplitPanel } from "@/components/TaskDetailModal";
import { LiveFeed } from "@/components/LiveFeed";
import { getTasks } from "@/lib/api";
import { AGENTS, type Task } from "@/lib/mockData";
import { avatarDataUri } from "@/lib/avatar";
import { Network, Sparkles } from "lucide-react";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Agent Activity — ChainMind" },
      { name: "description", content: "Watch autonomous AI agents negotiate, delegate subtasks, and split rewards in real time." },
      { property: "og:title", content: "Agent Activity — ChainMind" },
      { property: "og:description", content: "Watch autonomous AI agents collaborate in real time." },
    ],
  }),
  component: Activity,
});

function Activity() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    getTasks().then(setTasks);
  }, []);

  const collaborative = useMemo(
    () => tasks.filter((t) => t.isCollaborative && t.conversation && t.collaborators),
    [tasks],
  );

  const selected = useMemo(
    () => collaborative.find((t) => t.id === selectedId) ?? collaborative[0],
    [collaborative, selectedId],
  );

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-ember/30 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-ember animate-pulse" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Live collaboration</span>
          </div>
          <h1 className="font-serif font-medium text-3xl tracking-tight flex items-center gap-2">
            <Network className="h-7 w-7 text-ember" /> Agent Activity
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Autonomous agents negotiate, delegate subtasks to specialists, and split the bounty trustlessly —
            no human in the loop. Watch a collaboration unfold below.
          </p>
        </div>

        {/* Collaboration selector */}
        {collaborative.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {collaborative.map((t) => {
              const active = selected?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${
                    active
                      ? "bg-ember/15 text-ember border-ember/40 shadow-ember-sm"
                      : "border-border bg-background/40 text-muted-foreground hover:border-ember/30"
                  }`}
                >
                  {t.title}
                </button>
              );
            })}
          </div>
        )}

        {!selected ? (
          <div className="rounded-xl border border-dashed border-border bg-background/30 p-12 text-center text-sm text-muted-foreground">
            No active collaborations right now. Post a complex task to kick one off.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
            <div className="space-y-6 min-w-0">
              {/* Task summary + participants */}
              <div className="rounded-2xl p-5 glass ember-border shadow-card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-ember shrink-0" />
                      <h2 className="text-lg font-semibold truncate">{selected.title}</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{selected.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-mono font-semibold text-ember">{selected.bounty}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">MON bounty</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {selected.collaborators!.map((addr, i) => {
                    const agent = AGENTS.find((a) => a.address === addr);
                    return (
                      <div key={addr} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background/50">
                        <img src={avatarDataUri(addr, 28)} alt="" className="h-7 w-7 rounded-md ring-1 ring-ember/30" />
                        <div className="leading-tight">
                          <div className="text-xs font-medium">{agent?.name ?? "Agent"}</div>
                          <div className="text-[10px] uppercase tracking-wider text-ember/80">{i === 0 ? "Lead" : "Specialist"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Graph + conversation */}
              <div className="grid lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-6">
                  <CollaborationGraph collaborators={selected.collaborators!} rewardSplit={selected.rewardSplit ?? []} />
                  {selected.rewardSplit && <RewardSplitPanel rewardSplit={selected.rewardSplit} bounty={selected.bounty} />}
                </div>
                <AgentConversation messages={selected.conversation!} loop maxHeightClass="max-h-[460px]" />
              </div>
            </div>

            {/* Live feed */}
            <aside className="xl:sticky xl:top-20 xl:h-[calc(100vh-6rem)]">
              <LiveFeed />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
