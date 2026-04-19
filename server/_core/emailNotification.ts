import { notifyOwner } from "./notification";

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface AppointmentConfirmationData {
  clientName: string;
  clientEmail: string;
  barbershopName: string;
  serviceName: string;
  barberName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentId: string;
  publicCode: string;
}

export interface PaymentConfirmationData {
  clientName: string;
  clientEmail: string;
  barbershopName: string;
  amount: string;
  paymentId: string;
  date: string;
}

/**
 * Gera template de email de confirmação de agendamento
 */
export function generateAppointmentConfirmationEmail(
  data: AppointmentConfirmationData
): EmailTemplate {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a1a1a; color: #fff; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .footer { background-color: #1a1a1a; color: #fff; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
          .details { background-color: #fff; padding: 15px; margin: 15px 0; border-left: 4px solid #007bff; }
          .detail-row { margin: 10px 0; }
          .detail-label { font-weight: bold; color: #007bff; }
          .button { background-color: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Agendamento Confirmado</h1>
            <p>${data.barbershopName}</p>
          </div>
          <div class="content">
            <p>Olá ${data.clientName},</p>
            <p>Seu agendamento foi confirmado com sucesso! Aqui estão os detalhes:</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Serviço:</span> ${data.serviceName}
              </div>
              <div class="detail-row">
                <span class="detail-label">Barbeiro:</span> ${data.barberName}
              </div>
              <div class="detail-row">
                <span class="detail-label">Data:</span> ${data.appointmentDate}
              </div>
              <div class="detail-row">
                <span class="detail-label">Hora:</span> ${data.appointmentTime}
              </div>
              <div class="detail-row">
                <span class="detail-label">Código do Agendamento:</span> ${data.publicCode}
              </div>
            </div>

            <p><strong>Informações Importantes:</strong></p>
            <ul>
              <li>Chegue 5 minutos antes do horário marcado</li>
              <li>Se precisar cancelar ou reagendar, entre em contato conosco com antecedência</li>
              <li>Você receberá um lembrete 24 horas antes do agendamento</li>
            </ul>

            <p>Obrigado por escolher ${data.barbershopName}!</p>
          </div>
          <div class="footer">
            <p>Este é um email automático. Por favor, não responda a este email.</p>
            <p>&copy; ${new Date().getFullYear()} ${data.barbershopName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Agendamento Confirmado

Olá ${data.clientName},

Seu agendamento foi confirmado com sucesso! Aqui estão os detalhes:

Serviço: ${data.serviceName}
Barbeiro: ${data.barberName}
Data: ${data.appointmentDate}
Hora: ${data.appointmentTime}
Código do Agendamento: ${data.publicCode}

Informações Importantes:
- Chegue 5 minutos antes do horário marcado
- Se precisar cancelar ou reagendar, entre em contato conosco com antecedência
- Você receberá um lembrete 24 horas antes do agendamento

Obrigado por escolher ${data.barbershopName}!

Este é um email automático. Por favor, não responda a este email.
© ${new Date().getFullYear()} ${data.barbershopName}. Todos os direitos reservados.
  `;

  return {
    subject: `Agendamento Confirmado - ${data.barbershopName}`,
    htmlContent,
    textContent,
  };
}

/**
 * Gera template de email de lembrete de agendamento
 */
export function generateAppointmentReminderEmail(
  data: AppointmentConfirmationData
): EmailTemplate {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff9800; color: #fff; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .footer { background-color: #1a1a1a; color: #fff; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
          .details { background-color: #fff; padding: 15px; margin: 15px 0; border-left: 4px solid #ff9800; }
          .detail-row { margin: 10px 0; }
          .detail-label { font-weight: bold; color: #ff9800; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Lembrete de Agendamento</h1>
            <p>${data.barbershopName}</p>
          </div>
          <div class="content">
            <p>Olá ${data.clientName},</p>
            <p>Este é um lembrete de que você tem um agendamento conosco amanhã!</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Serviço:</span> ${data.serviceName}
              </div>
              <div class="detail-row">
                <span class="detail-label">Barbeiro:</span> ${data.barberName}
              </div>
              <div class="detail-row">
                <span class="detail-label">Data:</span> ${data.appointmentDate}
              </div>
              <div class="detail-row">
                <span class="detail-label">Hora:</span> ${data.appointmentTime}
              </div>
            </div>

            <p><strong>Lembrete:</strong> Chegue 5 minutos antes do horário marcado.</p>
            <p>Se precisar cancelar ou reagendar, entre em contato conosco o quanto antes.</p>

            <p>Até amanhã!</p>
          </div>
          <div class="footer">
            <p>Este é um email automático. Por favor, não responda a este email.</p>
            <p>&copy; ${new Date().getFullYear()} ${data.barbershopName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Lembrete de Agendamento

Olá ${data.clientName},

Este é um lembrete de que você tem um agendamento conosco amanhã!

Serviço: ${data.serviceName}
Barbeiro: ${data.barberName}
Data: ${data.appointmentDate}
Hora: ${data.appointmentTime}

Lembrete: Chegue 5 minutos antes do horário marcado.
Se precisar cancelar ou reagendar, entre em contato conosco o quanto antes.

Até amanhã!

Este é um email automático. Por favor, não responda a este email.
© ${new Date().getFullYear()} ${data.barbershopName}. Todos os direitos reservados.
  `;

  return {
    subject: `Lembrete: Seu agendamento amanhã em ${data.barbershopName}`,
    htmlContent,
    textContent,
  };
}

/**
 * Gera template de email de cancelamento de agendamento
 */
export function generateAppointmentCancellationEmail(
  data: AppointmentConfirmationData & { reason?: string }
): EmailTemplate {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: #fff; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .footer { background-color: #1a1a1a; color: #fff; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
          .details { background-color: #fff; padding: 15px; margin: 15px 0; border-left: 4px solid #dc3545; }
          .detail-row { margin: 10px 0; }
          .detail-label { font-weight: bold; color: #dc3545; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Agendamento Cancelado</h1>
            <p>${data.barbershopName}</p>
          </div>
          <div class="content">
            <p>Olá ${data.clientName},</p>
            <p>Seu agendamento foi cancelado.</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Serviço:</span> ${data.serviceName}
              </div>
              <div class="detail-row">
                <span class="detail-label">Data Original:</span> ${data.appointmentDate}
              </div>
              <div class="detail-row">
                <span class="detail-label">Hora Original:</span> ${data.appointmentTime}
              </div>
              ${data.reason ? `<div class="detail-row"><span class="detail-label">Motivo:</span> ${data.reason}</div>` : ""}
            </div>

            <p>Se você gostaria de reagendar, entre em contato conosco.</p>
            <p>Obrigado pela compreensão!</p>
          </div>
          <div class="footer">
            <p>Este é um email automático. Por favor, não responda a este email.</p>
            <p>&copy; ${new Date().getFullYear()} ${data.barbershopName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Agendamento Cancelado

Olá ${data.clientName},

Seu agendamento foi cancelado.

Serviço: ${data.serviceName}
Data Original: ${data.appointmentDate}
Hora Original: ${data.appointmentTime}
${data.reason ? `Motivo: ${data.reason}` : ""}

Se você gostaria de reagendar, entre em contato conosco.
Obrigado pela compreensão!

Este é um email automático. Por favor, não responda a este email.
© ${new Date().getFullYear()} ${data.barbershopName}. Todos os direitos reservados.
  `;

  return {
    subject: `Agendamento Cancelado - ${data.barbershopName}`,
    htmlContent,
    textContent,
  };
}

/**
 * Gera template de email de confirmação de pagamento
 */
export function generatePaymentConfirmationEmail(data: PaymentConfirmationData): EmailTemplate {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: #fff; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .footer { background-color: #1a1a1a; color: #fff; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
          .details { background-color: #fff; padding: 15px; margin: 15px 0; border-left: 4px solid #28a745; }
          .detail-row { margin: 10px 0; }
          .detail-label { font-weight: bold; color: #28a745; }
          .amount { font-size: 24px; font-weight: bold; color: #28a745; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Pagamento Confirmado</h1>
            <p>${data.barbershopName}</p>
          </div>
          <div class="content">
            <p>Olá ${data.clientName},</p>
            <p>Seu pagamento foi processado com sucesso!</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Valor:</span> <span class="amount">${data.amount}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Data:</span> ${data.date}
              </div>
              <div class="detail-row">
                <span class="detail-label">ID do Pagamento:</span> ${data.paymentId}
              </div>
            </div>

            <p>Obrigado por sua confiança em ${data.barbershopName}!</p>
          </div>
          <div class="footer">
            <p>Este é um email automático. Por favor, não responda a este email.</p>
            <p>&copy; ${new Date().getFullYear()} ${data.barbershopName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Pagamento Confirmado

Olá ${data.clientName},

Seu pagamento foi processado com sucesso!

Valor: ${data.amount}
Data: ${data.date}
ID do Pagamento: ${data.paymentId}

Obrigado por sua confiança em ${data.barbershopName}!

Este é um email automático. Por favor, não responda a este email.
© ${new Date().getFullYear()} ${data.barbershopName}. Todos os direitos reservados.
  `;

  return {
    subject: `Pagamento Confirmado - ${data.barbershopName}`,
    htmlContent,
    textContent,
  };
}

/**
 * Notifica o proprietário sobre um novo agendamento
 */
export async function notifyOwnerAboutNewAppointment(
  barbershopName: string,
  clientName: string,
  serviceName: string,
  appointmentDate: string,
  appointmentTime: string
): Promise<boolean> {
  return notifyOwner({
    title: `Novo Agendamento - ${barbershopName}`,
    content: `${clientName} agendou ${serviceName} para ${appointmentDate} às ${appointmentTime}`,
  });
}

/**
 * Notifica o proprietário sobre um cancelamento de agendamento
 */
export async function notifyOwnerAboutCancelledAppointment(
  barbershopName: string,
  clientName: string,
  serviceName: string,
  appointmentDate: string,
  reason?: string
): Promise<boolean> {
  return notifyOwner({
    title: `Agendamento Cancelado - ${barbershopName}`,
    content: `${clientName} cancelou ${serviceName} agendado para ${appointmentDate}${reason ? `. Motivo: ${reason}` : ""}`,
  });
}

/**
 * Notifica o proprietário sobre um novo pagamento
 */
export async function notifyOwnerAboutNewPayment(
  barbershopName: string,
  clientName: string,
  amount: string,
  paymentId: string
): Promise<boolean> {
  return notifyOwner({
    title: `Novo Pagamento - ${barbershopName}`,
    content: `${clientName} realizou um pagamento de ${amount}. ID: ${paymentId}`,
  });
}
