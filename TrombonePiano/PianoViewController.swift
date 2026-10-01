import UIKit

final class PianoViewController: UIViewController {
    /// The keybed is drawn at full height and the top is clipped.
    private static let visibleKeyHeightRatio = 0.85

    private var keyScale = keyScaleMax
    private var showNotes = true
    private var showKey = true
    private var keepAlive = false
    private var showPositions = true
    private var midiEnabled = false
    private var instrument: KeyboardInstrument = .trombone
    private var keySignature: KeySignature = .bFlat
    private var noteColor = MoogPalette.labelGreen
    private var positionColor = MoogPalette.labelGreen
    private var keyHatch: KeyHatch = .crosshatch
    private var keybedOrigin: Double?
    private var sounding: Set<Int> = []
    /// Notes still held, oldest first. The last one drives the slide.
    private var playedOrder: [Int] = []

    private enum Settings {
        static let keyScale = "keyScale"
        static let showNotes = "showNotes"
        static let showKey = "showKey"
        static let keepAlive = "keepAlive"
        static let showPositions = "showPositions"
        static let midi = "midi"
        static let instrument = "instrument"
        static let keySignature = "keySignature"
        static let keybedOrigin = "keybedOrigin"
        static let noteColor = "noteColor"
        static let positionColor = "positionColor"
        static let keyHatch = "keyHatch"
        static let scoreMagnification = "scoreMagnification"
        static let scoreOffsetX = "scoreOffsetX"
        static let scoreOffsetY = "scoreOffsetY"
    }

    private var scoreMagnification: Double = 1
    private var scoreOffset = CGPoint.zero

    private let audio = PianoAudio()
    private let midi = MidiOut()

    private let panel = MoogPanelView()
    private let woodClip = UIView()
    private let wood = RosewoodView()
    private let tromboneInner = UIImageView()
    private let tromboneOuter = UIImageView()
    private let tromboneOver = UIImageView()
    private let hornMessageLabel = UILabel()
    private let woodBorder = SliderBorderView()
    private let keyClip = UIView()
    private let keyboard = PianoKeyboardView()

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    /// Portrait on a phone leaves no room for a staff beside the controls.
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        UIDevice.current.userInterfaceIdiom == .pad ? .all : .landscape
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = MoogPalette.panel
        keyClip.clipsToBounds = true
        keyClip.backgroundColor = MoogPalette.panel
        keyClip.addSubview(keyboard)
        woodClip.clipsToBounds = true
        woodClip.backgroundColor = UIColor(hex: 0x4A1A10)
        woodClip.isAccessibilityElement = true
        woodClip.accessibilityIdentifier = "mahogany-strip"
        woodClip.accessibilityLabel = "Mahogany strip"
        woodClip.addSubview(wood)
        woodBorder.isUserInteractionEnabled = false
        woodClip.addSubview(woodBorder)
        for (name, layer) in [
            ("trombone_inner", tromboneInner),
            ("trombone_outer", tromboneOuter),
            ("trombone_over", tromboneOver),
        ] {
            layer.image = UIImage(named: name)
            layer.isUserInteractionEnabled = false
            layer.contentMode = .scaleToFill
            layer.isHidden = true
            woodClip.addSubview(layer)
        }
        hornMessageLabel.isHidden = true
        hornMessageLabel.isUserInteractionEnabled = false
        hornMessageLabel.textAlignment = .center
        hornMessageLabel.adjustsFontSizeToFitWidth = true
        hornMessageLabel.minimumScaleFactor = 0.5
        woodClip.addSubview(hornMessageLabel)
        view.addSubview(panel)
        view.addSubview(woodClip)
        view.addSubview(keyClip)

