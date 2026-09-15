import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { initApp } from "@multiversx/sdk-dapp/out/methods/initApp/initApp";
import { EnvironmentsEnum } from "@multiversx/sdk-dapp/out/types/enums.types";

import "./index.css";
import App from "./App.jsx";

const config = {
  storage: {
    getStorageCallback: () => sessionStorage,
  },

  dAppConfig: {
    environment: EnvironmentsEnum.devnet,

    providers: {
      walletConnect: {
        walletConnectV2ProjectId: "05f778b27cb238c8d234a60f23935297",
      },
    },
  },
};

initApp(config)
  .then(() => {
    createRoot(document.getElementById("root")).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((error) => {
    console.error("MultiversX initialization failed:", error);
  });
