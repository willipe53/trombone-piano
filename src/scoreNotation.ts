export type KeyboardInstrument = 'piano' | 'trombone'

export type ScoreStaff = 'treble' | 'tenor' | 'bass'

export type ScoreAccidental = 'sharp' | 'flat' | 'natural'

export type KeySignature = {
  id: string
  title: string
  /// Positive is sharps, negative is flats, in the usual order.
  accidentals: number
}

const c = { id: 'C', title: 'C MAJOR', accidentals: 0 }
const g = { id: 'G', title: 'G MAJOR', accidentals: 1 }
const d = { id: 'D', title: 'D MAJOR', accidentals: 2 }
const a = { id: 'A', title: 'A MAJOR', accidentals: 3 }
const e = { id: 'E', title: 'E MAJOR', accidentals: 4 }
const b = { id: 'B', title: 'B MAJOR', accidentals: 5 }
const fSharp = { id: 'F#', title: 'F# MAJOR', accidentals: 6 }
const cSharp = { id: 'C#', title: 'C# MAJOR', accidentals: 7 }
const f = { id: 'F', title: 'F MAJOR', accidentals: -1 }
const bFlat = { id: 'Bb', title: 'Bb MAJOR', accidentals: -2 }
const eFlat = { id: 'Eb', title: 'Eb MAJOR', accidentals: -3 }
const aFlat = { id: 'Ab', title: 'Ab MAJOR', accidentals: -4 }
const dFlat = { id: 'Db', title: 'Db MAJOR', accidentals: -5 }
const gFlat = { id: 'Gb', title: 'Gb MAJOR', accidentals: -6 }
const cFlat = { id: 'Cb', title: 'Cb MAJOR', accidentals: -7 }

const aMinor = { id: 'Am', title: 'A MINOR', accidentals: 0 }
const eMinor = { id: 'Em', title: 'E MINOR', accidentals: 1 }
const bMinor = { id: 'Bm', title: 'B MINOR', accidentals: 2 }
const fSharpMinor = { id: 'F#m', title: 'F# MINOR', accidentals: 3 }
const cSharpMinor = { id: 'C#m', title: 'C# MINOR', accidentals: 4 }
const gSharpMinor = { id: 'G#m', title: 'G# MINOR', accidentals: 5 }
const dSharpMinor = { id: 'D#m', title: 'D# MINOR', accidentals: 6 }
const aSharpMinor = { id: 'A#m', title: 'A# MINOR', accidentals: 7 }
const dMinor = { id: 'Dm', title: 'D MINOR', accidentals: -1 }
const gMinor = { id: 'Gm', title: 'G MINOR', accidentals: -2 }
const cMinor = { id: 'Cm', title: 'C MINOR', accidentals: -3 }
const fMinor = { id: 'Fm', title: 'F MINOR', accidentals: -4 }
const bFlatMinor = { id: 'Bbm', title: 'Bb MINOR', accidentals: -5 }
const eFlatMinor = { id: 'Ebm', title: 'Eb MINOR', accidentals: -6 }
const aFlatMinor = { id: 'Abm', title: 'Ab MINOR', accidentals: -7 }

/// No signature first, then sharps, then flats. Each major is followed by its relative minor.
const catalog: KeySignature[] = [
  c, aMinor, g, eMinor, d, bMinor, a, fSharpMinor, e, cSharpMinor, b, gSharpMinor, fSharp, dSharpMinor, cSharp,
  aSharpMinor, f, dMinor, bFlat, gMinor, eFlat, cMinor, aFlat, fMinor, dFlat, bFlatMinor, gFlat, eFlatMinor, cFlat,
  aFlatMinor,
]

export const KeySignature = {
  c, g, d, a, e, b, fSharp, cSharp, f, bFlat, eFlat, aFlat, dFlat, gFlat, cFlat,
  aMinor, eMinor, bMinor, fSharpMinor, cSharpMinor, gSharpMinor, dSharpMinor, aSharpMinor,
  dMinor, gMinor, cMinor, fMinor, bFlatMinor, eFlatMinor, aFlatMinor,
  catalog,
  matching(id: string): KeySignature | undefined {
    return catalog.find((key) => key.id === id)
  },
}

