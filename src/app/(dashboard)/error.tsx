"use client";

import { ErrorState } from "@/components/ui/Feedback";

/** Catches rendering errors inside the dashboard so the navigation stays usable. */
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState message="Une erreur inattendue est survenue dans cette page." onRetry={reset} />;
}
