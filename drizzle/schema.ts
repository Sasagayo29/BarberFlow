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
  "barber_admin",
  "barber_owner",
  "barber_staff",
  "client",
]);

export const userStatusEnum = mysqlEnum("status", ["active", "inactive", "blocked"]);
export const appointmentStatusEnum = mysqlEnum("status", ["pending", "confirmed", "completed", "cancelled", "no_show"]);
export const availabilityTypeEnum = mysqlEnum("type", ["available", "unavailable"]);
export const barbershopStatusEnum = mysqlEnum("barbershop_status", ["active", "inactive"]);

/**
 * Barbearias geridas pelo Super Admin.
 * Suporta múltiplas barbearias independentes na mesma plataforma.
 */
export const barbershops = mysqlTable(
  "barbershops",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    description: text("description"),
    status: barbershopStatusEnum.default("active").notNull(),
    ownerUserId: int("ownerUserId").notNull(),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 320 }),
    address: text("address"),
    logoUrl: text("logoUrl"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    statusIdx: index("barbershops_status_idx").on(table.status),
    ownerIdx: index("barbershops_owner_idx").on(table.ownerUserId),
  }),
);

/**
 * Configurações globais da aplicação e por barbearia.
 * Permite customização de temas, moedas, textos e outros parâmetros.
 */
export const settings = mysqlTable(
  "settings",
  {
    id: int("id").autoincrement().primaryKey(),
    barbershopId: int("barbershopId"),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value").notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    keyIdx: index("settings_key_idx").on(table.key),
    barbershopIdx: index("settings_barbershop_idx").on(table.barbershopId),
  }),
);

/**
 * Utilizadores autenticáveis do sistema.
 * Suporta tanto contas internas com e-mail/senha como contas associadas a OAuth.
 */
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    barbershopId: int("barbershopId"),
    createdByUserId: int("createdByUserId"),
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
    barbershopIdx: index("users_barbershop_idx").on(table.barbershopId),
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
    barbershopId: int("barbershopId"),
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
    barbershopIdx: index("barber_profiles_barbershop_idx").on(table.barbershopId),
  }),
);

export const services = mysqlTable(
  "services",
  {
    id: int("id").autoincrement().primaryKey(),
    barbershopId: int("barbershopId"),
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
    barbershopIdx: index("services_barbershop_idx").on(table.barbershopId),
  }),
);

export const barberServices = mysqlTable(
  "barberServices",
  {
    id: int("id").autoincrement().primaryKey(),
    barbershopId: int("barbershopId"),
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
    barbershopIdx: index("barber_services_barbershop_idx").on(table.barbershopId),
  }),
);

export const businessHours = mysqlTable(
  "businessHours",
  {
    id: int("id").autoincrement().primaryKey(),
    barbershopId: int("barbershopId"),
    weekday: int("weekday").notNull(),
    startTime: varchar("startTime", { length: 5 }).notNull(),
    endTime: varchar("endTime", { length: 5 }).notNull(),
    isOpen: tinyint("isOpen").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    weekdayBarbershopUniqueIdx: uniqueIndex("business_hours_weekday_barbershop_unique_idx").on(table.barbershopId, table.weekday),
    barbershopIdx: index("business_hours_barbershop_idx").on(table.barbershopId),
  }),
);

export const barberAvailabilityOverrides = mysqlTable(
  "barberAvailabilityOverrides",
  {
    id: int("id").autoincrement().primaryKey(),
    barbershopId: int("barbershopId"),
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
    barbershopIdx: index("barber_availability_barbershop_idx").on(table.barbershopId),
  }),
);

export const appointments = mysqlTable(
  "appointments",
  {
    id: int("id").autoincrement().primaryKey(),
    barbershopId: int("barbershopId"),
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
    reminderSent: tinyint("reminderSent").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    publicCodeUniqueIdx: uniqueIndex("appointments_public_code_unique_idx").on(table.publicCode),
    barberTimeIdx: index("appointments_barber_time_idx").on(table.barberUserId, table.startsAt),
    clientTimeIdx: index("appointments_client_time_idx").on(table.clientUserId, table.startsAt),
    statusIdx: index("appointments_status_idx").on(table.status),
    barbershopIdx: index("appointments_barbershop_idx").on(table.barbershopId),
  }),
);

export type Barbershop = typeof barbershops.$inferSelect;
export type InsertBarbershop = typeof barbershops.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

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


