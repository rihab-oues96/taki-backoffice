/* eslint-disable @next/next/no-img-element -- media come from two origins (site, uploads) and are shown as-is */
import { FileText, Film } from "lucide-react";
import { cn } from "@/lib/cn";
import { mediaSrc } from "@/lib/format";
import type { MediaKind } from "@/lib/types";

function kindOf(url: string): MediaKind {
  if (/\.(mp4|webm)(\?.*)?$/i.test(url)) return "video";
  if (/\.pdf(\?.*)?$/i.test(url)) return "document";
  return "image";
}

/** Preview of a media URL: the image itself, or an icon for videos and documents. */
export function MediaThumb({ url, alt = "", kind, className, contain = false }: { url: string; alt?: string; kind?: MediaKind; className?: string; contain?: boolean }) {
  const k = kind ?? kindOf(url);
  return (
    <div className={cn("relative grid place-items-center overflow-hidden bg-[repeating-conic-gradient(#eef3f6_0_25%,#fff_0_50%)] bg-[length:16px_16px]", className)}>
      {k === "image" ? (
        <img src={mediaSrc(url)} alt={alt} loading="lazy" className={cn("size-full", contain ? "object-contain" : "object-cover")} />
      ) : (
        <div className="grid size-full place-items-center bg-sky text-brand-deep">
          {k === "video" ? <Film size={26} aria-hidden /> : <FileText size={26} aria-hidden />}
        </div>
      )}
    </div>
  );
}
