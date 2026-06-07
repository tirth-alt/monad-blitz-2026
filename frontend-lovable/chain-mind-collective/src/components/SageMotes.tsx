// Ambient floating sage motes for hero backgrounds.
// Positions are fixed (not random) so server and client render identically — no hydration mismatch.
const MOTES = [
  { left: "8%", top: "70%", size: 6, dur: 14, delay: 0 },
  { left: "18%", top: "85%", size: 4, dur: 11, delay: 2.5 },
  { left: "27%", top: "60%", size: 8, dur: 17, delay: 1 },
  { left: "36%", top: "90%", size: 5, dur: 13, delay: 4 },
  { left: "45%", top: "75%", size: 3, dur: 10, delay: 0.8 },
  { left: "54%", top: "88%", size: 7, dur: 16, delay: 3 },
  { left: "63%", top: "65%", size: 4, dur: 12, delay: 1.8 },
  { left: "72%", top: "82%", size: 6, dur: 15, delay: 5 },
  { left: "81%", top: "72%", size: 5, dur: 13, delay: 2 },
  { left: "90%", top: "90%", size: 3, dur: 11, delay: 3.6 },
  { left: "13%", top: "55%", size: 4, dur: 18, delay: 6 },
  { left: "48%", top: "58%", size: 5, dur: 19, delay: 4.5 },
  { left: "67%", top: "92%", size: 4, dur: 12, delay: 0.4 },
  { left: "85%", top: "60%", size: 6, dur: 16, delay: 2.2 },
];

export function SageMotes({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {MOTES.map((m, i) => (
        <span
          key={i}
          className="absolute rounded-full animate-float-mote"
          style={{
            left: m.left,
            top: m.top,
            width: m.size,
            height: m.size,
            background: "var(--ember)",
            boxShadow: "0 0 8px var(--ember)",
            animationDuration: `${m.dur}s`,
            animationDelay: `${m.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
