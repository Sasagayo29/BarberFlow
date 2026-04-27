import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, Phone, Mail } from "lucide-react";

export default function SelectBarbershopPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedBarbershopId, setSelectedBarbershopId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Buscar todas as barbearias ativas
  const { data: barbershops, isLoading: isLoadingBarbershops } = trpc.barbershops.listPublic.useQuery();

  // Mutation para vincular cliente à barbearia
  const linkMutation = trpc.barbershops.linkClient.useMutation({
    onSuccess: () => {
      navigate("/dashboard", { replace: true });
    },
    onError: (error) => {
      console.error("Erro ao vincular barbearia:", error);
      alert("Erro ao vincular barbearia. Tente novamente.");
    },
  });

  const handleLink = async () => {
    if (!selectedBarbershopId) {
      alert("Selecione uma barbearia");
      return;
    }

    setIsLoading(true);
    try {
      await linkMutation.mutateAsync({ barbershopId: selectedBarbershopId });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Faça login para continuar</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Selecione uma Barbearia</h1>
          <p className="text-muted-foreground">Escolha a barbearia que deseja visitar</p>
        </div>

        {/* Loading State */}
        {isLoadingBarbershops && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Barbershops Grid */}
        {!isLoadingBarbershops && barbershops && barbershops.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {barbershops.map((barbershop) => (
                <Card
                  key={barbershop.id}
                  className={`cursor-pointer transition-all ${
                    selectedBarbershopId === barbershop.id
                      ? "ring-2 ring-primary border-primary"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedBarbershopId(barbershop.id)}
                >
                  <CardHeader>
                    <CardTitle>{barbershop.name}</CardTitle>
                    <CardDescription>Barbearia</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {barbershop.address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{barbershop.address}</span>
                      </div>
                    )}
                    {barbershop.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{barbershop.phone}</span>
                      </div>
                    )}
                    {barbershop.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{barbershop.email}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action Button */}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={handleLink}
                disabled={!selectedBarbershopId || isLoading || linkMutation.isPending}
                size="lg"
              >
                {isLoading || linkMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  "Continuar"
                )}
              </Button>
              <Button variant="outline" onClick={() => navigate("/dashboard", { replace: true })} size="lg">
                Cancelar
              </Button>
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoadingBarbershops && (!barbershops || barbershops.length === 0) && (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">Nenhuma barbearia disponível no momento</p>
              <Button onClick={() => navigate("/dashboard", { replace: true })}>Voltar ao Dashboard</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
