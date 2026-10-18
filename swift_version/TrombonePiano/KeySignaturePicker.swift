import UIKit

/// Draws a sharp, flat, or natural centered on a point. Shared by the score and the key signature picker.
func drawScoreAccidental(_ accidental: ScoreAccidental, at center: CGPoint, size: CGFloat, color: UIColor) {
    let glyph: String
    switch accidental {
    case .sharp: glyph = "♯"
    case .flat: glyph = "♭"
    case .natural: glyph = "♮"
    }
    let font = UIFont.systemFont(ofSize: size, weight: .medium)
    let textSize = (glyph as NSString).size(withAttributes: [.font: font])
    (glyph as NSString).draw(
        at: CGPoint(x: center.x - textSize.width / 2, y: center.y - textSize.height / 2),
        withAttributes: [
            .font: font,
            .foregroundColor: color,
        ]
    )
}

/// Five staff lines with the accidentals of one key signature, without a clef.
final class KeySignatureGlyphView: UIView {
    var key: KeySignature = .c {
        didSet { setNeedsDisplay() }
    }
    var staff: ScoreStaff = .treble {
        didSet { setNeedsDisplay() }
    }
    var color: UIColor = .white {
        didSet { setNeedsDisplay() }
    }

    /// Staff height in line spacings plus room above and below for accidentals that sit past the outer lines.
    static let spacingsTall: CGFloat = 8
    /// Seven accidentals at 1.1 spacings apart plus margins on either side.
    static let spacingsWide: CGFloat = 10

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
        isUserInteractionEnabled = false
        contentMode = .redraw
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        let spacing = bounds.height / Self.spacingsTall
        let staffTop = (bounds.height - spacing * 4) / 2
        let half = spacing / 2
        context.setStrokeColor(color.withAlphaComponent(0.72).cgColor)
        context.setLineWidth(1)
        for line in 0..<5 {
            let y = (staffTop + CGFloat(line) * spacing).rounded() + 0.5
            context.move(to: CGPoint(x: 0, y: y))
            context.addLine(to: CGPoint(x: bounds.width, y: y))
        }
        context.strokePath()
        let marks = signatureMarks(key: key, staff: staff)
        let origin = spacing * 1.2
        let step = spacing * 1.1
        for (index, mark) in marks.enumerated() {
            let x = origin + CGFloat(index) * step
            let y = staffTop + CGFloat(topLineStep - mark.step) * half
            drawScoreAccidental(mark.accidental, at: CGPoint(x: x, y: y), size: spacing * 2.6, color: color)
        }
    }

    /// The step that sits on the top line of this staff, matching `ScoreView`.
    private var topLineStep: Int {
        switch staff {
        case .treble: return 10
        case .tenor: return 2
        case .bass: return -2
        }
    }
}

final class KeySignatureRow: UIControl {
    let key: KeySignature
    var isChosen = false {
        didSet { refresh() }
    }

    private let glyph = KeySignatureGlyphView()
    private let title = UILabel()
    private let glyphHeight: CGFloat
    private let pad: CGFloat = 12

    init(key: KeySignature, staff: ScoreStaff, glyphHeight: CGFloat) {
        self.key = key
        self.glyphHeight = glyphHeight
        super.init(frame: .zero)
        glyph.key = key
        glyph.staff = staff
        isAccessibilityElement = true
        accessibilityLabel = key.title
        accessibilityTraits = .button
        addSubview(glyph)
        addSubview(title)
        refresh()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override var isHighlighted: Bool {
        didSet { refresh() }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let glyphWidth = glyphHeight / KeySignatureGlyphView.spacingsTall * KeySignatureGlyphView.spacingsWide
        glyph.frame = CGRect(
            x: pad,
            y: (bounds.height - glyphHeight) / 2,
            width: glyphWidth,
            height: glyphHeight
        )
        let titleX = glyph.frame.maxX + pad
        title.frame = CGRect(x: titleX, y: 0, width: bounds.width - titleX - pad, height: bounds.height)
    }

    private func refresh() {
        if isHighlighted {
            backgroundColor = UIColor(hex: 0x3A3A3A)
        } else if isChosen {
            backgroundColor = UIColor(hex: 0x2C2C2C)
        } else {
            backgroundColor = .clear
        }
        let color = isChosen ? UIColor.white : UIColor(hex: 0xBDBDBD)
        title.attributedText = NSAttributedString(
            string: key.title,
            attributes: [
                .font: moogFont(size: 13, weight: .medium),
                .foregroundColor: color,
                .kern: 0.8,
            ]
        )
        glyph.color = color
        if isChosen {
            accessibilityTraits.insert(.selected)
        } else {
            accessibilityTraits.remove(.selected)
        }
    }
}

/// The rows are controls that cover the whole list. A scroll view refuses to cancel a control's touch by default, so a drag that starts on a row would never scroll.
private final class RowScrollView: UIScrollView {
    override func touchesShouldCancel(in view: UIView) -> Bool {
        true
    }
}

final class KeySignaturePickerViewController: UIViewController, UIPopoverPresentationControllerDelegate {
    var onSelect: ((KeySignature) -> Void)?

    private let selected: KeySignature
    private let staff: ScoreStaff
    private let scroll = RowScrollView()
    private var rows: [KeySignatureRow] = []
    private let rowHeight: CGFloat = 54
    private let glyphHeight: CGFloat = 48
    private let width: CGFloat = 260
    private let visibleRows: CGFloat = 8
    private var didScrollToSelected = false

    init(selected: KeySignature, staff: ScoreStaff) {
        self.selected = selected
        self.staff = staff
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .popover
        preferredContentSize = CGSize(width: width, height: rowHeight * visibleRows)
        popoverPresentationController?.delegate = self
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func adaptivePresentationStyle(
        for controller: UIPresentationController,
        traitCollection: UITraitCollection
    ) -> UIModalPresentationStyle {
        .none
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = MoogPalette.panel
        scroll.indicatorStyle = .white
        scroll.delaysContentTouches = false
        scroll.alwaysBounceVertical = true
        scroll.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scroll)
        NSLayoutConstraint.activate([
            scroll.topAnchor.constraint(equalTo: view.topAnchor),
            scroll.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
        for key in KeySignature.catalog {
            let row = KeySignatureRow(key: key, staff: staff, glyphHeight: glyphHeight)
            row.isChosen = key.id == selected.id
            row.addTarget(self, action: #selector(rowTapped(_:)), for: .touchUpInside)
            scroll.addSubview(row)
            rows.append(row)
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let rowWidth = scroll.bounds.width
        for (index, row) in rows.enumerated() {
            row.frame = CGRect(x: 0, y: CGFloat(index) * rowHeight, width: rowWidth, height: rowHeight)
        }
        scroll.contentSize = CGSize(width: rowWidth, height: CGFloat(rows.count) * rowHeight)
        guard !didScrollToSelected, scroll.bounds.height > 0 else { return }
        didScrollToSelected = true
        if let index = rows.firstIndex(where: { $0.isChosen }) {
            let target = CGFloat(index) * rowHeight - (scroll.bounds.height - rowHeight) / 2
            let maxOffset = max(0, scroll.contentSize.height - scroll.bounds.height)
            scroll.contentOffset = CGPoint(x: 0, y: min(max(0, target), maxOffset))
        }
    }

    @objc private func rowTapped(_ row: KeySignatureRow) {
        onSelect?(row.key)
    }
}
