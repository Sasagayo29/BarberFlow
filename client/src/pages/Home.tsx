import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SocialMediaButtons } from "@/components/SocialMediaButtons";
import FloatingContactButtons from "@/components/FloatingContactButtons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CalendarClock, Crown, Scissors, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

const highlights = [
  {
    icon: CalendarClock,
    title: "Agendamento em tempo real",
    description: "Bloqueio automático de horários ocupados, reagendamento rápido e leitura clara da agenda por barbeiro.",
  },
  {
    icon: Users,
    title: "Perfis bem separados",
    description: "Super Admin, Barbeiro Chef, Barbeiro Operacional e Cliente com permissões distintas e fluxos adequados.",
  },
  {
    icon: Scissors,
    title: "Serviços organizados",
    description: "Catálogo de serviços, duração estimada, preço e associação a barbeiros específicos.",
  },
  {
    icon: Crown,
    title: "Controlo do negócio",
    description: "Painel com métricas, histórico, visão operacional e base para decisões administrativas consistentes.",
  },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      setFeedback("Sessão iniciada com sucesso. A redirecionar para o painel.");
      setLocation("/dashboard");
    },
    onError: (error) => setFeedback(error.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      setFeedback("Conta criada com sucesso. Pode iniciar sessão de imediato.");
      setRegisterForm({ name: "", phone: "", email: "", password: "" });
    },
    onError: (error) => setFeedback(error.message),
  });

  const recoveryMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setFeedback("Pedido de recuperação registado. Utilize o token devolvido pelo backend para concluir o fluxo de redefinição.");
      setRecoveryEmail("");
    },
    onError: (error) => setFeedback(error.message),
  });

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  const stats = useMemo(
    () => [
      { label: "Perfis de acesso", value: "4" },
      { label: "Vistas operacionais", value: "Dia · Semana · Mês" },
      { label: "Foco", value: "Elegância e controlo" },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(120,92,63,0.18),transparent_24%),linear-gradient(180deg,#0b0a09,#14110f_40%,#0c0b0a)] text-white">
      <FloatingContactButtons />
      <main className="container py-8 lg:py-12">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="space-y-8">
            <Badge className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-1 text-[0.7rem] uppercase tracking-[0.35em] text-amber-100">
              Plataforma de gestão para barbearias
            </Badge>

            <div className="space-y-6">
              <h1 className="max-w-4xl font-serif text-5xl leading-tight tracking-tight text-white lg:text-7xl">
                Gestão elegante para uma barbearia organizada, moderna e preparada para crescer.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-zinc-300 lg:text-lg">
                Centralize agendamentos, serviços, clientes, equipa e decisões administrativas numa aplicação web com identidade visual refinada e estrutura operacional sólida.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{item.label}</p>
                  <p className="mt-3 text-xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {highlights.map((item) => (
                <Card key={item.title} className="border-white/10 bg-white/5 backdrop-blur-sm">
                  <CardHeader>
                    <div className="mb-3 w-fit rounded-2xl border border-white/10 bg-black/20 p-3 text-amber-200">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-xl text-white">{item.title}</CardTitle>
                    <CardDescription className="text-zinc-400">{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="mb-4 text-sm text-zinc-400">Contacte-nos atraves das nossas redes sociais:</p>
              <SocialMediaButtons />
            </div>
          </div>

          <Card className="sticky top-8 border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Entrar na plataforma</CardTitle>
              <CardDescription className="text-zinc-400">
                Aceda com e-mail e palavra-passe, crie conta de cliente ou inicie o fluxo de recuperação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-black/20">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Cadastro</TabsTrigger>
                  <TabsTrigger value="recovery">Recuperar</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginForm.email}
                      onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                      className="h-12 rounded-2xl border-white/10 bg-black/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Palavra-passe</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginForm.password}
                      onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                      className="h-12 rounded-2xl border-white/10 bg-black/20"
                    />
                  </div>
                  <Button
                    className="h-12 w-full rounded-2xl bg-amber-300 text-stone-950 hover:bg-amber-200"
                    disabled={loginMutation.isPending}
                    onClick={() => loginMutation.mutate(loginForm)}
                  >
                    {loginMutation.isPending ? "A entrar..." : "Entrar"}
                  </Button>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nome completo</Label>
                    <Input
                      id="register-name"
                      value={registerForm.name}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                      className="h-12 rounded-2xl border-white/10 bg-black/20"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="register-phone">Telefone</Label>
                      <Input
                        id="register-phone"
                        value={registerForm.phone}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))}
                        className="h-12 rounded-2xl border-white/10 bg-black/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">E-mail</Label>
                      <Input
                        id="register-email"
                        type="email"
                        value={registerForm.email}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                        className="h-12 rounded-2xl border-white/10 bg-black/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Palavra-passe</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerForm.password}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                      className="h-12 rounded-2xl border-white/10 bg-black/20"
                    />
                  </div>
                  <Button
                    className="h-12 w-full rounded-2xl bg-white text-stone-950 hover:bg-zinc-100"
                    disabled={registerMutation.isPending}
                    onClick={() => registerMutation.mutate(registerForm)}
                  >
                    {registerMutation.isPending ? "A criar conta..." : "Criar conta"}
                  </Button>
                </TabsContent>

                <TabsContent value="recovery" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recovery-email">E-mail da conta</Label>
                    <Input
                      id="recovery-email"
                      type="email"
                      value={recoveryEmail}
                      onChange={(event) => setRecoveryEmail(event.target.value)}
                      className="h-12 rounded-2xl border-white/10 bg-black/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recovery-note">Observação</Label>
                    <Textarea
                      id="recovery-note"
                      value="O backend devolve um token de recuperação para permitir a continuação do fluxo enquanto a camada de notificações é evoluída."
                      readOnly
                      className="min-h-28 rounded-2xl border-white/10 bg-black/20 text-zinc-300"
                    />
                  </div>
                  <Button
                    className="h-12 w-full rounded-2xl border border-white/10 bg-transparent text-white hover:bg-white/10"
                    disabled={recoveryMutation.isPending}
                    onClick={() => recoveryMutation.mutate({ email: recoveryEmail })}
                  >
                    {recoveryMutation.isPending ? "A preparar recuperação..." : "Gerar pedido de recuperação"}
                  </Button>
                </TabsContent>
              </Tabs>

              {feedback ? (
                <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-7 text-amber-100">
                  {feedback}
                </div>
              ) : null}


            </CardContent>
          </Card>
        </section>

        <section className="mt-10 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Separação funcional</p>
              <h2 className="mt-3 font-serif text-3xl text-white">Uma experiência distinta para cada perfil.</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-3 text-amber-200"><ShieldCheck className="h-5 w-5" /> Super Admin</div>
                <p className="text-sm leading-7 text-zinc-400">Controlo global sobre utilizadores, regras do sistema, serviços e supervisão administrativa.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-3 text-amber-200"><Crown className="h-5 w-5" /> Barbeiro Chef</div>
                <p className="text-sm leading-7 text-zinc-400">Gestão da equipa, horários da operação, catálogo de serviços e visão transversal dos agendamentos.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-3 text-amber-200"><Scissors className="h-5 w-5" /> Barbeiro Operacional</div>
                <p className="text-sm leading-7 text-zinc-400">Acesso à sua agenda, gestão da própria disponibilidade e atualização do estado dos atendimentos.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-3 text-amber-200"><Users className="h-5 w-5" /> Cliente</div>
                <p className="text-sm leading-7 text-zinc-400">Reserva de horários, consulta do histórico e relação clara com serviços e profissionais disponíveis.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