        let pan = UIPanGestureRecognizer(target: self, action: #selector(woodPanned(_:)))
        pan.maximumNumberOfTouches = 1
        woodClip.addGestureRecognizer(pan)
        keyboard.onKeybedMoved = { [weak self] origin in
            guard let self else { return }
            self.wood.frame.origin.x = CGFloat(origin)
            self.keybedOrigin = origin
        }
        keyboard.onKeybedRest = { [weak self] origin in
            guard let self else { return }
            self.keybedOrigin = origin
            self.saveSettings()
        }

        loadSettings()
        panel.onScoreViewChanged = { [weak self] magnification, offset in
            guard let self else { return }
            self.scoreMagnification = Double(magnification)
            self.scoreOffset = offset
            self.saveSettings()
        }
        panel.onScaleChanged = { [weak self] scale in
            guard let self else { return }
            self.keyScale = scale
            self.saveSettings()
            self.view.setNeedsLayout()
        }
        panel.onShowNotesChanged = { [weak self] show in
            guard let self else { return }
            self.showNotes = show
            self.saveSettings()
            self.view.setNeedsLayout()
        }
        panel.onShowKeyChanged = { [weak self] show in
            guard let self else { return }
            self.showKey = show
            self.saveSettings()
            self.view.setNeedsLayout()
        }
        panel.onKeepAliveChanged = { [weak self] enabled in
            guard let self else { return }
            self.keepAlive = enabled
            self.saveSettings()
            self.applyKeepAlive()
        }
        panel.onShowPositionsChanged = { [weak self] show in
            guard let self else { return }
            self.showPositions = show
            self.saveSettings()
            self.view.setNeedsLayout()
        }
        panel.onMidiChanged = { [weak self] enabled in
            guard let self, self.midiEnabled != enabled else { return }
            self.midiEnabled = enabled
            self.saveSettings()
            if enabled {
                self.audio.setSounding([])
                if self.midi.setEnabled(true) {
                    self.midi.play(started: self.sounding.sorted(), stopped: [])
                } else {
                    self.midiEnabled = false
                    self.audio.setSounding(self.sounding)
                    self.view.setNeedsLayout()
                }
            } else {
                self.midi.setEnabled(false)
                self.audio.resumeIfNeeded()
                self.audio.setSounding(self.sounding)
            }
        }
        panel.onInstrumentChanged = { [weak self] instrument in
            guard let self else { return }
            self.instrument = instrument
            self.saveSettings()
            self.audio.setInstrument(instrument)
            self.view.setNeedsLayout()
        }
        panel.onKeySignatureChanged = { [weak self] key in
            guard let self else { return }
            self.keySignature = key
            self.saveSettings()
            self.view.setNeedsLayout()
        }
        panel.onNoteColorChanged = { [weak self] color in
            guard let self, self.noteColor.rgbHex != color.rgbHex else { return }
            self.noteColor = color
            self.saveSettings()
            self.view.setNeedsLayout()
        }
        panel.onPositionColorChanged = { [weak self] color in
            guard let self, self.positionColor.rgbHex != color.rgbHex else { return }
            self.positionColor = color
            self.saveSettings()
            self.view.setNeedsLayout()
        }
        panel.onKeyHatchChanged = { [weak self] hatch in
            guard let self, self.keyHatch != hatch else { return }
            self.keyHatch = hatch
            self.saveSettings()
            self.view.setNeedsLayout()
        }
        keyboard.onNotesChanged = { [weak self] notes in
            guard let self else { return }
            let changes = noteChanges(from: self.sounding, to: notes)
            self.sounding = notes
            if self.midiEnabled {
                self.midi.play(started: changes.started, stopped: changes.stopped)
            } else {
                self.audio.setSounding(notes)
            }
            self.panel.recordPlayed(started: changes.started, stopped: changes.stopped)
            for midi in changes.stopped {
                self.playedOrder.removeAll { $0 == midi }
            }
            self.playedOrder.append(contentsOf: changes.started)
            self.layoutTrombone(barHeight: self.woodClip.bounds.height, animated: true)
        }
        applyKeepAlive()
        audio.start(instrument: instrument)
        if midiEnabled {
            if !midi.setEnabled(true) {
                midiEnabled = false
            }
        }
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(applicationDidBecomeActive(_:)),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(applicationWillResignActive(_:)),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
    }

    private func loadSettings() {
        let defaults = UserDefaults.standard
        if defaults.object(forKey: Settings.keyScale) != nil {
            let stored = defaults.double(forKey: Settings.keyScale)
            if stored.isFinite {
                keyScale = min(keyScaleMax, max(stored, 0))
            }
        }
        if defaults.object(forKey: Settings.showNotes) != nil {
            showNotes = defaults.bool(forKey: Settings.showNotes)
        }
        if defaults.object(forKey: Settings.showKey) != nil {
            showKey = defaults.bool(forKey: Settings.showKey)
        }
        if defaults.object(forKey: Settings.keepAlive) != nil {
            keepAlive = defaults.bool(forKey: Settings.keepAlive)
        }
        if defaults.object(forKey: Settings.showPositions) != nil {
            showPositions = defaults.bool(forKey: Settings.showPositions)
        }
        if defaults.object(forKey: Settings.midi) != nil {
            midiEnabled = defaults.bool(forKey: Settings.midi)
        }
        if let raw = defaults.string(forKey: Settings.instrument),
           let stored = KeyboardInstrument(rawValue: raw) {
            instrument = stored
        }
        if let raw = defaults.string(forKey: Settings.keySignature),
           let stored = KeySignature.matching(raw) {
            keySignature = stored
        }
        if defaults.object(forKey: Settings.noteColor) != nil {
            noteColor = UIColor(hex: UInt32(defaults.integer(forKey: Settings.noteColor)))
        }
        if defaults.object(forKey: Settings.positionColor) != nil {
            positionColor = UIColor(hex: UInt32(defaults.integer(forKey: Settings.positionColor)))
        }
        if let raw = defaults.string(forKey: Settings.keyHatch),
           let stored = KeyHatch(rawValue: raw) {
            keyHatch = stored
        }
        if defaults.object(forKey: Settings.keybedOrigin) != nil {
            let stored = defaults.double(forKey: Settings.keybedOrigin)
            if stored.isFinite {
                keybedOrigin = stored
                keyboard.restoreKeybedOrigin(stored)
            }
        }
        if defaults.object(forKey: Settings.scoreMagnification) != nil {
            let stored = defaults.double(forKey: Settings.scoreMagnification)
            if stored.isFinite {
                scoreMagnification = stored
            }
            let x = defaults.double(forKey: Settings.scoreOffsetX)
            let y = defaults.double(forKey: Settings.scoreOffsetY)
            if x.isFinite, y.isFinite {
                scoreOffset = CGPoint(x: x, y: y)
            }
            panel.restoreScoreView(
                magnification: CGFloat(scoreMagnification),
                offset: scoreOffset
            )
        }
    }

