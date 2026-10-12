import type { AudioPlan } from "./scene-audio";
type Voice = {
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  retire?: ReturnType<typeof setTimeout>;
};
// A single owner for all media voices. At most two voices crossfade; rapid navigation
// retires the quieter one before opening a replacement. No assets load before consent.
export class AudioDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private duck: GainNode | null = null;
  private voices = new Map<string, Voice>();
  private prepared: { url: string; audio: HTMLAudioElement } | null = null;
  private positions = new Map<string, number>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private plan: AudioPlan = { url: "", volume: 0.35, crossfade: 1.8 };
  private enabled = false;
  private thinning = false;
  private generation = 0;
  private intentVersion = 0;
  private disposed = false;
  private foreground = new Set<OscillatorNode>();
  // One-shot gesture retry: iOS/Safari refuse play() outside a user gesture
  // (a scroll event is not one), so a scroll-driven scene change must not
  // strand the previous soundtrack. We retire it anyway and retry the new
  // voice on the next tap/key.
  private retryPlay: (() => void) | null = null;
  private retryArmed = false;
  constructor(
    private onError: (message: string) => void,
    private createContext = () => new AudioContext(),
    private createAudio = (_url: string) => new Audio(),
  ) {}
  private later(fn: () => void, ms: number) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
    return t;
  }
  private ramp(param: AudioParam, value: number, seconds: number) {
    const c = this.context!;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(c.currentTime);
    else {
      param.cancelScheduledValues(c.currentTime);
      param.setValueAtTime(param.value, c.currentTime);
    }
    param.linearRampToValueAtTime(
      value,
      c.currentTime + Math.max(0.02, seconds),
    );
  }
  private init() {
    if (this.context) return;
    const c = this.createContext();
    this.context = c;
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.master.connect(c.destination);
    this.duck = c.createGain();
    this.duck.connect(this.master);
    this.music = c.createGain();
    this.filter = c.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = this.thinning ? 1400 : 20000;
    this.music.gain.value = this.thinning ? 0.42 : 1;
    this.music.connect(this.filter);
    this.filter.connect(this.duck);
  }
  private armGestureRetry() {
  if (this.retryArmed || typeof document === "undefined") return;

  this.retryArmed = true;

  const fire = () => {
    this.onError("");
    this.retryArmed = false;

    const retry = this.retryPlay;
    if (!retry) return;

    retry();

    document.removeEventListener("click", fire);
    document.removeEventListener("keydown", fire);
  };

  document.addEventListener("click", fire, {
    once: true,
  });

  document.addEventListener("keydown", fire, {
    once: true,
  });
}
  setEnabled(enabled: boolean) {
    if (this.disposed) return;
    this.enabled = enabled;
    this.intentVersion++;
    this.generation++;
    if (enabled) {
      try {
        this.init();
        void this.context!.resume().catch(() =>
          this.onError("Tap Sound On to allow audio in this browser."),
        );
        this.ramp(this.master!.gain, 1, 0.12);
        void this.transition(this.generation);
      } catch {
        this.onError(
          "Sound is unavailable in this browser. You can still enjoy the invitation.",
        );
      }
    } else if (this.context) {
      this.prepare("");
      this.ramp(this.master!.gain, 0, 0.08);
      const token = this.intentVersion;
      this.later(() => {
        if (token === this.intentVersion && !this.enabled)
          this.voices.forEach((v) => v.audio.pause());
      }, 100);
    }
  }
  setScene(plan: AudioPlan) {
    this.plan = plan;
    const token = ++this.generation;
    if (this.enabled) void this.transition(token);
  }
  private release(url: string) {
    const v = this.voices.get(url);
    if (!v) return;
    if (v.retire) {
      clearTimeout(v.retire);
      this.timers.delete(v.retire);
    }
    this.positions.delete(url);
    this.positions.set(url, v.audio.currentTime || 0);
    while (this.positions.size > 32)
      this.positions.delete(this.positions.keys().next().value!);
    v.audio.pause();
    v.audio.onloadedmetadata = null;
    v.audio.onerror = null;
    v.audio.removeAttribute("src");
    v.audio.load();
    v.audio.remove?.();
    v.source.disconnect();
    v.gain.disconnect();
    this.voices.delete(url);
  }
  private retire(url: string, seconds: number) {
    const v = this.voices.get(url);
    if (!v) return;
    if (v.retire) {
      clearTimeout(v.retire);
      this.timers.delete(v.retire);
    }
    this.ramp(v.gain.gain, 0, seconds);
    v.retire = this.later(() => this.release(url), seconds * 1000 + 30);
  }
  private async transition(token: number) {
    if (!this.context || !this.enabled || this.disposed) return;
    const plan = { ...this.plan };
    this.onError("");
    let voice = this.voices.get(plan.url);
    if (plan.url && !voice && this.voices.size >= 2) {
      const quiet = [...this.voices].sort(
        (a, b) => a[1].gain.gain.value - b[1].gain.gain.value,
      )[0];
      this.retire(quiet[0], 0.09);
      await new Promise<void>((resolve) => this.later(resolve, 125));
      if (token !== this.generation || !this.enabled || this.disposed) return;
      voice = this.voices.get(plan.url);
    }
    if (plan.url && !voice) {
      const audio =
        this.prepared?.url === plan.url
          ? this.prepared.audio
          : this.createAudio(plan.url);
      if (this.prepared?.audio === audio) this.prepared = null;
      audio.crossOrigin = "anonymous";
      audio.loop = true;
      audio.preload = "none";
      audio.src = plan.url;
      if (typeof document !== "undefined") {
        audio.hidden = true;
        audio.setAttribute("aria-hidden", "true");
        audio.dataset.sceneSoundtrack = "";
        document.body.appendChild(audio);
      }
      const source = this.context.createMediaElementSource(audio),
        gain = this.context.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(this.music!);
      voice = { audio, source, gain };
      this.voices.set(plan.url, voice);
      const saved = this.positions.get(plan.url) || 0;
      audio.onloadedmetadata = () => {
        if (saved && Number.isFinite(audio.duration))
          audio.currentTime = Math.min(
            saved,
            Math.max(0, audio.duration - 0.1),
          );
      };
      if (audio.readyState >= 1)
        audio.onloadedmetadata?.(new Event("loadedmetadata"));
      audio.onerror = () => {
        if (this.plan.url === plan.url)
          this.onError(
            "This recording could not be played. Please check the audio file or its hosting permissions.",
          );
      };
    }
    if (voice) {
      if (voice.retire) {
        clearTimeout(voice.retire);
        this.timers.delete(voice.retire);
        voice.retire = undefined;
      }
      try {
        await voice.audio.play();
        if (voice.audio.paused) throw new Error("paused");
        this.retryPlay = null;
      } catch {
        // Not a fatal path: the scene has still changed. Retire the previous
        // soundtrack and bring this voice in as soon as a gesture allows it.
        if (token === this.generation && this.enabled && !this.disposed) {
          this.onError("Tap once to continue the music 🎵");
          this.retryPlay = () => {
            if (this.disposed || !this.enabled || !this.context) return;
            void this.context.resume().catch(() => {});
            const v = this.voices.get(this.plan.url);
            if (!v) return;
            void v.audio
              .play()
              .then(() => {
                if (!this.disposed && this.enabled)
                  this.ramp(v.gain.gain, this.plan.volume, this.plan.crossfade);
              })
              .catch(() => {});
          };
          this.armGestureRetry();
        }
      }
      if (token !== this.generation || !this.enabled || this.disposed) {
        if (!this.enabled) voice.audio.pause();
        return;
      }
      this.ramp(voice.gain.gain, plan.volume, plan.crossfade);
    }
    if (token !== this.generation) return;
    for (const [url] of this.voices)
      if (url !== plan.url) this.retire(url, plan.crossfade);
  }
  prepare(url: string) {
    if (this.prepared?.url === url) return;
    if (this.prepared) {
      const a = this.prepared.audio;
      a.pause();
      a.removeAttribute("src");
      a.load();
      a.remove?.();
      this.prepared = null;
    }
    if (!url || !this.context || !this.enabled || this.voices.has(url)) return;
    const audio = this.createAudio(url);
    audio.crossOrigin = "anonymous";
    audio.preload = "metadata";
    audio.src = url;
    if (typeof document !== "undefined") {
      audio.hidden = true;
      audio.setAttribute("aria-hidden", "true");
      audio.dataset.scenePreload = "";
      document.body.appendChild(audio);
    }
    this.prepared = { url, audio };
  }
  thin(active: boolean, seconds = 1.2) {
    this.thinning = active;
    if (!this.context) return;
    this.ramp(this.music!.gain, active ? 0.42 : 1, seconds);
    this.ramp(this.filter!.frequency, active ? 1400 : 20000, seconds);
  }
  bell() {
    if (!this.enabled || !this.context) return;
    const c = this.context;
    const t = c.currentTime;
    const duck = this.duck!.gain;
    this.ramp(duck, 0.18, 0.08);
    duck.setValueAtTime(0.18, t + 1.8);
    duck.linearRampToValueAtTime(1, t + 3.4);
    for (const old of this.foreground) {
      try {
        old.stop();
      } catch {}
    }
    this.foreground.clear();
    [660, 1321, 1852, 2748].forEach((f, i) => {
      const osc = c.createOscillator(),
        gain = c.createGain();
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.13 / (i + 1), t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.9);
      osc.connect(gain);
      gain.connect(this.master!);
      this.foreground.add(osc);
      osc.onended = () => {
        this.foreground.delete(osc);
        osc.disconnect();
        gain.disconnect();
      };
      osc.start();
      osc.stop(t + 3);
    });
  }
  dispose() {
    this.prepare("");
    this.disposed = true;
    this.enabled = false;
    this.retryPlay = null;
    this.generation++;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    for (const url of this.voices.keys()) this.release(url);
    for (const o of this.foreground) {
      try {
        o.stop();
      } catch {}
    }
    this.foreground.clear();
    if (this.context && this.context.state !== "closed")
      void this.context.close().catch(() => {});
    this.context = null;
  }
}
