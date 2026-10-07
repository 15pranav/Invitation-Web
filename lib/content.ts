import { z } from "zod";
const text = z.string().max(3000);
const url = z
  .string()
  .max(1500)
  .refine(
    (v) => !v || v.startsWith("/api/media/") || /^https:\/\//.test(v),
    "Use a secure HTTPS URL",
  );
export const itemSchema = z.object({
  id: z.string().min(1).max(80),
  title: text,
  hindi: text,
  time: z.string().max(40),
  description: text,
  kind: z.enum([
    "jyoti",
    "bhajan",
    "katha",
    "aarti",
    "dinner",
    "birthday",
    "venue",
  ]),
  world: z.enum(["jagran", "birthday"]),
});
export const cardSchema = z.object({
  id: z.string().min(1).max(180),
  source: z.enum(["programme", "bhajan", "event", "custom"]),
  sourceId: z.string().max(100).default(""),
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).max(1000).default(0),
  kind: itemSchema.shape.kind.optional(),
  icon: itemSchema.shape.kind.optional(),
  theme: z
    .enum(["wine", "maroon", "charcoal", "olive", "bronze", "ivory"])
    .optional(),
  title: z.string().max(120).optional(),
  subtitle: z.string().max(200).optional(),
  time: z.string().max(40).optional(),
  description: text.optional(),
  artwork: url.optional(),
  frontContent: z.string().max(180).optional(),
  backTitle: z.string().max(120).optional(),
  backContent: text.optional(),
});
export const contentSchema = z.object({
  child: z.string().min(1).max(100),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => !isNaN(Date.parse(v + "T12:00:00+05:30")), "Invalid date"),
  invitation: text,
  closing: text,
  venue: text,
  maps: url,
  contacts: z.string().max(500),
  hosts: z.array(z.object({ name: text, role: text })).max(20),
  mandali: text,
  programme: z.array(itemSchema).max(60),
  bhajans: z
    .array(
      z.object({
        id: z.string().max(80),
        title: text,
        singer: text,
        url,
        description: text,
      }),
    )
    .max(60),
  media: z
    .array(
      z.object({
        id: z.string().max(80),
        title: text,
        caption: text,
        url,
        type: z.enum(["image", "video", "audio"]),
        category: z.enum(["child", "family", "memory", "jagran", "birthday"]),
      }),
    )
    .max(100),
  features: z.object({
    gallery: z.boolean(),
    countdown: z.boolean(),
    flowers: z.boolean(),
    bhajans: z.boolean(),
    rsvp: z.boolean(),
    birthday: z.boolean(),
    sound: z.boolean(),
  }),
  rsvp: z.object({
    enabled: z.boolean(),
    maxGuests: z.number().int().min(1).max(30),
    message: text,
  }),
  audio: z.object({
    jagran: url,
    birthday: url,
    scenes: z
      .record(
        z.enum([
          "opening",
          "ganesh",
          "darbar",
          "deck",
          "bhajans",
          "birthday",
          "memories",
          "venue",
          "finale",
        ]),
        z.object({
          url,
          enabled: z.boolean(),
          continuePrevious: z.boolean(),
          volume: z.number().min(0).max(1),
          crossfade: z.number().min(0.25).max(8),
        }),
      )
      .default({}),
  }),
  deck: z
    .object({
      cards: z
        .array(cardSchema)
        .max(120)
        .refine(
          (cards) => new Set(cards.map((c) => c.id)).size === cards.length,
          "Card IDs must be unique",
        ),
      excluded: z.array(z.string().max(180)).max(240),
      autoInclude: z.boolean(),
    })
    .default({ cards: [], excluded: [], autoInclude: true }),
});
export type EventContent = z.infer<typeof contentSchema>;
export type ProgrammeItem = z.infer<typeof itemSchema>;
export type CardSpec = z.infer<typeof cardSchema>;
export const seed: EventContent = {
  child: "Chitraksh Gupta",
  date: "2026-10-17",
  invitation:
    "श्री माता रानी की असीम कृपा से, हमारे परिवार द्वारा माता का जागरण आयोजित किया जा रहा है। इस पावन अवसर पर आप सपरिवार पधारकर माँ का आशीर्वाद प्राप्त करें।",
  closing: "आपका स्नेहपूर्ण आगमन ही हमारे लिए माता रानी का आशीर्वाद है।",
  venue: "Agarwal Bhawan, Sadar Bazar, Gurugram",
  maps: "https://maps.app.goo.gl/Qw7BjPpKbFW57oa6A",
  contacts: "+91 00000 00000",
  hosts: [
    { name: "श्री वीरेंद्र कुमार गुप्ता", role: "दादा" },
    { name: "वीना गुप्ता", role: "दादी" },
    { name: "सुशांत गुप्ता", role: "पिता" },
    { name: "अन्नू गुप्ता", role: "माता" },
  ],
  mandali: "TBD",
  programme: [
    {
      id: "dinner",
      title: "A table shared",
      hindi: "रात्रि भोज",
      time: "8:30 PM",
      description:
        "Join the family for dinner, conversation and a beautiful evening together.",
      kind: "dinner",
      world: "jagran",
    },
    {
      id: "jyoti",
      title: "The sacred flame",
      hindi: "ज्योति प्रचंड",
      time: "9:15 PM",
      description:
        "With folded hands and grateful hearts, we light the Jyoti and seek Maa’s blessings.",
      kind: "jyoti",
      world: "jagran",
    },
    {
      id: "bhajan",
      title: "A night of devotion",
      hindi: "भजन एवं संकीर्तन",
      time: "TBD",
      description:
        "An offering of bhajans and heartfelt devotion at Maa’s Darbar.",
      kind: "bhajan",
      world: "jagran",
    },
    {
      id: "aarti",
      title: "Together in prayer",
      hindi: "माँ की आरती",
      time: "00:00 AM",
      description:
        "The evening closes in gratitude, with Aarti and blessings for everyone.",
      kind: "aarti",
      world: "jagran",
    },
    {
      id: "cake",
      title: "Two little wishes",
      hindi: "जन्मदिन का उत्सव",
      time: "00:00 PM",
      description:
        "Gather around Chitraksh for cake, smiles and the beginning of another wonderful year.",
      kind: "birthday",
      world: "birthday",
    },
  ],
  bhajans: [],
  media: [],
  features: {
    gallery: true,
    countdown: true,
    flowers: true,
    bhajans: true,
    rsvp: true,
    birthday: true,
    sound: true,
  },
  rsvp: {
    enabled: true,
    maxGuests: 12,
    message: "We would love to celebrate with you.",
  },
  audio: { jagran: "", birthday: "", scenes: {} },
  deck: { cards: [], excluded: [], autoInclude: true },
};
export const isPlaceholder = (time: string) =>
  time.includes("00:00") || time === "TBD";
export function eventDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(date + "T12:00:00+05:30"));
}
