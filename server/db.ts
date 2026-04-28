import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import {
  appointments,
  barberAvailabilityOverrides,
  barberProfiles,
  barberServices,
  barbershops,
  businessHours,
  InsertUser,
  InsertBarbershop,
  passwordResetTokens,
  payments,
  services,
  settings,
  socialMediaSettings,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = mysql.createPool(process.env.DATABASE_URL);
      _db = drizzle(pool, { schema, mode: "default" });
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
      email: user.email ?? `${user.openId.replace(/[^a-z0-9]/gi, '_')}@oauth.local`,
      phone: user.phone ?? null,
      passwordHash: user.passwordHash ?? null,
      loginMethod: user.loginMethod ?? "manus",
      role: user.role ?? "client", // Usar role passado ou padrão client (não sobrescrever role existente)
      status: user.status ?? "active",
      avatarUrl: user.avatarUrl ?? null,
      lastSignedIn: user.lastSignedIn ?? now,
    };

    // Usar openId como chave única para upsert (não email, pois pode ser vazio)
    const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    
    if (existing.length > 0) {
      // Atualizar usuário existente
      const updateData: any = {
        phone: values.phone,
        passwordHash: values.passwordHash,
        loginMethod: values.loginMethod,
        status: values.status,
        avatarUrl: values.avatarUrl,
        lastSignedIn: values.lastSignedIn,
      };
      // Só atualizar name se foi explicitamente passado
      if (user.name !== undefined) {
        updateData.name = values.name;
      }
      // Só atualizar role se foi explicitamente passado (não é o padrão)
      if (user.role !== undefined) {
        updateData.role = values.role;
      }
      await db.update(users).set(updateData).where(eq(users.openId, user.openId));
    } else {
      // Inserir novo usuário
      await db.insert(users).values(values);
      
      // Criar barbershop padrão para novo usuário
      const newUser = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
      if (newUser.length > 0) {
        const userId = newUser[0].id;
        const barbershopName = `${values.name}'s Barbershop`;
        const newBarbershop = await db.insert(barbershops).values({
          name: barbershopName,
          ownerUserId: userId,
          phone: values.phone || "",
          email: values.email || "",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          country: "PT",
        }).returning();
        
        if (newBarbershop.length > 0) {
          // Atualizar usuário com barbershopId
          await db.update(users).set({ barbershopId: newBarbershop[0].id }).where(eq(users.id, userId));
        }
      }
    }
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

export async function createBarbershop(
  barbershop: InsertBarbershop
): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(barbershops).values(barbershop);
  return { id: (result as any).insertId as number };
}

export async function getBarbershopById(id: number) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db
    .select()
    .from(barbershops)
    .where(eq(barbershops.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBarbershopsByOwner(ownerUserId: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return await db
    .select()
    .from(barbershops)
    .where(eq(barbershops.ownerUserId, ownerUserId));
}

export async function updateBarbershopStatus(
  id: number,
  status: "active" | "inactive"
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(barbershops)
    .set({ status })
    .where(eq(barbershops.id, id));
}

export async function getSetting(key: string, barbershopId?: number) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setSetting(
  key: string,
  value: string,
  barbershopId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(settings)
      .set({ value })
      .where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value, barbershopId });
  }
}

export async function getSocialMediaSettings(barbershopId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(socialMediaSettings).where(eq(socialMediaSettings.barbershopId, barbershopId));
  return result[0] ?? null;
}

export async function upsertSocialMediaSettings(barbershopId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSocialMediaSettings(barbershopId);
  
  if (existing) {
    await db.update(socialMediaSettings)
      .set(data)
      .where(eq(socialMediaSettings.barbershopId, barbershopId));
  } else {
    await db.insert(socialMediaSettings).values({ barbershopId, ...data });
  }
}

export async function createPayment(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(payments).values(data);
  return result;
}

export async function getPaymentByStripePaymentIntentId(stripePaymentIntentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select()
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId))
    .limit(1);
  
  return result[0] || null;
}

export async function updatePaymentStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(payments)
    .set({ status: status as any })
    .where(eq(payments.id, id));
}

export async function getPaymentsByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select()
    .from(payments)
    .where(eq(payments.userId, userId));
}

export {
  appointments,
  barberAvailabilityOverrides,
  barberProfiles,
  barberServices,
  barbershops,
  businessHours,
  passwordResetTokens,
  payments,
  services,
  settings,
  socialMediaSettings,
  users,
}
