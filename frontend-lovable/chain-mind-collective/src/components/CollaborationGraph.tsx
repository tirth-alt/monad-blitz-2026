import { AGENTS, type RewardSplit } from "@/lib/mockData";
import { avatarDataUri } from "@/lib/avatar";

export function CollaborationGraph({ collaborators, rewardSplit }: { collaborators: string[]; rewardSplit: RewardSplit[] }) {
  const size = 280;
  const center = size / 2;
  const radius = 90;
  const leadAddr = collaborators[0];
  const others = collaborators.slice(1);
  // Position lead in center; others on a circle
  const positions: Record<string, { x: number; y: number }> = { [leadAddr]: { x: center, y: center } };
  others.forEach((addr, i) => {
    const angle = (Math.PI * 2 * i) / others.length - Math.PI / 2;
    positions[addr] = { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius };
  });

  return (
    <div className="rounded-xl border border-border bg-background/50 p-4">
      <h4 className="text-sm font-semibold mb-3">Collaboration Graph</h4>
      <div className="flex items-center justify-center">
        <svg width={size} height={size} className="overflow-visible">
          <defs>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4F7A52" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#9CB07F" stopOpacity="0.4" />
            </linearGradient>
            <radialGradient id="nodeGlow">
              <stop offset="0%" stopColor="#7BA06A" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#7BA06A" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Edges — base line, flowing dashes, and a reward token travelling lead → specialist */}
          {others.map((addr) => {
            const split = rewardSplit.find((r) => r.agentAddress === addr);
            const lead = positions[leadAddr];
            const p = positions[addr];
            return (
              <g key={addr}>
                <line
                  x1={lead.x} y1={lead.y} x2={p.x} y2={p.y}
                  stroke="url(#edgeGrad)" strokeWidth={2}
                  className="animate-pulse-edge"
                />
                <line
                  x1={lead.x} y1={lead.y} x2={p.x} y2={p.y}
                  stroke="#6B8E5A" strokeWidth={2} strokeLinecap="round"
                  className="animate-flow"
                />
                {split && (
                  <circle r={3.5} fill="#4F7A52">
                    <animateMotion
                      dur="2.2s"
                      repeatCount="indefinite"
                      path={`M${lead.x},${lead.y} L${p.x},${p.y}`}
                    />
                  </circle>
                )}
                {split && (
                  <text
                    x={(lead.x + p.x) / 2}
                    y={(lead.y + p.y) / 2 - 6}
                    fontSize="10"
                    fill="#3F6443"
                    textAnchor="middle"
                    className="font-mono font-semibold"
                  >
                    {split.amount} MON
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {collaborators.map((addr) => {
            const p = positions[addr];
            const agent = AGENTS.find((a) => a.address === addr);
            const isLead = addr === leadAddr;
            return (
              <g key={addr} transform={`translate(${p.x}, ${p.y})`}>
                <circle r={isLead ? 32 : 26} fill="url(#nodeGlow)" />
                <image
                  href={avatarDataUri(addr, 48)}
                  x={isLead ? -22 : -18}
                  y={isLead ? -22 : -18}
                  width={isLead ? 44 : 36}
                  height={isLead ? 44 : 36}
                  className="rounded-lg"
                />
                <rect
                  x={isLead ? -22 : -18} y={isLead ? -22 : -18}
                  width={isLead ? 44 : 36} height={isLead ? 44 : 36}
                  rx="6" fill="none" stroke="#4F7A52" strokeWidth={isLead ? 2 : 1.5}
                />
                <text y={isLead ? 36 : 30} fontSize="10" fill="#2E3A2A" textAnchor="middle" className="font-medium">
                  {agent?.name}
                </text>
                {isLead && (
                  <text y={-28} fontSize="9" fill="#3F6443" textAnchor="middle" className="uppercase tracking-wider font-semibold">
                    Lead
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
