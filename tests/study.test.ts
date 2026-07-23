import { loadFlashcards } from "../src/data/loadFlashcards";
import {
  createStudyUnits,
  matchesFilters,
  mergeProgress,
  nextClientTimestamp,
  shuffle,
  unitBelongsToView,
  unitKey,
} from "../src/lib/study";
import type { ProgressEntry, ProgressMap } from "../src/types";

function entry(timestamp: number, status: "learning" | "known" = "learning"): ProgressEntry {
  return {
    cardId: "FC001",
    direction: "hanzi-es",
    status,
    clientUpdatedAt: timestamp,
    serverUpdatedAt: null,
    schemaVersion: 1,
  };
}

describe("study domain", () => {
  const cards = loadFlashcards();

  it("creates one independent unit per direction", () => {
    const units = createStudyUnits(cards);
    expect(units).toHaveLength(278);
    expect(units.slice(0, 2).map((unit) => unit.direction)).toEqual([
      "hanzi-es",
      "es-hanzi",
    ]);
  });

  it("searches pinyin without requiring tone marks", () => {
    expect(
      matchesFilters(cards[1], { query: "ni", topic: "all", type: "all" }),
    ).toBe(true);
    expect(
      matchesFilters(cards[1], { query: "como te llamas", topic: "all", type: "all" }),
    ).toBe(true);
  });

  it("filters by topic and type", () => {
    expect(
      matchesFilters(cards[0], { query: "", topic: "pronombres", type: "palabra" }),
    ).toBe(true);
    expect(
      matchesFilters(cards[0], { query: "", topic: "saludos", type: "palabra" }),
    ).toBe(false);
  });

  it("shuffles without adding or removing units", () => {
    const result = shuffle([1, 2, 3, 4], () => 0);
    expect(result).toEqual([2, 3, 4, 1]);
    expect(new Set(result)).toEqual(new Set([1, 2, 3, 4]));
  });

  it("tracks the two directions independently", () => {
    const units = createStudyUnits(cards.slice(0, 1));
    const progress: ProgressMap = { [units[0].key]: entry(1) };
    expect(unitBelongsToView(units[0], "study", progress)).toBe(true);
    expect(unitBelongsToView(units[1], "discover", progress)).toBe(true);
  });

  it("uses the newest client timestamp and lets cloud win exact ties", () => {
    const key = unitKey("FC001", "hanzi-es");
    const local = { [key]: entry(20, "learning") };
    const olderCloud = { [key]: entry(10, "known") };
    const tieCloud = { [key]: entry(20, "known") };

    expect(mergeProgress(local, olderCloud).merged[key].status).toBe("learning");
    expect(mergeProgress(local, olderCloud).localWinners).toEqual(local);
    expect(mergeProgress(local, tieCloud).merged[key].status).toBe("known");
    expect(mergeProgress(local, tieCloud).localWinners).toEqual({});
  });

  it("keeps local timestamps monotonic", () => {
    expect(nextClientTimestamp(entry(100), 20)).toBe(101);
  });
});
