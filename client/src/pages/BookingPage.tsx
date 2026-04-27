import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Calendar, Clock, User, Scissors, AlertCircle, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

type BookingFormState = {
  barbershopId: number | null;
  barberId: number | null;
  serviceId: number | null;
  date: string;
  time: string;
  notes: string;
};

const initialForm: BookingFormState = {
  barbershopId: null,
  barberId: null,
  serviceId: null,
  date: "",
  time: "",
  notes: "",
};

export default function BookingPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const utils = trpc.useUtils();

  const [form, setForm] = useState<BookingFormState>(initialForm);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [step, setStep] = useState<"barbershop" | "service" | "barber" | "datetime" | "confirm">("barbershop");

  // Queries
  const barbershopsQuery = trpc.barbershops.listPublic.useQuery(undefined, { retry: false });
  const barbershops = barbershopsQuery.data ?? [];

  const servicesQuery = trpc.services.list.useQuery(
    form.barbershopId ? { barbershopId: form.barbershopId } : undefined,
    { enabled: !!form.barbershopId, retry: false }
  );
  const services = servicesQuery.data ?? [];

  const barbersQuery = trpc.users.list.useQuery(
    form.barbershopId ? { barbershopId: form.barbershopId, role: "barber_staff" } : undefined,
    { enabled: !!form.barbershopId, retry: false }
  );
  const barbers = barbersQuery.data ?? [];

  const availabilityQuery = trpc.appointments.availability.useQuery(
    form.barberId && form.serviceId && form.date ? { barberUserId: form.barberId, serviceId: form.serviceId, date: form.date } : undefined,
    { enabled: !!form.barberId && !!form.serviceId && !!form.date, retry: false }
  );
  const availableSlots = availabilityQuery.data?.slots ?? [];

  // Mutations
  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      setFeedback({ type: "success", message: "Agendamento realizado com sucesso! Você receberá uma confirmação por email." });
      setForm(initialForm);
      setStep("barbershop");
      utils.appointments.listCalendar.invalidate();
    },
    onError: (error) => setFeedback({ type: "error", message: error.message }),
  });

  const handleSelectBarbershop = (barbershopId: number) => {
    setForm({ ...initialForm, barbershopId });
    setStep("service");
    setFeedback(null);
  };

  const handleSelectService = (serviceId: number) => {
    setForm({ ...form, serviceId });
    setStep("barber");
    setFeedback(null);
  };

  const handleSelectBarber = (barberId: number) => {
    setForm({ ...form, barberId });
    setStep("datetime");
    setFeedback(null);
  };

  const handleSelectDateTime = (date: string, time: string) => {
    setForm({ ...form, date, time });
    setStep("confirm");
    setFeedback(null);
  };

  const handleConfirmBooking = () => {
    if (!form.barbershopId || !form.barberId || !form.serviceId || !form.date || !form.time) {
      setFeedback({ type: "error", message: "Todos os campos são obrigatórios" });
      return;
    }

    const [hours, minutes] = form.time.split(":").map(Number);
    const dateObj = new Date(form.date);
    dateObj.setHours(hours, minutes, 0, 0);
    const startsAt = dateObj.getTime();

    createMutation.mutate({
      barberUserId: form.barberId,
      serviceId: form.serviceId,
      startsAt,
      notes: form.notes || undefined,
    });
  };

  const handleBack = () => {
    if (step === "service") setStep("barbershop");
    else if (step === "barber") setStep("service");
    else if (step === "datetime") setStep("barber");
    else if (step === "confirm") setStep("datetime");
  };

  const selectedBarbershop = barbershops.find((b) => b.id === form.barbershopId);
  const selectedService = services.find((s) => s.id === form.serviceId);
  const selectedBarber = barbers.find((b) => b.id === form.barberId);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.22),transparent_35%),linear-gradient(135deg,rgba(20,18,16,0.98),rgba(36,28,22,0.92))] p-8 shadow-2xl shadow-black/30">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.05),transparent)] opacity-40" />
        <div className="relative flex flex-col gap-6">
          <div className="space-y-4">
            <Badge className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1 text-[0.7rem] uppercase tracking-[0.3em] text-amber-100">
              Agendamento Online
            </Badge>
            <div className="space-y-3">
              <h1 className="font-serif text-4xl tracking-tight text-white lg:text-5xl">
                Agende seu corte
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-zinc-300 lg:text-base">
                Escolha sua barbearia, barbeiro, serviço e horário disponível para agendar seu atendimento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {feedback && (
        <div className={`rounded-lg border p-4 text-sm ${
          feedback.type === "success"
            ? "border-green-300/30 bg-green-300/10 text-green-100"
            : "border-red-300/30 bg-red-300/10 text-red-100"
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            {feedback.message}
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Progress Steps */}
        <div className="space-y-4">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-lg text-white">Progresso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { id: "barbershop", label: "Barbearia", icon: Scissors },
                { id: "service", label: "Serviço", icon: Scissors },
                { id: "barber", label: "Barbeiro", icon: User },
                { id: "datetime", label: "Data e Hora", icon: Calendar },
                { id: "confirm", label: "Confirmar", icon: CheckCircle },
              ].map((s) => {
                const stepOrder = ["barbershop", "service", "barber", "datetime", "confirm"];
                const isActive = s.id === step;
                const isCompleted = stepOrder.indexOf(s.id) < stepOrder.indexOf(step);
                const Icon = s.icon;

                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                      isActive ? "bg-amber-300/20 border border-amber-300/30" : isCompleted ? "bg-green-300/10" : "bg-white/5"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-amber-200" : isCompleted ? "text-green-200" : "text-zinc-400"}`} />
                    <span className={`text-sm ${isActive ? "text-amber-100 font-semibold" : isCompleted ? "text-green-100" : "text-zinc-400"}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {step === "barbershop" && (
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Escolha a Barbearia</CardTitle>
                <CardDescription className="text-zinc-400">Selecione a barbearia onde deseja agendar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {barbershops.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-400">
                    Nenhuma barbearia disponível no momento
                  </div>
                ) : (
                  barbershops.map((barbershop) => (
                    <Button
                      key={barbershop.id}
                      onClick={() => handleSelectBarbershop(barbershop.id)}
                      className="w-full justify-start border border-white/10 bg-white/5 text-left text-white hover:bg-white/10"
                      variant="outline"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">{barbershop.name}</p>
                        <p className="text-xs text-zinc-400">{barbershop.address}</p>
                      </div>
                    </Button>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {step === "service" && (
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Escolha o Serviço</CardTitle>
                <CardDescription className="text-zinc-400">
                  Serviços disponíveis em {selectedBarbershop?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {services.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-400">
                    Nenhum serviço disponível
                  </div>
                ) : (
                  services.map((service) => (
                    <Button
                      key={service.id}
                      onClick={() => handleSelectService(service.id)}
                      className="w-full justify-between border border-white/10 bg-white/5 text-left text-white hover:bg-white/10"
                      variant="outline"
                    >
                      <div>
                        <p className="font-semibold">{service.name}</p>
                        <p className="text-xs text-zinc-400">{service.description}</p>
                      </div>
                      <span className="text-amber-200 font-semibold">€{service.price.toFixed(2)}</span>
                    </Button>
                  ))
                )}
                <Button onClick={handleBack} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 mt-4">
                  Voltar
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "barber" && (
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Escolha o Barbeiro</CardTitle>
                <CardDescription className="text-zinc-400">
                  Barbeiros disponíveis para {selectedService?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {barbers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-zinc-400">
                    Nenhum barbeiro disponível
                  </div>
                ) : (
                  barbers.map((barber) => (
                    <Button
                      key={barber.id}
                      onClick={() => handleSelectBarber(barber.id)}
                      className="w-full justify-start border border-white/10 bg-white/5 text-left text-white hover:bg-white/10"
                      variant="outline"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {barber.avatarUrl && (
                          <img src={barber.avatarUrl} alt={barber.name} className="h-10 w-10 rounded-full" />
                        )}
                        <div>
                          <p className="font-semibold">{barber.name}</p>
                          <p className="text-xs text-zinc-400">{barber.phone || "Sem telefone"}</p>
                        </div>
                      </div>
                    </Button>
                  ))
                )}
                <Button onClick={handleBack} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 mt-4">
                  Voltar
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "datetime" && (
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Escolha Data e Hora</CardTitle>
                <CardDescription className="text-zinc-400">
                  Agendamento com {selectedBarber?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="date" className="text-white">
                    Data *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value, time: "" })}
                    className="mt-1 border-white/10 bg-white/5 text-white"
                  />
                </div>

                {form.date && (
                  <div>
                    <Label className="text-white">Horários Disponíveis *</Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {availableSlots.length === 0 ? (
                        <p className="col-span-3 text-sm text-zinc-400">Nenhum horário disponível para esta data</p>
                      ) : (
                        availableSlots.map((slot) => {
                          const slotDate = new Date(slot.startAt);
                          const timeStr = slotDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                          return (
                            <Button
                              key={slot.startAt}
                              onClick={() => handleSelectDateTime(form.date, timeStr)}
                              disabled={!slot.available}
                              className={`border ${
                                form.time === timeStr
                                  ? "border-amber-300/50 bg-amber-300/20 text-amber-100"
                                  : slot.available
                                  ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                                  : "border-white/10 bg-white/5 text-zinc-500 opacity-50 cursor-not-allowed"
                              }`}
                              variant="outline"
                            >
                              {timeStr}
                            </Button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <Button onClick={handleBack} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 mt-4">
                  Voltar
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "confirm" && (
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Confirmar Agendamento</CardTitle>
                <CardDescription className="text-zinc-400">Revise os dados antes de confirmar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
                  <div>
                    <p className="text-xs text-zinc-400">Barbearia</p>
                    <p className="text-white font-semibold">{selectedBarbershop?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Serviço</p>
                    <p className="text-white font-semibold">{selectedService?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Barbeiro</p>
                    <p className="text-white font-semibold">{selectedBarber?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Data e Hora</p>
                    <p className="text-white font-semibold">{form.date} às {form.time}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Preço</p>
                    <p className="text-amber-200 font-semibold">€{selectedService?.price.toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-white">
                    Observações (opcional)
                  </Label>
                  <Input
                    id="notes"
                    placeholder="Ex: Preferências de corte, alergias, etc."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleConfirmBooking}
                    disabled={createMutation.isPending}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                  >
                    {createMutation.isPending ? "Processando..." : "Confirmar Agendamento"}
                  </Button>
                  <Button onClick={handleBack} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    Voltar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
