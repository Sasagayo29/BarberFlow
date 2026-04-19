import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Scissors, User, MapPin, DollarSign, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type BookingStep = "service" | "barber" | "date" | "time" | "confirm";

export function ClientBooking() {
  const { user } = useAuth();
  const [step, setStep] = useState<BookingStep>("service");
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Queries
  const { data: services, isLoading: servicesLoading } = trpc.services.list.useQuery();
  const { data: barbers, isLoading: barbersLoading } = trpc.users.list.useQuery();
  const { data: availability, isLoading: availabilityLoading } = trpc.appointments.availability.useQuery(
    {
      barberUserId: selectedBarber || 0,
      serviceId: selectedService || 0,
      date: selectedDate,
    },
    { enabled: false }
  );

  // Mutation
  const createAppointmentMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      toast.success("Agendamento criado com sucesso!");
      setStep("service");
      setSelectedService(null);
      setSelectedBarber(null);
      setSelectedDate("");
      setSelectedTime("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateAppointment = () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime || !user) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    const startsAt = new Date(`${selectedDate}T${selectedTime}`);
    createAppointmentMutation.mutate({
      serviceId: selectedService,
      barberUserId: selectedBarber,
      startsAt: startsAt.getTime(),
      notes: `Agendamento realizado por ${user.name}`,
    });
  };

  // Gerar datas disponíveis (próximos 30 dias)
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      if (date.getDay() !== 0) {
        // Excluir domingos
        dates.push(date.toISOString().split("T")[0]);
      }
    }
    return dates;
  }, []);

  // Horários disponíveis
  const availableTimes = useMemo(() => {
    const times = [];
    for (let hour = 9; hour < 18; hour++) {
      times.push(`${String(hour).padStart(2, "0")}:00`);
      times.push(`${String(hour).padStart(2, "0")}:30`);
    }
    return times;
  }, []);

  const selectedServiceData = services?.find((s: any) => s.id === selectedService);
  const selectedBarberData = barbers?.find((b: any) => b.userId === selectedBarber);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <h1 className="text-3xl font-bold text-foreground">Agendar Serviço</h1>
          <p className="text-sm text-muted-foreground mt-1">Reserve seu horário com nossos barbeiros</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {(["service", "barber", "date", "time", "confirm"] as const).map((s, i) => (
              <div
                key={s}
                className={`flex items-center ${
                  i < (["service", "barber", "date", "time", "confirm"] as const).indexOf(step)
                    ? "text-green-600"
                    : s === step
                      ? "text-amber-600"
                      : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                    i < (["service", "barber", "date", "time", "confirm"] as const).indexOf(step)
                      ? "bg-green-600 text-white"
                      : s === step
                        ? "bg-amber-600 text-white"
                        : "bg-border"
                  }`}
                >
                  {i < (["service", "barber", "date", "time", "confirm"] as const).indexOf(step) ? (
                    <Check size={16} />
                  ) : (
                    i + 1
                  )}
                </div>
                <span className="text-sm font-medium">
                  {s === "service"
                    ? "Serviço"
                    : s === "barber"
                      ? "Barbeiro"
                      : s === "date"
                        ? "Data"
                        : s === "time"
                          ? "Horário"
                          : "Confirmação"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Serviço */}
        {step === "service" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors size={20} />
                Selecione um Serviço
              </CardTitle>
              <CardDescription>Escolha o serviço que deseja realizar</CardDescription>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <p className="text-center text-muted-foreground py-8">Carregando serviços...</p>
              ) : services && services.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map((service: any) => (
                    <button
                      key={service.id}
                      onClick={() => {
                        setSelectedService(service.id);
                        setStep("barber");
                      }}
                      className={`p-4 rounded-lg border-2 transition text-left ${
                        selectedService === service.id
                          ? "border-amber-600 bg-amber-50 dark:bg-amber-950/20"
                          : "border-border hover:border-amber-300"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{service.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                        </div>
                        <Badge variant="secondary">{service.duration}min</Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-4">
                        <span className="text-lg font-bold text-amber-600">
                          R$ {(service.price / 100).toFixed(2)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum serviço disponível</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Barbeiro */}
        {step === "barber" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={20} />
                Selecione um Barbeiro
              </CardTitle>
              <CardDescription>Escolha o barbeiro que deseja atender</CardDescription>
            </CardHeader>
            <CardContent>
              {barbersLoading ? (
                <p className="text-center text-muted-foreground py-8">Carregando barbeiros...</p>
              ) : barbers && barbers.filter((b: any) => b.role === "barber_staff" || b.role === "barber_owner").length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {barbers
                    .filter((b: any) => b.role === "barber_staff" || b.role === "barber_owner")
                    .map((barber: any) => (
                    <button
                      key={barber.id}
                      onClick={() => {
                        setSelectedBarber(barber.id);
                        setStep("date");
                      }}
                      className={`p-4 rounded-lg border-2 transition text-left ${
                        selectedBarber === barber.id
                          ? "border-amber-600 bg-amber-50 dark:bg-amber-950/20"
                          : "border-border hover:border-amber-300"
                      }`}
                    >
                      <p className="font-semibold">{barber.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">Barbeiro</p>
                      <Badge className="mt-3" variant="outline">
                        Disponível
                      </Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum barbeiro disponível</p>
              )}

              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={() => setStep("service")}>
                  Voltar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Data */}
        {step === "date" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={20} />
                Selecione uma Data
              </CardTitle>
              <CardDescription>Escolha o dia que deseja agendar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                {availableDates.map((date) => (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDate(date);
                      setStep("time");
                    }}
                    className={`p-3 rounded-lg border-2 transition text-center ${
                      selectedDate === date
                        ? "border-amber-600 bg-amber-50 dark:bg-amber-950/20"
                        : "border-border hover:border-amber-300"
                    }`}
                  >
                    <p className="text-xs font-medium">
                      {new Date(date).toLocaleDateString("pt-BR", { weekday: "short" })}
                    </p>
                    <p className="text-sm font-semibold">
                      {new Date(date).toLocaleDateString("pt-BR", { day: "2-digit" })}
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={() => setStep("barber")}>
                  Voltar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Horário */}
        {step === "time" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} />
                Selecione um Horário
              </CardTitle>
              <CardDescription>Escolha o horário que deseja agendar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    onClick={() => {
                      setSelectedTime(time);
                      setStep("confirm");
                    }}
                    className={`p-3 rounded-lg border-2 transition text-center ${
                      selectedTime === time
                        ? "border-amber-600 bg-amber-50 dark:bg-amber-950/20"
                        : "border-border hover:border-amber-300"
                    }`}
                  >
                    <p className="text-sm font-semibold">{time}</p>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={() => setStep("date")}>
                  Voltar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Confirmação */}
        {step === "confirm" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check size={20} />
                Confirme seu Agendamento
              </CardTitle>
              <CardDescription>Revise os detalhes antes de confirmar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-accent/50 rounded-lg border border-border">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Serviço</p>
                      <p className="font-semibold">{selectedServiceData?.name}</p>
                      <p className="text-sm text-amber-600 mt-1">
                        R$ {(selectedServiceData?.price / 100).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Barbeiro</p>
                      <p className="font-semibold">{selectedBarberData?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data</p>
                      <p className="font-semibold">
                        {new Date(selectedDate).toLocaleDateString("pt-BR", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Horário</p>
                      <p className="font-semibold">{selectedTime}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button variant="outline" onClick={() => setStep("time")}>
                    Voltar
                  </Button>
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={createAppointmentMutation.isPending}
                  >
                    {createAppointmentMutation.isPending ? "Agendando..." : "Confirmar Agendamento"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a agendar {selectedServiceData?.name} com {selectedBarberData?.name} em{" "}
              {new Date(selectedDate).toLocaleDateString("pt-BR")} às {selectedTime}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleCreateAppointment} className="bg-amber-600 hover:bg-amber-700">
            Confirmar
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
