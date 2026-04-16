import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { getDbMock, getUserByEmailMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  getUserByEmailMock: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: getDbMock,
    getUserByEmail: getUserByEmailMock,
  };
});

import { appRouter } from "./routers";

type Role = "super_admin" | "barber_owner" | "barber_staff" | "client";

function createContext(role: Role): TrpcContext {
  return {
    user: {
      id: 1,
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

function createFakeDb() {
  return {
    insert: vi.fn(() => ({
      values: vi.fn(async () => [{ insertId: 7 }]),
    })),
  };
}

describe("barbershop role permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("impede que Barbeiro Chef crie um Super Admin", async () => {
    const caller = appRouter.createCaller(createContext("barber_owner"));

    await expect(
      caller.users.create({
        name: "Administrador Global",
        email: "admin@barbearia.pt",
        password: "SenhaSegura123",
        role: "super_admin",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("impede que Cliente liste utilizadores administrativos", async () => {
    const caller = appRouter.createCaller(createContext("client"));
    await expect(caller.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("impede que Barbeiro Operacional crie agendamentos em nome do cliente", async () => {
    const caller = appRouter.createCaller(createContext("barber_staff"));

    await expect(
      caller.appointments.create({
        barberUserId: 2,
        serviceId: 3,
        startsAt: Date.now() + 3600000,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite que Super Admin crie um barbeiro operacional", async () => {
    const fakeDb = createFakeDb();
    getDbMock.mockResolvedValue(fakeDb);
    getUserByEmailMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        id: 7,
        openId: "local_new_barber",
        email: "barbeiro@barbearia.pt",
        name: "Miguel Costa",
        phone: "910000000",
        passwordHash: "hash",
        loginMethod: "password",
        role: "barber_staff",
        status: "active",
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      });

    const caller = appRouter.createCaller(createContext("super_admin"));
    const result = await caller.users.create({
      name: "Miguel Costa",
      email: "barbeiro@barbearia.pt",
      password: "SenhaSegura123",
      role: "barber_staff",
      displayName: "Miguel",
      specialty: "Fade e barba",
    });

    expect(result).toEqual({ success: true, userId: 7 });
    expect(fakeDb.insert).toHaveBeenCalledTimes(2);
  });
});
