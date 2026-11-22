"use client";

import { useCallback, useEffect, useState } from "react";
import { track } from "@/application/analytics";

const DISMISS_KEY = "merre.installDismissed";

/** Chromium's non-standard install event. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallPromptState {
  /** A native install prompt is available (Chromium, Android). */
  canInstall: boolean;
  promptInstall: () => Promise<void>;
  /** iOS Safari: no install event exists, the UI should show the Share → Add to Home Screen hint. */
  isIos: boolean;
  isStandalone: boolean;
  dismissed: boolean;
  dismiss: () => void;
}

function detectStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function detectIos(): boolean {
  const ua = navigator.userAgent;
  const iPhoneOrPod = /iPhone|iPod/.test(ua);
  // iPadOS 13+ reports itself as a Mac with touch support.
  const iPad = /iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return iPhoneOrPod || iPad;
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Install-prompt state. Everything browser-specific is resolved after mount,
 * so the server render and the first client render are identical.
 */
export function useInstallPrompt(): InstallPromptState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-off sync with browser-only facts */
    setIsIos(detectIos());
    setIsStandalone(detectStandalone());
    setDismissed(readDismissed());
    /* eslint-enable react-hooks/set-state-in-effect */

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    track("install_prompt_answered", { outcome });
    setDeferred(null); // the event can only be used once
  }, [deferred]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private mode: dismissed for this visit only.
    }
  }, []);

  return { canInstall: deferred !== null, promptInstall, isIos, isStandalone, dismissed, dismiss };
}
