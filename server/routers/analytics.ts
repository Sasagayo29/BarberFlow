import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { analytics } from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";

export const analyticsRouter = router({
  // Obter analytics de um período
  getByPeriod: protectedProcedure
    .input(
      z.object({
        barbershopId: z.number().int().positive(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

      // Verificar permissão
      if (ctx.user.role !== "super_admin" && ctx.user.barbershopId !== input.barbershopId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para este barbershop" });
      }

      const conditions = [eq(analytics.barbershopId, input.barbershopId)];
      if (input.startDate) conditions.push(gte(analytics.date, input.startDate));
      if (input.endDate) conditions.push(lte(analytics.date, input.endDate));

      const data = await db
        .select()
        .from(analytics)
        .where(and(...conditions))
        .orderBy(desc(analytics.date));

      return data;
    }),

  // Registrar analytics diário
  recordDaily: protectedProcedure
    .input(
      z.object({
        barbershopId: z.number().int().positive(),
        date: z.string(),
        totalAppointments: z.number().int().min(0),
        completedAppointments: z.number().int().min(0),
        cancelledAppointments: z.number().int().min(0),
        noShowAppointments: z.number().int().min(0),
        totalRevenue: z.string(),
        averageTicket: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

      if (ctx.user.role !== "super_admin" && ctx.user.barbershopId !== input.barbershopId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
      }

      // Verificar se já existe registro para este dia
      const existing = await db
        .select()
        .from(analytics)
        .where(and(eq(analytics.barbershopId, input.barbershopId), eq(analytics.date, input.date)))
        .limit(1);

      if (existing.length > 0) {
        // Atualizar
        await db
          .update(analytics)
          .set({
            totalAppointments: input.totalAppointments,
            completedAppointments: input.completedAppointments,
            cancelledAppointments: input.cancelledAppointments,
            noShowAppointments: input.noShowAppointments,
            totalRevenue: input.totalRevenue,
            averageTicket: input.averageTicket,
          })
          .where(and(eq(analytics.barbershopId, input.barbershopId), eq(analytics.date, input.date)));

        return { success: true, message: "Analytics atualizado" };
      } else {
        // Criar novo
        await db.insert(analytics).values({
          barbershopId: input.barbershopId,
          date: input.date,
          totalAppointments: input.totalAppointments,
          completedAppointments: input.completedAppointments,
          cancelledAppointments: input.cancelledAppointments,
          noShowAppointments: input.noShowAppointments,
          totalRevenue: input.totalRevenue,
          averageTicket: input.averageTicket,
        });

        return { success: true, message: "Analytics registrado" };
      }
    }),

  // Limpar analytics antigos (mais de 90 dias)
  clearOldData: protectedProcedure
    .input(z.object({ barbershopId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

      if (ctx.user.role !== "super_admin" && ctx.user.barbershopId !== input.barbershopId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
      }

      // Calcular data de 90 dias atrás
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const cutoffDate = ninetyDaysAgo.toISOString().split("T")[0];

      await db
        .delete(analytics)
        .where(and(eq(analytics.barbershopId, input.barbershopId), lte(analytics.date, cutoffDate)));

      console.log(`[Analytics] Limpeza: registros antigos deletados para barbershop ${input.barbershopId}`);

      return { success: true, message: `Registros com mais de 90 dias foram deletados` };
    }),

  // Limpar TODOS os analytics (apenas super admin)
  clearAll: protectedProcedure
    .input(z.object({ barbershopId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

      // Permitir super_admin ou admin da barbearia
      if (ctx.user.role !== "super_admin" && ctx.user.barbershopId !== input.barbershopId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para limpar dados desta barbearia" });
      }

      await db.delete(analytics).where(eq(analytics.barbershopId, input.barbershopId));

      console.log(`[Analytics] Limpeza total: registros deletados para barbershop ${input.barbershopId}`);

      return { success: true, message: `Todos os registros de analytics foram deletados` };
    }),
});
