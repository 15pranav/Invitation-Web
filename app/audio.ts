"use client";
import { useEffect, useRef, useState } from "react";
import { AudioDirector } from "@/lib/audio-director";
import {
  resolveSceneSound,
  type AudioChapter,
  type AudioPlan,
} from "@/lib/scene-audio";
import type { EventContent } from "@/lib/content";
export function useSound(
  audio: EventContent["audio"],
  chapter: string,
  enabled: boolean,
  selected: string | null,
  thinning: boolean,
) {
  const director = useRef<AudioDirector | null>(null),
    previous = useRef<AudioPlan>({ url: "", volume: 0.35, crossfade: 1.8 }),
    previousChapter = useRef<AudioChapter | undefined>(undefined),
    allowed = useRef(false),
    intent = useRef(false);
  const [playing, setPlaying] = useState(false),
    [error, setError] = useState("");
  function engine() {
    return (director.current ||= new AudioDirector(setError));
  }
  useEffect(() => {
    const plan = resolveSceneSound(
      audio,
      chapter as AudioChapter,
      previous.current,
      previousChapter.current,
    );
    if (selected) plan.url = selected;
    previous.current = plan;
    previousChapter.current = chapter as AudioChapter;
    engine().setScene(plan);
  }, [audio, chapter, selected]);
  useEffect(() => {
    engine().thin(thinning);
    engine().prepare(
      thinning
        ? resolveSceneSound(
            audio,
            "birthday",
            previous.current,
            previousChapter.current,
          ).url
        : "",
    );
  }, [thinning]);
  useEffect(() => {
    if (!enabled) {
      intent.current = false;
      setPlaying(false);
      director.current?.setEnabled(false);
    }
  }, [enabled]);
  useEffect(
    () => () => {
      director.current?.dispose();
      director.current = null;
    },
    [],
  );
  function activate(on: boolean) {
    allowed.current = true;
    intent.current = on;
    setPlaying(on);
    engine().setEnabled(enabled && on);
    try {
      sessionStorage.setItem("celebration-sound", on ? "on" : "off");
    } catch {}
  }
  function start() {
    if (!enabled) return;
    if (!allowed.current) {
      let stored: string | null = null;
      try {
        stored = sessionStorage.getItem("celebration-sound");
      } catch {}
      activate(stored !== "off");
    } else if (intent.current) engine().setEnabled(true);
  }
  function toggle() {
    if (enabled) activate(!intent.current);
  }
  function select() {
    if (enabled) activate(true);
  }
  return {
    playing,
    start,
    toggle,
    select,
    bell: () => director.current?.bell(),
    error,
  };
}
