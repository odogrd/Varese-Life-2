import { AppLayout } from "@/components/layout";
import { useListUsers, useGetMe } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { ShieldAlert, UserCog, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function Utenti() {
  const { data: users, isLoading } = useListUsers();
  const { data: me } = useGetMe();

  if (!me?.isSuperadmin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldAlert className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Accesso Negato</h2>
          <p className="text-muted-foreground mt-2">Solo il superadmin può gestire gli utenti.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">Gestione Utenti</h1>
          <p className="text-muted-foreground mt-1">Aggiungi e rimuovi editor o admin dal sistema.</p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/30 text-muted-foreground font-medium border-b border-border/50">
            <tr>
              <th className="p-4">Utente</th>
              <th className="p-4">Ruolo</th>
              <th className="p-4">Stato</th>
              <th className="p-4">Ultimo Accesso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {isLoading ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Caricamento...</td></tr>
            ) : (
              users?.map(u => (
                <tr key={u.id} className="hover:bg-muted/10">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {u.isSuperadmin ? <ShieldAlert className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                    </div>
                    <span className="font-medium">{u.email}</span>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="capitalize">{u.role}</Badge>
                  </td>
                  <td className="p-4">
                    {u.active ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Attivo</Badge> : <Badge variant="secondary">Inattivo</Badge>}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {u.lastLoginAt ? format(new Date(u.lastLoginAt), 'dd MMM yyyy', {locale: it}) : 'Mai'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </AppLayout>
  );
}
