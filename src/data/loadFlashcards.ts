import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Papa from "papaparse";
import { z } from "zod";

import type { Flashcard } from "../types";

const EXPECTED_COLUMNS = [
  "id",
  "tipo",
  "tema",
  "hanzi",
  "pinyin",
  "espanol",
  "explicacion",
  "ejemplo_hanzi",
  "ejemplo_pinyin",
  "ejemplo_espanol",
  "pagina",
  "etiquetas",
] as const;

const flashcardSchema = z.object({
  id: z.string().regex(/^FC\d{3}$/, "debe tener el formato FC001"),
  tipo: z.enum(["palabra", "frase", "concepto"]),
  tema: z.string().min(1),
  hanzi: z.string().min(1),
  pinyin: z.string().min(1),
  espanol: z.string().min(1),
  explicacion: z.string().min(1),
  ejemplo_hanzi: z.string(),
  ejemplo_pinyin: z.string(),
  ejemplo_espanol: z.string(),
  pagina: z.string().min(1),
  etiquetas: z.string(),
});

export function parseFlashcardsCsv(csv: string): Flashcard[] {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),
  });

  if (result.errors.length > 0) {
    const details = result.errors
      .map((error) => `fila ${error.row ?? "?"}: ${error.message}`)
      .join("; ");
    throw new Error(`El CSV de tarjetas no se pudo analizar: ${details}`);
  }

  const fields = result.meta.fields ?? [];
  const missing = EXPECTED_COLUMNS.filter((column) => !fields.includes(column));
  const unexpected = fields.filter(
    (column) => !EXPECTED_COLUMNS.includes(column as (typeof EXPECTED_COLUMNS)[number]),
  );

  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Columnas del CSV inválidas. Faltan: ${missing.join(", ") || "ninguna"}. ` +
        `Sobran: ${unexpected.join(", ") || "ninguna"}.`,
    );
  }

  const cards = result.data.map((row, index) => {
    const parsed = flashcardSchema.safeParse(row);
    if (!parsed.success) {
      throw new Error(
        `Tarjeta inválida en la fila ${index + 2}: ${z.prettifyError(parsed.error)}`,
      );
    }
    return parsed.data;
  });

  const ids = new Set<string>();
  for (const card of cards) {
    if (ids.has(card.id)) {
      throw new Error(`ID de tarjeta duplicado: ${card.id}`);
    }
    ids.add(card.id);
  }

  if (cards.length === 0) {
    throw new Error("El CSV de tarjetas está vacío.");
  }

  return cards;
}

export function loadFlashcards(): Flashcard[] {
  const path = resolve(process.cwd(), "chino_flashcards.csv");
  return parseFlashcardsCsv(readFileSync(path, "utf8"));
}
