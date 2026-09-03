import { resolveImage, resolveVideo } from './media'
import type { MediaItem } from './media'

/* The single source of truth for the whole site. The home page's media field,
   the rotunda, and every case study all read from this one array — add an
   entry and it appears in all three; delete one and it leaves all three.
   Nothing else holds a project list.

   Copy is carried forward verbatim from the previous Vue site (`WorkDetail.vue`
   at commit ded65a6) so nothing written about the work was lost in the rewrite. */

/** Terse media references, resolved to real URLs by `build()` below. */
type Ref =
  | { v: string; label?: string; sound?: boolean }
  | { i: string; label?: string }

/** The filter row, in the order it is drawn. */
export const TAGS = ['work', 'video games', 'hardware', 'tools', '3d', 'motion', 'film', 'music'] as const
export type Tag = (typeof TAGS)[number]

/* Which filters each project answers to. A project belongs to as many as it
   earns — the overlap is the point. The row narrows one flat set rather than
   sorting projects into bins, so nothing has to pick a single home.

   This lives as one table rather than a field on each entry so the whole
   tagging can be read, and re-cut, in one screen. */
const PROJECT_TAGS: Record<string, Tag[]> = {
  '3d-printing': ['3d', 'hardware'],
  'a-game': ['video games', '3d', 'tools'],
  'mr-grocery': ['tools'],
  visa: ['work', 'tools', 'motion'],
  'slider-engine': ['work', 'video games'],
  'wyte-card': ['work', 'hardware'],
  'block-builder': ['work', '3d'],
  'capsule-c1': ['work', 'hardware', '3d', 'film'],
  'mr-takahashi': ['work', '3d'],
  stitchfam: ['work'],
  'mecha-station': ['work', '3d'],
  openup: ['work'],
  'red-dead-redemption-2': ['work', 'video games', 'film', '3d'],
  'grand-theft-auto-v': ['work', 'video games', 'film', '3d']
}

/* The timeline groups by year, and `timeline` is prose ("2024 — 2025",
   "Jan — Jul 2026", "2015 — Present"). The last year it names is the one a
   project files under; "Present" means this year. */
const THIS_YEAR = new Date().getFullYear()
const yearOf = (timeline: string): number => {
  const years = timeline.match(/\d{4}/g)?.map(Number) ?? []
  if (/present/i.test(timeline)) return THIS_YEAR
  return years.length ? Math.max(...years) : THIS_YEAR
}

export interface Section {
  id: string
  title: string
  text?: string
  /** Roles and tools — rendered as a list of small caps, not prose. */
  tags?: string[]
  media: MediaItem[]
  links?: Array<{ label: string; url: string; kind: 'demo' | 'download' | 'external' }>
}

export interface Project {
  id: string
  title: string
  /** One line under the title, everywhere the project is named. */
  tagline: string
  role: string
  company: string
  timeline: string
  intro: string
  /** Colour this project tints its rules, labels and hover states with. */
  accent: string
  hero: MediaItem | null
  sections: Section[]
  /** Set when an NDA or an unfinished write-up limits what can be shown. */
  restricted?: string
  /** `restricted` is an NDA rather than an unwritten case study — the v3 card
   *  shows a lock and reads "not yet disclosable" instead of "no material". */
  locked?: boolean
  /** Overrides the locked card's tag — "not yet disclosable" is an NDA
   *  framing, and Solomon's lock is "still being built", not "cannot show". */
  lockNote?: string
  /** `'work'` (the default) rides the main vitrine row and the home page's
   *  work timeline; `'side'` skips the row entirely and appears only on the
   *  smaller side-projects timeline beside it. Still a full case study
   *  either way — this only decides whether it gets a case in the gallery. */
  category?: 'work' | 'side'
  /** Which filters this project answers to, from `PROJECT_TAGS`. Read by the
   *  v3 filter row; the current site ignores it. */
  tags: Tag[]
  /** The last year `timeline` names — what the v3 timeline groups by. */
  year: number
  /** Every clip and still in the project, hero first, deduped — what the home
   *  page draws its cards from. */
  media: MediaItem[]
}

interface Draft {
  id: string
  title: string
  tagline: string
  role: string
  company: string
  timeline: string
  intro: string
  accent: string
  hero?: Ref
  restricted?: string
  locked?: boolean
  lockNote?: string
  category?: 'work' | 'side'
  sections: Array<{
    id: string
    title: string
    text?: string
    tags?: string[]
    media?: Ref[]
    links?: Section['links']
  }>
}

