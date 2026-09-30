import UIKit

/// Fill drawn on keys that sit outside the selected key signature.
enum KeyHatch: String, CaseIterable {
    case crosshatch
    case stripes
    case lines
    case grid
    case chevron
}

func drawKeyHatch(
    _ hatch: KeyHatch,
    in bounds: CGRect,
    spacing: CGFloat,
    color: UIColor,
    lineWidth: CGFloat,
    context: CGContext
) {
    guard spacing > 0, bounds.width > 0, bounds.height > 0 else { return }
    context.setStrokeColor(color.cgColor)
    context.setFillColor(color.cgColor)
    context.setLineWidth(lineWidth)
    switch hatch {
    case .crosshatch:
        addFallingDiagonals(in: bounds, spacing: spacing, context: context)
        addRisingDiagonals(in: bounds, spacing: spacing, context: context)
        context.strokePath()
    case .stripes:
        addFallingDiagonals(in: bounds, spacing: spacing, context: context)
        context.strokePath()
    case .lines:
        addHorizontals(in: bounds, spacing: spacing, context: context)
        context.strokePath()
    case .grid:
        addHorizontals(in: bounds, spacing: spacing, context: context)
        addVerticals(in: bounds, spacing: spacing, context: context)
        context.strokePath()
    case .chevron:
        context.setLineJoin(.round)
        context.setLineCap(.round)
        addChevrons(in: bounds, spacing: spacing, context: context)
        context.strokePath()
    }
}

private func addFallingDiagonals(in bounds: CGRect, spacing: CGFloat, context: CGContext) {
    var offset = -bounds.height
    while offset < bounds.width {
        context.move(to: CGPoint(x: bounds.minX + offset, y: bounds.minY))
        context.addLine(to: CGPoint(x: bounds.minX + offset + bounds.height, y: bounds.maxY))
        offset += spacing
    }
}

private func addRisingDiagonals(in bounds: CGRect, spacing: CGFloat, context: CGContext) {
    var offset: CGFloat = 0
    while offset < bounds.width + bounds.height {
        context.move(to: CGPoint(x: bounds.minX + offset, y: bounds.minY))
        context.addLine(to: CGPoint(x: bounds.minX + offset - bounds.height, y: bounds.maxY))
        offset += spacing
    }
}

private func addHorizontals(in bounds: CGRect, spacing: CGFloat, context: CGContext) {
    var y = bounds.minY + spacing / 2
    while y < bounds.maxY {
        context.move(to: CGPoint(x: bounds.minX, y: y))
        context.addLine(to: CGPoint(x: bounds.maxX, y: y))
        y += spacing
    }
}

private func addVerticals(in bounds: CGRect, spacing: CGFloat, context: CGContext) {
    var x = bounds.minX + spacing / 2
    while x < bounds.maxX {
        context.move(to: CGPoint(x: x, y: bounds.minY))
        context.addLine(to: CGPoint(x: x, y: bounds.maxY))
        x += spacing
    }
}

private func addChevrons(in bounds: CGRect, spacing: CGFloat, context: CGContext) {
    let pitch = spacing * 1.35
    let rise = spacing * 0.42
    var baseline = bounds.minY - pitch
    while baseline < bounds.maxY + pitch {
        var x = bounds.minX - spacing
        var high = false
        context.move(to: CGPoint(x: x, y: baseline))
        while x < bounds.maxX + spacing {
            x += spacing
            high.toggle()
            context.addLine(to: CGPoint(x: x, y: baseline + (high ? -rise : rise)))
        }
        baseline += pitch
    }
}

/// Circular swatch of one hatch. The panel uses it beside Show key, and the picker uses a row of them.
final class HatchWell: UIControl {
    var hatch: KeyHatch = .crosshatch {
        didSet {
            if hatch != oldValue {
                setNeedsDisplay()
            }
        }
    }

    var isChosen = false {
        didSet {
            if isChosen != oldValue {
                setNeedsDisplay()
            }
        }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
        contentMode = .redraw
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func draw(_ rect: CGRect) {
        let strokeWidth: CGFloat = isChosen ? 2 : 1.25
        let ovalRect = bounds.insetBy(dx: strokeWidth / 2 + 0.5, dy: strokeWidth / 2 + 0.5)
        let oval = UIBezierPath(ovalIn: ovalRect)
        UIColor(hex: 0x0C0C0C).setFill()
        oval.fill()
        guard let context = UIGraphicsGetCurrentContext() else { return }
        context.saveGState()
        context.addPath(oval.cgPath)
        context.clip()
        let spacing = max(2.5, ovalRect.width / 5)
        drawKeyHatch(
            hatch,
            in: ovalRect,
            spacing: spacing,
            color: UIColor.white.withAlphaComponent(0.9),
            lineWidth: 1,
            context: context
        )
        context.restoreGState()
        oval.lineWidth = strokeWidth
        (isChosen ? UIColor.white : UIColor(hex: 0x8A8A8A)).setStroke()
        oval.stroke()
    }
}

final class HatchPickerViewController: UIViewController, UIPopoverPresentationControllerDelegate {
    var onSelect: ((KeyHatch) -> Void)?

    private let selected: KeyHatch
    private let diameter: CGFloat = 40
    private let gap: CGFloat = 8
    private let pad: CGFloat = 12

    init(selected: KeyHatch) {
        self.selected = selected
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .popover
        let count = CGFloat(KeyHatch.allCases.count)
        preferredContentSize = CGSize(
            width: pad * 2 + diameter * count + gap * (count - 1),
            height: pad * 2 + diameter
        )
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
        for (index, hatch) in KeyHatch.allCases.enumerated() {
            let well = HatchWell()
            well.hatch = hatch
            well.isChosen = hatch == selected
            well.accessibilityLabel = hatch.rawValue
            well.frame = CGRect(
                x: pad + CGFloat(index) * (diameter + gap),
                y: pad,
                width: diameter,
                height: diameter
            )
            well.addTarget(self, action: #selector(tapped(_:)), for: .touchUpInside)
            view.addSubview(well)
        }
    }

    @objc private func tapped(_ well: HatchWell) {
        onSelect?(well.hatch)
    }
}
