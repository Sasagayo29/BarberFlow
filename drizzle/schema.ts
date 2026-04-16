import {
  bigint,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const userRoleEnum = mysqlEnum("role", [
  "super_admin",
  "barber_owner",
  "barber_staff",
  "client",
]);

export const userStatusEnum = mysqlEnum("status", ["active", "inactive", "blocked"]);
export const appointmentStatusEnum = mysqlEnum("status", ["pending", "confirmed", "completed", "cancelled", "no_show"]);
export const availabilityTypeEnum = mysqlEnum("type", ["available", "unavailable"]);

/**
 * Utilizadores autenticáveis do sistema.
 * Suporta tanto contas internas com e-mail/senha como contas associadas a OAuth.
 */
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).unique(),
    name: varchar("name", { length: 180 }),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 320 }),
    passwordHash: varchar("passwordHash", { length: 255 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: userRoleEnum.default("client").notNull(),
    status: userStatusEnum.default("active").notNull(),
    avatarUrl: text("avatarUrl"),
    lastSignedIn: timestamp("lastSignedIn"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    emailUniqueIdx: uniqueIndex("users_email_unique_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
    statusIdx: index("users_status_idx").on(table.status),
  }),
);

export const passwordResetTokens = mysqlTable(
  "passwordResetTokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    token: varchar("token", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    tokenUniqueIdx: uniqueIndex("password_reset_token_unique_idx").on(table.token),
    userIdx: index("password_reset_user_idx").on(table.userId),
  }),
);

export const barberProfiles = mysqlTable(
  "barberProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    displayName: varchar("displayName", { length: 120 }).notNull(),
    specialty: varchar("specialty", { length: 160 }),
    bio: text("bio"),
    colorHex: varchar("colorHex", { length: 20 }).default("#8B5E3C").notNull(),
    acceptsAppointments: tinyint("acceptsAppointments").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userUniqueIdx: uniqueIndex("barber_profiles_user_unique_idx").on(table.userId),
  }),
);

export const services = mysqlTable(
  "services",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 140 }).notNull(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    durationMinutes: int("durationMinutes").notNull(),
    isActive: tinyint("isActive").default(1).notNull(),
    createdByUserId: int("createdByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    activeIdx: index("services_active_idx").on(table.isActive),
    nameIdx: index("services_name_idx").on(table.name),
  }),
);

export const barberServices = mysqlTable(
  "barberServices",
  {
    id: int("id").autoincrement().primaryKey(),
    barberUserId: int("barberUserId").notNull(),
    serviceId: int("serviceId").notNull(),
    customPrice: decimal("customPrice", { precision: 10, scale: 2 }),
    customDurationMinutes: int("customDurationMinutes"),
    isActive: tinyint("isActive").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    barberServiceUniqueIdx: uniqueIndex("barber_services_unique_idx").on(table.barberUserId, table.serviceId),
    barberIdx: index("barber_services_barber_idx").on(table.barberUserId),
    serviceIdx: index("barber_services_service_idx").on(table.serviceId),
  }),
);

export const businessHours = mysqlTable(
  "businessHours",
  {
    id: int("id").autoincrement().primaryKey(),
    weekday: int("weekday").notNull(),
    startTime: varchar("startTime", { length: 5 }).notNull(),
    endTime: varchar("endTime", { length: 5 }).notNull(),
    isOpen: tinyint("isOpen").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    weekdayUniqueIdx: uniqueIndex("business_hours_weekday_unique_idx").on(table.weekday),
  }),
);

export const barberAvailabilityOverrides = mysqlTable(
  "barberAvailabilityOverrides",
  {
    id: int("id").autoincrement().primaryKey(),
    barberUserId: int("barberUserId").notNull(),
    type: availabilityTypeEnum.notNull(),
    startAt: bigint("startAt", { mode: "number" }).notNull(),
    endAt: bigint("endAt", { mode: "number" }).notNull(),
    reason: varchar("reason", { length: 255 }),
    createdByUserId: int("createdByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    barberStartIdx: index("barber_availability_barber_start_idx").on(table.barberUserId, table.startAt),
  }),
);

export const appointments = mysqlTable(
  "appointments",
  {
    id: int("id").autoincrement().primaryKey(),
    publicCode: varchar("publicCode", { length: 20 }).notNull(),
    clientUserId: int("clientUserId").notNull(),
    barberUserId: int("barberUserId").notNull(),
    serviceId: int("serviceId").notNull(),
    status: appointmentStatusEnum.default("pending").notNull(),
    startsAt: bigint("startsAt", { mode: "number" }).notNull(),
    endsAt: bigint("endsAt", { mode: "number" }).notNull(),
    totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
    notes: text("notes"),
    cancelledByUserId: int("cancelledByUserId"),
    cancelledAt: timestamp("cancelledAt"),
    cancellationReason: varchar("cancellationReason", { length: 255 }),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    publicCodeUniqueIdx: uniqueIndex("appointments_public_code_unique_idx").on(table.publicCode),
    barberTimeIdx: index("appointments_barber_time_idx").on(table.barberUserId, table.startsAt),
    clientTimeIdx: index("appointments_client_time_idx").on(table.clientUserId, table.startsAt),
    statusIdx: index("appointments_status_idx").on(table.status),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export type BarberProfile = typeof barberProfiles.$inferSelect;
export type InsertBarberProfile = typeof barberProfiles.$inferInsert;

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

export type BarberService = typeof barberServices.$inferSelect;
export type InsertBarberService = typeof barberServices.$inferInsert;

export type BusinessHour = typeof businessHours.$inferSelect;
export type InsertBusinessHour = typeof businessHours.$inferInsert;

export type BarberAvailabilityOverride = typeof barberAvailabilityOverrides.$inferSelect;
export type InsertBarberAvailabilityOverride = typeof barberAvailabilityOverrides.$inferInsert;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;
