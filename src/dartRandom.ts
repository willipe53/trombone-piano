const mask64 = (1n << 64n) - 1n

function bits(value: bigint): bigint {
  return value & mask64
}

function signed(value: bigint): bigint {
  const pattern = bits(value)
  return pattern >= 1n << 63n ? pattern - (1n << 64n) : pattern
}

function not64(value: bigint): bigint {
  return signed(~bits(value))
}

function shl64(value: bigint, shift: bigint): bigint {
  return signed(bits(value) << shift)
}

function shr64(value: bigint, shift: bigint): bigint {
  return signed(value >> shift)
}

function add64(left: bigint, right: bigint): bigint {
  return signed(left + right)
}

function mul64(left: bigint, right: bigint): bigint {
  return signed(left * right)
}

function xor64(left: bigint, right: bigint): bigint {
  return signed(bits(left) ^ bits(right))
}

function setupSeed(seed: number): bigint {
  let mixed = BigInt(Math.trunc(seed))
  mixed = add64(not64(mixed), shl64(mixed, 21n))
  mixed = xor64(mixed, shr64(mixed, 24n))
  mixed = mul64(mixed, 265n)
  mixed = xor64(mixed, shr64(mixed, 14n))
  mixed = mul64(mixed, 21n)
  mixed = xor64(mixed, shr64(mixed, 28n))
  mixed = add64(mixed, shl64(mixed, 31n))
  if (mixed === 0n) mixed = 0x5a17n
  return bits(mixed)
}

function addUnsigned(left: bigint, right: bigint): bigint {
  return bits(left + right)
}

/// Dart's `math.Random` with a seed.
export class DartRandom {
  private state: bigint

  constructor(seed: number) {
    this.state = setupSeed(seed)
    this.nextState()
    this.nextState()
    this.nextState()
    this.nextState()
  }

  nextDouble(): number {
    const hi = this.nextInt(2 ** 26)
    const lo = this.nextInt(2 ** 27)
    return (hi * 2 ** 27 + lo) / 2 ** 53
  }

  private nextInt(max: number): number {
    const bound = BigInt(max)
    const wrappedNegation = bits(0n - bound)
    if ((bound & wrappedNegation) === bound) {
      this.nextState()
      return Number(this.state & 0xffff_ffffn & (bound - 1n))
    }
    const limit = 1n << 32n
    while (true) {
      this.nextState()
      const rnd32 = this.state & 0xffff_ffffn
      const result = rnd32 % bound
      const remainder = bits(rnd32 - result)
      if (addUnsigned(remainder, bound) <= limit) return Number(result)
    }
  }

  private nextState(): void {
    const multiplier = 0xffff_da61n
    const low = this.state & 0xffff_ffffn
    const high = this.state >> 32n
    const product = multiplier * low
    const productLow = bits(product)
    const productHigh = product >> 64n
    const sum = productLow + high
    const wrapped = sum > mask64
    let next = addUnsigned(bits(sum), wrapped ? 1n << 32n : 0n)
    next = addUnsigned(next, productHigh << 32n)
    this.state = next
  }
}
