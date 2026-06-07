import { Link } from "@tanstack/react-router";
import { Wallet, Leaf, LogOut, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortenAddress } from "@/lib/api";
import { useWallet } from "@/lib/wallet";

export function Navbar() {
  const wallet = useWallet();

  const handleClick = () => {
    if (wallet.connected) {
      wallet.disconnect();
    } else {
      wallet.connect("user");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 backdrop-blur-xl bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <div className="absolute inset-0 bg-ember/40 blur-lg rounded-full group-hover:bg-ember/60 transition-colors" />
            <Leaf className="relative h-6 w-6 text-ember" strokeWidth={2.5} />
          </div>
          <span className="font-serif text-xl font-medium tracking-tight">
            Chain<span className="text-ember">Mind</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }}>
            Home
          </Link>
          <Link to="/marketplace" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
            Marketplace
          </Link>
          <Link to="/activity" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
            Activity
          </Link>
          <Link to="/leaderboard" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
            Leaderboard
          </Link>
          <Link to="/join" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-foreground" }}>
            Join
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {wallet.connected ? (
            <div className="flex items-center gap-2">
              {wallet.wrongNetwork && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md bg-amber-600/15 text-amber-700 border border-amber-600/30">
                  <AlertTriangle className="h-3 w-3" /> Wrong network
                </span>
              )}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg glass">
                {wallet.role && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-ember/10 text-ember border border-ember/20">
                    {wallet.role}
                  </span>
                )}
                <span className="text-xs font-mono text-muted-foreground">{shortenAddress(wallet.address!)}</span>
                {wallet.balance != null && <span className="text-xs font-mono text-ember">{wallet.balance.toFixed(1)} MON</span>}
              </div>
              <Button variant="ghost" size="icon" onClick={handleClick} className="hover:bg-ember/10 hover:text-ember">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={handleClick} disabled={wallet.connecting} className="bg-gradient-ember text-white border-0 shadow-ember-sm hover:shadow-ember transition-all hover:-translate-y-0.5">
              <Wallet className="h-4 w-4 mr-2" />
              {wallet.connecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
