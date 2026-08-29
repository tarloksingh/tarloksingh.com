import type { Entry, Frame } from './model'

/* What the leaders say, and where they point.

   One table keyed by frame id — "<project>/<file>", the id the media already
   carries — so a picture's readout lives next to every other picture's rather
   than inside the component that draws it. A frame nobody has written gets a
   derived pair instead, which is a placeholder and reads like one.

   A note can name its own spot. `at` is where the line touches the picture and
   `to` is where the text ends up, both as fractions of the subject's box, so
   they hold at any window size and on any shape of frame. Neither is required:
   a note with no geometry falls into the next free slot of the fan the Figma
   laid out, which is what every note was before this. Some pictures have one
   thing worth naming and some have five.

   Nothing here is written by hand if it can be helped — press **P** on a
   project screen and pin them by clicking the picture. See `MechPins.tsx`. */

/** One line of a readout: what is being pointed at, and what it is.
 *
 *  `label` names the note and never appears on screen. It is what the fold
 *  link and the React key are keyed on, and what the pin editor lists a line
 *  by — a handle, in other words, and short is the whole point of it.
 *
 *  `value` is what the card actually says, and since the card is a box that
 *  wraps it can be a sentence. It used to be one word set under the label on a
 *  rule, which is why the pairs below read as a table and the new ones do
 *  not. */
export interface Note {
  label: string
  value: string
  /** Which fold in the left column this line is evidence for. Hovering
   *  either one lights the other, which is the only thing tying the two
   *  halves of the screen together — without it they are two panels that
   *  happen to be on at the same time. */
  fold?: string
  /** Where the leader touches, as a fraction of the subject's box. 0,0 is the
   *  picture's top left and 1,1 its bottom right. */
  at?: [number, number]
  /** Where the text sits, in the same fractions. Outside 0..1 on purpose most
   *  of the time — a label belongs off the edge of the thing it names. */
  to?: [number, number]
}

