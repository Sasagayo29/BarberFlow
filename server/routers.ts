import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, gte, lt, lte, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  appointments,
  barberAvailabilityOverrides,
  barberProfiles,
  barberServices,
  barbershops,
  businessHours,
  createBarbershop,
  getBarbershopById,
  getBarbershopsByOwner,
  getDb,
  getSocialMediaSettings,
  getUserByEmail,
  passwordResetTokens,
  payments,
  services,
  settings,
  updateBarbershopStatus,
  upsertSocialMediaSettings,
  users,
} from "./db";

const roleSchema = z.enum(["super_admin", "barber_admin", "barber_owner", "barber_staff", "client"]);
const managerRolesArray = ["super_admin", "barber_admin", "barber_owner"] as const;
const appointmentStatusSchema = z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]);
const availabilityTypeSchema = z.enum(["available", "unavailable"]);

const managerRoles = ["super_admin", "barber_admin", "barber_owner"] as const;
const teamRoles = ["barber_owner", "barber_staff"] as const;
const activeAppointmentStatuses = ["pending", "confirmed"] as const;

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const hashedBuffer = Buffer.from(key, "hex");
  const suppliedBuffer = scryptSync(password, salt, 64);
  return hashedBuffer.length === suppliedBuffer.length && timingSafeEqual(hashedBuffer, suppliedBuffer);
}

function ensureAuthenticatedUser<TUser>(user: TUser | null | undefined): asserts user is NonNullable<TUser> {
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Autenticação necessária." });
  }
}

function isManagerRole(role: string) {
  return managerRoles.includes(role as (typeof managerRoles)[number]);
}

function isTeamRole(role: string) {
  return teamRoles.includes(role as (typeof teamRoles)[number]);
}

function requireManager(user: { role: string } | null | undefined) {
  ensureAuthenticatedUser(user);
  if (!isManagerRole(user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas perfis de gestão podem executar esta operação." });
  }
}

function requireSuperAdmin(user: { role: string } | null | undefined) {
  ensureAuthenticatedUser(user);
  if (user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o Super Admin pode executar esta operação." });
  }
}

function assertManagerCanManageRole(actorRole: string, targetRole: z.infer<typeof roleSchema>) {
  if (actorRole === "barber_owner" && targetRole !== "barber_staff") {
    throw new TRPCError({ code: "FORBIDDEN", message: "O Barbeiro Chef apenas pode gerir barbeiros operacionais." });
  }
}

function startOfUtcDay(date: string) {
  return Date.parse(`${date}T00:00:00.000Z`);
}

function endOfUtcDay(date: string) {
  return Date.parse(`${date}T23:59:59.999Z`);
}

function combineDateWithTime(date: string, time: string) {
  return Date.parse(`${date}T${time}:00.000Z`);
}

function weekdayFromDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

function formatTimeLabel(timestamp: number) {
  return new Date(timestamp).toISOString().slice(11, 16);
}

async function getServiceRuntime(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, barberUserId: number, serviceId: number) {
  const serviceRows = await db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      price: services.price,
      durationMinutes: services.durationMinutes,
      customPrice: barberServices.customPrice,
      customDurationMinutes: barberServices.customDurationMinutes,
    })
    .from(services)
    .leftJoin(
      barberServices,
      and(eq(barberServices.serviceId, services.id), eq(barberServices.barberUserId, barberUserId), eq(barberServices.isActive, 1)),
    )
    .where(and(eq(services.id, serviceId), eq(services.isActive, 1)))
    .limit(1);

  const service = serviceRows[0];
  if (!service) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Serviço não encontrado." });
  }

  return {
    id: service.id,
    name: service.name,
    description: service.description,
    durationMinutes: service.customDurationMinutes ?? service.durationMinutes,
    price: Number(service.customPrice ?? service.price),
  };
}

async function getAppointmentById(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, appointmentId: number) {
  const rows = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  return rows[0];
}

async function ensureAppointmentEditable(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  appointmentId: number,
  user: { id: number; role: string },
) {
  const appointment = await getAppointmentById(db, appointmentId);
  if (!appointment) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Agendamento não encontrado." });
  }

  const canManageAll = isManagerRole(user.role);
  const isAssignedBarber = user.role === "barber_staff" && appointment.barberUserId === user.id;
  const isOwnerClient = user.role === "client" && appointment.clientUserId === user.id;

  if (!canManageAll && !isAssignedBarber && !isOwnerClient) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para alterar este agendamento." });
  }

  return appointment;
}

async function hasAppointmentConflict(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  barberUserId: number,
  startsAt: number,
  endsAt: number,
  excludedAppointmentId?: number,
) {
  const rows = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.barberUserId, barberUserId),
        or(eq(appointments.status, "pending"), eq(appointments.status, "confirmed")),
        lt(appointments.startsAt, endsAt),
        gt(appointments.endsAt, startsAt),
        excludedAppointmentId ? sql`${appointments.id} <> ${excludedAppointmentId}` : undefined,
      ),
    );

  return rows.length > 0;
}

