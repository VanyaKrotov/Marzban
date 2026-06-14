import { useSyncExternalStore } from "react";

export const getDarkMatcher = () => window.matchMedia("(prefers-color-scheme: dark)");

function subscribe(callback: () => void) {
  const darkMatcher = getDarkMatcher();

  darkMatcher.addEventListener("change", callback);

  return () => darkMatcher.removeEventListener("change", callback);
}

function getSnapshot() {
  return getDarkMatcher().matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsDark() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