export const NOTES: Record<string, Note[]> = {
  'mr-takahashi/model': [
    { label: 'Name', value: 'Spoke in English and Japanese. ', at: [-0.0519, 0.5049], to: [-0.2072, 0.458] },
    { label: '', value: 'Sculpted and animated in Blender.e', at: [0.9534, 0.1661], to: [1.0561, 0.0889] },
    { label: '', value: 'We used whisper voice to text to get the input, and Llama 3 as the intellegence. ', at: [0.0132, 0.8611], to: [-0.0976, 0.9056] }
  ],
  'mr-takahashi/MrTakahashi_Demo.mp4': [
    { label: 'made in', value: 'I used the Black Magic Ursa Mini 4.6k to film the demo video. ', fold: 'tools', at: [0.9331, 0.5969], to: [1.0562, 0.6823] },
    { label: 'label', value: 'A showcase demo of the app.', at: [0.9681, 0.1186], to: [1.0375, -0.0393] }
  ],
  'mr-takahashi/Signed_In.mp4': [
    { label: '', value: 'The apps welcome screen. ', at: [1.0194, 0.1255], to: [1.0535, 0.0066] },
    { label: 'label', value: 'Tools used were Blender, After Effects & Adobe premiere. ', at: [1.0222, 0.5439], to: [1.0612, 0.6465] }
  ],
  'mr-takahashi/Design_10.mp4': [
    { label: 'label', value: 'An in-app session of a lesson. ', at: [1.0114, 0.1669], to: [1.0666, 0.0447] }
  ],
  'mr-takahashi/Menu.png': [
    { label: 'still', value: 'The home screen which shows the lesson plan in weeks. ', at: [1.0271, 0.2579], to: [1.0667, 0.1492] }
  ],
  'mr-takahashi/Process_00.webp': [
    { label: 'still', value: 'Early version of an ear piece I designed for conversating with Adam. Learn more about Adam in the process section', at: [0.9418, 0.443], to: [1.0525, 0.3782] },
    { label: '', value: 'We wanted a custom ear piece you can wear all day to conversate any time with Adam', at: [0.9716, 0.6671], to: [1.0702, 0.624] }
  ],
  'mr-takahashi/Process_0.webp': [
    { label: 'p', value: 'Designing Takahashi in Blender.', at: [1.0172, 0.2066], to: [1.0468, -0.0109] }
  ],
  'mr-takahashi/Process_2.webp': [
    { label: 'still', value: 'Wearing version five of Adam open ear headphone.', at: [1.0298, 0.3192], to: [1.0842, 0.2611] }
  ],
  'mr-takahashi/Process_3.webp': [
    { label: 'still', value: 'Wearing version one of Adam headphone.', at: [1.0172, 0.2302], to: [1.0632, 0.2081] },
    { label: 'made in', value: 'Iterations were done in Blender.', fold: 'tools', at: [1.024, 0.5197], to: [1.0657, 0.4211] }
  ],
  'mr-takahashi/Process_1.mp4': [
    { label: 'clip', value: 'Animating an example of Mr. Takahashi speaking. ', at: [0.9873, 0.2034], to: [1.0273, -0.0898] }
  ],
  'mr-takahashi/Adam_Speaking.mp4': [
    { label: '', value: 'Conversating with Adam. Learn about Adam in process.', at: [1.0113, 0.1455], to: [1.0438, 0.0698] }
  ],
  'mr-takahashi/Marketing_6.jpg': [
    { label: '', value: 'Marketing material for the app store.', at: [1.0342, 0.2053], to: [1.0742, 0.0188] }
  ],
  'capsule-c1/model': [
    { label: 'label', value: '3D model of the Capsule c1.', at: [0.873, 0.2717], to: [1.0547, 0.1099] },
    { label: 'label', value: 'Designed in blender with precise sizing to fit a raspberry pi and phone.', at: [0.0565, 0.4283], to: [-0.0447, 0.3042] },
    { label: 'label', value: 'Designed to hold your phone and raspberry pi and maintiain proper airflow. ', at: [0.9363, 0.7681], to: [1.0024, 0.8171] }
  ],
  'capsule-c1/Demo_Video.mp4': [
    { label: 'label', value: 'Filmed with the Black magic ursa mini 4.6k.', at: [0.9618, 0.2654], to: [1.0405, 0.0509] },
    { label: 'label', value: 'Video showcasing how to place a capsule call.', at: [0.4157, 0.0831], to: [0.3172, -0.2743] }
  ],
  'capsule-c1/DT_Mobile_Call.mp4': [
    { label: 'clip', value: 'Home screen of the capsule app. ', at: [0.5043, 0.0839], to: [0.5568, -0.2152] }
  ],
  'capsule-c1/DT_Signup.mp4': [
    { label: '', value: 'Sign-up screen. ', at: [0.5748, 0.0977], to: [0.6873, -0.226] }
  ],
  'capsule-c1/Design_5.mp4': [
    { label: 'clip', value: 'Placing a call on your TV.', at: [0.902, 0.0575], to: [1.0097, -0.166] }
  ],
  'capsule-c1/Top_View.png': [
    { label: 'made in', value: 'Printed Capsule c1 model ', fold: 'tools', at: [0.5436, 0.4213], to: [0.4397, -0.08] }
  ],
  'capsule-c1/Phone_Insert.png': [
    { label: 'still', value: 'Final hardware design & assembly with iPhone.', at: [0.942, 0.0838], to: [1.0286, -0.2246] }
  ],
  'capsule-c1/Side_View.jpg': [
    { label: 'still', value: 'Profile view of the Capsule C1.', at: [0.6407, 0.5774], to: [1.0402, 0.3598] }
  ],
  'capsule-c1/Challenges_1.jpeg': [
    { label: 'still', value: 'Still: Testing designs.', at: [0.6133, 0.403], to: [1.0585, 0.3331] }
  ],
  'capsule-c1/Challenges_2.jpeg': [
    { label: 'still', value: 'Many iterations in the trash.', at: [0.9595, 0.4463], to: [1.0585, 0.3331] }
  ],
  'capsule-c1/Challenges_3.png': [
    { label: 'still', value: 'First design of the hardware in Figma.', at: [0.9542, 0.116], to: [1.047, -0.1395] }
  ],
  'capsule-c1/printing.mp4': [
    { label: 'clip', value: '3D printing a Capsule C1.', at: [1.0303, 0.4023], to: [1.0852, 0.3341] }
  ],
  'capsule-c1/Branding_1.mp4': [
    { label: 'clip', value: 'Promotional content made in blender for the website.', at: [0.9482, 0.3469], to: [1.0444, 0.1908] }
  ],
  'capsule-c1/Branding_3.mp4': [
    { label: 'clip', value: 'Promotional content.', at: [0.9625, 0.2568], to: [1.0441, 0.0782] }
  ],
  'capsule-c1/Branding_5.mp4': [
    { label: '', value: 'Promotional content ', at: [0.8887, 0.5453], to: [1.0622, 0.2133] }
  ],
  'capsule-c1/Branding_4.mp4': [
    { label: '', value: 'Promotional content', at: [0.8707, 0.4549], to: [1.0654, 0.3152] }
  ],
  'slider-engine/piece': [
    { label: '', value: 'Breathing animation of "The Alcholic Fish"', at: [0.7921, 0.3659], to: [0.9748, 0.2633] },
    { label: 'label', value: 'Designed in Figma, animated in After effects. ', at: [0.27, 0.5066], to: [-0.0342, 0.3887] }
  ],
  'slider-engine/hero.mp4': [
    { label: 'clip', value: 'Unreleased promo video made by me in After Effects.', at: [0.9355, 0.1134], to: [1.0396, -0.1975] }
  ],
  'slider-engine/Design_1.mp4': [
    { label: 'clip', value: 'Adjusting settings in Slider Engine.', at: [0.8549, 0.4618], to: [1.0187, 0.1753] },
    { label: 'label', value: 'Slider Engine was designed to be only used for web based 2D games. ', at: [0.847, 0.6286], to: [1.018, 0.6964] }
  ],
  'slider-engine/Design_5.mp4': [
    { label: 'clip', value: 'Creating a new game.', at: [0.9271, 0.3643], to: [1.0506, 0.2395] }
  ],
  'slider-engine/Design_3.mp4': [
    { label: 'clip', value: 'Clip: Creating game objects.', at: [0.9638, 0.3338], to: [1.0661, 0.2184] }
  ],
  'slider-engine/Design_4.mp4': [
    { label: 'clip', value: 'Reversing & object trails.', at: [0.9125, 0.2937], to: [1.0901, 0.1039] },
    { label: 'made in', value: 'Inspired by Brett Victor and Figma.', fold: 'tools', at: [0.8496, 0.5747], to: [1.0657, 0.3883] }
  ],
  'slider-engine/Game_0.mp4': [
    { label: 'clip', value: 'A scene from the unfinished game "The Alcholic Fish.', at: [0.94, 0.08], to: [1.0376, -0.0207] }
  ],
  'slider-engine/Game_1.mp4': [
    { label: 'clip', value: 'Early test of Solomon game.', at: [0.9582, 0.3244], to: [1.1356, -0.0479] },
    { label: 'made in', value: 'Made in Figma.', fold: 'tools' }
  ],
  'slider-engine/Game_2.mp4': [
    { label: 'clip', value: 'Clip: Frogman vs the Giant Toad.', at: [0.9602, 0.1358], to: [1.0825, -0.05] }
  ],
  'slider-engine/marketing2.mp4': [
    { label: 'clip', value: 'Unfinished marketing video made in After Effects.', at: [0.9491, 0.265], to: [1.0366, -0.0568] }
  ]
}

