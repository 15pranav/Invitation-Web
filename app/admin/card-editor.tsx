"use client";
import { useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import {
  GripVertical,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";
import type { CardSpec, EventContent } from "@/lib/content";
import { deckEntries, resolveCard, sourceKey } from "@/lib/deck-content";
function Row({
  card,
  title,
  active,
  index,
  count,
  onSelect,
  onMove,
  onToggle,
  onDuplicate,
  onDelete,
}: {
  card: CardSpec;
  title: string;
  active: boolean;
  index: number;
  count: number;
  onSelect: () => void;
  onMove: (n: number) => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={card.id}
      dragListener={false}
      dragControls={controls}
      className={`cms-card-row ${active ? "active" : ""} ${card.enabled ? "" : "hidden-card"}`}
    >
      <button
        type="button"
        className="card-drag-handle"
        aria-label={`Drag to reorder ${title}`}
        onPointerDown={(e) => controls.start(e)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            onMove(e.key === "ArrowUp" ? -1 : 1);
          }
        }}
      >
        <GripVertical size={18} />
      </button>
      <button
        className="card-row-title"
        onClick={onSelect}
        aria-expanded={active}
      >
        {index + 1}. {title}
        <small>
          {card.source === "custom"
            ? "Custom card"
            : "Linked to " + card.source}
          {!card.enabled ? " · Hidden" : ""}
        </small>
      </button>
      <div className="card-row-tools">
        <button
          aria-label={`Move ${title} earlier`}
          disabled={!index}
          onClick={() => onMove(-1)}
        >
          <ChevronUp size={16} />
        </button>
        <button
          aria-label={`Move ${title} later`}
          disabled={index === count - 1}
          onClick={() => onMove(1)}
        >
          <ChevronDown size={16} />
        </button>
        <button
          aria-label={`${card.enabled ? "Hide" : "Show"} ${title}`}
          onClick={onToggle}
        >
          {card.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button aria-label={`Duplicate ${title}`} onClick={onDuplicate}>
          <Copy size={16} />
        </button>
        <button aria-label={`Delete card ${title}`} onClick={onDelete}>
          <Trash2 size={16} />
        </button>
      </div>
    </Reorder.Item>
  );
}
export default function CardEditor({
  content,
  onChange,
}: {
  content: EventContent;
  onChange: (deck: EventContent["deck"]) => void;
}) {
  const entries = deckEntries(content),
    [selected, setSelected] = useState<string | null>(null);
  const settings = content.deck;
  const card = entries.find((c) => c.id === selected),
    resolved = card ? resolveCard(content, card) : null;
  const commit = (
    cards: CardSpec[],
    extra: Partial<EventContent["deck"]> = {},
  ) =>
    onChange({
      ...settings,
      ...extra,
      cards: cards.map((c, order) => ({ ...c, order })),
    });
  const patch = (id: string, update: Partial<CardSpec>) =>
    commit(entries.map((c) => (c.id === id ? { ...c, ...update } : c)));
  const reorder = (ids: string[]) =>
    commit(ids.map((id) => entries.find((c) => c.id === id)!).filter(Boolean));
  const move = (index: number, step: number) => {
    if (index + step < 0 || index + step >= entries.length) return;
    const ids = entries.map((c) => c.id);
    [ids[index], ids[index + step]] = [ids[index + step], ids[index]];
    reorder(ids);
  };
  const field = (
    key:
      | "title"
      | "subtitle"
      | "time"
      | "description"
      | "artwork"
      | "frontContent"
      | "backTitle"
      | "backContent",
    label: string,
    placeholder = "",
    long = false,
  ) =>
    card && (
      <label className="admin-field">
        {label}
        {long ? (
          <textarea
            rows={3}
            value={card[key] ?? ""}
            placeholder={placeholder}
            onChange={(e) =>
              patch(card.id, { [key]: e.target.value || undefined })
            }
          />
        ) : (
          <input
            value={card[key] ?? ""}
            placeholder={placeholder}
            onChange={(e) =>
              patch(card.id, { [key]: e.target.value || undefined })
            }
          />
        )}
      </label>
    );
  return (
    <div className="card-editor">
      <div className="section-intro">
        <h2>The ceremonial deck</h2>
        <p>
          Keep around 3–10 main cards for an intimate experience. Linked cards
          follow your programme and bhajans; blank overrides inherit their
          source.
        </p>
      </div>
      <label className="card-auto-toggle">
        <input
          type="checkbox"
          checked={settings.autoInclude}
          onChange={(e) => commit(entries, { autoInclude: e.target.checked })}
        />{" "}
        Automatically include new Jagran programme items and bhajans
      </label>
      <p className="card-editor-help">
        Drag the handles to reorder. Arrow buttons and keyboard Up/Down on a
        handle offer the same control. Changes go live only after Publish.
      </p>
      <Reorder.Group
        axis="y"
        values={entries.map((c) => c.id)}
        onReorder={reorder}
        className="cms-card-list"
      >
        {entries.map((c, i) => (
          <Row
            key={c.id}
            card={c}
            index={i}
            count={entries.length}
            title={
              resolveCard(content, c)?.title ||
              "Source removed — choose another"
            }
            active={selected === c.id}
            onSelect={() => setSelected(selected === c.id ? null : c.id)}
            onMove={(step) => move(i, step)}
            onToggle={() => patch(c.id, { enabled: !c.enabled })}
            onDuplicate={() => {
              if (entries.length >= 120) return;
              const copy = { ...c, id: crypto.randomUUID(), order: i + 1 };
              const next = [...entries];
              next.splice(i + 1, 0, copy);
              commit(next);
              setSelected(copy.id);
            }}
            onDelete={() => {
              commit(
                entries.filter((x) => x.id !== c.id),
                {
                  excluded:
                    c.source === "custom"
                      ? settings.excluded
                      : Array.from(
                          new Set([...settings.excluded, sourceKey(c)]),
                        ),
                },
              );
              if (selected === c.id) setSelected(null);
            }}
          />
        ))}
      </Reorder.Group>
      {!entries.length && (
        <p className="card-editor-help">
          No cards yet. Add one below or enable automatic inclusion.
        </p>
      )}
      <button
        className="add-button"
        disabled={entries.length >= 120}
        onClick={() => {
          const c: CardSpec = {
            id: crypto.randomUUID(),
            source: "custom",
            sourceId: "",
            enabled: true,
            order: entries.length,
            title: "New ceremony",
            theme: (
              [
                "wine",
                "olive",
                "charcoal",
                "bronze",
                "maroon",
                "ivory",
              ] as const
            )[entries.length % 6],
            kind: "katha",
          };
          commit([...entries, c]);
          setSelected(c.id);
        }}
      >
        <Plus size={16} />
        Add ceremonial card
      </button>
      {card && (
        <section className="editor-section card-detail">
          <div className="section-intro">
            <h2>Edit {resolved?.title || "card"}</h2>
            <p>
              {card.source === "custom"
                ? "Create a ceremony just for this deck."
                : "Source details stay in Programme, Bhajans or Event & family. Override only what this card needs."}
            </p>
          </div>
          <label className="admin-field">
            Content source
            <select
              value={card.source === "custom" ? "custom" : sourceKey(card)}
              onChange={(e) => {
                const [source, ...rest] = e.target.value.split(":");
                const sourceId = rest.join(":");
                commit(
                  entries.map((c) =>
                    c.id === card.id
                      ? {
                          id: c.id,
                          order: c.order,
                          enabled: c.enabled,
                          source: source as CardSpec["source"],
                          sourceId,
                        }
                      : c,
                  ),
                );
              }}
            >
              <option value="custom">Custom content</option>
              <option value="event:venue">Event — venue</option>
              {content.programme.map((p) => (
                <option key={p.id} value={`programme:${p.id}`}>
                  Programme — {p.title}
                </option>
              ))}
              {content.bhajans.map((b) => (
                <option key={b.id} value={`bhajan:${b.id}`}>
                  Bhajan — {b.title}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            Card colour theme
            <select
              value={card.theme || ""}
              onChange={(e) =>
                patch(card.id, {
                  theme: (e.target.value as CardSpec["theme"]) || undefined,
                })
              }
            >
              <option value="">Original category colour</option>
              {["wine", "maroon", "charcoal", "olive", "bronze", "ivory"].map(
                (t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ),
              )}
            </select>
          </label>
          <div className="field-grid">
            <label className="admin-field">
              Category
              <select
                value={card.kind || ""}
                onChange={(e) =>
                  patch(card.id, {
                    kind: (e.target.value as CardSpec["kind"]) || undefined,
                  })
                }
              >
                <option value="">Use source category</option>
                {[
                  "jyoti",
                  "bhajan",
                  "katha",
                  "aarti",
                  "dinner",
                  "birthday",
                  "venue",
                ].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              Icon
              <select
                value={card.icon || ""}
                onChange={(e) =>
                  patch(card.id, {
                    icon: (e.target.value as CardSpec["icon"]) || undefined,
                  })
                }
              >
                <option value="">Use category icon</option>
                {[
                  "jyoti",
                  "bhajan",
                  "katha",
                  "aarti",
                  "dinner",
                  "birthday",
                  "venue",
                ].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            {field("title", "Card title", resolved?.title)}
            {field("subtitle", "Subtitle / Hindi", resolved?.subtitle)}
            {field("time", "Time", resolved?.time)}
          </div>
          {field("description", "Description", resolved?.description, true)}
          {field(
            "artwork",
            "Artwork URL (optional)",
            "Keep the original engraved artwork",
          )}
          <p className="card-editor-help">
            Use an image URL from Memories & media or a secure HTTPS image.
          </p>
          {field("frontContent", "Front content (optional)", "TOUCH TO REVEAL")}
          {field("backTitle", "Reverse title (optional)", resolved?.title)}
          {field(
            "backContent",
            "Reverse content (optional)",
            resolved?.description,
            true,
          )}
          <label className="card-auto-toggle">
            <input
              type="checkbox"
              checked={card.enabled}
              onChange={(e) => patch(card.id, { enabled: e.target.checked })}
            />{" "}
            Show this card in the invitation
          </label>
          {card.source !== "custom" && (
            <button
              className="text-button"
              onClick={() =>
                commit(
                  entries.map((c) =>
                    c.id === card.id
                      ? {
                          id: c.id,
                          source: c.source,
                          sourceId: c.sourceId,
                          order: c.order,
                          enabled: c.enabled,
                        }
                      : c,
                  ),
                )
              }
            >
              Reset overrides to source
            </button>
          )}
        </section>
      )}
      {settings.excluded.length > 0 && (
        <button
          className="text-button"
          onClick={() => onChange({ ...settings, excluded: [] })}
        >
          Restore deleted source cards
        </button>
      )}
    </div>
  );
}
