import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getAccessCopy } from "./Access";

describe("access page copy", () => {
  it("gives a clear registration action that starts the free trial", () => {
    const copy = getAccessCopy(true);

    expect(copy.heading).toContain("مساحة عملك");
    expect(copy.action).toContain("بدء التجربة");
    expect(copy.switchPath).toBe("/login");
  });

  it("keeps sign-in distinct and offers a route to account creation", () => {
    const copy = getAccessCopy(false);

    expect(copy.heading).toContain("عودتك");
    expect(copy.action).toContain("تسجيل الدخول");
    expect(copy.switchPath).toBe("/register");
  });

  it("keeps the public /access compatibility route available", () => {
    const appSource = fs.readFileSync(path.join(process.cwd(), "client", "src", "App.tsx"), "utf8");

    expect(appSource).toContain('<Route path="/access" component={Access} />');
  });
});
