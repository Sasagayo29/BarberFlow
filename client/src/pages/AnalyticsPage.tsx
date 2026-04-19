import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Calendar, TrendingUp, Users, DollarSign } from "lucide-react";
import { useState } from "react";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("month");

  // Dados de exemplo - em produção viriam do backend
  const revenueData = [
    { date: "01/04", revenue: 450, appointments: 5 },
    { date: "02/04", revenue: 620, appointments: 7 },
    { date: "03/04", revenue: 380, appointments: 4 },
    { date: "04/04", revenue: 890, appointments: 10 },
    { date: "05/04", revenue: 720, appointments: 8 },
    { date: "06/04", revenue: 950, appointments: 11 },
    { date: "07/04", revenue: 1100, appointments: 12 },
  ];

  const barberData = [
    { name: "João", appointments: 45, revenue: 2700 },
    { name: "Maria", appointments: 38, revenue: 2280 },
    { name: "Pedro", appointments: 52, revenue: 3120 },
    { name: "Ana", appointments: 41, revenue: 2460 },
  ];

  const serviceData = [
    { name: "Corte", value: 35, fill: "#f59e0b" },
    { name: "Barba", value: 28, fill: "#8b5cf6" },
    { name: "Corte + Barba", value: 25, fill: "#ec4899" },
    { name: "Outros", value: 12, fill: "#06b6d4" },
  ];

  const COLORS = ["#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

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

      {/* Filtro de Período */}
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
            <div className="text-2xl font-bold">R$ 6.110,00</div>
            <p className="text-xs text-zinc-400">+12% vs período anterior</p>
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
            <div className="text-2xl font-bold">57</div>
            <p className="text-xs text-zinc-400">+8% vs período anterior</p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-green-400" />
              Clientes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-zinc-400">+5% vs período anterior</p>
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
            <div className="text-2xl font-bold">R$ 107,19</div>
            <p className="text-xs text-zinc-400">+3% vs período anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Receita e Agendamentos */}
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardTitle>Receita e Agendamentos</CardTitle>
            <CardDescription className="text-zinc-400">Últimos 7 dias</CardDescription>
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

        {/* Serviços Mais Vendidos */}
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardTitle>Serviços Mais Vendidos</CardTitle>
            <CardDescription className="text-zinc-400">Distribuição de vendas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
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

        {/* Barbeiros Mais Procurados */}
        <Card className="border-white/10 bg-[#14110f] text-white lg:col-span-2">
          <CardHeader>
            <CardTitle>Barbeiros Mais Procurados</CardTitle>
            <CardDescription className="text-zinc-400">Agendamentos e receita por barbeiro</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barberData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }} />
                <Legend />
                <Bar dataKey="appointments" fill="#3b82f6" name="Agendamentos" />
                <Bar dataKey="revenue" fill="#f59e0b" name="Receita (R$)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resumo */}
      <Card className="border-white/10 bg-[#14110f] text-white">
        <CardHeader>
          <CardTitle>Resumo do Período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between border-b border-white/10 pb-3">
            <span className="text-zinc-400">Receita Total</span>
            <span className="font-semibold">R$ 6.110,00</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-3">
            <span className="text-zinc-400">Agendamentos Concluídos</span>
            <span className="font-semibold">57</span>
          </div>
          <div className="flex justify-between border-b border-white/10 pb-3">
            <span className="text-zinc-400">Agendamentos Cancelados</span>
            <span className="font-semibold">3</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Taxa de Conclusão</span>
            <span className="font-semibold">95%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
