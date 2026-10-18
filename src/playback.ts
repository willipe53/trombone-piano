/// A held trombone note schedules the attack and then a looping sustain. A one-shot schedules the attack only.
export function scheduledSources(kind: 'held' | 'oneShot', hasSustain: boolean): Array<'attack' | 'sustain'> {
  if (kind === 'oneShot' || !hasSustain) return ['attack']
  return ['attack', 'sustain']
}
