import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Calendar, TrendingUp, Users, DollarSign, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("month");
  const [isClearing, setIsClearing] = useState(false);

  // Obter usuário autenticado
  const { data: user } = trpc.auth.me.useQuery();

  // Calcular datas baseado no período
  const dateRange = useMemo(() => {
    const today = new Date();
    const start = new Date();

    if (period === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      start.setDate(today.getDate() - 7);
    } else if (period === "month") {
      start.setDate(today.getDate() - 30);
    } else if (period === "year") {
      start.setFullYear(today.getFullYear() - 1);
    }

    return {
      startDate: start.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
    };
  }, [period]);

  // Buscar dados de analytics
  const { data: analyticsData = [], isLoading: isLoadingAnalytics, error: analyticsError } = trpc.analytics.getByPeriod.useQuery(
    {
      barbershopId: user?.barbershopId || 0,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    {
      enabled: !!user?.barbershopId && ["super_admin", "barber_admin", "barber_owner"].includes(user?.role || ""),
    }
  );

  // Mutation para limpar analytics
  const clearAnalyticsMutation = trpc.analytics.clearAll.useMutation({
    onSuccess: () => {
      toast.success("Analytics limpo com sucesso!");
      setIsClearing(false);
      // Invalidar cache
      trpc.useUtils().analytics.getByPeriod.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao limpar analytics");
      setIsClearing(false);
    },
  });

  // Processar dados para gráficos
  const revenueData = useMemo(() => {
    if (!analyticsData.length) {
      return [];
    }

    return analyticsData.map((item) => ({
      date: item.date,
      revenue: parseFloat(item.totalRevenue.toString()),
      appointments: item.totalAppointments,
    }));
  }, [analyticsData]);

  // Calcular KPIs
  const kpis = useMemo(() => {
    if (!analyticsData.length) {
      return {
        totalRevenue: 0,
        totalAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        averageTicket: 0,
        completionRate: 0,
      };
    }

    const totalRevenue = analyticsData.reduce((sum, item) => sum + parseFloat(item.totalRevenue.toString()), 0);
    const totalAppointments = analyticsData.reduce((sum, item) => sum + item.totalAppointments, 0);
    const completedAppointments = analyticsData.reduce((sum, item) => sum + item.completedAppointments, 0);
    const cancelledAppointments = analyticsData.reduce((sum, item) => sum + item.cancelledAppointments, 0);
    const averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
    const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

    return {
      totalRevenue,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      averageTicket,
      completionRate,
    };
  }, [analyticsData]);

  // Dados para gráfico de serviços (simulado a partir de analytics)
  const serviceData = useMemo(() => {
    if (!analyticsData.length) {
      return [];
    }

    const total = analyticsData.reduce((sum, item) => sum + item.totalAppointments, 0);
    const completed = analyticsData.reduce((sum, item) => sum + item.completedAppointments, 0);
    const cancelled = analyticsData.reduce((sum, item) => sum + item.cancelledAppointments, 0);
    const noShow = analyticsData.reduce((sum, item) => sum + item.noShowAppointments, 0);

    return [
      { name: "Concluídos", value: completed, fill: "#10b981" },
      { name: "Cancelados", value: cancelled, fill: "#ef4444" },
      { name: "Não Compareceu", value: noShow, fill: "#f59e0b" },
      { name: "Pendentes", value: total - completed - cancelled - noShow, fill: "#3b82f6" },
    ].filter((item) => item.value > 0);
  }, [analyticsData]);

  const COLORS = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6"];

  // Verificar permissões
  if (!user || !["super_admin", "barber_admin", "barber_owner"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-zinc-400">Acesso negado. Apenas administradores podem visualizar analytics.</p>
      </div>
    );
  }

  const handleClearAnalytics = async () => {
    if (!confirm("Tem certeza que deseja limpar TODOS os dados de analytics? Esta ação é irreversível.")) {
      return;
    }

    if (!confirm("CONFIRME NOVAMENTE: Esta ação não pode ser desfeita. Deseja continuar?")) {
      return;
    }

    if (!user.barbershopId) {
      toast.error("Barbearia não encontrada");
      return;
    }

    setIsClearing(true);
    await clearAnalyticsMutation.mutateAsync({ barbershopId: user.barbershopId });
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Análise de Negócio</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Dashboard de Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
            Visualize métricas importantes do seu negócio: receita, agendamentos, barbeiros mais procurados e serviços mais vendidos.
          </p>
        </div>
      </section>

      {/* Filtro de Período e Botão de Limpar */}
      <div className="flex gap-2 justify-between items-center">
        <div className="flex gap-2">
          {(["today", "week", "month", "year"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
              className={period === p ? "bg-amber-300 text-stone-950 hover:bg-amber-200" : "border-white/10"}
            >
              {p === "today" && "Hoje"}
              {p === "week" && "Semana"}
              {p === "month" && "Mês"}
              {p === "year" && "Ano"}
            </Button>
          ))}
        </div>
        <Button
          onClick={handleClearAnalytics}
          disabled={isClearing}
          className="bg-red-600 hover:bg-red-700"
        >
          {isClearing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Limpando...
            </>
          ) : (
            <>🗑️ Limpar Analytics</>
          )}
        </Button>
      </div>

      {/* Loading State */}
      {isLoadingAnalytics && (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
            <p className="text-zinc-400">Carregando dados...</p>
          </div>
        </div>
      )}

      {analyticsError && (
        <div className="rounded-lg border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">
          <p className="font-semibold">Erro ao carregar analytics</p>
          <p className="mt-1 text-xs text-red-200">{analyticsError.message}</p>
        </div>
      )}

      {!isLoadingAnalytics && !analyticsError && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-white/10 bg-[#14110f] text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4 text-amber-300" />
                  Receita Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {kpis.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-zinc-400">Período selecionado</p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#14110f] text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.totalAppointments}</div>
                <p className="text-xs text-zinc-400">Total de agendamentos</p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#14110f] text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-green-400" />
                  Concluídos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpis.completedAppointments}</div>
                <p className="text-xs text-zinc-400">{kpis.completionRate.toFixed(1)}% de conclusão</p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#14110f] text-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                  Ticket Médio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {kpis.averageTicket.toFixed(2)}</div>
                <p className="text-xs text-zinc-400">Por agendamento</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          {revenueData.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Receita e Agendamentos */}
              <Card className="border-white/10 bg-[#14110f] text-white">
                <CardHeader>
                  <CardTitle>Receita e Agendamentos</CardTitle>
                  <CardDescription className="text-zinc-400">Período selecionado</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#999" />
                      <YAxis stroke="#999" />
                      <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} name="Receita (R$)" />
                      <Line type="monotone" dataKey="appointments" stroke="#3b82f6" strokeWidth={2} name="Agendamentos" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status de Agendamentos */}
              {serviceData.length > 0 && (
                <Card className="border-white/10 bg-[#14110f] text-white">
                  <CardHeader>
                    <CardTitle>Status de Agendamentos</CardTitle>
                    <CardDescription className="text-zinc-400">Distribuição por status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={serviceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {serviceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="border-white/10 bg-[#14110f] text-white">
              <CardContent className="pt-6">
                <p className="text-center text-zinc-400">Nenhum dado de analytics disponível para o período selecionado.</p>
              </CardContent>
            </Card>
          )}

          {/* Resumo */}
          <Card className="border-white/10 bg-[#14110f] text-white">
            <CardHeader>
              <CardTitle>Resumo do Período</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between border-b border-white/10 pb-3">
                <span className="text-zinc-400">Receita Total</span>
                <span className="font-semibold">R$ {kpis.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-3">
                <span className="text-zinc-400">Agendamentos Concluídos</span>
                <span className="font-semibold">{kpis.completedAppointments}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-3">
                <span className="text-zinc-400">Agendamentos Cancelados</span>
                <span className="font-semibold">{kpis.cancelledAppointments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Taxa de Conclusão</span>
                <span className="font-semibold">{kpis.completionRate.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
