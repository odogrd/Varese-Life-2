import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-20 text-center h-[70vh]">
        <div className="text-8xl font-display font-bold text-muted/30 mb-4 tracking-tighter">404</div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Pagina non trovata</h2>
        <p className="text-muted-foreground mb-8 max-w-md">La pagina che stai cercando non esiste o è stata spostata.</p>
        <Link href="/dashboard">
          <Button className="shadow-md">Torna alla Dashboard</Button>
        </Link>
      </div>
    </AppLayout>
  );
}
