"use client";

import { useEffect } from "react";
import type { DriveStep } from "driver.js";
import { hasTourBeenSeen, startTour } from "@/lib/tour";
import "driver.js/dist/driver.css";

interface TourButtonProps {
  tourKey: string;
  steps: DriveStep[];
  autoStart?: boolean;
  delay?: number;
}

export function TourButton({ tourKey, steps, autoStart = true, delay = 1200 }: TourButtonProps) {
  useEffect(() => {
    if (!autoStart || hasTourBeenSeen(tourKey)) return;
    const timer = setTimeout(() => startTour(tourKey, steps), delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      onClick={() => startTour(tourKey, steps)}
      className="fixed bottom-20 right-4 z-50 w-11 h-11 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center font-bold text-lg transition-all md:bottom-6 md:right-6"
      title="Guia de ajuda"
      aria-label="Abrir guia de ajuda"
    >
      ?
    </button>
  );
}