/** What a frame with nothing written for it says: the one thing that is true
 *  of every frame, and the tool it was made in if the project names one. A
 *  placeholder, and it should read like one — the card is built for a sentence
 *  and nothing derived is going to be much of one. */
export const derive = (entry: Entry, frame: Frame): Note[] => {
  const tools = entry.project.sections.find((section) => section.id === 'tools')?.tags ?? []
  const kind = frame.kind === 'flat' ? (frame.type === 'video' ? 'clip' : 'still') : frame.kind
  const of = frame.label ?? entry.project.title
  return [
    // A colon rather than a dash: half the frames on this site are named with
    // a dash already, and "Piece — StitchFam — the loop" is not a sentence in
    // any language.
    { label: kind, value: `${kind[0].toUpperCase()}${kind.slice(1)}: ${of}.` },
    ...(tools.length > 0 ? [{ label: 'made in', value: `Made in ${tools[0]}.`, fold: 'tools' }] : [])
  ]
}

/* ---- the draft ----

   Same arrangement as every tuning panel on this site: what the editor writes
   goes to localStorage, the page reads it in preference to the table above,
   and a copy button hands back source to paste into it. Nothing anyone pins
   reaches a visitor until it has been pasted — a browser's scratchpad is not
   a deployment.

   A store rather than component state because the editor and the leaders are
   in different halves of the tree, and both have to see the same drag. */

