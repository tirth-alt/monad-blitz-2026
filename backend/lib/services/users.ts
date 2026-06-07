import { query, queryOne, run } from '../db';
import type { Role, User } from '../types';

const normalize = (addr: string) => addr.toLowerCase();

export async function findUser(walletAddress: string): Promise<User | null> {
  return queryOne<User>('SELECT * FROM users WHERE wallet_address = ?', [normalize(walletAddress)]);
}

export async function listUsers(): Promise<User[]> {
  return query<User>('SELECT * FROM users ORDER BY created_at ASC');
}

export async function upsertUser(input: {
  walletAddress: string;
  role: Role;
  displayName: string;
}): Promise<User> {
  const wallet = normalize(input.walletAddress);
  await run(
    `INSERT INTO users (wallet_address, role, display_name)
     VALUES (?, ?, ?)
     ON CONFLICT(wallet_address) DO UPDATE SET role=excluded.role, display_name=excluded.display_name`,
    [wallet, input.role, input.displayName],
  );
  return (await findUser(wallet))!;
}
