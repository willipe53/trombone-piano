import CoreText
import UIKit

final class ScoreView: UIView {
    var keySignature: KeySignature = .bFlat {
        didSet {
            guard keySignature != oldValue else { return }
            setNeedsDisplay()
        }
    }

    var instrument: KeyboardInstrument = .trombone {
        didSet {
            if instrument != oldValue {
                setNeedsDisplay()
            }
        }
    }

    var showPositions = true {
        didSet {
            if showPositions != oldValue {
                setNeedsDisplay()
            }
        }
    }

    var horn: TromboneHorn = .straight {
        didSet {
            if horn != oldValue {
                setNeedsDisplay()
            }
        }
    }

    private var history = ScoreHistory()
    private var shiftColumns: CGFloat = 0
    private var shiftToken = 0

    override init(frame: CGRect) {
        super.init(frame: frame)
        isOpaque = true
        backgroundColor = MoogPalette.panel
        contentMode = .redraw
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func record(started: [Int], stopped: [Int]) {
        shiftToken += 1
        shiftColumns = 0
        let removed = history.apply(started: started, stopped: stopped)
        guard removed > 0 else {
            setNeedsDisplay()
            return
        }
        let token = shiftToken
        shiftColumns = CGFloat(removed)
        let start = CACurrentMediaTime()
        func step() {
            guard shiftToken == token else { return }
            let t = min(1, (CACurrentMediaTime() - start) / 0.22)
            let eased = 1 - pow(1 - t, 3)
            shiftColumns = CGFloat(removed) * (1 - eased)
            setNeedsDisplay()
            if t < 1 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.016, execute: step)
            }
        }
        step()
    }

    func clear() {
        shiftToken += 1
        shiftColumns = 0
        history.clear()
        setNeedsDisplay()
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        let metrics = staffMetrics()
        let ink = UIColor.white.withAlphaComponent(0.72)
        context.setStrokeColor(ink.cgColor)
        context.setFillColor(ink.cgColor)
        context.setLineWidth(1)
        drawBrace(metrics: metrics, in: context)
        drawStaffLines(metrics: metrics, in: context)
        drawClef(upper: true, metrics: metrics, in: context)
        drawClef(upper: false, metrics: metrics, in: context)
        drawSignature(metrics: metrics, in: context)
        drawColumns(metrics: metrics, in: context)
    }

    private struct Metrics {
        var spacing: CGFloat
        var trebleTop: CGFloat
        var bassTop: CGFloat
        var signatureOrigin: CGFloat
        var signatureStep: CGFloat
        var noteLeft: CGFloat
        var slot: CGFloat
        var headWidth: CGFloat
        var headHeight: CGFloat
        var gapSpaces: CGFloat
    }

    private func staffMetrics() -> Metrics {
        let inset: CGFloat = 6
        let usable = max(48, bounds.height - inset * 2)
        // Line spacing stays at the previous 20-space gap. The gap itself is 75% of that, and the freed room is split above and below.
        let previousGapSpaces: CGFloat = 20
        let gapSpaces = previousGapSpaces * 0.75
        let marginSpaces: CGFloat = 10
        let spacing = usable / (4 + previousGapSpaces + 4 + marginSpaces * 2)
        let freed = (previousGapSpaces - gapSpaces) * spacing
        let trebleTop = inset + marginSpaces * spacing + freed / 2
        let clefWidth = spacing * (instrument == .trombone ? 3.4 : 2.3)
        let signatureOrigin = 16 + clefWidth + spacing * 1.6
        let signatureStep = spacing * 1.1
        let signatureCount = CGFloat(abs(keySignature.accidentals))
        let afterSignature = signatureCount > 0
            ? signatureOrigin + (signatureCount - 1) * signatureStep + spacing * 1.8
            : 16 + clefWidth + spacing
        let noteLeft = afterSignature
        let slot = max(8, (bounds.width - noteLeft - 4) / CGFloat(ScoreHistory.columnLimit)) * 0.5
        // A second sits a full head to the side. The head has to stay narrow enough that those two still clear the next column by a couple of points.
        let headWidth = min(slot * 0.62, spacing * 1.28, max(4, (slot - 4) / 2))
        return Metrics(
            spacing: spacing,
            trebleTop: trebleTop,
            bassTop: trebleTop + (4 + gapSpaces) * spacing,
            signatureOrigin: signatureOrigin,
            signatureStep: signatureStep,
            noteLeft: noteLeft,
            slot: slot,
            headWidth: headWidth,
            headHeight: spacing * 0.9,
            gapSpaces: gapSpaces
        )
    }

    /// Each staff keeps ordinary line spacing. Middle C sits one space beyond the staff it belongs to, so the two staves stay apart.
    private func y(for step: Int, staff: ScoreStaff, metrics: Metrics) -> CGFloat {
        let half = metrics.spacing / 2
        switch staff {
        case .treble:
            return metrics.trebleTop + CGFloat(10 - step) * half
        case .tenor:
            // Middle C, step 0, sits on the fourth line.
            return metrics.trebleTop + CGFloat(2 - step) * half
        case .bass:
            return metrics.bassTop + CGFloat(-2 - step) * half
        }
    }

    private func drawStaffLines(metrics: Metrics, in context: CGContext) {
        context.setStrokeColor(UIColor.white.withAlphaComponent(0.72).cgColor)
        context.setLineWidth(1)
        for step in [10, 8, 6, 4, 2] {
            let y = y(for: step, staff: .treble, metrics: metrics)
            context.move(to: CGPoint(x: 12, y: y))
            context.addLine(to: CGPoint(x: bounds.width, y: y))
        }
        for step in [-2, -4, -6, -8, -10] {
            let y = y(for: step, staff: .bass, metrics: metrics)
            context.move(to: CGPoint(x: 12, y: y))
            context.addLine(to: CGPoint(x: bounds.width, y: y))
        }
        context.strokePath()
        let top = y(for: 10, staff: .treble, metrics: metrics)
        let bottom = y(for: -10, staff: .bass, metrics: metrics)
        context.move(to: CGPoint(x: 12, y: top))
        context.addLine(to: CGPoint(x: 12, y: bottom))
        context.strokePath()
    }

    private func drawBrace(metrics: Metrics, in context: CGContext) {
        let top = y(for: 10, staff: .treble, metrics: metrics)
        let bottom = y(for: -10, staff: .bass, metrics: metrics)
        let mid = (top + bottom) / 2
        let path = UIBezierPath()
        path.move(to: CGPoint(x: 8, y: top))
        path.addQuadCurve(to: CGPoint(x: 1.5, y: mid), controlPoint: CGPoint(x: 2, y: top + (mid - top) * 0.72))
        path.addQuadCurve(to: CGPoint(x: 8, y: bottom), controlPoint: CGPoint(x: 2, y: mid + (bottom - mid) * 0.28))
        path.lineWidth = 1.4
        path.lineCapStyle = .round
        path.stroke()
    }

    private func drawClef(upper: Bool, metrics: Metrics, in context: CGContext) {
        context.saveGState()
        context.setStrokeColor(UIColor.white.cgColor)
        context.setFillColor(UIColor.white.cgColor)
        if upper, instrument == .trombone {
            let cLine = CGPoint(
                x: 18 + metrics.spacing * 2.15,
                y: y(for: 0, staff: .tenor, metrics: metrics)
            )
            if !drawClefGlyph(
                "\u{1D121}",
                anchor: cLine,
                pointSize: metrics.spacing * 6.4 * 0.8,
                anchorFraction: 0.365,
                xFraction: 0.62
            ) {
                strokeTenorClef(cLine: cLine, spacing: metrics.spacing * 0.8)
            }
        } else if upper {
            let gLine = CGPoint(x: 28, y: y(for: 4, staff: .treble, metrics: metrics))
            if !drawClefGlyph(
                "\u{1D11E}",
                anchor: gLine,
                pointSize: metrics.spacing * 6.6,
                anchorFraction: 0.487,
                xFraction: 0.416
            ) {
                strokeTrebleClef(gLine: gLine, spacing: metrics.spacing)
            }
        } else {
            let fLine = CGPoint(x: 28, y: y(for: -4, staff: .bass, metrics: metrics))
            if !drawClefGlyph(
                "\u{1D122}",
                anchor: fLine,
                pointSize: metrics.spacing * 3.7,
                anchorFraction: 0.229,
                xFraction: 0.414
            ) {
                drawBassClef(fLine: fLine, spacing: metrics.spacing, in: context)
            }
        }
        context.restoreGState()
    }

    private func drawSignature(metrics: Metrics, in context: CGContext) {
        let staves: [ScoreStaff] = instrument == .trombone ? [.tenor, .bass] : [.treble, .bass]
        for staff in staves {
            let marks = signatureMarks(key: keySignature, staff: staff)
            for (index, mark) in marks.enumerated() {
                let x = metrics.signatureOrigin + CGFloat(index) * metrics.signatureStep
                drawAccidental(
                    mark.accidental,
                    at: CGPoint(x: x, y: y(for: mark.step, staff: staff, metrics: metrics)),
                    size: metrics.spacing * 2.3,
                    color: .white
                )
            }
        }
    }

    private func drawColumns(metrics: Metrics, in context: CGContext) {
        for (index, column) in history.columns.enumerated() {
            let centerX = metrics.noteLeft + (CGFloat(index) + shiftColumns) * metrics.slot + metrics.slot / 2
            let written = column.notes.flatMap { event in
                writtenNotes(midi: event.midi, instrument: instrument, key: keySignature).map {
                    (event: event, note: $0)
                }
            }
            var offsets = Array(repeating: CGFloat(0), count: written.count)
            let staves: [ScoreStaff] = instrument == .trombone ? [.tenor, .bass] : [.treble, .bass]
            for staff in staves {
                let indices = written.indices.filter { written[$0].note.staff == staff }
                    .sorted { written[$0].note.step < written[$1].note.step }
                var previousStep: Int?
                var previousOffset: CGFloat = 0
                for noteIndex in indices {
                    if let previousStep, written[noteIndex].note.step - previousStep <= 1 {
                        previousOffset = previousOffset == 0 ? metrics.headWidth + 2 : 0
                        offsets[noteIndex] = previousOffset
                    } else {
                        previousOffset = 0
                    }
                    previousStep = written[noteIndex].note.step
                }
            }
            for (noteIndex, item) in written.enumerated() {
                guard noteBelongsOnDrawnStaff(
                    item.note.staff,
                    step: item.note.step,
                    gapSpaces: metrics.gapSpaces
                ) else { continue }
                let color = item.event.sounding ? UIColor.white : UIColor.white.withAlphaComponent(0.5)
                let center = CGPoint(
                    x: centerX + offsets[noteIndex],
                    y: y(for: item.note.step, staff: item.note.staff, metrics: metrics)
                )
                drawLedgerLines(for: item.note, centerX: center.x, metrics: metrics, color: color, in: context)
                if let accidental = item.note.accidental {
                    drawAccidental(
                        accidental,
                        at: CGPoint(x: center.x - metrics.headWidth * 0.9 - metrics.spacing * 0.9, y: center.y),
                        size: metrics.spacing * 2.4,
                        color: color
                    )
                }
                drawNoteHead(at: center, metrics: metrics, color: color, in: context)
                if showPositions, let label = trombonePositionLabel(midi: item.event.midi, horn: horn) {
                    drawPosition(label, above: center, metrics: metrics, color: color)
                }
            }
        }
    }

    private func drawPosition(_ label: String, above center: CGPoint, metrics: Metrics, color: UIColor) {
        let font = moogFont(size: metrics.headHeight, weight: .medium)
        let text = label as NSString
        let textSize = text.size(withAttributes: [.font: font])
        let gap = metrics.spacing * 0.12
        text.draw(
            at: CGPoint(
                x: center.x - textSize.width / 2,
                y: center.y - metrics.headHeight / 2 - gap - textSize.height
            ),
            withAttributes: [
                .font: font,
                .foregroundColor: color,
            ]
        )
    }

    private func drawLedgerLines(
        for note: WrittenNote,
        centerX: CGFloat,
        metrics: Metrics,
        color: UIColor,
        in context: CGContext
    ) {
        let lineSteps: [Int]
        switch note.staff {
        case .treble: lineSteps = [2, 4, 6, 8, 10]
        case .tenor: lineSteps = [-6, -4, -2, 0, 2]
        case .bass: lineSteps = [-10, -8, -6, -4, -2]
        }
        let bottom = lineSteps.min() ?? 0
        let top = lineSteps.max() ?? 0
        var lines: [Int] = []
        if note.step < bottom {
            var line = bottom - 2
            while line >= note.step {
                lines.append(line)
                line -= 2
            }
        } else if note.step > top {
            var line = top + 2
            while line <= note.step {
                lines.append(line)
                line += 2
            }
        }
        guard !lines.isEmpty else { return }
        context.setStrokeColor(color.cgColor)
        context.setLineWidth(1)
        let half = metrics.headWidth * 0.85
        for step in lines {
            let lineY = y(for: step, staff: note.staff, metrics: metrics)
            context.move(to: CGPoint(x: centerX - half, y: lineY))
            context.addLine(to: CGPoint(x: centerX + half, y: lineY))
        }
        context.strokePath()
    }

    private func drawNoteHead(at center: CGPoint, metrics: Metrics, color: UIColor, in context: CGContext) {
        context.saveGState()
        context.translateBy(x: center.x, y: center.y)
        context.rotate(by: -0.4)
        context.setFillColor(color.cgColor)
        context.fillEllipse(in: CGRect(
            x: -metrics.headWidth / 2,
            y: -metrics.headHeight / 2,
            width: metrics.headWidth,
            height: metrics.headHeight
        ))
        context.restoreGState()
    }

    private func drawAccidental(_ accidental: ScoreAccidental, at center: CGPoint, size: CGFloat, color: UIColor) {
        drawScoreAccidental(accidental, at: center, size: size, color: color)
    }

    /// Returns true when the system font can draw the clef. The anchor is the G line or the F line.
    private func drawClefGlyph(
        _ glyph: String,
        anchor: CGPoint,
        pointSize: CGFloat,
        anchorFraction: CGFloat,
        xFraction: CGFloat
    ) -> Bool {
        let base = CTFontCreateWithName("Helvetica" as CFString, pointSize, nil)
        let cfGlyph = glyph as CFString
        let font = CTFontCreateForString(base, cfGlyph, CFRange(location: 0, length: CFStringGetLength(cfGlyph)))
        let units = Array(glyph.utf16)
        var glyphs = [CGGlyph](repeating: 0, count: units.count)
        let supported = units.withUnsafeBufferPointer { chars -> Bool in
            glyphs.withUnsafeMutableBufferPointer { glyphBuf in
                guard let chars = chars.baseAddress, let glyphBuf = glyphBuf.baseAddress else { return false }
                return CTFontGetGlyphsForCharacters(font, chars, glyphBuf, units.count)
            }
        }
        guard supported, glyphs.contains(where: { $0 != 0 }) else { return false }
        let name = CTFontCopyPostScriptName(font) as String
        guard let uiFont = UIFont(name: name, size: pointSize) else { return false }
        let attributes: [NSAttributedString.Key: Any] = [
            .font: uiFont,
            .foregroundColor: UIColor.white,
        ]
        let textSize = (glyph as NSString).size(withAttributes: attributes)
        (glyph as NSString).draw(
            at: CGPoint(x: anchor.x - textSize.width * xFraction, y: anchor.y - textSize.height * anchorFraction),
            withAttributes: attributes
        )
        return true
    }

    private func strokeTrebleClef(gLine: CGPoint, spacing: CGFloat) {
        let s = spacing
        let path = UIBezierPath()
        path.move(to: CGPoint(x: gLine.x + 0.15 * s, y: gLine.y + 2.45 * s))
        path.addCurve(
            to: CGPoint(x: gLine.x - 0.85 * s, y: gLine.y + 1.35 * s),
            controlPoint1: CGPoint(x: gLine.x - 0.95 * s, y: gLine.y + 2.7 * s),
            controlPoint2: CGPoint(x: gLine.x - 1.25 * s, y: gLine.y + 1.95 * s)
        )
        path.addCurve(
            to: CGPoint(x: gLine.x + 0.25 * s, y: gLine.y + 0.15 * s),
            controlPoint1: CGPoint(x: gLine.x - 0.35 * s, y: gLine.y + 0.7 * s),
            controlPoint2: CGPoint(x: gLine.x - 0.05 * s, y: gLine.y + 0.35 * s)
        )
        path.addCurve(
            to: CGPoint(x: gLine.x + 0.95 * s, y: gLine.y - 1.45 * s),
            controlPoint1: CGPoint(x: gLine.x + 0.85 * s, y: gLine.y - 0.15 * s),
            controlPoint2: CGPoint(x: gLine.x + 1.3 * s, y: gLine.y - 0.45 * s)
        )
        path.addCurve(
            to: CGPoint(x: gLine.x - 0.15 * s, y: gLine.y - 2.55 * s),
            controlPoint1: CGPoint(x: gLine.x + 0.65 * s, y: gLine.y - 2.45 * s),
            controlPoint2: CGPoint(x: gLine.x + 0.15 * s, y: gLine.y - 2.85 * s)
        )
        path.addCurve(
            to: CGPoint(x: gLine.x + 0.3 * s, y: gLine.y - 0.1 * s),
            controlPoint1: CGPoint(x: gLine.x - 0.7 * s, y: gLine.y - 2.0 * s),
            controlPoint2: CGPoint(x: gLine.x - 0.45 * s, y: gLine.y - 0.55 * s)
        )
        path.addCurve(
            to: CGPoint(x: gLine.x + 0.9 * s, y: gLine.y + 0.55 * s),
            controlPoint1: CGPoint(x: gLine.x + 1.2 * s, y: gLine.y + 0.35 * s),
            controlPoint2: CGPoint(x: gLine.x + 1.25 * s, y: gLine.y + 0.75 * s)
        )
        path.addCurve(
            to: CGPoint(x: gLine.x + 0.05 * s, y: gLine.y + 0.05 * s),
            controlPoint1: CGPoint(x: gLine.x + 0.5 * s, y: gLine.y + 0.9 * s),
            controlPoint2: CGPoint(x: gLine.x + 0.15 * s, y: gLine.y + 0.45 * s)
        )
        path.lineWidth = max(1.25, s * 0.2)
        path.lineCapStyle = .round
        path.lineJoinStyle = .round
        path.stroke()
    }

    private func strokeTenorClef(cLine: CGPoint, spacing: CGFloat) {
        let s = spacing
        let bars = UIBezierPath()
        for x in [cLine.x - 1.35 * s, cLine.x - 1.05 * s] {
            bars.move(to: CGPoint(x: x, y: cLine.y - 1.85 * s))
            bars.addLine(to: CGPoint(x: x, y: cLine.y + 1.85 * s))
        }
        bars.lineWidth = max(1.3, s * 0.18)
        bars.lineCapStyle = .butt
        bars.stroke()
        let curves = UIBezierPath()
        curves.move(to: CGPoint(x: cLine.x - 0.7 * s, y: cLine.y - 0.12 * s))
        curves.addCurve(
            to: CGPoint(x: cLine.x + 0.85 * s, y: cLine.y - 1.15 * s),
            controlPoint1: CGPoint(x: cLine.x + 0.15 * s, y: cLine.y - 0.15 * s),
            controlPoint2: CGPoint(x: cLine.x + 0.95 * s, y: cLine.y - 0.45 * s)
        )
        curves.addCurve(
            to: CGPoint(x: cLine.x - 0.15 * s, y: cLine.y - 1.85 * s),
            controlPoint1: CGPoint(x: cLine.x + 0.75 * s, y: cLine.y - 1.75 * s),
            controlPoint2: CGPoint(x: cLine.x + 0.25 * s, y: cLine.y - 1.95 * s)
        )
        curves.move(to: CGPoint(x: cLine.x - 0.7 * s, y: cLine.y + 0.12 * s))
        curves.addCurve(
            to: CGPoint(x: cLine.x + 0.85 * s, y: cLine.y + 1.15 * s),
            controlPoint1: CGPoint(x: cLine.x + 0.15 * s, y: cLine.y + 0.15 * s),
            controlPoint2: CGPoint(x: cLine.x + 0.95 * s, y: cLine.y + 0.45 * s)
        )
        curves.addCurve(
            to: CGPoint(x: cLine.x - 0.15 * s, y: cLine.y + 1.85 * s),
            controlPoint1: CGPoint(x: cLine.x + 0.75 * s, y: cLine.y + 1.75 * s),
            controlPoint2: CGPoint(x: cLine.x + 0.25 * s, y: cLine.y + 1.95 * s)
        )
        curves.lineWidth = max(1.4, s * 0.22)
        curves.lineCapStyle = .round
        curves.stroke()
    }

    private func drawBassClef(fLine: CGPoint, spacing: CGFloat, in context: CGContext) {
        let s = spacing
        let path = UIBezierPath()
        path.move(to: CGPoint(x: fLine.x + 0.15 * s, y: fLine.y - 1.35 * s))
        path.addCurve(
            to: CGPoint(x: fLine.x + 0.05 * s, y: fLine.y + 1.35 * s),
            controlPoint1: CGPoint(x: fLine.x - 1.35 * s, y: fLine.y - 0.85 * s),
            controlPoint2: CGPoint(x: fLine.x - 1.35 * s, y: fLine.y + 0.85 * s)
        )
        path.lineWidth = max(1.4, s * 0.28)
        path.lineCapStyle = .round
        path.stroke()
        let dot = max(1.6, s * 0.16)
        let dotX = fLine.x + 0.55 * s
        context.setFillColor(UIColor.white.cgColor)
        context.fillEllipse(in: CGRect(x: dotX, y: fLine.y - 0.5 * s - dot, width: dot * 2, height: dot * 2))
        context.fillEllipse(in: CGRect(x: dotX, y: fLine.y + 0.5 * s - dot, width: dot * 2, height: dot * 2))
    }
}
