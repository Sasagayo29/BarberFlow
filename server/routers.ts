import { randomBytes } from "crypto";
import { scryptSync } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, gte, lt, lte, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { adminRouter } from "./routers/admin";
import { analyticsRouter } from "./routers/analytics";
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
  socialMediaSettings,
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
  const [salt, hash] = storedHash.split(":");
  const attempt = scryptSync(password, salt, 64).toString("hex");
  return attempt === hash;
}

function combineDateWithTime(date: string, time: string) {
  const [year, month, day] = date.split("-");
  const [hours, minutes] = time.split(":");
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
}

export const appRouter = router({
  dashboard: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const barbershopId = ctx.user.barbershopId;
      if (!barbershopId) {
        return {
          totalAppointments: 0,
          totalRevenue: 0,
          upcomingAppointments: 0,
          topServices: [],
        };
      }

      const appointmentsData = await db
        .select({
          id: appointments.id,
          status: appointments.status,
          serviceId: appointments.serviceId,
        })
        .from(appointments)
        .innerJoin(barberProfiles, eq(barberProfiles.id, appointments.barberUserId))
        .where(eq(barberProfiles.barbershopId, barbershopId));

      const totalAppointments = appointmentsData.length;
      const completedAppointments = appointmentsData.filter((a) => a.status === "completed");

      const servicesData = await db.select().from(services).where(eq(services.barbershopId, barbershopId));

      let totalRevenue = 0;
      const serviceRevenue: Record<string, number> = {};

      for (const appointment of completedAppointments) {
        const service = servicesData.find((s) => s.id === appointment.serviceId);
        if (service) {
          totalRevenue += service.price;
          serviceRevenue[service.id] = (serviceRevenue[service.id] || 0) + 1;
        }
      }

      const topServices = Object.entries(serviceRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([serviceId]) => {
          const service = servicesData.find((s) => s.id === serviceId);
          return {
            id: serviceId,
            name: service?.name || "Unknown",
            count: serviceRevenue[serviceId],
          };
        });

      const now = new Date();
      const upcomingAppointments = appointmentsData.filter((a) => a.status === "pending" || a.status === "confirmed").length;

      return {
        totalAppointments,
        totalRevenue,
        upcomingAppointments,
        topServices,
      };
    }),
  }),

  system: systemRouter,
  admin: adminRouter,
  analytics: analyticsRouter,

  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;

      const db = await getDb();
      if (!db) return ctx.user;

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });

      if (updatedUser) {
        return {
          ...ctx.user,
          name: updatedUser.name,
          phone: updatedUser.phone,
        };
      }

      return ctx.user;
    }),

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
          role: "client",
        });

        return { success: true };
      }),

    logout: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.res) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      ctx.res.clearCookie(COOKIE_NAME, getSessionCookieOptions());
      return { success: true };
    }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (!ctx.res) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const user = await getUserByEmail(input.email.trim().toLowerCase());
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha inválidos." });
        }

        if (!verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha inválidos." });
        }

        await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

        const token = sdk.createJWT({
          id: user.id,
          openId: user.openId,
          name: user.name,
          email: user.email,
          role: user.role,
          barbershopId: user.barbershopId,
        });

        ctx.res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; ${getSessionCookieOptions().toString()}`);

        return { success: true };
      }),

    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const user = await getUserByEmail(input.email.trim().toLowerCase());
        if (!user) return { success: true };

        const token = nanoid(32);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await db.insert(passwordResetTokens).values({
          userId: user.id,
          token,
          expiresAt,
        });

        return { success: true };
      }),

    resetPassword: publicProcedure
      .input(
        z.object({
          token: z.string(),
          password: z.string().min(8).max(128),
        }),
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const tokenRow = await db.query.passwordResetTokens.findFirst({
          where: eq(passwordResetTokens.token, input.token),
        });

        if (!tokenRow || tokenRow.expiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Token inválido ou expirado." });
        }

        await db.update(users).set({ passwordHash: hashPassword(input.password) }).where(eq(users.id, tokenRow.userId));

        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, tokenRow.id));

        return { success: true };
      }),

    createSuperAdmin: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(8).max(128),
          name: z.string().min(3).max(180),
          adminSecret: z.string(),
        }),
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Base de dados indisponível." });

        const secret = process.env.ADMIN_SECRET || "admin-secret-key";
        if (input.adminSecret !== secret) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Secret inválido." });
        }

        const email = input.email.trim().toLowerCase();
        const existing = await getUserByEmail(email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Já existe uma conta com este e-mail." });
        }

        const openId = `local_${nanoid(18)}`;
        await db.insert(users).values({
          openId,
          name: input.name.trim(),
          email,
          passwordHash: hashPassword(input.password),
          role: "super_admin",
        });

        return { success: true, message: "Super admin criado com sucesso!" };
      }),

  }),

  users: router({
    updateOwnProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().min(3).max(180).optional(),
          phone: z.string().min(6).max(32).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (!ctx.res) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const updates: Record<string, any> = {};
        if (input.name) updates.name = input.name.trim();
        if (input.phone) updates.phone = input.phone.trim();

        if (Object.keys(updates).length === 0) {
          return { success: true };
        }

        await db.update(users).set(updates).where(eq(users.id, ctx.user.id));

        const updatedUser = await db.query.users.findFirst({
          where: eq(users.id, ctx.user.id),
        });

        if (updatedUser) {
          const newToken = sdk.createJWT({
            id: updatedUser.id,
            openId: updatedUser.openId,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            barbershopId: updatedUser.barbershopId,
          });

          ctx.res.setHeader("Set-Cookie", `${COOKIE_NAME}=${newToken}; ${getSessionCookieOptions().toString()}`);

          return {
            success: true,
            user: {
              id: updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              phone: updatedUser.phone,
              role: updatedUser.role,
              barbershopId: updatedUser.barbershopId,
            },
          };
        }

        return { success: true };
      }),
  }),

  barbershops: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const shops = await getBarbershopsByOwner(ctx.user.id);
      return shops;
    }),

    getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
      const shop = await getBarbershopById(input.id);
      if (!shop) throw new TRPCError({ code: "NOT_FOUND" });

      const isOwner = shop.ownerId === ctx.user.id;
      const isAdmin = ctx.user.role === "super_admin";

      if (!isOwner && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return shop;
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(3).max(180),
          phone: z.string().min(6).max(32),
          email: z.string().email(),
          address: z.string().min(10).max(500),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const barbershop = await createBarbershop(db, {
          name: input.name,
          phone: input.phone,
          email: input.email,
          address: input.address,
          ownerId: ctx.user.id,
        });

        const chefName = `Chef ${input.name}`;
        const chefOpenId = `chef_${barbershop.id}_${nanoid(12)}`;

        await db.insert(users).values({
          openId: chefOpenId,
          name: chefName,
          email: `${chefOpenId}@barbershop.local`,
          role: "barber_admin",
          barbershopId: barbershop.id,
        });

        return barbershop;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(3).max(180).optional(),
          phone: z.string().min(6).max(32).optional(),
          email: z.string().email().optional(),
          address: z.string().min(10).max(500).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const shop = await getBarbershopById(input.id);
        if (!shop) throw new TRPCError({ code: "NOT_FOUND" });

        const isOwner = shop.ownerId === ctx.user.id;
        const isAdmin = ctx.user.role === "super_admin";

        if (!isOwner && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const updates: Record<string, any> = {};
        if (input.name) updates.name = input.name;
        if (input.phone) updates.phone = input.phone;
        if (input.email) updates.email = input.email;
        if (input.address) updates.address = input.address;

        await db.update(barbershops).set(updates).where(eq(barbershops.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const shop = await getBarbershopById(input.id);
      if (!shop) throw new TRPCError({ code: "NOT_FOUND" });

      const isOwner = shop.ownerId === ctx.user.id;
      const isAdmin = ctx.user.role === "super_admin";

      if (!isOwner && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await updateBarbershopStatus(input.id, "deleted");

      return { success: true };
    }),
  }),

  services: router({
    list: protectedProcedure.input(z.object({ barbershopId: z.string() })).query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const barbershop = await getBarbershopById(input.barbershopId);
      if (!barbershop) throw new TRPCError({ code: "NOT_FOUND" });

      const isOwner = barbershop.ownerId === ctx.user.id;
      const isAdmin = ctx.user.role === "super_admin";
      const isStaff = ctx.user.barbershopId === input.barbershopId;

      if (!isOwner && !isAdmin && !isStaff) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return await db.select().from(services).where(eq(services.barbershopId, input.barbershopId));
    }),

    create: protectedProcedure
      .input(
        z.object({
          barbershopId: z.string(),
          name: z.string().min(3).max(180),
          description: z.string().max(500).optional(),
          price: z.number().positive(),
          durationMinutes: z.number().positive(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const barbershop = await getBarbershopById(input.barbershopId);
        if (!barbershop) throw new TRPCError({ code: "NOT_FOUND" });

        const isOwner = barbershop.ownerId === ctx.user.id;
        const isAdmin = ctx.user.role === "super_admin";

        if (!isOwner && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const result = await db
          .insert(services)
          .values({
            barbershopId: input.barbershopId,
            name: input.name,
            description: input.description || null,
            price: input.price,
            durationMinutes: input.durationMinutes,
          })
          .returning();

        return result[0];
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(3).max(180).optional(),
          description: z.string().max(500).optional(),
          price: z.number().positive().optional(),
          durationMinutes: z.number().positive().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const service = await db.query.services.findFirst({
          where: eq(services.id, input.id),
        });

        if (!service) throw new TRPCError({ code: "NOT_FOUND" });

        const barbershop = await getBarbershopById(service.barbershopId);
        if (!barbershop) throw new TRPCError({ code: "NOT_FOUND" });

        const isOwner = barbershop.ownerId === ctx.user.id;
        const isAdmin = ctx.user.role === "super_admin";

        if (!isOwner && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const updates: Record<string, any> = {};
        if (input.name) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description || null;
        if (input.price) updates.price = input.price;
        if (input.durationMinutes) updates.durationMinutes = input.durationMinutes;

        await db.update(services).set(updates).where(eq(services.id, input.id));

        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const service = await db.query.services.findFirst({
        where: eq(services.id, input.id),
      });

      if (!service) throw new TRPCError({ code: "NOT_FOUND" });

      const barbershop = await getBarbershopById(service.barbershopId);
      if (!barbershop) throw new TRPCError({ code: "NOT_FOUND" });

      const isOwner = barbershop.ownerId === ctx.user.id;
      const isAdmin = ctx.user.role === "super_admin";

      if (!isOwner && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.delete(services).where(eq(services.id, input.id));

      return { success: true };
    }),
  }),

  appointments: router({
    list: protectedProcedure.input(z.object({ barbershopId: z.string() })).query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const barbershop = await getBarbershopById(input.barbershopId);
      if (!barbershop) throw new TRPCError({ code: "NOT_FOUND" });

      const isOwner = barbershop.ownerId === ctx.user.id;
      const isAdmin = ctx.user.role === "super_admin";
      const isStaff = ctx.user.barbershopId === input.barbershopId;

      if (!isOwner && !isAdmin && !isStaff) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return await db.select().from(appointments).where(eq(appointments.publicCode, input.barbershopId));
    }),
  }),

  settings: router({
    customization: router({
      get: publicProcedure.query(async () => {
        const db = await getDb();
        if (!db) return {};

        const setting = await db.query.settings.findFirst({
          where: (settings, { isNotNull }) => isNotNull(settings.customization),
        });

        if (!setting || !setting.customization) return {};

        try {
          return JSON.parse(setting.customization);
        } catch {
          return {};
        }
      }),

      set: protectedProcedure
        .input(
          z.object({
            welcomeHeading: z.string().optional(),
            badgeText: z.string().optional(),
            welcomeDescription: z.string().optional(),
            welcomeMessage: z.string().optional(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          const barbershopId = ctx.user.barbershopId;
          if (!barbershopId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Usuário não tem barbershop associada." });
          }

          const existing = await db.query.settings.findFirst({
            where: eq(settings.barbershopId, barbershopId),
          });

          const customizationJson = JSON.stringify(input);

          if (existing) {
            await db.update(settings).set({ customization: customizationJson }).where(eq(settings.barbershopId, barbershopId));
          } else {
            await db.insert(settings).values({
              barbershopId,
              customization: customizationJson,
            });
          }

          return { success: true };
        }),
    }),

    businessHours: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const barbershopId = ctx.user.barbershopId;
        if (!barbershopId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return await db.select().from(businessHours).where(eq(businessHours.barbershopId, barbershopId));
      }),

      update: protectedProcedure
        .input(
          z.object({
            dayOfWeek: z.number().min(0).max(6),
            isOpen: z.boolean(),
            openTime: z.string().optional(),
            closeTime: z.string().optional(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          const barbershopId = ctx.user.barbershopId;
          if (!barbershopId) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }

          const existing = await db.query.businessHours.findFirst({
            where: and(eq(businessHours.barbershopId, barbershopId), eq(businessHours.dayOfWeek, input.dayOfWeek)),
          });

          if (existing) {
            await db
              .update(businessHours)
              .set({
                isOpen: input.isOpen,
                openTime: input.openTime || null,
                closeTime: input.closeTime || null,
              })
              .where(eq(businessHours.id, existing.id));
          } else {
            await db.insert(businessHours).values({
              barbershopId,
              dayOfWeek: input.dayOfWeek,
              isOpen: input.isOpen,
              openTime: input.openTime || null,
              closeTime: input.closeTime || null,
            });
          }

          return { success: true };
        }),
    }),

    barberAvailability: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const barbershopId = ctx.user.barbershopId;
        if (!barbershopId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const barberProfile = await db.query.barberProfiles.findFirst({
          where: eq(barberProfiles.userId, ctx.user.id),
        });

        if (!barberProfile) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return await db
          .select()
          .from(barberAvailabilityOverrides)
          .where(eq(barberAvailabilityOverrides.barberProfileId, barberProfile.id));
      }),

      create: protectedProcedure
        .input(
          z.object({
            type: availabilityTypeSchema,
            startDate: z.string(),
            endDate: z.string(),
            reason: z.string().optional(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          const barberProfile = await db.query.barberProfiles.findFirst({
            where: eq(barberProfiles.userId, ctx.user.id),
          });

          if (!barberProfile) {
            throw new TRPCError({ code: "NOT_FOUND" });
          }

          const result = await db
            .insert(barberAvailabilityOverrides)
            .values({
              barberProfileId: barberProfile.id,
              type: input.type,
              startDate: new Date(input.startDate),
              endDate: new Date(input.endDate),
              reason: input.reason || null,
            })
            .returning();

          return result[0];
        }),

      delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const override = await db.query.barberAvailabilityOverrides.findFirst({
          where: eq(barberAvailabilityOverrides.id, input.id),
        });

        if (!override) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const barberProfile = await db.query.barberProfiles.findFirst({
          where: eq(barberProfiles.id, override.barberProfileId),
        });

        if (!barberProfile || barberProfile.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db.delete(barberAvailabilityOverrides).where(eq(barberAvailabilityOverrides.id, input.id));

        return { success: true };
      }),
    }),
  }),

  socialMedia: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const barbershopId = ctx.user.barbershopId;
      if (!barbershopId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Usuário não tem barbershop associada." });
      }

      const settings = await db.select().from(socialMediaSettings).where(eq(socialMediaSettings.barbershopId, barbershopId)).limit(1).then(r => r[0]);

      if (!settings) {
        return {
          whatsappNumber: "",
          whatsappMessages: "",
          instagramUrl: "",
          instagramEnabled: false,
          tiktokUrl: "",
          tiktokEnabled: false,
          whatsappEnabled: false,
        };
      }

      return {
        whatsappNumber: settings.whatsappNumber || "",
        whatsappMessages: settings.whatsappMessages || "",
        instagramUrl: settings.instagramUrl || "",
        instagramEnabled: Boolean(settings.instagramEnabled),
        tiktokUrl: settings.tiktokUrl || "",
        tiktokEnabled: Boolean(settings.tiktokEnabled),
        whatsappEnabled: Boolean(settings.whatsappEnabled),
      };
    }),

    update: protectedProcedure
      .input(
        z.object({
          whatsappNumber: z.string().refine(
            (val) => !val || /^\+?[1-9]\d{1,14}$/.test(val.replace(/\D/g, '')),
            "Número WhatsApp inválido. Use formato internacional (ex: +55 11 99999-9999)"
          ).optional(),
          whatsappMessages: z.string().optional(),
          instagramUrl: z.string().refine(
            (val) => !val || /^(https?:\/\/)?(www\.)?instagram\.com\/[a-zA-Z0-9._-]+\/?$/.test(val),
            "URL Instagram inválida. Use: https://instagram.com/seu_usuario"
          ).optional(),
          instagramEnabled: z.boolean().optional(),
          tiktokUrl: z.string().refine(
            (val) => !val || /^(https?:\/\/)?(www\.)?(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)\/[\w@._-]+\/?/.test(val),
            "URL TikTok inválida. Use: https://tiktok.com/@seu_usuario"
          ).optional(),
          tiktokEnabled: z.boolean().optional(),
          whatsappEnabled: z.boolean().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const barbershopId = ctx.user.barbershopId;
        if (!barbershopId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Usuário não tem barbershop associada." });
        }

        const existing = await db.select().from(socialMediaSettings).where(eq(socialMediaSettings.barbershopId, barbershopId)).limit(1).then(r => r[0]);

        const updates: Record<string, any> = {};
        if (input.whatsappNumber !== undefined) updates.whatsappNumber = input.whatsappNumber || null;
        if (input.whatsappMessages !== undefined) updates.whatsappMessages = input.whatsappMessages || null;
        if (input.instagramUrl !== undefined) updates.instagramUrl = input.instagramUrl || null;
        if (input.instagramEnabled !== undefined) updates.instagramEnabled = input.instagramEnabled ? 1 : 0;
        if (input.tiktokUrl !== undefined) updates.tiktokUrl = input.tiktokUrl || null;
        if (input.tiktokEnabled !== undefined) updates.tiktokEnabled = input.tiktokEnabled ? 1 : 0;
        if (input.whatsappEnabled !== undefined) updates.whatsappEnabled = input.whatsappEnabled ? 1 : 0;

        if (existing) {
          await db.update(socialMediaSettings).set(updates).where(eq(socialMediaSettings.barbershopId, barbershopId));
        } else {
          await db.insert(socialMediaSettings).values({
            barbershopId,
            ...updates,
          });
        }

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
