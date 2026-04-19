import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CreditCard, User, LogOut, Menu, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function ClientDashboard() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("appointments");

  // Buscar agendamentos do cliente (próximos e passados)
  const now = Date.now();
  const oneMonthFromNow = now + 30 * 24 * 60 * 60 * 1000;
  
  const { data: appointmentsData, isLoading: appointmentsLoading } = trpc.appointments.listCalendar.useQuery(
    { startsAt: now - 90 * 24 * 60 * 60 * 1000, endsAt: oneMonthFromNow },
    { enabled: !!user?.id }
  );

  // Buscar histórico de pagamentos do cliente
  const { data: paymentsData, isLoading: paymentsLoading } = trpc.payments.getPaymentHistory.useQuery(
    undefined,
    { enabled: !!user?.id }
  );

  const handleLogout = async () => {
    await logout();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "no_show":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-accent rounded-lg"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-2xl font-bold text-foreground">Meu Painel</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`fixed md:relative left-0 top-16 md:top-0 z-40 w-64 h-[calc(100vh-4rem)] md:h-screen bg-card border-r border-border transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <nav className="p-4 space-y-2">
            <button
              onClick={() => {
                setActiveTab("profile");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === "profile"
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent/50"
              }`}
            >
              <User size={20} />
              <span>Perfil</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("appointments");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === "appointments"
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent/50"
              }`}
            >
              <Calendar size={20} />
              <span>Agendamentos</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("payments");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === "payments"
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent/50"
              }`}
            >
              <CreditCard size={20} />
              <span>Pagamentos</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-6">Meu Perfil</h2>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nome</label>
                    <p className="text-lg text-foreground">{user?.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-lg text-foreground">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tipo de Conta</label>
                    <p className="text-lg text-foreground">Cliente</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === "appointments" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">Meus Agendamentos</h2>
                <p className="text-muted-foreground">
                  Visualize e gerencie todos os seus agendamentos
                </p>
              </div>

              {appointmentsLoading ? (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">Carregando agendamentos...</p>
                  </CardContent>
                </Card>
              ) : appointmentsData && appointmentsData.length > 0 ? (
                <div className="grid gap-4">
                  {appointmentsData.map((apt: any) => (
                    <Card key={apt.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-foreground">
                                {apt.serviceName}
                              </h3>
                              <Badge className={getStatusBadgeColor(apt.status)}>
                                {apt.status === "confirmed"
                                  ? "Confirmado"
                                  : apt.status === "completed"
                                    ? "Concluído"
                                    : apt.status === "cancelled"
                                      ? "Cancelado"
                                      : "Não Compareceu"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Barbeiro: {apt.barberName}
                            </p>
                            <p className="text-sm text-muted-foreground mb-2">
                              Data: {formatDate(apt.startsAt)}
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              Código: {apt.publicCode}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {apt.status === "confirmed" && (
                              <>
                                <Button variant="outline" size="sm">
                                  Reagendar
                                </Button>
                                <Button variant="destructive" size="sm">
                                  Cancelar
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Calendar size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground mb-4">Você ainda não tem agendamentos</p>
                    </div>
                  </CardContent>
                </Card>
              )
            }
          </div>
        )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">Meus Pagamentos</h2>
                <p className="text-muted-foreground">
                  Visualize o histórico de pagamentos e transações
                </p>
              </div>

              {paymentsLoading ? (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">Carregando pagamentos...</p>
                  </CardContent>
                </Card>
              ) : paymentsData && Array.isArray(paymentsData) && paymentsData.length > 0 ? (
                <div className="grid gap-4">
                  {paymentsData.map((payment: any) => (
                    <Card key={payment.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-foreground">
                                {formatCurrency(payment.amount)}
                              </h3>
                              <Badge className={getPaymentStatusBadgeColor(payment.status)}>
                                {payment.status === "completed"
                                  ? "Concluído"
                                  : payment.status === "pending"
                                    ? "Pendente"
                                    : "Falhou"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Data: {formatDate(payment.createdAt)}
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              ID: {payment.stripePaymentIntentId}
                            </p>
                          </div>
                          <div>
                            <Button variant="outline" size="sm">
                              Recibo
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <CreditCard size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">Você ainda não tem pagamentos registrados</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
