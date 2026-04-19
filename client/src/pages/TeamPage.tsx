import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

type TeamRole = "super_admin" | "barber_admin" | "barber_owner" | "barber_staff";
type MemberStatus = "active" | "inactive" | "blocked";

type TeamFormState = {
  userId: number | null;
  name: string;
  phone: string;
  email: string;
  password: string;
  role: TeamRole;
  specialty: string;
  bio: string;
  displayName: string;
  status: MemberStatus;
};

const initialForm: TeamFormState = {
  userId: null,
  name: "",
  phone: "",
  email: "",
  password: "",
  role: "barber_staff",
  specialty: "",
  bio: "",
  displayName: "",
  status: "active",
};

const roleLabels: Record<TeamRole, string> = {
  super_admin: "Super Admin",
  barber_admin: "Admin da Barbearia",
  barber_owner: "Barbeiro Chef",
  barber_staff: "Barbeiro Operacional",
};

const statusLabels: Record<MemberStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  blocked: "Bloqueado",
};

export default function TeamPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const canManageTeam = user?.role === "super_admin" || user?.role === "barber_owner";
  const canCreateSuperAdmin = user?.role === "super_admin";
  const utils = trpc.useUtils();

  const teamQuery = trpc.users.list.useQuery(undefined, {
    enabled: canManageTeam,
    retry: false,
  });
  const members = teamQuery.data ?? [];

  const [form, setForm] = useState<TeamFormState>(initialForm);
  const [feedback, setFeedback] = useState<string | null>(null);

  const createMutation = trpc.users.create.useMutation({
    onSuccess: async () => {
      setFeedback("Membro da equipa criado com sucesso.");
      setForm(initialForm);
      await utils.users.list.invalidate();
    },
    onError: (error) => setFeedback(error.message),
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: async () => {
      setFeedback("Perfil atualizado com sucesso.");
      setForm(initialForm);
      await utils.users.list.invalidate();
    },
    onError: (error) => setFeedback(error.message),
  });

  const archiveMutation = trpc.users.archive.useMutation({
    onSuccess: async () => {
      setFeedback("Utilizador arquivado com sucesso.");
      await utils.users.list.invalidate();
    },
    onError: (error) => setFeedback(error.message),
  });

  const allowedRoles: TeamRole[] = canCreateSuperAdmin ? ["super_admin", "barber_owner", "barber_staff"] : ["barber_owner", "barber_staff"];
  const isSubmitting = createMutation.isPending || updateMutation.isPending || archiveMutation.isPending;

  function resetForm() {
    setForm(initialForm);
    setFeedback(null);
  }

  function editMember(member: {
    id: number;
    name: string | null;
    phone: string | null;
    email: string | null;
    role: TeamRole | "client";
    status: MemberStatus;
    specialty: string | null;
  }) {
    if (member.role === "client") {
      setFeedback("Clientes não são editados nesta área de equipa.");
      return;
    }

    setForm({
      userId: member.id,
      name: member.name ?? "",
      phone: member.phone ?? "",
      email: member.email ?? "",
      password: "",
      role: member.role,
      specialty: member.specialty ?? "",
      bio: "",
      displayName: member.name ?? "",
      status: member.status,
    });
    setFeedback(`A editar o perfil de ${member.name ?? "membro da equipa"}.`);
  }

  function submitForm() {
    if (!form.name.trim()) {
      setFeedback("Indique o nome do membro da equipa.");
      return;
    }

    if (form.userId) {
      updateMutation.mutate({
        userId: form.userId,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
        status: form.status,
        displayName: form.displayName.trim() || null,
        specialty: form.specialty.trim() || null,
        bio: form.bio.trim() || null,
      });
      return;
    }

    if (!form.email.trim() || !form.password.trim()) {
      setFeedback("Para criar um utilizador, indique e-mail e palavra-passe válidos.");
      return;
    }

    createMutation.mutate({
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      specialty: form.specialty.trim() || undefined,
      bio: form.bio.trim() || undefined,
      displayName: form.displayName.trim() || undefined,
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Equipa e permissões</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Estrutura de utilizadores</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
          Esta vista foi desenhada para separar perfis com clareza, permitindo que a gestão acompanhe funções, estados e especialidades da equipa.
        </p>
      </section>

      {canManageTeam ? (
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <CardTitle>{form.userId ? "Editar membro da equipa" : "Criar membro da equipa"}</CardTitle>
            <CardDescription className="text-zinc-400">
              Super Admin e Barbeiro Chef podem estruturar a equipa, separar permissões e manter o quadro operacional atualizado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="team-name">Nome completo</Label>
                <Input
                  id="team-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="h-12 rounded-2xl border-white/10 bg-black/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-display-name">Nome apresentado</Label>
                <Input
                  id="team-display-name"
                  value={form.displayName}
                  onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                  className="h-12 rounded-2xl border-white/10 bg-black/20"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="team-phone">Telefone</Label>
                <Input
                  id="team-phone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="h-12 rounded-2xl border-white/10 bg-black/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-email">E-mail</Label>
                <Input
                  id="team-email"
                  type="email"
                  disabled={Boolean(form.userId)}
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="h-12 rounded-2xl border-white/10 bg-black/20 disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-password">Palavra-passe {form.userId ? "(mantida)" : ""}</Label>
                <Input
                  id="team-password"
                  type="password"
                  disabled={Boolean(form.userId)}
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  className="h-12 rounded-2xl border-white/10 bg-black/20 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="team-role">Perfil</Label>
                <select
                  id="team-role"
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as TeamRole }))}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white"
                >
                  {allowedRoles.map((role) => (
                    <option key={role} value={role} className="bg-[#14110f] text-white">
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-status">Estado</Label>
                <select
                  id="team-status"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as MemberStatus }))}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white"
                >
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <option key={status} value={status} className="bg-[#14110f] text-white">
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-specialty">Especialidade</Label>
                <Input
                  id="team-specialty"
                  value={form.specialty}
                  onChange={(event) => setForm((current) => ({ ...current, specialty: event.target.value }))}
                  className="h-12 rounded-2xl border-white/10 bg-black/20"
                  placeholder="Fade, barba clássica, combos..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-bio">Notas de perfil</Label>
              <Textarea
                id="team-bio"
                value={form.bio}
                onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                className="min-h-28 rounded-2xl border-white/10 bg-black/20"
                placeholder="Resumo de especialização, posicionamento ou informação interna do membro da equipa."
              />
            </div>

            {feedback ? (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-7 text-amber-100">
                {feedback}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl bg-amber-300 text-stone-950 hover:bg-amber-200" onClick={submitForm} disabled={isSubmitting}>
                {isSubmitting ? "A guardar..." : form.userId ? "Guardar alterações" : "Criar membro"}
              </Button>
              <Button variant="outline" className="rounded-2xl border-white/10 text-white hover:bg-white/10" onClick={resetForm}>
                Limpar formulário
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-white/10 bg-[#14110f] text-white">
        <CardHeader>
          <CardTitle>Perfis registados</CardTitle>
          <CardDescription className="text-zinc-400">Utilizadores disponíveis para operação, atendimento e administração.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canManageTeam ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
              O perfil atual não tem permissão para gerir a equipa.
            </div>
          ) : teamQuery.isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
              A carregar estrutura de utilizadores, papéis e estados da equipa.
            </div>
          ) : teamQuery.error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-red-100">
              Não foi possível carregar a equipa neste momento. Tente novamente dentro de instantes.
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-400">
              Ainda não existem utilizadores registados para apresentar nesta secção.
            </div>
          ) : (
            members.map((member) => {
              const manageable = member.role !== "client";
              return (
                <div key={member.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-medium text-white">{member.name ?? "Sem nome"}</p>
                      <p className="mt-1 text-sm text-zinc-400">{member.email ?? "Sem e-mail"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-full bg-amber-300/10 text-amber-100">{member.role.replaceAll("_", " ")}</Badge>
                      <Badge variant="secondary" className="rounded-full bg-white/10 text-zinc-100">{member.status}</Badge>
                      {member.specialty ? <Badge variant="outline" className="rounded-full border-white/15 text-zinc-300">{member.specialty}</Badge> : null}
                    </div>
                  </div>

                  {manageable ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        className="rounded-2xl border-white/10 text-white hover:bg-white/10"
                        onClick={() =>
                          editMember({
                            id: member.id,
                            name: member.name,
                            phone: member.phone,
                            email: member.email,
                            role: member.role,
                            status: member.status,
                            specialty: member.specialty,
                          })
                        }
                      >
                        Editar perfil
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl border-red-400/20 text-red-100 hover:bg-red-500/10"
                        onClick={() => archiveMutation.mutate({ userId: member.id })}
                        disabled={archiveMutation.isPending}
                      >
                        Arquivar utilizador
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-500">
                      Contas de cliente permanecem geridas fora desta área administrativa de equipa.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
