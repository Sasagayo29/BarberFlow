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
  const [selectedBarbershopId, setSelectedBarbershopId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Buscar todas as barbearias ativas
  const { data: barbershops, isLoading: isLoadingBarbershops } = trpc.barbershop.listAll.useQuery();

  // Mutation para associar cliente à barbearia
  const associateMutation = trpc.client.associateBarbershop.useMutation({
    onSuccess: () => {
      navigate("/dashboard");
    },
    onError: (error) => {
      console.error("Erro ao associar barbearia:", error);
      alert("Erro ao associar barbearia. Tente novamente.");
    },
  });

  const handleAssociate = async () => {
    if (!selectedBarbershopId) {
      alert("Selecione uma barbearia");
      return;
    }

    setIsLoading(true);
    try {
      await associateMutation.mutateAsync({ barbershopId: selectedBarbershopId });
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
                    {barbershop.logoUrl && (
                      <img
                        src={barbershop.logoUrl}
                        alt={barbershop.name}
                        className="w-16 h-16 rounded-lg mb-2 object-cover"
                      />
                    )}
                    <CardTitle>{barbershop.name}</CardTitle>
                    <CardDescription>{barbershop.description || "Barbearia"}</CardDescription>
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
                    <div className="pt-2">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          barbershop.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {barbershop.status === "active" ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action Button */}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={handleAssociate}
                disabled={!selectedBarbershopId || isLoading || associateMutation.isPending}
                size="lg"
              >
                {isLoading || associateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Associando...
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
