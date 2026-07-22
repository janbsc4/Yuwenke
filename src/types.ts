export const STUDY_DIRECTIONS = ["hanzi-es", "es-hanzi"] as const;

export type StudyDirection = (typeof STUDY_DIRECTIONS)[number];
export type ProgressStatus = "learning" | "known";
export type StudyView = "study" | "discover" | "mastered";
export type CardType = "palabra" | "frase" | "concepto";

export interface Flashcard {
  id: string;
  tipo: CardType;
  tema: string;
  hanzi: string;
  pinyin: string;
  espanol: string;
  explicacion: string;
  ejemplo_hanzi: string;
  ejemplo_pinyin: string;
  ejemplo_espanol: string;
  pagina: string;
  etiquetas: string;
}

export interface StudyUnit {
  key: string;
  cardId: string;
  direction: StudyDirection;
  card: Flashcard;
}

export interface ProgressEntry {
  cardId: string;
  direction: StudyDirection;
  status: ProgressStatus;
  clientUpdatedAt: number;
  serverUpdatedAt: number | null;
  schemaVersion: 1;
}

export type ProgressMap = Record<string, ProgressEntry>;

export interface Filters {
  query: string;
  topic: string;
  type: CardType | "all";
}

export interface SessionTally {
  primary: number;
  secondary: number;
  skipped: number;
}
