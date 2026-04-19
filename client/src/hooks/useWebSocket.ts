import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

interface AppointmentNotification {
  appointmentId: number;
  clientName: string;
  serviceName: string;
  startsAt: number;
  barberName: string;
}

export function useWebSocket(barberId?: number) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<AppointmentNotification[]>([]);

  useEffect(() => {
    // Conectar ao servidor WebSocket
    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[WebSocket] Conectado ao servidor");
      setIsConnected(true);

      // Se é barbeiro, se inscrever para notificações
      if (barberId) {
        socket.emit("barber:subscribe", { barberId });
      }
    });

    socket.on("disconnect", () => {
      console.log("[WebSocket] Desconectado do servidor");
      setIsConnected(false);
    });

    // Ouvir notificações de novo agendamento
    socket.on("appointment:created", (data: AppointmentNotification) => {
      console.log("[WebSocket] Novo agendamento:", data);
      setNotifications((prev) => [data, ...prev]);
      toast.success(`Novo agendamento de ${data.clientName}!`, {
        description: `${data.serviceName} com ${data.barberName}`,
      });
    });

    // Ouvir notificações de cancelamento
    socket.on("appointment:cancelled", (data: { appointmentId: number; reason?: string }) => {
      console.log("[WebSocket] Agendamento cancelado:", data);
      setNotifications((prev) => prev.filter((n) => n.appointmentId !== data.appointmentId));
      toast.error("Agendamento cancelado", {
        description: data.reason || "Um agendamento foi cancelado",
      });
    });

    // Ouvir notificações de reagendamento
    socket.on("appointment:rescheduled", (data: { appointmentId: number; oldDate: number; newDate: number }) => {
      console.log("[WebSocket] Agendamento reagendado:", data);
      toast.info("Agendamento reagendado", {
        description: `Agendamento movido para ${new Date(data.newDate).toLocaleDateString("pt-BR")}`,
      });
    });

    // Ouvir mensagens de notificação
    socket.on("notification:message", (data: { title: string; message: string; type: "info" | "success" | "warning" | "error" }) => {
      console.log("[WebSocket] Notificação:", data);
      toast[data.type](data.title, { description: data.message });
    });

    socket.on("connect_error", (error) => {
      console.error("[WebSocket] Erro de conexão:", error);
    });

    return () => {
      if (barberId) {
        socket.emit("barber:unsubscribe", { barberId });
      }
      socket.disconnect();
    };
  }, [barberId]);

  return {
    isConnected,
    notifications,
    socket: socketRef.current,
  };
}
