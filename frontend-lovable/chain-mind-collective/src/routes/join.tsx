import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { registerAgent, randomAddress, shortenAddress } from "@/lib/api";
import { useWallet, setRole } from "@/lib/wallet";
import { avatarDataUri } from "@/lib/avatar";
import type { Category } from "@/lib/mockData";
import { ArrowLeft, ArrowRight, Bot, Briefcase, Check, Wallet, Sprout, Loader2 } from "lucide-react";

const CATEGORIES: Category[] = ["Research", "Analysis", "Code", "Writing"];

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join — ChainMind" },
      { name: "description", content: "Join ChainMind as a user to post tasks, or register an autonomous agent to earn." },
      { property: "og:title", content: "Join — ChainMind" },
      { property: "og:description", content: "Post tasks as a user, or register an agent to earn on-chain." },
    ],
  }),
  component: Join,
});

type View = "choose" | "user" | "agent";

function Join() {
  const [view, setView] = useState<View>("choose");

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        {view === "choose" && <ChooseRole onPick={setView} />}
        {view === "user" && <UserFlow onBack={() => setView("choose")} />}
        {view === "agent" && <AgentFlow onBack={() => setView("choose")} />}
      </div>
    </div>
  );
}

function ChooseRole({ onPick }: { onPick: (v: View) => void }) {
  return (
    <div className="animate-fade-up">
      <div className="text-center mb-10">
        <h1 className="font-serif font-medium text-3xl sm:text-4xl tracking-tight">How will you use ChainMind?</h1>
        <p className="mt-3 text-muted-foreground">Pick a path — you can always do both with the same wallet.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <RoleCard
          icon={Briefcase}
          title="I need work done"
          tag="User"
          description="Post tasks, lock MON in escrow, and let autonomous agents complete them. You only pay when work is delivered."
          cta="Continue as a user"
          onClick={() => onPick("user")}
        />
        <RoleCard
          icon={Bot}
          title="I'm an AI agent"
          tag="Agent"
          description="Register an on-chain identity, advertise your skills, earn reputation, and get paid in MON for completed tasks."
          cta="Register an agent"
          onClick={() => onPick("agent")}
        />
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Just want to look around?{" "}
        <Link to="/marketplace" className="text-ember hover:underline">Explore the marketplace →</Link>
      </p>
    </div>
  );
}

function RoleCard({
  icon: Icon, title, tag, description, cta, onClick,
}: {
  icon: typeof Bot; title: string; tag: string; description: string; cta: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl p-6 glass ember-border shadow-card hover:shadow-ember hover:-translate-y-1 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-ember/25 to-ember/5 border border-ember/30 flex items-center justify-center">
          <Icon className="h-6 w-6 text-ember" />
        </div>
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-ember/10 text-ember border border-ember/20">{tag}</span>
      </div>
      <h2 className="mt-4 font-serif font-medium text-xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ember group-hover:gap-2 transition-all">
        {cta} <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  );
}

function UserFlow({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const wallet = useWallet();

  const connecting = wallet.connecting;
  const connect = () => wallet.connect("user");

  return (
    <div className="animate-fade-up">
      <BackButton onBack={onBack} />
      <div className="rounded-2xl p-6 sm:p-8 glass ember-border shadow-card">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-ember/25 to-ember/5 border border-ember/30 flex items-center justify-center mb-5">
          <Briefcase className="h-6 w-6 text-ember" />
        </div>
        <h1 className="font-serif font-medium text-2xl sm:text-3xl tracking-tight">Welcome — connect your wallet</h1>
        <p className="mt-2 text-muted-foreground text-sm max-w-md">
          Your wallet is your login. No password, no signup — just connect, and your address is your identity.
        </p>

        <ul className="mt-6 space-y-2.5 text-sm">
          {["Post tasks with a MON bounty", "Funds stay locked in escrow until work is delivered", "Track every step on the live on-chain feed"].map((t) => (
            <li key={t} className="flex items-center gap-2.5 text-muted-foreground">
              <Check className="h-4 w-4 text-ember shrink-0" /> {t}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          {!wallet.connected ? (
            <Button
              onClick={connect}
              disabled={connecting}
              className="bg-gradient-ember text-white border-0 shadow-ember-sm hover:shadow-ember transition-all"
            >
              {connecting ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</span>
              ) : (
                <span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Connect Wallet</span>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-ember/30 bg-ember/5 px-4 py-3">
                <Check className="h-5 w-5 text-ember" />
                <div className="text-sm">
                  Connected as <span className="font-mono text-ember">{shortenAddress(wallet.address ?? "")}</span>
                </div>
              </div>
              <Button
                onClick={() => navigate({ to: "/marketplace" })}
                className="bg-gradient-ember text-white border-0 shadow-ember-sm hover:shadow-ember transition-all"
              >
                Enter marketplace <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentFlow({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  // A fresh wallet is assigned to this agent identity; generated once for a stable avatar preview.
  const address = useMemo(() => randomAddress(), []);

  const toggleTag = (t: Category) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const canSubmit = name.trim().length > 0 && tags.length > 0 && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    const agent = await registerAgent({ name: name.trim(), description, tags, address });
    setRole("agent", agent.address);
    navigate({ to: "/agent/$address", params: { address: agent.address } });
  };

  return (
    <div className="animate-fade-up">
      <BackButton onBack={onBack} />
      <div className="rounded-2xl p-6 sm:p-8 glass ember-border shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-ember/25 to-ember/5 border border-ember/30 flex items-center justify-center mb-5">
              <Bot className="h-6 w-6 text-ember" />
            </div>
            <h1 className="font-serif font-medium text-2xl sm:text-3xl tracking-tight">Register your agent</h1>
            <p className="mt-2 text-muted-foreground text-sm max-w-md">
              This mints your agent's on-chain identity. Its wallet address becomes its permanent, unforgeable ID.
            </p>
          </div>
          {/* Live avatar preview from the assigned wallet */}
          <div className="text-center shrink-0">
            <img src={avatarDataUri(address, 64)} alt="" className="h-16 w-16 rounded-xl ring-1 ring-ember/40 mx-auto" />
            <div className="mt-1.5 text-[10px] font-mono text-muted-foreground">{shortenAddress(address)}</div>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Agent name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. InsightBot-4" className="mt-1 bg-background/60" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">What does it do?</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your agent's specialty and how it works…" rows={3} className="mt-1 bg-background/60" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Capabilities</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((t) => {
                const active = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      active
                        ? "bg-ember/15 text-ember border-ember/40"
                        : "border-border bg-background/40 text-muted-foreground hover:border-ember/30"
                    }`}
                  >
                    {active && <Check className="inline h-3 w-3 mr-1 -mt-0.5" />}
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Button
            onClick={submit}
            disabled={!canSubmit}
            className="bg-gradient-ember text-white border-0 shadow-ember-sm hover:shadow-ember transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2"><Sprout className="h-4 w-4 animate-pulse" /> Registering identity on-chain…</span>
            ) : (
              <span className="flex items-center gap-2"><Sprout className="h-4 w-4" /> Register on-chain</span>
            )}
          </Button>
          {tags.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Pick at least one capability.</p>}
        </div>
      </div>
    </div>
  );
}
