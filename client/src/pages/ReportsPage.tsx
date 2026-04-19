import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { FileText, Download, Calendar, Loader } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ReportsPage() {
  const { data: user } = trpc.auth.me.useQuery();
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [isGenerating, setIsGenerating] = useState(false);
  const generateReportMutation = trpc.reports.generatePDF.useMutation();

  // Verificar permissões
  if (!user || !["super_admin", "barber_admin", "barber_owner"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Acesso negado. Apenas administradores podem gerar relatórios.</p>
      </div>
    );
  }

  const handleGenerateReport = async (reportType: "performance" | "appointments" | "revenue") => {
    try {
      setIsGenerating(true);
      const toastId = toast.loading("Gerando relatório...");

      if (!user.barbershopId) {
        toast.error("Barbearia não encontrada", { id: toastId });
        return;
      }

      // Converter datas para timestamps
      const startDate = dateRange.start ? new Date(dateRange.start).getTime() : undefined;
      const endDate = dateRange.end ? new Date(dateRange.end).getTime() : undefined;

      // Chamar procedure tRPC para gerar PDF
      const result = await generateReportMutation.mutateAsync({
        barbershopId: user.barbershopId,
        period: `${dateRange.start || "Início"} a ${dateRange.end || "Fim"}`,
        startDate,
        endDate,
      });

      if (result?.success && result?.pdf) {
        // Converter base64 para blob
        const binaryString = atob(result.pdf);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });

        // Criar link de download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename || `relatorio-${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("Relatório gerado com sucesso!", { id: toastId });
      }
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao gerar relatório. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground mt-2">Gere relatórios em PDF sobre agendamentos, receitas e desempenho</p>
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
              Relatório de Desempenho
            </CardTitle>
            <CardDescription>Análise completa de KPIs e métricas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Inclui receita total, agendamentos, ticket médio, serviços mais procurados e barbeiros com melhor desempenho.
            </p>
            <Button
              onClick={() => handleGenerateReport("performance")}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Relatório de Agendamentos
            </CardTitle>
            <CardDescription>Detalhes de todos os agendamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Inclui informações de clientes, serviços, datas, horas e status dos agendamentos.
            </p>
            <Button
              onClick={() => handleGenerateReport("appointments")}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Relatório de Receitas
            </CardTitle>
            <CardDescription>Análise de receita e pagamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Inclui receita total, valores pagos, pendentes e detalhes por serviço.
            </p>
            <Button
              onClick={() => handleGenerateReport("revenue")}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar PDF
                </>
              )}
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
            <strong>Formato:</strong> Os relatórios são gerados em PDF de alta qualidade com gráficos e tabelas profissionais.
          </p>
          <p>
            <strong>Dados:</strong> Os dados incluem apenas informações da sua barbearia durante o período selecionado.
          </p>
          <p>
            <strong>Segurança:</strong> Todos os relatórios são gerados no servidor e não são armazenados permanentemente.
          </p>
          <p>
            <strong>Frequência:</strong> Você pode gerar relatórios quantas vezes desejar, sem limitações.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
