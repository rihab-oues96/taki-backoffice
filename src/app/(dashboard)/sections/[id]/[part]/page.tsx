"use client";

import { useParams } from "next/navigation";
import { SectionEditor } from "@/features/content/SectionEditor";

/** A part of a shared section (e.g. the contact details), edited from the page it belongs to. */
export default function SectionPartEditorPage() {
  const { id, part } = useParams<{ id: string; part: string }>();
  return <SectionEditor id={id} partId={part} />;
}
