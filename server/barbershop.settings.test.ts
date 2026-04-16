import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: getDbMock,
  };
});

import { appRouter } from "./routers";

type Role = "super_admin" | "barber_owner" | "barber_staff" | "client";

function createContext(role: Role, userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-${role}`,
      email: `${role}@example.com`,
      name: role,
      phone: null,
      passwordHash: null,
      loginMethod: "password",
      role,
      status: "active",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as TrpcContext["res"],
  };
}

function createBusinessHoursDb(existingRows: unknown[] = []) {
  const limit = vi.fn(async () => existingRows);
  const where = vi.fn(() => ({ limit }));
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where,
      orderBy: vi.fn(async () => existingRows),
    })),
  }));
  const updateWhere = vi.fn(async () => ({ affectedRows: 1 }));
  const update = vi.fn(() => ({
    set: vi.fn(() => ({
      where: updateWhere,
    })),
  }));
  const insertValues = vi.fn(async () => ({ insertId: 1 }));
  const insert = vi.fn(() => ({
    values: insertValues,
  }));

  return {
    db: { select, update, insert },
    spies: { select, where, update, updateWhere, insert, insertValues },
  };
}

function createAvailabilityDb(records: unknown[] = []) {
  const orderBy = vi.fn(async () => records);
  const where = vi.fn(() => ({ orderBy }));
  const select = vi.fn(() => ({
    from: vi.fn(() => ({ where })),
  }));
  const insertValues = vi.fn(async () => ({ insertId: 2 }));
  const insert = vi.fn(() => ({ values: insertValues }));

  return {
    db: { select, insert },
    spies: { select, where, orderBy, insert, insertValues },
  };
}

describe("barbershop settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite que Super Admin atualize um horário semanal existente", async () => {
    const { db, spies } = createBusinessHoursDb([
      { id: 10, weekday: 1, startTime: "09:00", endTime: "19:00", isOpen: 1 },
    ]);
    getDbMock.mockResolvedValue(db);

    const caller = appRouter.createCaller(createContext("super_admin"));
    const result = await caller.settings.businessHours.upsert({
      weekday: 1,
      startTime: "10:00",
      endTime: "20:00",
      isOpen: true,
    });

    expect(result).toEqual({ success: true });
    expect(spies.update).toHaveBeenCalledTimes(1);
    expect(spies.insert).not.toHaveBeenCalled();
  });

  it("permite que Barbeiro Chef crie um horário semanal quando ainda não existe", async () => {
    const { db, spies } = createBusinessHoursDb([]);
    getDbMock.mockResolvedValue(db);

    const caller = appRouter.createCaller(createContext("barber_owner"));
    const result = await caller.settings.businessHours.upsert({
      weekday: 2,
      startTime: "09:30",
      endTime: "18:30",
      isOpen: true,
    });

    expect(result).toEqual({ success: true });
    expect(spies.insert).toHaveBeenCalledTimes(1);
    expect(spies.update).not.toHaveBeenCalled();
  });

  it("permite que barbeiro operacional registe a própria indisponibilidade", async () => {
    const { db, spies } = createAvailabilityDb();
    getDbMock.mockResolvedValue(db);

    const caller = appRouter.createCaller(createContext("barber_staff", 7));
    const result = await caller.settings.barberAvailability.create({
      barberUserId: 7,
      type: "unavailable",
      startAt: 1_800_000_000_000,
      endAt: 1_800_003_600_000,
      reason: "Formação técnica",
    });

    expect(result).toEqual({ success: true });
    expect(spies.insert).toHaveBeenCalledTimes(1);
  });

  it("impede que cliente consulte disponibilidade individual de barbeiro", async () => {
    const caller = appRouter.createCaller(createContext("client", 20));

    await expect(
      caller.settings.barberAvailability.list({
        barberUserId: 7,
        startsAt: 1_800_000_000_000,
        endsAt: 1_800_086_400_000,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
