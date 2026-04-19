import cron from "node-cron";
import { getDb } from "../db";
import { appointments, users, barbershops, services } from "../../drizzle/schema";
import { eq, and, gte, lt } from "drizzle-orm";
import { generateAppointmentReminderEmail, AppointmentConfirmationData } from "./emailNotification";
import { notifyOwner } from "./notification";

interface ScheduledJob {
  taskName: string;
  cronExpression: string;
  lastRun?: Date;
  nextRun?: Date;
  isRunning: boolean;
}

const jobs: Map<string, ScheduledJob> = new Map();

/**
 * Inicializa o job scheduler para lembretes de email
 * Executa a cada hora para verificar agendamentos que precisam de lembrete
 */
export async function initializeReminderScheduler(): Promise<void> {
  console.log("[ReminderScheduler] Inicializando scheduler de lembretes...");

  // Job que roda a cada hora para verificar agendamentos
  const job = cron.schedule("0 * * * *", async () => {
    await sendReminderEmails();
  });

  jobs.set("reminderEmails", {
    taskName: "Envio de Lembretes de Email",
    cronExpression: "0 * * * *", // A cada hora
    isRunning: false,
  });

  console.log("[ReminderScheduler] Scheduler inicializado com sucesso!");
  console.log("[ReminderScheduler] Job de lembretes agendado para rodar a cada hora");

  // Executar uma vez na inicialização para verificar agendamentos pendentes
  await sendReminderEmails();
}

/**
 * Envia emails de lembrete para agendamentos que ocorrem em 24h
 */
async function sendReminderEmails(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[ReminderScheduler] Base de dados indisponível");
      return;
    }

    const job = jobs.get("reminderEmails");
    if (job) {
      job.isRunning = true;
      job.lastRun = new Date();
      job.nextRun = new Date(Date.now() + 60 * 60 * 1000); // Próxima execução em 1 hora
    }

    // Calcular timestamps para agendamentos em ~24h
    const now = Date.now();
    const in24Hours = now + 24 * 60 * 60 * 1000;
    const in23Hours = now + 23 * 60 * 60 * 1000;

    // Buscar agendamentos que ocorrem em ~24h e que ainda não receberam lembrete
    const appointmentsToRemind = await db
      .select({
        id: appointments.id,
        publicCode: appointments.publicCode,
        startsAt: appointments.startsAt,
        clientUserId: appointments.clientUserId,
        barberUserId: appointments.barberUserId,
        serviceId: appointments.serviceId,
        status: appointments.status,
        reminderSent: appointments.reminderSent,
      })
      .from(appointments)
      .where(
        and(
          gte(appointments.startsAt, in23Hours),
          lt(appointments.startsAt, in24Hours),
          eq(appointments.status, "confirmed"),
          eq(appointments.reminderSent, 0)
        )
      );

    if (appointmentsToRemind.length === 0) {
      console.log("[ReminderScheduler] Nenhum agendamento para lembrete neste momento");
      if (job) job.isRunning = false;
      return;
    }

    console.log(
      `[ReminderScheduler] Encontrados ${appointmentsToRemind.length} agendamentos para lembrete`
    );

    // Processar cada agendamento
    for (const apt of appointmentsToRemind) {
      try {
        // Buscar dados do cliente
        const client = await db
          .select()
          .from(users)
          .where(eq(users.id, apt.clientUserId))
          .limit(1);

        if (!client[0]) {
          console.warn(
            `[ReminderScheduler] Cliente não encontrado para agendamento ${apt.publicCode}`
          );
          continue;
        }

        // Buscar dados do barbeiro
        const barber = await db
          .select()
          .from(users)
          .where(eq(users.id, apt.barberUserId))
          .limit(1);

        if (!barber[0]) {
          console.warn(
            `[ReminderScheduler] Barbeiro não encontrado para agendamento ${apt.publicCode}`
          );
          continue;
        }

        // Buscar dados do serviço
        const service = await db
          .select()
          .from(services)
          .where(eq(services.id, apt.serviceId))
          .limit(1);

        if (!service[0]) {
          console.warn(
            `[ReminderScheduler] Serviço não encontrado para agendamento ${apt.publicCode}`
          );
          continue;
        }

        // Buscar dados da barbearia
        const barbershopId = barber[0].barbershopId;
        const barbershop = await db
          .select()
          .from(barbershops)
          .where(eq(barbershops.id, barbershopId as number))
          .limit(1);

        if (!barbershop[0]) {
          console.warn(
            `[ReminderScheduler] Barbearia não encontrada para agendamento ${apt.publicCode}`
          );
          continue;
        }

        // Preparar dados do email
        const appointmentDate = new Date(apt.startsAt).toLocaleDateString("pt-BR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const appointmentTime = new Date(apt.startsAt).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const emailData: AppointmentConfirmationData = {
          clientName: client[0].name || "Cliente",
          clientEmail: client[0].email || "noemail@example.com",
          barbershopName: barbershop[0].name,
          serviceName: service[0].name,
          barberName: barber[0].name || "Barbeiro",
          appointmentDate,
          appointmentTime,
          appointmentId: apt.id.toString(),
          publicCode: apt.publicCode,
        };

        // Gerar email de lembrete
        const emailTemplate = generateAppointmentReminderEmail(emailData);

        console.log(
          `[ReminderScheduler] Enviando lembrete para ${client[0].email} - Agendamento ${apt.publicCode}`
        );

        // Marcar como lembrete enviado (mesmo que o envio falhe, não tentaremos novamente)
        await db
          .update(appointments)
          .set({ reminderSent: 1 })
          .where(eq(appointments.id, apt.id));

        // Notificar proprietário sobre lembrete enviado
        try {
          await notifyOwner({
            title: `Lembrete Enviado - ${barbershop[0].name}`,
            content: `Lembrete enviado para ${client[0].name} sobre agendamento de ${service[0].name} em ${appointmentDate} às ${appointmentTime}`,
          });
        } catch (error) {
          console.warn("[ReminderScheduler] Erro ao notificar proprietário:", error);
        }
      } catch (error) {
        console.error(
          `[ReminderScheduler] Erro ao processar agendamento ${apt.publicCode}:`,
          error
        );
      }
    }

    console.log("[ReminderScheduler] Processamento de lembretes concluído");
  } catch (error) {
    console.error("[ReminderScheduler] Erro ao enviar lembretes:", error);
  } finally {
    const job = jobs.get("reminderEmails");
    if (job) {
      job.isRunning = false;
    }
  }
}

/**
 * Retorna informações sobre os jobs agendados
 */
export function getScheduledJobs(): ScheduledJob[] {
  return Array.from(jobs.values());
}

/**
 * Retorna informações sobre um job específico
 */
export function getJobStatus(jobName: string): ScheduledJob | undefined {
  return jobs.get(jobName);
}

/**
 * Para o scheduler (útil para testes ou shutdown)
 */
export function stopScheduler(): void {
  console.log("[ReminderScheduler] Parando scheduler...");
  cron.getTasks().forEach((task) => {
    task.stop();
  });
  console.log("[ReminderScheduler] Scheduler parado");
}
