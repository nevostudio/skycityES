"use client";
import { useState, useEffect, useCallback } from "react";
import type { CityData } from "@/types";
import { api } from "@/lib/client";
export function useCity(initial: CityData) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const next = await api<CityData>("/api/city");
      setData(next);
      setError("");
      return next;
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15000);
    return () => clearInterval(id);
  }, [refresh]);
  return { data, refresh, error };
}
