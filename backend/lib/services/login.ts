import { signToken, type AuthPrincipal } from '../auth';
import { Forbidden, Unauthorized } from '../errors';
import type { Role } from '../types';
import { findUser } from './users';

export interface LoginResult {
  token: string;
  user: AuthPrincipal;
}

/**
 * Wallet+role login: the wallet must exist as a user with the given role.
 * No password — the demo trusts whoever holds the address. Returns a JWT.
 */
export async function login(walletAddress: string, role: Role): Promise<LoginResult> {
  const user = await findUser(walletAddress);
  if (!user) throw Unauthorized(`No user registered for ${walletAddress}`, 'UNKNOWN_USER');
  if (user.role !== role) {
    throw Forbidden(`${walletAddress} is registered as '${user.role}', not '${role}'`, 'ROLE_MISMATCH');
  }
  const principal: AuthPrincipal = {
    walletAddress: user.wallet_address,
    role: user.role,
    name: user.display_name,
  };
  return { token: signToken(principal), user: principal };
}