/// Pitch classes that belong to the key. Relative minor shares the major's set.
export function pitchClasses(key: KeySignature): Set<number> {
  const classes = new Set([0, 2, 4, 5, 7, 9, 11])
  if (key.accidentals > 0) {
    const raised = [5, 0, 7, 2, 9, 4, 11]
    for (const pitch of raised.slice(0, Math.min(7, key.accidentals))) {
      classes.delete(pitch)
      classes.add((pitch + 1) % 12)
    }
  } else if (key.accidentals < 0) {
    const lowered = [11, 4, 9, 2, 7, 0, 5]
    for (const pitch of lowered.slice(0, Math.min(7, -key.accidentals))) {
      classes.delete(pitch)
      classes.add((pitch + 11) % 12)
    }
  }
  return classes
}

export function noteIsInKey(midi: number, key: KeySignature): boolean {
  return pitchClasses(key).has(midi % 12)
}

/// First-position harmonics of a straight tenor trombone that sit within 15 cents of equal temperament.
/// The flat 7th partial is left out, so Ab4 is not position 1.
function inTuneTrombonePartials(): Set<number> {
  const notes = new Set<number>()
  const fundamental = 34
  for (let partial = 1; partial <= 64; partial += 1) {
    const cents = 1200 * Math.log2(partial)
    const semitones = Math.round(cents / 100)
    if (Math.abs(cents - semitones * 100) <= 15) notes.add(fundamental + semitones)
  }
  return notes
}

const inTunePartials = inTuneTrombonePartials()

export type TromboneHornName = 'straight' | 'trigger'

export type TromboneHorn = {
  name: TromboneHornName
  imageNames: { inner: string; outer: string; over: string; trigger?: string }
  canvasWidth: number
  slideTravel: readonly number[]
  slideSlope: number
  maxTravel: number
}

/// The straight drawing, full width. First position is the resting drawing.
const straightSlideTravel = [0, 172, 244, 330, 459, 660, 804]

/// Trigger drawing. 3rd and 4th are measured; 2nd, 5th, 6th, and 7th keep the gaps growing out to the eyeballed 7th.
const triggerSlideTravel = [0, 105, 216, 287, 400, 520, 650]

/// The slide tubes in the straight drawing fall 9 pixels over the 795 pixels from x=627 to the water key at x=1422.
export const tromboneSlideSlope = 9 / 795

export const TromboneHorn = {
  straight: {
    name: 'straight',
    imageNames: { inner: 'trombone_inner', outer: 'trombone_outer', over: 'trombone_over' },
    canvasWidth: 1498,
    slideTravel: straightSlideTravel,
    slideSlope: tromboneSlideSlope,
    maxTravel: Number.POSITIVE_INFINITY,
  },
  trigger: {
    name: 'trigger',
    imageNames: { inner: 'trigger_inner', outer: 'trigger_outer', over: 'trigger_over', trigger: 'trigger_rotate' },
    canvasWidth: 1389,
    slideTravel: triggerSlideTravel,
    slideSlope: 8 / 709,
    maxTravel: 710,
  },
} satisfies Record<TromboneHornName, TromboneHorn>

/// The F attachment lengthens the horn by a fourth.
const triggerLengthRatio = 2 ** (5 / 12)

export type SlideSetting = {
  /// Canvas pixels from first position.
  travel: number
  trigger: boolean
  /// "1"…"7" on the Bb slide, "T3"…"T7" with the trigger.
  label: string
}

/// Shortest slide position, 1 through 7, for a straight tenor trombone. Nil when the note needs an F attachment or sits past the slide.
export function trombonePosition(midi: number): number | null {
  for (let position = 1; position <= 7; position += 1) {
    if (inTunePartials.has(midi + position - 1)) return position
  }
  return null
}

/// B1, C2, C♯2, D2, and E♭2. A straight tenor slide cannot reach them.
export function tromboneNeedsFAttachment(midi: number): boolean {
  return midi >= 35 && midi <= 39
}

/// E♭2 is 3rd, then one position longer per semitone down to B1 at 7th.
function triggerAttachmentPosition(midi: number): number | null {
  if (!tromboneNeedsFAttachment(midi)) return null
  return 3 + (39 - midi)
}

function triggerAttachmentTravel(position: number): number {
  const raw = Math.round(triggerSlideTravel[position - 1] * triggerLengthRatio)
  return Math.min(raw, TromboneHorn.trigger.maxTravel)
}

