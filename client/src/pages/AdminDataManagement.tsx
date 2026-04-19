import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Trash2, Users, Database, RefreshCw, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export function AdminDataManagement() {
  const { user } = useAuth();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearOptions, setClearOptions] = useState({
    clearAppointments: false,
    clearPayments: false,
    clearTestUsers: false,
  });

  // Verificar se é super_admin
  if (user?.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle size={24} />
              <p>Acesso negado. Apenas super admins podem acessar esta página.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.admin.getStats.useQuery();
  const { data: users, isLoading: usersLoading } = trpc.admin.listAllUsers.useQuery();
  const { data: logs } = trpc.admin.getAdminLogs.useQuery();

  // Mutations
  const clearTestDataMutation = trpc.admin.clearTestData.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowClearDialog(false);
      setClearOptions({ clearAppointments: false, clearPayments: false, clearTestUsers: false });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleClearTestData = () => {
    clearTestDataMutation.mutate(clearOptions);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Dados</h1>
          <p className="text-sm text-muted-foreground mt-1">Painel administrativo para gerenciar dados do sistema</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Clientes, barbeiros e admins</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalAppointments || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Incluindo testes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total de Pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPayments || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Transações registradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total de Barbearias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalBarbershops || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Unidades cadastradas</p>
            </CardContent>
          </Card>
        </div>

        {/* Ações Administrativas */}
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-600" />
              Ações Administrativas
            </CardTitle>
            <CardDescription>Operações que afetam dados do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-background rounded-lg border border-border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Trash2 size={18} />
                Limpar Dados de Teste
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Remove agendamentos, pagamentos e usuários de teste do sistema. Esta ação é irreversível.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowClearDialog(true)}
                disabled={clearTestDataMutation.isPending}
              >
                {clearTestDataMutation.isPending ? "Limpando..." : "Limpar Dados de Teste"}
              </Button>
            </div>

            <div className="p-4 bg-background rounded-lg border border-border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <RefreshCw size={18} />
                Sincronizar Dados
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sincroniza dados com serviços externos (Stripe, webhooks, etc).
              </p>
              <Button variant="outline" disabled>
                Sincronizar (Em breve)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={20} />
              Usuários do Sistema
            </CardTitle>
            <CardDescription>Total: {users?.length || 0} usuários</CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando usuários...</p>
            ) : users && users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Nome</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Papel</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Último Acesso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u: any) => (
                      <tr key={u.id} className="border-b border-border hover:bg-accent/50">
                        <td className="py-3 px-4">{u.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{u.role}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={
                              u.status === "active"
                                ? "bg-green-100 text-green-800"
                                : u.status === "inactive"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }
                          >
                            {u.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString("pt-BR") : "Nunca"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
            )}
          </CardContent>
        </Card>

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database size={20} />
              Logs de Ações Administrativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs && logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map((log: any) => (
                  <div key={log.id} className="p-3 bg-accent/50 rounded-lg border border-border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{log.action}</p>
                        <p className="text-sm text-muted-foreground">{log.details}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum log disponível</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Confirmação */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle size={20} className="text-destructive" />
              Confirmar Limpeza de Dados
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. Você tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={clearOptions.clearAppointments}
                onChange={(e) =>
                  setClearOptions({ ...clearOptions, clearAppointments: e.target.checked })
                }
                className="w-4 h-4"
              />
              <span className="text-sm">Limpar agendamentos de teste</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={clearOptions.clearPayments}
                onChange={(e) => setClearOptions({ ...clearOptions, clearPayments: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm">Limpar pagamentos de teste</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={clearOptions.clearTestUsers}
                onChange={(e) => setClearOptions({ ...clearOptions, clearTestUsers: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm">Limpar usuários de teste (oauth.local)</span>
            </label>
          </div>

          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearTestData}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Limpar Dados
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
