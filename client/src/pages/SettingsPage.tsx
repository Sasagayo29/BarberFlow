import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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

type CustomizationFormState = {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  theme: "dark" | "light";
  primaryColor: string;
  secondaryColor: string;
  welcomeMessage: string;
  welcomeHeading: string;
  welcomeDescription: string;
  badgeText: string;
  logoUrl: string;
  customCss: string;
};

const initialAvailabilityForm: AvailabilityFormState = {
  barberUserId: "",
  type: "unavailable",
  startAt: "",
  endAt: "",
  reason: "",
};

const initialCustomizationForm: CustomizationFormState = {
  companyName: "",
  companyPhone: "",
  companyEmail: "",
  companyAddress: "",
  theme: "dark",
  primaryColor: "#d4af37",
  secondaryColor: "#785c3f",
  welcomeMessage: "Bem-vindo à nossa barbearia",
  welcomeHeading: "Bem-vindo",
  welcomeDescription: "O painel centraliza agenda, equipa, serviços e indicadores do negócio numa experiência refinada, com leitura clara e foco operacional.",
  badgeText: "Gestão premium da barbearia",
  logoUrl: "",
  customCss: "",
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
  const canManageCustomization = user?.role === "super_admin" || user?.role === "barber_owner";

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
  const [customizationForm, setCustomizationForm] = useState<CustomizationFormState>(initialCustomizationForm);
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

  const customizationMutation = trpc.settings.customization.set.useMutation({
    onSuccess: async () => {
      setFeedback("Customização salva com sucesso!");
      await utils.settings.customization.get.invalidate();
    },
    onError: (error) => setFeedback(error.message),
  });

  function saveCustomization() {
    if (!customizationForm.companyName.trim()) {
      setFeedback("Nome da empresa é obrigatório.");
      return;
    }

    customizationMutation.mutate({
      companyName: customizationForm.companyName,
      companyPhone: customizationForm.companyPhone,
      companyEmail: customizationForm.companyEmail,
      companyAddress: customizationForm.companyAddress,
      theme: customizationForm.theme,
      primaryColor: customizationForm.primaryColor,
      secondaryColor: customizationForm.secondaryColor,
      welcomeMessage: customizationForm.welcomeMessage,
      welcomeHeading: customizationForm.welcomeHeading,
      welcomeDescription: customizationForm.welcomeDescription,
      badgeText: customizationForm.badgeText,
      logoUrl: customizationForm.logoUrl,
      customCss: customizationForm.customCss,
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

      {canManageCustomization && (
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardTitle>Customização da barbearia</CardTitle>
            <CardDescription className="text-zinc-400">
              Personalize o nome, contactos, tema e mensagens da sua barbearia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nome da empresa</Label>
                <Input
                  id="company-name"
                  value={customizationForm.companyName}
                  onChange={(e) => setCustomizationForm((current) => ({ ...current, companyName: e.target.value }))}
                  placeholder="Ex: Barbearia Central"
                  className="h-10 rounded-lg border-white/10 bg-black/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-phone">Telefone</Label>
                <Input
                  id="company-phone"
                  value={customizationForm.companyPhone}
                  onChange={(e) => setCustomizationForm((current) => ({ ...current, companyPhone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="h-10 rounded-lg border-white/10 bg-black/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-email">E-mail</Label>
                <Input
                  id="company-email"
                  type="email"
                  value={customizationForm.companyEmail}
                  onChange={(e) => setCustomizationForm((current) => ({ ...current, companyEmail: e.target.value }))}
                  placeholder="contato@barbearia.com"
                  className="h-10 rounded-lg border-white/10 bg-black/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-address">Endereço</Label>
                <Input
                  id="company-address"
                  value={customizationForm.companyAddress}
                  onChange={(e) => setCustomizationForm((current) => ({ ...current, companyAddress: e.target.value }))}
                  placeholder="Rua Principal, 123"
                  className="h-10 rounded-lg border-white/10 bg-black/20"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="theme">Tema</Label>
                <select
                  id="theme"
                  value={customizationForm.theme}
                  onChange={(e) => setCustomizationForm((current) => ({ ...current, theme: e.target.value as "dark" | "light" }))}
                  className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-white"
                >
                  <option value="dark">Escuro</option>
                  <option value="light">Claro</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary-color">Cor primária</Label>
                <div className="flex gap-2">
                  <input
                    id="primary-color"
                    type="color"
                    value={customizationForm.primaryColor}
                    onChange={(e) => setCustomizationForm((current) => ({ ...current, primaryColor: e.target.value }))}
                    className="h-10 w-16 rounded-lg border border-white/10 cursor-pointer"
                  />
                  <Input
                    value={customizationForm.primaryColor}
                    onChange={(e) => setCustomizationForm((current) => ({ ...current, primaryColor: e.target.value }))}
                    placeholder="#d4af37"
                    className="h-10 flex-1 rounded-lg border-white/10 bg-black/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary-color">Cor secundária</Label>
                <div className="flex gap-2">
                  <input
                    id="secondary-color"
                    type="color"
                    value={customizationForm.secondaryColor}
                    onChange={(e) => setCustomizationForm((current) => ({ ...current, secondaryColor: e.target.value }))}
                    className="h-10 w-16 rounded-lg border border-white/10 cursor-pointer"
                  />
                  <Input
                    value={customizationForm.secondaryColor}
                    onChange={(e) => setCustomizationForm((current) => ({ ...current, secondaryColor: e.target.value }))}
                    placeholder="#785c3f"
                    className="h-10 flex-1 rounded-lg border-white/10 bg-black/20"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome-heading">Título de Boas-vindas (no Dashboard)</Label>
              <Input
                id="welcome-heading"
                value={customizationForm.welcomeHeading}
                onChange={(e) => setCustomizationForm((current) => ({ ...current, welcomeHeading: e.target.value }))}
                placeholder="Bem-vindo"
                className="h-10 rounded-lg border-white/10 bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge-text">Texto do Badge (no Dashboard)</Label>
              <Input
                id="badge-text"
                value={customizationForm.badgeText}
                onChange={(e) => setCustomizationForm((current) => ({ ...current, badgeText: e.target.value }))}
                placeholder="Gestão premium da barbearia"
                className="h-10 rounded-lg border-white/10 bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome-description">Descrição (no Dashboard)</Label>
              <Textarea
                id="welcome-description"
                value={customizationForm.welcomeDescription}
                onChange={(e) => setCustomizationForm((current) => ({ ...current, welcomeDescription: e.target.value }))}
                placeholder="O painel centraliza agenda, equipa, serviços e indicadores do negócio..."
                className="rounded-lg border-white/10 bg-black/20"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome-message">Mensagem de boas-vindas</Label>
              <Textarea
                id="welcome-message"
                value={customizationForm.welcomeMessage}
                onChange={(e) => setCustomizationForm((current) => ({ ...current, welcomeMessage: e.target.value }))}
                placeholder="Bem-vindo à nossa barbearia"
                className="rounded-lg border-white/10 bg-black/20"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo-url">URL do Logo</Label>
              <Input
                id="logo-url"
                type="url"
                value={customizationForm.logoUrl}
                onChange={(e) => setCustomizationForm((current) => ({ ...current, logoUrl: e.target.value }))}
                placeholder="https://cdn.example.com/logo.png"
                className="h-10 rounded-lg border-white/10 bg-black/20"
              />
              <p className="text-xs text-zinc-500">Cole a URL do logo da sua barbearia. Use manus-upload-file para fazer upload.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-css">CSS Customizado</Label>
              <Textarea
                id="custom-css"
                value={customizationForm.customCss}
                onChange={(e) => setCustomizationForm((current) => ({ ...current, customCss: e.target.value }))}
                placeholder="/* Adicione CSS customizado aqui */\n.custom-class { color: red; }"
                className="rounded-lg border-white/10 bg-black/20 font-mono text-sm"
                rows={5}
              />
              <p className="text-xs text-zinc-500">CSS que será aplicado globalmente no painel e landing page.</p>
            </div>

            <Button
              onClick={saveCustomization}
              className="w-full rounded-lg bg-amber-300 text-stone-950 hover:bg-amber-200"
            >
              Salvar customização
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-white/10 bg-[#14110f] text-white">
        <CardHeader>
          <CardTitle>Horário da barbearia</CardTitle>
          <CardDescription className="text-zinc-400">
            Estrutura semanal utilizada como referência para disponibilidade global e reserva de slots.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hours.map((hour) => (
            <div key={hour.weekday} className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex-1">
                <p className="font-medium text-white">{hour.label}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={getHourDraft(hour.weekday, hour).isOpen}
                  onChange={(e) => updateHourDraft(hour.weekday, { isOpen: e.target.checked }, hour)}
                  className="h-4 w-4 rounded border-white/10 bg-black/20"
                />
                <span className="text-sm text-zinc-400">Aberto</span>
              </div>
              {getHourDraft(hour.weekday, hour).isOpen && (
                <>
                  <Input
                    type="time"
                    value={getHourDraft(hour.weekday, hour).startTime}
                    onChange={(e) => updateHourDraft(hour.weekday, { startTime: e.target.value }, hour)}
                    className="h-10 w-24 rounded-lg border-white/10 bg-black/20"
                  />
                  <span className="text-zinc-400">até</span>
                  <Input
                    type="time"
                    value={getHourDraft(hour.weekday, hour).endTime}
                    onChange={(e) => updateHourDraft(hour.weekday, { endTime: e.target.value }, hour)}
                    className="h-10 w-24 rounded-lg border-white/10 bg-black/20"
                  />
                  <Button
                    size="sm"
                    onClick={() => saveBusinessHour(hour.weekday, hour)}
                    disabled={upsertHoursMutation.isPending}
                    className="rounded-lg bg-amber-300 text-stone-950 hover:bg-amber-200"
                  >
                    Guardar
                  </Button>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {canManageAvailability && (
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardTitle>Disponibilidade individual</CardTitle>
            <CardDescription className="text-zinc-400">
              Marque períodos de indisponibilidade ou disponibilidade extra para barbeiros específicos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {barberOptions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="barber-select">Barbeiro</Label>
                <select
                  id="barber-select"
                  value={selectedBarberId}
                  onChange={(e) => setSelectedBarberId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-white"
                >
                  <option value="">Selecione um barbeiro</option>
                  {barberOptions.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="availability-type">Tipo</Label>
                <select
                  id="availability-type"
                  value={availabilityForm.type}
                  onChange={(e) => setAvailabilityForm((current) => ({ ...current, type: e.target.value as "available" | "unavailable" }))}
                  className="h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-white"
                >
                  <option value="unavailable">Indisponível</option>
                  <option value="available">Disponível</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability-reason">Motivo (opcional)</Label>
                <Input
                  id="availability-reason"
                  value={availabilityForm.reason}
                  onChange={(e) => setAvailabilityForm((current) => ({ ...current, reason: e.target.value }))}
                  placeholder="Ex: Férias, Formação"
                  className="h-10 rounded-lg border-white/10 bg-black/20"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="availability-start">Início</Label>
                <Input
                  id="availability-start"
                  type="datetime-local"
                  value={availabilityForm.startAt}
                  onChange={(e) => setAvailabilityForm((current) => ({ ...current, startAt: e.target.value }))}
                  className="h-10 rounded-lg border-white/10 bg-black/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability-end">Fim</Label>
                <Input
                  id="availability-end"
                  type="datetime-local"
                  value={availabilityForm.endAt}
                  onChange={(e) => setAvailabilityForm((current) => ({ ...current, endAt: e.target.value }))}
                  className="h-10 rounded-lg border-white/10 bg-black/20"
                />
              </div>
            </div>

            <Button
              onClick={saveAvailabilityOverride}
              disabled={createAvailabilityMutation.isPending}
              className="w-full rounded-lg bg-amber-300 text-stone-950 hover:bg-amber-200"
            >
              {createAvailabilityMutation.isPending ? "A guardar..." : "Guardar disponibilidade"}
            </Button>

            {availabilityItems.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-medium text-zinc-300">Períodos registados (próximos 14 dias):</p>
                {availabilityItems.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                    <p className="text-white">
                      {item.type === "unavailable" ? "❌ Indisponível" : "✅ Disponível"} {item.reason ? `(${item.reason})` : ""}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {new Date(item.startAt).toLocaleString("pt-PT")} até {new Date(item.endAt).toLocaleString("pt-PT")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