const drafts: Draft[] = [
  /* ---- Placeholders. All three are real work with no write-up yet; they
     carry a `restricted` note instead of sections, and the case study
     renders that rather than an empty page. Fill in `sections` and `hero` to
     promote any one of them to a full study — nothing else needs changing.

     The last two are also `category: 'side'` — personal projects rather than
     client work, so they skip the vitrine row and sit on the smaller
     side-projects line on the home page timeline instead. ---- */
  {
    id: '3d-printing',
    title: '3D Printing',
    tagline: 'Parts, Enclosures, Prototypes',
    role: 'Designer & Maker',
    company: 'Independent',
    timeline: '2024 — Present',
    accent: '#5c6570',
    category: 'side',
    restricted:
      'A write-up is on the way. In the meantime: everything here is modelled in Blender and printed at home — the same pipeline that produced the Capsule C1 enclosure.',
    intro:
      'Modelled in Blender, sliced, printed, sanded, and fitted at home. The enclosure work behind Capsule C1 came out of this bench, and it has kept running since.',
    sections: []
  },
  {
    id: 'a-game',
    title: 'Solomon',
    tagline: 'A Boss Fight in the Browser',
    role: 'Solo — Design, Code, Art Direction, Tools',
    company: 'Independent',
    timeline: '2015 — Present',
    accent: '#c23b3b',
    category: 'side',
    locked: true,
    lockNote: 'in development',
    restricted:
      'Currently in development. Solo-developed, launching soon on iOS and Android. Email me to play the demo.\n\nBuilt with Three.js and hand-written WebGL — procedural art, a cinematic post-processing stack, and a live tuning console that balances the whole game from a phone.',
    intro:
      'A boss-rush game — ride down an Akira-style avenue toward a giant god-beast and dodge its attacks. One hit, instant restart. Currently in development, solo, launching soon on iOS and Android.',
    sections: []
  },
  {
    id: 'mr-grocery',
    title: 'Mr Grocery',
    tagline: 'Personal Project',
    role: 'Designer & Developer',
    company: 'Independent',
    timeline: '2015 — Present',
    accent: '#4f6a52',
    category: 'side',
    restricted: 'No write-up yet — more soon.',
    intro: 'A personal project, ongoing since 2015.',
    sections: []
  },
  {
    id: 'visa',
    title: 'Visa',
    tagline: 'In-House Design Platform',
    role: 'Staff Designer',
    company: 'Visa',
    timeline: 'Jan — Jul 2026',
    accent: '#1a1f71',
    locked: true,
    restricted:
      'Covered by a non-disclosure agreement. What can be said: as Staff Designer I replaced an external agency with a TypeScript/React demo platform I built solo — shared design tokens keep every demo on-brand, a carry-forward library reuses them between events, and each event ships as its own offline PWA. It took a build from three or four weeks down to a day or two, and turned the work of ten-plus product teams into twenty-two demos for the Visa Payments Forum.',
    intro:
      'Visa’s marketing production ran through an external agency. I built the platform that brought it in-house — and then handed it over.',
    sections: []
  },
  {
    id: 'slider-engine',
    title: 'Slider Engine',
    tagline: 'A Game Engine With No Code In It',
    role: 'Founder & Product Designer',
    company: 'Openup Technologies Inc.',
    timeline: '2025',
    accent: '#2f7d52',
    intro:
      'Slider Engine is a game engine with no code in it. Programming becomes four visual mechanics — triggers, conditions, actions, and properties — that you wire together like a synth patch, with the game running live as you build.\n\nMy cofounder and I shipped it to 200+ creators. The landing page that tested the idea drew 112 sign-ups in two hours.',
    hero: { v: 'hero.mp4', label: 'Demo — created by Tarlok Singh' },
    sections: [
      {
        id: 'roles',
        title: 'Roles',
        tags: [
          'Product Design',
          'UX/UI Design',
          'Game Design',
          'Branding',
          'User Research',
          'Prototyping',
          'Marketing'
        ]
      },
      {
        id: 'design',
        title: 'Design',
        text: 'My cofounder and I spent a month mapping game logic into a UI-first system, breaking programming into four visual mechanics: triggers, conditions, actions, and properties. By connecting these building blocks, users could create behaviors like jumping or collisions without writing code. Designing even basic actions (like a character jump) revealed how much complexity programmers manage under the hood to me, and pushed me to create clear, visual flows that beginners could understand.\n\nAs a musician, I’ve always valued the immediacy of knobs and dials, you twist something and hear instant feedback. I wanted that same responsiveness in game design. Most existing tools force constant back-and-forth, make a change, hit play, then wait to see results. Our goal was to remove that friction, giving creators instant feedback as they built their games.',
        media: [
          { v: 'Design_1.mp4', label: 'Adjusting the speed of a character' },
          { v: 'Design_5.mp4', label: 'Creating a new game' },
          { v: 'Design_3.mp4', label: 'Adding game objects' },
          { v: 'Design_4.mp4', label: 'Reversing & object trails' }
        ]
      },
      {
        id: 'tools',
        title: 'Tools',
        tags: ['Figma', 'Adobe After Effects', 'Adobe Premiere Pro', 'LLM Models', 'Framer', 'Unity']
      },
      {
        id: 'branding',
        title: 'Process & Branding',
        text: 'The design for Slider Engine was inspired by what Figma did for designers, making professional creation tools easy to understand and to use. We wanted to do the same for game development. The visual identity leaned on a black, green, and grey palette to convey focus and sophistication, while still feeling creative.\n\nThe modular design language echoed the engine’s “building block” philosophy, reinforcing the idea that complex games could be built piece by piece. Our goal was for new creators to feel empowered the moment they opened the engine, not intimidated.',
        media: [
          { v: 'Game_0.mp4', label: 'Engine test build' },
          { v: 'Game_1.mp4', label: 'Dodge game test' },
          { v: 'Game_2.mp4', label: 'Frogman vs the Giant Toad' },
          { v: 'marketing2.mp4', label: 'Unfinished marketing video' }
        ]
      },
      {
        id: 'challenges',
        title: 'Challenges',
        text: 'The main challenge was building an engine that could do everything a normal game engine could, aimed at indie developers. We underestimated how long even a simplified one would take.\n\nAfter months we had a working prototype, but it was still too buggy and too hard to learn, and our runway ran out before we closed that gap. The project was still a breakthrough for me as a designer: I learned how to translate complex, abstract systems into tools non-technical people can use.',
        links: [
          { kind: 'demo', label: 'Try Slider Engine', url: 'https://sliderengine.com/' },
          { kind: 'download', label: 'Download the pitch deck', url: '/downloads/Slider_Engine_ Pitch_Deck.pdf' }
        ]
      }
    ]
  },
  {
    id: 'wyte-card',
    title: 'Wyte Card',
    tagline: 'Digital Business Card',
    role: 'Product Designer',
    company: 'Openup Technologies Inc.',
    timeline: '2025',
    accent: '#4d4d4d',
    intro:
      'Wyte Card is a digital business card: tap it to a phone and your details open instantly, no app to install.\n\nIt grew out of Gala-Reel, an NFC experiment we ran at weddings and on college campuses to share event galleries. The tap felt seamless, the market didn’t — so we pointed the same technology at something people use every day.',
    hero: { v: 'hero.mp4', label: 'Promotional video' },
    sections: [
      {
        id: 'roles',
        title: 'Roles',
        tags: [
          'Product Design',
          'UX/UI Design',
          'Branding',
          'User Research',
          'Product Research',
          'Marketing & Sales'
        ]
      },
      {
        id: 'design',
        title: 'Design',
        text: 'The physical card was intentionally minimalist, plain white to reduce costs. On the digital side, the experience was simple, tap the card, an app clip opens and contact information opened instantly, no apps required. People who were “tapped” could also purchase their own card right from the app clip. The design philosophy was elegance and speed as we saw the market shows how a great card builds trust.',
        media: [
          { i: 'Wyte_1.png', label: 'Main view when opened' },
          { i: 'Wyte_2.png', label: 'Social media links' },
          { i: 'Wyte_3.png', label: 'Updated view' }
        ]
      },
      {
        id: 'branding',
        title: 'Branding',
        text: 'The brand identity leaned into professionalism and minimalism. We named it Wyte to reflect the clean, all-white design of the card. Visuals were sleek, neutral, and premium to signal trust and sophistication for professionals like real estate agents.\n\nMarketing emphasized speed, and long-term cost savings compared to printing traditional cards. Where Gala-Reel was festive and celebratory, Wyte Card was designed to feel sharp, focused, and professional.',
        media: [
          { i: 'Gala_Reel.jpg', label: 'Gala Reel gallery view' },
          { v: 'Video1.mp4', label: 'NFC card & app clip' }
        ]
      },
      {
        id: 'challenges',
        title: 'Challenges',
        text: 'The biggest challenge wasn’t technical as it took us only days to build the product, but timing. Just as Wyte Card was approved for TikTok Shop and we began testing with real estate agents, my mother required triple bypass surgery. I stepped away from startup life to focus on family.'
      }
    ]
  },
  {
    id: 'block-builder',
    title: 'Block Builder',
    tagline: 'LEGO Style iPad Game',
    role: 'Product Designer',
    company: 'Openup Technologies Inc.',
    timeline: '2025',
    accent: '#d1502f',
    intro:
      'Block Builder is a LEGO-style building game for iPad, built in under a week for my four-year-old son. Nothing like it existed for kids that young on a tablet — and it became our test of how fast one designer and one engineer could ship a real game in Unity.',
    hero: { v: 'hero.mp4', label: 'Modular system demonstration' },
    sections: [
      {
        id: 'roles',
        title: 'Roles',
        tags: ['Product Design', 'UX/UI Design', '3D Design', 'User Research & Testing']
      },
      {
        id: 'design',
        title: 'Design',
        text: 'The design process was guided almost entirely by observing how my four-year-old interacted with the prototype and other games. We tested basic mechanics together, and I adjusted the interface based on where he struggled.\n\nCamera controls proved confusing for him, and he wanted pre-made structures as starting points instead of building from scratch, an insight that highlighted the importance of scaffolding for engagement at his age. Initial user testing was done by me and my cofounder to validate core flows before handing it off to him.',
        media: [
          { v: '1.mp4', label: 'Starting a build' },
          { v: '2.mp4', label: 'Building a car' },
          { v: '3.mp4', label: 'Building a duckbug' }
        ]
      },
      {
        id: 'branding',
        title: 'Branding & Insights',
        text: 'Block Builder didn’t have a formal brand system, but its identity came from its colorful blocks, playful interactions, and a child-friendly tone. It was less about creating a polished product and more about creating a sandbox that felt inviting and easy to explore.\n\nA designer and one engineer shipped a playable game in under a week — faster than either of us expected.'
      }
    ]
  },
  {
    id: 'capsule-c1',
    title: 'Capsule C1',
    tagline: 'TV-to-TV Video Calling',
    role: 'Founder & Product Designer',
    company: 'Openup Technologies Inc.',
    timeline: '2024 — 2025',
    accent: '#3a5a8c',
    intro:
      'Capsule C1 turns your TV into a window to your family. A 3D-printed enclosure holds a Raspberry Pi 5 and your phone, and calls run TV-to-TV at a resolution a phone can’t reach.\n\nMy cofounder and I both live far from home. This was us trying to make the distance feel like teleportation — I wanted my mother in the same room as her grandchildren. We tested it in five homes and sold $800 of hardware before pausing it.',
    hero: { v: 'Demo_Video.mp4', label: 'Demo — filmed and edited by Tarlok Singh', sound: true },
    sections: [
      {
        id: 'roles',
        title: 'Roles',
        tags: [
          'Hardware Designer',
          'Software Designer',
          'Web Designer & Developer',
          '3D Printing & Assembly',
          'Marketing & Branding',
          'Visual Designer',
          'User Testing'
        ]
      },
      {
        id: 'design',
        title: 'Design',
        text: 'The design process spanned many dimensions. I designed a 3D-printed casing for the Raspberry Pi 5 and your phone in Blender and I made sure it was durable and aesthetically pleasing. On the software side, I built both the mobile app and the TV app designs using Figma. The website was designed and developed by me in Framer and the assets were made in Blender.',
        media: [
          { v: 'DT_Mobile_Call.mp4', label: 'Home page & calling' },
          { v: 'DT_Signup.mp4', label: 'Mobile sign-up screen' },
          { v: 'Design_5.mp4', label: 'TV app design' },
          { i: 'Top_View.png', label: 'Top view of the C1' },
          { i: 'Phone_Insert.png', label: 'Final product design & assembly' },
          { i: 'Side_View.jpg', label: 'Side view of the C1' }
        ]
      },
      {
        id: 'prototyping',
        title: 'Prototyping',
        text: 'I went through many iterations of the Capsule C1 casing. The goal was to design a stand that securely held the phone, allowed for slight tilt adjustments, housed the Raspberry Pi 5 while keeping it cool, used minimal material, and all while being aesthetically pleasing.\n\nThe TV and mobile app priority was clarity first, beauty second. If a person couldn’t immediately understand what to do, the design failed. Too much on screen created confusion, and I knew from experience that most people won’t stop to read instructions, the interface had to guide them effortlessly.',
        media: [
          { i: 'Challenges_1.jpeg', label: 'Testing designs' },
          { i: 'Challenges_2.jpeg', label: 'Many iterations in the trash' },
          { i: 'Challenges_3.png', label: 'First design in Figma' },
          { v: 'printing.mp4', label: '3D printing a Capsule C1' }
        ]
      },
      {
        id: 'tools',
        title: 'Tools',
        tags: ['Blender', '3D Printer', 'Figma', 'Adobe Suite', 'Blackmagic Camera', 'Framer']
      },
      {
        id: 'branding',
        title: 'Branding',
        text: 'The Capsule brand was designed to feel simple, modern, and trustworthy. The visual language leaned on whites, greys, and blacks, with subtle blue accents. Typography was approachable, optimized for living room distance.\n\nMarketing materials and promotional content mirrored this simplicity, always focusing on clarity rather than jargon. These elements created a cohesive experience across hardware, apps, and brand touchpoints.',
        media: [
          { v: 'Branding_1.mp4', label: 'Promotional content 1' },
          { v: 'Branding_3.mp4', label: 'Promotional content 2' },
          { v: 'Branding_4.mp4', label: 'Promotional content 3' },
          { v: 'Branding_5.mp4', label: 'Promotional content 4' }
        ]
      },
      {
        id: 'challenges',
        title: 'Challenges',
        text: 'The biggest hurdle was technical: achieving reliable H.265 video calls over real networks. We pivoted to H.264 for stability, which worked better but had loss of quality. Beyond the technical, we learned that tests that worked for me and my cofounder often broke down for families in their own living rooms during testing.\n\nRunning in-home tests revealed usability gaps and shaped key design changes. Ultimately, Capsule was paused due to time and funding constraints, but it proved invaluable in teaching me how to design holistically across hardware, software, and brand. I will be back to this project in the near future.'
      }
    ]
  },
  {
    id: 'mr-takahashi',
    title: 'Mr. Takahashi',
    tagline: 'A 3D AI Tutor for Japanese',
    role: 'Founder & Product Designer',
    company: 'Openup Technologies Inc.',
    timeline: '2024',
    accent: '#c2452f',
    intro:
      'Mr. Takahashi is a 3D AI tutor that teaches Japanese by talking to you — a teacher with a face, a personality, and a sense of humor, modeled and animated in Blender.\n\nHe started as a pivot from Adam, our conversational-AI earpiece. Adding structured lessons and tuning his voice took first-week retention from 2% to 30%.',
    hero: { v: 'MrTakahashi_Demo.mp4', label: 'Demo — filmed and edited by Tarlok Singh', sound: true },
    sections: [
      {
        id: 'roles',
        title: 'Roles',
        tags: [
          'AI System Prompt Design',
          'App UX/UI Design',
          'Web Designer & Developer',
          'Marketing & Sales',
          '3D Character Design & Animation',
          'User Testing'
        ]
      },
      {
        id: 'design',
        title: 'Design',
        text: 'The design process combined conversational AI with expressive animation. I built the Takahashi character in Blender 3D, designing a wide range of facial expressions to reflect emotion and context during lessons to keep users entertained and engaged. In Figma, I designed lesson flows that evolved from free-form conversation into structured guidance, after user testing revealed the need for clearer learning paths.\n\nWe iterated continuously with a small set of learners, cutting unnecessary steps and making flows more direct. I also tested multiple LLM models and system prompt designs to balance accuracy, speed, and entertainment value. Every design choice was made to keep learners engaged day after day, which is a critical challenge in language learning.',
        media: [
          { v: 'Design_10.mp4', label: 'Lesson one' },
          { v: 'Signed_In.mp4', label: 'Welcome screen' },
          { i: 'Menu.png', label: 'Lesson menu' }
        ]
      },
      {
        id: 'tools',
        title: 'Tools',
        tags: ['Blender', 'Figma', 'Adobe Suite', 'Blackmagic Camera', 'Framer', 'LLM Models', '3D Printing']
      },
      {
        id: 'process',
        title: 'Process',
        text: 'We began with Adam, a conversational AI paired with a behind-the-ear “headphone” meant for all-day questions. After struggling to build a great earpiece and rarely using it ourselves, we pivoted. Takahashi followed, inspired by my cofounder’s frustration with language apps and his desire to learn Japanese.\n\nOur idea: people learn best when curiosity drives them, not when content is pushed at them. In practice, this approach was good but failed since users didn’t know what to ask, engagement dropped, and unlike a real tutor, an unstructured AI felt directionless. We shifted to clear, lesson-based guidance while still allowing users to ask questions anytime.',
        media: [
          { i: 'Process_00.webp', label: 'Building the Adam ear headphone' },
          { i: 'Process_0.webp', label: 'Designing Takahashi in Blender' },
          { i: 'Process_2.webp', label: 'Wearing version 5 of Adam' },
          { i: 'Process_3.webp', label: 'Wearing version 1 of Adam' },
          { v: 'Process_1.mp4', label: 'Animating Mr. Takahashi' },
          { v: 'Adam_Speaking.mp4', label: 'Conversing with Adam' }
        ]
      },
      {
        id: 'branding',
        title: 'Branding',
        text: 'We positioned Mr. Takahashi as both trustworthy and entertaining. His 3D persona was designed to feel approachable and playful, someone who could encourage you without feeling robotic or academic. I tested different voices until we found one that struck the right balance of warmth and entertaining.\n\nThe visual identity leaned toward clean layouts and vibrant accents, signaling energy and fun rather than the dry seriousness. Marketing materials emphasized Takahashi not as an app, but as a friend from Japan teaching you to speak Japanese.',
        media: [
          { i: 'Marketing_6.jpg', label: 'Marketing artwork' }
        ]
      },
      {
        id: 'challenges',
        title: 'Challenges',
        text: 'Two main challenges defined this project. First, retention: early users enjoyed conversations but churned quickly without structure, which led us to add lessons. Second, cost: heavy users drove high expenses due to LLM usage, which made it difficult without capital.\n\nWhile the product built a small base of enthusiastic learners, we could not find a sustainable path forward without capital. Still, the project strengthened my 3D and animation skills, taught me how to shape AI outputs through prompt design, and reinforced the importance of iterating quickly with users to uncover what keeps them engaged.'
      }
    ]
  },
  {
    id: 'stitchfam',
    title: 'Stitchfam',
    tagline: 'A Family Tree That Passes Itself Around',
    role: 'Founder & Product Designer',
    company: 'Openup Technologies Inc.',
    timeline: '2024',
    accent: '#b07a4e',
    intro:
      'StitchFam is a family tree that builds itself by being passed around. Each relative adds their branch and forwards one link to the next.\n\nI wanted to map my family across India and couldn’t — I didn’t have the names, the photos, or a way to reach everyone. No tool worked this way, so we built one.',
    hero: { v: 'Desktop_1.mp4', label: 'Traveling through the family tree' },
    sections: [
      {
        id: 'roles',
        title: 'Roles',
        tags: ['Product Design', 'UX/UI Design', 'Branding', 'Research']
      },
      {
        id: 'design',
        title: 'Design',
        text: 'I built invitation flows where a single link could be passed from one family member to the next, hoping to create a natural chain of participation.\n\nVisualization layouts were designed to emphasize relationships as living connections, not just data points. The challenge was making the input process quick and engaging so relatives wouldn’t lose interest after a few steps.',
        media: [
          { v: 'Design_3.mp4', label: 'Mobile view of the family tree' },
          { v: 'Design_1.mp4', label: 'Adding a family member' },
          { v: 'Design_2.mp4', label: 'Inviting a family member' }
        ]
      },
      {
        id: 'branding',
        title: 'Branding',
        text: 'The brand was built around warmth and desire to be distinct from the sterile or transactional feel of existing genealogy tools. Where Ancestry and others lean formality, StitchFam’s identity centers on family connection.\n\nThe name itself reinforced the metaphor, stitching pieces of a family together into something whole. The visual design favored softer tones and friendly typography to make the experience feel less like software and more like a family project on a quilt.',
        media: [
          { v: 'Desktop_2.mp4', label: 'Desktop — adding a member' },
          { i: 'Test_1.jpg', label: 'Design exploration' },
          { i: 'Invited.jpg', label: 'Invite in iMessage' }
        ]
      },
      {
        id: 'challenges',
        title: 'Challenges',
        text: 'The biggest challenge was distribution. Many relatives didn’t pass the link along, which stalled growth. I realized the invitation flow should have leaned on family group chats, as they proved far more effective than one-to-one invitations oddly for this project.\n\nAdoption remained low, and we eventually moved on to other projects but have a neat family tree to show for it.'
      }
    ]
  },
  {
    id: 'mecha-station',
    title: 'Mecha Station',
    tagline: 'Point of Sale for Grocery Stores',
    role: 'Founder & Product Designer',
    company: 'Openup Technologies Inc.',
    timeline: '2023 — 2024',
    accent: '#4a7c3f',
    intro:
      'Mecha Station is a point-of-sale system for small grocery stores. My parents ran one for 20+ years, so I knew the shift: checkout that can’t stall with a line waiting, an interface a new hire reads in seconds.\n\nI field-researched 70+ owners, shipped to 3 stores, trained 20+ staff, and cleared $1K+ MRR.',
    hero: { i: 'Hero.jpg', label: 'Showcasing the entire product together' },
    sections: [
      {
        id: 'roles',
        title: 'Roles',
        tags: [
          'Product Design',
          'UX/UI Design',
          'Web Designer & Developer',
          'Branding',
          'Sales & Marketing',
          'User Testing',
          'Customer Support'
        ],
        media: [
          { v: 'MobileApp_1.mp4', label: 'Mobile checkout' },
          { v: 'MobileApp_2.mp4', label: 'Mobile reports' },
          { v: 'MobileApp_3.mp4', label: 'Updating item information' },
          { v: 'MobileApp_4.mp4', label: 'Checking receipts' },
          { v: 'MobileApp_5.mp4', label: 'Creating an order' }
        ]
      },
      {
        id: 'design',
        title: 'Design',
        text: 'I designed Mecha Station around two priorities: speed (no customer should wait because the interface slows down the cashier) and clarity (new employees should understand the system within seconds). The interface was stripped down to essentials so that actions could be performed instantly, even under pressure, with a line of customers waiting.\n\nI personally tested prototypes in-store, running mock checkout sessions and refining flows based on real-world usage with our first customer. Every adjustment aimed to reduce steps, cut hesitation, and make the system feel invisible in the middle of a busy shift.',
        media: [
          { v: 'Desktop_1.mp4', label: 'Desktop payments' },
          { v: 'Desktop_2.mp4', label: 'Updating staff information' },
          { v: 'Desktop_3.mp4', label: 'Updating an item' }
        ]
      },
      {
        id: 'tools',
        title: 'Tools',
        tags: ['Figma', 'NI Maschine', 'LLM Models', 'Framer', 'Adobe Creative Suite']
      },
      {
        id: 'branding',
        title: 'Branding',
        text: 'Most point-of-sale systems have little to no brand presence, which allowed us to stand out. I designed the branding around simplicity and clarity, and with sound effects that provided audio feedback so users could instantly understand interactions without even looking, a subtle form of optimization.\n\nThe visual identity centered on white as the canvas, green for highlights, and black for text, creating a clean and functional palette. We named it Mecha Station to evoke a product that felt futuristic and forward-looking.',
        media: [
          { i: 'Process.png', label: 'Making multiple ads' },
          { i: 'shelflabel0.png', label: 'Shelf label' },
          { i: 'shelf_label.jpg', label: 'Shelf label in use' }
        ]
      },
      {
        id: 'challenges',
        title: 'Challenges',
        text: 'The biggest challenge wasn’t design, it was adoption. Store owners were locked into existing systems and reluctant to switch. Over three months I pitched more than 70 owners in person and landed one customer.\n\nThe improvements we made read as incremental to most of them — not enough to drive a switch in this market. While traction was limited, the project taught me how to design and fix under the pressures of real-world retail, and to focus more on real big pain points in B2B markets.'
      }
    ]
  },
  {
    id: 'openup',
    title: 'Plus One',
    tagline: 'Make New Friends',
    role: 'Founder & Product Designer',
    company: 'Openup Technologies Inc.',
    timeline: '2020 — 2023',
    accent: '#6f57a3',
    intro:
      'Plus One is an app for making friends, not dates. I started it in 2015 while working at Rockstar Games in New York, asking why every product for finding a partner had no equivalent for finding a friend.\n\nFour full redesigns over seven years, chasing one hard question: what makes a friendship form, and can that happen online?',
    hero: { v: 'hero.mp4', label: 'Demo — created by Tarlok Singh' },
    sections: [
      {
        id: 'roles',
        title: 'Roles',
        tags: ['Founder', 'Product Design', 'Marketing', 'User Testing & Research', 'Recruiting My Co-Founder']
      },
      {
        id: 'design',
        title: 'Design',
        text: 'The design evolved through multiple iterations, from the first concept to later versions that explored voice-first interaction and lightweight posting. Through user conversations, personal testing, and experience I discovered that friendships don’t form from casual encounters alone, they emerge from shared suffering (whether self inflicted or by others like school, sports, or companies).\n\nThis insight reshaped the design direction, though it proved difficult to replicate that dynamic online. I continuously prototyped in Figma, simplifying flows and experimenting with ways to create authentic bonds rather than surface-level connections.',
        media: [
          { v: 'One.mp4', label: 'Home page' },
          { v: 'Two.mp4', label: 'Messages page' }
        ]
      },
      {
        id: 'tools',
        title: 'Tools',
        tags: ['Figma', 'Adobe Creative Suite', 'HTML & CSS']
      },
      {
        id: 'branding',
        title: 'Branding',
        text: 'OpenUp needed to feel trustworthy at all times. I leaned into a softer visual language and copy that emphasized vulnerability and openness.\n\nOpenUp’s branding aimed to create emotional permission, to let people feel safe putting themselves out there to meet others. The branding changed a lot over the years, but the core message was always the same. Eventually focused on a more creative and playful design while maintaining trust.',
        media: [
          { v: 'Three.mp4', label: 'OpenUp: version 3' },
          { v: 'Four.mp4', label: 'OpenUp: version 2' },
          { v: 'Five.mp4', label: 'OpenUp: version 2 demo' }
        ]
      },
      {
        id: 'challenges',
        title: 'Challenges',
        text: 'The biggest challenge was finding true product-market fit. On one hand, we proved we could generate traction. I once threw a fraternity party where over 1,000 people signed up on the spot to get in. But those signups didn’t stick: the app offered too little for them to actually do, and profiles remained half-finished.\n\nOver time, I also realized the deeper design challenge: creating authentic “common suffering” online was far harder than replicating it in real life. Despite pivots and experiments, I couldn’t solve that core issue. Still, the project taught me critical lessons in distribution strategy, community psychology, and the gap between acquisition and retention.',
        media: [
          { v: 'Six.mp4', label: 'OpenUp custom animations' },
          { v: 'Seven.mp4', label: 'OpenUp: version 1' }
        ]
      }
    ]
  },
  {
    id: 'red-dead-redemption-2',
    title: 'Red Dead Redemption 2',
    tagline: 'Action-Adventure Game',
    role: 'Game Designer',
    company: 'Rockstar Games',
    timeline: '2015 — 2016',
    accent: '#8a4a2b',
    intro:
      'My job at Rockstar was focusing on storytelling through camera work and editing. Red Dead Redemption 2 went on to generate $725M in its opening weekend, and my role gave me a front-row seat to what it takes to craft experiences at that scale.',
    hero: { v: 'Explosion.mp4', label: 'Scene — created by Tarlok Singh' },
    sections: [
      {
        id: 'roles',
        title: 'Roles',
        tags: ['Cinematography', 'Editing', 'Training', 'Collaboration']
      },
      {
        id: 'design',
        title: 'The Work',
        text: 'I worked closely with the game’s director, 3D artists, and technical programmers who built internal tools. Motion capture data would come in from the set, and my responsibility was to place cameras, block action, and design the cutscene’s flow, essentially 3D cinematography and editing.\n\nI used Autodesk MotionBuilder to create dynamic, cinematic camera movements and Avid Media Composer for editing and pacing. If I thought of something to make things more efficient in our workflow, I would share it with our technical artists.',
        media: [
          { v: 'Guns Out.mp4', label: 'Scene from Red Dead Redemption 2' },
          { v: 'Darkness.mp4', label: 'Scene from Red Dead Redemption 2' },
          { v: 'Knifetoneck.mp4', label: 'Scene from Red Dead Redemption 2' },
          { v: 'Saved_Micah.mp4', label: 'Scene from Red Dead Redemption 2' }
        ]
      },
      {
        id: 'tools',
        title: 'Tools',
        tags: ['Autodesk MotionBuilder', 'Avid Media Composer', 'Internal Tools']
      },
      {
        id: 'craft',
        title: 'Iteration & Craft',
        text: 'Each scene went through rounds of review. I would establish the first pass of camera work, then refine based on my team members’ feedback and the director’s feedback, iterating until the narrative felt seamless and emotionally compelling.',
        media: [
          { v: 'Mansionburning.mp4', label: 'Scene from Red Dead Redemption 2' },
          { v: 'Shootout.mp4', label: 'Scene from Red Dead Redemption 2' },
          { v: 'Savemyson.mp4', label: 'Scene from Red Dead Redemption 2' },
          { v: 'talking.mp4', label: 'Scene from Red Dead Redemption 2' }
        ]
      },
      {
        id: 'collaboration',
        title: 'Collaboration',
        text: 'I worked with a team of 8 people daily, sometimes up to 50 on set. I also trained new team members on workflows and Rockstar’s production pipeline.'
      }
    ]
  },
  {
    id: 'grand-theft-auto-v',
    title: 'Grand Theft Auto V',
    tagline: 'Action-Adventure Game',
    role: 'Game Designer',
    company: 'Rockstar Games',
    timeline: '2015 — 2016',
    accent: '#2f6a94',
    intro:
      'I worked on the storytelling of Rockstar’s GTA V DLC, focusing on camera work and editing. Unlike Red Dead Redemption 2, which demanded slow, deliberate craft, GTA DLC required fast turnarounds to meet release schedules.',
    hero: { v: '5.2.mp4', label: 'GTA DLC scene' },
    sections: [
      {
        id: 'roles',
        title: 'Roles',
        tags: ['Cinematography', 'Editing', 'Training', 'Collaboration']
      },
      {
        id: 'work',
        title: 'The Work',
        text: 'I worked closely with the game’s director, 3D artists, and technical programmers who built internal tools. Motion capture data would come in from the set, and my responsibility was to place cameras, block action, and design the cutscene’s flow, essentially 3D cinematography and editing.\n\nI used Autodesk MotionBuilder to create dynamic, cinematic camera movements and Avid Media Composer for editing and pacing. If I thought of something to make things more efficient in our workflow, I would share it with our technical artists.',
        media: [
          { v: '1.2.mp4', label: 'Open world freedom' },
          { v: '3.mp4', label: 'Heist missions' },
          { v: '4.mp4', label: 'Character switching' },
          { v: 'hero.mp4', label: 'GTA DLC scene' }
        ]
      },
      {
        id: 'tools',
        title: 'Tools',
        tags: ['Autodesk MotionBuilder', 'Avid Media Composer', 'Internal Tools']
      },
      {
        id: 'learning',
        title: 'Learning',
        text: 'This work taught me adaptability. Red Dead was about patience and perfecting scenes for an unreleased game, while GTA was about speed and consistency within an established style. I had to quickly adjust to GTA’s camera language and editing rhythm while still delivering scenes that felt cinematic.'
      }
    ]
  },
]

