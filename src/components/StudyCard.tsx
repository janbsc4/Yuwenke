import { forwardRef, type RefObject } from "react";

import type { StudyUnit } from "../types";
import { topicLabel } from "../lib/labels";
import { tagsFor } from "../lib/study";

interface StudyCardProps {
  unit: StudyUnit;
  revealed: boolean;
  promptRef: RefObject<HTMLHeadingElement | null>;
}

const TYPE_LABELS = {
  palabra: "Palabra",
  frase: "Frase",
  concepto: "Concepto",
} as const;

export const StudyCard = forwardRef<HTMLElement, StudyCardProps>(function StudyCard(
  { unit, revealed, promptRef },
  answerRef,
) {
  const { card, direction } = unit;
  const hanziPrompt = direction === "hanzi-es";
  const tags = tagsFor(card);

  return (
    <article className={`study-card ${revealed ? "is-revealed" : ""}`}>
      <div className="card-prompt">
        <p className="eyebrow">Tu pregunta</p>
        <h2
          className={hanziPrompt ? "prompt-hanzi" : "prompt-spanish"}
          lang={hanziPrompt ? "zh-Hans" : "es"}
          ref={promptRef}
          tabIndex={-1}
        >
          {hanziPrompt ? card.hanzi : card.espanol}
        </h2>
      </div>

      {revealed ? (
        <section className="card-answer" ref={answerRef} tabIndex={-1} aria-labelledby="answer-title">
          <h3 className="eyebrow" id="answer-title">
            Respuesta
          </h3>
          <p
            className={hanziPrompt ? "answer-spanish" : "answer-hanzi"}
            lang={hanziPrompt ? "es" : "zh-Hans"}
          >
            {hanziPrompt ? card.espanol : card.hanzi}
          </p>

          <dl className="answer-details">
            <div>
              <dt>Pinyin</dt>
              <dd lang="zh-Latn">{card.pinyin}</dd>
            </div>
            <div>
              <dt>Explicación</dt>
              <dd lang="es">{card.explicacion}</dd>
            </div>
          </dl>

          <div className="example-block">
            <h3>Ejemplo</h3>
            <p className="example-hanzi" lang="zh-Hans">
              {card.ejemplo_hanzi}
            </p>
            <p lang="zh-Latn">{card.ejemplo_pinyin}</p>
            <p lang="es">{card.ejemplo_espanol}</p>
          </div>

          <footer className="card-meta">
            <p>
              {TYPE_LABELS[card.tipo]} <span aria-hidden="true">·</span> {topicLabel(card.tema)}{" "}
              <span aria-hidden="true">·</span> Notas: {card.pagina}
            </p>
            {tags.length > 0 ? (
              <ul className="tag-list" aria-label="Etiquetas">
                {tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            ) : null}
          </footer>
        </section>
      ) : null}
    </article>
  );
});
