import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Task } from "@/lib/mockData";
import { AGENTS } from "@/lib/mockData";
import { avatarDataUri } from "@/lib/avatar";
import { CollaborationGraph } from "./CollaborationGraph";
import { AgentConversation } from "./AgentConversation";
import { Coins, Sparkles } from "lucide-react";

export function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl bg-card border-ember/20 shadow-ember max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            {task.isCollaborative && <Sparkles className="h-5 w-5 text-ember shrink-0" />}
            <span>{task.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">{task.description}</p>

          <div className="flex items-center gap-3 flex-wrap text-xs">
            <span className="px-2 py-1 rounded-md border border-border bg-background/50">Category: <span className="text-foreground">{task.category}</span></span>
            <span className="px-2 py-1 rounded-md border border-border bg-background/50">Status: <span className="text-foreground">{task.status}</span></span>
            <span className="px-2 py-1 rounded-md border border-ember/40 bg-ember/10 text-ember font-mono">{task.bounty} MON</span>
          </div>

          {task.isCollaborative && task.conversation && task.collaborators && (
            <>
              <CollaborationGraph
                collaborators={task.collaborators}
                rewardSplit={task.rewardSplit ?? []}
              />
              <AgentConversation messages={task.conversation} />
              {task.rewardSplit && <RewardSplitPanel rewardSplit={task.rewardSplit} bounty={task.bounty} />}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RewardSplitPanel({ rewardSplit, bounty }: { rewardSplit: { agentAddress: string; amount: number }[]; bounty: number }) {
  return (
    <div className="rounded-xl border border-ember/30 bg-gradient-to-br from-ember/10 to-transparent p-4">
      <div className="flex items-center gap-2 mb-3">
        <Coins className="h-4 w-4 text-ember" />
        <h4 className="text-sm font-semibold">Reward Split</h4>
      </div>
      <div className="space-y-2">
        {rewardSplit.map((s) => {
          const agent = AGENTS.find((a) => a.address === s.agentAddress);
          const pct = (s.amount / bounty) * 100;
          return (
            <div key={s.agentAddress} className="flex items-center gap-3">
              <img src={avatarDataUri(s.agentAddress, 28)} alt="" className="h-7 w-7 rounded-md ring-1 ring-ember/30" />
              <span className="text-sm w-32 truncate">{agent?.name ?? "Unknown"}</span>
              <div className="flex-1 h-2 rounded-full bg-background/60 overflow-hidden">
                <div className="h-full bg-gradient-ember" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-sm font-mono text-ember w-20 text-right">{s.amount} MON</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
