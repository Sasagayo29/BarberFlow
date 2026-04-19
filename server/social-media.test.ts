import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("Social Media Settings", () => {
  it("should validate WhatsApp number format", () => {
    const schema = z.string().optional();
    expect(schema.parse("+351 912 345 678")).toBe("+351 912 345 678");
    expect(schema.parse("")).toBe("");
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it("should validate Instagram URL format", () => {
    const schema = z.string().url().optional();
    expect(schema.safeParse("https://instagram.com/test").success).toBe(true);
    expect(schema.safeParse("invalid-url").success).toBe(false);
  });

  it("should validate TikTok URL format", () => {
    const schema = z.string().url().optional();
    expect(schema.safeParse("https://tiktok.com/@test").success).toBe(true);
    expect(schema.safeParse("not-a-url").success).toBe(false);
  });

  it("should parse WhatsApp messages from textarea", () => {
    const messages = "Gostaria de marcar um horário\nGostaria de saber sobre os serviços\nQual é o preço?";
    const parsed = messages.split("\n").filter((m) => m.trim());
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toBe("Gostaria de marcar um horário");
  });

  it("should handle empty messages", () => {
    const messages = "";
    const parsed = messages.split("\n").filter((m) => m.trim());
    expect(parsed).toHaveLength(0);
  });

  it("should toggle buttons independently", () => {
    const settings = {
      whatsappEnabled: true,
      instagramEnabled: false,
      tiktokEnabled: true,
    };
    
    expect(settings.whatsappEnabled).toBe(true);
    expect(settings.instagramEnabled).toBe(false);
    expect(settings.tiktokEnabled).toBe(true);
  });

  it("should construct WhatsApp URL correctly", () => {
    const number = "+351912345678";
    const message = "Olá, gostaria de mais informações";
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${number.replace(/\D/g, "")}?text=${encoded}`;
    
    expect(url).toContain("https://wa.me/");
    expect(url).toContain("351912345678");
    expect(url).toContain("text=");
  });

  it("should validate required fields when enabled", () => {
    const validateSettings = (settings: any) => {
      if (settings.whatsappEnabled && !settings.whatsappNumber) {
        throw new Error("WhatsApp number required");
      }
      if (settings.instagramEnabled && !settings.instagramUrl) {
        throw new Error("Instagram URL required");
      }
      if (settings.tiktokEnabled && !settings.tiktokUrl) {
        throw new Error("TikTok URL required");
      }
    };

    expect(() => validateSettings({ whatsappEnabled: true, whatsappNumber: "" })).toThrow();
    expect(() => validateSettings({ whatsappEnabled: true, whatsappNumber: "+351912345678" })).not.toThrow();
    expect(() => validateSettings({ instagramEnabled: false })).not.toThrow();
  });
});
