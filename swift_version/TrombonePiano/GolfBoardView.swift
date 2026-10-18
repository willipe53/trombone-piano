import UIKit

/// Columns of face-up notes. The bottom card of a column is the one that can be taken.
final class GolfBoardView: UIView {
    var deal: GolfDeal {
        didSet { setNeedsDisplay() }
    }

    var armedColumn: Int? {
        didSet { setNeedsDisplay() }
    }

    var onColumn: ((Int) -> Void)?

    private var hitRects: [Int: CGRect] = [:]

    init(deal: GolfDeal) {
        self.deal = deal
        super.init(frame: .zero)
        backgroundColor = .clear
        contentMode = .redraw
        isAccessibilityElement = false
        let tap = UITapGestureRecognizer(target: self, action: #selector(tapped(_:)))
        addGestureRecognizer(tap)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        setNeedsDisplay()
    }

    @objc private func tapped(_ gesture: UITapGestureRecognizer) {
        let point = gesture.location(in: self)
        guard let column = column(at: point) else { return }
        onColumn?(column)
    }

    func column(at point: CGPoint) -> Int? {
        let hits = hitRects.filter { $0.value.contains(point) }
        if hits.count == 1 { return hits.first?.key }
        if hits.count > 1 {
            return hits.min { lhs, rhs in
                distance(point, lhs.value) < distance(point, rhs.value)
            }?.key
        }
        return nil
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        let layout = makeLayout()
        hitRects = layout.hits
        if let waste = deal.wasteCard {
            drawCard(
                waste,
                in: layout.waste,
                staff: deal.clef,
                armed: false,
                faceUp: true,
                context: context
            )
        }
        for (index, column) in deal.columns.enumerated() {
            let rects = layout.columns[index]
            for (cardIndex, card) in column.enumerated().reversed() {
                guard rects.indices.contains(cardIndex) else { continue }
                drawCard(
                    card,
                    in: rects[cardIndex],
                    staff: deal.clef,
                    armed: armedColumn == index && cardIndex == 0,
                    faceUp: true,
                    context: context
                )
            }
        }
    }

    private struct Layout {
        var waste: CGRect
        var columns: [[CGRect]]
        var hits: [Int: CGRect]
    }

    private func makeLayout() -> Layout {
        let gap: CGFloat = 8
        let margin: CGFloat = 12
        let height = max(36, min(86, (bounds.height - margin * 2 - gap * 2) / CGFloat(GolfDeal.columnHeight)))
        let wasteWidth = min(88, max(64, bounds.width * 0.18))
        let columnsLeft = margin + wasteWidth + gap * 2
        let columnsWidth = max(0, bounds.width - columnsLeft - margin)
        let count = max(deal.columns.count, 1)
        let cardWidth = max(30, min(78, (columnsWidth - gap * CGFloat(count - 1)) / CGFloat(count)))
        let waste = CGRect(
            x: margin,
            y: bounds.height - margin - height,
            width: wasteWidth,
            height: height
        )
        var columns: [[CGRect]] = []
        var hits: [Int: CGRect] = [:]
        let rowWidth = CGFloat(count) * cardWidth + gap * CGFloat(count - 1)
        let originX = columnsLeft + max(0, (columnsWidth - rowWidth) / 2)
        for index in deal.columns.indices {
            var rects: [CGRect] = []
            let x = originX + CGFloat(index) * (cardWidth + gap)
            let depth = deal.columns[index].count
            for cardIndex in 0..<depth {
                let y = bounds.height - margin - height - CGFloat(cardIndex) * (height * 0.72)
                let rect = CGRect(x: x, y: y, width: cardWidth, height: height)
                rects.append(rect)
                if cardIndex == 0 {
                    hits[index] = rect.insetBy(dx: -4, dy: -4).intersection(bounds.insetBy(dx: -8, dy: -8))
                    if hits[index]!.width < 30 || hits[index]!.height < 30 {
                        hits[index] = rect.insetBy(dx: min(0, (rect.width - 30) / 2), dy: min(0, (rect.height - 30) / 2))
                    }
                }
            }
            columns.append(rects)
        }
        return Layout(waste: waste, columns: columns, hits: hits)
    }

    private func drawCard(
        _ card: GolfCard,
        in rect: CGRect,
        staff: ScoreStaff,
        armed: Bool,
        faceUp: Bool,
        context: CGContext
    ) {
        let path = UIBezierPath(roundedRect: rect, cornerRadius: 8)
        UIColor(hex: 0x2A2A2A).setFill()
        path.fill()
        (armed ? MoogPalette.labelGreen : UIColor.white.withAlphaComponent(0.35)).setStroke()
        path.lineWidth = armed ? 2 : 1
        path.stroke()
        guard faceUp else { return }
        let written = writtenNote(midi: card.midi, instrument: .trombone, key: GolfDeal.spelling)
        drawMiniStaff(in: rect, step: written.step, accidental: written.accidental, staff: staff, context: context)
        if let stop = card.revealed {
            let font = moogFont(size: min(14, rect.height * 0.22), weight: .medium)
            let text = stop.label as NSString
            let size = text.size(withAttributes: [.font: font])
            text.draw(
                at: CGPoint(x: rect.midX - size.width / 2, y: rect.maxY - size.height - 4),
                withAttributes: [.font: font, .foregroundColor: MoogPalette.labelGreen]
            )
        }
    }

    private func drawMiniStaff(
        in rect: CGRect,
        step: Int,
        accidental: ScoreAccidental?,
        staff: ScoreStaff,
        context: CGContext
    ) {
        let topStep = staff == .tenor ? 2 : -2
        let spacing = min(9, (rect.height - 22) / 4)
        let staffTop = rect.minY + 8
        let left = rect.minX + 6
        let right = rect.maxX - 6
        context.setStrokeColor(UIColor.white.withAlphaComponent(0.55).cgColor)
        context.setLineWidth(1)
        for line in 0..<5 {
            let y = staffTop + CGFloat(line) * spacing
            context.move(to: CGPoint(x: left, y: y))
            context.addLine(to: CGPoint(x: right, y: y))
        }
        context.strokePath()
        let center = CGPoint(
            x: rect.midX + 4,
            y: staffTop + CGFloat(topStep - step) * (spacing / 2)
        )
        let head = CGSize(width: spacing * 1.15, height: spacing * 0.8)
        drawLedger(step: step, staff: staff, centerX: center.x, staffTop: staffTop, spacing: spacing, half: head.width * 0.7, context: context)
        if let accidental {
            drawScoreAccidental(
                accidental,
                at: CGPoint(x: center.x - head.width, y: center.y),
                size: spacing * 2.2,
                color: .white
            )
        }
        let headRect = CGRect(x: center.x - head.width / 2, y: center.y - head.height / 2, width: head.width, height: head.height)
        context.setFillColor(UIColor.white.cgColor)
        context.fillEllipse(in: headRect)
    }

    private func drawLedger(
        step: Int,
        staff: ScoreStaff,
        centerX: CGFloat,
        staffTop: CGFloat,
        spacing: CGFloat,
        half: CGFloat,
        context: CGContext
    ) {
        let top = staff == .tenor ? 2 : -2
        let bottom = top - 8
        var lines: [Int] = []
        if step > top {
            var line = top + 2
            while line <= step {
                lines.append(line)
                line += 2
            }
        } else if step < bottom {
            var line = bottom - 2
            while line >= step {
                lines.append(line)
                line -= 2
            }
        }
        context.setStrokeColor(UIColor.white.withAlphaComponent(0.55).cgColor)
        for line in lines {
            let y = staffTop + CGFloat(top - line) * (spacing / 2)
            context.move(to: CGPoint(x: centerX - half, y: y))
            context.addLine(to: CGPoint(x: centerX + half, y: y))
        }
        context.strokePath()
    }
}

private func distance(_ point: CGPoint, _ rect: CGRect) -> CGFloat {
    hypot(rect.midX - point.x, rect.midY - point.y)
}
