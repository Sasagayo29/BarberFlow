import { MessageCircle, Instagram, Music } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function FloatingContactButtons() {
  const [isOpen, setIsOpen] = useState(false);
  const [socialMedia, setSocialMedia] = useState<any>(null);
  
  const settingsQuery = trpc.socialMedia.get.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSocialMedia(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  // Não mostrar se houver erro (usuário não autenticado ou sem barbershop)
  if (settingsQuery.isError) return null;

  if (!socialMedia) return null;

  const handleWhatsApp = () => {
    if (socialMedia.whatsappNumber && socialMedia.whatsappEnabled) {
      const message = socialMedia.whatsappMessages || "Olá! Gostaria de agendar um serviço.";
      const encodedMessage = encodeURIComponent(message);
      const phoneNumber = socialMedia.whatsappNumber.replace(/\D/g, "");
      window.open(
        `https://wa.me/${phoneNumber}?text=${encodedMessage}`,
        "_blank"
      );
    }
  };

  const handleInstagram = () => {
    if (socialMedia.instagramUrl && socialMedia.instagramEnabled) {
      window.open(socialMedia.instagramUrl, "_blank");
    }
  };

  const handleTikTok = () => {
    if (socialMedia.tiktokUrl && socialMedia.tiktokEnabled) {
      window.open(socialMedia.tiktokUrl, "_blank");
    }
  };

  const hasAnyEnabled =
    (socialMedia.whatsappEnabled && socialMedia.whatsappNumber) ||
    (socialMedia.instagramEnabled && socialMedia.instagramUrl) ||
    (socialMedia.tiktokEnabled && socialMedia.tiktokUrl);

  if (!hasAnyEnabled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Botões Expandidos */}
      {isOpen && (
        <>
          {socialMedia.whatsappEnabled && socialMedia.whatsappNumber && (
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
              title="Enviar mensagem no WhatsApp"
            >
              <MessageCircle size={20} />
              <span className="text-sm font-medium">WhatsApp</span>
            </button>
          )}

          {socialMedia.instagramEnabled && socialMedia.instagramUrl && (
            <button
              onClick={handleInstagram}
              className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
              title="Seguir no Instagram"
            >
              <Instagram size={20} />
              <span className="text-sm font-medium">Instagram</span>
            </button>
          )}

          {socialMedia.tiktokEnabled && socialMedia.tiktokUrl && (
            <button
              onClick={handleTikTok}
              className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
              title="Seguir no TikTok"
            >
              <Music size={20} />
              <span className="text-sm font-medium">TikTok</span>
            </button>
          )}
        </>
      )}

      {/* Botão de Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200 ${
          isOpen
            ? "bg-gray-600 hover:bg-gray-700"
            : "bg-blue-500 hover:bg-blue-600"
        } text-white`}
        title={isOpen ? "Fechar" : "Abrir contato"}
      >
        <span className="text-2xl">{isOpen ? "✕" : "💬"}</span>
      </button>
    </div>
  );
}
