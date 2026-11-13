"use client";

import { useParams } from "next/navigation";
import { SectionEditor } from "@/features/content/SectionEditor";

export default function SectionEditorPage() {
  const { id } = useParams<{ id: string }>();
  return <SectionEditor id={id} />;
}
