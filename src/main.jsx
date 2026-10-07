import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";

import { initApp } from "@multiversx/sdk-dapp/out/methods/initApp/initApp";
import { EnvironmentsEnum } from "@multiversx/sdk-dapp/out/types/enums.types";

import "./index.css";
const App = lazy(() => import("./App.jsx"));
const BonezSwap = lazy(() => import("./features/bonez-swap/BonezSwap.jsx"));

const config = {
  storage: {
    getStorageCallback: () => sessionStorage,
  },

  dAppConfig: {
    environment: (window.location.pathname.replace(/\/$/, "") === "/bonez-swap" || (import.meta.env.VITE_OOX_TRANSACTIONS === "true" && import.meta.env.VITE_OOX_PREVIEW === "true")) ? EnvironmentsEnum.mainnet : EnvironmentsEnum.devnet,

    providers: {
      walletConnect: {
        walletConnectV2Options: {
          metadata: {
            name: "PittzStop",
            description: "CryptoPittz explorer and marketplace",
            url: window.location.origin,
            icons: [],
            redirect: { universal: window.location.origin + window.location.pathname },
          },
        },
        walletConnectV2ProjectId: "05f778b27cb238c8d234a60f23935297",
      },
    },
  },
};

initApp(config)
  .then(() => {
    createRoot(document.getElementById("root")).render(
      <StrictMode>
        <Suspense fallback={<p style={{padding:"24px",color:"#e9c77a"}}>Loading PittzStop…</p>}>
          {window.location.pathname.replace(/\/$/, "") === "/bonez-swap" ? <BonezSwap /> : <App />}
        </Suspense>
      </StrictMode>,
    );
  })
  .catch((error) => {
    console.error("MultiversX initialization failed:", error);
  });
