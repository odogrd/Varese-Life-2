import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useListEvents, useBulkUpdateEvents, useDeleteEvent, useListSources } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Search, Plus, Filter, AlertTriangle, CheckCircle2, XCircle, MapPin, Clock, Trash2, Eye } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

export default function Eventi() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: eventsData, isLoading } = useListEvents({
    status: statusFilter !== "all" ? statusFilter : undefined,
    sourceId: sourceFilter !== "all" ? Number(sourceFilter) : undefined,
    search: searchTerm || undefined,
    limit: 50,
  });

  const { data: sources } = useListSources();
  const bulkMutation = useBulkUpdateEvents();
  const deleteMutation = useDeleteEvent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleBulkAction = async (action: string) => {
    if (selectedIds.length === 0) return;
    try {
      await bulkMutation.mutateAsync({ data: { ids: selectedIds, action } });
      toast({ title: "Eventi aggiornati" });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    } catch (e) {
      toast({ title: "Errore", variant: "destructive" });
    }
  };

  const toggleAll = (checked: boolean) => {
    if (checked && eventsData) setSelectedIds(eventsData.events.map(e => e.id));
    else setSelectedIds([]);
  };

  const toggleOne = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">In attesa</Badge>;
      case 'approved': return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Approvato</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Rifiutato</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">Eventi</h1>
          <p className="text-muted-foreground mt-1">Gestisci, revisiona e approva gli eventi per la newsletter.</p>
        </div>
        <Button className="shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi Evento
        </Button>
      </div>

      <div className="bg-card p-4 rounded-xl border border-border/50 mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Cerca evento..." 
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="pending">In attesa</SelectItem>
              <SelectItem value="approved">Approvati</SelectItem>
              <SelectItem value="rejected">Rifiutati</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Tutte le fonti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le fonti</SelectItem>
              {sources?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium text-primary ml-2">{selectedIds.length} eventi selezionati</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50" onClick={() => handleBulkAction('approve')}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Approva
            </Button>
            <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => handleBulkAction('reject')}>
              <XCircle className="w-4 h-4 mr-1" /> Rifiuta
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground font-medium border-b border-border/50">
              <tr>
                <th className="p-4 w-12"><Checkbox checked={eventsData?.events?.length > 0 && selectedIds.length === eventsData?.events?.length} onCheckedChange={toggleAll} /></th>
                <th className="p-4 min-w-[250px]">Titolo & Data</th>
                <th className="p-4">Luogo</th>
                <th className="p-4">Fonte</th>
                <th className="p-4">Stato</th>
                <th className="p-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground animate-pulse">Caricamento...</td></tr>
              ) : eventsData?.events?.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">Nessun evento trovato.</td></tr>
              ) : (
                eventsData?.events?.map(event => (
                  <tr key={event.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="p-4"><Checkbox checked={selectedIds.includes(event.id)} onCheckedChange={() => toggleOne(event.id)} /></td>
                    <td className="p-4">
                      <div className="font-medium text-foreground text-base mb-1">{event.title}</div>
                      <div className="flex items-center text-muted-foreground text-xs gap-2">
                        <Clock className="w-3 h-3" />
                        {event.dateDisplay || (event.dateStart ? format(new Date(event.dateStart), 'dd MMMM yyyy', { locale: it }) : 'Data sconosciuta')}
                        {event.dateParseConfidence === 'low' && (
                          <AlertTriangle className="w-3 h-3 text-amber-500 ml-1" title="Data parsing a bassa confidenza" />
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {event.location ? (
                        <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-xs truncate max-w-[150px]">{event.sourceName || 'Manuale'}</span>
                        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${event.sourceType === 'manual' ? 'text-purple-600 border-purple-200' : 'text-blue-600 border-blue-200'}`}>
                          {event.sourceType}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(event.status)}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                        <Eye className="w-4 h-4" />
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
