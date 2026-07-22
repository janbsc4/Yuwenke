import { localProgress } from "../src/lib/localProgress";
import { unitKey } from "../src/lib/study";
import type { ProgressEntry } from "../src/types";

const saved: ProgressEntry = {
  cardId: "FC001",
  direction: "hanzi-es",
  status: "learning",
  clientUpdatedAt: 123,
  serverUpdatedAt: null,
  schemaVersion: 1,
};

describe("local progress", () => {
  it("round-trips a versioned guest entry", () => {
    const key = unitKey(saved.cardId, saved.direction);
    expect(localProgress.writeGuest({ [key]: saved })).toBe(true);
    expect(localProgress.readGuest()).toEqual({ value: { [key]: saved }, available: true });
  });

  it("discards malformed entries without losing valid siblings", () => {
    const key = unitKey(saved.cardId, saved.direction);
    window.localStorage.setItem(
      "yuwenke:guest-progress:v1",
      JSON.stringify({
        schemaVersion: 1,
        entries: { [key]: saved, broken: { status: "maybe" } },
      }),
    );
    expect(localProgress.readGuest().value).toEqual({ [key]: saved });
  });

  it("falls back to an empty map for corrupt JSON", () => {
    window.localStorage.setItem("yuwenke:guest-progress:v1", "not-json");
    expect(localProgress.readGuest()).toEqual({ value: {}, available: true });
  });
});
