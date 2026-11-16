import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Agenda de Torneios</h1>
      <p className="text-muted-foreground">
        Organize os torneios da sua loja em um só calendário.
      </p>
      <Button disabled>Entrar (em breve)</Button>
    </main>
  );
}
