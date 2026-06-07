/**
 * Seeds the deployed contracts with demo data so the marketplace looks alive:
 *   - 3 agents (DataBot-7, ResearchBot-3, WriterAgent-12), each registered from its OWN wallet
 *   - varied reputation, built by running REAL post -> assign -> complete cycles
 *
 *   Local: npm run deploy:local && npm run seed:local   (needs `npm run node` running)
 *   Monad: npm run deploy:monad && npm run seed:monad   (needs funded PRIVATE_KEY)
 *
 * Reads contract addresses from /lib/contracts/addresses.json (written by deploy.js), so it
 * must run AFTER a deploy on the SAME network. Agent wallets are generated once and persisted
 * to contracts/.seeded-agents.json (gitignored) so re-runs reuse the same agents.
 *
 * Requires the deployer to also be the marketplace `verifier` (the default), since seeding
 * calls assignTask/completeTask.
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// name, description, tags, how many completed tasks to give them
const AGENTS = [
  { name: "DataBot-7", description: "Data analysis specialist", tags: ["analysis", "research"], completions: 6 },
  { name: "ResearchBot-3", description: "Deep research agent", tags: ["research", "writing"], completions: 4 },
  { name: "WriterAgent-12", description: "Long-form writing agent", tags: ["writing"], completions: 0 },
];

const REWARD = "0.001"; // MON per seeded task (kept tiny; flows to the agent)
const GAS_TOPUP = "0.12"; // MON per agent — only needs ~1 register tx (verifier pays the cycles)
const GAS_FLOOR = "0.08"; // top up if the agent's balance drops below this
const DEADLINE = 3600; // 1h
// Explicit gas limit so Monad's gasLimit*maxFee pre-check doesn't over-reserve and (wrongly)
// reject txs as "insufficient balance". Tight margin above actual usage (~320k for register)
// so the reservation stays well below the agent's 0.6 MON funding even when fees spike.
const GAS = { gasLimit: 600_000n };

async function main() {
  const { ethers, network, artifacts } = hre;
  const [deployer] = await ethers.getSigners();

  const addrs = loadAddresses();
  console.log(`\n── Seeding ChainMind on "${network.name}" (chainId ${addrs.chainId}) ──`);
  console.log("Deployer/verifier:", deployer.address);

  const registry = await contractAt(ethers, artifacts, "AgentRegistry", addrs.AgentRegistry, deployer);
  const reputation = await contractAt(ethers, artifacts, "ReputationStore", addrs.ReputationStore, deployer);
  const marketplace = await contractAt(ethers, artifacts, "TaskMarketplace", addrs.TaskMarketplace, deployer);

  // Sanity: the deployer must be the verifier to assign/complete during seeding.
  const verifier = await marketplace.verifier();
  if (verifier.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Deployer is not the marketplace verifier (${verifier}). Seed with the verifier key.`);
  }
  const threshold = await marketplace.reputationThreshold();

  const wallets = loadOrCreateAgentWallets(ethers, addrs.chainId, AGENTS.length);

  for (let i = 0; i < AGENTS.length; i++) {
    const spec = AGENTS[i];
    const wallet = wallets[i].connect(ethers.provider);
    console.log(`\n• ${spec.name} → ${wallet.address}`);

    // 1) Top up gas if needed.
    const bal = await ethers.provider.getBalance(wallet.address);
    if (bal < ethers.parseEther(GAS_FLOOR)) {
      await (await deployer.sendTransaction({ to: wallet.address, value: ethers.parseEther(GAS_TOPUP) })).wait();
      console.log(`  funded ${GAS_TOPUP} MON for gas`);
    }

    // 2) Register (idempotent — skip if already registered).
    if (!(await registry.isRegistered(wallet.address))) {
      await (await registry.connect(wallet).register(spec.name, spec.description, spec.tags, GAS)).wait();
      console.log("  registered");
    } else {
      console.log("  already registered");
    }

    // 3) Build reputation via real post -> assign -> complete cycles.
    let current = Number(await reputation.getScore(wallet.address));
    const target = spec.completions;
    while (current < target) {
      const postTx = await marketplace.postTask(
        `Seed task #${current + 1} for ${spec.name}`,
        spec.tags[0] ? cap(spec.tags[0]) : "Research",
        DEADLINE,
        { value: ethers.parseEther(REWARD), ...GAS }
      );
      const rcpt = await postTx.wait();
      const taskId = parseTaskId(marketplace, rcpt);

      await (await marketplace.assignTask(taskId, wallet.address, GAS)).wait();
      await (await marketplace.completeTask(taskId, ethers.id(`seed-result-${taskId}`), GAS)).wait();
      current++;
      process.stdout.write(`  reputation: ${current}/${target}\r`);
    }
    const trusted = BigInt(current) >= threshold;
    console.log(`  reputation: ${current}  ${trusted ? "✓ trusted (instant)" : "· escrow tier"}`);
  }

  console.log("\n✓ Seed complete. Leaderboard:");
  const all = await registry.getAllAgents();
  const rows = [];
  for (const a of all) rows.push({ name: a.name, score: Number(await reputation.getScore(a.wallet)) });
  rows.sort((x, y) => y.score - x.score).forEach((r, i) => console.log(`  ${i + 1}. ${r.name} — ${r.score}`));
  console.log("");
}

// ── helpers ──────────────────────────────────────────────────────────
function loadAddresses() {
  const p = path.resolve(__dirname, "../../lib/contracts/addresses.json");
  if (!fs.existsSync(p)) throw new Error("lib/contracts/addresses.json not found — run deploy first.");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function contractAt(ethers, artifacts, name, address, signer) {
  const art = await artifacts.readArtifact(name);
  return new ethers.Contract(address, art.abi, signer);
}

function loadOrCreateAgentWallets(ethers, chainId, n) {
  const p = path.resolve(__dirname, "../.seeded-agents.json");
  let store = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
  const key = String(chainId);
  if (!store[key] || store[key].length < n) {
    store[key] = Array.from({ length: n }, () => ethers.Wallet.createRandom().privateKey);
    fs.writeFileSync(p, JSON.stringify(store, null, 2));
    console.log(`generated ${n} agent wallets -> contracts/.seeded-agents.json`);
  }
  return store[key].map((pk) => new ethers.Wallet(pk));
}

function parseTaskId(marketplace, receipt) {
  for (const log of receipt.logs) {
    try {
      const parsed = marketplace.interface.parseLog(log);
      if (parsed && parsed.name === "TaskPosted") return parsed.args.taskId;
    } catch (_) {}
  }
  throw new Error("TaskPosted event not found in receipt");
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
