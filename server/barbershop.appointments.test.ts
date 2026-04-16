import { beforeEach, describe, expect, it, vi } from "vitest";
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

function createContext(role: Role, userId = 41): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `ctx-${role}`,
      email: `${role}@barbearia.pt`,
      name: role,
      phone: null,
      passwordHash: "hash",
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

function createAppointmentConflictDb() {
  const serviceQuery = {
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            {
              id: 3,
              name: "Corte Tradicional",
              description: "Corte com acabamento clássico",
              price: "25.00",
              durationMinutes: 45,
              customPrice: null,
              customDurationMinutes: null,
            },
          ]),
        })),
      })),
    })),
  };

  const conflictQuery = {
    from: vi.fn(() => ({
      where: vi.fn(async () => [
        {
          id: 88,
          barberUserId: 7,
          status: "confirmed",
          startsAt: Date.now() + 3600000,
          endsAt: Date.now() + 5400000,
        },
      ]),
    })),
  };

  return {
    select: vi.fn().mockReturnValueOnce(serviceQuery).mockReturnValueOnce(conflictQuery),
  };
}

function createCancelableAppointmentDb() {
  const appointmentRow = {
    id: 75,
    barberUserId: 7,
    clientUserId: 41,
    serviceId: 3,
    status: "confirmed",
    startsAt: Date.now() + 7200000,
    endsAt: Date.now() + 9900000,
  };

  const selectQuery = {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => [appointmentRow]),
      })),
    })),
  };

  const updateWhere = vi.fn(async () => [{ affectedRows: 1 }]);
  const updateSet = vi.fn(() => ({ where: updateWhere }));

  return {
    db: {
      select: vi.fn(() => selectQuery),
      update: vi.fn(() => ({ set: updateSet })),
    },
    spies: { updateSet, updateWhere },
  };
}

