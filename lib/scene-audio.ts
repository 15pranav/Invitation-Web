import type { EventContent } from "./content";
export const audioChapters = [
  "opening",
  "ganesh",
  "darbar",
  "deck",
  "bhajans",
  "birthday",
  "memories",
  "venue",
  "finale",
] as const;
export type AudioChapter = (typeof audioChapters)[number];
export type AudioPlan = { url: string; volume: number; crossfade: number };
export type SceneSound = {
  url: string;
  enabled: boolean;
  continuePrevious: boolean;
  volume: number;
  crossfade: number;
};
export const audioLabels: Record<AudioChapter, string> = {
  opening: "Opening / diya",
  ganesh: "Ganesh Ji",
  darbar: "Maa’s Darbar",
  deck: "Ceremonial cards",
  bhajans: "Bhajans of the night",
  birthday: "Chitraksh turns two",
  memories: "Little moments",
  venue: "Come celebrate / RSVP",
  finale: "Final blessings",
};
export function sceneSound(
  audio: EventContent["audio"],
  chapter: AudioChapter,
): SceneSound {
  const own = audio.scenes?.[chapter];
  if (own) return own;
  const continuation = ["deck", "bhajans", "memories", "venue"].includes(
    chapter,
  );
  return {
    url: ["opening", "ganesh", "darbar"].includes(chapter)
      ? audio.jagran
      : chapter === "birthday"
        ? audio.birthday
        : "",
    enabled: true,
    continuePrevious: continuation,
    volume: 0.35,
    crossfade: 1.8,
  };
}
export function resolveSceneSound(
  audio: EventContent["audio"],
  chapter: AudioChapter,
  previous: AudioPlan,
  previousChapter?: AudioChapter,
): AudioPlan {
  const config = sceneSound(audio, chapter);
  if (!config.enabled || !config.continuePrevious)
    return {
      url: config.enabled ? config.url : "",
      volume: config.volume,
      crossfade: config.crossfade,
    };
  // Continuation follows chapter order, so jumping or scrolling backward never
  // inherits an unrelated closing/opening track. A directly preceding live bhajan
  // selection is preserved when the next scene intentionally continues it.
  const index = audioChapters.indexOf(chapter),
    source = audioChapters[index - 1];
  const inherited =
    source === previousChapter
      ? previous
      : source
        ? resolveSceneSound(audio, source, previous, previousChapter)
        : { url: "", volume: 0.35, crossfade: 1.8 };
  return {
    url: inherited.url,
    volume: audio.scenes?.[chapter] ? config.volume : inherited.volume,
    crossfade: config.crossfade,
  };
}
