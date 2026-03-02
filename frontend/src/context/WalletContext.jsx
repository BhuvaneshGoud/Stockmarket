import { createContext, useState, useEffect } from "react";
import { walletAPI } from "../api/api";

export const WalletContext = createContext();

export function WalletProvider({ children }) {
  const [walletBalance, setWalletBalance] = useState(0);
  const hasValidToken = () => {
    const token = localStorage.getItem("token");
    return (
      typeof token === "string" &&
      token !== "undefined" &&
      token !== "null" &&
      token.split(".").length === 3
    );
  };

  const fetchWallet = async () => {
    if (!hasValidToken()) {
      return;
    }

    try {
      const response = await walletAPI.getBalance();
      setWalletBalance(response.data.balance || 0);
    } catch (error) {
      console.error("Wallet fetch error:", error);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <WalletContext.Provider
      value={{
        walletBalance,
        setWalletBalance,
        refreshWallet: fetchWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
