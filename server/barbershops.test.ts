import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createSuperAdminContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `super-admin-${userId}`,
    email: `superadmin${userId}@example.com`,
    name: `Super Admin ${userId}`,
    loginMethod: "local",
    role: "super_admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

function createNonAdminContext(userId: number = 2): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "local",
    role: "client",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("barbershops permissions", () => {
  it("should reject non-super admin from creating barbershop", async () => {
    const ctx = createNonAdminContext(2);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.barbershops.create({
        name: "Test Barbershop",
        description: "A test barbershop",
        phone: "(11) 99999-9999",
        email: "test@barbershop.com",
        address: "Test Street, 123",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should reject non-super admin from listing barbershops", async () => {
    const ctx = createNonAdminContext(2);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.barbershops.list();
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should reject non-super admin from toggling barbershop status", async () => {
    const ctx = createNonAdminContext(2);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.barbershops.toggleStatus({
        barbershopId: 1,
        status: "inactive",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });
});