const STORE_KEY = 'v3.notes.v1'

type Draft = Record<string, Note[]>

const load = (): Draft => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? 'null')
    return parsed && typeof parsed === 'object' ? (parsed as Draft) : {}
  } catch {
    return {}
  }
}

let draft: Draft = typeof window === 'undefined' ? {} : load()
const listeners = new Set<() => void>()

/** Dragging a handle writes on every pointer move. The store keeps up because
 *  it is a couple of objects; localStorage does not need to. */
let save = 0
const persist = () => {
  window.clearTimeout(save)
  save = window.setTimeout(() => {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(draft))
    } catch {
      /* private mode, a full quota — not worth breaking the page over */
    }
  }, 250)
}

const changed = () => {
  for (const listener of listeners) listener()
  persist()
}

const round = (n: number) => Number(n.toFixed(4))

/** A card holds a sentence now, and sentences have apostrophes in them —
 *  which, pasted straight into a single-quoted literal, is a syntax error in
 *  the file this hands back. */
const quoted = (text: string) => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

const asSource = (id: string, notes: Note[]) => {
  const line = (note: Note) => {
    const parts = [`label: ${quoted(note.label)}`, `value: ${quoted(note.value)}`]
    if (note.fold) parts.push(`fold: ${quoted(note.fold)}`)
    if (note.at) parts.push(`at: [${round(note.at[0])}, ${round(note.at[1])}]`)
    if (note.to) parts.push(`to: [${round(note.to[0])}, ${round(note.to[1])}]`)
    return `    { ${parts.join(', ')} }`
  }
  return `  '${id}': [\n${notes.map(line).join(',\n')}\n  ]`
}

/** Which frame the readout is showing, so the tuning panel's label buttons
 *  have something to act on. The panel is mounted once and its buttons close
 *  over nothing; this is what they read, the same trick `modelTuning`'s copy
 *  button uses with `live`. */
export const focus = { id: '' }

export const pins = {
  /** The whole draft. Handed to `useSyncExternalStore`, so it has to be the
   *  same object until something actually changes. */
  snapshot: () => draft,

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  get: (id: string): Note[] | undefined => draft[id],

  set(id: string, notes: Note[]) {
    draft = { ...draft, [id]: notes }
    changed()
  },

  /** Back to whatever the source file says for this frame. */
  clear(id: string) {
    const { [id]: gone, ...rest } = draft
    void gone
    draft = rest
    changed()
  },

  /** Every frame pinned in this browser, as the source of the table above.
   *  One frame if `id` is given, the lot if not — pinning three pictures in a
   *  sitting and pasting once is the normal way this gets used. */
  source(id?: string) {
    const ids = id ? [id] : Object.keys(draft)
    const body = ids
      .filter((key) => draft[key]?.length)
      .map((key) => asSource(key, draft[key]))
      .join(',\n')
    return `export const NOTES: Record<string, Note[]> = {\n${body}\n}`
  }
}

/** What a frame's readout says right now: the draft if this browser has one,
 *  the table if the frame is written down, and a derived pair if not. */
export const notesFor = (entry: Entry, frame: Frame, drafts: Draft = draft): Note[] =>
  drafts[frame.id] ?? NOTES[frame.id] ?? derive(entry, frame)

/** Add a line to a frame's draft, pointing at a fraction of its picture. Used
 *  by the editor's own click-to-place and by the panel's button, which has no
 *  picture to click on. */
export const addNote = (id: string, at: [number, number], from: Note[]) => {
  const side = at[0] > 0.5 ? 1 : -1
  pins.set(id, [
    ...from,
    { label: 'label', value: 'Say what this is, in a sentence.', at, to: [at[0] + side * 0.3, at[1] - 0.1] }
  ])
}
