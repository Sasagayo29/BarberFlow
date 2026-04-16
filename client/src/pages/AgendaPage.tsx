import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";

type ViewMode = "day" | "week" | "month";

type BookingState = {
  serviceId: string;
  barberUserId: string;
  date: string;
  notes: string;
  selectedSlot: number | null;
};

function getRangeForView(view: ViewMode) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (view === "day") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  if (view === "week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start.setDate(now.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }

  if (view === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { startsAt: start.getTime(), endsAt: end.getTime() };
}

function formatDateTime(value: number) {
  return new Date(value).toLocaleString("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDate(value: number) {
  return new Date(value).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function AgendaPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const utils = trpc.useUtils();

  const [view, setView] = useState<ViewMode>("week");
  const [booking, setBooking] = useState<BookingState>({
    serviceId: "",
    barberUserId: "",
    date: toDateInputValue(new Date()),
    notes: "",
    selectedSlot: null,
  });
  const [rescheduleTarget, setRescheduleTarget] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const range = useMemo(() => getRangeForView(view), [view]);
  const canManageTeam = user?.role === "super_admin" || user?.role === "barber_owner";
  const isOperationalBarber = user?.role === "barber_staff";
  const canCreateAppointments = user?.role === "client" || canManageTeam;
  const canUpdateStatus = canManageTeam || isOperationalBarber;

  const servicesQuery = trpc.services.list.useQuery(undefined, { retry: false });
  const calendarQuery = trpc.appointments.listCalendar.useQuery(range, { enabled: Boolean(user), retry: false });
  const historyQuery = trpc.appointments.listHistory.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const availabilityQuery = trpc.appointments.availability.useQuery(
    {
      barberUserId: Number(booking.barberUserId),
      serviceId: Number(booking.serviceId),
      date: booking.date,
    },
    {
      enabled: Boolean(booking.barberUserId && booking.serviceId && booking.date),
      retry: false,
    },
  );

  const services = servicesQuery.data ?? [];
  const appointments = calendarQuery.data ?? [];
  const history = historyQuery.data ?? [];
  const selectedService = services.find((service) => service.id === Number(booking.serviceId));
  const availableBarbers = selectedService?.barbers ?? [];
  const groupedAppointments = appointments.reduce<Record<string, typeof appointments>>((groups, appointment) => {
    const key = new Date(appointment.startsAt).toISOString().slice(0, 10);
    groups[key] = groups[key] ? [...groups[key], appointment] : [appointment];
    return groups;
  }, {});

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: async () => {
      setFeedback("Agendamento confirmado com sucesso.");
      setBooking((current) => ({ ...current, notes: "", selectedSlot: null }));
      setRescheduleTarget(null);
      await Promise.all([
        utils.appointments.listCalendar.invalidate(),
        utils.appointments.listHistory.invalidate(),
        utils.appointments.availability.invalidate(),
        utils.dashboard.summary.invalidate(),
      ]);
    },
    onError: (error) => setFeedback(error.message),
  });

  const cancelMutation = trpc.appointments.cancel.useMutation({
    onSuccess: async () => {
      setFeedback("Agendamento cancelado com sucesso.");
      await Promise.all([
        utils.appointments.listCalendar.invalidate(),
        utils.appointments.listHistory.invalidate(),
        utils.appointments.availability.invalidate(),
        utils.dashboard.summary.invalidate(),
      ]);
    },
    onError: (error) => setFeedback(error.message),
  });

  const rescheduleMutation = trpc.appointments.reschedule.useMutation({
    onSuccess: async () => {
      setFeedback("Agendamento reagendado com sucesso.");
      setRescheduleTarget(null);
      setBooking((current) => ({ ...current, selectedSlot: null }));
      await Promise.all([
        utils.appointments.listCalendar.invalidate(),
        utils.appointments.listHistory.invalidate(),
        utils.appointments.availability.invalidate(),
      ]);
    },
    onError: (error) => setFeedback(error.message),
  });

  const statusMutation = trpc.appointments.updateStatus.useMutation({
    onSuccess: async () => {
      setFeedback("Estado do atendimento atualizado com sucesso.");
      await Promise.all([
        utils.appointments.listCalendar.invalidate(),
        utils.appointments.listHistory.invalidate(),
        utils.dashboard.summary.invalidate(),
      ]);
    },
    onError: (error) => setFeedback(error.message),
  });

  function selectService(serviceId: string) {
    const service = services.find((item) => item.id === Number(serviceId));
    const firstBarber = service?.barbers[0]?.barberUserId;
    setBooking((current) => ({
      ...current,
      serviceId,
      barberUserId: firstBarber ? String(firstBarber) : "",
      selectedSlot: null,
    }));
  }

  function handlePrimaryBookingAction() {
    if (!booking.serviceId || !booking.barberUserId || !booking.selectedSlot) {
      setFeedback("Selecione serviço, barbeiro e horário disponível antes de confirmar.");
      return;
    }

    if (rescheduleTarget) {
      rescheduleMutation.mutate({ appointmentId: rescheduleTarget, startsAt: booking.selectedSlot });
      return;
    }

    createMutation.mutate({
      barberUserId: Number(booking.barberUserId),
      serviceId: Number(booking.serviceId),
      startsAt: booking.selectedSlot,
      notes: booking.notes.trim() || undefined,
    });
  }

  const mutationIsPending =
    createMutation.isPending || cancelMutation.isPending || rescheduleMutation.isPending || statusMutation.isPending;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Agenda operacional</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Agenda, reservas e histórico</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
            Visualize horários por período, confirme reservas, reaja a alterações e acompanhe o histórico de atendimento conforme o perfil ativo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <Button
              key={mode}
              type="button"
              variant="outline"
              className={`rounded-full border-white/10 ${view === mode ? "bg-amber-300 text-stone-950 hover:bg-amber-200" : "text-white hover:bg-white/10"}`}
              onClick={() => setView(mode)}
            >
              {mode === "day" ? "Dia" : mode === "week" ? "Semana" : "Mês"}
            </Button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardDescription className="text-zinc-400">Registos no período</CardDescription>
            <CardTitle className="text-3xl">{calendarQuery.isLoading ? "—" : appointments.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardDescription className="text-zinc-400">Histórico concluído</CardDescription>
            <CardTitle className="text-3xl">{historyQuery.isLoading ? "—" : history.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardDescription className="text-zinc-400">Perfil ativo</CardDescription>
            <CardTitle className="text-3xl">{user?.role?.replaceAll("_", " ") ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      {canCreateAppointments ? (
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardTitle>{rescheduleTarget ? "Reagendar reserva" : "Nova reserva"}</CardTitle>
            <CardDescription className="text-zinc-400">
              Escolha serviço, barbeiro, data e horário. Os slots ocupados são bloqueados automaticamente pelo backend em tempo real.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="booking-service">Serviço</Label>
                <select
                  id="booking-service"
                  value={booking.serviceId}
                  onChange={(event) => selectService(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white"
                >
                  <option value="" className="bg-[#14110f] text-white">Selecionar serviço</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id} className="bg-[#14110f] text-white">
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-barber">Barbeiro</Label>
                <select
                  id="booking-barber"
                  value={booking.barberUserId}
                  onChange={(event) => setBooking((current) => ({ ...current, barberUserId: event.target.value, selectedSlot: null }))}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white"
                >
                  <option value="" className="bg-[#14110f] text-white">Selecionar barbeiro</option>
                  {availableBarbers.map((barber: { barberUserId: number; barberName?: string | null }) => (
                    <option key={barber.barberUserId} value={barber.barberUserId} className="bg-[#14110f] text-white">
                      {barber.barberName ?? `Barbeiro #${barber.barberUserId}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-date">Data</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={booking.date}
                  onChange={(event) => setBooking((current) => ({ ...current, date: event.target.value, selectedSlot: null }))}
                  className="h-12 rounded-2xl border-white/10 bg-black/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking-notes">Notas</Label>
              <Textarea
                id="booking-notes"
                value={booking.notes}
                onChange={(event) => setBooking((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-24 rounded-2xl border-white/10 bg-black/20"
                placeholder="Observações para o atendimento, preferências ou contexto da reserva."
              />
            </div>

            <div className="space-y-3">
              <Label>Horários disponíveis</Label>
              {availabilityQuery.isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                  A calcular horários livres com base na disponibilidade e nos conflitos atuais.
                </div>
              ) : availabilityQuery.error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-red-100">
                  Não foi possível obter a disponibilidade neste momento.
                </div>
              ) : !booking.serviceId || !booking.barberUserId ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-500">
                  Selecione primeiro serviço e barbeiro para consultar os horários disponíveis.
                </div>
              ) : (availabilityQuery.data?.slots ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-500">
                  Não existem slots livres para a combinação escolhida nesta data.
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {(availabilityQuery.data?.slots ?? []).map((slot) => (
                    <button
                      key={slot.startAt}
                      type="button"
                      onClick={() => setBooking((current) => ({ ...current, selectedSlot: slot.startAt }))}
                      className={`rounded-2xl border px-4 py-3 text-sm transition ${booking.selectedSlot === slot.startAt ? "border-amber-300/40 bg-amber-300/10 text-amber-100" : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20"}`}
                    >
                      {new Date(slot.startAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {feedback ? (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-7 text-amber-100">
                {feedback}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl bg-amber-300 text-stone-950 hover:bg-amber-200" onClick={handlePrimaryBookingAction} disabled={mutationIsPending}>
                {mutationIsPending ? "A processar..." : rescheduleTarget ? "Confirmar reagendamento" : "Confirmar agendamento"}
              </Button>
              {rescheduleTarget ? (
                <Button
                  variant="outline"
                  className="rounded-2xl border-white/10 text-white hover:bg-white/10"
                  onClick={() => {
                    setRescheduleTarget(null);
                    setBooking((current) => ({ ...current, selectedSlot: null }));
                    setFeedback(null);
                  }}
                >
                  Cancelar reagendamento
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardTitle>Calendário do período</CardTitle>
            <CardDescription className="text-zinc-400">
              Leitura organizada por {view === "day" ? "dia" : view === "week" ? "semana" : "mês"}, com foco em horários livres, ocupados e ações imediatas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {calendarQuery.isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
                A carregar agenda do período selecionado.
              </div>
            ) : calendarQuery.error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-red-100">
                Não foi possível carregar a agenda neste momento. Verifique as permissões do perfil atual ou tente novamente dentro de instantes.
              </div>
            ) : appointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
                Ainda não existem agendamentos registados para este intervalo.
              </div>
            ) : (
              Object.entries(groupedAppointments).map(([dayKey, items]) => (
                <div key={dayKey} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{dayKey}</p>
                      <p className="mt-1 text-lg font-medium text-white">{formatDate(items[0].startsAt)}</p>
                    </div>
                    <Badge className="rounded-full bg-amber-300/10 text-amber-100">{items.length} reservas</Badge>
                  </div>

                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{item.publicCode}</p>
                            <p className="mt-1 text-lg font-medium text-white">{item.serviceName ?? "Serviço"}</p>
                            <p className="mt-1 text-sm text-zinc-400">
                              {item.clientName ?? "Cliente"} com {item.barberName ?? `Barbeiro #${item.barberUserId}`}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="secondary" className="rounded-full bg-white/10 text-zinc-100">{item.status}</Badge>
                            <span className="text-sm text-zinc-400">{formatDateTime(item.startsAt)}</span>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          {(user?.role === "client" || canManageTeam) && item.status !== "cancelled" ? (
                            <Button
                              variant="outline"
                              className="rounded-2xl border-white/10 text-white hover:bg-white/10"
                              onClick={() => {
                                setRescheduleTarget(item.id);
                                setBooking((current) => ({
                                  ...current,
                                  serviceId: String(item.serviceId),
                                  barberUserId: String(item.barberUserId),
                                  selectedSlot: null,
                                }));
                                setFeedback(`Escolha um novo horário para a reserva ${item.publicCode}.`);
                              }}
                            >
                              Reagendar
                            </Button>
                          ) : null}

                          {(user?.role === "client" || canManageTeam) && item.status !== "cancelled" ? (
                            <Button
                              variant="outline"
                              className="rounded-2xl border-red-400/20 text-red-100 hover:bg-red-500/10"
                              onClick={() => cancelMutation.mutate({ appointmentId: item.id, reason: "Cancelado a partir da agenda." })}
                              disabled={cancelMutation.isPending}
                            >
                              Cancelar
                            </Button>
                          ) : null}

                          {canUpdateStatus && item.status === "confirmed" ? (
                            <Button
                              variant="outline"
                              className="rounded-2xl border-white/10 text-white hover:bg-white/10"
                              onClick={() => statusMutation.mutate({ appointmentId: item.id, status: "completed" })}
                            >
                              Marcar como concluído
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
            <CardDescription className="text-zinc-400">
              Registos passados acessíveis a clientes, barbeiros e gestão dentro do seu perímetro de acesso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {historyQuery.isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                A carregar histórico de atendimentos.
              </div>
            ) : historyQuery.error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-red-100">
                Não foi possível carregar o histórico neste momento.
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-500">
                Ainda não existem atendimentos concluídos no histórico deste perfil.
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{item.serviceName ?? "Serviço"}</p>
                    <Badge variant="secondary" className="rounded-full bg-white/10 text-zinc-100">{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">{formatDateTime(item.startsAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
