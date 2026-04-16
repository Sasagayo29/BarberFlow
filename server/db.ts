import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  appointments,
  barberAvailabilityOverrides,
  barberProfiles,
  barberServices,
  businessHours,
  InsertUser,
  passwordResetTokens,
  services,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for OAuth upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const now = new Date();
    const isOwner = user.openId === ENV.ownerOpenId;

    const values: InsertUser = {
      openId: user.openId,
      name: user.name ?? user.email ?? "Utilizador Manus",
      email: user.email ?? `${user.openId}@oauth.local`,
      phone: user.phone ?? null,
      passwordHash: user.passwordHash ?? null,
      loginMethod: user.loginMethod ?? "manus",
      role: user.role ?? (isOwner ? "super_admin" : "client"),
      status: user.status ?? "active",
      avatarUrl: user.avatarUrl ?? null,
      lastSignedIn: user.lastSignedIn ?? now,
    };

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: {
        name: values.name,
        email: values.email,
        phone: values.phone,
        passwordHash: values.passwordHash,
        loginMethod: values.loginMethod,
        role: values.role,
        status: values.status,
        avatarUrl: values.avatarUrl,
        lastSignedIn: values.lastSignedIn,
      },
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by email: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export {
  appointments,
  barberAvailabilityOverrides,
  barberProfiles,
  barberServices,
  businessHours,
  passwordResetTokens,
  services,
  users,
};
