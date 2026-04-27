import { describe, it, expect, beforeEach, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: getDbMock,
    getBarbershopById: vi.fn(async () => ({
      id: 1,
      name: "Barbearia Teste",
      ownerUserId: 10,
    })),
  };
});

vi.mock("./_core/twilio", () => ({
  sendAppointmentConfirmation: vi.fn(async () => true),
  sendAppointmentReminder: vi.fn(async () => true),
}));

import { appRouter } from "./routers";

type Role = "super_admin" | "barber_owner" | "barber_staff" | "client";

function createContext(role: Role, userId = 41, barbershopId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      barbershopId,
      openId: `ctx-${role}`,
      email: `${role}@barbearia.pt`,
      name: role,
      phone: "+351912345678",
      passwordHash: "hash",
      loginMethod: "password",
      role,
      status: "active",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      createdByUserId: null,
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

function createSuccessDb() {
  const serviceQuery = {
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            {
              services: {
                id: 3,
                name: "Corte Tradicional",
                description: "Corte com acabamento clássico",
                price: "25.00",
                durationMinutes: 45,
              },
            },
          ]),
        })),
      })),
    })),
  };

  const conflictQuery = {
    from: vi.fn(() => ({
      where: vi.fn(async () => []),
    })),
  };

  const returningFn = vi.fn(async () => [
    {
      id: 100,
      barbershopId: 1,
      publicCode: "ABC123",
      clientUserId: 41,
      barberUserId: 7,
      serviceId: 3,
      status: "pending",
      startsAt: Date.now() + 3600000,
      endsAt: Date.now() + 5400000,
      totalPrice: "25.00",
      notes: null,
    },
  ]);

  const insertValues = vi.fn(() => ({
    returning: returningFn,
  }));

  const queryUsers = {
    findFirst: vi.fn(async () => ({
      id: 41,
      name: "Cliente Teste",
      phone: "+351912345678",
      email: "client@test.pt",
    })),
  };

  return {
    db: {
      select: vi
        .fn()
        .mockReturnValueOnce(serviceQuery)
        .mockReturnValueOnce(conflictQuery),
      insert: vi.fn(() => ({ values: insertValues })),
      query: {
        users: queryUsers,
      },
    },
    spies: { insertValues, returningFn },
  };
}

function createAvailabilityDb() {
  const serviceQuery = {
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            {
              services: {
                id: 3,
                name: "Corte Tradicional",
                durationMinutes: 45,
              },
            },
          ]),
        })),
      })),
    })),
  };

  const businessHoursQuery = {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => [
          {
            weekday: 2,
            startTime: "09:00",
            endTime: "18:00",
            isOpen: 1,
          },
        ]),
      })),
    })),
  };

  const appointmentsQuery = {
    from: vi.fn(() => ({
      where: vi.fn(async () => []),
    })),
  };

  const overridesQuery = {
    from: vi.fn(() => ({
      where: vi.fn(async () => []),
    })),
  };

  return {
    db: {
      select: vi
        .fn()
        .mockReturnValueOnce(serviceQuery)
        .mockReturnValueOnce(businessHoursQuery)
        .mockReturnValueOnce(appointmentsQuery)
        .mockReturnValueOnce(overridesQuery),
    },
  };
}

describe("Appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cria um agendamento com sucesso quando o horário está livre", async () => {
    const fake = createSuccessDb();
    getDbMock.mockResolvedValue(fake.db);

    const caller = appRouter.createCaller(createContext("client"));
    const result = await caller.appointments.create({
      barberUserId: 7,
      serviceId: 3,
      startsAt: Date.now() + 3600000,
      notes: "Primeira marcação",
    });

    expect(result).toEqual({ success: true });
    expect(fake.spies.insertValues).toHaveBeenCalledTimes(1);
  });

  it("lista horários disponíveis quando o barbeiro tem agenda aberta", async () => {
    const fake = createAvailabilityDb();
    getDbMock.mockResolvedValue(fake.db);

    const caller = appRouter.createCaller(createContext("client"));
    const result = await caller.appointments.availability({
      barberUserId: 7,
      serviceId: 3,
      date: "2026-04-21",
    });

    expect(result).toHaveProperty("slots");
    expect(Array.isArray(result.slots)).toBe(true);
    expect(result.slots.length).toBeGreaterThan(0);
  });

  it("retorna slots vazios quando barbeiro não tem horário de trabalho", async () => {
    const fake = {
      db: {
        select: vi
          .fn()
          .mockReturnValueOnce({
            from: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                where: vi.fn(() => ({
                  limit: vi.fn(async () => [
                    {
                      services: {
                        id: 3,
                        name: "Corte",
                        durationMinutes: 45,
                      },
                    },
                  ]),
                })),
              })),
            })),
          })
          .mockReturnValueOnce({
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(async () => []),
              })),
            })),
          }),
      },
    };

    getDbMock.mockResolvedValue(fake.db);

    const caller = appRouter.createCaller(createContext("client"));
    const result = await caller.appointments.availability({
      barberUserId: 7,
      serviceId: 3,
      date: "2026-04-21",
    });

    expect(result.slots).toEqual([]);
  });
});
