import { loadFlashcards, parseFlashcardsCsv } from "../src/data/loadFlashcards";

const header =
  "id,tipo,tema,hanzi,pinyin,espanol,explicacion,ejemplo_hanzi,ejemplo_pinyin,ejemplo_espanol,pagina,etiquetas";

describe("flashcard CSV", () => {
  it("loads and validates all class-note cards", () => {
    const cards = loadFlashcards();
    expect(cards).toHaveLength(139);
    expect(new Set(cards.map((card) => card.id)).size).toBe(139);
    expect(cards.every((card) => card.hanzi && card.pinyin && card.espanol)).toBe(true);
    expect(cards.find((card) => card.id === "FC089")?.pinyin).toBe("shuí / shéi");
    expect(cards.slice(-5).map((card) => card.hanzi)).toEqual([
      "加油！",
      "什么时候",
      "跑步",
      "洗澡",
      "喝牛奶",
    ]);
  });

  it("rejects duplicate IDs", () => {
    const row =
      "FC001,palabra,saludos,你好,nǐ hǎo,hola,Un saludo.,你好！,Nǐ hǎo!,Hola.,1,saludo";
    expect(() => parseFlashcardsCsv(`${header}\n${row}\n${row}\n`)).toThrow(
      "ID de tarjeta duplicado",
    );
  });

  it("rejects a malformed schema", () => {
    const row = "FC001,otro,saludos,你好,nǐ hǎo,hola,x,x,x,x,1,x";
    expect(() => parseFlashcardsCsv(`${header}\n${row}\n`)).toThrow("Tarjeta inválida");
  });
});
