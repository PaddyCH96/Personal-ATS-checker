"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ApiCostContextType {
  totalCost: number;
  addCost: (amount: number) => void;
  /** True when the configured model runs locally — usage costs nothing. */
  isLocal: boolean;
  providerLabel: string;
}

const ApiCostContext = createContext<ApiCostContextType | undefined>(undefined);

export function ApiCostProvider({ children }: { children: ReactNode }) {
  const [totalCost, setTotalCost] = useState(0);
  const [isLocal, setIsLocal] = useState(false);
  const [providerLabel, setProviderLabel] = useState("");

  useEffect(() => {
    // Hydrate from localStorage on client mount
    const saved = localStorage.getItem("resume_matcher_total_cost");
    if (saved) {
      try {
        setTotalCost(parseFloat(saved));
      } catch (e) {
        console.error("Failed to parse saved cost");
      }
    }
  }, []);

  useEffect(() => {
    // Ask the server which backend is configured, so we don't bill local runs.
    fetch("/api/provider")
      .then((r) => r.json())
      .then((info) => {
        setIsLocal(Boolean(info?.isLocal));
        setProviderLabel(info?.label ?? "");
      })
      .catch(() => {
        /* Non-fatal: fall back to showing cost as usual. */
      });
  }, []);

  const addCost = (amount: number) => {
    if (isLocal) return; // Local models are free — don't accrue phantom spend.
    setTotalCost((prev) => {
      const newCost = prev + amount;
      localStorage.setItem("resume_matcher_total_cost", newCost.toString());
      return newCost;
    });
  };

  return (
    <ApiCostContext.Provider value={{ totalCost, addCost, isLocal, providerLabel }}>
      {children}
    </ApiCostContext.Provider>
  );
}

export function useApiCost() {
  const context = useContext(ApiCostContext);
  if (context === undefined) {
    throw new Error("useApiCost must be used within an ApiCostProvider");
  }
  return context;
}
