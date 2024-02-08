import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Theme } from "@radix-ui/themes";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui.js/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "@pages/home";
import GameListWrapper from "@pages/gameList";
import Quiz from "@pages/quiz";
import Nav from "@components/nav";
import Results from "@pages/results";

// Monitoring
// if (import.meta.env.PROD) {
//   Sentry.init({
//     dsn,
//     integrations: [
//       new CaptureConsole({
//         levels: ["error"],
//       }),
//       new Sentry.BrowserTracing({
//         // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
//         tracePropagationTargets: [
//           // "localhost",
//         ],
//         // routingInstrumentation: Sentry.reactRouterV6Instrumentation(
//         //   React.useEffect,
//         //   useLocation,
//         //   useNavigationType,
//         //   createRoutesFromChildren,
//         //   matchRoutes
//         // ),
//       }),
//       new Sentry.Replay({
//         maskAllText: false,
//         blockAllMedia: false,
//         maskAllInputs: false,
//         networkDetailAllowUrls: [
//           window.location.origin,
//         ],
//       }),
//     ],
//     // Performance Monitoring
//     tracesSampleRate: 1.0, // Capture 100% of the transactions
//     // Session Replay
//     replaysSessionSampleRate: 1.0, // This sets the sample rate at 100%. You may want to change it to 100% while in development and then sample at a lower rate in production.
//     replaysOnErrorSampleRate: 0.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
//   });
// }

const MainRoutes = () => {
  return (
    <div className="flex font-share-tech-mono flex-col h-screen w-full">
      <Nav />
      <Routes>
        <Route path="/" Component={Home} />
        <Route path="/games" Component={GameListWrapper} />
        <Route path="/quiz/:address" Component={Quiz} />
        <Route path="/results" Component={Results} />
      </Routes>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
const queryClient = new QueryClient();
const networks = {
  devnet: { url: getFullnodeUrl("devnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
  testnet: { url: getFullnodeUrl("testnet") },
};

root.render(
  <React.StrictMode>
    <Theme>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networks} network="testnet">
          <WalletProvider>
            <BrowserRouter>
              <MainRoutes />
            </BrowserRouter>
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </Theme>
  </React.StrictMode>
);
