import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";

import { initApp } from "@multiversx/sdk-dapp/out/methods/initApp/initApp";
import { EnvironmentsEnum } from "@multiversx/sdk-dapp/out/types/enums.types";

import "./index.css";
const MyPittzPage=lazy(()=>import("./features/my-pittz/MyPittzPage.jsx"));
const CollectorProfile=lazy(()=>import("./features/collectors/CollectorProfile.jsx"));
const DawgPound=lazy(()=>import("./features/dawg-pound/DawgPound.jsx"));
const App = lazy(() => import("./App.jsx"));
const RentalCenter = lazy(() => import("./features/merchant/RentalCenter.jsx"));
const MarketShop = lazy(() => import("./features/merchant/MarketShop.jsx"));
const MarketAdmin = lazy(() => import("./features/merchant/MarketAdmin.jsx"));
const MerchantStudio = lazy(() => import("./features/merchant/MerchantStudio.jsx"));
const BonezSwap = lazy(() => import("./features/bonez-swap/BonezSwap.jsx"));

const Pittensor = lazy(() => import("./features/bonez-burn/Pittensor.jsx"));
const FinancialDistrict = lazy(() => import("./features/financial-district/FinancialDistrict.jsx"));
if(window.location.pathname==='/'&&new URLSearchParams(window.location.search).get('sale')==='listed')window.location.replace('/dawg-pound/?collection='+(new URLSearchParams(window.location.search).get('collection')==='vice'?'vice':'original'));
const pagePath = window.location.pathname.replace(/\/$/, "");

const pageTitles = {
  "/my-pittz": "My Pittz · The PittzStop",
  "/collector": "Collector’s Pack · The PittzStop",
  "/dawg-pound": "Pittz Dawg Pound · The PittzStop",
  "/financial-district": "Financial District · The PittzStop",
  "/pittensor": "Pittensor · The PittzStop",
  "/bonez-swap": "Token Swap · The PittzStop",
  "/merchant-access": "Merchant Backroom · The PittzStop",
  "/market-rent": "Storefront Rentals · The PittzStop",
  "/market-admin": "Market Administration · The PittzStop",
};
// Storefront titles come from the server so shared shop links retain their identity.
if (pageTitles[pagePath]) document.title = pageTitles[pagePath];

const config = {
  storage: {
    getStorageCallback: () => sessionStorage,
  },

  dAppConfig: {
    environment: (["/my-pittz", "/collector", "/dawg-pound", "/bonez-swap", "/financial-district", "/pittensor", "/merchant-access", "/market-admin", "/market-rent", "/market-shop"].includes(pagePath) || (import.meta.env.VITE_OOX_OFFERS === "true" || (import.meta.env.VITE_OOX_TRANSACTIONS === "true" && import.meta.env.VITE_OOX_PREVIEW === "true"))) ? EnvironmentsEnum.mainnet : EnvironmentsEnum.devnet,

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
          {pagePath === "/my-pittz" ? <MyPittzPage /> : pagePath === "/collector" ? <CollectorProfile /> : pagePath === "/dawg-pound" ? <DawgPound /> : pagePath === "/market-rent" ? <RentalCenter /> : pagePath === "/market-shop" ? <MarketShop /> : pagePath === "/market-admin" ? <MarketAdmin /> : pagePath === "/merchant-access" ? <MerchantStudio /> : pagePath === "/pittensor" ? <Pittensor /> : pagePath === "/financial-district" ? <FinancialDistrict /> : pagePath === "/bonez-swap" ? <BonezSwap /> : <App />}
        </Suspense>
      </StrictMode>,
    );
  })
  .catch((error) => {
    console.error("MultiversX initialization failed:", error);
    const root = document.getElementById("root");
    const panel = document.createElement("main");
    panel.style.cssText = "max-width:640px;margin:12vh auto;padding:28px;color:#f5e6c8;background:#171b20;border:1px solid #9e8650;border-radius:14px;font:16px/1.7 system-ui";
    panel.setAttribute("role", "alert");
    const title = document.createElement("h1");title.textContent = "The PittzStop could not finish loading.";
    const message = document.createElement("p");message.textContent = "Check your connection and try again. If you just approved a transaction, check its status in your wallet before submitting another.";
    const retry = document.createElement("button");retry.type = "button";retry.textContent = "Try loading again";retry.onclick = () => window.location.reload();
    const help = document.createElement("a");help.href = "mailto:support@clemonswebco.com";help.textContent = "Contact technical support";help.style.marginLeft = "18px";
    panel.append(title, message, retry, help);root.replaceChildren(panel);
  });


