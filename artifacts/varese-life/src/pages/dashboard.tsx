import { AppLayout } from "@/components/layout";
import { useGetDashboardStats, useScrapeAll } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, CalendarClock, Mail, Rss, ArrowRight, Activity, AlertCircle, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();
  const scrapeMutation = useScrapeAll();
  const { toast } = useToast();

  const handleScrapeAll = async () => {
    try {
      await scrapeMutation.mutateAsync();
      toast({
        title: "Scraping avviato",
        description: "L'estrazione degli eventi da tutte le fonti è in corso.",
      });
    } catch (e: any) {
      toast({ title: "Errore", description: "Impossibile avviare lo scraping", variant: "destructive" });
    }
  };

  if (isLoading || !stats) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-xl"></div>)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Panoramica del sistema e azioni rapide.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={handleScrapeAll} disabled={scrapeMutation.isPending} className="bg-background">
            <RefreshCw className={`w-4 h-4 mr-2 ${scrapeMutation.isPending ? 'animate-spin' : ''}`} />
            Scrapa Tutto
          </Button>
          <Link href="/newsletter">
            <Button className="shadow-md">Nuova Newsletter</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eventi (7 giorni)</CardTitle>
            <Activity className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.eventsLast7Days}</div>
            <p className="text-xs text-muted-foreground mt-1">estratti di recente</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Attesa</CardTitle>
            <CalendarClock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.eventsPending}</div>
            <Link href="/eventi?status=pending">
              <Button variant="link" className="px-0 h-auto text-xs mt-2 text-primary hover:text-primary/80 font-medium">
                Vedi tutti <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approvati</CardTitle>
            <CalendarCheck className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.eventsApproved}</div>
            <p className="text-xs text-muted-foreground mt-1">pronti per newsletter</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Newsletter</CardTitle>
            <Mail className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.newslettersSentThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">esportate questo mese</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Stato Fonti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.sourcesLastScrape.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Nessuna fonte configurata.</div>
              ) : (
                stats.sourcesLastScrape.map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Rss className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-foreground">{source.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {source.lastScrapedAt ? `Ultimo: ${format(new Date(source.lastScrapedAt), 'dd MMM yyyy, HH:mm', { locale: it })}` : "Mai controllato"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50">
              <Link href="/fonti">
                <Button variant="ghost" className="w-full text-sm font-medium">Gestisci Fonti</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {stats.unresolvedErrors > 0 && (
          <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center text-destructive">
                <AlertCircle className="w-5 h-5 mr-2" />
                Errori di Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive mb-2">{stats.unresolvedErrors}</div>
              <p className="text-sm text-destructive/80 mb-4">Errori non risolti nei log di sistema o di scraping.</p>
              <Link href="/impostazioni#errori">
                <Button variant="outline" className="w-full border-destructive/30 hover:bg-destructive hover:text-white">
                  Controlla Log
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
