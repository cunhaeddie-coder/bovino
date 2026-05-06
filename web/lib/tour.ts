import type { DriveStep } from "driver.js";

const TOUR_PREFIX = "bovino_tour_";

export function markTourSeen(key: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOUR_PREFIX + key, "1");
}

export function hasTourBeenSeen(key: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(TOUR_PREFIX + key) === "1";
}

export function resetTour(key: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOUR_PREFIX + key);
}

export async function startTour(key: string, steps: DriveStep[]) {
  const { driver } = await import("driver.js");

  const driverObj = driver({
    showProgress: true,
    animate: true,
    overlayClickBehavior: "close",
    nextBtnText: "Próximo →",
    prevBtnText: "← Anterior",
    doneBtnText: "✓ Entendi!",
    progressText: "{{current}} de {{total}}",
    popoverClass: "bovino-tour-popover",
    steps,
    onDestroyed: () => markTourSeen(key),
  });

  driverObj.drive();
}
