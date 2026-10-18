import Foundation

struct GameRNG: RandomNumberGenerator {
    private var state: UInt64

    init(seed: Int) {
        let mixed = seed == 0 ? 0x9E37_79B9_7F4A_7C15 : UInt64(bitPattern: Int64(seed))
        state = mixed &* 0x6C62_272E_07BB_0142 &+ 1
    }

    mutating func next() -> UInt64 {
        state &*= 6364136223846793005
        state &+= 1442695040888963407
        return state
    }

    mutating func int(_ upper: Int) -> Int {
        guard upper > 0 else { return 0 }
        return Int(next() % UInt64(upper))
    }
}