    private func saveSettings() {
        let defaults = UserDefaults.standard
        defaults.set(keyScale, forKey: Settings.keyScale)
        defaults.set(showNotes, forKey: Settings.showNotes)
        defaults.set(showKey, forKey: Settings.showKey)
        defaults.set(keepAlive, forKey: Settings.keepAlive)
        defaults.set(showPositions, forKey: Settings.showPositions)
        defaults.set(midiEnabled, forKey: Settings.midi)
        defaults.set(instrument.rawValue, forKey: Settings.instrument)
        defaults.set(keySignature.id, forKey: Settings.keySignature)
        defaults.set(Int(noteColor.rgbHex), forKey: Settings.noteColor)
        defaults.set(Int(positionColor.rgbHex), forKey: Settings.positionColor)
        defaults.set(keyHatch.rawValue, forKey: Settings.keyHatch)
        if let keybedOrigin {
            defaults.set(keybedOrigin, forKey: Settings.keybedOrigin)
        }
        defaults.set(scoreMagnification, forKey: Settings.scoreMagnification)
        defaults.set(scoreOffset.x, forKey: Settings.scoreOffsetX)
        defaults.set(scoreOffset.y, forKey: Settings.scoreOffsetY)
    }

    private func applyKeepAlive() {
        UIApplication.shared.isIdleTimerDisabled = keepAlive
    }

    @objc private func applicationWillResignActive(_ notification: Notification) {
        saveSettings()
        if midiEnabled {
            midi.releaseHeldNotes()
        }
    }

    @objc private func applicationDidBecomeActive(_ notification: Notification) {
        applyKeepAlive()
        audio.resumeIfNeeded()
        if midiEnabled {
            midi.play(started: sounding.sorted(), stopped: [])
        } else {
            audio.setSounding(sounding)
        }
    }

