import { useSyncExternalStore } from "react";
import { siteUrl } from "@/lib/format";

const LOCAL_SITE_URL = (process.env.NEXT_PUBLIC_LOCAL_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

const subscribe = () => () => {};
const isLocal = () => LOCAL_HOSTS.has(window.location.hostname);

/**
 * Builds "view on site" links that follow where the backoffice runs:
 * the local website when it is opened on localhost, the hosted one otherwise.
 */
export function useSiteUrl() {
  const local = useSyncExternalStore(subscribe, isLocal, () => false);
  return (path = "/") => (local ? `${LOCAL_SITE_URL}${path.startsWith("/") ? path : `/${path}`}` : siteUrl(path));
}
