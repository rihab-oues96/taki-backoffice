"use client";

import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import type { Permission } from "@/lib/types";
import { useAuth } from "./AuthProvider";

/** Renders its children only when the user has the permissions; otherwise explains why not. */
export function RequirePermission({ permissions, children }: { permissions: Permission[]; children: ReactNode }) {
  const { can } = useAuth();
  if (can(...permissions)) return <>{children}</>;
  return (
    <EmptyState
      icon={<ShieldAlert size={24} aria-hidden />}
      title="Accès non autorisé"
      text="Votre rôle ne permet pas d'accéder à cette page. Contactez un administrateur si vous pensez qu'il s'agit d'une erreur."
      action={
        <ButtonLink href="/" variant="line" size="sm">
          Retour au tableau de bord
        </ButtonLink>
      }
    />
  );
}
