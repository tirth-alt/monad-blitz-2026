import { useEffect, useState } from "react";
import { useAccount, useBalance, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { formatUnits } from "viem";
import { toast } from "sonner";
import * as mock from "./api";
import type { Role, WalletState } from "./api";
import { monadTestnet } from "./web3/chains";

// Flip to "true" (via .env.local) to use a real wallet (MetaMask) instead of the mock.
export const USE_REAL_WALLET = import.meta.env.VITE_USE_REAL_WALLET === "true";

export interface WalletView extends WalletState {
  connecting: boolean;
  wrongNetwork: boolean;
  connect: (role?: Role) => void;
  disconnect: () => void;
}

// --- Shared role store ---------------------------------------------------
// Role (user | agent) is an app concept, not something the chain knows about,
// so it lives here independent of how the wallet actually connects.
let _role: Role | undefined;
let _agentAddress: string | undefined;
const roleListeners = new Set<() => void>();

export function setRole(role?: Role, agentAddress?: string) {
  _role = role;
  _agentAddress = agentAddress;
  roleListeners.forEach((f) => f());
}

function useRoleStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    roleListeners.add(f);
    return () => {
      roleListeners.delete(f);
    };
  }, []);
  return { role: _role, agentAddress: _agentAddress };
}

// --- Mock implementation (default) --------------------------------------
function useMockWallet(): WalletView {
  const [state, setState] = useState<WalletState>(() => mock.getWallet());
  const [connecting, setConnecting] = useState(false);
  useEffect(
    () =>
      mock.subscribeWallet((w) => {
        setState(w);
        if (w.connected) setConnecting(false);
      }),
    [],
  );
  const { role, agentAddress } = useRoleStore();
  return {
    ...state,
    role: role ?? state.role,
    agentAddress: agentAddress ?? state.agentAddress,
    connecting,
    wrongNetwork: false,
    connect: (r = "user") => {
      setRole(r);
      setConnecting(true);
      mock.connectWallet(r);
    },
    disconnect: () => {
      setRole(undefined);
      mock.disconnectWallet();
    },
  };
}

// --- Real implementation (MetaMask via wagmi) ---------------------------
function useRealWallet(): WalletView {
  const { address, isConnected, chainId } = useAccount();
  const { data: bal } = useBalance({ address, chainId: monadTestnet.id });
  const { connect, connectors, status } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { role, agentAddress } = useRoleStore();

  const wrongNetwork = isConnected && chainId !== monadTestnet.id;

  // Once connected on the wrong chain, prompt the wallet to switch/add Monad.
  useEffect(() => {
    if (wrongNetwork) {
      switchChain(
        { chainId: monadTestnet.id },
        { onError: (e) => toast.error("Switch to Monad Testnet", { description: e.message }) },
      );
    }
  }, [wrongNetwork, switchChain]);

  const doConnect = (r: Role = "user") => {
    setRole(r);

    // No injected wallet in the browser at all.
    if (typeof window !== "undefined" && !(window as { ethereum?: unknown }).ethereum) {
      toast.error("No wallet found", {
        description: "Install the MetaMask browser extension, then refresh and try again.",
      });
      return;
    }

    const connector = connectors.find((c) => c.type === "injected") ?? connectors[0];
    if (!connector) {
      toast.error("No wallet connector available");
      return;
    }

    connect(
      { connector, chainId: monadTestnet.id },
      {
        onSuccess: () => toast.success("Wallet connected"),
        onError: (err) => toast.error("Couldn't connect wallet", { description: err.message }),
      },
    );
  };

  return {
    connected: isConnected,
    address,
    balance: bal ? Number(formatUnits(bal.value, bal.decimals)) : undefined,
    role,
    agentAddress,
    connecting: status === "pending",
    wrongNetwork,
    connect: doConnect,
    disconnect: () => {
      setRole(undefined);
      disconnect();
    },
  };
}

// Chosen once at module load — constant for the app's lifetime, so every
// component always calls the same hook (Rules of Hooks stay satisfied).
export const useWallet: () => WalletView = USE_REAL_WALLET ? useRealWallet : useMockWallet;
