"use client";
import type { EventContent } from "@/lib/content";
import {
  audioChapters,
  audioLabels,
  sceneSound,
  type AudioChapter,
  type SceneSound,
} from "@/lib/scene-audio";
export default function SceneAudioEditor({
  audio,
  media,
  bhajans,
  onChange,
  onUpload,
  uploading,
  maxMB,
}: {
  audio: EventContent["audio"];
  media: EventContent["media"];
  bhajans: EventContent["bhajans"];
  onChange: (audio: EventContent["audio"]) => void;
  onUpload: (file: File, scene: AudioChapter) => void;
  uploading: boolean;
  maxMB: number;
}) {
  const choices = Array.from(
    new Map([
      ...media
        .filter((m) => m.type === "audio")
        .map((m) => [m.url, m.title] as const),
      ...bhajans.filter((b) => b.url).map((b) => [b.url, b.title] as const),
      ...[
        ["jagran", "Opening / Jagran recording"],
        ["birthday", "Birthday recording"],
      ]
        .filter(([k]) => audio[k as "jagran" | "birthday"])
        .map(
          ([k, label]) => [audio[k as "jagran" | "birthday"], label] as const,
        ),
    ]).entries(),
  );
  const patch = (scene: AudioChapter, value: Partial<SceneSound>) =>
    onChange({
      ...audio,
      scenes: {
        ...audio.scenes,
        [scene]: { ...sceneSound(audio, scene), ...value },
      },
    });
  return (
    <section className="editor-section scene-audio-editor">
      <h2>Chapter soundtracks</h2>
      <p>
        One continuous musical journey. Leave chapters on “Continue previous
        track” where appropriate. Final blessings is silent until you choose a
        closing recording or explicitly continue the current track.
      </p>
      {audioChapters.map((scene) => {
        const s = sceneSound(audio, scene);
        return (
          <details key={scene}>
            <summary>
              {audioLabels[scene]}
              <small>
                {!s.enabled
                  ? "Silent"
                  : s.continuePrevious
                    ? "Continues previous track"
                    : s.url
                      ? "Recording selected"
                      : "No recording selected"}
              </small>
            </summary>
            <label className="card-auto-toggle">
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={(e) => patch(scene, { enabled: e.target.checked })}
              />
              Enable chapter audio
            </label>
            <label className="card-auto-toggle">
              <input
                type="checkbox"
                checked={s.continuePrevious}
                onChange={(e) =>
                  patch(scene, { continuePrevious: e.target.checked })
                }
              />
              Continue previous scene’s track
            </label>
            <label className="admin-field">
              Choose existing recording
              <select
                aria-label={`${audioLabels[scene]} existing recording`}
                disabled={s.continuePrevious}
                value={choices.some(([url]) => url === s.url) ? s.url : ""}
                onChange={(e) =>
                  patch(scene, { url: e.target.value, continuePrevious: false })
                }
              >
                <option value="">Choose a recording / silence</option>
                {choices.map(([url, title]) => (
                  <option key={url} value={url}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              Soundtrack URL
              <input
                disabled={s.continuePrevious}
                value={s.url}
                placeholder="/api/media/… or HTTPS audio URL"
                onChange={(e) => patch(scene, { url: e.target.value })}
              />
            </label>
            <label className="upload-button">
              Upload {audioLabels[scene]} audio
              <input
                type="file"
                accept=".mp3,.m4a,.wav,.ogg,audio/mpeg,audio/mp4,audio/wav,audio/ogg"
                disabled={uploading}
                onChange={(e) => {
                  if (e.target.files?.[0]) onUpload(e.target.files[0], scene);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="card-editor-help">
              MP3, M4A, WAV or OGG · Maximum {maxMB} MB. Secure upload with the
              existing progress and cancel controls.
            </p>
            <div className="field-grid">
              <label className="admin-field">
                Base volume (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(s.volume * 100)}
                  onChange={(e) =>
                    patch(scene, {
                      volume:
                        Math.max(0, Math.min(100, Number(e.target.value))) /
                        100,
                    })
                  }
                />
              </label>
              <label className="admin-field">
                Crossfade (seconds)
                <input
                  type="number"
                  min="0.25"
                  max="8"
                  step="0.25"
                  value={s.crossfade}
                  onChange={(e) =>
                    patch(scene, {
                      crossfade: Math.max(
                        0.25,
                        Math.min(8, Number(e.target.value)),
                      ),
                    })
                  }
                />
              </label>
            </div>
            {s.url && !s.continuePrevious && (
              <audio
                controls
                preload="none"
                src={s.url}
                aria-label={`${audioLabels[scene]} audio preview`}
              />
            )}
            <button
              className="text-button"
              onClick={() => {
                const scenes = { ...audio.scenes };
                delete scenes[scene];
                onChange({ ...audio, scenes });
              }}
            >
              Reset chapter to default
            </button>
          </details>
        );
      })}
    </section>
  );
}