export function tromboneSlide(midi: number, horn: TromboneHorn): SlideSetting | null {
  const position = trombonePosition(midi)
  if (position !== null) {
    return {
      travel: Math.min(horn.slideTravel[position - 1], horn.maxTravel),
      trigger: false,
      label: `${position}`,
    }
  }
  const attachment = triggerAttachmentPosition(midi)
  if (horn.name === 'trigger' && attachment !== null) {
    return { travel: triggerAttachmentTravel(attachment), trigger: true, label: `T${attachment}` }
  }
  return null
}

export function trombonePositionLabel(midi: number, horn: TromboneHorn): string | null {
  return tromboneSlide(midi, horn)?.label ?? null
}

/// Red line drawn over the horn when the slide has no position for this note.
/// On the trigger horn, B1 through E♭2 have positions, so they draw no line.
export function tromboneHornMessage(midi: number, horn: TromboneHorn = TromboneHorn.straight): string | null {
  if (tromboneNeedsFAttachment(midi)) {
    if (horn.name === 'trigger') return null
    return 'requires F attachment'
  }
  if (trombonePosition(midi) !== null) return null
  if (midi < 28) return "Ok now you're scaring me"
  return 'Play it anywhere you like!'
}

export function tromboneOuterShift(position: number, displayedWidth: number, fullWidth = 1498): number {
  if (fullWidth <= 0 || position < 1 || position > 7) return 0
  return (straightSlideTravel[position - 1] * displayedWidth) / fullWidth
}

export function tromboneOuterShiftForTravel(travel: number, displayedWidth: number, horn: TromboneHorn): number {
  if (horn.canvasWidth <= 0) return 0
  return (travel * displayedWidth) / horn.canvasWidth
}

export function tromboneOuterDrop(horizontal: number): number {
  return horizontal * tromboneSlideSlope
}

export function tromboneOuterDropForHorn(horizontal: number, horn: TromboneHorn): number {
  return horizontal * horn.slideSlope
}

export type SignatureMark = {
  step: number
  accidental: ScoreAccidental
}

export type WrittenNote = {
  staff: ScoreStaff
  step: number
  accidental?: ScoreAccidental
}

type LetterAlteration = 'natural' | 'sharp' | 'flat'

/// C, D, E, F, G, A, B.
const sharpLetterOrder = [3, 0, 4, 1, 5, 2, 6]
const flatLetterOrder = [6, 2, 5, 1, 4, 0, 3]
const trebleSharpSteps = [10, 7, 11, 8, 5, 9, 6]
const trebleFlatSteps = [6, 9, 5, 8, 4, 7, 3]
const bassSharpSteps = [-4, -7, -3, -6, -9, -5, -8]
const bassFlatSteps = [-8, -5, -9, -6, -10, -7, -11]
/// Tenor clef, middle C on the fourth line. The first and third sharps sit an octave lower than the treble pattern so the signature stays on the staff.
const tenorSharpSteps = [-4, 0, -3, 1, -2, 2, -1]
const tenorFlatSteps = [-1, 2, -2, 1, -3, 0, -4]

export function signatureMarks(key: KeySignature, staff: ScoreStaff): SignatureMark[] {
  const count = Math.min(7, Math.abs(key.accidentals))
  if (count <= 0) return []
  const steps = key.accidentals > 0 ? sharpSteps(staff) : flatSteps(staff)
  const accidental: ScoreAccidental = key.accidentals > 0 ? 'sharp' : 'flat'
  return steps.slice(0, count).map((step) => ({ step, accidental }))
}

function sharpSteps(staff: ScoreStaff): readonly number[] {
  if (staff === 'treble') return trebleSharpSteps
  if (staff === 'tenor') return tenorSharpSteps
  return bassSharpSteps
}

function flatSteps(staff: ScoreStaff): readonly number[] {
  if (staff === 'treble') return trebleFlatSteps
  if (staff === 'tenor') return tenorFlatSteps
  return bassFlatSteps
}

export function writtenNote(midi: number, instrument: KeyboardInstrument, key: KeySignature): WrittenNote {
  return writtenNotes(midi, instrument, key)[0]
}

