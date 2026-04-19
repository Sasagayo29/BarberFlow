import PDFDocument from "pdfkit";
import { Readable } from "stream";

export interface ReportData {
  barbershopName: string;
  period: string;
  totalRevenue: number;
  totalAppointments: number;
  averageTicket: number;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  topBarbers: Array<{ name: string; appointments: number; revenue: number }>;
  appointmentsByStatus: { completed: number; cancelled: number; noshow: number };
}

export async function generateReportPDF(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on("error", reject);

    try {
      // Header
      doc.fontSize(24).font("Helvetica-Bold").text(data.barbershopName, { align: "center" });
      doc.fontSize(12).font("Helvetica").text("Relatório de Desempenho", { align: "center" });
      doc.fontSize(10).fillColor("#666").text(`Período: ${data.period}`, { align: "center" });

      doc.moveDown(1);
      doc.strokeColor("#ccc").lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);

      // KPIs Section
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#000").text("Indicadores Principais");
      doc.moveDown(0.5);

      const kpiBoxWidth = 100;
      const kpiBoxHeight = 60;
      const kpiY = doc.y;

      // Revenue Box
      doc.rect(50, kpiY, kpiBoxWidth, kpiBoxHeight).stroke();
      doc.fontSize(10).font("Helvetica-Bold").text("Receita Total", 55, kpiY + 5, { width: kpiBoxWidth - 10 });
      doc.fontSize(12).font("Helvetica-Bold").text(`R$ ${data.totalRevenue.toFixed(2)}`, 55, kpiY + 25, { width: kpiBoxWidth - 10 });

      // Appointments Box
      doc.rect(160, kpiY, kpiBoxWidth, kpiBoxHeight).stroke();
      doc.fontSize(10).font("Helvetica-Bold").text("Agendamentos", 165, kpiY + 5, { width: kpiBoxWidth - 10 });
      doc.fontSize(12).font("Helvetica-Bold").text(data.totalAppointments.toString(), 165, kpiY + 25, { width: kpiBoxWidth - 10 });

      // Average Ticket Box
      doc.rect(270, kpiY, kpiBoxWidth, kpiBoxHeight).stroke();
      doc.fontSize(10).font("Helvetica-Bold").text("Ticket Médio", 275, kpiY + 5, { width: kpiBoxWidth - 10 });
      doc.fontSize(12).font("Helvetica-Bold").text(`R$ ${data.averageTicket.toFixed(2)}`, 275, kpiY + 25, { width: kpiBoxWidth - 10 });

      // Completion Rate Box
      const completionRate = data.totalAppointments > 0 
        ? ((data.appointmentsByStatus.completed / data.totalAppointments) * 100).toFixed(1)
        : "0";
      doc.rect(380, kpiY, kpiBoxWidth, kpiBoxHeight).stroke();
      doc.fontSize(10).font("Helvetica-Bold").text("Taxa Conclusão", 385, kpiY + 5, { width: kpiBoxWidth - 10 });
      doc.fontSize(12).font("Helvetica-Bold").text(`${completionRate}%`, 385, kpiY + 25, { width: kpiBoxWidth - 10 });

      doc.moveDown(5);

      // Appointment Status Section
      doc.fontSize(14).font("Helvetica-Bold").text("Status dos Agendamentos");
      doc.moveDown(0.5);

      const statusData = [
        ["Concluído", data.appointmentsByStatus.completed.toString()],
        ["Cancelado", data.appointmentsByStatus.cancelled.toString()],
        ["Não Compareceu", data.appointmentsByStatus.noshow.toString()],
      ];

      doc.fontSize(10).font("Helvetica");
      statusData.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`);
      });

      doc.moveDown(1);

      // Top Services Section
      if (data.topServices.length > 0) {
        doc.fontSize(14).font("Helvetica-Bold").text("Serviços Mais Procurados");
        doc.moveDown(0.5);

        doc.fontSize(9).font("Helvetica");
        doc.text("Serviço", 50, doc.y, { width: 200 });
        doc.text("Quantidade", 250, doc.y - 14, { width: 100 });
        doc.text("Receita", 350, doc.y - 14, { width: 100 });

        doc.moveDown(0.5);
        doc.strokeColor("#ccc").lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.3);

        data.topServices.slice(0, 5).forEach((service) => {
          doc.fontSize(9).font("Helvetica");
          doc.text(service.name, 50, doc.y, { width: 200 });
          doc.text(service.count.toString(), 250, doc.y - 14, { width: 100 });
          doc.text(`R$ ${service.revenue.toFixed(2)}`, 350, doc.y - 14, { width: 100 });
          doc.moveDown(0.5);
        });
      }

      doc.moveDown(1);

      // Top Barbers Section
      if (data.topBarbers.length > 0) {
        doc.fontSize(14).font("Helvetica-Bold").text("Barbeiros com Melhor Desempenho");
        doc.moveDown(0.5);

        doc.fontSize(9).font("Helvetica");
        doc.text("Barbeiro", 50, doc.y, { width: 200 });
        doc.text("Agendamentos", 250, doc.y - 14, { width: 100 });
        doc.text("Receita", 350, doc.y - 14, { width: 100 });

        doc.moveDown(0.5);
        doc.strokeColor("#ccc").lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.3);

        data.topBarbers.slice(0, 5).forEach((barber) => {
          doc.fontSize(9).font("Helvetica");
          doc.text(barber.name, 50, doc.y, { width: 200 });
          doc.text(barber.appointments.toString(), 250, doc.y - 14, { width: 100 });
          doc.text(`R$ ${barber.revenue.toFixed(2)}`, 350, doc.y - 14, { width: 100 });
          doc.moveDown(0.5);
        });
      }

      doc.moveDown(2);

      // Footer
      doc.fontSize(8).fillColor("#999").text(`Relatório gerado em ${new Date().toLocaleString("pt-BR")}`, { align: "center" });

      doc.end();
    } catch (error) {
      doc.end();
      reject(error);
    }
  });
}

export async function generateInvoicePDF(invoiceData: {
  invoiceNumber: string;
  date: string;
  barbershopName: string;
  clientName: string;
  clientEmail: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  total: number;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
    });

    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on("error", reject);

    try {
      // Header
      doc.fontSize(20).font("Helvetica-Bold").text(invoiceData.barbershopName, { align: "center" });
      doc.fontSize(10).font("Helvetica").text("RECIBO DE PAGAMENTO", { align: "center" });

      doc.moveDown(1);
      doc.strokeColor("#ccc").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Invoice Details
      doc.fontSize(10).font("Helvetica-Bold").text(`Recibo Nº: ${invoiceData.invoiceNumber}`);
      doc.fontSize(10).font("Helvetica").text(`Data: ${invoiceData.date}`);

      doc.moveDown(1);

      // Client Info
      doc.fontSize(10).font("Helvetica-Bold").text("Cliente:");
      doc.fontSize(10).font("Helvetica").text(invoiceData.clientName);
      doc.fontSize(10).font("Helvetica").text(invoiceData.clientEmail);

      doc.moveDown(1);
      doc.strokeColor("#ccc").lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Items Table Header
      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Descrição", 40, doc.y, { width: 250 });
      doc.text("Quantidade", 290, doc.y - 11, { width: 80 });
      doc.text("Valor Unit.", 370, doc.y - 11, { width: 80 });
      doc.text("Total", 450, doc.y - 11, { width: 80 });

      doc.moveDown(0.5);
      doc.strokeColor("#ccc").lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Items
      doc.fontSize(9).font("Helvetica");
      invoiceData.items.forEach((item) => {
        const itemTotal = item.quantity * item.unitPrice;
        doc.text(item.description, 40, doc.y, { width: 250 });
        doc.text(item.quantity.toString(), 290, doc.y - 11, { width: 80 });
        doc.text(`R$ ${item.unitPrice.toFixed(2)}`, 370, doc.y - 11, { width: 80 });
        doc.text(`R$ ${itemTotal.toFixed(2)}`, 450, doc.y - 11, { width: 80 });
        doc.moveDown(0.5);
      });

      doc.moveDown(0.5);
      doc.strokeColor("#ccc").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Total
      doc.fontSize(12).font("Helvetica-Bold").text(`Total: R$ ${invoiceData.total.toFixed(2)}`, { align: "right" });

      doc.moveDown(2);
      doc.fontSize(8).fillColor("#999").text("Obrigado pela sua preferência!", { align: "center" });
      doc.fontSize(8).fillColor("#999").text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, { align: "center" });

      doc.end();
    } catch (error) {
      doc.end();
      reject(error);
    }
  });
}
