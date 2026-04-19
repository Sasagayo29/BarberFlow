import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { TrpcContext } from "./context";

export interface ServerToClientEvents {
  "appointment:created": (data: {
    appointmentId: number;
    clientName: string;
    serviceName: string;
    startsAt: number;
    barberName: string;
  }) => void;
  "appointment:cancelled": (data: { appointmentId: number; reason?: string }) => void;
  "appointment:rescheduled": (data: {
    appointmentId: number;
    oldDate: number;
    newDate: number;
  }) => void;
  "notification:message": (data: { title: string; message: string; type: "info" | "success" | "warning" | "error" }) => void;
}

export interface ClientToServerEvents {
  "barber:subscribe": (data: { barberId: number }) => void;
  "barber:unsubscribe": (data: { barberId: number }) => void;
}

interface InterServerEvents {}

interface SocketData {
  userId?: number;
  userRole?: string;
  barberId?: number;
}

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

export function initializeWebSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.VITE_FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
    console.log(`[WebSocket] Cliente conectado: ${socket.id}`);

    // Barbeiro se inscreve para receber notificações
    socket.on("barber:subscribe", (data) => {
      socket.data.barberId = data.barberId;
      socket.join(`barber:${data.barberId}`);
      console.log(`[WebSocket] Barbeiro ${data.barberId} inscrito para notificações`);
    });

    // Barbeiro se desinscreve
    socket.on("barber:unsubscribe", (data) => {
      socket.leave(`barber:${data.barberId}`);
      console.log(`[WebSocket] Barbeiro ${data.barberId} desinscrito`);
    });

    socket.on("disconnect", () => {
      console.log(`[WebSocket] Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
}

export function getWebSocketServer() {
  return io;
}

export function notifyBarberNewAppointment(barberId: number, appointmentData: {
  appointmentId: number;
  clientName: string;
  serviceName: string;
  startsAt: number;
  barberName: string;
}) {
  if (!io) return;

  io.to(`barber:${barberId}`).emit("appointment:created", appointmentData);
  console.log(`[WebSocket] Notificação enviada ao barbeiro ${barberId}: novo agendamento`);
}

export function notifyBarberCancelledAppointment(barberId: number, appointmentId: number, reason?: string) {
  if (!io) return;

  io.to(`barber:${barberId}`).emit("appointment:cancelled", { appointmentId, reason });
  console.log(`[WebSocket] Notificação enviada ao barbeiro ${barberId}: agendamento cancelado`);
}

export function notifyBarberRescheduledAppointment(
  barberId: number,
  appointmentId: number,
  oldDate: number,
  newDate: number
) {
  if (!io) return;

  io.to(`barber:${barberId}`).emit("appointment:rescheduled", { appointmentId, oldDate, newDate });
  console.log(`[WebSocket] Notificação enviada ao barbeiro ${barberId}: agendamento reagendado`);
}

export function broadcastNotification(title: string, message: string, type: "info" | "success" | "warning" | "error" = "info") {
  if (!io) return;

  io.emit("notification:message", { title, message, type });
  console.log(`[WebSocket] Notificação transmitida: ${title}`);
}
