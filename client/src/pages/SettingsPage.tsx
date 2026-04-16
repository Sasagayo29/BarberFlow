import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";

const weekdayLabels = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const defaultWeeklyHours = weekdayLabels.map((label, weekday) => ({
  id: -(weekday + 1),
  weekday,
  startTime: "09:00",
  endTime: "19:00",
  isOpen: weekday !== 0,
  label,
}));

type AvailabilityFormState = {
  barberUserId: string;
  type: "available" | "unavailable";
  startAt: string;
  endAt: string;
  reason: string;
};

const initialAvailabilityForm: AvailabilityFormState = {
  barberUserId: "",
  type: "unavailable",
  startAt: "",
  endAt: "",
  reason: "",
};

function toDateTimeLocalInput(value: number) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocalInput(value: string) {
  return new Date(value).getTime();
}

export default function SettingsPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const utils = trpc.useUtils();
  const canManageGlobalHours = user?.role === "super_admin" || user?.role === "barber_owner";
  const canManageAvailability = user?.role !== undefined && user.role !== "client";

  const hoursQuery = trpc.settings.businessHours.list.useQuery(undefined, { retry: false });
  const teamQuery = trpc.users.list.useQuery(undefined, { enabled: canManageGlobalHours, retry: false });

  const teamMembers = teamQuery.data ?? [];
  const barberOptions = useMemo(() => {
    if (canManageGlobalHours) {
      return teamMembers.filter((member) => member.role === "barber_owner" || member.role === "barber_staff");
    }
    if (user && (user.role === "barber_owner" || user.role === "barber_staff")) {
      const currentUser = user;
      return [
        {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
        },
      ];
    }
    return [];
  }, [canManageGlobalHours, teamMembers, user]);

  const [hoursDraft, setHoursDraft] = useState<Record<number, { startTime: string; endTime: string; isOpen: boolean }>>({});
  const [selectedBarberId, setSelectedBarberId] = useState<string>(user?.role === "barber_owner" || user?.role === "barber_staff" ? String(user.id) : "");
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityFormState>({
    ...initialAvailabilityForm,
    barberUserId: user?.role === "barber_owner" || user?.role === "barber_staff" ? String(user.id) : "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const effectiveBarberId = Number(selectedBarberId || availabilityForm.barberUserId || 0);
  const availabilityRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 14);
    end.setHours(23, 59, 59, 999);
    return { startsAt: start.getTime(), endsAt: end.getTime() };
  }, []);

  const availabilityQuery = trpc.settings.barberAvailability.list.useQuery(
    {
      barberUserId: effectiveBarberId,
      startsAt: availabilityRange.startsAt,
      endsAt: availabilityRange.endsAt,
    },
    {
      enabled: canManageAvailability && effectiveBarberId > 0,
      retry: false,
    },
  );

  const upsertHoursMutation = trpc.settings.businessHours.upsert.useMutation({
    onSuccess: async () => {
      setFeedback("Horário semanal atualizado com sucesso.");
      await utils.settings.businessHours.list.invalidate();
    },
    onError: (error) => setFeedback(error.message),
  });

  const createAvailabilityMutation = trpc.settings.barberAvailability.create.useMutation({
    onSuccess: async () => {
      setFeedback("Disponibilidade individual atualizada com sucesso.");
      setAvailabilityForm((current) => ({ ...initialAvailabilityForm, barberUserId: current.barberUserId }));
      await utils.settings.barberAvailability.list.invalidate();
    },
    onError: (error) => setFeedback(error.message),
  });

  const hours = useMemo(() => {
    const existing = new Map((hoursQuery.data ?? []).map((item) => [item.weekday, item]));
    return defaultWeeklyHours.map((fallback) => {
      const current = existing.get(fallback.weekday);
      return current
        ? { ...current, label: weekdayLabels[current.weekday] ?? fallback.label }
        : fallback;
    });
  }, [hoursQuery.data]);
  const availabilityItems = availabilityQuery.data ?? [];

  function getHourDraft(weekday: number, current: { startTime: string; endTime: string; isOpen: number | boolean }) {
    return hoursDraft[weekday] ?? {
      startTime: current.startTime,
      endTime: current.endTime,
      isOpen: Boolean(current.isOpen),
    };
  }

  function updateHourDraft(weekday: number, patch: Partial<{ startTime: string; endTime: string; isOpen: boolean }>, current: { startTime: string; endTime: string; isOpen: number | boolean }) {
    const base = getHourDraft(weekday, current);
    setHoursDraft((draft) => ({
      ...draft,
      [weekday]: {
        ...base,
        ...patch,
      },
    }));
  }

  function saveBusinessHour(weekday: number, current: { startTime: string; endTime: string; isOpen: number | boolean }) {
    const draft = getHourDraft(weekday, current);
    upsertHoursMutation.mutate({
      weekday,
      startTime: draft.startTime,
      endTime: draft.endTime,
      isOpen: draft.isOpen,
    });
  }

  function saveAvailabilityOverride() {
    if (!availabilityForm.barberUserId || !availabilityForm.startAt || !availabilityForm.endAt) {
      setFeedback("Selecione barbeiro, início e fim para registar a disponibilidade individual.");
      return;
    }

    createAvailabilityMutation.mutate({
      barberUserId: Number(availabilityForm.barberUserId),
      type: availabilityForm.type,
      startAt: fromDateTimeLocalInput(availabilityForm.startAt),
      endAt: fromDateTimeLocalInput(availabilityForm.endAt),
      reason: availabilityForm.reason.trim() || undefined,
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Configuração operacional</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Horários e disponibilidade</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
          Ajuste o ritmo semanal da barbearia, mantenha indisponibilidades individuais sob controlo e sustente o bloqueio automático de reservas com regras claras.
        </p>
      </section>

      {feedback ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-7 text-amber-100">
          {feedback}
        </div>
      ) : null}

      <Card className="border-white/10 bg-[#14110f] text-white">
        <CardHeader>
          <CardTitle>Horário da barbearia</CardTitle>
          <CardDescription className="text-zinc-400">
            Estrutura semanal utilizada como referência para disponibilidade global e reserva de slots.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canManageGlobalHours ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
              Apenas perfis de gestão podem alterar o horário global da barbearia.
            </div>
          ) : hoursQuery.isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
              A carregar a configuração semanal de funcionamento da barbearia.
            </div>
          ) : hoursQuery.error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-red-100">
              Não foi possível carregar os horários de funcionamento neste momento. Tente novamente dentro de instantes.
            </div>
          ) : (
            hours.map((item) => {
              const draft = getHourDraft(item.weekday, item);
              return (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr_auto] lg:items-end">
                    <div>
                      <p className="font-medium text-white">{item.label ?? weekdayLabels[item.weekday] ?? `Dia ${item.weekday}`}</p>
                      <p className="mt-1 text-sm text-zinc-400">Base operacional da agenda e das janelas de reserva.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`start-${item.weekday}`}>Abertura</Label>
                      <Input
                        id={`start-${item.weekday}`}
                        type="time"
                        value={draft.startTime}
                        onChange={(event) => updateHourDraft(item.weekday, { startTime: event.target.value }, item)}
                        className="h-12 rounded-2xl border-white/10 bg-black/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`end-${item.weekday}`}>Fecho</Label>
                      <Input
                        id={`end-${item.weekday}`}
                        type="time"
                        value={draft.endTime}
                        onChange={(event) => updateHourDraft(item.weekday, { endTime: event.target.value }, item)}
                        className="h-12 rounded-2xl border-white/10 bg-black/20"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className={`rounded-2xl border-white/10 ${draft.isOpen ? "text-emerald-200 hover:bg-emerald-500/10" : "text-zinc-300 hover:bg-white/10"}`}
                        onClick={() => updateHourDraft(item.weekday, { isOpen: !draft.isOpen }, item)}
                      >
                        {draft.isOpen ? "Aberto" : "Encerrado"}
                      </Button>
                      <Button
                        type="button"
                        className="rounded-2xl bg-amber-300 text-stone-950 hover:bg-amber-200"
                        onClick={() => saveBusinessHour(item.weekday, item)}
                        disabled={upsertHoursMutation.isPending}
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[#14110f] text-white">
        <CardHeader>
          <CardTitle>Disponibilidade individual</CardTitle>
          <CardDescription className="text-zinc-400">
            Registe exceções por barbeiro para reforçar bloqueios automáticos, folgas, janelas extra ou disponibilidade especial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!canManageAvailability ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
              A disponibilidade individual só pode ser gerida por barbeiros ou perfis de gestão.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-2 xl:col-span-1">
                  <Label htmlFor="availability-barber">Barbeiro</Label>
                  <select
                    id="availability-barber"
                    value={availabilityForm.barberUserId}
                    onChange={(event) => {
                      setAvailabilityForm((current) => ({ ...current, barberUserId: event.target.value }));
                      setSelectedBarberId(event.target.value);
                    }}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white"
                  >
                    <option value="" className="bg-[#14110f] text-white">Selecionar barbeiro</option>
                    {barberOptions.map((barber) => (
                      <option key={barber.id} value={barber.id} className="bg-[#14110f] text-white">
                        {barber.name ?? `Barbeiro #${barber.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability-type">Tipo</Label>
                  <select
                    id="availability-type"
                    value={availabilityForm.type}
                    onChange={(event) => setAvailabilityForm((current) => ({ ...current, type: event.target.value as "available" | "unavailable" }))}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white"
                  >
                    <option value="unavailable" className="bg-[#14110f] text-white">Indisponível</option>
                    <option value="available" className="bg-[#14110f] text-white">Disponível</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability-start">Início</Label>
                  <Input
                    id="availability-start"
                    type="datetime-local"
                    value={availabilityForm.startAt}
                    onChange={(event) => setAvailabilityForm((current) => ({ ...current, startAt: event.target.value }))}
                    className="h-12 rounded-2xl border-white/10 bg-black/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability-end">Fim</Label>
                  <Input
                    id="availability-end"
                    type="datetime-local"
                    value={availabilityForm.endAt}
                    onChange={(event) => setAvailabilityForm((current) => ({ ...current, endAt: event.target.value }))}
                    className="h-12 rounded-2xl border-white/10 bg-black/20"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    className="h-12 w-full rounded-2xl bg-amber-300 text-stone-950 hover:bg-amber-200"
                    onClick={saveAvailabilityOverride}
                    disabled={createAvailabilityMutation.isPending}
                  >
                    Guardar disponibilidade
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability-reason">Motivo</Label>
                <Textarea
                  id="availability-reason"
                  value={availabilityForm.reason}
                  onChange={(event) => setAvailabilityForm((current) => ({ ...current, reason: event.target.value }))}
                  className="min-h-24 rounded-2xl border-white/10 bg-black/20"
                  placeholder="Folga, formação, encaixe especial, atendimento externo ou outro contexto operacional."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">Próximas exceções de agenda</p>
                    <p className="mt-1 text-sm text-zinc-400">Janela dos próximos 14 dias para o barbeiro selecionado.</p>
                  </div>
                  {selectedBarberId ? (
                    <Badge className="rounded-full bg-amber-300/10 text-amber-100">{availabilityItems.length} registos</Badge>
                  ) : null}
                </div>

                {!selectedBarberId ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-500">
                    Selecione um barbeiro para consultar ou editar a disponibilidade individual.
                  </div>
                ) : availabilityQuery.isLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                    A carregar disponibilidade individual do barbeiro selecionado.
                  </div>
                ) : availabilityQuery.error ? (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-red-100">
                    Não foi possível carregar os registos de disponibilidade neste momento.
                  </div>
                ) : availabilityItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-500">
                    Ainda não existem exceções registadas para este barbeiro no horizonte configurado.
                  </div>
                ) : (
                  availabilityItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-medium text-white">{item.reason ?? "Sem motivo especificado"}</p>
                          <p className="mt-1 text-sm text-zinc-400">
                            {toDateTimeLocalInput(item.startAt).replace("T", " ")} — {toDateTimeLocalInput(item.endAt).replace("T", " ")}
                          </p>
                        </div>
                        <Badge className={`rounded-full ${item.type === "available" ? "bg-emerald-500/10 text-emerald-200" : "bg-white/10 text-zinc-100"}`}>
                          {item.type === "available" ? "Disponível" : "Indisponível"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
