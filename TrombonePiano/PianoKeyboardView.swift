import UIKit

/// Drawn keybed. Each finger is tracked on its own, and black keys win where they overlap a white key.
final class PianoKeyboardView: UIView {
    var scale: Double = keyScaleMax {
        didSet {
            if scale != oldValue {
                setNeedsDisplay()
            }
        }
    }

    var showNotes = true {
        didSet {
            if showNotes != oldValue {
                setNeedsDisplay()
            }
        }
    }

    var showKey = true {
        didSet {
            if showKey != oldValue {
                setNeedsDisplay()
            }
        }
    }

    var keyHatch: KeyHatch = .crosshatch {
        didSet {
            if keyHatch != oldValue {
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

    var noteColor = MoogPalette.labelGreen {
        didSet {
            if noteColor != oldValue {
                setNeedsDisplay()
            }
        }
    }

    var positionColor = MoogPalette.labelGreen {
        didSet {
            if positionColor != oldValue {
                setNeedsDisplay()
            }
        }
    }

    var keySignature: KeySignature = .bFlat {
        didSet {
            inKeyPitchClasses = pitchClasses(in: keySignature)
            if keySignature != oldValue {
                setNeedsDisplay()
            }
        }
    }

    private var inKeyPitchClasses: Set<Int> = pitchClasses(in: .bFlat)

    var onNotesChanged: ((Set<Int>) -> Void)?
    var onKeybedMoved: ((Double) -> Void)?
    /// The keybed has stopped after a drag or a fling.
    var onKeybedRest: ((Double) -> Void)?

    /// Left edge of A0 in the viewport. The same value shifts the bar above the keys.
    var keybedOrigin: Double { keybedOffset() }

    private var touchPoints: [ObjectIdentifier: CGPoint] = [:]
    private var pressed: Set<Int> = []
    private var originX: Double = 0 {
        didSet {
            if originX != oldValue {
                onKeybedMoved?(originX)
            }
        }
    }
    private var appliedScale: Double = -1
    private var appliedWidth: CGFloat = -1
    private var restoredOrigin: Double?
    private var dragStartOrigin: Double = 0
    private var motion: KeybedMotion?
    private var scrollProxy: ScrollLink?
    private var scrollLink: CADisplayLink?

    private enum KeybedMotion {
        case ease(
            from: Double,
            to: Double,
            start: CFTimeInterval,
            duration: CFTimeInterval,
            springTarget: Double?,
            springVelocity: Double
        )
        case spring(velocity: Double, target: Double, last: CFTimeInterval, began: CFTimeInterval)
    }

    private final class ScrollLink: NSObject {
        weak var keyboard: PianoKeyboardView?
        @objc func tick(_ link: CADisplayLink) {
            keyboard?.advanceKeybedScroll(timestamp: link.timestamp, duration: link.duration)
        }
    }

    deinit {
        scrollLink?.invalidate()
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        isMultipleTouchEnabled = true
        clipsToBounds = true
        backgroundColor = MoogPalette.panel
        contentMode = .redraw
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        updateOriginForLayout()
        setNeedsDisplay()
    }

    func restoreKeybedOrigin(_ origin: Double) {
        restoredOrigin = origin
    }

    func beginKeybedDrag() {
        stopKeybedMotion()
        dragStartOrigin = keybedOffset()
    }

    func updateKeybedDrag(translation: Double) {
        let width = bounds.width
        guard width > 0 else { return }
        let keys = layoutKeyboard(scale: scale)
        originX = keyboardOffsetForDrag(
            unbandedOffset: dragStartOrigin + translation,
            range: keyboardScrollRange(keyboardWidth: keyboardWidth(keys), viewportWidth: Double(width)),
            viewportWidth: Double(width)
        )
        rememberLayout()
        setNeedsDisplay()
    }

    func endKeybedDrag(velocity: Double) {
        let width = bounds.width
        guard width > 0 else { return }
        let keys = layoutKeyboard(scale: scale)
        let range = keyboardScrollRange(keyboardWidth: keyboardWidth(keys), viewportWidth: Double(width))
        let target = keyboardScrollTarget(
            offset: originX,
            velocity: velocity,
            range: range,
            octaveDistance: octaveScrollDistance(scale: scale)
        )
        let direction = velocity >= 0 ? 1.0 : -1.0
        switch keyboardFling(velocity: velocity) {
        case .settle:
            glide(to: target, duration: 0.25, springTarget: nil, springVelocity: 0)
        case .octave:
            let duration = min(0.42, max(0.24, abs(target - originX) / max(abs(velocity), 700)))
            glide(to: target, duration: duration, springTarget: nil, springVelocity: 0)
        case .end:
            let distance = abs(target - originX)
            if distance < 24 {
                spring(to: target, velocity: direction * min(abs(velocity), 850))
            } else {
                let duration = min(0.65, max(0.2, 2.4 * distance / max(abs(velocity), 500)))
                let arrival = min(780, 0.4 * distance / duration)
                glide(to: target, duration: duration, springTarget: target, springVelocity: direction * arrival)
            }
        }
    }

    private var noteBadge: NoteBadgeStyle?

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        let keys = layoutKeyboard(scale: scale)
        if let white = keys.first(where: { !$0.isBlack }) {
            noteBadge = noteBadgeStyle(visualKeyWidth: visualRect(for: white).width)
        } else {
            noteBadge = nil
        }
        context.saveGState()
        context.translateBy(x: CGFloat(keybedOffset()), y: -topCrop())
        for key in keys where !key.isBlack {
            drawKey(key, in: context)
        }
        for key in keys where key.isBlack {
            drawKey(key, in: context)
        }
        context.restoreGState()
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        track(touches)
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        track(touches)
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        release(touches)
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        release(touches)
    }

    private func track(_ touches: Set<UITouch>) {
        for touch in touches {
            touchPoints[ObjectIdentifier(touch)] = touch.location(in: self)
        }
        refreshPressed()
    }

    private func release(_ touches: Set<UITouch>) {
        for touch in touches {
            touchPoints.removeValue(forKey: ObjectIdentifier(touch))
        }
        refreshPressed()
    }

    private func refreshPressed() {
        let keys = layoutKeyboard(scale: scale)
        let offset = keybedOffset()
        var next: Set<Int> = []
        for point in touchPoints.values {
            if let note = noteAt(
                x: Double(point.x) - offset,
                y: Double(point.y) + Double(topCrop()),
                keys: keys
            ) {
                next.insert(note)
            }
        }
        if next != pressed {
            pressed = next
            setNeedsDisplay()
            onNotesChanged?(pressed)
        }
    }

    private func keybedOffset() -> Double {
        if appliedScale < 0 {
            let keys = layoutKeyboard(scale: scale)
            return centeredKeyboardOffset(
                keyboardWidth: keyboardWidth(keys),
                viewportWidth: Double(bounds.width)
            )
        }
        return originX
    }

    private func updateOriginForLayout() {
        let width = bounds.width
        guard width > 0 else { return }
        let keys = layoutKeyboard(scale: scale)
        let range = keyboardScrollRange(keyboardWidth: keyboardWidth(keys), viewportWidth: Double(width))
        if appliedScale < 0 || appliedWidth < 0 {
            if let restoredOrigin {
                originX = range.clamped(restoredOrigin)
                self.restoredOrigin = nil
            } else {
                originX = centeredKeyboardOffset(keyboardWidth: keyboardWidth(keys), viewportWidth: Double(width))
            }
        } else if scale != appliedScale {
            stopKeybedMotion()
            let keyboardX = Double(appliedWidth) / 2 - originX
            let scaledX = keyboardX * (scale / appliedScale)
            originX = range.clamped(Double(width) / 2 - scaledX)
        } else if width != appliedWidth {
            stopKeybedMotion()
            let keyboardX = Double(appliedWidth) / 2 - originX
            originX = range.clamped(Double(width) / 2 - keyboardX)
        }
        rememberLayout()
    }

    private func rememberLayout() {
        appliedScale = scale
        appliedWidth = bounds.width
    }

    private func glide(
        to target: Double,
        duration: Double,
        springTarget: Double?,
        springVelocity: Double
    ) {
        if abs(target - originX) < 0.5, springTarget == nil {
            originX = target
            settleKeybed()
            setNeedsDisplay()
            return
        }
        motion = .ease(
            from: originX,
            to: target,
            start: CACurrentMediaTime(),
            duration: max(0.01, duration),
            springTarget: springTarget,
            springVelocity: springVelocity
        )
        startScrollLink()
    }

    private func spring(to target: Double, velocity: Double) {
        if abs(target - originX) < 0.5, abs(velocity) < 40 {
            originX = target
            settleKeybed()
            setNeedsDisplay()
            return
        }
        let now = CACurrentMediaTime()
        motion = .spring(velocity: velocity, target: target, last: now, began: now)
        startScrollLink()
    }

    private func startScrollLink() {
        guard scrollLink == nil else { return }
        let proxy = ScrollLink()
        proxy.keyboard = self
        scrollProxy = proxy
        let link = CADisplayLink(target: proxy, selector: #selector(ScrollLink.tick(_:)))
        link.add(to: .main, forMode: .common)
        scrollLink = link
    }

    private func stopKeybedMotion() {
        motion = nil
        scrollLink?.invalidate()
        scrollLink = nil
        scrollProxy = nil
    }

    private func settleKeybed() {
        stopKeybedMotion()
        onKeybedRest?(originX)
    }

    fileprivate func advanceKeybedScroll(timestamp: CFTimeInterval, duration: CFTimeInterval) {
        guard var motion else { return }
        let dt = min(max(duration, 0), 1.0 / 30.0)
        switch motion {
        case .ease(let from, let to, let start, let easeDuration, let springTarget, let springVelocity):
            let t = (timestamp - start) / easeDuration
            if t >= 1 {
                originX = to
                if let springTarget {
                    motion = .spring(velocity: springVelocity, target: springTarget, last: timestamp, began: timestamp)
                    self.motion = motion
                } else {
                    settleKeybed()
                }
            } else {
                let progress = springTarget == nil ? easeOut(t) : flingProgress(t)
                originX = from + (to - from) * progress
            }
        case .spring(var velocity, let target, _, let began):
            let omega = 16.0
            let zeta = 0.55
            let displacement = originX - target
            let accel = -omega * omega * displacement - 2 * zeta * omega * velocity
            velocity += accel * dt
            originX += velocity * dt
            if (abs(originX - target) < 0.5 && abs(velocity) < 10) || timestamp - began > 1.6 {
                originX = target
                settleKeybed()
            } else {
                self.motion = .spring(velocity: velocity, target: target, last: timestamp, began: began)
            }
        }
        setNeedsDisplay()
    }

    /// Starts fast and is still moving when it arrives, so the end bounce can continue.
    private func flingProgress(_ t: Double) -> Double {
        let p = min(1, max(0, t))
        return 0.85 * p * p * p - 2.25 * p * p + 2.4 * p
    }

    private func easeOut(_ t: Double) -> Double {
        let p = min(1, max(0, t))
        return 1 - (1 - p) * (1 - p)
    }

    /// Distance from the top of the full key to the top of this view.
    /// The bottom of the key stays at the bottom of the view.
    private func topCrop() -> CGFloat {
        let fullHeight = CGFloat(whiteKeyHeightMm * scale * ipadProPointsPerMillimeter)
        return max(0, fullHeight - bounds.height)
    }

    /// The drawn key is inset from the hit-test rect so a gap and a shadow fit
    /// around it. Touches still use the full key.
    private func visualRect(for key: PianoKey) -> CGRect {
        let gap = clamped(key.rect.width * 0.08, min: 1, max: 4.5)
        let front = clamped(key.rect.height * 0.02, min: 2, max: 8)
        return CGRect(
            x: CGFloat(key.rect.left + gap / 2),
            y: CGFloat(key.rect.top),
            width: CGFloat(key.rect.width - gap),
            height: CGFloat(key.rect.height - front)
        )
    }

    private func pressTravel(for key: PianoKey, visual: CGRect) -> CGFloat {
        let front = CGFloat(key.rect.bottom) - visual.maxY
        return clamped(front * 0.55, min: 1, max: 4)
    }

    private func drawKey(_ key: PianoKey, in context: CGContext) {
        let visual = visualRect(for: key)
        let travel = pressTravel(for: key, visual: visual)
        let isPressed = pressed.contains(key.midiNote)
        let body = isPressed ? visual.offsetBy(dx: 0, dy: travel) : visual
        let shape = frontRounded(body)

        if isPressed {
            context.setFillColor(UIColor(hex: 0x0E0E0E).cgColor)
            context.fill(CGRect(x: visual.minX, y: visual.minY, width: visual.width, height: travel + 1))
        } else {
            context.saveGState()
            context.setShadow(
                offset: CGSize(width: 0, height: 1.5),
                blur: 2,
                color: UIColor.black.withAlphaComponent(0x59 / 255).cgColor
            )
            context.beginTransparencyLayer(auxiliaryInfo: nil)
            context.setFillColor(UIColor.black.cgColor)
            context.addPath(shape.cgPath)
            context.fillPath()
            context.endTransparencyLayer()
            context.restoreGState()
        }

        let top = isPressed
            ? (key.isBlack ? Self.blackPressedTop : Self.whitePressedTop)
            : (key.isBlack ? Self.blackTop : Self.whiteTop)
        let bottom = isPressed
            ? (key.isBlack ? Self.blackPressedBottom : Self.whitePressedBottom)
            : (key.isBlack ? Self.blackBottom : Self.whiteBottom)
        context.saveGState()
        context.addPath(shape.cgPath)
        context.clip()
        if let gradient = CGGradient(
            colorsSpace: CGColorSpaceCreateDeviceRGB(),
            colors: [top.cgColor, bottom.cgColor] as CFArray,
            locations: [0, 1]
        ) {
            context.drawLinearGradient(
                gradient,
                start: CGPoint(x: body.midX, y: body.minY),
                end: CGPoint(x: body.midX, y: body.maxY),
                options: []
            )
        }
        context.restoreGState()

        if showKey, !inKeyPitchClasses.contains(key.midiNote % 12) {
            drawKeyPattern(in: shape, onBlack: key.isBlack, context: context)
        }

        let edge = isPressed
            ? UIColor.black.withAlphaComponent(0x66 / 255)
            : (key.isBlack
                ? UIColor.white.withAlphaComponent(0x55 / 255)
                : UIColor.white.withAlphaComponent(0xCC / 255))
        context.setStrokeColor(edge.cgColor)
        context.setLineWidth(isPressed ? 2 : 1.2)
        let edgeY = body.minY + (isPressed ? 1.4 : 1.1)
        context.move(to: CGPoint(x: body.minX + 3, y: edgeY))
        context.addLine(to: CGPoint(x: body.maxX - 3, y: edgeY))
        context.strokePath()

        if let badge = noteBadge {
            let badgeRect = noteBadgeRect(in: body, badge: badge)
            if showNotes, !key.isBlack {
                drawNoteLabel(noteLabel(key.midiNote).uppercased(), in: badgeRect, badge: badge, context: context)
            }
            if showPositions, let position = trombonePosition(midi: key.midiNote) {
                let bottom = key.isBlack
                    ? body.maxY - body.height * 0.055
                    : badgeRect.minY - max(1, badge.fontSize * 0.12)
                drawPositionNumber(position, centerX: body.midX, bottom: bottom, fontSize: badge.fontSize)
            }
        }
    }

    private func drawKeyPattern(in shape: UIBezierPath, onBlack: Bool, context: CGContext) {
        context.saveGState()
        context.addPath(shape.cgPath)
        context.clip()
        let bounds = shape.bounds
        let spacing = max(4, min(8, bounds.width * 0.34))
        let color = onBlack
            ? UIColor.white.withAlphaComponent(0.72)
            : UIColor.black.withAlphaComponent(0.45)
        drawKeyHatch(keyHatch, in: bounds, spacing: spacing, color: color, lineWidth: 1, context: context)
        context.restoreGState()
    }

    private func frontRounded(_ rect: CGRect) -> UIBezierPath {
        let radius = clamped(rect.width * 0.16, min: 1.2, max: 9)
        return UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: [.bottomLeft, .bottomRight],
            cornerRadii: CGSize(width: radius, height: radius)
        )
    }

    private func noteBadgeRect(in body: CGRect, badge: NoteBadgeStyle) -> CGRect {
        CGRect(
            x: body.midX - badge.width / 2,
            y: body.maxY - badge.height - body.height * 0.045,
            width: badge.width,
            height: badge.height
        )
    }

    private func drawNoteLabel(
        _ label: String,
        in rect: CGRect,
        badge: NoteBadgeStyle,
        context: CGContext
    ) {
        let font = moogFont(size: badge.fontSize, weight: .medium)
        let textSize = (label as NSString).size(withAttributes: [.font: font])
        let badgePath = UIBezierPath(roundedRect: rect, cornerRadius: badge.cornerRadius)
        context.setStrokeColor(noteColor.cgColor)
        context.setLineWidth(1)
        context.addPath(badgePath.cgPath)
        context.strokePath()
        let textOrigin = CGPoint(
            x: rect.minX + (badge.width - textSize.width) / 2,
            y: rect.minY + (badge.height - textSize.height) / 2
        )
        (label as NSString).draw(
            at: textOrigin,
            withAttributes: [
                .font: font,
                .foregroundColor: noteColor,
            ]
        )
    }

    private func drawPositionNumber(_ position: Int, centerX: CGFloat, bottom: CGFloat, fontSize: CGFloat) {
        let font = moogFont(size: fontSize, weight: .medium)
        let text = "\(position)" as NSString
        let textSize = text.size(withAttributes: [.font: font])
        text.draw(
            at: CGPoint(x: centerX - textSize.width / 2, y: bottom - textSize.height),
            withAttributes: [
                .font: font,
                .foregroundColor: positionColor,
            ]
        )
    }

    private static let whiteTop = UIColor(hex: 0xFFFBF7)
    private static let whiteBottom = UIColor(hex: 0xE4DDD2)
    private static let whitePressedTop = UIColor(hex: 0xC8C2B6)
    private static let whitePressedBottom = UIColor(hex: 0xB7B1A6)
    private static let blackTop = UIColor(hex: 0x4A4A4E)
    private static let blackBottom = UIColor(hex: 0x141416)
    private static let blackPressedTop = UIColor(hex: 0x2A2A2C)
    private static let blackPressedBottom = UIColor(hex: 0x101012)
}

func moogFont(size: CGFloat, weight: UIFont.Weight) -> UIFont {
    UIFont(name: "Futura-Medium", size: size) ?? .systemFont(ofSize: size, weight: weight)
}

struct NoteBadgeStyle: Equatable {
    var width: CGFloat
    var height: CGFloat
    var cornerRadius: CGFloat
    var fontSize: CGFloat
}

/// One size for every white-key name. The font fits the widest name, so
/// shorter names use that same size.
func noteBadgeStyle(visualKeyWidth: CGFloat) -> NoteBadgeStyle? {
    let width = visualKeyWidth * 0.8
    guard width >= 8 else { return nil }
    let labels = (lowestMidiNote...highestMidiNote)
        .filter { !isBlackKey($0) }
        .map { noteLabel($0).uppercased() }
    let sampleSize: CGFloat = 20
    let sampleFont = moogFont(size: sampleSize, weight: .medium)
    let widest = labels.max { lhs, rhs in
        (lhs as NSString).size(withAttributes: [.font: sampleFont]).width
            < (rhs as NSString).size(withAttributes: [.font: sampleFont]).width
    }
    guard let widest else { return nil }
    let sampleWidth = (widest as NSString).size(withAttributes: [.font: sampleFont]).width
    guard sampleWidth > 0 else { return nil }
    let fontSize = sampleSize * (width * 0.82) / sampleWidth
    let font = moogFont(size: fontSize, weight: .medium)
    let height = (widest as NSString).size(withAttributes: [.font: font]).height / 0.72
    return NoteBadgeStyle(
        width: width,
        height: height,
        cornerRadius: height * 0.28,
        fontSize: fontSize
    )
}

func clamped(_ value: Double, min minValue: Double, max maxValue: Double) -> Double {
    Swift.min(Swift.max(value, minValue), maxValue)
}

func clamped(_ value: CGFloat, min minValue: CGFloat, max maxValue: CGFloat) -> CGFloat {
    Swift.min(Swift.max(value, minValue), maxValue)
}
