const mask64 = (1n << 64n) - 1n

function bits(value: bigint): bigint {
  return value & mask64
}

export class GameRNG {
  private state: bigint

  constructor(seed: number) {
    const mixed = seed === 0 ? 0x9e37_79b9_7f4a_7c15n : bits(BigInt(Math.trunc(seed)))
    this.state = bits(mixed * 0x6c62_272e_07bb_0142n + 1n)
  }

  next(): bigint {
    this.state = bits(this.state * 6364136223846793005n + 1442695040888963407n)
    return this.state
  }

  int(upper: number): number {
    if (upper <= 0) return 0
    return Number(this.next() % BigInt(upper))
  }
}
