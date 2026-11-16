import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("junta classes e ignora valores falsos", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("resolve conflitos de classes do Tailwind (a última vence)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
