import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-navy-900 px-6 text-center text-white">
      <div>
        <p className="text-8xl font-semibold tracking-[-0.03em] text-sun">404</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">Cette page n’existe pas</h1>
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/" variant="solid">
            Retour au tableau de bord
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
