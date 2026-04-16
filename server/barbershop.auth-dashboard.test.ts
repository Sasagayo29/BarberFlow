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
      id: 11,
      openId: `ctx-${role}`,
      email: `${role}@barbearia.pt`,
      name: role,
      phone: null,
      passwordHash: "hash-antigo",
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

function createPublicContext(): TrpcContext {
  return {
    user: null,
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

function createPasswordResetDb(options?: { tokenRows?: Array<Record<string, unknown>> }) {
  const insertValues = vi.fn(async () => [{ insertId: 99 }]);
  const updateWhere = vi.fn(async () => [{ affectedRows: 1 }]);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const selectLimit = vi.fn(async () => options?.tokenRows ?? []);
  const selectWhere = vi.fn(() => ({ limit: selectLimit }));
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));

  return {
    db: {
      insert: vi.fn(() => ({ values: insertValues })),
      update: vi.fn(() => ({ set: updateSet })),
      select,
    },
    spies: { insertValues, updateSet, updateWhere, select, selectFrom, selectWhere, selectLimit },
  };
}

function createDashboardDb() {
  const totalsQuery = {
    from: vi.fn(async () => [{ totalAppointments: 14, totalRevenue: "187.50" }]),
  };

  const topServicesQuery = {
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        groupBy: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => [
              { serviceId: 1, serviceName: "Corte Premium", usageCount: 7 },
              { serviceId: 2, serviceName: "Barba Completa", usageCount: 4 },
            ]),
          })),
        })),
      })),
    })),
  };

  const upcomingQuery = {
    from: vi.fn(() => ({
      where: vi.fn(async () => [{ count: 3 }]),
    })),
  };

  return {
    select: vi
      .fn()
      .mockReturnValueOnce(totalsQuery)
      .mockReturnValueOnce(topServicesQuery)
      .mockReturnValueOnce(upcomingQuery),
  };
}

describe("barbershop auth and dashboard flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devolve sucesso silencioso quando o e-mail não existe no pedido de recuperação", async () => {
    getDbMock.mockResolvedValue(createPasswordResetDb().db);
    getUserByEmailMock.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.requestPasswordReset({ email: "ausente@barbearia.pt" });

    expect(result).toEqual({ success: true, tokenPreview: null });
  });

  it("gera um token de recuperação quando o utilizador existe", async () => {
    const fake = createPasswordResetDb();
    getDbMock.mockResolvedValue(fake.db);
    getUserByEmailMock.mockResolvedValue({
      id: 21,
      openId: "local_21",
      email: "cliente@barbearia.pt",
      name: "Cliente Teste",
      phone: "910000000",
      passwordHash: "hash",
      loginMethod: "password",
      role: "client",
      status: "active",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.requestPasswordReset({ email: "cliente@barbearia.pt" });

    expect(result.success).toBe(true);
    expect(result.tokenPreview).toMatch(/^reset_/);
    expect(fake.db.insert).toHaveBeenCalledTimes(1);
    expect(fake.spies.insertValues).toHaveBeenCalledTimes(1);
  });

  it("recusa redefinição com token inválido ou expirado", async () => {
    const fake = createPasswordResetDb({ tokenRows: [] });
    getDbMock.mockResolvedValue(fake.db);

    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.auth.resetPassword({ token: "reset_token_invalido_12345", password: "NovaSenha123" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("redefine a palavra-passe quando recebe um token válido e ainda ativo", async () => {
    const fake = createPasswordResetDb({
      tokenRows: [
        {
          id: 9,
          userId: 21,
          token: "reset_token_valido_12345",
          usedAt: null,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      ],
    });
    getDbMock.mockResolvedValue(fake.db);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.resetPassword({ token: "reset_token_valido_12345", password: "NovaSenha123" });

    expect(result).toEqual({ success: true });
    expect(fake.db.update).toHaveBeenCalledTimes(2);
    expect(fake.spies.updateSet).toHaveBeenCalledTimes(2);
    expect(fake.spies.updateWhere).toHaveBeenCalledTimes(2);
  });

  it("entrega métricas administrativas normalizadas no dashboard para perfis de gestão", async () => {
    getDbMock.mockResolvedValue(createDashboardDb());

    const caller = appRouter.createCaller(createContext("super_admin"));
    const result = await caller.dashboard.summary();

    expect(result).toEqual({
      totalAppointments: 14,
      totalRevenue: 187.5,
      topServices: [
        { serviceId: 1, serviceName: "Corte Premium", usageCount: 7 },
        { serviceId: 2, serviceName: "Barba Completa", usageCount: 4 },
      ],
      upcomingAppointments: 3,
    });
  });
});
