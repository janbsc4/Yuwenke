import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import FlashcardApp from "../src/components/FlashcardApp";
import type { Flashcard } from "../src/types";

const card: Flashcard = {
  id: "FC001",
  tipo: "palabra",
  tema: "saludos",
  hanzi: "你好",
  pinyin: "nǐ hǎo",
  espanol: "hola",
  explicacion: "Un saludo básico.",
  ejemplo_hanzi: "你好！",
  ejemplo_pinyin: "Nǐ hǎo!",
  ejemplo_espanol: "¡Hola!",
  pagina: "1",
  etiquetas: "saludo;basico",
};

describe("FlashcardApp", () => {
  it("supports the guest discover flow and persists a decision", async () => {
    const user = userEvent.setup();
    render(<FlashcardApp cards={[card]} />);

    expect(await screen.findByText("Descubrir")).toBeInTheDocument();
    expect(screen.getByText("Aprende Mucho Chino")).toBeInTheDocument();
    expect(
      screen.queryByText(/Cada tarjeta se practica en dos sentidos/),
    ).not.toBeInTheDocument();
    const reveal = await screen.findByRole("button", { name: /Mostrar respuesta/ });
    await user.click(reveal);
    expect(screen.getByText("Un saludo básico.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Añadir a aprendizaje/ }));

    await waitFor(() => {
      expect(window.localStorage.getItem("yuwenke:guest-progress:v1")).toContain("learning");
    });
  });

  it("shows a useful empty state for a view without cards", async () => {
    const user = userEvent.setup();
    render(<FlashcardApp cards={[card]} />);
    await screen.findByRole("button", { name: /Estudiar/ });
    await user.click(screen.getByRole("button", { name: /Estudiar/ }));
    expect(await screen.findByText("Aún no tienes tarjetas en aprendizaje.")).toBeInTheDocument();
  });

  it("supports the global reveal keyboard shortcut", async () => {
    render(<FlashcardApp cards={[card]} />);
    await screen.findByRole("button", { name: /Mostrar respuesta/ });
    fireEvent.keyDown(window, { code: "Space", key: " " });
    expect(await screen.findByText("Un saludo básico.")).toBeInTheDocument();
  });
});
