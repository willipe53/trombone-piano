import UIKit

/// “TROMBONE PIANO” and the info ball, right-aligned in whatever width they are given.
final class AppTitleHeader: UIView {
    var onInfo: (() -> Void)?

    private let titleLabel = UILabel()
    private let helpButton = HelpBallButton()
    private let ball: CGFloat = 30
    private let gap: CGFloat = 8

    override init(frame: CGRect) {
        super.init(frame: frame)
        titleLabel.isUserInteractionEnabled = false
        titleLabel.numberOfLines = 1
        titleLabel.lineBreakMode = .byClipping
        titleLabel.textAlignment = .right
        addSubview(titleLabel)
        helpButton.accessibilityIdentifier = "info-button"
        helpButton.accessibilityLabel = "Info"
        helpButton.addTarget(self, action: #selector(infoTapped), for: .touchUpInside)
        addSubview(helpButton)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let help = CGRect(
            x: bounds.width - ball,
            y: (bounds.height - ball) / 2,
            width: ball,
            height: ball
        )
        helpButton.frame = help
        let available = max(0, help.minX - gap)
        let fitted = fittedTitle(availableWidth: available)
        titleLabel.attributedText = fitted.text
        titleLabel.frame = CGRect(
            x: help.minX - gap - fitted.width,
            y: 0,
            width: fitted.width,
            height: bounds.height
        )
    }

    @objc private func infoTapped() {
        onInfo?()
    }

    /// Full name at 22pt when `availableWidth` allows it. Smaller type only when that width is not enough.
    private func fittedTitle(availableWidth: CGFloat) -> (text: NSAttributedString, width: CGFloat) {
        let full = "TROMBONE PIANO"
        let preferred: CGFloat = 22
        var fontSize = preferred
        while true {
            let kern = 1.6 * (fontSize / preferred)
            let font = moogFont(size: fontSize, weight: .medium)
            let measured = ceil((full as NSString).size(withAttributes: [.font: font, .kern: kern]).width) + 1
            if measured <= availableWidth || fontSize <= 9 {
                let text = NSAttributedString(
                    string: full,
                    attributes: [
                        .font: font,
                        .foregroundColor: UIColor.white,
                        .kern: kern,
                    ]
                )
                return (text, min(measured, max(availableWidth, 0)))
            }
            fontSize -= 0.5
        }
    }
}