/* ---- resolution ---- */

const build = (draft: Draft): Project => {
  const one = (ref: Ref): MediaItem | null =>
    'v' in ref
      ? resolveVideo(draft.id, ref.v, ref.label, ref.sound)
      : resolveImage(draft.id, ref.i, ref.label)

  const hero = draft.hero ? one(draft.hero) : null

  const sections: Section[] = draft.sections.map((section) => ({
    id: section.id,
    title: section.title,
    text: section.text,
    tags: section.tags,
    links: section.links,
    // A reference that doesn't resolve is dropped rather than rendered as a
    // broken box — `npm run check:media` is what surfaces those.
    media: (section.media ?? []).map(one).filter((item): item is MediaItem => item !== null)
  }))

  const seen = new Set<string>()
  const media: MediaItem[] = []
  for (const item of [hero, ...sections.flatMap((s) => s.media)]) {
    if (!item || seen.has(item.id)) continue
    seen.add(item.id)
    media.push(item)
  }

  return {
    id: draft.id,
    title: draft.title,
    tagline: draft.tagline,
    role: draft.role,
    company: draft.company,
    timeline: draft.timeline,
    intro: draft.intro,
    accent: draft.accent,
    restricted: draft.restricted,
    locked: draft.locked,
    lockNote: draft.lockNote,
    category: draft.category ?? 'work',
    tags: PROJECT_TAGS[draft.id] ?? [],
    year: yearOf(draft.timeline),
    hero,
    sections,
    media
  }
}

export const projects: Project[] = drafts.map(build)

/** The vitrine row and the home page's main timeline both walk this one,
 *  not `projects` — a side project has a case study but no case. */
export const workProjects: Project[] = projects.filter((p) => p.category !== 'side')
/** The home page's smaller, second timeline. */
export const sideProjects: Project[] = projects.filter((p) => p.category === 'side')

export const projectById = (id: string) => projects.find((p) => p.id === id)

/** Every media reference the data quotes, for the resolution check. */
export const allMediaRefs = drafts.flatMap((draft) => [
  ...(draft.hero ? [draft.hero] : []),
  ...draft.sections.flatMap((s) => s.media ?? [])
].map((ref) => ({ projectId: draft.id, filename: 'v' in ref ? ref.v : ref.i })))
