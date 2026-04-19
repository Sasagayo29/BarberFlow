import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MessageCircle, Instagram, Music } from "lucide-react";
import { useEffect, useState } from "react";

export default function SocialMediaPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const [feedback, setFeedback] = useState<string | null>(null);
  
  const settingsQuery = trpc.socialMedia.get.useQuery();
  const updateMutation = trpc.socialMedia.update.useMutation({
    onSuccess: () => {
      setFeedback("Configurações de redes sociais atualizadas com sucesso!");
      settingsQuery.refetch();
    },
    onError: (error) => setFeedback(error.message),
  });

  const [formData, setFormData] = useState({
    whatsappNumber: "",
    whatsappMessages: "",
    instagramUrl: "",
    instagramEnabled: false,
    tiktokUrl: "",
    tiktokEnabled: false,
    whatsappEnabled: false,
  });

  // Sincronizar formulário com dados carregados
  useEffect(() => {
    if (settingsQuery.data) {
      setFormData({
        whatsappNumber: settingsQuery.data.whatsappNumber || "",
        whatsappMessages: settingsQuery.data.whatsappMessages || "",
        instagramUrl: settingsQuery.data.instagramUrl || "",
        instagramEnabled: Boolean(settingsQuery.data.instagramEnabled),
        tiktokUrl: settingsQuery.data.tiktokUrl || "",
        tiktokEnabled: Boolean(settingsQuery.data.tiktokEnabled),
        whatsappEnabled: Boolean(settingsQuery.data.whatsappEnabled),
      });
    }
  }, [settingsQuery.data]);

  const handleSave = () => {
    // Validação básica
    if (formData.whatsappEnabled && !formData.whatsappNumber) {
      setFeedback("Por favor, preencha o número de WhatsApp");
      return;
    }
    if (formData.instagramEnabled && !formData.instagramUrl) {
      setFeedback("Por favor, preencha a URL do Instagram");
      return;
    }
    if (formData.tiktokEnabled && !formData.tiktokUrl) {
      setFeedback("Por favor, preencha a URL do TikTok");
      return;
    }

    updateMutation.mutate({
      whatsappNumber: formData.whatsappNumber,
      whatsappMessages: formData.whatsappMessages,
      instagramUrl: formData.instagramUrl,
      instagramEnabled: formData.instagramEnabled,
      tiktokUrl: formData.tiktokUrl,
      tiktokEnabled: formData.tiktokEnabled,
      whatsappEnabled: formData.whatsappEnabled,
    });
  };

  if (settingsQuery.isLoading) {
    return (
      <div className="space-y-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-zinc-400">
          A carregar configurações...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Integração com redes sociais</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Redes Sociais e WhatsApp</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
            Configure WhatsApp, Instagram e TikTok para que os clientes possam entrar em contacto facilmente.
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* WhatsApp Card */}
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              <CardTitle>WhatsApp</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              {formData.whatsappEnabled ? "Ativo" : "Inativo"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-zinc-400">Número (com código país)</Label>
              <Input
                type="text"
                placeholder="+351 912 345 678"
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                className="mt-1 border-white/10 bg-black/20 text-white"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.whatsappEnabled}
                onChange={(e) => setFormData({ ...formData, whatsappEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Ativar botão WhatsApp</span>
            </label>
          </CardContent>
        </Card>

        {/* Instagram Card */}
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-500" />
              <CardTitle>Instagram</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              {formData.instagramEnabled ? "Ativo" : "Inativo"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-zinc-400">URL do perfil</Label>
              <Input
                type="url"
                placeholder="https://instagram.com/seu_perfil"
                value={formData.instagramUrl}
                onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                className="mt-1 border-white/10 bg-black/20 text-white"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.instagramEnabled}
                onChange={(e) => setFormData({ ...formData, instagramEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Ativar botão Instagram</span>
            </label>
          </CardContent>
        </Card>

        {/* TikTok Card */}
        <Card className="border-white/10 bg-[#14110f] text-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-cyan-500" />
              <CardTitle>TikTok</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              {formData.tiktokEnabled ? "Ativo" : "Inativo"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-zinc-400">URL do perfil</Label>
              <Input
                type="url"
                placeholder="https://tiktok.com/@seu_perfil"
                value={formData.tiktokUrl}
                onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
                className="mt-1 border-white/10 bg-black/20 text-white"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.tiktokEnabled}
                onChange={(e) => setFormData({ ...formData, tiktokEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Ativar botão TikTok</span>
            </label>
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Messages */}
      <Card className="border-white/10 bg-[#14110f] text-white">
        <CardHeader>
          <CardTitle>Mensagens WhatsApp</CardTitle>
          <CardDescription className="text-zinc-400">
            Adicione mensagens pré-preenchidas que os clientes podem enviar. Use uma por linha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={formData.whatsappMessages}
            onChange={(e) => setFormData({ ...formData, whatsappMessages: e.target.value })}
            placeholder="Gostaria de marcar um horário&#10;Gostaria de saber sobre os serviços&#10;Qual é o preço do corte?"
            className="min-h-32 rounded-2xl border-white/10 bg-black/20 text-white"
          />
          <p className="text-xs text-zinc-400">
            Cada linha será uma opção de mensagem que o cliente pode selecionar.
          </p>
        </CardContent>
      </Card>

      {feedback && (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          {feedback}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          className="rounded-2xl bg-amber-300 text-stone-950 hover:bg-amber-200"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "A guardar..." : "Guardar Configurações"}
        </Button>
      </div>
    </div>
  );
}
