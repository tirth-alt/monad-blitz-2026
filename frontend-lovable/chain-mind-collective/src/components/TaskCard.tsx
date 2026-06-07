import { useState } from "react";
import type { Task } from "@/lib/mockData";
import { formatTimeAgo } from "@/lib/api";
import { AGENTS } from "@/lib/mockData";
import { avatarDataUri } from "@/lib/avatar";
import { Users, Sparkles } from "lucide-react";
import { TaskDetailModal } from "./TaskDetailModal";

const categoryColors: Record<string, string> = {
  Research: "bg-green-700/10 text-green-800 border-green-700/25",
  Analysis: "bg-teal-700/10 text-teal-800 border-teal-700/25",
  Code: "bg-lime-700/10 text-lime-800 border-lime-700/30",
  Writing: "bg-emerald-700/10 text-emerald-800 border-emerald-700/25",
};

const statusColors: Record<string, string> = {
  Open: "bg-ember/15 text-ember border-ember/40",
  Assigned: "bg-amber-700/10 text-amber-800 border-amber-700/30",
  "In Progress": "bg-teal-700/10 text-teal-800 border-teal-700/25",
  Completed: "bg-green-700/12 text-green-800 border-green-700/30",
};

export function TaskCard({ task, index = 0, flash = false }: { task: Task; index?: number; flash?: boolean }) {
  const [open, setOpen] = useState(false);
  const agent = task.assignedAgent ? AGENTS.find((a) => a.address === task.assignedAgent) : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group w-full text-left rounded-xl p-4 glass ember-border shadow-card hover:shadow-ember transition-all duration-300 hover:-translate-y-0.5 animate-fade-up ${flash ? "animate-ember-flash" : ""}`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-medium text-sm leading-snug group-hover:text-ember transition-colors">{task.title}</h4>
          <div className="text-right shrink-0">
            <div className="text-base font-mono font-semibold text-ember">{task.bounty}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">MON</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${categoryColors[task.category]}`}>
            {task.category}
          </span>
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border ${statusColors[task.status]}`}>
            {task.status}
          </span>
          {task.isCollaborative && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-ember/40 bg-ember/10 text-ember inline-flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" /> Collab
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          {agent ? (
            <div className="flex items-center gap-1.5">
              <img src={avatarDataUri(agent.address, 20)} alt="" className="h-5 w-5 rounded-md" />
              <span className="truncate">{agent.name}</span>
              {task.isCollaborative && task.collaborators && (
                <span className="inline-flex items-center gap-0.5 text-ember/80">
                  <Users className="h-3 w-3" />+{task.collaborators.length - 1}
                </span>
              )}
            </div>
          ) : (
            <span className="italic">Unassigned</span>
          )}
          <span>{formatTimeAgo(task.postedAt)}</span>
        </div>
      </button>
      {open && <TaskDetailModal task={task} onClose={() => setOpen(false)} />}
    </>
  );
}
