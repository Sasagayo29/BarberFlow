import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Building2, TrendingUp, DollarSign } from "lucide-react";
import { useLocation } from "wouter";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Verificar se é super admin
  if (user?.role !== "super_admin") {
    return (
      <div className="container py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">Acesso negado. Apenas super admins podem acessar este painel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Query para obter estatísticas
  const statsQuery = trpc.admin.getStats.useQuery();

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Painel de Super Admin</h1>
        <p className="text-gray-600">Estatísticas globais e gerenciamento centralizado</p>
      </div>

      {statsQuery.isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      ) : statsQuery.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">Erro ao carregar estatísticas: {statsQuery.error?.message}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Estatísticas Globais */}
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            {/* Total de Barbearias */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  Barbearias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsQuery.data?.totalBarbershops || 0}</div>
                <p className="text-xs text-gray-600">Barbearias ativas</p>
              </CardContent>
            </Card>

            {/* Total de Usuários */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-green-500" />
                  Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsQuery.data?.totalUsers || 0}</div>
                <p className="text-xs text-gray-600">Usuários registrados</p>
              </CardContent>
            </Card>

            {/* Total de Agendamentos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsQuery.data?.totalAppointments || 0}</div>
                <p className="text-xs text-gray-600">Total de agendamentos</p>
              </CardContent>
            </Card>

            {/* Total de Pagamentos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4 text-purple-500" />
                  Receita
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsQuery.data?.totalPayments || 0}</div>
                <p className="text-xs text-gray-600">Transações</p>
              </CardContent>
            </Card>
          </div>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>Acesse as funcionalidades administrativas</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Button
                variant="outline"
                className="h-24 flex-col justify-start"
                onClick={() => navigate("/admin/usuarios")}
              >
                <Users className="mb-2 h-6 w-6" />
                <span>Gerenciar Usuários</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex-col justify-start"
                onClick={() => navigate("/admin/dados")}
              >
                <Building2 className="mb-2 h-6 w-6" />
                <span>Gerenciar Dados</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex-col justify-start"
                onClick={() => navigate("/analytics")}
              >
                <TrendingUp className="mb-2 h-6 w-6" />
                <span>Ver Analytics</span>
              </Button>
            </CardContent>
          </Card>

          {/* Informações do Super Admin */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600">Nome</p>
                <p className="font-medium">{user?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Função</p>
                <p className="font-medium">Super Admin</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium text-green-600">Ativo</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
