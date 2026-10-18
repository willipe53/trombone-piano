import { describe, expect, it } from 'vitest'
import {
  KeySignature,
  noteBelongsOnDrawnStaff,
  noteIsInKey,
  pitchClasses,
  ScoreHistory,
  signatureMarks,
  tromboneHornMessage,
  tromboneNeedsFAttachment,
  tromboneOuterDrop,
  tromboneOuterDropForHorn,
  tromboneOuterShift,
  tromboneOuterShiftForTravel,
  trombonePosition,
  trombonePositionLabel,
  tromboneSlide,
  TromboneHorn,
  writtenNote,
  writtenNotes,
} from './scoreNotation'

function sorted(values: Set<number>): number[] {
  return [...values].sort((a, b) => a - b)
}

describe('score notation', () => {
  it('splits the piano at middle C and keeps the trombone on the bass staff', () => {
    const c4 = writtenNote(60, 'piano', KeySignature.c)
    expect(c4.staff).toBe('treble')
    expect(c4.step).toBe(0)
    expect(c4.accidental).toBeUndefined()

    const b3 = writtenNote(59, 'piano', KeySignature.c)
    expect(b3.staff).toBe('bass')
    expect(b3.step).toBe(-1)

    const tromboneC4 = writtenNote(60, 'trombone', KeySignature.c)
    expect(tromboneC4.staff).toBe('bass')
    expect(tromboneC4.step).toBe(0)

    const both = writtenNotes(60, 'trombone', KeySignature.c)
    expect(both.map((note) => note.staff)).toEqual(['bass', 'tenor'])
    expect(both.map((note) => note.step)).toEqual([0, 0])
    expect(both.every((note) => noteBelongsOnDrawnStaff(note.staff, note.step))).toBe(true)

    const low = writtenNotes(21, 'trombone', KeySignature.bFlat)
    expect(low.map((note) => note.step)).toEqual([-23, -23])
    expect(noteBelongsOnDrawnStaff('bass', -23)).toBe(true)
    expect(noteBelongsOnDrawnStaff('tenor', -23)).toBe(false)

    const high = writtenNotes(84, 'trombone', KeySignature.c)
    expect(high.map((note) => note.step)).toEqual([14, 14])
    expect(noteBelongsOnDrawnStaff('bass', 14)).toBe(false)
    expect(noteBelongsOnDrawnStaff('tenor', 14)).toBe(true)
    expect(writtenNotes(60, 'piano', KeySignature.c).map((note) => note.staff)).toEqual(['treble'])
  })

  it('suppresses the signature accidentals and marks the others', () => {
    const fSharp = writtenNote(66, 'piano', KeySignature.g)
    expect(fSharp.step).toBe(3)
    expect(fSharp.accidental).toBeUndefined()

    expect(writtenNote(65, 'piano', KeySignature.g).accidental).toBe('natural')

    const bFlat = writtenNote(70, 'piano', KeySignature.f)
    expect(bFlat.step).toBe(6)
    expect(bFlat.accidental).toBeUndefined()

    expect(writtenNote(71, 'piano', KeySignature.f).accidental).toBe('natural')
    expect(writtenNote(61, 'piano', KeySignature.c).accidental).toBe('sharp')

    const dFlat = writtenNote(61, 'piano', KeySignature.f)
    expect(dFlat.step).toBe(1)
    expect(dFlat.accidental).toBe('flat')
  })

  it('sits signature marks on the usual staff positions', () => {
    expect(signatureMarks(KeySignature.c, 'treble')).toEqual([])
    expect(signatureMarks(KeySignature.g, 'treble')).toEqual([{ step: 10, accidental: 'sharp' }])
    expect(signatureMarks(KeySignature.g, 'bass')).toEqual([{ step: -4, accidental: 'sharp' }])
    expect(signatureMarks(KeySignature.f, 'treble')).toEqual([{ step: 6, accidental: 'flat' }])
    expect(signatureMarks(KeySignature.cSharp, 'bass')).toHaveLength(7)
    expect(signatureMarks(KeySignature.cFlat, 'treble')).toHaveLength(7)
    expect(signatureMarks(KeySignature.g, 'tenor').map((mark) => mark.step)).toEqual([-4])
    expect(signatureMarks(KeySignature.f, 'tenor').map((mark) => mark.step)).toEqual([-1])
    expect(signatureMarks(KeySignature.cSharp, 'tenor').map((mark) => mark.step)).toEqual([-4, 0, -3, 1, -2, 2, -1])
    expect(signatureMarks(KeySignature.cFlat, 'tenor').map((mark) => mark.step)).toEqual([-1, 2, -2, 1, -3, 0, -4])
    expect(signatureMarks(KeySignature.eMinor, 'treble')).toEqual(signatureMarks(KeySignature.g, 'treble'))
    expect(signatureMarks(KeySignature.dMinor, 'bass')).toEqual(signatureMarks(KeySignature.f, 'bass'))
  })

  it('treats out-of-key notes as the ones the signature does not spell', () => {
    expect(noteIsInKey(60, KeySignature.c)).toBe(true)
    expect(noteIsInKey(61, KeySignature.c)).toBe(false)
    expect(noteIsInKey(64, KeySignature.c)).toBe(true)
    expect(noteIsInKey(65, KeySignature.g)).toBe(false)
    expect(noteIsInKey(66, KeySignature.g)).toBe(true)
    expect(sorted(pitchClasses(KeySignature.eMinor))).toEqual(sorted(pitchClasses(KeySignature.g)))
    expect(noteIsInKey(71, KeySignature.f)).toBe(false)
    expect(noteIsInKey(70, KeySignature.f)).toBe(true)
    expect(sorted(pitchClasses(KeySignature.dMinor))).toEqual(sorted(pitchClasses(KeySignature.f)))
    expect(noteIsInKey(60, KeySignature.cSharp)).toBe(true)
    expect(noteIsInKey(65, KeySignature.cSharp)).toBe(true)
    expect(noteIsInKey(62, KeySignature.cSharp)).toBe(false)
    expect(pitchClasses(KeySignature.cSharp).size).toBe(7)
  })

  it('pairs each major with its relative minor', () => {
    expect(KeySignature.catalog.map((key) => key.title)).toEqual([
      'C MAJOR', 'A MINOR', 'G MAJOR', 'E MINOR', 'D MAJOR', 'B MINOR', 'A MAJOR', 'F# MINOR', 'E MAJOR',
      'C# MINOR', 'B MAJOR', 'G# MINOR', 'F# MAJOR', 'D# MINOR', 'C# MAJOR', 'A# MINOR', 'F MAJOR', 'D MINOR',
      'Bb MAJOR', 'G MINOR', 'Eb MAJOR', 'C MINOR', 'Ab MAJOR', 'F MINOR', 'Db MAJOR', 'Bb MINOR', 'Gb MAJOR',
      'Eb MINOR', 'Cb MAJOR', 'Ab MINOR',
    ])
  })

  it('keeps played notes white until they are released and scrolls old columns off', () => {
    const history = new ScoreHistory()
    expect(history.apply([60, 64], [])).toBe(0)
    expect(history.columns).toHaveLength(1)
    expect(history.columns[0].notes.map((note) => note.midi)).toEqual([60, 64])
    expect(history.columns[0].notes.every((note) => note.sounding)).toBe(true)

    history.apply([67], [60, 64])
    expect(history.columns[0].notes[0].sounding).toBe(false)
    expect(history.columns[0].notes[1].sounding).toBe(false)
    expect(history.columns[1].notes[0].sounding).toBe(true)

    for (let midi = 72; midi < 72 + ScoreHistory.columnLimit; midi += 1) history.apply([midi], [])
    expect(history.columns).toHaveLength(ScoreHistory.columnLimit)
    expect(history.columns[history.columns.length - 1].notes[0].midi).toBe(72 + ScoreHistory.columnLimit - 1)
    expect(history.columns[0].notes[0].midi).not.toBe(60)
  })

  it('uses the shortest in-tune slide as the primary trombone position', () => {
    expect(trombonePosition(40)).toBe(7)
    expect(trombonePosition(46)).toBe(1)
    expect(trombonePosition(47)).toBe(7)
    expect(trombonePosition(53)).toBe(1)
    expect(trombonePosition(54)).toBe(5)
    expect(trombonePosition(58)).toBe(1)
    expect(trombonePosition(59)).toBe(4)
    expect(trombonePosition(60)).toBe(3)
    expect(trombonePosition(62)).toBe(1)
    expect(trombonePosition(65)).toBe(1)
    expect(trombonePosition(66)).toBe(5)
    expect(trombonePosition(67)).toBe(4)
    expect(trombonePosition(68)).toBe(3)
    expect(trombonePosition(70)).toBe(1)
    expect(trombonePosition(71)).toBe(2)
    expect(trombonePosition(72)).toBe(1)
    expect(trombonePosition(77)).toBe(1)
    expect(trombonePosition(34)).toBe(1)
    expect(trombonePosition(28)).toBe(7)
    expect(trombonePosition(35)).toBeNull()
    expect(trombonePosition(36)).toBeNull()
    expect(trombonePosition(39)).toBeNull()
    for (let midi = 35; midi <= 39; midi += 1) expect(tromboneNeedsFAttachment(midi)).toBe(true)
    expect(tromboneNeedsFAttachment(34)).toBe(false)
    expect(tromboneNeedsFAttachment(40)).toBe(false)
    expect(tromboneOuterShift(1, 1498)).toBe(0)
    expect(tromboneOuterShift(2, 1498)).toBe(172)
    expect(tromboneOuterShift(3, 1498)).toBe(244)
    expect(tromboneOuterShift(4, 1498)).toBe(330)
    expect(tromboneOuterShift(5, 1498)).toBe(459)
    expect(tromboneOuterShift(6, 1498)).toBe(660)
    expect(tromboneOuterShift(7, 1498)).toBe(804)
    expect(tromboneOuterDrop(0)).toBe(0)
    expect(Math.abs(tromboneOuterDrop(795) - 9)).toBeLessThanOrEqual(0.001)
    expect(Math.abs(tromboneOuterDrop(804) - (804 * 9) / 795)).toBeLessThanOrEqual(0.001)
    expect(tromboneOuterShift(4, 749)).toBe(165)
    expect(tromboneHornMessage(27)).toBe("Ok now you're scaring me")
    expect(tromboneHornMessage(28)).toBeNull()
    expect(tromboneHornMessage(36)).toBe('requires F attachment')
    expect(tromboneHornMessage(106)).toBeNull()
    expect(tromboneHornMessage(107)).toBe('Play it anywhere you like!')
  })

  it('uses F-attachment positions on the trigger horn within the slide', () => {
    const travel = [0, 105, 216, 287, 400, 520, 650]
    for (let index = 0; index < travel.length; index += 1) {
      expect(TromboneHorn.trigger.slideTravel[index]).toBe(travel[index])
      expect(tromboneOuterShiftForTravel(travel[index], 1389, TromboneHorn.trigger)).toBe(travel[index])
    }
    expect(Math.abs(tromboneOuterDropForHorn(709, TromboneHorn.trigger) - 8)).toBeLessThanOrEqual(0.001)
    expect(tromboneSlide(39, TromboneHorn.trigger)).toEqual({ travel: 288, trigger: true, label: 'T3' })
    expect(tromboneSlide(38, TromboneHorn.trigger)).toEqual({ travel: 383, trigger: true, label: 'T4' })
    expect(tromboneSlide(37, TromboneHorn.trigger)).toEqual({ travel: 534, trigger: true, label: 'T5' })
    expect(tromboneSlide(36, TromboneHorn.trigger)).toEqual({ travel: 694, trigger: true, label: 'T6' })
    expect(tromboneSlide(35, TromboneHorn.trigger)).toEqual({ travel: 710, trigger: true, label: 'T7' })
    for (let midi = 28; midi <= 107; midi += 1) {
      const slide = tromboneSlide(midi, TromboneHorn.trigger)
      if (slide) expect(slide.travel).toBeLessThanOrEqual(710)
    }
    const open = tromboneSlide(46, TromboneHorn.trigger)
    expect(open?.trigger).toBe(false)
    expect(open?.label).toBe('1')
    expect(open?.travel).toBe(0)
    for (let midi = 35; midi <= 39; midi += 1) {
      expect(tromboneHornMessage(midi, TromboneHorn.trigger)).toBeNull()
      expect(trombonePositionLabel(midi, TromboneHorn.trigger)).toBe(tromboneSlide(midi, TromboneHorn.trigger)?.label)
    }
    expect(tromboneHornMessage(36)).toBe('requires F attachment')
  })

  it('clears the staff history', () => {
    const history = new ScoreHistory()
    history.apply([60, 64], [])
    history.apply([67], [60])
    history.clear()
    expect(history.columns).toEqual([])
    expect(history.apply([72], [])).toBe(0)
    expect(history.columns.map((column) => column.notes.map((note) => note.midi))).toEqual([[72]])
  })
})
