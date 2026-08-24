import { useAccount, useConnect, useDisconnect } from 'wagmi'

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function Header() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  const handleWalletClick = () => {
    if (isConnected) {
      disconnect()
      return
    }

    const connector = connectors[0]
    if (connector) connect({ connector })
  }

  return (
    <div>
      <button
        className={`border px-[18px] py-[11px] text-xs uppercase tracking-[.04em] transition-colors ${
          isConnected
            ? 'border-[#414545] text-white hover:bg-white hover:text-black'
            : 'border-[#c7f66e] text-[#c7f66e] hover:bg-[#c7f66e] hover:text-black'
        }`}
        onClick={handleWalletClick}
        type="button"
      >
        {isConnected && address ? shortenAddress(address) : 'Connect wallet'}
      </button>
    </div>
  )
}
