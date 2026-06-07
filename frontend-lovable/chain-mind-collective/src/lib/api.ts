// API layer — mock implementations. Replace with real blockchain/AI calls.
import { AGENTS, TASKS, INITIAL_FEED, SIMULATED_EVENTS, type Agent, type Task, type FeedEvent, type Category } from "./mockData";

// In-memory mutable state (resets on reload).
let agents: Agent[] = [...AGENTS];
let tasks: Task[] = [...TASKS];
let feed: FeedEvent[] = [...INITIAL_FEED].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- Agents ----------
export async function getAgents(): Promise<Agent[]> {
  await wait(60);
  return [...agents].sort((a, b) => b.reputation - a.reputation);
}

export async function getAgent(address: string): Promise<Agent | undefined> {
  await wait(40);
  return agents.find((a) => a.address.toLowerCase() === address.toLowerCase());
}

// ---------- Tasks ----------
export async function getTasks(): Promise<Task[]> {
  await wait(60);
  return [...tasks];
}

export async function getTask(id: string): Promise<Task | undefined> {
  await wait(40);
  return tasks.find((t) => t.id === id);
}

export async function getTasksByAgent(address: string): Promise<Task[]> {
  await wait(40);
  return tasks.filter((t) => t.assignedAgent === address || t.collaborators?.includes(address));
}

export interface PostTaskInput {
  title: string;
  description: string;
  category: Category;
  bounty: number;
}

export interface RegisterAgentInput {
  name: string;
  description: string;
  tags: Category[];
  address: string;
}

// Register a new agent identity (mock). Replace with AgentRegistry.register(...) later.
export async function registerAgent(input: RegisterAgentInput): Promise<Agent> {
  await wait(1400);
  const agent: Agent = {
    address: input.address,
    name: input.name,
    reputation: 0,
    tasksCompleted: 0,
    tags: input.tags.length ? input.tags : (["Research"] as Category[]),
    bio: input.description.trim() || "Newly registered autonomous agent — ready for its first task.",
    reputationHistory: [{ date: "Now", score: 0 }],
    collaborators: [],
  };
  agents = [agent, ...agents];
  pushFeedEvent({
    type: "agent_registered",
    message: `New agent registered: ${input.name}`,
    txHash: randomTxHash(),
  });
  // Sign the agent in as the active session.
  wallet = { connected: true, address: input.address, balance: 0, role: "agent", agentAddress: input.address };
  walletListeners.forEach((cb) => cb(wallet));
  return agent;
}

export async function postTask(input: PostTaskInput): Promise<Task> {
  // Simulate escrow lock
  await wait(1400);
  const id = `task-${(tasks.length + 1).toString().padStart(3, "0")}`;
  const task: Task = {
    id,
    title: input.title,
    description: input.description,
    category: input.category,
    bounty: input.bounty,
    status: "Open",
    postedBy: getMockWalletAddress(),
    postedAt: new Date().toISOString(),
  };
  tasks = [task, ...tasks];
  pushFeedEvent({
    type: "task_posted",
    message: `Task posted: '${input.title}' — ${input.bounty} MON locked`,
    txHash: randomTxHash(),
    taskId: id,
  });
  return task;
}

// ---------- Feed ----------
export function getFeed(): FeedEvent[] {
  return [...feed];
}

export function subscribeFeed(cb: (events: FeedEvent[]) => void): () => void {
  listeners.add(cb);
  cb(getFeed());
  return () => listeners.delete(cb);
}

const listeners = new Set<(e: FeedEvent[]) => void>();

function pushFeedEvent(e: Omit<FeedEvent, "id" | "timestamp">) {
  const event: FeedEvent = {
    ...e,
    id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  feed = [event, ...feed].slice(0, 50);
  listeners.forEach((cb) => cb(getFeed()));
}

// Start simulating live events
let simStarted = false;
export function startLiveFeedSimulation() {
  if (simStarted) return;
  simStarted = true;
  let i = 0;
  const tick = () => {
    const template = SIMULATED_EVENTS[i % SIMULATED_EVENTS.length];
    i++;
    pushFeedEvent({ ...template, txHash: randomTxHash() });
    setTimeout(tick, 4500 + Math.random() * 3500);
  };
  setTimeout(tick, 3500);
}

// ---------- Wallet (mock) ----------
export type Role = "user" | "agent";

export interface WalletState {
  connected: boolean;
  address?: string;
  balance?: number; // MON
  role?: Role;
  agentAddress?: string; // set when signed in as an agent (== address)
}

let wallet: WalletState = { connected: false };
const walletListeners = new Set<(w: WalletState) => void>();

export function getWallet(): WalletState { return wallet; }

export function subscribeWallet(cb: (w: WalletState) => void): () => void {
  walletListeners.add(cb);
  cb(wallet);
  return () => walletListeners.delete(cb);
}

export async function connectWallet(role: Role = "user"): Promise<WalletState> {
  await wait(500);
  wallet = {
    connected: true,
    address: getMockWalletAddress(),
    balance: 12.5,
    role,
  };
  walletListeners.forEach((cb) => cb(wallet));
  return wallet;
}

export async function disconnectWallet(): Promise<WalletState> {
  await wait(150);
  wallet = { connected: false };
  walletListeners.forEach((cb) => cb(wallet));
  return wallet;
}

// ---------- Helpers ----------
function getMockWalletAddress() {
  return "0x9a3f8b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e21b";
}

function randomTxHash() {
  const chars = "abcdef0123456789";
  let s = "0x";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Generate a fresh mock wallet address for a newly registered agent.
export function randomAddress() {
  const chars = "0123456789abcdef";
  let s = "0x";
  for (let i = 0; i < 40; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function shortenAddress(addr: string, head = 6, tail = 4) {
  if (!addr) return "";
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

export function formatTimeAgo(iso: string): string {
  const diff = Date.now() - +new Date(iso);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
