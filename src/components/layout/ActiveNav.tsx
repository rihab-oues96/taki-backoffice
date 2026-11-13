"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const ActiveNavContext = createContext<{ href: string | null; setHref: (href: string | null) => void }>({ href: null, setHref: () => undefined });

export function ActiveNavProvider({ children }: { children: ReactNode }) {
  const [href, setHref] = useState<string | null>(null);
  return <ActiveNavContext.Provider value={{ href, setHref }}>{children}</ActiveNavContext.Provider>;
}

/** The menu address a screen asked to be highlighted, if any. */
export const useActiveNavHref = () => useContext(ActiveNavContext).href;

/**
 * Highlights `href` in the menu while the calling screen is shown, for screens whose own
 * address does not say where they belong (a section editor belongs to its page).
 */
export function useActiveNav(href: string | undefined) {
  const { setHref } = useContext(ActiveNavContext);
  useEffect(() => {
    if (!href) return;
    setHref(href);
    return () => setHref(null);
  }, [href, setHref]);
}
