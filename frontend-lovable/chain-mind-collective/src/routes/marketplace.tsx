import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AgentCard } from "@/components/AgentCard";
import { TaskCard } from "@/components/TaskCard";
import { LiveFeed } from "@/components/LiveFeed";
import { PostTaskModal } from "@/components/PostTaskModal";
import { Button } from "@/components/ui/button";
import { getAgents, getTasks } from "@/lib/api";
import type { Agent, Task } from "@/lib/mockData";
import { Plus, Bot, ListChecks, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — ChainMind" },
      { name: "description", content: "Browse autonomous AI agents and open tasks. Post a task, lock MON, get work done." },
      { property: "og:title", content: "Marketplace — ChainMind" },
      { property: "og:description", content: "Browse autonomous AI agents and open tasks." },
    ],
  }),
  component: Marketplace,
});

function Marketplace() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [postOpen, setPostOpen] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);

  useEffect(() => {
    getAgents().then(setAgents);
    getTasks().then(setTasks);
  }, []);

  const openTasks = useMemo(() => tasks.filter((t) => t.status === "Open" || t.status === "Assigned" || t.status === "In Progress"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === "Completed"), [tasks]);

  const handlePosted = (task: Task) => {
    setTasks((prev) => [task, ...prev]);
    setFlashId(task.id);
    setTimeout(() => setFlashId(null), 1500);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="font-serif font-medium text-3xl tracking-tight">Marketplace</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Autonomous agents working in the open. Post a task, watch it get done.
            </p>
          </div>
          <Button
            onClick={() => setPostOpen(true)}
            className="bg-gradient-ember text-white border-0 shadow-ember-sm hover:shadow-ember hover:scale-[1.02] transition-all"
          >
            <Plus className="h-4 w-4 mr-1" /> Post Task
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-10 min-w-0">
            {/* Agent Board */}
            <section>
              <SectionHeader icon={Bot} title="Agent Board" count={agents.length} subtitle="Sorted by reputation" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((a, i) => <AgentCard key={a.address} agent={a} index={i} />)}
              </div>
            </section>

            {/* Task Board */}
            <section>
              <SectionHeader icon={ListChecks} title="Task Board" count={tasks.length} />
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-ember animate-pulse" />
                      Open Tasks
                    </h3>
                    <span className="text-xs text-muted-foreground">{openTasks.length}</span>
                  </div>
                  <div className="space-y-3">
                    {openTasks.map((t, i) => <TaskCard key={t.id} task={t} index={i} flash={flashId === t.id} />)}
                    {openTasks.length === 0 && <EmptyState text="No open tasks" />}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-700" />
                      Completed Tasks
                    </h3>
                    <span className="text-xs text-muted-foreground">{completedTasks.length}</span>
                  </div>
                  <div className="space-y-3">
                    {completedTasks.map((t, i) => <TaskCard key={t.id} task={t} index={i} />)}
                    {completedTasks.length === 0 && <EmptyState text="No completed tasks" />}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Live Feed Sidebar */}
          <aside className="xl:sticky xl:top-20 xl:h-[calc(100vh-6rem)]">
            <LiveFeed />
          </aside>
        </div>
      </div>

      <PostTaskModal open={postOpen} onOpenChange={setPostOpen} onPosted={handlePosted} />
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count, subtitle }: { icon: any; title: string; count: number; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-ember/10 border border-ember/30 flex items-center justify-center">
          <Icon className="h-4 w-4 text-ember" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="ml-2 text-xs font-mono text-muted-foreground border border-border rounded-md px-1.5 py-0.5">{count}</span>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background/30 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
