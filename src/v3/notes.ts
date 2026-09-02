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
  /** Where the leader touches on the narrow layout, in the same fractions.
   *  One point and not two: a phone has no card to seat, only the mark on the
   *  picture and the sentence in the deck under it (`MechFacts.tsx`), so there
   *  is nowhere for a `toNarrow` to put anything. When present this wins below
   *  the breakpoint; when not, the mark falls back to `at` and then to the auto
   *  fan. Placed by pressing P at a narrow window — see `MechPins.tsx`. */
  atNarrow?: [number, number]
}

export const NOTES: Record<string, Note[]> = {
  'mr-takahashi/model': [
    { label: 'Name', value: 'Mr. Takahashi, who teaches Japanese and never runs out of patience.', at: [0.8459, 0.7061], to: [0.9098, 0.717] },
    { label: 'Tool', value: 'Sculpted and shaded in Blender.', fold: 'design', at: [-0.0086, 0.3227], to: [-0.1631, 0.1891] },
    { label: 'Animation', value: 'Designed and animated in Blender.', fold: 'design', at: [0.0554, 0.6719], to: [-0.0468, 0.7096] }
  ],
  'mr-takahashi/MrTakahashi_Demo.mp4': [
    { label: 'made in', value: 'I used the Black Magic Ursa Mini 4.6k to film the demo video. ', fold: 'tools', at: [0.4237, 0.0037], to: [0.3683, -0.0908] },
    { label: 'label', value: 'A showcase demo of the app.', at: [0.9509, 0.005], to: [0.9987, -0.1231] }
  ],
  'mr-takahashi/Signed_In.mp4': [
    { label: '', value: 'The apps welcome screen. ', at: [1.0194, 0.1255], to: [1.0535, 0.0066] },
    { label: 'label', value: 'Tools used were Blender, After Effects & Adobe premiere. ', at: [0.3146, -0.0079], to: [0.2453, -0.0899] }
  ],
  'mr-takahashi/Design_10.mp4': [
    { label: 'label', value: 'An in-app session of a lesson. ', at: [1.0114, 0.1669], to: [1.0666, 0.0447] }
  ],
  'mr-takahashi/Menu.png': [
    { label: 'still', value: 'The home screen which shows the lesson plan in weeks. ', at: [0.9438, 0.0181], to: [0.9724, -0.0842] }
  ],
  'mr-takahashi/Process_00.webp': [
    { label: 'still', value: 'Early version of an ear piece I designed for conversating with Adam. Learn more about Adam in the process section', at: [0.8536, 0.3932], to: [0.9805, 0.3311] },
    { label: '', value: 'We wanted a custom ear piece you can wear all day to conversate any time with Adam', at: [0.4446, 0.3614], to: [0.9826, 0.1893] }
  ],
  'mr-takahashi/Process_0.webp': [
    { label: 'p', value: 'Designing Takahashi in Blender.', at: [0.8983, 0.1433], to: [1.0468, -0.0109] }
  ],
  'mr-takahashi/Process_2.webp': [
    { label: 'still', value: 'Wearing version five of Adam open ear headphone.', at: [0.5141, 0.3832], to: [1.0164, 0.2407] }
  ],
  'mr-takahashi/Process_3.webp': [
    { label: 'still', value: 'Wearing version one of Adam headphone.', at: [0.479, 0.3928], to: [1.0632, 0.2081] },
    { label: 'made in', value: 'Iterations were done in Blender.', fold: 'tools', at: [0.5053, 0.4227], to: [1.0444, 0.3599] }
  ],
  'mr-takahashi/Process_1.mp4': [
    { label: 'clip', value: 'Test animation of how he should feel. ', at: [0.5919, 0.0361], to: [0.5333, -0.0735] }
  ],
  'mr-takahashi/Adam_Speaking.mp4': [
    { label: '', value: 'Conversating with Adam. Learn about Adam in the process section.', at: [0.5576, 0.1617], to: [0.5312, -0.0897] }
  ],
  'mr-takahashi/Marketing_6.jpg': [
    { label: '', value: 'Marketing material for the app store.', at: [1.0342, 0.2053], to: [1.0742, 0.0188] }
  ],
  'capsule-c1/model': [
    { label: 'label', value: '3D model of the Capsule c1.', at: [0.8248, 0.1634], to: [0.9567, 0.0471] },
    { label: 'label', value: 'Designed in blender with precise sizing to fit a raspberry pi and phone.', at: [0.0731, 0.2371], to: [-0.0151, 0.1096] },
    { label: 'label', value: 'Designed to hold your phone and raspberry pi and maintiain proper airflow. ', at: [0.8606, 0.7134], to: [1.0024, 0.8171] }
  ],
  'capsule-c1/Demo_Video.mp4': [
    { label: 'label', value: 'Filmed with the Black magic ursa mini 4.6k.', at: [0.9618, 0.2654], to: [1.0262, 0.0593] },
    { label: 'label', value: 'Video showcasing how to place a capsule call.', at: [0.4157, 0.0831], to: [0.321, -0.1095] }
  ],
  'capsule-c1/DT_Mobile_Call.mp4': [
    { label: 'clip', value: 'Home screen of the capsule app. ', at: [0.5043, 0.0839], to: [0.5428, -0.0871] }
  ],
  'capsule-c1/DT_Signup.mp4': [
    { label: '', value: 'Sign-up screen. ', at: [0.5748, 0.0977], to: [0.6139, -0.0568] }
  ],
  'capsule-c1/Design_5.mp4': [
    { label: 'clip', value: 'Placing a call on your TV.', at: [0.8457, 0.0545], to: [0.9656, -0.0723] }
  ],
  'capsule-c1/Top_View.png': [
    { label: 'made in', value: '3D Printed Capsule c1 model ', fold: 'tools', at: [0.5436, 0.4213], to: [0.4397, -0.08] }
  ],
  'capsule-c1/Phone_Insert.png': [
    { label: 'still', value: 'Final hardware design & assembly with iPhone.', at: [0.942, 0.0838], to: [0.9747, -0.1185] }
  ],
  'capsule-c1/Side_View.jpg': [
    { label: 'still', value: 'Profile view of the Capsule C1.', at: [0.598, 0.0538], to: [0.5717, -0.0348] }
  ],
  'capsule-c1/Challenges_1.jpeg': [
    { label: 'still', value: 'Testing designs.', at: [0.6133, 0.403], to: [1.0585, 0.3331] }
  ],
  'capsule-c1/Challenges_2.jpeg': [
    { label: 'still', value: 'Many iterations in the trash.', at: [0.9595, 0.4463], to: [1.0585, 0.3331] }
  ],
  'capsule-c1/Challenges_3.png': [
    { label: 'still', value: 'First design of the hardware in Figma.', at: [0.9542, 0.116], to: [1.0018, -0.0785] }
  ],
  'capsule-c1/printing.mp4': [
    { label: 'clip', value: '3D printing a Capsule C1.', at: [1.0434, 0.3322], to: [1.0772, 0.3074] }
  ],
  'capsule-c1/Branding_1.mp4': [
    { label: 'clip', value: 'Promotional content made in blender for the website.', at: [0.9482, 0.3469], to: [1.0259, 0.1985] }
  ],
  'capsule-c1/Branding_3.mp4': [
    { label: 'clip', value: 'Promotional content.', at: [0.5115, 0.0351], to: [0.4573, -0.057] }
  ],
  'capsule-c1/Branding_5.mp4': [
    { label: '', value: 'Promotional content ', at: [0.9494, 0.2328], to: [1.0225, 0.1449] }
  ],
  'capsule-c1/Branding_4.mp4': [
    { label: '', value: 'Promotional content', at: [0.8707, 0.4549], to: [1.0301, 0.2406] }
  ],
  'slider-engine/piece': [
    { label: '', value: 'Breathing animation of "The Alcholic Fish"', at: [0.7921, 0.3659], to: [0.8984, 0.2735] },
    { label: 'label', value: 'Designed in Figma, animated in After effects. ', at: [0.27, 0.5066], to: [0.075, 0.411] }
  ],
  'slider-engine/hero.mp4': [
    { label: 'clip', value: 'Unreleased promo video made by me in After Effects.', at: [0.5727, 0.0466], to: [0.6277, -0.0993] }
  ],
  'slider-engine/Design_1.mp4': [
    { label: 'clip', value: 'Adjusting settings in Slider Engine.', at: [0.8549, 0.4618], to: [1.0019, 0.1335] },
    { label: 'label', value: 'Slider Engine was designed to be only used for web based 2D games. ', at: [0.4936, 0.1896], to: [0.3167, -0.0772] }
  ],
  'slider-engine/Design_5.mp4': [
    { label: 'clip', value: 'Creating a new game.', at: [0.9271, 0.3643], to: [1.0506, 0.2395] }
  ],
  'slider-engine/Design_3.mp4': [
    { label: 'clip', value: 'Clip: Creating game objects.', at: [0.9638, 0.3338], to: [1.0661, 0.2184] }
  ],
  'slider-engine/Design_4.mp4': [
    { label: 'clip', value: 'Reversing & object trails.', at: [0.3273, 0.1828], to: [0.2214, -0.0846] },
    { label: 'made in', value: 'Inspired by Brett Victor and Figma.', fold: 'tools', at: [0.6511, 0.1572], to: [0.7845, -0.1073] }
  ],
  'slider-engine/Game_0.mp4': [
    { label: 'clip', value: 'A scene from the unfinished game "The Alcholic Fish.', at: [0.7561, 0.0428], to: [0.9604, -0.1007] }
  ],
  'slider-engine/Game_1.mp4': [
    { label: 'clip', value: 'Early test of Solomon game.', at: [0.5024, 0.1679], to: [0.612, -0.1332] },
    { label: 'made in', value: 'Made in Figma.', fold: 'tools' }
  ],
  'slider-engine/Game_2.mp4': [
    { label: 'clip', value: 'Game design test.', at: [0.7257, 0.1123], to: [0.6586, -0.0851] }
  ],
  'slider-engine/marketing2.mp4': [
    { label: 'clip', value: 'Unfinished marketing video made in After Effects.', at: [0.5833, 0.1749], to: [0.4244, -0.0886] }
  ],
  'mecha-station/piece': [
    { label: 'piece', value: '3D interperation of the cash register, card terminal and the POS software. ', at: [0.94, 0.08], to: [0.9706, 0.0022] }
  ],
  'mecha-station/Hero.jpg': [
    { label: 'still', value: 'Still showcasing the entire pieces together.', at: [0.94, 0.08], to: [1.0205, -0.1622] }
  ],
  'mecha-station/MobileApp_1.mp4': [
    { label: 'clip', value: 'In app showing the mobile checkout', at: [0.7589, 0.0268], to: [0.8197, -0.1027] }
  ],
  'mecha-station/MobileApp_2.mp4': [
    { label: 'clip', value: 'In app showing the reporting section', at: [0.4996, 0.1035], to: [0.4823, -0.0529] }
  ],
  'mecha-station/MobileApp_3.mp4': [
    { label: 'clip', value: 'In app Updating item information', at: [0.6514, -0.0166], to: [0.7259, -0.1518] },
    { label: 'made in', value: 'Designed in Figma', fold: 'tools', at: [0.4004, 0.0361], to: [0.3188, -0.0946] }
  ],
  'mecha-station/MobileApp_4.mp4': [
    { label: '', value: ' Checking receipts in app', at: [0.501, 0.1178], to: [0.6163, -0.0766] }
  ],
  'mecha-station/MobileApp_5.mp4': [
    { label: 'clip', value: 'Creating a supplier order in app.', at: [0.4699, 0.1162], to: [0.5154, -0.0901] }
  ],
  'mecha-station/Desktop_1.mp4': [
    { label: 'clip', value: 'Completing an order on desktop app.', at: [0.5337, 0.1654], to: [0.5732, -0.0835] }
  ],
  'mecha-station/Desktop_2.mp4': [
    { label: 'clip', value: ' Updating staff information in the desktop app.', at: [0.5327, 0.0465], to: [0.4887, -0.0792] }
  ],
  'mecha-station/Desktop_3.mp4': [
    { label: 'clip', value: 'Updating a product in the desktop app.', at: [0.6563, 0.2127], to: [0.555, -0.0801] },
    { label: 'made in', value: 'Made in Figma.', fold: 'tools' }
  ],
  'mecha-station/Process.png': [
    { label: 'still', value: 'Designing multiple ads to be tested in Facebook.', at: [0.4405, 0.0191], to: [0.4066, -0.0696] },
    { label: 'made in', value: 'Made in Figma.', fold: 'tools' }
  ],
  'mecha-station/shelflabel0.png': [
    { label: 'still', value: 'Design of the shelf labels that could be printed thru the product section of the app.', at: [0.6402, 0.3999], to: [0.6867, -0.1043] }
  ],
  'mecha-station/shelf_label.jpg': [
    { label: 'still', value: 'Shelf label in use at a grocery store.', at: [0.8248, 0.3973], to: [1.0337, 0.284] }
  ],
  'red-dead-redemption-2/model': [
    { label: '', value: 'Western Gun used as a representation of Red Dead 2. ', at: [0.6002, 0.2388], to: [0.9271, 0.0122] }
  ],
  'red-dead-redemption-2/Explosion.mp4': [
    { label: 'made in', value: 'Camera work done in  Autodesk MotionBuilder.', fold: 'tools', at: [0.6208, 0.0179], to: [0.6807, -0.0763] }
  ],
  'red-dead-redemption-2/Guns Out.mp4': [
    { label: 'label', value: 'Thought deeply in every scene about why it should be told in this manner. ', at: [0.4511, 0.1056], to: [0.5144, -0.0761] }
  ],
  'red-dead-redemption-2/Darkness.mp4': [
    { label: 'label', value: 'Camera work done in  Autodesk MotionBuilder.', at: [1.0633, 0.47], to: [1.1362, 0.4166] }
  ],
  'red-dead-redemption-2/Knifetoneck.mp4': [
    { label: 'label', value: 'Camera work done in  Autodesk MotionBuilder.', at: [0.828, 0.5711], to: [1.0297, 0.4156] }
  ],
  'red-dead-redemption-2/Saved_Micah.mp4': [
    { label: 'label', value: 'Camera work done in  Autodesk MotionBuilder.', at: [0.9948, 0.4302], to: [1.039, 0.362] }
  ],
  'red-dead-redemption-2/Mansionburning.mp4': [
    { label: 'label', value: 'Camera work done in  Autodesk MotionBuilder.', at: [0.9755, 0.4879], to: [1.0786, 0.3946] }
  ],
  'red-dead-redemption-2/Shootout.mp4': [
    { label: 'label', value: 'Camera work done in  Autodesk MotionBuilder.', at: [1.0135, 0.4845], to: [1.1077, 0.3953] }
  ],
  'red-dead-redemption-2/Savemyson.mp4': [
    { label: 'label', value: 'Camera work done in  Autodesk MotionBuilder.', at: [0.9751, 0.4545], to: [1.0798, 0.3726] }
  ],
  'red-dead-redemption-2/talking.mp4': [
    { label: 'label', value: 'Camera work done in  Autodesk MotionBuilder.', at: [1.0102, 0.4287], to: [1.0607, 0.3545] }
  ],
  'openup/piece': [
    { label: 'piece', value: 'Deisgned in Figma', at: [0.7914, 0.1744], to: [0.9282, 0.0654] },
    { label: 'made in', value: 'Final version of plus one / openup app. ', fold: 'tools', at: [0.1413, 0.3924], to: [-0.1305, 0.2301] }
  ],
  'openup/hero.mp4': [
    { label: 'clip', value: 'Commercial created in After Effects and Rotato.', at: [0.4927, 0.0955], to: [0.5587, -0.0964] }
  ],
  'openup/One.mp4': [
    { label: 'clip', value: 'Quick look at the home screen.', at: [0.5055, 0.1335], to: [0.5994, -0.0952] }
  ],
  'openup/Two.mp4': [
    { label: 'clip', value: 'The messaging section of Plus One.', at: [0.5071, 0.1267], to: [0.5818, -0.1239] }
  ],
  'openup/Three.mp4': [
    { label: 'clip', value: 'Version 3 of the app called Bonjour that had a map showing you were people were somewhat located.', at: [0.565, 0.0596], to: [0.631, -0.1051] }
  ],
  'openup/Four.mp4': [
    { label: 'clip', value: 'Promotional  content made in After effects.', at: [0.7844, 0.0419], to: [0.7965, -0.1086] },
    { label: 'label', value: ' Version 2 named bff.', at: [0.3359, 0.0199], to: [0.2136, -0.1293] }
  ],
  'openup/Five.mp4': [
    { label: 'clip', value: 'OpenUp: version 2 demo.', at: [0.5535, 0.083], to: [0.6104, -0.0968] }
  ],
  'openup/Six.mp4': [
    { label: 'clip', value: 'Animations made for the first version of Openup.', at: [0.5511, 0.0689], to: [0.6088, -0.0865] }
  ],
  'openup/Seven.mp4': [
    { label: 'clip', value: 'Designed in Figma 2019.', at: [0.6177, 0.0376], to: [0.7295, -0.0997] },
    { label: 'made in', value: 'Version one (Openup).', fold: 'tools', at: [0.4038, 0.0371], to: [0.3133, -0.0673] }
  ],
  'grand-theft-auto-v/5.2.mp4': [
    { label: 'clip', value: 'Scene I filmed for GTA DLC.', at: [0.94, 0.08], to: [1.0748, -0.1328] },
    { label: 'made in', value: 'Made in Autodesk MotionBuilder.', fold: 'tools', at: [0.9702, 0.3417], to: [1.0771, 0.2368] }
  ],
  'grand-theft-auto-v/1.2.mp4': [
    { label: 'clip', value: 'Made in Autodesk MotionBuilder.', at: [0.9729, 0.2831], to: [1.0455, 0.127] }
  ],
  'grand-theft-auto-v/3.mp4': [
    { label: 'clip', value: 'Made in Autodesk MotionBuilder.', at: [1.0106, 0.2785], to: [1.1605, -0.0568] }
  ],
  'grand-theft-auto-v/4.mp4': [
    { label: 'clip', value: 'Made in Autodesk MotionBuilder.', at: [0.985, 0.2842], to: [1.0498, 0.0932] }
  ],
  'grand-theft-auto-v/hero.mp4': [
    { label: 'clip', value: 'Made in Autodesk MotionBuilder.', at: [0.9705, 0.2791], to: [1.0612, 0.119] }
  ],
  'block-builder/hero.mp4': [
    { label: 'clip', value: 'Clip: Modular system demonstration.', at: [1.0286, 0.1002], to: [1.1605, -0.0738] }
  ],
  'block-builder/1.mp4': [
    { label: 'clip', value: 'Starting a build on the IPad.' }
  ],
  'block-builder/2.mp4': [
    { label: 'clip', value: 'Building a car in Block builder.', at: [0.9774, 0.1474], to: [1.0475, -0.0031] }
  ],
  'block-builder/3.mp4': [
    { label: 'clip', value: 'Random design in Block Builder.', at: [1.0211, 0.1523], to: [1.1605, -0.0226] }
  ],
  'block-builder/piece': [
    { label: 'piece', value: '3D model and animation of block builder made with Claude Code in 3JS.' }
  ],
  'stitchfam/Design_3.mp4': [
    { label: 'clip', value: 'Mobile view of a family tree.', at: [0.9732, 0.0956], to: [1.033, 0.0142] }
  ],
  'stitchfam/Design_1.mp4': [
    { label: 'clip', value: 'Adding a family member.', at: [0.9589, 0.1796], to: [1.0441, -0.0546] }
  ],
  'stitchfam/Design_2.mp4': [
    { label: 'clip', value: 'Inviting a family member.', at: [0.9669, 0.2144], to: [1.1605, -0.0568] }
  ],
  'stitchfam/Test_1.jpg': [
    { label: 'still', value: 'Design exploration to be more like stckers or magnets.', at: [0.952, 0.1924], to: [1.0313, 0.0232] }
  ],
  'stitchfam/Invited.jpg': [
    { label: 'still', value: ' Invite in iMessage.', at: [1.0189, 0.2181], to: [1.0609, 0.0823] }
  ],
  'wyte-card/hero.mp4': [
    { label: 'clip', value: 'Promotional content of Wyte Card.', at: [0.94, 0.08], to: [1.0442, -0.1128] },
    { label: 'label', value: 'Made in Blender.', at: [0.9619, 0.2323], to: [1.0638, 0.1778] }
  ],
  'wyte-card/Wyte_1.png': [
    { label: 'still', value: 'How it looks after an NFC is tapped.', at: [0.9347, 0.2248], to: [1.0306, 0.0138] }
  ],
  'wyte-card/Wyte_2.png': [
    { label: 'still', value: 'Close ups of Social media links.', at: [1.0182, 0.1325], to: [1.106, -0.0706] }
  ],
  'wyte-card/Wyte_3.png': [
    { label: 'still', value: 'Creating your profile in Wyte Card.', at: [0.9516, 0.1109], to: [1.0976, -0.0561] }
  ],
  'wyte-card/Gala_Reel.jpg': [
    { label: 'still', value: 'Early version we called Gala Reel. Gala Reel was a photo capturing appclip launched with custom NFC cards for events.', at: [1.0345, 0.1822], to: [1.0706, 0.1621] }
  ],
  'wyte-card/Video1.mp4': [
    { label: 'clip', value: 'NFC card & app clip.', at: [0.9751, 0.2713], to: [1.1605, -0.0568] }
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
    if (note.atNarrow) parts.push(`atNarrow: [${round(note.atNarrow[0])}, ${round(note.atNarrow[1])}]`)
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
export const addNote = (id: string, at: [number, number], from: Note[], narrow = false) => {
  const side = at[0] > 0.5 ? 1 : -1
  // Narrow places one point: there is no card on the picture to seat, so
  // nothing wants a second. See `Note` above.
  const geometry = narrow ? { atNarrow: at } : { at, to: [at[0] + side * 0.3, at[1] - 0.1] as [number, number] }
  pins.set(id, [...from, { label: 'label', value: 'Say what this is, in a sentence.', ...geometry }])
}
