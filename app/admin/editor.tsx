"use client";
import { useEffect, useRef, useState } from "react";
import { EventContent, seed } from "@/lib/content";
import CardEditor from "./card-editor";
import { deckEntries } from "@/lib/deck-content";
import SceneAudioEditor from "./scene-audio-editor";
import { sceneSound, type AudioChapter } from "@/lib/scene-audio";
import { uploadMedia } from "@/lib/media-client";
import { readJSON } from "@/lib/http-client";
import { defaultPolicy, MediaPolicy, MB } from "@/lib/media-policy";
import {
  Copy,
  Save,
  Eye,
  Upload,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  CalendarDays,
  Music2,
  Images,
  SlidersHorizontal,
  Users,
  LayoutList,
  LogOut,
  Check,
  Loader2,
} from "lucide-react";
type Guest = {
  id: string;
  name: string;
  attendance: string;
  guests: number;
  created_at: string;
};
const tabs = [
  { id: "event", label: "Event & family", icon: CalendarDays },
  { id: "programme", label: "Programme", icon: LayoutList },
  { id: "cards", label: "Ceremonial cards", icon: Copy },
  { id: "bhajans", label: "Bhajans & sound", icon: Music2 },
  { id: "media", label: "Memories & media", icon: Images },
  { id: "features", label: "Experience settings", icon: SlidersHorizontal },
  { id: "guests", label: "Guest responses", icon: Users },
];
function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <label className="admin-field">
      {label}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export default function Editor({ name }: { name: string }) {
  const [data, setData] = useState<EventContent>(seed),
    [revision, setRevision] = useState(0),
    [tab, setTab] = useState("event"),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [published, setPublished] = useState<string | null>(null),
    [guests, setGuests] = useState<Guest[]>([]),
    [counts, setCounts] = useState({
      responses: 0,
      confirmedGuests: 0,
      tentativeGuests: 0,
    }),
    [uploading, setUploading] = useState(false),
    [uploadProgress, setUploadProgress] = useState(0),
    [policy, setPolicy] = useState<MediaPolicy>(defaultPolicy);
  const uploadAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    fetch("/api/admin/upload")
      .then((r) => readJSON<{ limits: MediaPolicy }>(r))
      .then((d) => setPolicy(d.limits))
      .catch(() => {});
    return () => uploadAbort.current?.abort();
  }, []);
  async function load() {
    setError("");
    try {
      const r = await fetch("/api/admin/content");
      const d = (await readJSON(r)) as {
        error: string;
        content: EventContent;
        revision: number;
        publishedAt: string | null;
      };
      if (!r.ok) throw new Error(d.error);
      setData(d.content);
      setRevision(d.revision);
      setPublished(d.publishedAt);
      setLoaded(true);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load content");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => {
      if (dirty || uploading) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [dirty, uploading]);
  function change(update: Partial<EventContent>) {
    setData((d) => {
      const next = { ...d, ...update };
      if (
        !update.deck &&
        d.deck.autoInclude &&
        (update.programme || update.bhajans)
      ) {
        const oldEntries = deckEntries(d),
          before = new Set(oldEntries.map((c) => c.id));
        const entries = deckEntries(next);
        if (entries.some((c) => !before.has(c.id)))
          next.deck = {
            ...d.deck,
            cards: entries.map((c, i) =>
              before.has(c.id)
                ? c
                : {
                    ...c,
                    theme: (
                      [
                        "wine",
                        "olive",
                        "charcoal",
                        "bronze",
                        "maroon",
                        "ivory",
                      ] as const
                    )[i % 6],
                  },
            ),
          };
      }
      return next;
    });
    setDirty(true);
    setMessage("");
  }
  async function save(publish = false) {
    if (!loaded) return false;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: data, revision, publish }),
      });
      const d = (await readJSON(r)) as {
        error: string;
        revision: number;
        publishedAt: string | null;
      };
      if (!r.ok) throw new Error(d.error);
      setRevision(d.revision);
      if (d.publishedAt) setPublished(d.publishedAt);
      setDirty(false);
      setMessage(
        publish
          ? "Your invitation is now published."
          : "Draft saved. The live invitation is unchanged.",
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function responses() {
    setError("");
    try {
      const r = await fetch("/api/admin/rsvps");
      const d = (await readJSON(r)) as {
        error: string;
        rows: Guest[];
        counts: typeof counts;
      };
      if (!r.ok) throw new Error(d.error);
      setGuests(d.rows);
      setCounts(d.counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load responses");
    }
  }
  useEffect(() => {
    if (tab === "guests") void responses();
  }, [tab]);
  function reorder(
    key: "programme" | "bhajans" | "media",
    index: number,
    dir: number,
  ) {
    const a = [...data[key]];
    if (index + dir < 0 || index + dir >= a.length) return;
    [a[index], a[index + dir]] = [a[index + dir], a[index]];
    change({ [key]: a });
  }
  function controls(key: "programme" | "bhajans" | "media", index: number) {
    return (
      <div className="item-controls">
        <button
          aria-label="Move earlier"
          disabled={index === 0}
          onClick={() => reorder(key, index, -1)}
        >
          <ChevronUp size={17} />
        </button>
        <button
          aria-label="Move later"
          disabled={index === data[key].length - 1}
          onClick={() => reorder(key, index, 1)}
        >
          <ChevronDown size={17} />
        </button>
        <button
          aria-label="Delete item"
          onClick={() =>
            change({ [key]: data[key].filter((_, i) => i !== index) })
          }
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }
  async function upload(
    file: File | null,
    target?: "jagran" | "birthday" | `scene:${AudioChapter}`,
    bhajanIndex?: number,
  ) {
    if (!file) return;
    if (uploading) return;
    setUploading(true);
    setUploadProgress(0);
    setError("");
    const controller = new AbortController();
    uploadAbort.current = controller;
    const bhajanId =
      bhajanIndex !== undefined ? data.bhajans[bhajanIndex]?.id : undefined;
    try {
      const d = await uploadMedia(
        file,
        policy,
        setUploadProgress,
        controller.signal,
        target || bhajanId ? "audio" : undefined,
      );
      // Functional updates preserve edits made while bytes are transferring.
      setData((current) =>
        target
          ? target.startsWith("scene:")
            ? {
                ...current,
                audio: {
                  ...current.audio,
                  scenes: {
                    ...current.audio.scenes,
                    [target.slice(6)]: {
                      ...sceneSound(
                        current.audio,
                        target.slice(6) as AudioChapter,
                      ),
                      url: d.url,
                      enabled: true,
                      continuePrevious: false,
                    },
                  },
                },
              }
            : { ...current, audio: { ...current.audio, [target]: d.url } }
          : bhajanId
            ? {
                ...current,
                bhajans: current.bhajans.map((b) =>
                  b.id === bhajanId ? { ...b, url: d.url } : b,
                ),
              }
            : {
                ...current,
                media: [
                  ...current.media,
                  {
                    id: crypto.randomUUID(),
                    title: file.name.replace(/\.[^.]+$/, ""),
                    caption: "",
                    url: d.url,
                    type: d.type,
                    category: "memory",
                  },
                ],
              },
      );
      setDirty(true);
      setMessage(
        "Uploaded. Save a draft or publish to add it to the invitation.",
      );
    } catch (e) {
      setError(
        e instanceof Error && e.name === "AbortError"
          ? "Upload cancelled. Your existing recordings are unchanged."
          : e instanceof Error
            ? e.message
            : "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }
  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/" className="admin-brand">
          CG<span>THE FAMILY STUDIO</span>
        </a>
        <div className="admin-sidebar-title">
          A little care.
          <br />
          <em>A beautiful celebration.</em>
        </div>
        <nav>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={18} strokeWidth={1.5} />
              {t.label}
              {t.id === "guests" && <small>{counts.responses}</small>}
            </button>
          ))}
        </nav>
        <div className="admin-account">
          <span>{name}</span>
          <a href="/signout-with-chatgpt?return_to=/admin" target="_top">
            <LogOut size={14} />
            Sign out
          </a>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">
              {data.child.toUpperCase()} · A NIGHT OF BLESSINGS
            </p>
            <h1>{tabs.find((t) => t.id === tab)?.label}</h1>
          </div>
          <div className="admin-actions">
            <span className={"save-state " + (dirty ? "unsaved" : "")}>
              {dirty ? "Unsaved changes" : published ? "Published" : "Draft"}
            </span>
            <button
              disabled={!loaded || busy || uploading}
              onClick={async () => {
                if (await save(false)) window.location.assign("/preview");
              }}
            >
              <Eye size={16} />
              Preview
            </button>
            <button
              disabled={!loaded || busy || uploading}
              onClick={() => save(false)}
            >
              <Save size={16} />
              Save draft
            </button>
            <button
              className="publish-button"
              disabled={!loaded || busy || uploading}
              onClick={() => save(true)}
            >
              {busy ? <Loader2 size={16} /> : <Upload size={16} />}Publish
            </button>
          </div>
        </header>
        <div className="admin-body">
          {error && (
            <div className="admin-error" role="alert">
              {error}
              {!loaded && <button onClick={load}>Try again</button>}
            </div>
          )}
          {message && (
            <div className="admin-message" role="status">
              <Check size={16} />
              {message}
            </div>
          )}
          {uploading && (
            <div className="upload-progress" role="status" aria-live="polite">
              <span>
                {uploadProgress === 0
                  ? "Preparing your file…"
                  : uploadProgress >= 99
                    ? "Verifying your recording…"
                    : `Uploading · ${uploadProgress}%`}
              </span>
              <progress
                value={uploadProgress}
                max={100}
                aria-label="Upload progress"
              />
              <button
                type="button"
                onClick={() => uploadAbort.current?.abort()}
              >
                Cancel upload
              </button>
            </div>
          )}
          {!loaded ? (
            <p className="quiet">
              {error
                ? "Your content could not be loaded."
                : "Opening the family studio…"}
            </p>
          ) : (
            <>
              {tab === "event" && (
                <>
                  <section className="editor-section">
                    <div className="section-intro">
                      <h2>The celebration</h2>
                      <p>
                        The details your guests will see throughout the
                        experience.
                      </p>
                    </div>
                    <div className="field-grid">
                      <Field
                        label="Child’s name"
                        value={data.child}
                        onChange={(child) => change({ child })}
                      />
                      <Field
                        label="Celebration date"
                        value={data.date}
                        type="date"
                        onChange={(date) => change({ date })}
                      />
                      <Field
                        label="Venue"
                        value={data.venue}
                        onChange={(venue) => change({ venue })}
                      />
                      <Field
                        label="Google Maps link"
                        value={data.maps}
                        onChange={(maps) => change({ maps })}
                      />
                      <Field
                        label="Family contact"
                        value={data.contacts}
                        onChange={(contacts) => change({ contacts })}
                      />
                      <Field
                        label="Singer / mandali"
                        value={data.mandali}
                        onChange={(mandali) => change({ mandali })}
                      />
                    </div>
                  </section>
                  <section className="editor-section">
                    <div className="section-intro">
                      <h2>A personal invitation</h2>
                      <p>Hindi and English are both supported.</p>
                    </div>
                    <Field
                      label="Opening invitation"
                      value={data.invitation}
                      multiline
                      onChange={(invitation) => change({ invitation })}
                    />
                    <Field
                      label="Closing invitation"
                      value={data.closing}
                      multiline
                      onChange={(closing) => change({ closing })}
                    />
                  </section>
                  <section className="editor-section">
                    <div className="section-intro">
                      <h2>With love, the family</h2>
                      <p>
                        Names transcribed from your reference invitation. Edit
                        spelling here.
                      </p>
                    </div>
                    {data.hosts.map((host, i) => (
                      <div className="host-row" key={i}>
                        <Field
                          label="Name"
                          value={host.name}
                          onChange={(name) =>
                            change({
                              hosts: data.hosts.map((h, j) =>
                                i === j ? { ...h, name } : h,
                              ),
                            })
                          }
                        />
                        <Field
                          label="Relation"
                          value={host.role}
                          onChange={(role) =>
                            change({
                              hosts: data.hosts.map((h, j) =>
                                i === j ? { ...h, role } : h,
                              ),
                            })
                          }
                        />
                        <button
                          className="delete-button"
                          aria-label="Remove family member"
                          onClick={() =>
                            change({
                              hosts: data.hosts.filter((_, j) => i !== j),
                            })
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                    <button
                      className="add-button"
                      onClick={() =>
                        change({
                          hosts: [...data.hosts, { name: "", role: "" }],
                        })
                      }
                    >
                      <Plus size={16} />
                      Add family member
                    </button>
                  </section>
                </>
              )}
              {tab === "cards" && (
                <CardEditor
                  content={data}
                  onChange={(deck) => change({ deck })}
                />
              )}
              {tab === "programme" && (
                <>
                  <div className="section-intro">
                    <h2>The night, in moments</h2>
                    <p>
                      Each Jagran item becomes a ceremonial card. Birthday items
                      appear in the birthday world. Use 00:00 PM, 00:00 AM or
                      TBD until a time is confirmed.
                    </p>
                  </div>
                  {data.programme.map((p, i) => (
                    <section className="editor-item" key={p.id}>
                      <div className="editor-item-head">
                        <span>
                          {String(i + 1).padStart(2, "0")} · {p.title}
                        </span>
                        {controls("programme", i)}
                      </div>
                      <div className="field-grid">
                        <Field
                          label="Title"
                          value={p.title}
                          onChange={(title) =>
                            change({
                              programme: data.programme.map((x, j) =>
                                i === j ? { ...x, title } : x,
                              ),
                            })
                          }
                        />
                        <Field
                          label="Hindi title"
                          value={p.hindi}
                          onChange={(hindi) =>
                            change({
                              programme: data.programme.map((x, j) =>
                                i === j ? { ...x, hindi } : x,
                              ),
                            })
                          }
                        />
                        <Field
                          label="Time"
                          value={p.time}
                          onChange={(time) =>
                            change({
                              programme: data.programme.map((x, j) =>
                                i === j ? { ...x, time } : x,
                              ),
                            })
                          }
                        />
                        <label className="admin-field">
                          Ceremony type
                          <select
                            value={p.kind}
                            onChange={(e) =>
                              change({
                                programme: data.programme.map((x, j) =>
                                  i === j
                                    ? {
                                        ...x,
                                        kind: e.target.value as typeof p.kind,
                                      }
                                    : x,
                                ),
                              })
                            }
                          >
                            {[
                              "jyoti",
                              "bhajan",
                              "katha",
                              "aarti",
                              "dinner",
                              "birthday",
                              "venue",
                            ].map((k) => (
                              <option key={k}>{k}</option>
                            ))}
                          </select>
                        </label>
                        <label className="admin-field">
                          Experience world
                          <select
                            value={p.world}
                            onChange={(e) =>
                              change({
                                programme: data.programme.map((x, j) =>
                                  i === j
                                    ? {
                                        ...x,
                                        world: e.target.value as typeof p.world,
                                      }
                                    : x,
                                ),
                              })
                            }
                          >
                            <option value="jagran">Jagran</option>
                            <option value="birthday">Birthday</option>
                          </select>
                        </label>
                      </div>
                      <Field
                        label="Description"
                        value={p.description}
                        multiline
                        onChange={(description) =>
                          change({
                            programme: data.programme.map((x, j) =>
                              i === j ? { ...x, description } : x,
                            ),
                          })
                        }
                      />
                    </section>
                  ))}
                  <button
                    className="add-button"
                    onClick={() =>
                      change({
                        programme: [
                          ...data.programme,
                          {
                            id: crypto.randomUUID(),
                            title: "New ceremony",
                            hindi: "",
                            time: "TBD",
                            kind: "bhajan",
                            world: "jagran",
                            description: "",
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={16} />
                    Add programme item
                  </button>
                </>
              )}
              {tab === "bhajans" && (
                <>
                  <section className="editor-section">
                    <div className="section-intro">
                      <h2>The sound of the evening</h2>
                      <p>
                        MP3, M4A, WAV or OGG · Maximum {policy.audio / MB} MB
                        per recording.
                      </p>
                      <p>
                        Music begins only after a guest’s interaction. Uploaded
                        tracks crossfade between worlds. Without a recording, a
                        scene remains intentionally quiet.
                      </p>
                    </div>
                    {(["jagran", "birthday"] as const).map((world) => (
                      <div className="audio-upload" key={world}>
                        <Field
                          label={
                            world === "jagran"
                              ? "Jagran background music"
                              : "Birthday background music"
                          }
                          value={data.audio[world]}
                          onChange={(url) =>
                            change({ audio: { ...data.audio, [world]: url } })
                          }
                        />
                        <label className="upload-button">
                          <Upload size={15} />
                          Upload recording
                          <input
                            type="file"
                            accept=".mp3,.m4a,.wav,.ogg,audio/mpeg,audio/mp4,audio/wav,audio/ogg"
                            disabled={uploading}
                            onChange={(e) => {
                              void upload(e.target.files?.[0] || null, world);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {data.audio[world] && (
                          <audio
                            className="admin-audio-preview"
                            aria-label={`${world} recording preview`}
                            controls
                            preload="metadata"
                            src={data.audio[world]}
                          />
                        )}
                      </div>
                    ))}
                  </section>
                  <div className="section-intro">
                    <SceneAudioEditor
                      audio={data.audio}
                      media={data.media}
                      bhajans={data.bhajans}
                      onChange={(audio) => change({ audio })}
                      onUpload={(file, scene) =>
                        void upload(file, `scene:${scene}`)
                      }
                      uploading={uploading}
                      maxMB={policy.audio / MB}
                    />
                    <h2>Bhajans of the night</h2>
                    <p>
                      Add only recordings you have permission to share. Every
                      entry also creates a card.
                    </p>
                  </div>
                  {data.bhajans.map((b, i) => (
                    <section className="editor-item" key={b.id}>
                      <div className="editor-item-head">
                        <span>
                          {String(i + 1).padStart(2, "0")} · {b.title}
                        </span>
                        {controls("bhajans", i)}
                      </div>
                      <div className="field-grid">
                        <Field
                          label="Bhajan title"
                          value={b.title}
                          onChange={(title) =>
                            change({
                              bhajans: data.bhajans.map((x, j) =>
                                i === j ? { ...x, title } : x,
                              ),
                            })
                          }
                        />
                        <Field
                          label="Singer / mandali"
                          value={b.singer}
                          onChange={(singer) =>
                            change({
                              bhajans: data.bhajans.map((x, j) =>
                                i === j ? { ...x, singer } : x,
                              ),
                            })
                          }
                        />
                      </div>
                      <Field
                        label="Description"
                        value={b.description}
                        onChange={(description) =>
                          change({
                            bhajans: data.bhajans.map((x, j) =>
                              i === j ? { ...x, description } : x,
                            ),
                          })
                        }
                      />
                      <Field
                        label="Audio URL (optional until ready)"
                        value={b.url}
                        onChange={(url) =>
                          change({
                            bhajans: data.bhajans.map((x, j) =>
                              i === j ? { ...x, url } : x,
                            ),
                          })
                        }
                      />
                      <label className="upload-button">
                        <Upload size={15} />
                        Upload bhajan
                        <input
                          type="file"
                          accept=".mp3,.m4a,.wav,.ogg,audio/mpeg,audio/mp4,audio/wav,audio/ogg"
                          disabled={uploading}
                          onChange={(e) => {
                            void upload(
                              e.target.files?.[0] || null,
                              undefined,
                              i,
                            );
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {b.url && (
                        <audio
                          className="admin-audio-preview"
                          aria-label={`${b.title} preview`}
                          controls
                          preload="metadata"
                          src={b.url}
                        />
                      )}
                    </section>
                  ))}
                  <button
                    className="add-button"
                    onClick={() =>
                      change({
                        bhajans: [
                          ...data.bhajans,
                          {
                            id: crypto.randomUUID(),
                            title: "New bhajan",
                            singer: "TBD",
                            url: "",
                            description: "",
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={16} />
                    Add bhajan
                  </button>
                </>
              )}
              {tab === "media" && (
                <>
                  <div className="section-intro">
                    <h2>A growing collection of little joys</h2>
                    <p>
                      Upload child photos, family pictures or videos. Reorder
                      them to shape the memory journey. A clearly marked
                      placeholder appears until you publish your first memory.
                    </p>
                  </div>
                  <label className="upload-drop">
                    <Upload size={27} strokeWidth={1} />
                    <strong>
                      {uploading
                        ? "Uploading your memory…"
                        : "Choose a photo, video or recording"}
                    </strong>
                    <span>
                      Photos: {policy.image / MB} MB · Audio:{" "}
                      {policy.audio / MB} MB · Video: {policy.video / MB} MB
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/*"
                      disabled={uploading}
                      onChange={(e) => {
                        void upload(e.target.files?.[0] || null);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {data.media.map((m, i) => (
                    <section className="editor-item media-item" key={m.id}>
                      <div className="editor-item-head">
                        <span>
                          {String(i + 1).padStart(2, "0")} · {m.type}
                        </span>
                        {controls("media", i)}
                      </div>
                      <div className="media-edit-grid">
                        {m.type === "image" ? (
                          <img src={m.url} alt={m.title} />
                        ) : m.type === "video" ? (
                          <video src={m.url} controls preload="metadata" />
                        ) : (
                          <span className="media-audio-label">
                            <Music2 />
                            Audio recording
                          </span>
                        )}
                        <div>
                          <Field
                            label="Title / accessible description"
                            value={m.title}
                            onChange={(title) =>
                              change({
                                media: data.media.map((x, j) =>
                                  i === j ? { ...x, title } : x,
                                ),
                              })
                            }
                          />
                          <Field
                            label="Caption"
                            value={m.caption}
                            onChange={(caption) =>
                              change({
                                media: data.media.map((x, j) =>
                                  i === j ? { ...x, caption } : x,
                                ),
                              })
                            }
                          />
                          <label className="admin-field">
                            Collection
                            <select
                              value={m.category}
                              onChange={(e) =>
                                change({
                                  media: data.media.map((x, j) =>
                                    i === j
                                      ? {
                                          ...x,
                                          category: e.target
                                            .value as typeof m.category,
                                        }
                                      : x,
                                  ),
                                })
                              }
                            >
                              {[
                                "child",
                                "family",
                                "memory",
                                "jagran",
                                "birthday",
                              ].map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                            </select>
                          </label>
                          {m.type === "audio" && (
                            <div className="audio-assign">
                              <button
                                onClick={() =>
                                  change({
                                    audio: { ...data.audio, jagran: m.url },
                                  })
                                }
                              >
                                Use for Jagran
                              </button>
                              <button
                                onClick={() =>
                                  change({
                                    audio: { ...data.audio, birthday: m.url },
                                  })
                                }
                              >
                                Use for birthday
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  ))}
                </>
              )}
              {tab === "features" && (
                <>
                  <section className="editor-section">
                    <div className="section-intro">
                      <h2>Make the experience yours</h2>
                      <p>
                        Hidden features disappear from both the journey and the
                        chapter menu.
                      </p>
                    </div>
                    {Object.entries(data.features).map(([key, value]) => (
                      <label className="feature-row" key={key}>
                        <span>
                          <strong>
                            {
                              (
                                {
                                  gallery: "Memory gallery",
                                  countdown: "Celebration countdown",
                                  flowers: "Flower offering",
                                  bhajans: "Bhajan experience",
                                  rsvp: "RSVP invitation",
                                  birthday: "Birthday world",
                                  sound: "Audio experience",
                                } as Record<string, string>
                              )[key]
                            }
                          </strong>
                        </span>
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) =>
                            change({
                              features: {
                                ...data.features,
                                [key]: e.target.checked,
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </section>
                  <section className="editor-section">
                    <div className="section-intro">
                      <h2>RSVP preferences</h2>
                    </div>
                    <label className="feature-row">
                      <span>Accept new responses</span>
                      <input
                        type="checkbox"
                        checked={data.rsvp.enabled}
                        onChange={(e) =>
                          change({
                            rsvp: { ...data.rsvp, enabled: e.target.checked },
                          })
                        }
                      />
                    </label>
                    <Field
                      label="Maximum guests per response (1–30)"
                      value={String(data.rsvp.maxGuests)}
                      type="number"
                      onChange={(value) =>
                        change({
                          rsvp: { ...data.rsvp, maxGuests: Number(value) },
                        })
                      }
                    />
                    <Field
                      label="RSVP welcome message"
                      value={data.rsvp.message}
                      onChange={(message) =>
                        change({ rsvp: { ...data.rsvp, message } })
                      }
                    />
                  </section>
                </>
              )}
              {tab === "guests" && (
                <>
                  <div className="section-intro">
                    <h2>A place for everyone</h2>
                    <p>Guest names and responses are private to this studio.</p>
                  </div>
                  <div className="guest-counts">
                    <div>
                      <strong>{counts.responses}</strong>
                      <span>Responses</span>
                    </div>
                    <div>
                      <strong>{counts.confirmedGuests}</strong>
                      <span>Confirmed guests</span>
                    </div>
                    <div>
                      <strong>{counts.tentativeGuests}</strong>
                      <span>Tentative guests</span>
                    </div>
                  </div>
                  <button className="add-button" onClick={responses}>
                    Refresh responses
                  </button>
                  <div className="guest-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Guest / family</th>
                          <th>Attendance</th>
                          <th>Guests</th>
                          <th>Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guests.map((g) => (
                          <tr key={g.id}>
                            <td>{g.name}</td>
                            <td>
                              <span className={"attendance " + g.attendance}>
                                {g.attendance === "yes"
                                  ? "Attending"
                                  : g.attendance === "no"
                                    ? "Unable to attend"
                                    : "Maybe"}
                              </span>
                            </td>
                            <td>{g.guests}</td>
                            <td>
                              {new Date(g.created_at).toLocaleDateString(
                                "en-IN",
                                { timeZone: "Asia/Kolkata" },
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!guests.length && (
                      <p className="empty-responses">
                        When guests RSVP, their responses will appear here.
                      </p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          <footer className="studio-footer">
            {published
              ? "Last published " +
                new Date(published).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                }) +
                " IST"
              : "Your first publication is waiting."}
            <a href="/" target="_blank" rel="noopener noreferrer">
              Open live invitation
            </a>
          </footer>
        </div>
      </div>
    </main>
  );
}
