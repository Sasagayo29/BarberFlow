import twilio from "twilio";
import { ENV } from "./env";

let twilioClient: ReturnType<typeof twilio> | null = null;

export function getTwilioClient() {
  if (!twilioClient && ENV.twilioAccountSid && ENV.twilioAuthToken) {
    twilioClient = twilio(ENV.twilioAccountSid, ENV.twilioAuthToken);
  }
  return twilioClient;
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const client = getTwilioClient();
    if (!client || !ENV.twilioPhoneNumber) {
      console.warn("[Twilio] SMS not configured. Skipping SMS to", to);
      return false;
    }

    const result = await client.messages.create({
      body: message,
      from: ENV.twilioPhoneNumber,
      to: to,
    });

    console.log("[Twilio] SMS sent successfully:", result.sid);
    return true;
  } catch (error) {
    console.error("[Twilio] Failed to send SMS:", error);
    return false;
  }
}

export async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  try {
    const client = getTwilioClient();
    if (!client || !ENV.twilioWhatsAppNumber) {
      console.warn("[Twilio] WhatsApp not configured. Skipping WhatsApp to", to);
      return false;
    }

    const result = await client.messages.create({
      body: message,
      from: `whatsapp:${ENV.twilioWhatsAppNumber}`,
      to: `whatsapp:${to}`,
    });

    console.log("[Twilio] WhatsApp sent successfully:", result.sid);
    return true;
  } catch (error) {
    console.error("[Twilio] Failed to send WhatsApp:", error);
    return false;
  }
}

export async function sendAppointmentConfirmation(
  phone: string,
  barbershopName: string,
  barberName: string,
  serviceName: string,
  appointmentDateTime: string,
  method: "sms" | "whatsapp" = "sms"
): Promise<boolean> {
  const message = `
Confirmação de Agendamento
Barbearia: ${barbershopName}
Barbeiro: ${barberName}
Serviço: ${serviceName}
Data e Hora: ${appointmentDateTime}

Obrigado por agendar conosco!
  `.trim();

  if (method === "whatsapp") {
    return sendWhatsApp(phone, message);
  } else {
    return sendSMS(phone, message);
  }
}

export async function sendAppointmentReminder(
  phone: string,
  barbershopName: string,
  appointmentDateTime: string,
  method: "sms" | "whatsapp" = "sms"
): Promise<boolean> {
  const message = `
Lembrete de Agendamento
Barbearia: ${barbershopName}
Data e Hora: ${appointmentDateTime}

Não se esqueça do seu agendamento!
  `.trim();

  if (method === "whatsapp") {
    return sendWhatsApp(phone, message);
  } else {
    return sendSMS(phone, message);
  }
}

export async function sendAppointmentCancellation(
  phone: string,
  barbershopName: string,
  appointmentDateTime: string,
  method: "sms" | "whatsapp" = "sms"
): Promise<boolean> {
  const message = `
Seu agendamento foi cancelado
Barbearia: ${barbershopName}
Data e Hora: ${appointmentDateTime}

Se deseja agendar novamente, visite nosso site.
  `.trim();

  if (method === "whatsapp") {
    return sendWhatsApp(phone, message);
  } else {
    return sendSMS(phone, message);
  }
}
