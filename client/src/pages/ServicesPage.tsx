import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";

type ServiceFormState = {
  serviceId: number | null;
  name: string;
  description: string;
  price: string;
  durationMinutes: string;
  barberUserIds: number[];
};

const initialForm: ServiceFormState = {
  serviceId: null,
  name: "",
  description: "",
  price: "",
  durationMinutes: "45",
  barberUserIds: [],
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function ServicesPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const isManager = user?.role === "super_admin" || user?.role === "barber_owner";
  const utils = trpc.useUtils();

  const servicesQuery = trpc.services.list.useQuery(undefined, { retry: false });
  const usersQuery = trpc.users.list.useQuery(undefined, {
    enabled: isManager,
    retry: false,
  });

  const [form, setForm] = useState<ServiceFormState>(initialForm);
  const [feedback, setFeedback] = useState<string | null>(null);

  const services = servicesQuery.data ?? [];
  const teamMembers = useMemo(
    () => (usersQuery.data ?? []).filter((member) => member.role === "barber_owner" || member.role === "barber_staff"),
    [usersQuery.data],
  );
  const averageDuration = services.length
    ? Math.round(services.reduce((total, service) => total + service.durationMinutes, 0) / services.length)
    : 0;

  const createMutation = trpc.services.create.useMutation({
    onSuccess: async () => {
      setFeedback("Serviço criado com sucesso.");
      setForm(initialForm);
      await utils.services.list.invalidate();
    },
    onError: (error) => setFeedback(error.message),
  });

  const updateMutation = trpc.services.update.useMutation({
    onSuccess: async () => {
      setFeedback("Serviço atualizado com sucesso.");
      setForm(initialForm);
      await utils.services.list.invalidate();
    },
    onError: (error) => setFeedback(error.message),
  });

  useEffect(() => {
    if (!isManager) {
      setForm(initialForm);
    }
  }, [isManager]);

  function resetForm() {
    setForm(initialForm);
    setFeedback(null);
  }

  function toggleBarber(barberUserId: number) {
    setForm((current) => ({
      ...current,
      barberUserIds: current.barberUserIds.includes(barberUserId)
        ? current.barberUserIds.filter((id) => id !== barberUserId)
        : [...current.barberUserIds, barberUserId],
    }));
  }

  function loadServiceIntoForm(serviceId: number) {
    const selected = services.find((service) => service.id === serviceId);
    if (!selected) return;

    setForm({
      serviceId: selected.id,
      name: selected.name,
      description: selected.description ?? "",
      price: String(selected.price),
      durationMinutes: String(selected.durationMinutes),
      barberUserIds: selected.barbers.map((barber: { barberUserId: number }) => barber.barberUserId),
    });
    setFeedback(`A editar o serviço "${selected.name}".`);
  }

  function submitForm() {
    const price = Number(form.price.replace(",", "."));
    const durationMinutes = Number(form.durationMinutes);

    if (!form.name.trim() || !Number.isFinite(price) || !Number.isFinite(durationMinutes)) {
      setFeedback("Preencha nome, preço e duração com valores válidos antes de guardar.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price,
      durationMinutes,
      barberUserIds: form.barberUserIds,
    };

    if (form.serviceId) {
      updateMutation.mutate({
        serviceId: form.serviceId,
        ...payload,
      });
      return;
    }

    createMutation.mutate(payload);
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Catálogo de serviços</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Serviços e posicionamento comercial</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
          Mantenha a oferta da barbearia organizada, com preços claros, duração estimada e associação a barbeiros específicos.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardDescription className="text-zinc-400">Serviços ativos</CardDescription>
            <CardTitle className="text-3xl">{servicesQuery.isLoading ? "—" : services.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardDescription className="text-zinc-400">Duração média</CardDescription>
            <CardTitle className="text-3xl">{servicesQuery.isLoading ? "—" : `${averageDuration} min`}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardDescription className="text-zinc-400">Cobertura da equipa</CardDescription>
            <CardTitle className="text-3xl">
              {servicesQuery.isLoading ? "—" : `${services.reduce((total, service) => total + service.barbers.length, 0)} vínculos`}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      {isManager ? (
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardTitle>{form.serviceId ? "Editar serviço" : "Criar novo serviço"}</CardTitle>
            <CardDescription className="text-zinc-400">
              Defina proposta comercial, duração e equipa apta a executar o serviço.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service-name">Nome</Label>
                <Input
                  id="service-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="h-12 rounded-2xl border-white/10 bg-black/20"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="service-price">Preço</Label>
                  <Input
                    id="service-price"
                    value={form.price}
                    onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                    className="h-12 rounded-2xl border-white/10 bg-black/20"
                    placeholder="25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-duration">Duração (min)</Label>
                  <Input
                    id="service-duration"
                    value={form.durationMinutes}
                    onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                    className="h-12 rounded-2xl border-white/10 bg-black/20"
                    placeholder="45"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-description">Descrição</Label>
              <Textarea
                id="service-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-28 rounded-2xl border-white/10 bg-black/20"
                placeholder="Explique o posicionamento do serviço, acabamento e notas relevantes."
              />
            </div>

            <div className="space-y-3">
              <Label>Barbeiros associados</Label>
              {!isManager ? null : usersQuery.isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                  A carregar equipa disponível para associação de serviços.
                </div>
              ) : usersQuery.error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-red-100">
                  Não foi possível carregar a equipa neste momento.
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                  Crie primeiro barbeiros ativos para poder vincular serviços à equipa.
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {teamMembers.map((member) => {
                    const selected = form.barberUserIds.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleBarber(member.id)}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${selected ? "border-amber-300/40 bg-amber-300/10 text-amber-100" : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20"}`}
                      >
                        <div className="font-medium">{member.name ?? "Barbeiro"}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">{member.role.replaceAll("_", " ")}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {feedback ? (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-7 text-amber-100">
                {feedback}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                className="rounded-2xl bg-amber-300 text-stone-950 hover:bg-amber-200"
                onClick={submitForm}
                disabled={isSubmitting}
              >
                {isSubmitting ? "A guardar..." : form.serviceId ? "Guardar alterações" : "Criar serviço"}
              </Button>
              <Button variant="outline" className="rounded-2xl border-white/10 text-white hover:bg-white/10" onClick={resetForm}>
                Limpar formulário
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {servicesQuery.isLoading ? (
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardContent className="p-6 text-sm text-zinc-400">A carregar catálogo de serviços e associações da equipa.</CardContent>
        </Card>
      ) : servicesQuery.error ? (
        <Card className="border-destructive/30 bg-destructive/10 text-white">
          <CardContent className="p-6 text-sm text-red-100">
            Não foi possível carregar os serviços neste momento. Tente novamente dentro de instantes.
          </CardContent>
        </Card>
      ) : services.length === 0 ? (
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardTitle>Nenhum serviço registado ainda</CardTitle>
            <CardDescription className="text-zinc-400">
              Assim que os primeiros serviços forem criados, esta área passará a mostrar preço, duração e associação aos barbeiros em atividade.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-dashed border-amber-300/20 bg-amber-300/5 p-5 text-sm leading-7 text-zinc-300">
              Organize primeiro os serviços principais da casa, como corte, barba e combos. Depois associe cada serviço aos profissionais adequados para que o agendamento automático respeite disponibilidade, duração e posicionamento comercial.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id} className="border-white/10 bg-[#14110f] text-white">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{service.name}</CardTitle>
                    <CardDescription className="mt-2 text-zinc-400">{service.description ?? "Sem descrição adicional."}</CardDescription>
                  </div>
                  <Badge className="rounded-full bg-amber-300/10 text-amber-100">{service.barbers.length} barbeiros</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-zinc-400">Preço base</span>
                  <span className="font-medium text-white">{formatMoney(service.price)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-zinc-400">Duração estimada</span>
                  <span className="font-medium text-white">{service.durationMinutes} min</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-sm text-zinc-400">Equipa vinculada</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {service.barbers.length === 0 ? (
                      <span className="text-sm text-zinc-500">Sem barbeiros associados.</span>
                    ) : (
                      service.barbers.map((barber: { barberUserId: number; barberName?: string | null }) => (
                        <Badge key={`${service.id}-${barber.barberUserId}`} variant="secondary" className="rounded-full bg-white/10 text-zinc-100">
                          {barber.barberName ?? `#${barber.barberUserId}`}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                {isManager ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl border-white/10 text-white hover:bg-white/10"
                    onClick={() => loadServiceIntoForm(service.id)}
                  >
                    Editar serviço
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
