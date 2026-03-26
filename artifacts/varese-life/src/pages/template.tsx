import { AppLayout } from "@/components/layout";
import { useListTemplates } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, LayoutTemplate, Star } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function Templates() {
  const { data: templates, isLoading } = useListTemplates();

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">Template HTML</h1>
          <p className="text-muted-foreground mt-1">Gestisci la struttura visiva esportata per Beehiiv.</p>
        </div>
        <Button className="shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="animate-pulse h-40 bg-muted rounded-xl"></div>
        ) : (
          templates?.map(t => (
            <Card key={t.id} className={`border-border/50 shadow-sm relative overflow-hidden ${t.isDefault ? 'ring-2 ring-primary border-transparent' : ''}`}>
              {t.isDefault && (
                <div className="absolute top-0 right-0 bg-primary text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white" /> Predefinito
                </div>
              )}
              <CardHeader>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <LayoutTemplate className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{t.name}</CardTitle>
                <CardDescription className="line-clamp-2">{t.description || "Nessuna descrizione"}</CardDescription>
                <div className="text-xs text-muted-foreground mt-4">
                  Creato il {format(new Date(t.createdAt), 'dd MMMM yyyy', { locale: it })}
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
}
