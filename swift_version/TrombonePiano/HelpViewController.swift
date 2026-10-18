import UIKit

/// Round help control drawn as a shaded ball with a question mark.
final class HelpBallButton: UIControl {
    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
        contentMode = .redraw
        accessibilityLabel = "Help"
        accessibilityTraits = .button
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override var isHighlighted: Bool {
        didSet {
            alpha = isHighlighted ? 0.65 : 1
        }
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        let ball = bounds.insetBy(dx: 0.5, dy: 0.5)
        let oval = UIBezierPath(ovalIn: ball)
        context.saveGState()
        context.addPath(oval.cgPath)
        context.clip()
        if let gradient = CGGradient(
            colorsSpace: CGColorSpaceCreateDeviceRGB(),
            colors: [
                UIColor(hex: 0xFFFFFF).cgColor,
                UIColor(hex: 0xD0D0D0).cgColor,
                UIColor(hex: 0x7A7A7A).cgColor,
            ] as CFArray,
            locations: [0, 0.55, 1]
        ) {
            context.drawRadialGradient(
                gradient,
                startCenter: CGPoint(x: ball.midX - ball.width * 0.16, y: ball.midY - ball.height * 0.2),
                startRadius: 0,
                endCenter: CGPoint(x: ball.midX + ball.width * 0.06, y: ball.midY + ball.height * 0.08),
                endRadius: ball.width * 0.72,
                options: [.drawsAfterEndLocation]
            )
        }
        context.restoreGState()

        let font = moogFont(size: ball.width * 0.62, weight: .medium)
        let mark = "?" as NSString
        let markSize = mark.size(withAttributes: [.font: font])
        mark.draw(
            at: CGPoint(
                x: ball.midX - markSize.width / 2,
                y: ball.midY - markSize.height / 2 - ball.width * 0.02
            ),
            withAttributes: [
                .font: font,
                .foregroundColor: UIColor(hex: 0x1A1A1A),
            ]
        )
    }
}
