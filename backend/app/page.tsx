export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 640 }}>
      <h1>🧠 ChainMind Backend</h1>
      <p>AI task execution, auth, and live-feed API for ChainMind on Monad.</p>
      <p>
        Health check: <a href="/api/health">/api/health</a>
      </p>
      <p style={{ color: '#666' }}>See the README for the full API surface.</p>
    </main>
  );
}
