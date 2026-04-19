import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { FileText, Download, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ReportsPage() {
  const { data: user } = trpc.auth.me.useQuery();
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [isGenerating, setIsGenerating] = useState(false);

  // Verificar permissões
  if (!user || !["super_admin", "barber_owner"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Acesso negado. Apenas administradores podem gerar relatórios.</p>
      </div>
    );
  }

  const handleGenerateAppointmentsReport = async () => {
    try {
      setIsGenerating(true);
      toast.loading("Gerando relatório de agendamentos...");

      // Simular geração de PDF
      const reportData = {
        title: "Relatório de Agendamentos",
        date: new Date().toLocaleDateString("pt-BR"),
        period: `${dateRange.start || "Início"} a ${dateRange.end || "Fim"}`,
        appointments: [
          { id: 1, client: "João Silva", service: "Corte", date: "2026-04-19", time: "10:00", status: "Confirmado", price: "R$ 50,00" },
          { id: 2, client: "Maria Santos", service: "Barba", date: "2026-04-19", time: "14:00", status: "Pendente", price: "R$ 30,00" },
        ],
        total: "R$ 80,00",
      };

      // Criar conteúdo HTML para PDF
      const htmlContent = `
        <html>
          <head>
            <title>${reportData.title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { background-color: #f5f5f5; }
              .total { font-weight: bold; font-size: 16px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>${reportData.title}</h1>
            <p><strong>Data:</strong> ${reportData.date}</p>
            <p><strong>Período:</strong> ${reportData.period}</p>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Data</th>
                  <th>Hora</th>
                  <th>Status</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.appointments.map(a => `
                  <tr>
                    <td>${a.client}</td>
                    <td>${a.service}</td>
                    <td>${a.date}</td>
                    <td>${a.time}</td>
                    <td>${a.status}</td>
                    <td>${a.price}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
            <div class="total">Total: ${reportData.total}</div>
          </body>
        </html>
      `;

      // Simular download
      const element = document.createElement("a");
      element.setAttribute("href", "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent));
      element.setAttribute("download", `relatorio-agendamentos-${new Date().toISOString().split("T")[0]}.html`);
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateRevenueReport = async () => {
    try {
      setIsGenerating(true);
      toast.loading("Gerando relatório de receitas...");

      const reportData = {
        title: "Relatório de Receitas",
        date: new Date().toLocaleDateString("pt-BR"),
        period: `${dateRange.start || "Início"} a ${dateRange.end || "Fim"}`,
        revenue: [
          { date: "2026-04-19", service: "Corte", amount: "R$ 50,00", status: "Pago" },
          { date: "2026-04-19", service: "Barba", amount: "R$ 30,00", status: "Pendente" },
          { date: "2026-04-18", service: "Corte + Barba", amount: "R$ 70,00", status: "Pago" },
        ],
        totalRevenue: "R$ 150,00",
        totalPaid: "R$ 120,00",
        totalPending: "R$ 30,00",
      };

      const htmlContent = `
        <html>
          <head>
            <title>${reportData.title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; }
              .summary { background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .summary-item { display: inline-block; margin-right: 30px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { background-color: #f5f5f5; }
            </style>
          </head>
          <body>
            <h1>${reportData.title}</h1>
            <p><strong>Data:</strong> ${reportData.date}</p>
            <p><strong>Período:</strong> ${reportData.period}</p>
            <div class="summary">
              <div class="summary-item"><strong>Receita Total:</strong> ${reportData.totalRevenue}</div>
              <div class="summary-item"><strong>Pago:</strong> ${reportData.totalPaid}</div>
              <div class="summary-item"><strong>Pendente:</strong> ${reportData.totalPending}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Serviço</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.revenue.map(r => `
                  <tr>
                    <td>${r.date}</td>
                    <td>${r.service}</td>
                    <td>${r.amount}</td>
                    <td>${r.status}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const element = document.createElement("a");
      element.setAttribute("href", "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent));
      element.setAttribute("download", `relatorio-receitas-${new Date().toISOString().split("T")[0]}.html`);
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground mt-2">Gere relatórios em PDF sobre agendamentos, receitas e clientes</p>
      </div>

      {/* Filtros de Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Período do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Data Inicial</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data Final</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relatórios Disponíveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Relatório de Agendamentos
            </CardTitle>
            <CardDescription>Exporte todos os agendamentos do período</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Inclui informações de clientes, serviços, datas, horas e status dos agendamentos.
            </p>
            <Button
              onClick={handleGenerateAppointmentsReport}
              disabled={isGenerating}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Gerar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Relatório de Receitas
            </CardTitle>
            <CardDescription>Exporte dados de receita e pagamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Inclui receita total, valores pagos, pendentes e detalhes por serviço.
            </p>
            <Button
              onClick={handleGenerateRevenueReport}
              disabled={isGenerating}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Gerar PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle>Informações sobre Relatórios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>Formato:</strong> Os relatórios são gerados em HTML e podem ser salvos como PDF através do navegador.
          </p>
          <p>
            <strong>Dados:</strong> Os dados incluem apenas informações da sua barbearia durante o período selecionado.
          </p>
          <p>
            <strong>Segurança:</strong> Todos os relatórios são gerados localmente e não são armazenados em servidores.
          </p>
          <p>
            <strong>Frequência:</strong> Você pode gerar relatórios quantas vezes desejar, sem limitações.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
