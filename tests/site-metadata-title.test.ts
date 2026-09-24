import { describe, expect, it } from "vitest";
import {
  documentTitle,
  ensureBrandedTitle,
} from "@/lib/metadata/site-metadata";

describe("site title brand helpers", () => {
  it("ensureBrandedTitle collapses duplicate brand suffixes", () => {
    expect(ensureBrandedTitle("PSV Reaction Force")).toBe(
      "PSV Reaction Force | FieldEngineersKit",
    );
    expect(
      ensureBrandedTitle("PSV Reaction Force | FieldEngineersKit"),
    ).toBe("PSV Reaction Force | FieldEngineersKit");
    expect(
      ensureBrandedTitle(
        "PSV Reaction Force | FieldEngineersKit | FieldEngineersKit",
      ),
    ).toBe("PSV Reaction Force | FieldEngineersKit");
  });

  it("documentTitle returns absolute so root template does not double-suffix", () => {
    expect(documentTitle("About | FieldEngineersKit")).toEqual({
      absolute: "About | FieldEngineersKit",
    });
  });
});