    @objc private func woodPanned(_ pan: UIPanGestureRecognizer) {
        switch pan.state {
        case .began:
            keyboard.beginKeybedDrag()
        case .changed:
            keyboard.updateKeybedDrag(translation: Double(pan.translation(in: woodClip).x))
        case .ended:
            keyboard.endKeybedDrag(velocity: Double(pan.velocity(in: wood).x))
        case .cancelled, .failed:
            keyboard.endKeybedDrag(velocity: 0)
        default:
            break
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let insets = view.safeAreaInsets
        let width = Double(view.bounds.width - insets.left - insets.right)
        let height = Double(view.bounds.height)
        let minScale = scaleThatFitsKeyboard(width)
        let heightCap = scaleForVisibleKeyHeight(
            MoogLayout.maxVisibleKeyHeight(viewportHeight: height),
            visibleRatio: Self.visibleKeyHeightRatio
        )
        let maxScale = min(keyScaleMax, max(heightCap, minScale))
        let scale = min(max(keyScale, minScale), maxScale)
        let fullKeyHeight = whiteKeyHeightMm * scale * ipadProPointsPerMillimeter
        let keyHeight = fullKeyHeight * Self.visibleKeyHeightRatio
        let layout = MoogLayout.layout(viewportHeight: height, keyHeight: keyHeight)
        let contentX = insets.left

        panel.frame = CGRect(x: contentX, y: 0, width: CGFloat(width), height: CGFloat(layout.panelHeight))
        panel.apply(
            scale: scale,
            minScale: minScale,
            maxScale: maxScale,
            showNotes: showNotes,
            showKey: showKey,
            keepAlive: keepAlive,
            showPositions: showPositions,
            midi: midiEnabled,
            instrument: instrument,
            keySignature: keySignature,
            noteColor: noteColor,
            positionColor: positionColor,
            keyHatch: keyHatch,
            topInset: view.safeAreaInsets.top
        )
        panel.layoutIfNeeded()

        woodClip.frame = CGRect(
            x: contentX,
            y: CGFloat(layout.panelHeight),
            width: CGFloat(width),
            height: CGFloat(layout.woodHeight)
        )
        let keysTop = layout.panelHeight + layout.woodHeight
        let keysAreaHeight = height - keysTop
        keyClip.frame = CGRect(
            x: contentX,
            y: CGFloat(keysTop),
            width: CGFloat(width),
            height: CGFloat(keysAreaHeight)
        )
        keyboard.scale = scale
        keyboard.showNotes = showNotes
        keyboard.showKey = showKey
        keyboard.showPositions = showPositions && instrument == .trombone
        keyboard.noteColor = noteColor
        keyboard.positionColor = positionColor
        keyboard.keyHatch = keyHatch
        keyboard.keySignature = keySignature
        keyboard.frame = CGRect(
            x: 0,
            y: CGFloat(keysAreaHeight - keyHeight),
            width: CGFloat(width),
            height: CGFloat(keyHeight)
        )
        keyboard.layoutIfNeeded()
        let bedWidth = keyboardWidth(layoutKeyboard(scale: scale))
        wood.frame = CGRect(
            x: CGFloat(keyboard.keybedOrigin),
            y: 0,
            width: CGFloat(bedWidth),
            height: CGFloat(layout.woodHeight)
        )
        layoutTrombone(barHeight: CGFloat(layout.woodHeight))
        woodBorder.frame = woodClip.bounds
    }

    /// The three drawings share one canvas. The horn stays at the previous bar height, centered.
    /// Only the outer slide shifts, and only while positions are showing.
    private func layoutTrombone(barHeight: CGFloat, animated: Bool = false) {
        let showHorn = instrument == .trombone
        tromboneInner.isHidden = !showHorn
        tromboneOuter.isHidden = !showHorn
        tromboneOver.isHidden = !showHorn

        let canvas = tromboneInner.image?.size ?? CGSize(width: 1498, height: 334)
        let aspect = canvas.height > 0 ? canvas.width / canvas.height : 1
        let height = barHeight / CGFloat(MoogLayout.barHeightFactor)
        let width = height * aspect
        let frame = CGRect(
            x: (woodClip.bounds.width - width) / 2,
            y: (barHeight - height) / 2,
            width: width,
            height: height
        )
        var outer = frame
        if showHorn, showPositions, let note = playedOrder.last, let position = trombonePosition(midi: note) {
            let shift = tromboneOuterShift(
                position: position,
                displayedWidth: Double(width),
                fullWidth: Double(canvas.width)
            )
            outer.origin.x += CGFloat(shift)
            outer.origin.y += CGFloat(tromboneOuterDrop(horizontal: shift))
        }
        let note = playedOrder.last
        let hornMessage = showHorn ? note.flatMap(tromboneHornMessage) : nil
        let fontSize = max(13, min(22, height * 0.16))
        let visible = frame.intersection(woodClip.bounds)
        let labelFrame = CGRect(
            x: visible.minX,
            y: visible.midY - fontSize,
            width: max(0, visible.width),
            height: fontSize * 2
        )
        let apply = {
            self.tromboneInner.frame = frame
            self.tromboneOuter.frame = outer
            self.tromboneOver.frame = frame
            self.hornMessageLabel.frame = labelFrame
            self.hornMessageLabel.attributedText = hornMessage.map { self.hornMessageText($0, fontSize: fontSize) }
            self.hornMessageLabel.isHidden = hornMessage == nil
        }
        if animated, showHorn, woodClip.window != nil {
            UIView.animate(
                withDuration: 0.18,
                delay: 0,
                options: [.curveEaseOut, .beginFromCurrentState, .allowUserInteraction],
                animations: apply
            )
        } else {
            apply()
        }
    }

    private func hornMessageText(_ message: String, fontSize: CGFloat) -> NSAttributedString {
        let shadow = NSShadow()
        shadow.shadowColor = UIColor.black
        shadow.shadowOffset = .zero
        shadow.shadowBlurRadius = 3
        return NSAttributedString(
            string: message,
            attributes: [
                .font: moogFont(size: fontSize, weight: .medium),
                .foregroundColor: UIColor(hex: 0xFF2A2A),
                .shadow: shadow,
            ]
        )
    }
}

private final class SliderBorderView: UIView {
    override init(frame: CGRect) {
        super.init(frame: frame)
        isOpaque = false
        backgroundColor = .clear
        contentMode = .redraw
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func draw(_ rect: CGRect) {
        let path = UIBezierPath(rect: bounds.insetBy(dx: 1, dy: 1))
        path.lineWidth = 2
        UIColor.black.setStroke()
        path.stroke()
    }
}