/**
 * Configurações de redes sociais por barbearia.
 * Armazena WhatsApp, Instagram, TikTok e mensagens customizadas.
 */
export const socialMediaSettings = mysqlTable(
  "social_media_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    barbershopId: int("barbershopId").notNull(),
    whatsappNumber: varchar("whatsappNumber", { length: 32 }),
    whatsappMessages: text("whatsappMessages"),
    instagramUrl: varchar("instagramUrl", { length: 500 }),
    instagramEnabled: tinyint("instagramEnabled").default(0).notNull(),
    tiktokUrl: varchar("tiktokUrl", { length: 500 }),
    tiktokEnabled: tinyint("tiktokEnabled").default(0).notNull(),
    whatsappEnabled: tinyint("whatsappEnabled").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    barbershopIdx: index("social_media_settings_barbershop_idx").on(table.barbershopId),
    barbershopUnique: uniqueIndex("social_media_settings_barbershop_unique_idx").on(table.barbershopId),
  }),
);

export type SocialMediaSetting = typeof socialMediaSettings.$inferSelect;
export type InsertSocialMediaSetting = typeof socialMediaSettings.$inferInsert;


/**
 * Pagamentos de serviços via Stripe.
 * Armazena apenas IDs essenciais do Stripe para referência.
 */
export const paymentStatusEnum = mysqlEnum("payment_status", ["pending", "completed", "failed", "refunded"]);

export const payments = mysqlTable(
  "payments",
  {
    id: int("id").autoincrement().primaryKey(),
    barbershopId: int("barbershopId").notNull(),
    appointmentId: int("appointmentId").notNull(),
    userId: int("userId").notNull(),
    stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }).notNull().unique(),
    stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
    status: paymentStatusEnum.default("pending").notNull(),
    description: text("description"),
    metadata: text("metadata"), // JSON string com dados customizados
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    barbershopIdx: index("payments_barbershop_idx").on(table.barbershopId),
    appointmentIdx: index("payments_appointment_idx").on(table.appointmentId),
    userIdx: index("payments_user_idx").on(table.userId),
    statusIdx: index("payments_status_idx").on(table.status),
    stripePaymentIntentIdx: index("payments_stripe_payment_intent_idx").on(table.stripePaymentIntentId),
  }),
);

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Analytics - Dados de desempenho e métricas do negócio.
 * Armazena eventos de agendamentos, receitas e métricas diárias.
 */
export const analytics = mysqlTable(
  "analytics",
  {
    id: int("id").autoincrement().primaryKey(),
    barbershopId: int("barbershopId").notNull(),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
    totalAppointments: int("totalAppointments").default(0).notNull(),
    completedAppointments: int("completedAppointments").default(0).notNull(),
    cancelledAppointments: int("cancelledAppointments").default(0).notNull(),
    noShowAppointments: int("noShowAppointments").default(0).notNull(),
    totalRevenue: decimal("totalRevenue", { precision: 10, scale: 2 }).default("0").notNull(),
    averageTicket: decimal("averageTicket", { precision: 10, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    barbershopIdx: index("analytics_barbershop_idx").on(table.barbershopId),
    dateIdx: index("analytics_date_idx").on(table.date),
    barbershopDateUnique: uniqueIndex("analytics_barbershop_date_unique_idx").on(table.barbershopId, table.date),
  }),
);
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = typeof analytics.$inferInsert;

/**
 * Permissões Granulares - Controle fino de acesso por feature/módulo.
 * Permite definir quais roles têm acesso a quais funcionalidades.
 */
export const permissionsEnum = mysqlEnum("permission", [
  "view_dashboard",
  "manage_appointments",
  "manage_services",
  "manage_team",
  "manage_clients",
  "view_analytics",
  "manage_payments",
  "manage_settings",
  "manage_users",
  "manage_barbershops",
  "view_reports",
  "manage_social_media",
]);

export const rolePermissions = mysqlTable(
  "role_permissions",
  {
    id: int("id").autoincrement().primaryKey(),
    role: userRoleEnum.notNull(),
    permission: permissionsEnum.notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    rolePermissionUnique: uniqueIndex("role_permission_unique_idx").on(table.role, table.permission),
    roleIdx: index("role_permissions_role_idx").on(table.role),
    permissionIdx: index("role_permissions_permission_idx").on(table.permission),
  }),
);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;
