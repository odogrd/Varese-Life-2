import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { useGetTemplate, useUpdateTemplate, useCreateTemplate } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Save, ArrowLeft, Star, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";

interface Props {
  id?: string; // "new" or a numeric id
}

export default function TemplateEdit({ id }: Props) {
  const isNew = id === "new";
  const numericId = isNew ? 0 : Number(id);

  const { data: template, isLoading } = useGetTemplate(numericId, {
    query: { enabled: !isNew && numericId > 0 },
  });

  const updateMutation = useUpdateTemplate();
  const createMutation = useCreateTemplate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [introHtml, setIntroHtml] = useState("");
  const [eventsHtml, setEventsHtml] = useState("");
  const [footerHtml, setFooterHtml] = useState("");
  const [preview, setPreview] = useState<"intro" | "events" | "footer" | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description ?? "");
      setIntroHtml(template.introHtml ?? "");
      setEventsHtml(template.eventsHtml ?? "");
      setFooterHtml(template.footerHtml ?? "");
    }
  }, [template]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Il nome è obbligatorio", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name,
        description: description || null,
        introHtml: introHtml || null,
        eventsHtml: eventsHtml || null,
        footerHtml: footerHtml || null,
      };
      if (isNew) {
        const created = await createMutation.mutateAsync({ data: payload });
        toast({ title: "Template creato" });
        queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
        navigate(`/template/${created.id}`);
      } else {
        await updateMutation.mutateAsync({ id: numericId, data: payload });
        toast({ title: "Template salvato" });
        queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      }
    } catch {
      toast({ title: "Errore nel salvataggio", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isNew && isLoading) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-muted-foreground animate-pulse">Caricamento...</div>
      </AppLayout>
    );
  }

  const sections: { key: "intro" | "events" | "footer"; label: string; value: string; setter: (v: string) => void; hint: string }[] = [
    {
      key: "intro",
      label: "HTML Introduzione",
      value: introHtml,
      setter: setIntroHtml,
      hint: "Sezione introduttiva della newsletter (testo di apertura, titolo, ecc.).",
    },
    {
      key: "events",
      label: "HTML Singolo Evento",
      value: eventsHtml,
      setter: setEventsHtml,
      hint: "Template per ogni card evento. Usa i segnaposto: {{event_title}}, {{event_date}}, {{event_location}}, {{event_description}}, {{event_price}}, {{event_url}}.",
    },
    {
      key: "footer",
      label: "HTML Footer",
      value: footerHtml,
      setter: setFooterHtml,
      hint: "Sezione finale della newsletter (link di disiscrizione, contatti, ecc.).",
    },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/template")} className="text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">
                {isNew ? "Nuovo Template" : (template?.name ?? "Template")}
              </h1>
              {!isNew && template?.isDefault && (
                <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                  <Star className="w-3 h-3 fill-current" /> Predefinito
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">Modifica la struttura HTML delle sezioni della newsletter.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shadow-md">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Salvataggio..." : "Salva"}
        </Button>
      </div>

      {/* Name & Description */}
      <div className="bg-card rounded-xl border border-border/50 shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nome template</Label>
          <Input
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Es. Template Primavera 2025"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descrizione</Label>
          <Input
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Breve descrizione del template..."
          />
        </div>
      </div>

      {/* HTML Sections */}
      <div className="space-y-6">
        {sections.map(({ key, label, value, setter, hint }) => (
          <div key={key} className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
              <div>
                <h2 className="font-semibold text-foreground">{label}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1.5"
                onClick={() => setPreview(preview === key ? null : key)}
              >
                {preview === key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {preview === key ? "Chiudi" : "Anteprima"}
              </Button>
            </div>
            {preview === key ? (
              <div
                className="p-6 min-h-[200px] overflow-auto"
                dangerouslySetInnerHTML={{ __html: value || "<p class='text-gray-400 italic'>Nessun HTML inserito.</p>" }}
              />
            ) : (
              <Textarea
                value={value}
                onChange={e => setter(e.target.value)}
                placeholder={`Inserisci HTML per la sezione ${label.toLowerCase()}...`}
                className="font-mono text-xs border-0 rounded-none focus-visible:ring-0 resize-none min-h-[220px] p-6"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="shadow-md">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Salvataggio..." : "Salva Template"}
        </Button>
      </div>
    </AppLayout>
  );
}
