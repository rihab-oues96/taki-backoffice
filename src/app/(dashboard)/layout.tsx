import { Shell } from "@/components/layout/Shell";
import { Spinner } from "@/components/ui/Feedback";
import { AuthProvider } from "@/features/auth/AuthProvider";

function SessionLoading() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Chargement de la session">
      <Spinner size={28} />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider fallback={<SessionLoading />}>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
