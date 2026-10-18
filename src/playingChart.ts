import { trombonePosition, writtenNote, type KeySignature, type ScoreStaff } from './scoreNotation'

export type { ScoreStaff }

/// A numbered slide stop. `#2` is the short 2nd, between 1st and 2nd, and it shares 2's neighbors.
export type SlideStop = {
  number: number
  short: boolean
}

export function slideStopLabel(stop: SlideStop): string {
  return stop.short ? `#${stop.number}` : `${stop.number}`
}

export function slideStop(number: number, short: boolean): SlideStop {
  return { number, short }
}

/// One stop either way. `#2` sits in the 2 slot, so it is next to 1 and 3, and not next to a true 2.
export function slideStopsAreNeighbors(a: SlideStop, b: SlideStop): boolean {
  return Math.abs(a.number - b.number) === 1
}

/// Home stop from `trombonePosition`, plus the short 7th-partial stop.
/// G4 is `#2`, and 4 remains legal. The same partial continues a semitone longer per position through D4 at short 7th.
/// Ab4 in 1st is the lip and is not a stop. Trigger rows wait.
export function playingStops(midi: number): SlideStop[] {
  const stops: SlideStop[] = []
  const home = trombonePosition(midi)
  if (home !== null) stops.push({ number: home, short: false })
  const short = shortSeventhStop(midi)
  if (short && !stops.some((stop) => sameStop(stop, short))) stops.push(short)
  return stops
}

/// The stop a waste note shows, and the one a peek prints.
/// G4's usual place is `#2`. Every other note shows its home stop.
export function conventionalStop(midi: number): SlideStop | null {
  const stops = playingStops(midi)
  if (midi === 67) {
    const short = stops.find((stop) => stop.short)
    if (short) return short
  }
  const home = trombonePosition(midi)
  if (home !== null) return { number: home, short: false }
  return stops[0] ?? null
}

/// The stop printed when a note is taken beside `waste`. Nil when none of its stops are one away.
/// If more than one stop neighbors the waste, the conventional stop wins when it is one of them.
export function landingStop(midi: number, waste: SlideStop): SlideStop | null {
  const neighbors = playingStops(midi).filter((stop) => slideStopsAreNeighbors(stop, waste))
  if (neighbors.length === 0) return null
  const usual = conventionalStop(midi)
  if (usual && neighbors.some((stop) => sameStop(stop, usual))) return usual
  return neighbors.reduce((best, stop) =>
    Math.abs(stop.number - waste.number) < Math.abs(best.number - waste.number) ? stop : best,
  )
}

/// Five-line range, inclusive. A step outside it is a ledger note.
export function staffStepRange(staff: ScoreStaff): { minimum: number; maximum: number } {
  if (staff === 'bass') return { minimum: -10, maximum: -2 }
  if (staff === 'tenor') return { minimum: -6, maximum: 2 }
  return { minimum: 2, maximum: 10 }
}

export function sitsOnStaff(midi: number, staff: ScoreStaff, key: KeySignature): boolean {
  const step = writtenNote(midi, 'trombone', key).step
  const range = staffStepRange(staff)
  return step >= range.minimum && step <= range.maximum
}

/// G4 is MIDI 67. Short 2nd, then one semitone and one position number per stop, through D4 at short 7th.
function shortSeventhStop(midi: number): SlideStop | null {
  const number = 2 + (67 - midi)
  if (number < 2 || number > 7) return null
  return { number, short: true }
}

function sameStop(left: SlideStop, right: SlideStop): boolean {
  return left.number === right.number && left.short === right.short
}
