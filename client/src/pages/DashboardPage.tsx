import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CalendarClock, Scissors, ShieldCheck, Users } from "lucide-react";
import { useLocation } from "wouter";

const quickLinks = [
  {
    title: "Agenda",
    description: "Acompanhe o movimento do dia e confirme reagendamentos com rapidez.",
    href: "/agenda",
    icon: CalendarClock,
  },
  {
    title: "Serviços",
    description: "Atualize preços, duração estimada e vínculo com barbeiros.",
    href: "/servicos",
    icon: Scissors,
  },
  {
    title: "Equipa",
    description: "Gira permissões e mantenha o quadro de barbeiros organizado.",
    href: "/equipa",
    icon: Users,
  },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function DashboardPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const [, setLocation] = useLocation();
  const summaryQuery = trpc.dashboard.summary.useQuery(undefined, {
    enabled: user?.role === "super_admin" || user?.role === "barber_owner",
    retry: false,
  });

  const cards = [
    {
      title: "Agendamentos totais",
      value: summaryQuery.data?.totalAppointments ?? 0,
      description: "Volume acumulado de reservas registadas.",
      icon: CalendarClock,
    },
    {
      title: "Receita concluída",
      value: formatMoney(summaryQuery.data?.totalRevenue ?? 0),
      description: "Valor consolidado dos atendimentos concluídos.",
      icon: ShieldCheck,
    },
    {
      title: "Próximos atendimentos",
      value: summaryQuery.data?.upcomingAppointments ?? 0,
      description: "Reservas futuras já confirmadas ou pendentes.",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.22),transparent_35%),linear-gradient(135deg,rgba(20,18,16,0.98),rgba(36,28,22,0.92))] p-8 shadow-2xl shadow-black/30">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.05),transparent)] opacity-40" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1 text-[0.7rem] uppercase tracking-[0.3em] text-amber-100">
              Gestão premium da barbearia
            </Badge>
            <div className="space-y-3">
              <h1 className="font-serif text-4xl tracking-tight text-white lg:text-5xl">
                Bem-vindo, {user?.name ?? "equipa"}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-zinc-300 lg:text-base">
                O painel centraliza agenda, equipa, serviços e indicadores do negócio numa experiência refinada, com leitura clara e foco operacional.
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Perfil ativo</p>
            <p className="mt-2 text-lg font-semibold text-white">{user?.role?.replaceAll("_", " ")}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardDescription className="text-zinc-400">{card.title}</CardDescription>
                <CardTitle className="mt-2 text-3xl text-white">{summaryQuery.isLoading ? "—" : card.value}</CardTitle>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-amber-200">
                <card.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-white/10 bg-[#15110e] text-white">
          <CardHeader>
            <CardTitle className="text-2xl">Serviços em destaque</CardTitle>
            <CardDescription className="text-zinc-400">
              Visão rápida dos serviços mais procurados para apoiar decisões comerciais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(summaryQuery.data?.topServices ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
                Ainda não existem dados suficientes para destacar serviços. Assim que os agendamentos forem registados, esta secção passa a refletir a procura real.
              </div>
            ) : (
              (summaryQuery.data?.topServices ?? []).map((service, index) => (
                <div
                  key={service.serviceId}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div>
                    <p className="text-sm text-zinc-500">#{index + 1}</p>
                    <p className="text-base font-medium text-white">{service.serviceName ?? "Serviço"}</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full bg-amber-300/10 text-amber-100">
                    {service.usageCount} utilizações
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Acesso rápido</CardTitle>
            <CardDescription className="text-zinc-400">
              Navegue diretamente para as áreas mais usadas da operação diária.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickLinks.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => setLocation(item.href)}
                className="group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-amber-300/30 hover:bg-white/8"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-amber-200">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-500 transition group-hover:translate-x-1 group-hover:text-amber-200" />
              </button>
            ))}

            <Button className="mt-4 w-full rounded-2xl bg-amber-300 text-stone-950 hover:bg-amber-200" onClick={() => setLocation("/agenda")}>
              Abrir agenda operacional
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
