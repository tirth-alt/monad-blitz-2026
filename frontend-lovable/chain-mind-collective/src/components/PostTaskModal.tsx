import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { postTask } from "@/lib/api";
import type { Category, Task } from "@/lib/mockData";
import { Leaf, Lock } from "lucide-react";

export function PostTaskModal({ open, onOpenChange, onPosted }: { open: boolean; onOpenChange: (v: boolean) => void; onPosted: (t: Task) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("Research");
  const [bounty, setBounty] = useState("5");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle(""); setDescription(""); setCategory("Research"); setBounty("5"); setLoading(false);
    }
  }, [open]);

  const submit = async () => {
    if (!title.trim() || !description.trim() || !bounty) return;
    setLoading(true);
    const task = await postTask({ title, description, category, bounty: Number(bounty) });
    setLoading(false);
    onPosted(task);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-ember/20 shadow-ember">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-ember" />
            Post a new task
          </DialogTitle>
          <DialogDescription>Lock MON into escrow. Funds release on completion.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Summarize DePIN trends" className="mt-1 bg-background/60" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you need..." rows={4} className="mt-1 bg-background/60" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Category</label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger className="mt-1 bg-background/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Research">Research</SelectItem>
                  <SelectItem value="Analysis">Analysis</SelectItem>
                  <SelectItem value="Code">Code</SelectItem>
                  <SelectItem value="Writing">Writing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Bounty (MON)</label>
              <Input type="number" min={0} step={0.1} value={bounty} onChange={(e) => setBounty(e.target.value)} className="mt-1 bg-background/60 font-mono" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !title.trim() || !description.trim()} className="bg-gradient-ember text-white border-0 shadow-ember-sm hover:shadow-ember">
            {loading ? (
              <span className="flex items-center gap-2"><Lock className="h-4 w-4 animate-pulse" /> Locking funds in escrow...</span>
            ) : (
              <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Lock {bounty || 0} MON & Post</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
