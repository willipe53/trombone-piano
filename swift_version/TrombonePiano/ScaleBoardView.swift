import CoreText
import UIKit

/// One octave with blanks. A candidate lands on the degree it belongs to and springs back otherwise.
final class ScaleBoardView: UIView {
    var deal: ScaleInventoryDeal {
        didSet { rebuildChips() }
    }

    /// Returns whether the pitch landed in that slot.
    var onPlace: ((Int, Int) -> Bool)?

    private var slotCenters: [Int: CGPoint] = [:]
    private var chips: [ScaleChip] = []
    private var selected: ScaleChip?

    init(deal: ScaleInventoryDeal) {
        self.deal = deal
        super.init(frame: .zero)
        backgroundColor = .clear
        contentMode = .redraw
        let tap = UITapGestureRecognizer(target: self, action: #selector(tapped(_:)))
        addGestureRecognizer(tap)
        rebuildChips()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        setNeedsDisplay()
        positionChips(animated: false)
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        let metrics = staffMetrics()
        slotCenters = [:]
        context.setStrokeColor(UIColor.white.withAlphaComponent(0.7).cgColor)
        context.setLineWidth(1)
        for line in 0..<5 {
            let y = metrics.staffTop + CGFloat(line) * metrics.spacing
            context.move(to: CGPoint(x: 8, y: y))
            context.addLine(to: CGPoint(x: bounds.width - 8, y: y))
        }
        context.strokePath()
        drawClef(metrics: metrics)
        let marks = signatureMarks(key: deal.key, staff: .bass)
        for (index, mark) in marks.enumerated() {
            let x = metrics.signatureX + CGFloat(index) * (metrics.spacing * 1.05)
            let y = noteY(step: mark.step, metrics: metrics)
            drawScoreAccidental(mark.accidental, at: CGPoint(x: x, y: y), size: metrics.spacing * 2.1, color: .white)
        }
        for (slot, midi) in deal.notes.enumerated() {
            let written = writtenNote(midi: midi, instrument: .trombone, key: deal.key)
            let center = CGPoint(x: slotX(slot, metrics: metrics), y: noteY(step: written.step, metrics: metrics))
            slotCenters[slot] = center
            if deal.missing.contains(slot) {
                let box = CGRect(x: center.x - 14, y: center.y - 14, width: 28, height: 28)
                context.setStrokeColor(UIColor.white.withAlphaComponent(0.45).cgColor)
                context.setLineDash(phase: 0, lengths: [3, 3])
                context.strokeEllipse(in: box)
                context.setLineDash(phase: 0, lengths: [])
            } else {
                drawHead(written, at: center, metrics: metrics, context: context)
            }
        }
    }

    func nearestSlot(to point: CGPoint) -> Int? {
        let missing = slotCenters.filter { deal.missing.contains($0.key) }
        let hits = missing.filter { hypot($0.value.x - point.x, $0.value.y - point.y) <= 36 }
        return hits.min { lhs, rhs in
            hypot(lhs.value.x - point.x, lhs.value.y - point.y) < hypot(rhs.value.x - point.x, rhs.value.y - point.y)
        }?.key
    }

    private func rebuildChips() {
        chips.forEach { $0.removeFromSuperview() }
        chips = deal.missing.sorted().map { slot in
            let chip = ScaleChip(midi: deal.notes[slot], key: deal.key)
            chip.accessibilityLabel = "Place \(deal.notes[slot])"
            let pan = UIPanGestureRecognizer(target: self, action: #selector(panned(_:)))
            chip.addGestureRecognizer(pan)
            chip.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
            addSubview(chip)
            return chip
        }
        selected = nil
        setNeedsLayout()
    }

    private func positionChips(animated: Bool) {
        let band = chipBand
        let width: CGFloat = 44
        let gap: CGFloat = 8
        let total = CGFloat(chips.count) * width + CGFloat(max(0, chips.count - 1)) * gap
        var x = max(12, (bounds.width - total) / 2)
        let y = bounds.height - band + (band - width) / 2
        for chip in chips {
            let frame = CGRect(x: x, y: y, width: width, height: width)
            chip.home = CGPoint(x: frame.midX, y: frame.midY)
            if !chip.dragging {
                chip.frame = frame
            }
            x += width + gap
        }
        _ = animated
    }

    @objc private func chipTapped(_ chip: ScaleChip) {
        selected = chip
        chips.forEach { $0.layer.borderWidth = $0 === chip ? 2 : 0 }
    }

    @objc private func tapped(_ gesture: UITapGestureRecognizer) {
        guard let selected else { return }
        let point = gesture.location(in: self)
        guard let slot = nearestSlot(to: point) else { return }
        if onPlace?(selected.midi, slot) == true {
            self.selected = nil
        }
    }

    @objc private func panned(_ gesture: UIPanGestureRecognizer) {
        guard let chip = gesture.view as? ScaleChip else { return }
        switch gesture.state {
        case .began:
            chip.dragging = true
        case .changed:
            let translation = gesture.translation(in: self)
            chip.center = CGPoint(x: chip.home.x + translation.x, y: chip.home.y + translation.y)
        case .ended, .cancelled:
            let point = chip.center
            if let slot = nearestSlot(to: point), onPlace?(chip.midi, slot) == true {
                return
            }
            chip.dragging = false
            UIView.animate(withDuration: 0.22, delay: 0, options: .curveEaseOut) {
                chip.center = chip.home
            }
        default:
            break
        }
    }

    private var chipBand: CGFloat { 76 }

    private struct Metrics {
        var spacing: CGFloat
        var staffTop: CGFloat
        var noteLeft: CGFloat
        var slot: CGFloat
        var signatureX: CGFloat
    }

    private func staffMetrics() -> Metrics {
        let spacing = min(16, max(8, (bounds.height - chipBand - 36) / 8))
        let staffTop = 16 + spacing
        let signatureCount = CGFloat(abs(deal.key.accidentals))
        let signatureX: CGFloat = 52
        let after = signatureCount > 0 ? signatureX + signatureCount * spacing * 1.05 : 46
        let noteLeft = after + 8
        let slot = max(30, (bounds.width - noteLeft - 8) / CGFloat(max(deal.notes.count, 1)))
        return Metrics(spacing: spacing, staffTop: staffTop, noteLeft: noteLeft, slot: slot, signatureX: signatureX)
    }

    private func slotX(_ slot: Int, metrics: Metrics) -> CGFloat {
        metrics.noteLeft + (CGFloat(slot) + 0.5) * metrics.slot
    }

    private func noteY(step: Int, metrics: Metrics) -> CGFloat {
        metrics.staffTop + CGFloat(-2 - step) * (metrics.spacing / 2)
    }

    private func drawClef(metrics: Metrics) {
        let anchor = CGPoint(x: 28, y: noteY(step: -4, metrics: metrics))
        let glyph = "\u{1D122}"
        let pointSize = metrics.spacing * 3.6
        let base = CTFontCreateWithName("Helvetica" as CFString, pointSize, nil)
        let cfGlyph = glyph as CFString
        let font = CTFontCreateForString(base, cfGlyph, CFRange(location: 0, length: CFGlyphLength(cfGlyph)))
        let units = Array(glyph.utf16)
        var glyphs = [CGGlyph](repeating: 0, count: units.count)
        let supported = units.withUnsafeBufferPointer { chars -> Bool in
            glyphs.withUnsafeMutableBufferPointer { glyphBuf in
                guard let chars = chars.baseAddress, let glyphBuf = glyphBuf.baseAddress else { return false }
                return CTFontGetGlyphsForCharacters(font, chars, glyphBuf, units.count)
            }
        }
        if supported, glyphs.contains(where: { $0 != 0 }),
           let name = CTFontCopyPostScriptName(font) as String?,
           let uiFont = UIFont(name: name, size: pointSize) {
            let text = glyph as NSString
            let size = text.size(withAttributes: [.font: uiFont])
            text.draw(
                at: CGPoint(x: anchor.x - size.width * 0.41, y: anchor.y - size.height * 0.23),
                withAttributes: [.font: uiFont, .foregroundColor: UIColor.white]
            )
        }
    }

    private func drawHead(_ note: WrittenNote, at center: CGPoint, metrics: Metrics, context: CGContext) {
        if let accidental = note.accidental {
            drawScoreAccidental(
                accidental,
                at: CGPoint(x: center.x - metrics.spacing * 1.3, y: center.y),
                size: metrics.spacing * 2.2,
                color: .white
            )
        }
        let head = CGSize(width: metrics.spacing * 1.25, height: metrics.spacing * 0.9)
        context.setFillColor(UIColor.white.cgColor)
        context.fillEllipse(in: CGRect(
            x: center.x - head.width / 2,
            y: center.y - head.height / 2,
            width: head.width,
            height: head.height
        ))
    }
}

private func CFGlyphLength(_ string: CFString) -> CFIndex {
    CFStringGetLength(string)
}

private final class ScaleChip: UIControl {
    let midi: Int
    let key: KeySignature
    var home: CGPoint = .zero
    var dragging = false

    init(midi: Int, key: KeySignature) {
        self.midi = midi
        self.key = key
        super.init(frame: CGRect(x: 0, y: 0, width: 44, height: 44))
        backgroundColor = UIColor(hex: 0x2E2E2E)
        layer.cornerRadius = 8
        layer.borderColor = MoogPalette.labelGreen.cgColor
        accessibilityTraits = .button
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func draw(_ rect: CGRect) {
        let written = writtenNote(midi: midi, instrument: .trombone, key: key)
        let label = noteName(written)
        let font = moogFont(size: 13, weight: .medium)
        let text = label as NSString
        let size = text.size(withAttributes: [.font: font])
        text.draw(
            at: CGPoint(x: bounds.midX - size.width / 2, y: bounds.midY - size.height / 2),
            withAttributes: [.font: font, .foregroundColor: UIColor.white]
        )
    }
}

private func noteName(_ note: WrittenNote) -> String {
    let names = ["C", "D", "E", "F", "G", "A", "B"]
    let letter = ((note.step % 7) + 7) % 7
    let mark: String
    switch note.accidental {
    case .sharp: mark = "#"
    case .flat: mark = "b"
    case .natural: mark = ""
    case nil: mark = ""
    }
    return names[letter] + mark
}
