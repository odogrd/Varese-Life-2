import { AppLayout } from "@/components/layout";
import { useListPrompts, useUpdatePrompt, useResetPrompt } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { FileEdit, History } from "lucide-react";
import type { Prompt } from "@workspace/api-client-react/src/generated/api.schemas";

export default function Prompts() {
  const { data: prompts, isLoading } = useListPrompts();
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [content, setContent] = useState("");
  
  const updateMutation = useUpdatePrompt();
  const resetMutation = useResetPrompt();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleEdit = (p: Prompt) => {
    setEditingPrompt(p);
    setContent(p.content);
  };

  const handleSave = async () => {
    if (!editingPrompt) return;
    try {
      await updateMutation.mutateAsync({ id: editingPrompt.id, data: { content } });
      toast({ title: "Prompt salvato con successo" });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      setEditingPrompt(null);
    } catch (e) {
      toast({ title: "Errore", variant: "destructive" });
    }
  };

  const handleReset = async (id: number) => {
    try {
      await resetMutation.mutateAsync({ id });
      toast({ title: "Prompt ripristinato al default" });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      setEditingPrompt(null);
    } catch (e) {
      toast({ title: "Errore", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">Prompt AI</h1>
        <p className="text-muted-foreground mt-1">Configura le istruzioni inviate a Claude per l'estrazione e la scrittura.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map(i => <Card key={i} className="animate-pulse h-48 bg-muted border-none"></Card>)
        ) : (
          prompts?.map(prompt => (
            <Card key={prompt.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-mono text-xs">{prompt.key}</Badge>
                </div>
                <CardTitle className="text-lg mt-2">{prompt.label}</CardTitle>
                <CardDescription className="line-clamp-2 mt-1 h-10">{prompt.description}</CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto pt-4 border-t border-border/40">
                <Button variant="ghost" className="w-full text-primary hover:text-primary hover:bg-primary/5" onClick={() => handleEdit(prompt)}>
                  <FileEdit className="w-4 h-4 mr-2" /> Modifica Prompt
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!editingPrompt} onOpenChange={(open) => !open && setEditingPrompt(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              {editingPrompt?.label}
              <Badge variant="outline" className="font-mono text-xs">{editingPrompt?.key}</Badge>
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">{editingPrompt?.description}</p>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 py-4 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Contenuto del prompt</label>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => handleReset(editingPrompt!.id)}>
                  <History className="w-3 h-3 mr-1" /> Ripristina Default
                </Button>
              </div>
              <Textarea 
                className="flex-1 font-mono text-sm leading-relaxed resize-none p-4 bg-muted/30 focus-visible:ring-1 border-border/50" 
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </div>
            <div className="w-full lg:w-64 bg-muted/20 p-4 rounded-xl border border-border/50 shrink-0 overflow-y-auto">
              <h4 className="font-semibold text-sm mb-3">Variabili disponibili</h4>
              <p className="text-xs text-muted-foreground mb-4">Usa queste variabili nel tuo prompt per iniettare i dati reali dell'evento.</p>
              <ul className="space-y-3 font-mono text-xs">
                {editingPrompt?.key === 'rewrite_description' ? (
                  <>
                    <li><code className="bg-background px-1 py-0.5 rounded border border-border">{"{{description_raw}}"}</code></li>
                    <li><code className="bg-background px-1 py-0.5 rounded border border-border">{"{{title}}"}</code></li>
                    <li><code className="bg-background px-1 py-0.5 rounded border border-border">{"{{date}}"}</code></li>
                    <li><code className="bg-background px-1 py-0.5 rounded border border-border">{"{{location}}"}</code></li>
                  </>
                ) : (
                  <li><span className="text-muted-foreground italic">Le variabili dipendono dal contesto di esecuzione.</span></li>
                )}
              </ul>
            </div>
          </div>

          <DialogFooter className="border-t border-border/40 pt-4 mt-auto">
            <Button variant="outline" onClick={() => setEditingPrompt(null)}>Annulla</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="px-8 shadow-md">
              {updateMutation.isPending ? "Salvataggio..." : "Salva Modifiche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
