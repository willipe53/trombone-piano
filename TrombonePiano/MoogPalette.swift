import UIKit

enum MoogPalette {
    static let panel = UIColor(hex: 0x1B1B1B)
    static let divider = UIColor(hex: 0xD5D5D5)
    /// Note names and slide positions printed on the keys.
    static let labelGreen = UIColor(hex: 0x17803A)
}

extension UIColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: alpha
        )
    }

    func lerp(toward other: UIColor, amount: CGFloat) -> UIColor {
        var r1: CGFloat = 0, g1: CGFloat = 0, b1: CGFloat = 0, a1: CGFloat = 0
        var r2: CGFloat = 0, g2: CGFloat = 0, b2: CGFloat = 0, a2: CGFloat = 0
        getRed(&r1, green: &g1, blue: &b1, alpha: &a1)
        other.getRed(&r2, green: &g2, blue: &b2, alpha: &a2)
        return UIColor(
            red: r1 + (r2 - r1) * amount,
            green: g1 + (g2 - g1) * amount,
            blue: b1 + (b2 - b1) * amount,
            alpha: a1 + (a2 - a1) * amount
        )
    }

    /// Opaque sRGB hex, so a picker color can be stored and drawn again.
    var rgbHex: UInt32 {
        let converted = cgColor.converted(
            to: CGColorSpace(name: CGColorSpace.sRGB) ?? CGColorSpaceCreateDeviceRGB(),
            intent: .defaultIntent,
            options: nil
        ) ?? cgColor
        guard let components = converted.components, !components.isEmpty else {
            return 0x17803A
        }
        if components.count < 3 {
            let byte = UInt32((min(max(components[0], 0), 1) * 255).rounded())
            return (byte << 16) | (byte << 8) | byte
        }
        let bytes = components.prefix(3).map { UInt32((min(max($0, 0), 1) * 255).rounded()) }
        return (bytes[0] << 16) | (bytes[1] << 8) | bytes[2]
    }
}
