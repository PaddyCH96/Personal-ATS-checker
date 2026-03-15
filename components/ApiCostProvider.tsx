"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ApiCostContextType {
  totalCost: number;
  addCost: (amount: number) => void;
}

const ApiCostContext = createContext<ApiCostContextType | undefined>(undefined);

export function ApiCostProvider({ children }: { children: ReactNode }) {
  const [totalCost, setTotalCost] = useState(0);

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

  const addCost = (amount: number) => {
    setTotalCost((prev) => {
      const newCost = prev + amount;
      localStorage.setItem("resume_matcher_total_cost", newCost.toString());
      return newCost;
    });
  };

  return (
    <ApiCostContext.Provider value={{ totalCost, addCost }}>
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
