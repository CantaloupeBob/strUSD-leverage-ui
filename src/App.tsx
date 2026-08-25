import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "./components/Header";
import { LeverageSection } from "./sections/leverage/LeverageSection";
import { ExistingPosition } from "./sections/ExistingPosition";
import { config } from "./web3-config";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <div className="mx-auto min-h-svh w-full max-w-7xl bg-black px-4 font-mono text-white sm:px-10">
          <div className="flex h-16 items-center justify-end">
            <Header />
          </div>
          <main className="mx-auto w-full max-w-230 py-7.5 sm:py-13">
            <p className="mb-7 text-[13px] text-[#b8bfbd] sm:mb-9">
              Gain boosted exposure to strUSD
            </p>
            <LeverageSection />
            <ExistingPosition />
          </main>
        </div>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App;
