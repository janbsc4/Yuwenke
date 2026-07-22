import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import type {
  CardType,
  Filters,
  Flashcard,
  SessionTally,
  StudyUnit,
  StudyView,
} from "../types";
import {
  createStudyUnits,
  matchesFilters,
  shuffle,
  unitBelongsToView,
  visibleUnits,
} from "../lib/study";
import { topicLabel } from "../lib/labels";
import { useProgressSync } from "../hooks/useProgressSync";
import { StudyCard } from "./StudyCard";

interface FlashcardAppProps {
  cards: Flashcard[];
}

const VIEW_LABELS: Record<StudyView, string> = {
  study: "Estudiar",
  discover: "Descubrir",
  mastered: "Dominadas",
};

const TYPE_LABELS: Record<CardType, string> = {
  palabra: "Palabra",
  frase: "Frase",
  concepto: "Concepto",
};

const EMPTY_FILTERS: Filters = { query: "", topic: "all", type: "all" };
const EMPTY_TALLY: SessionTally = { primary: 0, secondary: 0, skipped: 0 };

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "Tú";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase())
    .join("");
}

function plural(value: number, singular: string, pluralForm = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : pluralForm}`;
}

function readPreference(key: string): string | null {
  try {
    return window.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writePreference(key: string, value: string): void {
  try {
    window.localStorage?.setItem(key, value);
  } catch {
    // Preferences are optional; progress storage reports its own failures.
  }
}

export default function FlashcardApp({ cards }: FlashcardAppProps) {
  const units = useMemo(() => createStudyUnits(cards), [cards]);
  const topics = useMemo(
    () => [...new Set(cards.map((card) => card.tema))].sort((a, b) => a.localeCompare(b, "es")),
    [cards],
  );
  const {
    progress,
    ready,
    storageAvailable,
    user,
    syncState,
    firebaseConfigured,
    firebaseReady,
    notice,
    setStatus,
    signIn,
    signOut,
    retry,
    clearNotice,
  } = useProgressSync();

  const [activeView, setActiveView] = useState<StudyView>("discover");
  const [viewInitialized, setViewInitialized] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showDirectionTip, setShowDirectionTip] = useState(false);
  const [queue, setQueue] = useState<StudyUnit[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [tally, setTally] = useState<SessionTally>(EMPTY_TALLY);
  const [sessionNonce, setSessionNonce] = useState(0);

  const searchRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const answerRef = useRef<HTMLElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const loginButtonRef = useRef<HTMLButtonElement>(null);
  const filterDialogRef = useRef<HTMLElement>(null);
  const loginDialogRef = useRef<HTMLElement>(null);

  const counts = useMemo(() => {
    const filtered = units.filter((unit) => matchesFilters(unit.card, filters));
    return {
      study: filtered.filter((unit) => unitBelongsToView(unit, "study", progress)).length,
      discover: filtered.filter((unit) => unitBelongsToView(unit, "discover", progress)).length,
      mastered: filtered.filter((unit) => unitBelongsToView(unit, "mastered", progress)).length,
    };
  }, [filters, progress, units]);

  const hasFilters = filters.query.trim() !== "" || filters.topic !== "all" || filters.type !== "all";
  const filterCount = Number(filters.topic !== "all") + Number(filters.type !== "all");
  const current = queue[queueIndex];

  useEffect(() => {
    if (!ready || viewInitialized) return;
    const stored = readPreference("yuwenke:last-view:v1") as StudyView | null;
    const candidate = stored && counts[stored] > 0 ? stored : null;
    const initial =
      candidate ??
      (counts.study > 0
        ? "study"
        : counts.discover > 0
          ? "discover"
          : "mastered");
    setActiveView(initial);
    setViewInitialized(true);
    setShowDirectionTip(readPreference("yuwenke:direction-tip:v1") !== "seen");
  }, [counts, ready, viewInitialized]);

  useEffect(() => {
    if (!ready || !viewInitialized) return;
    writePreference("yuwenke:last-view:v1", activeView);
    const nextQueue = shuffle(visibleUnits(units, activeView, progress, filters));
    setQueue(nextQueue);
    setQueueIndex(0);
    setRevealed(false);
    setCompleted(false);
    setTally(EMPTY_TALLY);
  }, [activeView, filters, ready, sessionNonce, units, user?.uid, viewInitialized]);

  useEffect(() => {
    if (revealed) answerRef.current?.focus();
  }, [revealed]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(clearNotice, 6000);
    return () => window.clearTimeout(timeout);
  }, [clearNotice, notice]);

  useEffect(() => {
    const dialog = loginOpen ? loginDialogRef.current : filterSheetOpen ? filterDialogRef.current : null;
    if (!dialog) return;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ),
    );
    focusable[0]?.focus();

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", trapFocus);
    return () => dialog.removeEventListener("keydown", trapFocus);
  }, [filterSheetOpen, loginOpen]);

  const dismissDirectionTip = () => {
    writePreference("yuwenke:direction-tip:v1", "seen");
    setShowDirectionTip(false);
  };

  const closeFilterSheet = useCallback(() => {
    setFilterSheetOpen(false);
    window.setTimeout(() => filterButtonRef.current?.focus(), 0);
  }, []);

  const closeLogin = useCallback(() => {
    setLoginOpen(false);
    window.setTimeout(() => loginButtonRef.current?.focus(), 0);
  }, []);

  const advance = useCallback(() => {
    let nextIndex = queueIndex + 1;
    while (
      nextIndex < queue.length &&
      !unitBelongsToView(queue[nextIndex], activeView, progress)
    ) {
      nextIndex += 1;
    }

    if (nextIndex >= queue.length) {
      setCompleted(true);
      setRevealed(false);
      return;
    }

    setQueueIndex(nextIndex);
    setRevealed(false);
    window.setTimeout(() => promptRef.current?.focus(), 0);
  }, [activeView, progress, queue, queueIndex]);

  const choosePrimary = useCallback(() => {
    if (!current || !revealed) return;
    const status = activeView === "mastered" ? "known" : "learning";
    setStatus(current.cardId, current.direction, status);
    setTally((value) => ({ ...value, primary: value.primary + 1 }));
    advance();
  }, [activeView, advance, current, revealed, setStatus]);

  const chooseSecondary = useCallback(() => {
    if (!current || !revealed) return;
    const status = activeView === "mastered" ? "learning" : "known";
    setStatus(current.cardId, current.direction, status);
    setTally((value) => ({ ...value, secondary: value.secondary + 1 }));
    advance();
  }, [activeView, advance, current, revealed, setStatus]);

  const skip = useCallback(() => {
    if (!current || activeView !== "discover") return;
    setTally((value) => ({ ...value, skipped: value.skipped + 1 }));
    advance();
  }, [activeView, advance, current]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inField =
        target instanceof Element &&
        target.matches("input, select, textarea, button, [contenteditable='true']");
      if (event.key === "Escape") {
        if (filterSheetOpen) closeFilterSheet();
        else if (loginOpen) closeLogin();
        else if (accountOpen) setAccountOpen(false);
        return;
      }
      if (filterSheetOpen || loginOpen || accountOpen) return;
      if (event.key === "/" && !inField) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (inField || completed || !current) return;
      if (event.code === "Space" && !revealed) {
        event.preventDefault();
        setRevealed(true);
      } else if (event.key === "1" && revealed) {
        choosePrimary();
      } else if (event.key === "2" && revealed) {
        chooseSecondary();
      } else if (event.key === "3" && activeView === "discover") {
        skip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    accountOpen,
    activeView,
    choosePrimary,
    chooseSecondary,
    closeFilterSheet,
    closeLogin,
    completed,
    current,
    filterSheetOpen,
    loginOpen,
    revealed,
    skip,
  ]);

  const changeQuery = (event: ChangeEvent<HTMLInputElement>) => {
    setFilters((value) => ({ ...value, query: event.target.value }));
  };

  const resetFilters = () => setFilters(EMPTY_FILTERS);

  const changeView = (view: StudyView) => {
    setActiveView(view);
    setAccountOpen(false);
  };

  const startNewSession = () => setSessionNonce((value) => value + 1);

  if (!ready || !viewInitialized) {
    return (
      <div className="app-shell loading-shell" aria-live="polite">
        <div className="loading-brand skeleton" />
        <div className="loading-progress skeleton" />
        <div className="loading-card skeleton" />
        <p>Preparando tus tarjetas…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="Notas de chino, inicio">
          <span className="brand-seal" lang="zh-Hans" aria-hidden="true">
            中文
          </span>
          <span>
            <strong>Notas de chino</strong>
            <small>Una clase, dos sentidos</small>
          </span>
        </a>

        <div className="account-area">
          <span className={`sync-label sync-${syncState}`}>
            {user
              ? syncState === "syncing"
                ? "Sincronizando…"
                : syncState === "synced"
                  ? "Sincronizado"
                  : syncState === "offline"
                    ? "Sin conexión · cambios pendientes"
                    : syncState === "error"
                      ? "No se pudo sincronizar"
                      : "Guardado local"
              : "Solo en este dispositivo"}
          </span>
          {syncState === "error" && user ? (
            <button className="text-button" type="button" onClick={() => void retry()}>
              Reintentar
            </button>
          ) : null}
          {user ? (
            <div className="account-menu-wrap">
              <button
                type="button"
                className="avatar-button"
                aria-label="Abrir menú de cuenta"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((value) => !value)}
              >
                {initials(user.displayName, user.email)}
              </button>
              {accountOpen ? (
                <div className="account-menu" role="menu">
                  <strong>{user.displayName || "Tu cuenta"}</strong>
                  <span>{user.email}</span>
                  <button type="button" role="menuitem" onClick={() => void signOut()}>
                    Cerrar sesión
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              className="button button-small button-ink"
              onClick={() => setLoginOpen(true)}
              ref={loginButtonRef}
              title={firebaseConfigured ? undefined : "La sincronización aún no está configurada"}
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </header>

      <nav className="view-tabs" aria-label="Modos de estudio">
        {(Object.keys(VIEW_LABELS) as StudyView[]).map((view) => (
          <button
            type="button"
            key={view}
            className={view === activeView ? "is-active" : ""}
            aria-current={view === activeView ? "page" : undefined}
            onClick={() => changeView(view)}
          >
            <span>{VIEW_LABELS[view]}</span>
            <span className="count-pill">{counts[view]}</span>
          </button>
        ))}
      </nav>

      {showDirectionTip ? (
        <aside className="direction-tip">
          <span aria-hidden="true">双</span>
          <p>
            Cada tarjeta se practica en dos sentidos: chino → español y español → chino.
          </p>
          <button type="button" className="text-button" onClick={dismissDirectionTip}>
            Entendido
          </button>
        </aside>
      ) : null}

      {!user ? (
        <aside className="guest-note">
          <p>Estás estudiando como invitado. Tu progreso se guarda en este dispositivo.</p>
          <button type="button" className="text-button" onClick={() => setLoginOpen(true)}>
            Sincronizar con Google
          </button>
        </aside>
      ) : null}

      {!storageAvailable ? (
        <div className="inline-alert" role="status">
          Tu progreso no se guardará en este dispositivo.
        </div>
      ) : null}

      {notice ? (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button type="button" aria-label="Cerrar aviso" onClick={clearNotice}>
            ×
          </button>
        </div>
      ) : null}

      <div className="search-row">
        <label className="search-field">
          <span className="sr-only">Buscar en las tarjetas</span>
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Busca caracteres, pinyin o español…"
            value={filters.query}
            onChange={changeQuery}
            ref={searchRef}
          />
          {filters.query ? (
            <button
              type="button"
              aria-label="Borrar búsqueda"
              onClick={() => setFilters((value) => ({ ...value, query: "" }))}
            >
              ×
            </button>
          ) : null}
        </label>
        <button
          type="button"
          className="button filter-trigger"
          onClick={() => setFilterSheetOpen(true)}
          ref={filterButtonRef}
        >
          {filterCount > 0 ? `Filtros · ${filterCount}` : "Filtros"}
        </button>
      </div>

      <main className="study-layout">
        <aside className="filter-panel" aria-label="Filtros">
          <div className="panel-heading">
            <p className="eyebrow">Tu colección</p>
            <p>{plural(units.length, "práctica", "prácticas")}</p>
          </div>
          <label>
            Tema
            <select
              value={filters.topic}
              onChange={(event) => setFilters((value) => ({ ...value, topic: event.target.value }))}
            >
              <option value="all">Todos los temas</option>
              {topics.map((topic) => (
                <option value={topic} key={topic}>
                  {topicLabel(topic)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select
              value={filters.type}
              onChange={(event) =>
                setFilters((value) => ({ ...value, type: event.target.value as Filters["type"] }))
              }
            >
              <option value="all">Todos los tipos</option>
              {(Object.keys(TYPE_LABELS) as CardType[]).map((type) => (
                <option value={type} key={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          {hasFilters ? (
            <button type="button" className="text-button align-left" onClick={resetFilters}>
              Limpiar filtros
            </button>
          ) : null}
          <div className="direction-legend">
            <span>中 → ES</span>
            <span>ES → 中</span>
            <p>Cada ficha aparece una vez en cada sentido.</p>
          </div>
        </aside>

        <section className="session-panel" aria-label={`${VIEW_LABELS[activeView]} tarjetas`}>
          {current && !completed ? (
            <>
              <div className="session-progress" aria-live="polite">
                <div>
                  <span>
                    Tarjeta {queueIndex + 1} de {queue.length}
                  </span>
                  <span className="direction-badge">
                    {current.direction === "hanzi-es" ? "Chino → Español" : "Español → Chino"}
                  </span>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label="Progreso de la sesión"
                  aria-valuemin={0}
                  aria-valuemax={queue.length}
                  aria-valuenow={queueIndex + 1}
                >
                  <span style={{ width: `${((queueIndex + 1) / queue.length) * 100}%` }} />
                </div>
              </div>

              <StudyCard
                unit={current}
                revealed={revealed}
                promptRef={promptRef}
                ref={answerRef}
              />

              <div className="decision-area">
                {!revealed ? (
                  <button type="button" className="button button-primary reveal-button" onClick={() => setRevealed(true)}>
                    Mostrar respuesta <kbd>Espacio</kbd>
                  </button>
                ) : (
                  <div className="decision-buttons">
                    <button type="button" className="button button-primary" onClick={choosePrimary}>
                      {activeView === "study"
                        ? "Seguir aprendiendo"
                        : activeView === "discover"
                          ? "Añadir a aprendizaje"
                          : "Sigue dominada"}
                      <kbd>1</kbd>
                    </button>
                    <button type="button" className="button button-secondary" onClick={chooseSecondary}>
                      {activeView === "mastered" ? "Volver a aprendizaje" : "Ya la sé"}
                      <kbd>2</kbd>
                    </button>
                  </div>
                )}
                {activeView === "discover" ? (
                  <button type="button" className="skip-button" onClick={skip}>
                    Saltar <kbd>3</kbd>
                  </button>
                ) : null}
              </div>
            </>
          ) : completed ? (
            <SessionSummary
              view={activeView}
              tally={tally}
              onRestart={startNewSession}
              onChangeView={changeView}
              learningCount={counts.study}
            />
          ) : (
            <EmptyState
              view={activeView}
              filtered={hasFilters}
              learningCount={counts.study}
              onClear={resetFilters}
              onChangeView={changeView}
            />
          )}
        </section>
      </main>

      {filterSheetOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeFilterSheet}>
          <section
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-title"
            ref={filterDialogRef}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <h2 id="filter-title">Filtrar tarjetas</h2>
              <button type="button" aria-label="Cerrar filtros" onClick={closeFilterSheet}>×</button>
            </div>
            <label>
              Tema
              <select
                value={filters.topic}
                onChange={(event) => setFilters((value) => ({ ...value, topic: event.target.value }))}
              >
                <option value="all">Todos los temas</option>
                {topics.map((topic) => (
                  <option value={topic} key={topic}>{topicLabel(topic)}</option>
                ))}
              </select>
            </label>
            <label>
              Tipo
              <select
                value={filters.type}
                onChange={(event) =>
                  setFilters((value) => ({ ...value, type: event.target.value as Filters["type"] }))
                }
              >
                <option value="all">Todos los tipos</option>
                {(Object.keys(TYPE_LABELS) as CardType[]).map((type) => (
                  <option value={type} key={type}>{TYPE_LABELS[type]}</option>
                ))}
              </select>
            </label>
            <button type="button" className="button button-primary" onClick={closeFilterSheet}>
              Aplicar filtros
            </button>
            <button type="button" className="text-button" onClick={resetFilters}>
              Limpiar filtros
            </button>
          </section>
        </div>
      ) : null}

      {loginOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeLogin}>
          <section
            className="login-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            ref={loginDialogRef}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="dialog-mark" lang="zh-Hans" aria-hidden="true">记</div>
            <h2 id="login-title">Guarda tu progreso</h2>
            <p>
              Inicia sesión para continuar en otros dispositivos. El progreso guardado aquí se conservará al sincronizar.
            </p>
            {firebaseConfigured ? (
              <button
                type="button"
                className="button button-primary google-button"
                disabled={!firebaseReady}
                onClick={() => {
                  void signIn();
                  setLoginOpen(false);
                }}
              >
                <span aria-hidden="true">G</span>{" "}
                {firebaseReady ? "Continuar con Google" : "Preparando Google…"}
              </button>
            ) : (
              <p className="config-note">
                La sincronización todavía no está configurada. Puedes seguir estudiando en este dispositivo.
              </p>
            )}
            <button type="button" className="text-button" onClick={closeLogin}>Ahora no</button>
          </section>
        </div>
      ) : null}

      <div className="sr-only" aria-live="polite">
        {current && !completed ? `Tarjeta ${queueIndex + 1} de ${queue.length}` : ""}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  view: StudyView;
  filtered: boolean;
  learningCount: number;
  onClear: () => void;
  onChangeView: (view: StudyView) => void;
}

function EmptyState({ view, filtered, learningCount, onClear, onChangeView }: EmptyStateProps) {
  if (filtered) {
    return (
      <div className="empty-state">
        <span aria-hidden="true">空</span>
        <h2>No hay tarjetas que coincidan con estos filtros.</h2>
        <button type="button" className="button button-primary" onClick={onClear}>Limpiar filtros</button>
      </div>
    );
  }
  if (view === "study") {
    return (
      <div className="empty-state">
        <span aria-hidden="true">学</span>
        <h2>Aún no tienes tarjetas en aprendizaje.</h2>
        <p>Clasifica algunas tarjetas para empezar a practicar.</p>
        <button type="button" className="button button-primary" onClick={() => onChangeView("discover")}>Ir a Descubrir</button>
      </div>
    );
  }
  if (view === "discover") {
    return (
      <div className="empty-state">
        <span aria-hidden="true">完</span>
        <h2>Ya has clasificado todas las tarjetas.</h2>
        <div className="empty-actions">
          {learningCount > 0 ? (
            <button type="button" className="button button-primary" onClick={() => onChangeView("study")}>Ir a Estudiar</button>
          ) : null}
          <button type="button" className="button button-secondary" onClick={() => onChangeView("mastered")}>Ver dominadas</button>
        </div>
      </div>
    );
  }
  return (
    <div className="empty-state">
      <span aria-hidden="true">熟</span>
      <h2>Aún no has marcado ninguna tarjeta como dominada.</h2>
      <button type="button" className="button button-primary" onClick={() => onChangeView("discover")}>Ir a Descubrir</button>
    </div>
  );
}

interface SessionSummaryProps {
  view: StudyView;
  tally: SessionTally;
  onRestart: () => void;
  onChangeView: (view: StudyView) => void;
  learningCount: number;
}

function SessionSummary({ view, tally, onRestart, onChangeView, learningCount }: SessionSummaryProps) {
  const title = view === "study" ? "Sesión completada" : view === "discover" ? "Selección completada" : "Revisión completada";
  return (
    <div className="summary-card">
      <span className="summary-mark" lang="zh-Hans" aria-hidden="true">好</span>
      <p className="eyebrow">Buen trabajo</p>
      <h2>{title}</h2>
      <div className="summary-stats">
        {view === "study" ? (
          <>
            <p><strong>{tally.primary}</strong><span>{tally.primary === 1 ? "sigue en aprendizaje" : "siguen en aprendizaje"}</span></p>
            <p><strong>{tally.secondary}</strong><span>{tally.secondary === 1 ? "pasó a Dominadas" : "pasaron a Dominadas"}</span></p>
          </>
        ) : view === "discover" ? (
          <>
            <p><strong>{tally.primary}</strong><span>{tally.primary === 1 ? "añadida a aprendizaje" : "añadidas a aprendizaje"}</span></p>
            <p><strong>{tally.secondary}</strong><span>{tally.secondary === 1 ? "marcada como dominada" : "marcadas como dominadas"}</span></p>
            <p><strong>{tally.skipped}</strong><span>{tally.skipped === 1 ? "saltada" : "saltadas"}</span></p>
          </>
        ) : (
          <>
            <p><strong>{tally.primary}</strong><span>{tally.primary === 1 ? "sigue dominada" : "siguen dominadas"}</span></p>
            <p><strong>{tally.secondary}</strong><span>{tally.secondary === 1 ? "volvió a aprendizaje" : "volvieron a aprendizaje"}</span></p>
          </>
        )}
      </div>
      <div className="summary-actions">
        <button type="button" className="button button-primary" onClick={onRestart}>
          {view === "study" ? "Nueva sesión" : view === "discover" ? "Seguir descubriendo" : "Revisar de nuevo"}
        </button>
        {(view !== "study" || learningCount > 0) ? (
          <button type="button" className="button button-secondary" onClick={() => onChangeView("study")}>Ir a Estudiar</button>
        ) : (
          <button type="button" className="button button-secondary" onClick={() => onChangeView("discover")}>Ir a Descubrir</button>
        )}
      </div>
    </div>
  );
}
