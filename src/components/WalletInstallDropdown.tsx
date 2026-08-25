type WalletInstallDropdownProps = {
  onClose: () => void;
};

const wallets = [
  {
    name: "Rabby",
    href: "https://rabby.io/",
  },
  {
    name: "MetaMask",
    href: "https://metamask.io/download/",
  },
];

export function WalletInstallDropdown({ onClose }: WalletInstallDropdownProps) {
  return (
    <div className="absolute right-0 top-full z-10 mt-2 w-52 border border-[#414545] bg-[#0b0d0d] p-3 shadow-2xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[.08em] text-white">
          Install a wallet
        </span>
        <button
          className="text-sm text-[#b8bfbd] hover:text-white"
          onClick={onClose}
          type="button"
          aria-label="Close wallet options"
        >
          x
        </button>
      </div>
      <p className="mb-3 text-[11px] leading-5 text-[#b8bfbd]">
        A browser wallet is required to continue.
      </p>
      <div className="grid gap-2">
        {wallets.map((wallet) => (
          <a
            className="border border-[#414545] px-3 py-2 text-[11px] uppercase tracking-[.08em] text-[#c7f66e] hover:border-[#c7f66e] hover:text-white"
            href={wallet.href}
            key={wallet.name}
            onClick={onClose}
            rel="noreferrer"
            target="_blank"
          >
            {wallet.name}
          </a>
        ))}
      </div>
    </div>
  );
}
