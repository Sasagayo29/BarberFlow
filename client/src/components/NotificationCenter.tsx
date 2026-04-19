import { useEffect, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, AlertCircle } from "lucide-react";

interface NotificationCenterProps {
  barberId?: number;
}

export function NotificationCenter({ barberId }: NotificationCenterProps) {
  const { isConnected, notifications } = useWebSocket(barberId);
  const [showPanel, setShowPanel] = useState(false);

  return (
    <div className="relative">
      {/* Ícone de Notificação */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 hover:bg-accent rounded-lg transition"
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600">
            {notifications.length}
          </Badge>
        )}
      </button>

      {/* Painel de Notificações */}
      {showPanel && (
        <Card className="absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto shadow-lg z-50">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Bell size={18} />
                Notificações
              </h3>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Conectado" : "Desconectado"}
              </Badge>
            </div>
          </div>

          <div className="divide-y divide-border">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div key={notification.appointmentId} className="p-4 hover:bg-accent/50 transition">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={18} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{notification.clientName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.serviceName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.startsAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