function createAvailabilityDb(slotStart: number) {
  const date = new Date(slotStart).toISOString().slice(0, 10);
  const serviceQuery = {
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            {
              id: 3,
              name: "Corte Tradicional",
              description: "Corte com acabamento clássico",
              price: "25.00",
              durationMinutes: 45,
              customPrice: null,
              customDurationMinutes: null,
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

  const bookedAppointmentsQuery = {
    from: vi.fn(() => ({
      where: vi.fn(async () => []),
    })),
  };

  const availabilityOverridesQuery = {
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
        .mockReturnValueOnce(bookedAppointmentsQuery)
        .mockReturnValueOnce(availabilityOverridesQuery),
    },
    expectedDate: date,
  };
}

function createAppointmentSuccessDb() {
  const serviceQuery = {
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            {
              id: 3,
              name: "Corte Tradicional",
              description: "Corte com acabamento clássico",
              price: "25.00",
              durationMinutes: 45,
              customPrice: null,
              customDurationMinutes: null,
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

  const availabilityServiceQuery = {
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            {
              id: 3,
              name: "Corte Tradicional",
              description: "Corte com acabamento clássico",
              price: "25.00",
              durationMinutes: 45,
              customPrice: null,
              customDurationMinutes: null,
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

  const bookedAppointmentsQuery = {
    from: vi.fn(() => ({
      where: vi.fn(async () => []),
    })),
  };

  const availabilityOverridesQuery = {
    from: vi.fn(() => ({
      where: vi.fn(async () => []),
    })),
  };

  const insertValues = vi.fn(async () => [{ insertId: 100 }]);

  return {
    db: {
      select: vi
        .fn()
        .mockReturnValueOnce(serviceQuery)
        .mockReturnValueOnce(conflictQuery)
        .mockReturnValueOnce(availabilityServiceQuery)
        .mockReturnValueOnce(businessHoursQuery)
        .mockReturnValueOnce(bookedAppointmentsQuery)
        .mockReturnValueOnce(availabilityOverridesQuery),
      insert: vi.fn(() => ({ values: insertValues })),
    },
    spies: { insertValues },
  };
}

function createRescheduleSuccessDb() {
  const appointmentRow = {
    id: 75,
    barberUserId: 7,
    clientUserId: 41,
    serviceId: 3,
    status: "confirmed",
    startsAt: Date.now() + 7200000,
    endsAt: Date.now() + 9900000,
  };

  const appointmentQuery = {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => [appointmentRow]),
      })),
    })),
  };

  const serviceQuery = {
    from: vi.fn(() => ({
      leftJoin: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            {
              id: 3,
              name: "Corte Tradicional",
              description: "Corte com acabamento clássico",
              price: "25.00",
              durationMinutes: 45,
              customPrice: null,
              customDurationMinutes: null,
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

  const updateWhere = vi.fn(async () => [{ affectedRows: 1 }]);
  const updateSet = vi.fn(() => ({ where: updateWhere }));

  return {
    db: {
      select: vi.fn().mockReturnValueOnce(appointmentQuery).mockReturnValueOnce(serviceQuery).mockReturnValueOnce(conflictQuery),
      update: vi.fn(() => ({ set: updateSet })),
    },
    spies: { updateSet, updateWhere },
  };
}

describe("barbershop appointment critical flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia criação de agendamento quando o horário já está ocupado", async () => {
    getDbMock.mockResolvedValue(createAppointmentConflictDb());

    const caller = appRouter.createCaller(createContext("client"));

    await expect(
      caller.appointments.create({
        barberUserId: 7,
        serviceId: 3,
        startsAt: Date.now() + 3600000,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("permite ao cliente cancelar o próprio agendamento", async () => {
    const fake = createCancelableAppointmentDb();
    getDbMock.mockResolvedValue(fake.db);

    const caller = appRouter.createCaller(createContext("client", 41));
    const result = await caller.appointments.cancel({ appointmentId: 75, reason: "Imprevisto pessoal" });

    expect(result).toEqual({ success: true });
    expect(fake.db.update).toHaveBeenCalledTimes(1);
    expect(fake.spies.updateSet).toHaveBeenCalledTimes(1);
    expect(fake.spies.updateWhere).toHaveBeenCalledTimes(1);
  });

  it("lista horários disponíveis para reserva quando o barbeiro tem agenda aberta", async () => {
    const slotStart = Date.parse("2026-04-21T09:00:00.000Z");
    const fake = createAvailabilityDb(slotStart);
    getDbMock.mockResolvedValue(fake.db);

    const caller = appRouter.createCaller(createContext("client", 41));
    const result = await caller.appointments.availability({
      barberUserId: 7,
      serviceId: 3,
      date: fake.expectedDate,
    });

    expect(result.slots.length).toBeGreaterThan(0);
    expect(result.slots.some((slot) => slot.available)).toBe(true);
  });

  it("cria um agendamento quando o horário está livre e faz parte da disponibilidade calculada", async () => {
    const slotStart = Date.parse("2026-04-21T09:00:00.000Z");
    const fake = createAppointmentSuccessDb();
    getDbMock.mockResolvedValue(fake.db);

    const caller = appRouter.createCaller(createContext("client", 41));
    const result = await caller.appointments.create({
      barberUserId: 7,
      serviceId: 3,
      startsAt: slotStart,
      notes: "Primeira marcação",
    });

    expect(result).toEqual({ success: true });
    expect(fake.db.insert).toHaveBeenCalledTimes(1);
    expect(fake.spies.insertValues).toHaveBeenCalledTimes(1);
  });

  it("permite reagendar quando o novo horário não entra em conflito", async () => {
    const fake = createRescheduleSuccessDb();
    getDbMock.mockResolvedValue(fake.db);

    const caller = appRouter.createCaller(createContext("client", 41));
    const result = await caller.appointments.reschedule({
      appointmentId: 75,
      startsAt: Date.parse("2026-04-22T10:00:00.000Z"),
    });

    expect(result).toEqual({ success: true });
    expect(fake.db.update).toHaveBeenCalledTimes(1);
    expect(fake.spies.updateSet).toHaveBeenCalledTimes(1);
    expect(fake.spies.updateWhere).toHaveBeenCalledTimes(1);
  });
});
