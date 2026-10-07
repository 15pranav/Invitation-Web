"use client";
import { useEffect, useRef, useState, FormEvent } from "react";
import { X, Check, MapPin } from "lucide-react";
import { EventContent } from "@/lib/content";
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="guest-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-content">
        <button
          className="icon-button close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X />
        </button>
        <p className="eyebrow">THE GUPTA FAMILY INVITES YOU</p>
        <h2>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
export function RSVP({
  content,
  onClose,
  preview = false,
}: {
  content: EventContent;
  onClose: () => void;
  preview?: boolean;
}) {
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [attendance, setAttendance] = useState("yes");
  const id = useRef("");
  useEffect(() => {
    id.current = crypto.randomUUID();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview) {
      setStatus(
        "This is a draft preview. Open the live invitation to submit a response.",
      );
      return;
    }
    setBusy(true);
    setStatus("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id.current,
          name: f.get("name"),
          attendance,
          guests: Number(f.get("guests") || 1),
          website: f.get("website"),
        }),
      });
      const d = (await r.json()) as { error: string };
      if (!r.ok) throw new Error(d.error);
      setDone(true);
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : "Unable to send. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={done ? "Thank you, with love." : "Will you join us?"}
      onClose={onClose}
    >
      {done ? (
        <div className="rsvp-success">
          <Check size={32} />
          <p>Your response has been received by the family.</p>
          <button className="primary" onClick={onClose}>
            Return to the celebration
          </button>
        </div>
      ) : (
        <>
          <p className="quiet">{content.rsvp.message}</p>
          <form className="rsvp-form" onSubmit={submit}>
            <label>
              Your name
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                placeholder="Guest or family name"
              />
            </label>
            <label>
              Will you be attending?
              <select
                value={attendance}
                onChange={(e) => setAttendance(e.target.value)}
              >
                <option value="yes">Joyfully attending</option>
                <option value="maybe">Still deciding</option>
                <option value="no">Sending our blessings</option>
              </select>
            </label>
            {attendance !== "no" && (
              <label>
                Number of guests, including you
                <input
                  name="guests"
                  type="number"
                  min={1}
                  max={content.rsvp.maxGuests}
                  defaultValue={1}
                  required
                />
              </label>
            )}
            <label className="honeypot" aria-hidden="true">
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <p role="alert" className="form-error">
              {status}
            </p>
            <button className="primary" disabled={busy}>
              {busy ? "Sending your response…" : "Send RSVP"}
            </button>
            <p className="privacy-note">
              Your response is visible only to the family’s administrator.
            </p>
          </form>
        </>
      )}
    </Dialog>
  );
}
export function MemoryDialog({
  item,
  onClose,
}: {
  item: EventContent["media"][number];
  onClose: () => void;
}) {
  return (
    <Dialog title={item.title} onClose={onClose}>
      {item.type === "video" ? (
        <video src={item.url} controls playsInline preload="metadata" />
      ) : (
        <img src={item.url} alt={item.title} />
      )}
      <p className="quiet">{item.caption}</p>
    </Dialog>
  );
}
