import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { mainnet } from "wagmi/chains";

export const config = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(),
  },
});
