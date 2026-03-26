import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useListNewsletters, useCreateNewsletter } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Copy, Send } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function NewsletterList() {
  const { data: newsletters, isLoading } = useListNewsletters();
  const createMutation = useCreateNewsletter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createMutation.mutateAsync({ data: { title: `Newsletter ${format(new Date(), 'dd MMMM yyyy', {locale: it})}` } });
      // In a real app, wouter Link to the editor page /newsletter/:id
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">Newsletter</h1>
          <p className="text-muted-foreground mt-1">Componi ed esporta le newsletter settimanali per Beehiiv.</p>
        </div>
        <Button onClick={handleCreate} disabled={isCreating || createMutation.isPending} className="shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Nuova Newsletter
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                <th className="p-4">Titolo</th>
                <th className="p-4">Data Creazione</th>
                <th className="p-4">Range Eventi</th>
                <th className="p-4">Stato</th>
                <th className="p-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Caricamento...</td></tr>
              ) : newsletters?.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">Nessuna newsletter. Creane una nuova.</td></tr>
              ) : (
                newsletters?.map(nl => (
                  <tr key={nl.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-medium text-foreground">{nl.title}</td>
                    <td className="p-4 text-muted-foreground">{format(new Date(nl.createdAt), 'dd MMM yyyy', { locale: it })}</td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {nl.dateFrom ? format(new Date(nl.dateFrom), 'dd/MM') : '-'} ➔ {nl.dateTo ? format(new Date(nl.dateTo), 'dd/MM') : '-'}
                    </td>
                    <td className="p-4">
                      {nl.status === 'draft' ? (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">Bozza</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Esportata</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" className="text-primary">
                        <Edit2 className="w-4 h-4 mr-2" /> Modifica
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