/// Trombone writes each pitch on both staves. A copy is drawn only while it stays on its own side of the gap.
export function noteBelongsOnDrawnStaff(staff: ScoreStaff, step: number, gapSpaces = 15): boolean {
  const upperBottom = 8
  const lowerTop = (4 + gapSpaces) * 2
  const midpoint = (upperBottom + lowerTop) / 2
  let halfSteps: number
  if (staff === 'treble') halfSteps = 10 - step
  else if (staff === 'tenor') halfSteps = 2 - step
  else halfSteps = lowerTop + (-2 - step)
  return staff === 'bass' ? halfSteps >= midpoint : halfSteps <= midpoint
}

/// Piano keeps one staff. Trombone writes the same pitch on the bass staff and the tenor staff.
export function writtenNotes(midi: number, instrument: KeyboardInstrument, key: KeySignature): WrittenNote[] {
  const spelled = preferredSpell(midi, key.accidentals < 0)
  const signature = signatureAlteration(spelled.letter, key)
  const step = (spelled.octave - 4) * 7 + spelled.letter
  const accidental = drawnAccidental(spelled.alteration, signature)
  const staves: ScoreStaff[] = instrument === 'trombone' ? ['bass', 'tenor'] : [midi < 60 ? 'bass' : 'treble']
  return staves.map((staff) => (accidental === undefined ? { staff, step } : { staff, step, accidental }))
}

export type ScoreEvent = {
  midi: number
  sounding: boolean
}

export type ScoreColumn = {
  notes: ScoreEvent[]
}

export class ScoreHistory {
  static readonly columnLimit = 10
  columns: ScoreColumn[] = []

  /// How many columns were dropped from the left.
  apply(started: readonly number[], stopped: readonly number[]): number {
    for (const midi of stopped) {
      for (let columnIndex = this.columns.length - 1; columnIndex >= 0; columnIndex -= 1) {
        const notes = this.columns[columnIndex].notes
        const noteIndex = findLastIndex(notes, (note) => note.midi === midi && note.sounding)
        if (noteIndex >= 0) {
          notes[noteIndex].sounding = false
          break
        }
      }
    }
    if (started.length === 0) return 0
    this.columns.push({ notes: started.map((midi) => ({ midi, sounding: true })) })
    const overflow = Math.max(0, this.columns.length - ScoreHistory.columnLimit)
    if (overflow > 0) this.columns.splice(0, overflow)
    return overflow
  }

  clear(): void {
    this.columns = []
  }
}

type PreferredSpell = {
  letter: number
  octave: number
  alteration: LetterAlteration
}

function preferredSpell(midi: number, preferFlats: boolean): PreferredSpell {
  const pitchClass = midi % 12
  const octave = Math.floor(midi / 12) - 1
  const sharpSpell: Array<[number, LetterAlteration]> = [
    [0, 'natural'], [0, 'sharp'], [1, 'natural'], [1, 'sharp'],
    [2, 'natural'], [3, 'natural'], [3, 'sharp'], [4, 'natural'],
    [4, 'sharp'], [5, 'natural'], [5, 'sharp'], [6, 'natural'],
  ]
  const flatSpell: Array<[number, LetterAlteration]> = [
    [0, 'natural'], [1, 'flat'], [1, 'natural'], [2, 'flat'],
    [2, 'natural'], [3, 'natural'], [4, 'flat'], [4, 'natural'],
    [5, 'flat'], [5, 'natural'], [6, 'flat'], [6, 'natural'],
  ]
  const choice = (preferFlats ? flatSpell : sharpSpell)[pitchClass]
  return { letter: choice[0], octave, alteration: choice[1] }
}

function signatureAlteration(letter: number, key: KeySignature): LetterAlteration {
  if (key.accidentals > 0) {
    const count = Math.min(7, key.accidentals)
    if (sharpLetterOrder.slice(0, count).includes(letter)) return 'sharp'
  } else if (key.accidentals < 0) {
    const count = Math.min(7, -key.accidentals)
    if (flatLetterOrder.slice(0, count).includes(letter)) return 'flat'
  }
  return 'natural'
}

function drawnAccidental(spelled: LetterAlteration, signature: LetterAlteration): ScoreAccidental | undefined {
  if (spelled === signature) return undefined
  if (spelled === 'sharp') return 'sharp'
  if (spelled === 'flat') return 'flat'
  return 'natural'
}

function findLastIndex<T>(items: readonly T[], matches: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (matches(items[index])) return index
  }
  return -1
}
