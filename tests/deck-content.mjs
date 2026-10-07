import assert from "node:assert/strict";
import { contentSchema, seed } from "../lib/content.ts";
import { resolveDeck, deckEntries } from "../lib/deck-content.ts";
const c = contentSchema.parse(seed);
const original = resolveDeck(c);
assert.ok(original.length);
for (const count of [0, 1, 3, 10, 20]) {
  const fixture = structuredClone(c);
  fixture.deck = {
    autoInclude: false,
    excluded: [],
    cards: Array.from({ length: count }, (_, i) => ({
      id: `test-${i}`,
      source: "custom",
      sourceId: "",
      enabled: true,
      order: count - i,
      title: `Ceremony ${i}`,
    })),
  };
  assert.equal(resolveDeck(contentSchema.parse(fixture)).length, count);
  if (count)
    assert.equal(resolveDeck(fixture)[0].title, `Ceremony ${count - 1}`);
}
let cards = deckEntries(c);
const first = cards[0];
c.deck.cards = cards;
c.programme.find((p) => p.id === first.sourceId).title = "Updated source";
assert.equal(resolveDeck(c)[0].title, "Updated source");
c.deck.cards[0].title = "Override";
assert.equal(resolveDeck(c)[0].title, "Override");
c.deck.cards[0].enabled = false;
assert.ok(!resolveDeck(c).some((x) => x.id === first.id));
c.deck.cards = c.deck.cards.slice(1);
c.deck.excluded = [`${first.source}:${first.sourceId}`];
assert.ok(!deckEntries(c).some((x) => x.sourceId === first.sourceId));
c.deck.cards.push({ ...cards[1] });
assert.equal(contentSchema.safeParse(c).success, false);
delete c.deck;
assert.equal(contentSchema.parse(c).deck.autoInclude, true);
console.log(
  "Deck checks passed: 0/1/3/10/20 counts, order, live source inheritance, overrides, hiding, deletion, duplicate ID validation, old content compatibility.",
);