async function listAvailableSlots(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  barberUserId: number,
  serviceId: number,
  date: string,
) {
  const service = await getServiceRuntime(db, barberUserId, serviceId);
  const weekday = weekdayFromDate(date);
  const businessHoursRows = await db
    .select()
    .from(businessHours)
    .where(and(eq(businessHours.weekday, weekday), eq(businessHours.isOpen, 1)))
    .limit(1);

  const dayConfig = businessHoursRows[0];
  if (!dayConfig) {
    return [];
  }

  const dayStart = startOfUtcDay(date);
  const dayEnd = endOfUtcDay(date);

  const scheduleStart = combineDateWithTime(date, dayConfig.startTime);
  const scheduleEnd = combineDateWithTime(date, dayConfig.endTime);

  const bookedAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.barberUserId, barberUserId),
        or(eq(appointments.status, "pending"), eq(appointments.status, "confirmed")),
        gte(appointments.startsAt, dayStart),
        lte(appointments.startsAt, dayEnd),
      ),
    );

  const availabilityRows = await db
    .select()
    .from(barberAvailabilityOverrides)
    .where(
      and(
        eq(barberAvailabilityOverrides.barberUserId, barberUserId),
        lt(barberAvailabilityOverrides.startAt, dayEnd),
        gt(barberAvailabilityOverrides.endAt, dayStart),
      ),
    );

  const durationMs = service.durationMinutes * 60 * 1000;
  const stepMs = 30 * 60 * 1000;
  const slots: Array<{ startAt: number; endAt: number; label: string; available: boolean }> = [];

  for (let cursor = scheduleStart; cursor + durationMs <= scheduleEnd; cursor += stepMs) {
    const slotStart = cursor;
    const slotEnd = cursor + durationMs;

    const conflictingAppointment = bookedAppointments.some((item) => overlaps(slotStart, slotEnd, item.startsAt, item.endsAt));
    const unavailableOverride = availabilityRows.some(
      (item) => item.type === "unavailable" && overlaps(slotStart, slotEnd, item.startAt, item.endAt),
    );
    const availableOverride = availabilityRows.some(
      (item) => item.type === "available" && overlaps(slotStart, slotEnd, item.startAt, item.endAt),
    );

    const available = !conflictingAppointment && !unavailableOverride && (availabilityRows.every((item) => item.type !== "available") || availableOverride);

    slots.push({
      startAt: slotStart,
      endAt: slotEnd,
      label: formatTimeLabel(slotStart),
      available,
    });
  }

  return slots;
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),

    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(3).max(180),
          phone: z.string().min(6).max(32),
          email: z.string().email(),
          password: z.string().min(8).max(128),
        }),
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

        const email = input.email.trim().toLowerCase();
        const existing = await getUserByEmail(email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Já existe uma conta com este e-mail." });
        }

        const openId = `local_${nanoid(18)}`;
        await db.insert(users).values({
          openId,
          name: input.name.trim(),
          phone: input.phone.trim(),
          email,
          passwordHash: hashPassword(input.password),
          loginMethod: "password",
          role: "client",
          status: "active",
          lastSignedIn: new Date(),
        });

        const created = await getUserByEmail(email);
        return {
          success: true,
          message: "Conta criada com sucesso.",
          user: created,
        };
      }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(8).max(128),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

        const email = input.email.trim().toLowerCase();
        const user = await getUserByEmail(email);
        if (!user || !user.passwordHash || !user.openId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas." });
        }
        if (user.status !== "active") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Esta conta não está ativa." });
        }
        if (!verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciais inválidas." });
        }

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name ?? user.email ?? "Utilizador",
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      }),

    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

        const user = await getUserByEmail(input.email.trim().toLowerCase());
        if (!user) {
          return { success: true, tokenPreview: null };
        }

        const token = `reset_${nanoid(32)}`;
        const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
        await db.insert(passwordResetTokens).values({
          userId: user.id,
          token,
          expiresAt,
        });

        return {
          success: true,
          tokenPreview: token,
          expiresAt,
        };
      }),

    resetPassword: publicProcedure
      .input(
        z.object({
          token: z.string().min(10),
          password: z.string().min(8).max(128),
        }),
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

        const rows = await db
          .select()
          .from(passwordResetTokens)
          .where(eq(passwordResetTokens.token, input.token))
          .limit(1);
        const tokenRow = rows[0];

        if (!tokenRow || tokenRow.usedAt || tokenRow.expiresAt.getTime() < Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Token de recuperação inválido ou expirado." });
        }

        await db.update(users).set({ passwordHash: hashPassword(input.password) }).where(eq(users.id, tokenRow.userId));
        await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, tokenRow.id));

        return { success: true };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      requireManager(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

      return db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
          barberProfileId: barberProfiles.id,
          specialty: barberProfiles.specialty,
        })
        .from(users)
        .leftJoin(barberProfiles, eq(barberProfiles.userId, users.id))
        .orderBy(asc(users.name));
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(3).max(180),
          phone: z.string().min(6).max(32).optional(),
          email: z.string().email(),
          password: z.string().min(8).max(128),
          role: z.enum(["barber_admin", "barber_owner", "barber_staff", "super_admin"]),
          specialty: z.string().max(160).optional(),
          bio: z.string().max(500).optional(),
          displayName: z.string().min(2).max(120).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireManager(ctx.user);
        assertManagerCanManageRole(ctx.user.role, input.role);

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

        const email = input.email.trim().toLowerCase();
        const existing = await getUserByEmail(email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Já existe uma conta com este e-mail." });
        }

        const openId = `local_${nanoid(18)}`;
        await db.insert(users).values({
          openId,
          name: input.name.trim(),
          phone: input.phone?.trim() ?? null,
          email,
          passwordHash: hashPassword(input.password),
          loginMethod: "password",
          role: input.role,
          status: "active",
        });

        const created = await getUserByEmail(email);
        if (!created) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao criar utilizador." });
        }

        if (isTeamRole(input.role)) {
          await db.insert(barberProfiles).values({
            userId: created.id,
            displayName: input.displayName?.trim() ?? input.name.trim(),
            specialty: input.specialty?.trim() ?? null,
            bio: input.bio?.trim() ?? null,
          });
        }

        return { success: true, userId: created.id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          name: z.string().min(3).max(180).optional(),
          phone: z.string().min(6).max(32).nullable().optional(),
          role: roleSchema.optional(),
          status: z.enum(["active", "inactive", "blocked"]).optional(),
          displayName: z.string().min(2).max(120).nullable().optional(),
          specialty: z.string().max(160).nullable().optional(),
          bio: z.string().max(500).nullable().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireManager(ctx.user);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

        const targetRows = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        const target = targetRows[0];
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado." });
        }

        if (input.role) {
          assertManagerCanManageRole(ctx.user.role, input.role);
        }

        await db
          .update(users)
          .set({
            name: input.name?.trim() ?? undefined,
            phone: input.phone === undefined ? undefined : input.phone,
            role: input.role,
            status: input.status,
          })
          .where(eq(users.id, input.userId));

        if (isTeamRole(input.role ?? target.role)) {
          const existingProfile = await db.select().from(barberProfiles).where(eq(barberProfiles.userId, input.userId)).limit(1);
          if (existingProfile[0]) {
            await db
              .update(barberProfiles)
              .set({
                displayName: input.displayName ?? undefined,
                specialty: input.specialty === undefined ? undefined : input.specialty,
                bio: input.bio === undefined ? undefined : input.bio,
              })
              .where(eq(barberProfiles.userId, input.userId));
          } else {
            await db.insert(barberProfiles).values({
              userId: input.userId,
              displayName: input.displayName ?? input.name ?? target.name ?? "Barbeiro",
              specialty: input.specialty ?? null,
              bio: input.bio ?? null,
            });
          }
        }

        return { success: true };
      }),

    archive: protectedProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        requireManager(ctx.user);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

        const targetRows = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        const target = targetRows[0];
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado." });
        }
        assertManagerCanManageRole(ctx.user.role, target.role);

        await db.update(users).set({ status: "inactive" }).where(eq(users.id, input.userId));
        return { success: true };
      }),

    bootstrapSuperAdmin: protectedProcedure
      .mutation(async ({ ctx }) => {
        requireSuperAdmin(ctx.user);
        return { success: true };
      }),
  }),

  services: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

      const rows = await db
        .select({
          id: services.id,
          name: services.name,
          description: services.description,
          price: services.price,
          durationMinutes: services.durationMinutes,
          isActive: services.isActive,
          barberUserId: barberServices.barberUserId,
          barberName: sql<string | null>`(select name from users where users.id = ${barberServices.barberUserId})`,
          customPrice: barberServices.customPrice,
          customDurationMinutes: barberServices.customDurationMinutes,
        })
        .from(services)
        .leftJoin(barberServices, and(eq(barberServices.serviceId, services.id), eq(barberServices.isActive, 1)))
        .where(eq(services.isActive, 1))
        .orderBy(asc(services.name));

      const byService = new Map<number, any>();
      for (const row of rows) {
        const current = byService.get(row.id) ?? {
          id: row.id,
          name: row.name,
          description: row.description,
          price: Number(row.price),
          durationMinutes: row.durationMinutes,
          isActive: row.isActive === 1,
          barbers: [],
        };
        if (row.barberUserId) {
          current.barbers.push({
            barberUserId: row.barberUserId,
            barberName: row.barberName,
            customPrice: row.customPrice ? Number(row.customPrice) : null,
            customDurationMinutes: row.customDurationMinutes,
          });
        }
        byService.set(row.id, current);
      }

      return Array.from(byService.values());
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).max(140),
          description: z.string().max(1000).optional(),
          price: z.number().positive(),
          durationMinutes: z.number().int().min(10).max(300),
          barberUserIds: z.array(z.number().int().positive()).default([]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireManager(ctx.user);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

        const insertResult = await db.insert(services).values({
          name: input.name.trim(),
          description: input.description?.trim() ?? null,
          price: input.price.toFixed(2),
          durationMinutes: input.durationMinutes,
          createdByUserId: ctx.user.id,
        });

        const serviceId = Number((insertResult as any)[0]?.insertId ?? (insertResult as any).insertId);
        if (input.barberUserIds.length > 0) {
          await db.insert(barberServices).values(
            input.barberUserIds.map((barberUserId) => ({
              barberUserId,
              serviceId,
            })),
          );
        }

        return { success: true, serviceId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          serviceId: z.number().int().positive(),
          name: z.string().min(2).max(140).optional(),
          description: z.string().max(1000).nullable().optional(),
          price: z.number().positive().optional(),
          durationMinutes: z.number().int().min(10).max(300).optional(),
          isActive: z.boolean().optional(),
          barberUserIds: z.array(z.number().int().positive()).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireManager(ctx.user);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

        await db
          .update(services)
          .set({
            name: input.name?.trim() ?? undefined,
            description: input.description === undefined ? undefined : input.description,
            price: input.price !== undefined ? input.price.toFixed(2) : undefined,
            durationMinutes: input.durationMinutes,
            isActive: input.isActive === undefined ? undefined : Number(input.isActive),
          })
          .where(eq(services.id, input.serviceId));

        if (input.barberUserIds) {
          await db.update(barberServices).set({ isActive: 0 }).where(eq(barberServices.serviceId, input.serviceId));
          if (input.barberUserIds.length > 0) {
            for (const barberUserId of input.barberUserIds) {
              const existing = await db
                .select()
                .from(barberServices)
                .where(and(eq(barberServices.serviceId, input.serviceId), eq(barberServices.barberUserId, barberUserId)))
                .limit(1);

              if (existing[0]) {
                await db
                  .update(barberServices)
                  .set({ isActive: 1 })
                  .where(eq(barberServices.id, existing[0].id));
              } else {
                await db.insert(barberServices).values({ serviceId: input.serviceId, barberUserId, isActive: 1 });
              }
            }
          }
        }

        return { success: true };
      }),
  }),

  settings: router({
    businessHours: router({
      list: publicProcedure.query(async () => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
        return db.select().from(businessHours).orderBy(asc(businessHours.weekday));
      }),

      upsert: protectedProcedure
        .input(
          z.object({
            weekday: z.number().int().min(0).max(6),
            startTime: z.string().regex(/^\d{2}:\d{2}$/),
            endTime: z.string().regex(/^\d{2}:\d{2}$/),
            isOpen: z.boolean(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          requireManager(ctx.user);
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

          const existing = await db.select().from(businessHours).where(eq(businessHours.weekday, input.weekday)).limit(1);
          if (existing[0]) {
            await db
              .update(businessHours)
              .set({
                startTime: input.startTime,
                endTime: input.endTime,
                isOpen: Number(input.isOpen),
              })
              .where(eq(businessHours.weekday, input.weekday));
          } else {
            await db.insert(businessHours).values({
              weekday: input.weekday,
              startTime: input.startTime,
              endTime: input.endTime,
              isOpen: Number(input.isOpen),
            });
          }

          return { success: true };
        }),
    }),

    customization: router({
      get: protectedProcedure
        .input(z.object({ key: z.string() }).optional())
        .query(async ({ ctx, input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

          if (input?.key) {
            const result = await db.select().from(settings).where(eq(settings.key, input.key)).limit(1);
            return result[0]?.value ?? null;
          }

          const allSettings = await db.select().from(settings);
          const result: Record<string, string> = {};
          for (const setting of allSettings) {
            result[setting.key] = setting.value;
          }
          return result;
        }),

      set: protectedProcedure
        .input(
          z.object({
            key: z.string().min(1).max(100),
            value: z.string().max(1000),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          requireManager(ctx.user);
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

          const existing = await db.select().from(settings).where(eq(settings.key, input.key)).limit(1);
          if (existing[0]) {
            await db.update(settings).set({ value: input.value }).where(eq(settings.key, input.key));
          } else {
            await db.insert(settings).values({ key: input.key, value: input.value });
          }

          return { success: true };
        }),
    }),

    barberAvailability: router({
      list: protectedProcedure
        .input(
          z.object({
            barberUserId: z.number().int().positive(),
            startsAt: z.number().int(),
            endsAt: z.number().int(),
          }),
        )
        .query(async ({ ctx, input }) => {
          ensureAuthenticatedUser(ctx.user);
          const canView = isManagerRole(ctx.user.role) || ctx.user.id === input.barberUserId;
          if (!canView) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para consultar esta disponibilidade." });
          }

          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
          return db
            .select()
            .from(barberAvailabilityOverrides)
            .where(
              and(
                eq(barberAvailabilityOverrides.barberUserId, input.barberUserId),
                lt(barberAvailabilityOverrides.startAt, input.endsAt),
                gt(barberAvailabilityOverrides.endAt, input.startsAt),
              ),
            )
            .orderBy(asc(barberAvailabilityOverrides.startAt));
        }),

      create: protectedProcedure
        .input(
          z.object({
            barberUserId: z.number().int().positive(),
            type: availabilityTypeSchema,
            startAt: z.number().int(),
            endAt: z.number().int(),
            reason: z.string().max(255).optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          ensureAuthenticatedUser(ctx.user);
          const canEdit = isManagerRole(ctx.user.role) || ctx.user.id === input.barberUserId;
          if (!canEdit) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para editar esta disponibilidade." });
          }

          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
          await db.insert(barberAvailabilityOverrides).values({
            barberUserId: input.barberUserId,
            type: input.type,
            startAt: input.startAt,
            endAt: input.endAt,
            reason: input.reason?.trim() ?? null,
            createdByUserId: ctx.user.id,
          });
          return { success: true };
        }),
    }),
  }),

  appointments: router({
    availability: publicProcedure
      .input(
        z.object({
          barberUserId: z.number().int().positive(),
          serviceId: z.number().int().positive(),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
        const slots = await listAvailableSlots(db, input.barberUserId, input.serviceId, input.date);
        return { slots };
      }),

    create: protectedProcedure
      .input(
        z.object({
          barberUserId: z.number().int().positive(),
          serviceId: z.number().int().positive(),
          startsAt: z.number().int(),
          notes: z.string().max(1000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        ensureAuthenticatedUser(ctx.user);
        if (ctx.user.role !== "client" && !isManagerRole(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas clientes ou perfis de gestão podem criar agendamentos." });
        }

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

        const service = await getServiceRuntime(db, input.barberUserId, input.serviceId);
        const endsAt = input.startsAt + service.durationMinutes * 60 * 1000;
        const conflict = await hasAppointmentConflict(db, input.barberUserId, input.startsAt, endsAt);
        if (conflict) {
          throw new TRPCError({ code: "CONFLICT", message: "O horário selecionado já se encontra ocupado." });
        }

        const dayKey = new Date(input.startsAt).toISOString().slice(0, 10);
        const availableSlots = await listAvailableSlots(db, input.barberUserId, input.serviceId, dayKey);
        const slotMatch = availableSlots.find((slot) => slot.startAt === input.startsAt && slot.available);
        if (!slotMatch) {
          throw new TRPCError({ code: "CONFLICT", message: "O horário não está disponível para reserva." });
        }

        const publicCode = nanoid(10).toUpperCase();
        await db.insert(appointments).values({
          publicCode,
          clientUserId: ctx.user.id,
          barberUserId: input.barberUserId,
          serviceId: input.serviceId,
          status: "confirmed",
          startsAt: input.startsAt,
          endsAt,
          totalPrice: service.price.toFixed(2),
          notes: input.notes?.trim() ?? null,
        });

        // Notificar proprietário sobre novo agendamento
        try {
          const { notifyOwnerAboutNewAppointment } = await import("./_core/emailNotification");
          const appointmentDate = new Date(input.startsAt).toLocaleDateString("pt-BR");
          const appointmentTime = new Date(input.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          await notifyOwnerAboutNewAppointment(
            "Barbearia",
            ctx.user.name || "Cliente",
            service.name,
            appointmentDate,
            appointmentTime
          );
        } catch (error) {
          console.error("Erro ao notificar proprietário:", error);
        }

        return { success: true };
      }),

    listCalendar: protectedProcedure
      .input(
        z.object({
          startsAt: z.number().int(),
          endsAt: z.number().int(),
          barberUserId: z.number().int().positive().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        ensureAuthenticatedUser(ctx.user);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

        const filters = [
          gte(appointments.startsAt, input.startsAt),
          lte(appointments.startsAt, input.endsAt),
        ];

        if (ctx.user.role === "client") {
          filters.push(eq(appointments.clientUserId, ctx.user.id));
        } else if (ctx.user.role === "barber_staff") {
          filters.push(eq(appointments.barberUserId, ctx.user.id));
        } else if (input.barberUserId) {
          filters.push(eq(appointments.barberUserId, input.barberUserId));
        }

        return db
          .select({
            id: appointments.id,
            publicCode: appointments.publicCode,
            status: appointments.status,
            startsAt: appointments.startsAt,
            endsAt: appointments.endsAt,
            totalPrice: appointments.totalPrice,
            notes: appointments.notes,
            serviceId: appointments.serviceId,
            barberUserId: appointments.barberUserId,
            clientUserId: appointments.clientUserId,
            serviceName: services.name,
            barberName: sql<string>`(select name from users where users.id = ${appointments.barberUserId})`,
            clientName: sql<string>`(select name from users where users.id = ${appointments.clientUserId})`,
          })
          .from(appointments)
          .leftJoin(services, eq(services.id, appointments.serviceId))
          .where(and(...filters))
          .orderBy(asc(appointments.startsAt));
      }),

    listHistory: protectedProcedure.query(async ({ ctx }) => {
      ensureAuthenticatedUser(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

      const filters = [lt(appointments.endsAt, Date.now())];
      if (ctx.user.role === "client") {
        filters.push(eq(appointments.clientUserId, ctx.user.id));
      } else if (ctx.user.role === "barber_staff") {
        filters.push(eq(appointments.barberUserId, ctx.user.id));
      }

      return db
        .select({
          id: appointments.id,
          status: appointments.status,
          startsAt: appointments.startsAt,
          endsAt: appointments.endsAt,
          totalPrice: appointments.totalPrice,
          serviceName: services.name,
        })
        .from(appointments)
        .leftJoin(services, eq(services.id, appointments.serviceId))
        .where(and(...filters))
        .orderBy(desc(appointments.startsAt));
    }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          appointmentId: z.number().int().positive(),
          status: appointmentStatusSchema,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        ensureAuthenticatedUser(ctx.user);
        if (!["barber_staff", "barber_owner", "super_admin"].includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas a equipa pode atualizar o estado do atendimento." });
        }

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
        const appointment = await ensureAppointmentEditable(db, input.appointmentId, ctx.user);

        const updatePayload: Record<string, unknown> = { status: input.status };
        if (input.status === "completed") {
          updatePayload.completedAt = new Date();
        }
        if (input.status === "cancelled") {
          updatePayload.cancelledAt = new Date();
          updatePayload.cancelledByUserId = ctx.user.id;
        }

        await db.update(appointments).set(updatePayload).where(eq(appointments.id, appointment.id));
        return { success: true };
      }),

    cancel: protectedProcedure
      .input(
        z.object({
          appointmentId: z.number().int().positive(),
          reason: z.string().max(255).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        ensureAuthenticatedUser(ctx.user);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
        const appointment = await ensureAppointmentEditable(db, input.appointmentId, ctx.user);

        await db
          .update(appointments)
          .set({
            status: "cancelled",
            cancelledAt: new Date(),
            cancelledByUserId: ctx.user.id,
            cancellationReason: input.reason?.trim() ?? null,
          })
          .where(eq(appointments.id, appointment.id));

        return { success: true };
      }),

    reschedule: protectedProcedure
      .input(
        z.object({
          appointmentId: z.number().int().positive(),
          startsAt: z.number().int(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        ensureAuthenticatedUser(ctx.user);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
        const appointment = await ensureAppointmentEditable(db, input.appointmentId, ctx.user);
        const service = await getServiceRuntime(db, appointment.barberUserId, appointment.serviceId);
        const endsAt = input.startsAt + service.durationMinutes * 60 * 1000;

        const conflict = await hasAppointmentConflict(db, appointment.barberUserId, input.startsAt, endsAt, appointment.id);
        if (conflict) {
          throw new TRPCError({ code: "CONFLICT", message: "O novo horário já se encontra ocupado." });
        }

        await db
          .update(appointments)
          .set({
            startsAt: input.startsAt,
            endsAt,
            status: "confirmed",
            cancelledAt: null,
            cancelledByUserId: null,
            cancellationReason: null,
          })
          .where(eq(appointments.id, appointment.id));

        return { success: true };
      }),
  }),

  barbershops: router({
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(3).max(180),
          description: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          address: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireSuperAdmin(ctx.user);
        const result = await createBarbershop({
          name: input.name,
          description: input.description,
          phone: input.phone,
          email: input.email,
          address: input.address,
          ownerUserId: ctx.user.id,
          status: "active",
        });
        return result;
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      requireSuperAdmin(ctx.user);
      return await getBarbershopsByOwner(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ barbershopId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
        const barbershop = await db.select().from(barbershops).where(eq(barbershops.id, input.barbershopId)).limit(1);
        if (!barbershop[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Barbearia não encontrada." });
        if (ctx.user.role !== "super_admin" && barbershop[0].ownerUserId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para acessar esta barbearia." });
        }
        return barbershop[0];
      }),

    update: protectedProcedure
      .input(
        z.object({
          barbershopId: z.number(),
          name: z.string().min(3).max(180).optional(),
          description: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          address: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
        const barbershop = await db.select().from(barbershops).where(eq(barbershops.id, input.barbershopId)).limit(1);
        if (!barbershop[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Barbearia não encontrada." });
        if (ctx.user.role !== "super_admin" && barbershop[0].ownerUserId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para editar esta barbearia." });
        }
        await db.update(barbershops).set({
          name: input.name ?? barbershop[0].name,
          description: input.description ?? barbershop[0].description,
          phone: input.phone ?? barbershop[0].phone,
          email: input.email ?? barbershop[0].email,
          address: input.address ?? barbershop[0].address,
        }).where(eq(barbershops.id, input.barbershopId));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ barbershopId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        requireSuperAdmin(ctx.user);
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
        const barbershop = await db.select().from(barbershops).where(eq(barbershops.id, input.barbershopId)).limit(1);
        if (!barbershop[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Barbearia não encontrada." });
        await db.delete(barbershops).where(eq(barbershops.id, input.barbershopId));
        return { success: true };
      }),

    toggleStatus: protectedProcedure
      .input(
        z.object({
          barbershopId: z.number(),
          status: z.enum(["active", "inactive"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireSuperAdmin(ctx.user);
        const barbershop = await getBarbershopById(input.barbershopId);
        if (!barbershop) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Barbearia nao encontrada." });
        }
        if (barbershop.ownerUserId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Voce nao tem permissao para modificar esta barbearia." });
        }
        await updateBarbershopStatus(input.barbershopId, input.status);
        return { success: true };
      }),

    team: router({
      list: protectedProcedure
        .input(z.object({ barbershopId: z.number() }))
        .query(async ({ ctx, input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
          const barbershop = await db.select().from(barbershops).where(eq(barbershops.id, input.barbershopId)).limit(1);
          if (!barbershop[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Barbearia não encontrada." });
          if (ctx.user.role !== "super_admin" && barbershop[0].ownerUserId !== ctx.user.id && ctx.user.barbershopId !== input.barbershopId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para listar equipa." });
          }
          return await db.select().from(users).where(eq(users.barbershopId, input.barbershopId)).orderBy(asc(users.name));
        }),

      create: protectedProcedure
        .input(
          z.object({
            barbershopId: z.number(),
            name: z.string().min(3).max(180),
            email: z.string().email(),
            phone: z.string().optional(),
            role: z.enum(["barber_admin", "barber_owner", "barber_staff"]),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
          const barbershop = await db.select().from(barbershops).where(eq(barbershops.id, input.barbershopId)).limit(1);
          if (!barbershop[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Barbearia não encontrada." });
          if (ctx.user.role !== "super_admin" && barbershop[0].ownerUserId !== ctx.user.id && ctx.user.role !== "barber_admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para criar usuários." });
          }
          const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
          if (existing[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "E-mail já registado." });
          const result = await db.insert(users).values({
            barbershopId: input.barbershopId,
            createdByUserId: ctx.user.id,
            name: input.name,
            email: input.email,
            phone: input.phone,
            role: input.role,
            status: "active",
          });
          return { success: true };
        }),

      deactivate: protectedProcedure
        .input(z.object({ userId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
          const user = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
          if (!user[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
          if (ctx.user.role !== "super_admin" && user[0].barbershopId !== ctx.user.barbershopId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para desativar este usuário." });
          }
          await db.update(users).set({ status: "inactive" }).where(eq(users.id, input.userId));
          return { success: true };
        }),
    }),
  }),

  dashboard: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      requireManager(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

      const [totals] = await db
        .select({
          totalAppointments: sql<number>`count(*)`,
          totalRevenue: sql<string>`coalesce(sum(case when ${appointments.status} = 'completed' then ${appointments.totalPrice} else 0 end), 0)`,
        })
        .from(appointments);

      const topServices = await db
        .select({
          serviceId: appointments.serviceId,
          serviceName: services.name,
          usageCount: sql<number>`count(*)`,
        })
        .from(appointments)
        .leftJoin(services, eq(services.id, appointments.serviceId))
        .groupBy(appointments.serviceId, services.name)
        .orderBy(desc(sql`count(*)`))
        .limit(5);

      const upcoming = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(appointments)
        .where(and(gte(appointments.startsAt, Date.now()), or(eq(appointments.status, "pending"), eq(appointments.status, "confirmed"))));

      return {
        totalAppointments: Number(totals?.totalAppointments ?? 0),
        totalRevenue: Number(totals?.totalRevenue ?? 0),
        topServices: topServices.map((item) => ({
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          usageCount: Number(item.usageCount),
        })),
        upcomingAppointments: Number(upcoming[0]?.count ?? 0),
      };
    }),
  }),

  socialMedia: router({
    get: publicProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });
      
      const barbershopId = ctx.user?.barbershopId;
      if (!barbershopId) return null;
      
      return await getSocialMediaSettings(barbershopId);
    }),

    update: protectedProcedure
      .input(
        z.object({
          whatsappNumber: z.string().optional(),
          whatsappMessages: z.string().optional(),
          instagramUrl: z.string().optional(),
          instagramEnabled: z.boolean().optional(),
          tiktokUrl: z.string().optional(),
          tiktokEnabled: z.boolean().optional(),
          whatsappEnabled: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireManager(ctx.user);
        const barbershopId = ctx.user?.barbershopId;
        if (!barbershopId) throw new TRPCError({ code: "FORBIDDEN", message: "Sem barbearia associada." });
        
        const updateData: any = {};
        if (input.whatsappNumber !== undefined) updateData.whatsappNumber = input.whatsappNumber;
        if (input.whatsappMessages !== undefined) updateData.whatsappMessages = input.whatsappMessages;
        if (input.instagramUrl !== undefined) updateData.instagramUrl = input.instagramUrl;
        if (input.instagramEnabled !== undefined) updateData.instagramEnabled = Number(input.instagramEnabled);
        if (input.tiktokUrl !== undefined) updateData.tiktokUrl = input.tiktokUrl;
        if (input.tiktokEnabled !== undefined) updateData.tiktokEnabled = Number(input.tiktokEnabled);
        if (input.whatsappEnabled !== undefined) updateData.whatsappEnabled = Number(input.whatsappEnabled);
        
        await upsertSocialMediaSettings(barbershopId, updateData);
        return { success: true };
      }),
  }),

  payments: router({
    createCheckoutSession: protectedProcedure
      .input(
        z.object({
          barbershopId: z.number(),
          appointmentId: z.number(),
          amount: z.number().positive(),
          description: z.string(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        try {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
          
          const stripePaymentIntentId = `pi_${nanoid()}`;
          
          await db.insert(payments).values({
            barbershopId: input.barbershopId,
            appointmentId: input.appointmentId,
            userId: ctx.user.id,
            stripePaymentIntentId,
            amount: input.amount.toString(),
            currency: "BRL",
            status: "pending",
            description: input.description,
            metadata: JSON.stringify({ description: input.description }),
          });
          
          const origin = ctx.req?.headers.origin || "https://barberdash-ocmhqsb7.manus.space";
          const checkoutUrl = `${origin}/checkout?paymentId=${stripePaymentIntentId}`;
          
          return {
            success: true,
            checkoutUrl,
            paymentId: stripePaymentIntentId,
          };
        } catch (error) {
          console.error("Erro ao criar sessão de checkout:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao criar sessão de pagamento",
          });
        }
      }),

    getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      
      try {
        const db = await getDb();
        if (!db) return [];
        
        const userPayments = await db
          .select()
          .from(payments)
          .where(eq(payments.userId, ctx.user.id))
          .orderBy(desc(payments.createdAt));
        
        return userPayments;
      } catch (error) {
        console.error("Erro ao buscar histórico de pagamentos:", error);
        return [];
      }
    }),

    confirmPayment: protectedProcedure
      .input(z.object({ paymentId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        
        try {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
          
          const paymentList = await db
            .select()
            .from(payments)
            .where(eq(payments.stripePaymentIntentId, input.paymentId))
            .limit(1);
          
          if (!paymentList.length) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Pagamento não encontrado" });
          }
          
          await db
            .update(payments)
            .set({ status: "completed", updatedAt: new Date() })
            .where(eq(payments.stripePaymentIntentId, input.paymentId));
          
          return { success: true, payment: paymentList[0] };
        } catch (error) {
          console.error("Erro ao confirmar pagamento:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao confirmar pagamento",
          });
        }
      }),
  }),

  reports: router({
    generatePDF: protectedProcedure
      .input(
        z.object({
          barbershopId: z.number(),
          period: z.string(),
          startDate: z.number().optional(),
          endDate: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireManager(ctx.user);
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        try {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

          // Verificar permissão
          if (ctx.user.role !== "super_admin" && ctx.user.barbershopId !== input.barbershopId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para este relatório" });
          }

          // Buscar dados da barbearia
          const barbershop = await db.select().from(barbershops).where(eq(barbershops.id, input.barbershopId)).limit(1);
          if (!barbershop.length) throw new TRPCError({ code: "NOT_FOUND", message: "Barbearia não encontrada" });

          // Buscar agendamentos
          const appointmentsList = await db
            .select()
            .from(appointments)
            .where(
              and(
                eq(appointments.barbershopId, input.barbershopId),
                input.startDate ? gte(appointments.startsAt, input.startDate) : undefined,
                input.endDate ? lte(appointments.startsAt, input.endDate) : undefined,
              ),
            );

          // Calcular KPIs
          const totalRevenue = appointmentsList
            .filter((a) => a.status === "completed")
            .reduce((sum, a) => sum + (a.totalPrice ? parseFloat(a.totalPrice.toString()) : 0), 0);

          const totalAppointments = appointmentsList.length;
          const averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

          // Status dos agendamentos
          const appointmentsByStatus = {
            completed: appointmentsList.filter((a) => a.status === "completed").length,
            cancelled: appointmentsList.filter((a) => a.status === "cancelled").length,
            noshow: appointmentsList.filter((a) => a.status === "no_show").length,
          };

          // Serviços mais procurados
          const serviceMap = new Map<number, { name: string; count: number; revenue: number }>();
          appointmentsList.forEach((apt) => {
            if (apt.serviceId) {
              const existing = serviceMap.get(apt.serviceId) || { name: `Serviço ${apt.serviceId}`, count: 0, revenue: 0 };
              existing.count += 1;
              if (apt.status === "completed") {
                existing.revenue += apt.totalPrice ? parseFloat(apt.totalPrice.toString()) : 0;
              }
              serviceMap.set(apt.serviceId, existing);
            }
          });
          const topServices = Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue);

          // Barbeiros com melhor desempenho
          const barberMap = new Map<number, { name: string; appointments: number; revenue: number }>();
          appointmentsList.forEach((apt) => {
            if (apt.barberUserId) {
              const existing = barberMap.get(apt.barberUserId) || { name: `Barbeiro ${apt.barberUserId}`, appointments: 0, revenue: 0 };
              existing.appointments += 1;
              if (apt.status === "completed") {
                existing.revenue += apt.totalPrice ? parseFloat(apt.totalPrice.toString()) : 0;
              }
              barberMap.set(apt.barberUserId, existing);
            }
          });
          const topBarbers = Array.from(barberMap.values()).sort((a, b) => b.revenue - a.revenue);

          // Gerar PDF
          const { generateReportPDF } = await import("./_core/pdfGenerator");
          const pdfBuffer = await generateReportPDF({
            barbershopName: barbershop[0].name,
            period: input.period,
            totalRevenue,
            totalAppointments,
            averageTicket,
            topServices,
            topBarbers,
            appointmentsByStatus,
          });

          return {
            success: true,
            pdf: pdfBuffer.toString("base64"),
            filename: `relatorio-${barbershop[0].name.toLowerCase().replace(/\s+/g, "-")}-${new Date().getTime()}.pdf`,
          };
        } catch (error) {
          console.error("Erro ao gerar relatório PDF:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao gerar relatório PDF",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
