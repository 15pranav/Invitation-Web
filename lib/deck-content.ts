import type { CardSpec, EventContent, ProgrammeItem } from "./content";
export type CeremonialCard = ProgrammeItem & {
  subtitle: string;
  theme?: CardSpec["theme"];
  artwork?: string;
  icon?: ProgrammeItem["kind"];
  frontContent?: string;
  backTitle?: string;
  backContent?: string;
};
export const sourceKey = (c: Pick<CardSpec, "source" | "sourceId">) =>
  `${c.source}:${c.sourceId}`;
export function deckEntries(content: EventContent): CardSpec[] {
  const settings = content.deck || {
    cards: [],
    excluded: [],
    autoInclude: true,
  };
  const cards = [...settings.cards].sort((a, b) => a.order - b.order);
  const linked = new Set([...cards.map(sourceKey), ...settings.excluded]);
  if (settings.autoInclude) {
    const sources = [
      ...content.programme
        .filter((p) => p.world === "jagran")
        .map((p) => ({ source: "programme" as const, sourceId: p.id })),
      ...content.bhajans.map((b) => ({
        source: "bhajan" as const,
        sourceId: b.id,
      })),
    ];
    for (const source of sources)
      if (!linked.has(sourceKey(source)))
        cards.push({
          ...source,
          id: sourceKey(source),
          enabled: true,
          order: cards.length,
        });
  }
  return cards.map((c, order) => ({ ...c, order }));
}
export function resolveCard(
  content: EventContent,
  spec: CardSpec,
): CeremonialCard | null {
  let base: ProgrammeItem;
  if (spec.source === "programme") {
    const p = content.programme.find((p) => p.id === spec.sourceId);
    if (!p) return null;
    base = p;
  } else if (spec.source === "bhajan") {
    const b = content.bhajans.find((b) => b.id === spec.sourceId);
    if (!b) return null;
    base = {
      id: b.id,
      title: b.title,
      hindi: "भजन",
      time: "TBD",
      description: b.description || b.singer,
      kind: "bhajan",
      world: "jagran",
    };
  } else if (spec.source === "event") {
    base = {
      id: spec.id,
      title: "Come celebrate",
      hindi: "सादर आमंत्रण",
      time: content.date,
      description: content.venue,
      kind: "venue",
      world: "jagran",
    };
  } else
    base = {
      id: spec.id,
      title: "A new ceremony",
      hindi: "",
      time: "TBD",
      description: "",
      kind: "katha",
      world: "jagran",
    };
  return {
    ...base,
    id: spec.id,
    title: spec.title ?? base.title,
    hindi: spec.subtitle ?? base.hindi,
    subtitle: spec.subtitle ?? base.hindi,
    time: spec.time ?? base.time,
    description: spec.description ?? base.description,
    kind: spec.kind ?? base.kind,
    icon: spec.icon,
    theme: spec.theme,
    artwork: spec.artwork,
    frontContent: spec.frontContent,
    backTitle: spec.backTitle,
    backContent: spec.backContent,
  };
}
export function resolveDeck(content: EventContent): CeremonialCard[] {
  return deckEntries(content)
    .filter((c) => c.enabled)
    .map((c) => resolveCard(content, c))
    .filter((c): c is CeremonialCard => !!c);
}
