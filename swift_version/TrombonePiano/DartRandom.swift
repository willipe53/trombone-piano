import Foundation

/// Dart's `math.Random` with a seed.
struct DartRandom {
    private var state: UInt64

    init(seed: Int) {
        state = Self.setupSeed(seed)
        nextState()
        nextState()
        nextState()
        nextState()
    }

    mutating func nextDouble() -> Double {
        let hi = Double(nextInt(upperBound: 1 << 26))
        let lo = Double(nextInt(upperBound: 1 << 27))
        return (hi * Double(1 << 27) + lo) / Double(1 << 53)
    }

    private mutating func nextInt(upperBound max: Int) -> Int {
        let max = UInt64(max)
        let powerOfTwo = (max & (0 &- max)) == max
        if powerOfTwo {
            nextState()
            return Int(state & 0xFFFF_FFFF & (max - 1))
        }

        let limit: UInt64 = 1 << 32
        while true {
            nextState()
            let rnd32 = state & 0xFFFF_FFFF
            let result = rnd32 % max
            if rnd32 &- result &+ max <= limit {
                return Int(result)
            }
        }
    }

    private mutating func nextState() {
        let multiplier: UInt64 = 0xFFFF_DA61
        let low = state & 0xFFFF_FFFF
        let high = state >> 32
        let (productHigh, productLow) = multiplier.multipliedFullWidth(by: low)
        let (sum, wrapped) = productLow.addingReportingOverflow(high)
        state = sum &+ (wrapped ? 1 << 32 : 0) &+ (productHigh << 32)
    }

    /// Thomas Wang's 64-bit mix, with the same wrapping Dart uses for this seed.
    private static func setupSeed(_ seed: Int) -> UInt64 {
        var n = Int64(seed)
        n = (~n) &+ (n &<< 21)
        n = n ^ (n >> 24)
        n = n &* 265
        n = n ^ (n >> 14)
        n = n &* 21
        n = n ^ (n >> 28)
        n = n &+ (n &<< 31)
        if n == 0 {
            n = 0x5A17
        }
        return UInt64(bitPattern: n)
    }
}
