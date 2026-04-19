import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertCircle, Camera, Mail, User } from "lucide-react";
import { useState, useEffect } from "react";

type ProfileFormState = {
  name: string;
  email: string;
  phone: string;
};

export default function ProfilePage() {
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const utils = trpc.useUtils();

  const [form, setForm] = useState<ProfileFormState>({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Re-hidratar form quando user muda (após invalidate)
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user?.id, user?.name, user?.email, user?.phone]);

  const updateMutation = trpc.users.updateOwnProfile.useMutation({
    onSuccess: () => {
      setFeedback("Perfil atualizado com sucesso!");
      setIsEditing(false);
      utils.auth.me.invalidate();
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (error) => setFeedback(error.message),
  });

  const handleUpdate = () => {
    if (!form.name.trim()) {
      setFeedback("Nome é obrigatório.");
      return;
    }
    updateMutation.mutate({
      name: form.name.trim(),
      phone: form.phone.trim() === "" ? null : form.phone.trim(),
    });
  };

  const handleCancel = () => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    }); // Re-sync com user atual
    setIsEditing(false);
    setFeedback(null);
  };

  if (!user) {
    return null;
  }

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    barber_admin: "Admin da Barbearia",
    barber_owner: "Barbeiro Chef",
    barber_staff: "Barbeiro Operacional",
    client: "Cliente",
  };

  const roleColors: Record<string, string> = {
    super_admin: "bg-purple-300/10 text-purple-100 border-purple-300/30",
    barber_admin: "bg-blue-300/10 text-blue-100 border-blue-300/30",
    barber_owner: "bg-amber-300/10 text-amber-100 border-amber-300/30",
    barber_staff: "bg-green-300/10 text-green-100 border-green-300/30",
    client: "bg-gray-300/10 text-gray-100 border-gray-300/30",
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.22),transparent_35%),linear-gradient(135deg,rgba(20,18,16,0.98),rgba(36,28,22,0.92))] p-8 shadow-2xl shadow-black/30">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.05),transparent)] opacity-40" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge className="rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1 text-[0.7rem] uppercase tracking-[0.3em] text-amber-100">
              Meu Perfil
            </Badge>
            <div className="space-y-3">
              <h1 className="font-serif text-4xl tracking-tight text-white lg:text-5xl">
                Gerencie seu perfil
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-zinc-300 lg:text-base">
                Atualize seus dados pessoais, altere seu nome de utilizador e gerencie suas preferências.
              </p>
            </div>
          </div>
        </div>
      </section>

      {feedback && (
        <div className={`rounded-lg border p-4 text-sm ${
          feedback.includes("sucesso")
            ? "border-green-300/30 bg-green-300/10 text-green-100"
            : "border-red-300/30 bg-red-300/10 text-red-100"
        }`}>
          {feedback}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Informações da Conta</CardTitle>
            <CardDescription className="text-zinc-400">
              Detalhes da sua conta e papel no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24 border-2 border-white/10">
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-2xl font-semibold text-white">
                  {user.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Camera className="mr-2 h-4 w-4" />
                Mudar Foto
              </Button>
            </div>

            <div className="space-y-4 border-t border-white/10 pt-6">
              <div>
                <Label className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  <User className="mr-2 inline h-4 w-4" />
                  Nome
                </Label>
                <p className="mt-2 text-lg font-semibold text-white">{user.name}</p>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  <Mail className="mr-2 inline h-4 w-4" />
                  Email
                </Label>
                <p className="mt-2 text-sm text-zinc-300">{user.email}</p>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Papel no Sistema
                </Label>
                <div className="mt-2">
                  <Badge
                    className={`border ${roleColors[user.role] || roleColors.client}`}
                    variant="outline"
                  >
                    {roleLabels[user.role] || "Utilizador"}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Status
                </Label>
                <div className="mt-2">
                  <Badge
                    className="border border-green-300/30 bg-green-300/10 text-green-100"
                    variant="outline"
                  >
                    ✓ Ativo
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              {isEditing ? "Editar Perfil" : "Dados Pessoais"}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {isEditing ? "Atualize seus dados pessoais" : "Clique em editar para alterar seus dados"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-white">Nome de Utilizador</Label>
                  <p className="mt-2 text-lg font-medium text-white">{user.name}</p>
                </div>



                <div>
                  <Label className="text-white">Telefone</Label>
                  <p className="mt-2 text-sm text-zinc-300">{user.phone || "Não informado"}</p>
                </div>

                <Button
                  onClick={() => setIsEditing(true)}
                  className="mt-6 w-full bg-amber-600 hover:bg-amber-700"
                >
                  Editar Perfil
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-white">
                    Nome de Utilizador *
                  </Label>
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                  />
                  <p className="mt-1 text-xs text-zinc-400">
                    Este é o nome que aparecerá na saudação do sistema
                  </p>
                </div>



                <div>
                  <Label htmlFor="phone" className="text-white">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    placeholder="+55 11 98765-4321"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleUpdate}
                    disabled={updateMutation.isPending}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                  >
                    {updateMutation.isPending ? "Guardando..." : "Guardar Alterações"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-300/30 bg-red-300/10">
        <CardHeader>
          <CardTitle className="text-lg text-red-100">Zona de Perigo</CardTitle>
          <CardDescription className="text-red-200/70">
            Ações irreversíveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700"
          >
            Terminar Sessão
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
