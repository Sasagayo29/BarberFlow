import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertCircle, Building2, Edit2, Plus, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

type BarbershopFormState = {
  id?: number;
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const barbershopsQuery = trpc.barbershops.list.useQuery(undefined, { retry: false });
  const barbershops = barbershopsQuery.data ?? [];

  const createMutation = trpc.barbershops.create.useMutation({
    onSuccess: () => {
      setFeedback("Barbearia criada com sucesso!");
      setForm(initialForm);
      setEditingId(null);
      utils.barbershops.list.invalidate();
    },
    onError: (error) => setFeedback(error.message),
  });

  const updateMutation = trpc.barbershops.update.useMutation({
    onSuccess: () => {
      setFeedback("Barbearia atualizada com sucesso!");
      setForm(initialForm);
      setEditingId(null);
      utils.barbershops.list.invalidate();
    },
    onError: (error) => setFeedback(error.message),
  });

  const deleteMutation = trpc.barbershops.delete.useMutation({
    onSuccess: () => {
      setFeedback("Barbearia deletada com sucesso!");
      setShowDeleteConfirm(null);
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

  const handleUpdate = () => {
    if (!form.name.trim()) {
      setFeedback("Nome da barbearia é obrigatório.");
      return;
    }
    if (!form.id) return;
    updateMutation.mutate({
      barbershopId: form.id,
      name: form.name,
      description: form.description,
      phone: form.phone,
      email: form.email,
      address: form.address,
    });
  };

  const handleEdit = (barbershop: any) => {
    setForm({
      id: barbershop.id,
      name: barbershop.name,
      description: barbershop.description || "",
      phone: barbershop.phone || "",
      email: barbershop.email || "",
      address: barbershop.address || "",
    });
    setEditingId(barbershop.id);
    setFeedback(null);
  };

  const handleDelete = (barbershopId: number) => {
    deleteMutation.mutate({ barbershopId });
  };

  const handleCancel = () => {
    setForm(initialForm);
    setEditingId(null);
    setFeedback(null);
  };

  const handleToggleStatus = (barbershopId: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    toggleMutation.mutate({ barbershopId, status: newStatus as "active" | "inactive" });
  };

  if (user?.role !== "super_admin") {
    return null;
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

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
                Crie novas barbearias, edite informações, ative ou desative conforme necessário e gerencie todas as operações centralizadamente.
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Total de barbearias</p>
            <p className="mt-2 text-lg font-semibold text-white">{barbershops.length}</p>
          </div>
        </div>
      </section>

      {feedback && (
        <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
          {feedback}
        </div>
      )}

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
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-amber-200">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{barbershop.name}</p>
                          <p className="text-xs text-zinc-400">
                            {barbershop.status === "active" ? "✓ Ativa" : "✗ Inativa"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(barbershop)}
                        className="text-blue-400 hover:bg-blue-300/10"
                        disabled={isSubmitting}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStatus(barbershop.id, barbershop.status)}
                        disabled={toggleMutation.isPending}
                        className="text-amber-200 hover:bg-amber-300/10"
                      >
                        {barbershop.status === "active" ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowDeleteConfirm(barbershop.id)}
                        className="text-red-400 hover:bg-red-300/10"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {showDeleteConfirm === barbershop.id && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/80 backdrop-blur-sm">
                        <div className="rounded-lg border border-red-300/30 bg-red-300/10 p-6 text-center">
                          <p className="mb-4 text-sm text-red-100">Tem certeza que deseja deletar esta barbearia?</p>
                          <div className="flex gap-3 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowDeleteConfirm(null)}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDelete(barbershop.id)}
                              disabled={deleteMutation.isPending}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Deletar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              {editingId ? "Editar Barbearia" : "Nova Barbearia"}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {editingId ? "Atualize os dados da barbearia" : "Preencha os dados para criar uma nova barbearia"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-white">
                Nome da Barbearia *
              </Label>
              <Input
                id="name"
                placeholder="Ex: Barbearia Premium"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-white">
                Descrição
              </Label>
              <Textarea
                id="description"
                placeholder="Descrição da barbearia..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-white">
                Telefone
              </Label>
              <Input
                id="phone"
                placeholder="Ex: +55 11 98765-4321"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Ex: contato@barbearia.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-white">
                Endereço
              </Label>
              <Input
                id="address"
                placeholder="Ex: Rua Principal, 123, São Paulo"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={isSubmitting}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {isSubmitting ? "Processando..." : editingId ? "Atualizar" : "Criar"}
              </Button>
              {editingId && (
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
