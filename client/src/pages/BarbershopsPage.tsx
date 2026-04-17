import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertCircle, Building2, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

type BarbershopFormState = {
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
};

const initialForm: BarbershopFormState = {
  name: "",
  description: "",
  phone: "",
  email: "",
  address: "",
};

export default function BarbershopsPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Redirect if not super admin
  useEffect(() => {
    if (user && user.role !== "super_admin") {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const [form, setForm] = useState<BarbershopFormState>(initialForm);
  const [feedback, setFeedback] = useState<string | null>(null);

  const barbershopsQuery = trpc.barbershops.list.useQuery(undefined, { retry: false });
  const barbershops = barbershopsQuery.data ?? [];

  const createMutation = trpc.barbershops.create.useMutation({
    onSuccess: () => {
      setFeedback("Barbearia criada com sucesso!");
      setForm(initialForm);
      utils.barbershops.list.invalidate();
    },
    onError: (error) => setFeedback(error.message),
  });

  const toggleMutation = trpc.barbershops.toggleStatus.useMutation({
    onSuccess: () => {
      setFeedback("Status da barbearia atualizado!");
      utils.barbershops.list.invalidate();
    },
    onError: (error) => setFeedback(error.message),
  });

  const handleCreate = () => {
    if (!form.name.trim()) {
      setFeedback("Nome da barbearia é obrigatório.");
      return;
    }
    createMutation.mutate(form);
  };

  const handleToggleStatus = (barbershopId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    toggleMutation.mutate({ barbershopId, status: newStatus as "active" | "inactive" });
  };

  if (user?.role !== "super_admin") {
    return null;
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.22),transparent_35%),linear-gradient(135deg,rgba(20,18,16,0.98),rgba(36,28,22,0.92))] p-8 shadow-2xl shadow-black/30">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.05),transparent)] opacity-40" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1 text-[0.7rem] uppercase tracking-[0.3em] text-amber-100">
              Gestão de barbearias
            </Badge>
            <div className="space-y-3">
              <h1 className="font-serif text-4xl tracking-tight text-white lg:text-5xl">
                Controle suas barbearias
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-zinc-300 lg:text-base">
                Crie novas barbearias, ative ou desative conforme necessário e gerencie todas as operações centralizadamente.
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Total de barbearias</p>
            <p className="mt-2 text-lg font-semibold text-white">{barbershops.length}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Suas barbearias</CardTitle>
            <CardDescription className="text-zinc-400">
              {barbershops.length === 0
                ? "Nenhuma barbearia criada ainda. Crie uma para começar."
                : `Você tem ${barbershops.length} barbearia${barbershops.length !== 1 ? "s" : ""} registrada${barbershops.length !== 1 ? "s" : ""}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {barbershops.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5" />
                  <span>Crie sua primeira barbearia no formulário ao lado.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {barbershops.map((barbershop) => (
                  <div
                    key={barbershop.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-amber-200">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{barbershop.name}</p>
                        <p className="text-xs text-zinc-400">
                          {barbershop.status === "active" ? "Ativa" : "Inativa"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleStatus(barbershop.id, barbershop.status)}
                      disabled={toggleMutation.isPending}
                      className="text-amber-200 hover:bg-amber-300/10"
                    >
                      {barbershop.status === "active" ? (
                        <ToggleRight className="h-5 w-5" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-xl text-white">Criar barbearia</CardTitle>
            <CardDescription className="text-zinc-400">
              Preencha os dados para registar uma nova barbearia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {feedback && (
              <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
                {feedback}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nome da barbearia *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="Ex: Barbearia Central"
                className="h-10 rounded-lg border-white/10 bg-black/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                placeholder="Descreva sua barbearia..."
                className="rounded-lg border-white/10 bg-black/20"
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="h-10 rounded-lg border-white/10 bg-black/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                  placeholder="contato@barbearia.com"
                  className="h-10 rounded-lg border-white/10 bg-black/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
                placeholder="Rua Principal, 123"
                className="h-10 rounded-lg border-white/10 bg-black/20"
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="w-full rounded-lg bg-amber-300 text-stone-950 hover:bg-amber-200"
            >
              {createMutation.isPending ? (
                "A criar..."
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar barbearia
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
