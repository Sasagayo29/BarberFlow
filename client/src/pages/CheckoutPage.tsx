import { useEffect, useState } from "react";
import { useSearchParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setMessage("ID de sessão não encontrado");
      return;
    }

    // Simular confirmação de pagamento
    const confirmPayment = async () => {
      try {
        // Aqui você confirmaria o pagamento com seu backend
        // const result = await trpc.payments.confirmPayment.mutate({ paymentId: sessionId });
        
        // Por enquanto, apenas simulamos o sucesso
        setStatus("success");
        setMessage("Pagamento realizado com sucesso!");
      } catch (error) {
        setStatus("error");
        setMessage("Erro ao processar pagamento. Por favor, tente novamente.");
        console.error(error);
      }
    };

    confirmPayment();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Processando Pagamento</CardTitle>
          <CardDescription>Aguarde enquanto processamos sua transação</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {status === "loading" && (
            <>
              <Loader className="w-12 h-12 animate-spin text-blue-500" />
              <p className="text-center text-sm text-slate-600">Processando seu pagamento...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500" />
              <div className="text-center">
                <p className="font-semibold text-green-600">{message}</p>
                <p className="text-sm text-slate-600 mt-2">
                  Seu agendamento foi confirmado. Você receberá um email de confirmação em breve.
                </p>
              </div>
              <Button onClick={() => (window.location.href = "/")} className="w-full">
                Voltar para Home
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <AlertCircle className="w-12 h-12 text-red-500" />
              <div className="text-center">
                <p className="font-semibold text-red-600">{message}</p>
                <p className="text-sm text-slate-600 mt-2">
                  Por favor, tente novamente ou entre em contato com o suporte.
                </p>
              </div>
              <Button onClick={() => (window.location.href = "/")} variant="outline" className="w-full">
                Voltar para Home
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
