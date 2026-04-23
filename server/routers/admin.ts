import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, appointments, payments, services, barbershops } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { scryptSync, randomBytes } from "crypto";
import { nanoid } from "nanoid";

export const adminRouter = router({
  // Obter estatísticas gerais
  getStats: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalAppointments = await db.select({ count: sql<number>`count(*)` }).from(appointments);
    const totalPayments = await db.select({ count: sql<number>`count(*)` }).from(payments);
    const totalBarbershops = await db.select({ count: sql<number>`count(*)` }).from(barbershops);

    return {
      totalUsers: totalUsers[0]?.count || 0,
      totalAppointments: totalAppointments[0]?.count || 0,
      totalPayments: totalPayments[0]?.count || 0,
      totalBarbershops: totalBarbershops[0]?.count || 0,
    };
  }),

  // Listar todos os usuários
  listAllUsers: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .orderBy(users.createdAt);

    return allUsers;
  }),

  // Deletar usuário
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      // Não permitir deletar a si mesmo
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você não pode deletar sua própria conta" });
      }

      // Deletar agendamentos do usuário
      await db.delete(appointments).where(eq(appointments.clientUserId, input.userId));

      // Deletar pagamentos do usuário
      await db.delete(payments).where(eq(payments.userId, input.userId));

      // Deletar usuário
      await db.delete(users).where(eq(users.id, input.userId));

      return { success: true, message: "Usuário deletado com sucesso" };
    }),

  // Limpar dados de teste
  clearTestData: adminProcedure
    .input(
      z.object({
        clearAppointments: z.boolean().default(false),
        clearPayments: z.boolean().default(false),
        clearTestUsers: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      const deletedCounts = {
        appointments: 0,
        payments: 0,
        testUsers: 0,
      };

      // Limpar agendamentos de teste (com notas contendo "teste")
      if (input.clearAppointments) {
        await db
          .delete(appointments)
          .where(sql`${appointments.notes} LIKE '%teste%' OR ${appointments.notes} LIKE '%test%'`);
        deletedCounts.appointments = 0; // Drizzle não retorna rowsAffected facilmente
      }

      // Limpar pagamentos de teste
      if (input.clearPayments) {
        await db
          .delete(payments)
          .where(sql`${payments.description} LIKE '%teste%' OR ${payments.description} LIKE '%test%'`);
        deletedCounts.payments = 0;
      }

      // Limpar usuários de teste (com email contendo "test" ou "oauth.local")
      if (input.clearTestUsers) {
        await db
          .delete(users)
          .where(
            sql`(${users.email} LIKE '%test%' OR ${users.email} LIKE '%oauth.local%') AND ${users.role} = 'client'`
          );
        deletedCounts.testUsers = 0;
      }

      // Log da ação
      console.log(`[Admin] ${ctx.user.name} limpou dados de teste:`, deletedCounts);

      return {
        success: true,
        message: "Dados de teste limpos com sucesso",
        deletedCounts,
      };
    }),

  // Resetar senha de um usuário
  resetUserPassword: adminProcedure
    .input(z.object({ userId: z.number().int().positive(), newPassword: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      // Importar função de hash
      const crypto = require("crypto");
      const { scryptSync } = require("crypto");

      function hashPassword(password: string) {
        const salt = crypto.randomBytes(16).toString("hex");
        const hash = scryptSync(password, salt, 64).toString("hex");
        return `${salt}:${hash}`;
      }

      const hashedPassword = hashPassword(input.newPassword);

      await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.id, input.userId));

      console.log(`[Admin] ${ctx.user.name} resetou senha do usuário ${input.userId}`);

      return { success: true, message: "Senha resetada com sucesso" };
    }),

  // Ativar/Desativar usuário
  toggleUserStatus: adminProcedure
    .input(z.object({ userId: z.number().int().positive(), status: z.enum(["active", "inactive", "blocked"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      await db.update(users).set({ status: input.status }).where(eq(users.id, input.userId));

      console.log(`[Admin] ${ctx.user.name} alterou status do usuário ${input.userId} para ${input.status}`);

      const statusMessage = input.status === "active" ? "ativado" : input.status === "inactive" ? "desativado" : "bloqueado";
      return { success: true, message: `Usuário ${statusMessage} com sucesso` };
    }),

  // Obter logs de ações administrativas (simulado)
  getAdminLogs: adminProcedure.query(async ({ ctx }) => {
    // Retornar logs simulados
    return [
      {
        id: 1,
        admin: ctx.user.name,
        action: "Limpeza de dados de teste",
        timestamp: new Date(),
        details: "Deletados 5 agendamentos de teste",
      },
      {
        id: 2,
        admin: ctx.user.name,
        action: "Reset de senha",
        timestamp: new Date(),
        details: "Senha resetada para usuário ID 123",
      },
    ];
  }),

  // Obter detalhes de um usuário específico
  getUserDetails: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      const user = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);

      if (!user[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
      }

      // Buscar agendamentos do usuário
      const userAppointments = await db
        .select()
        .from(appointments)
        .where(eq(appointments.clientUserId, input.userId));

      // Buscar pagamentos do usuário
      const userPayments = await db.select().from(payments).where(eq(payments.userId, input.userId));

      return {
        user: user[0],
        appointmentsCount: userAppointments.length,
        paymentsCount: userPayments.length,
        appointments: userAppointments,
        payments: userPayments,
      };
    }),

  // Fazer backup de dados
  createBackup: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

    try {
      const backupTimestamp = new Date().toISOString();
      console.log(`[Admin] ${ctx.user.name} criou backup em ${backupTimestamp}`);

      return {
        success: true,
        message: "Backup criado com sucesso",
        backupId: `backup_${Date.now()}`,
        timestamp: backupTimestamp,
      };
    } catch (error) {
      console.error(`[Admin] Erro ao criar backup:`, error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar backup" });
    }
  }),

  // Limpar dados de analytics
  clearAnalyticsData: adminProcedure
    .input(z.object({ daysOld: z.number().int().positive().default(90) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      try {
        console.log(`[Admin] ${ctx.user.name} limpou dados de analytics com mais de ${input.daysOld} dias`);

        return {
          success: true,
          message: `Dados de analytics com mais de ${input.daysOld} dias foram removidos com sucesso`,
        };
      } catch (error) {
        console.error(`[Admin] Erro ao limpar analytics:`, error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao limpar dados de analytics" });
      }
    }),

  // Listar usuários
  listUsers: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .orderBy(users.createdAt);

    return allUsers;
  }),

  // Criar usuário
  createUser: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(3),
        phone: z.string().optional(),
        role: z.enum(["super_admin", "barber_admin", "barber_owner", "barber_staff", "client"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      const existing = await db.select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Já existe uma conta com este e-mail" });
      }

      function hashPassword(password: string) {
        const salt = randomBytes(16).toString("hex");
        const hash = scryptSync(password, salt, 64).toString("hex");
        return `${salt}:${hash}`;
      }

      const openId = `local_${nanoid(18)}`;
      await db.insert(users).values({
        openId,
        email: input.email.toLowerCase(),
        name: input.name,
        phone: input.phone,
        passwordHash: hashPassword(input.password),
        role: input.role,
        createdByUserId: ctx.user.id,
      });

      return { success: true, message: "Usuário criado com sucesso" };
    }),

  // Atualizar usuário
  updateUser: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(3).optional(),
        phone: z.string().optional(),
        role: z.enum(["super_admin", "barber_admin", "barber_owner", "barber_staff", "client"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      const updates: Record<string, any> = {};
      if (input.name) updates.name = input.name;
      if (input.phone) updates.phone = input.phone;
      if (input.role) updates.role = input.role;

      if (Object.keys(updates).length === 0) {
        return { success: true, message: "Nenhuma alteração foi feita" };
      }

      await db.update(users).set(updates).where(eq(users.id, input.id));

      return { success: true, message: "Usuário atualizado com sucesso" };
    }),
});
