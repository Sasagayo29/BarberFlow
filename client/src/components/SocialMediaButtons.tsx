import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { MessageCircle, Instagram, Music } from "lucide-react";
import { useState } from "react";

export function SocialMediaButtons() {
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const settingsQuery = trpc.socialMedia.get.useQuery();
  const settings = settingsQuery.data;

  if (!settings) return null;

  const handleWhatsAppClick = (message?: string) => {
    if (!settings.whatsappNumber) return;
    
    const text = message || "Olá, gostaria de mais informações";
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}?text=${encodedText}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleInstagramClick = () => {
    if (settings.instagramUrl) {
      window.open(settings.instagramUrl, "_blank");
    }
  };

  const handleTiktokClick = () => {
    if (settings.tiktokUrl) {
      window.open(settings.tiktokUrl, "_blank");
    }
  };

  const whatsappMessages = settings.whatsappMessages
    ? settings.whatsappMessages.split("\n").filter((m) => m.trim())
    : [];

  return (
    <div className="space-y-4">
      {/* WhatsApp Section */}
      {settings.whatsappEnabled && settings.whatsappNumber && (
        <div className="space-y-2">
          <Button
            onClick={() => handleWhatsAppClick()}
            className="w-full rounded-2xl bg-green-600 text-white hover:bg-green-700"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Contacte-nos no WhatsApp
          </Button>

          {whatsappMessages.length > 0 && (
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {whatsappMessages.map((message, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handleWhatsAppClick(message)}
                  className="rounded-xl border-green-600/30 text-xs hover:bg-green-50 dark:hover:bg-green-950"
                >
                  {message}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instagram & TikTok Row */}
      <div className="flex gap-2">
        {settings.instagramEnabled && settings.instagramUrl && (
          <Button
            onClick={handleInstagramClick}
            className="flex-1 rounded-2xl bg-pink-600 text-white hover:bg-pink-700"
          >
            <Instagram className="mr-2 h-4 w-4" />
            Instagram
          </Button>
        )}

        {settings.tiktokEnabled && settings.tiktokUrl && (
          <Button
            onClick={handleTiktokClick}
            className="flex-1 rounded-2xl bg-cyan-600 text-white hover:bg-cyan-700"
          >
            <Music className="mr-2 h-4 w-4" />
            TikTok
          </Button>
        )}
      </div>
    </div>
  );
}
