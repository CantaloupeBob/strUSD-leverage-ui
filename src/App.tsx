import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "./components/Header";
import { LeverageCard } from "./components/LeverageCard";
import { config } from "./web3-config";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <div className="mx-auto h-svh min-h-svh w-full max-w-7xl overflow-hidden bg-black px-5 font-mono text-white sm:px-10">
          <div className="flex h-16 items-center justify-end">
            <Header />
          </div>
          <main className="mx-auto w-full max-w-230 py-7.5 sm:py-13">
            <p className="mb-9 text-[13px] text-[#b8bfbd]">
              Put your collateral to work with controlled leverage.
            </p>
            <LeverageCard />
          </main>
        </div>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App;
