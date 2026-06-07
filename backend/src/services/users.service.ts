import { db } from '../db/index.js';
import type { Role, User } from '../types/index.js';

const normalize = (addr: string) => addr.toLowerCase();

export function findUser(walletAddress: string): User | null {
  const row = db
    .prepare(`SELECT * FROM users WHERE wallet_address = ?`)
    .get(normalize(walletAddress)) as User | undefined;
  return row ?? null;
}

export function listUsers(): User[] {
  return db.prepare(`SELECT * FROM users ORDER BY created_at ASC`).all() as User[];
}

/** Insert-or-update a user. Used by login provisioning and the seed routine. */
export function upsertUser(input: {
  walletAddress: string;
  role: Role;
  displayName: string;
}): User {
  const wallet = normalize(input.walletAddress);
  db.prepare(
    `INSERT INTO users (wallet_address, role, display_name)
     VALUES (@wallet, @role, @name)
     ON CONFLICT(wallet_address) DO UPDATE SET
       role=excluded.role, display_name=excluded.display_name`,
  ).run({ wallet, role: input.role, name: input.displayName });

  return findUser(wallet)!;
}
