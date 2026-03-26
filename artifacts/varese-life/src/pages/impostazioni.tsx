import { AppLayout } from "@/components/layout";
import { useGetSettings, useUpdateSettings, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { Save, ShieldAlert, Clock, Settings2, Database, KeyRound } from "lucide-react";

export default function Impostazioni() {
  const { data: settings, isLoading } = useGetSettings();
  const { data: user } = useGetMe();
  const updateMutation = useUpdateSettings();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    publicationDay: 4,
    cronEnabled: true,
    cronExpression: "0 8 * * *",
    browseractSinglePageWorkflowId: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        publicationDay: settings.publicationDay,
        cronEnabled: settings.cronEnabled,
        cronExpression: settings.cronExpression,
        browseractSinglePageWorkflowId: settings.browseractSinglePageWorkflowId || "",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ data: formData });
      toast({ title: "Impostazioni salvate" });
    } catch (e) {
      toast({ title: "Errore", variant: "destructive" });
    }
  };

  if (!user?.isSuperadmin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldAlert className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Accesso Negato</h2>
          <p className="text-muted-foreground mt-2">Solo il superadmin può accedere alle impostazioni di sistema.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">Impostazioni</h1>
          <p className="text-muted-foreground mt-1">Configurazione globale del sistema Varese Life.</p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending || isLoading} className="shadow-md">
          <Save className="w-4 h-4 mr-2" /> Salva Modifiche
        </Button>
      </div>

      <div className="grid gap-6 max-w-4xl">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Settings2 className="w-5 h-5 text-primary" /> Sistema Newsletter</CardTitle>
            <CardDescription>Definisci il ciclo di vita della newsletter settimanale.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Giorno di Pubblicazione</Label>
              <Select value={formData.publicationDay.toString()} onValueChange={v => setFormData({...formData, publicationDay: parseInt(v)})}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Lunedì</SelectItem>
                  <SelectItem value="2">Martedì</SelectItem>
                  <SelectItem value="3">Mercoledì</SelectItem>
                  <SelectItem value="4">Giovedì</SelectItem>
                  <SelectItem value="5">Venerdì</SelectItem>
                  <SelectItem value="6">Sabato</SelectItem>
                  <SelectItem value="0">Domenica</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Utilizzato per definire i range "Questa settimana".</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Automazione Scraping</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border border-border p-3 rounded-lg bg-muted/20">
                <div>
                  <Label className="text-base">Scraping Automatico</Label>
                  <p className="text-xs text-muted-foreground">Avvia l'estrazione ogni giorno</p>
                </div>
                <Switch checked={formData.cronEnabled} onCheckedChange={c => setFormData({...formData, cronEnabled: c})} />
              </div>
            </div>
            <div className="space-y-3">
              <Label>Espressione Cron (Server)</Label>
              <Input value={formData.cronExpression} onChange={e => setFormData({...formData, cronExpression: e.target.value})} className="font-mono bg-background" disabled={!formData.cronEnabled} />
              <p className="text-xs text-muted-foreground">Default: 0 8 * * * (Tutti i giorni alle 8:00)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> Integrazione BrowserAct</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Workflow ID Pagina Singola</Label>
              <Input 
                value={formData.browseractSinglePageWorkflowId} 
                onChange={e => setFormData({...formData, browseractSinglePageWorkflowId: e.target.value})} 
                placeholder="es. wrk_123456789"
                className="bg-background max-w-md font-mono"
              />
              <p className="text-xs text-muted-foreground max-w-md">Utilizzato quando si estrae un evento da un link manuale "Da URL". Il workflow deve accettare un parametro 'url'.</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
