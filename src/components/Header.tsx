import { useState } from "react";
import { useConnection, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { WalletInstallDropdown } from "./WalletInstallDropdown";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Header() {
  const { address, isConnected } = useConnection();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  const handleWalletClick = () => {
    if (isConnected) {
      disconnect.mutate();
      return;
    }

    if (!(window as Window & { ethereum?: unknown }).ethereum) {
      setShowWalletOptions(true);
      return;
    }

    connect.mutate(
      { connector: injected() },
      { onError: () => setShowWalletOptions(true) },
    );
  };

  return (
    <div className="relative">
      <button
        className={`border px-4.5 py-2.75 text-xs uppercase tracking-[.04em] transition-colors ${
          isConnected
            ? "border-[#414545] text-white hover:bg-white hover:text-black"
            : "border-[#c7f66e] text-[#c7f66e] hover:bg-[#c7f66e] hover:text-black"
        }`}
        onClick={handleWalletClick}
        type="button"
      >
        {isConnected && address ? shortenAddress(address) : "Connect wallet"}
      </button>
      {showWalletOptions && (
        <WalletInstallDropdown onClose={() => setShowWalletOptions(false)} />
      )}
    </div>
  );
}
