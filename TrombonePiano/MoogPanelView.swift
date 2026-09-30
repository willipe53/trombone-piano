import CoreAudioKit
import UIKit

final class MoogPanelView: UIView, UIScrollViewDelegate, UIGestureRecognizerDelegate {
    var onScaleChanged: ((Double) -> Void)?
    var onShowNotesChanged: ((Bool) -> Void)?
    var onShowKeyChanged: ((Bool) -> Void)?
    var onKeepAliveChanged: ((Bool) -> Void)?
    var onInstrumentChanged: ((KeyboardInstrument) -> Void)?
    var onShowPositionsChanged: ((Bool) -> Void)?
    var onMidiChanged: ((Bool) -> Void)?
    var onNoteColorChanged: ((UIColor) -> Void)?
    var onPositionColorChanged: ((UIColor) -> Void)?
    var onKeyHatchChanged: ((KeyHatch) -> Void)?
    var onKeySignatureChanged: ((KeySignature) -> Void)?
    var onScoreViewChanged: ((CGFloat, CGPoint) -> Void)?

    private let controlScroll = UIScrollView()
    private let controlContent = UIView()
    private let keySizeLabel = moogCaption("KEY SIZE")
    private let showNotesLabel = moogCaption("SHOW NOTES")
    private let showKeyLabel = moogCaption("SHOW KEY")
    private let keepAliveLabel = moogCaption("KEEP ALIVE")
    private let tromboneLabel = moogCaption("TROMBONE")
    private let showPositionsLabel = moogCaption("SHOW POSITIONS")
    private let midiLabel = moogCaption("MIDI")
    private let keyLabel = moogCaption("KEY SIGNATURE")
    private let fader = MoogFader()
    private let rocker = MoogRocker()
    private let showKeyRocker = MoogRocker()
    private let keepAliveRocker = MoogRocker()
    private let instrumentRocker = MoogRocker()
    private let showPositionsRocker = MoogRocker()
    private let midiRocker = MoogRocker()
    private let bluetoothButton = UIButton(type: .system)
    private let noteColorWell = UIColorWell()
    private let positionColorWell = UIColorWell()
    private let hatchWell = HatchWell()
    private let keyButton = UIButton(type: .system)
    private let clearButton = UIButton(type: .system)
    private let scoreScroll = UIScrollView()
    private let score = ScoreView()
    private let titleLabel = UILabel()
    private let helpButton = HelpBallButton()
    private let recenterButton = UIButton(type: .system)
    private var topInset: CGFloat = 0
    private let titleBandHeight: CGFloat = 44
    /// 1 is the fitted staff. Pinching grows it up to `scoreMagnificationMax`.
    private var scoreMagnification: CGFloat = 1
    private var pinchStartMagnification: CGFloat = 1
    private var pendingScoreOffset: CGPoint?

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = MoogPalette.panel
        controlScroll.delaysContentTouches = false
        controlScroll.showsVerticalScrollIndicator = true
        controlScroll.indicatorStyle = .white
        controlScroll.addSubview(controlContent)
        addSubview(controlScroll)
        scoreScroll.backgroundColor = MoogPalette.panel
        scoreScroll.showsHorizontalScrollIndicator = true
        scoreScroll.showsVerticalScrollIndicator = false
        scoreScroll.indicatorStyle = .white
        scoreScroll.clipsToBounds = true
        scoreScroll.delegate = self
        scoreScroll.accessibilityIdentifier = "staff"
        scoreScroll.addSubview(score)
        addSubview(scoreScroll)
        let pinch = UIPinchGestureRecognizer(target: self, action: #selector(staffPinched(_:)))
        pinch.delegate = self
        scoreScroll.addGestureRecognizer(pinch)
        recenterButton.configuration = recenterButtonConfiguration()
        recenterButton.tintAdjustmentMode = .normal
        recenterButton.isHidden = true
        recenterButton.addTarget(self, action: #selector(recenterPressed), for: .touchUpInside)
        addSubview(recenterButton)

        controlContent.addSubview(keySizeLabel)
        controlContent.addSubview(fader)
        controlContent.addSubview(showNotesLabel)
        controlContent.addSubview(showKeyLabel)
        controlContent.addSubview(keepAliveLabel)
        controlContent.addSubview(rocker)
        controlContent.addSubview(showKeyRocker)
        controlContent.addSubview(keepAliveRocker)
        for label in [showNotesLabel, showKeyLabel, keepAliveLabel, tromboneLabel, showPositionsLabel, midiLabel] {
            label.adjustsFontSizeToFitWidth = true
            label.minimumScaleFactor = 0.6
        }
        rocker.isOn = true
        showKeyRocker.isOn = true
        instrumentRocker.isOn = true
        showPositionsRocker.isOn = true
        rocker.accessibilityLabel = "Show notes"
        showKeyRocker.accessibilityLabel = "Show key"
        keepAliveRocker.accessibilityLabel = "Keep alive"
        instrumentRocker.accessibilityLabel = "Trombone"
        showPositionsRocker.accessibilityLabel = "Show positions"
        midiRocker.accessibilityLabel = "MIDI"
        bluetoothButton.accessibilityLabel = "Bluetooth"
        for control in [rocker, showKeyRocker, keepAliveRocker, instrumentRocker, showPositionsRocker, midiRocker, bluetoothButton] {
            control.accessibilityTraits = .button
        }
        bluetoothButton.configuration = bluetoothButtonConfiguration()
        bluetoothButton.tintAdjustmentMode = .normal
        bluetoothButton.isEnabled = false
        bluetoothButton.alpha = 0.35
        bluetoothButton.addTarget(self, action: #selector(bluetoothTapped), for: .touchUpInside)
        configureColorWell(noteColorWell, title: "Note labels")
        configureColorWell(positionColorWell, title: "Position labels")
        hatchWell.accessibilityLabel = "Key pattern"
        hatchWell.addTarget(self, action: #selector(hatchWellTapped), for: .touchUpInside)
        controlContent.addSubview(tromboneLabel)
        controlContent.addSubview(showPositionsLabel)
        controlContent.addSubview(midiLabel)
        controlContent.addSubview(instrumentRocker)
        controlContent.addSubview(showPositionsRocker)
        controlContent.addSubview(midiRocker)
        controlContent.addSubview(bluetoothButton)
        controlContent.addSubview(noteColorWell)
        controlContent.addSubview(positionColorWell)
        controlContent.addSubview(hatchWell)
        controlContent.addSubview(keyLabel)
        keyButton.showsMenuAsPrimaryAction = true
        // A presented popover dims the tint, and these plain buttons follow it, so the white title would go black.
        keyButton.tintAdjustmentMode = .normal
        clearButton.tintAdjustmentMode = .normal
        controlContent.addSubview(keyButton)
        clearButton.configuration = clearButtonConfiguration()
        clearButton.addTarget(self, action: #selector(clearPressed), for: .touchUpInside)
        controlContent.addSubview(clearButton)
        titleLabel.attributedText = NSAttributedString(
            string: "TROMBONE PIANO",
            attributes: [
                .font: moogFont(size: 22, weight: .medium),
                .foregroundColor: UIColor.white,
                .kern: 1.6,
            ]
        )
        titleLabel.isUserInteractionEnabled = false
        addSubview(titleLabel)
        helpButton.addTarget(self, action: #selector(helpTapped), for: .touchUpInside)
        addSubview(helpButton)
        presentKey(.bFlat, notify: false)

        fader.addTarget(self, action: #selector(scaleChanged), for: .valueChanged)
        rocker.addTarget(self, action: #selector(notesChanged), for: .valueChanged)
        showKeyRocker.addTarget(self, action: #selector(showKeyChanged), for: .valueChanged)
        keepAliveRocker.addTarget(self, action: #selector(keepAliveChanged), for: .valueChanged)
        instrumentRocker.addTarget(self, action: #selector(instrumentChanged), for: .valueChanged)
        showPositionsRocker.addTarget(self, action: #selector(showPositionsChanged), for: .valueChanged)
        midiRocker.addTarget(self, action: #selector(midiChanged), for: .valueChanged)
        noteColorWell.addTarget(self, action: #selector(noteColorChanged), for: .valueChanged)
        positionColorWell.addTarget(self, action: #selector(positionColorChanged), for: .valueChanged)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func apply(
        scale: Double,
        minScale: Double,
        maxScale: Double,
        showNotes: Bool,
        showKey: Bool,
        keepAlive: Bool,
        showPositions: Bool,
        midi: Bool,
        instrument: KeyboardInstrument,
        keySignature: KeySignature,
        noteColor: UIColor,
        positionColor: UIColor,
        keyHatch: KeyHatch,
        topInset: CGFloat
    ) {
        self.topInset = topInset
        fader.minimum = minScale
        fader.maximum = maxScale
        fader.value = scale
        rocker.isOn = showNotes
        showKeyRocker.isOn = showKey
        keepAliveRocker.isOn = keepAlive
        instrumentRocker.isOn = instrument == .trombone
        showPositionsRocker.isOn = showPositions
        midiRocker.isOn = midi
        bluetoothButton.isEnabled = midi
        bluetoothButton.alpha = midi ? 1 : 0.35
        if noteColorWell.selectedColor?.rgbHex != noteColor.rgbHex {
            noteColorWell.selectedColor = noteColor
        }
        if positionColorWell.selectedColor?.rgbHex != positionColor.rgbHex {
            positionColorWell.selectedColor = positionColor
        }
        hatchWell.hatch = keyHatch
        let positionsAvailable = instrument == .trombone
        showPositionsRocker.isEnabled = positionsAvailable
        showPositionsLabel.alpha = positionsAvailable ? 1 : 0.35
        showPositionsRocker.alpha = positionsAvailable ? 1 : 0.35
        score.instrument = instrument
        score.showPositions = showPositions && positionsAvailable
        if score.keySignature != keySignature {
            presentKey(keySignature, notify: false)
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let content = bounds.inset(by: UIEdgeInsets(top: topInset, left: 0, bottom: 0, right: 0))
        let legacyFaderWidth = max(0, (content.width - 1) / 2 - 44)
        let faderWidth = legacyFaderWidth * 0.75
        let faderHeight: CGFloat = 34 * 0.75
        let rockerWidth: CGFloat = 78
        let keyWidth: CGFloat = 160
        let clearWidth: CGFloat = 132
        let pairGap: CGFloat = 8
        let companionReach: CGFloat = 30
        let minimumColumn = max(faderWidth, rockerWidth * 3 + companionReach + 16, keyWidth + pairGap + clearWidth)
        let columnWidth = max(minimumColumn, comfortableColumnWidth(
            rockerWidth: rockerWidth,
            keyWidth: keyWidth,
            clearWidth: clearWidth,
            pairGap: pairGap
        ))
        let labelHeight: CGFloat = 16
        let sideInset: CGFloat = 22

        controlScroll.frame = CGRect(
            x: content.minX,
            y: content.minY,
            width: sideInset + columnWidth + 16,
            height: content.height
        )
        var y: CGFloat = 14
        keySizeLabel.frame = CGRect(x: 0, y: y, width: columnWidth, height: labelHeight)
        y = keySizeLabel.frame.maxY + 8
        fader.frame = CGRect(
            x: max(0, (columnWidth - faderWidth) / 2),
            y: y,
            width: faderWidth,
            height: faderHeight
        )
        y = fader.frame.maxY + 18
        let rockerGap = max(0, (columnWidth - companionReach - rockerWidth * 3) / 2)
        let notesX = CGFloat(0)
        let keyX = rockerWidth + rockerGap
        let aliveX = 2 * (rockerWidth + rockerGap)
        let captionY = y
        y += labelHeight + 8
        rocker.frame = CGRect(x: notesX, y: y, width: rockerWidth, height: 36)
        showKeyRocker.frame = CGRect(x: keyX, y: y, width: rockerWidth, height: 36)
        keepAliveRocker.frame = CGRect(x: aliveX, y: y, width: rockerWidth, height: 36)
        noteColorWell.frame = wellFrame(beside: rocker.frame)
        hatchWell.frame = wellFrame(beside: showKeyRocker.frame)
        placeCaption(showNotesLabel, over: rocker.frame, columnWidth: columnWidth, y: captionY, height: labelHeight)
        placeCaption(showKeyLabel, over: showKeyRocker.frame, columnWidth: columnWidth, y: captionY, height: labelHeight)
        placeCaption(keepAliveLabel, over: keepAliveRocker.frame, columnWidth: columnWidth, y: captionY, height: labelHeight)
        y = rocker.frame.maxY + 18
        let secondCaptionY = y
        y += labelHeight + 8
        instrumentRocker.frame = CGRect(x: notesX, y: y, width: rockerWidth, height: 36)
        showPositionsRocker.frame = CGRect(x: keyX, y: y, width: rockerWidth, height: 36)
        midiRocker.frame = CGRect(x: aliveX, y: y, width: rockerWidth, height: 36)
        positionColorWell.frame = wellFrame(beside: showPositionsRocker.frame)
        bluetoothButton.frame = wellFrame(beside: midiRocker.frame)
        placeCaption(tromboneLabel, over: instrumentRocker.frame, columnWidth: columnWidth, y: secondCaptionY, height: labelHeight)
        placeCaption(showPositionsLabel, over: showPositionsRocker.frame, columnWidth: columnWidth, y: secondCaptionY, height: labelHeight)
        placeCaption(midiLabel, over: midiRocker.frame, columnWidth: columnWidth, y: secondCaptionY, height: labelHeight)
        y = instrumentRocker.frame.maxY + 18
        let keyHeight: CGFloat = 40
        let pairX = max(0, (columnWidth - keyWidth - pairGap - clearWidth) / 2)
        keyLabel.frame = CGRect(x: pairX, y: y, width: keyWidth, height: labelHeight)
        y = keyLabel.frame.maxY + 8
        keyButton.frame = CGRect(x: pairX, y: y, width: keyWidth, height: keyHeight)
        clearButton.frame = CGRect(
            x: keyButton.frame.maxX + pairGap,
            y: y,
            width: clearWidth,
            height: keyHeight
        )
        let blockHeight = keyButton.frame.maxY + 14
        let overflows = blockHeight > controlScroll.bounds.height
        let centeredY = overflows ? 0 : max(0, (controlScroll.bounds.height - blockHeight) / 2)
        controlContent.frame = CGRect(x: sideInset, y: centeredY, width: columnWidth, height: blockHeight)
        controlScroll.contentSize = CGSize(
            width: controlScroll.bounds.width,
            height: max(controlScroll.bounds.height, blockHeight)
        )
        controlScroll.alwaysBounceVertical = overflows

        let scoreX = controlScroll.frame.maxX
        let scoreViewport = max(0, content.maxX - scoreX - 12)
        let scoreHeight = max(0, content.height - titleBandHeight)
        // The controls keep room for their labels. When that leaves the staff narrower than a readable width, the staff is drawn at that width and this scroll shows the rest.
        let scoreContentWidth = max(scoreViewport, Self.staffContentWidth)
        layoutTitleBand(in: CGRect(x: scoreX, y: content.minY, width: scoreViewport, height: titleBandHeight))
        scoreScroll.frame = CGRect(
            x: scoreX,
            y: content.minY + titleBandHeight,
            width: scoreViewport,
            height: scoreHeight
        )
        let magnified = CGSize(
            width: scoreContentWidth * scoreMagnification,
            height: scoreHeight * scoreMagnification
        )
        score.frame = CGRect(origin: .zero, size: magnified)
        scoreScroll.contentSize = magnified
        if let pending = pendingScoreOffset {
            scoreScroll.contentOffset = clampedScoreOffset(pending)
            pendingScoreOffset = nil
        } else {
            scoreScroll.contentOffset = clampedScoreOffset(scoreScroll.contentOffset)
        }
        let wider = magnified.width > scoreViewport + 1
        let taller = magnified.height > scoreHeight + 1
        scoreScroll.alwaysBounceHorizontal = wider
        scoreScroll.alwaysBounceVertical = taller
        scoreScroll.showsHorizontalScrollIndicator = wider
        scoreScroll.showsVerticalScrollIndicator = taller
        layoutRecenterButton()
    }

    func restoreScoreView(magnification: CGFloat, offset: CGPoint) {
        scoreMagnification = min(Self.scoreMagnificationMax, max(1, magnification))
        pendingScoreOffset = offset
        setNeedsLayout()
    }

    func gestureRecognizer(
        _ gestureRecognizer: UIGestureRecognizer,
        shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
    ) -> Bool {
        true
    }

    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        guard scrollView === scoreScroll else { return }
        updateRecenterVisibility()
    }

    func scrollViewDidEndDragging(_ scrollView: UIScrollView, willDecelerate decelerate: Bool) {
        guard scrollView === scoreScroll, !decelerate else { return }
        publishScoreView()
    }

    func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
        guard scrollView === scoreScroll else { return }
        publishScoreView()
    }

    @objc private func staffPinched(_ gesture: UIPinchGestureRecognizer) {
        switch gesture.state {
        case .began:
            pinchStartMagnification = scoreMagnification
        case .changed:
            let oldMagnification = max(scoreMagnification, 0.01)
            let anchor = gesture.location(in: scoreScroll)
            let baseX = (scoreScroll.contentOffset.x + anchor.x) / oldMagnification
            let baseY = (scoreScroll.contentOffset.y + anchor.y) / oldMagnification
            scoreMagnification = min(
                Self.scoreMagnificationMax,
                max(1, pinchStartMagnification * gesture.scale)
            )
            setNeedsLayout()
            layoutIfNeeded()
            scoreScroll.contentOffset = clampedScoreOffset(CGPoint(
                x: baseX * scoreMagnification - anchor.x,
                y: baseY * scoreMagnification - anchor.y
            ))
            updateRecenterVisibility()
        case .ended, .cancelled:
            publishScoreView()
        default:
            break
        }
    }

    @objc private func recenterPressed() {
        scoreMagnification = 1
        pendingScoreOffset = .zero
        setNeedsLayout()
        layoutIfNeeded()
        updateRecenterVisibility()
        publishScoreView()
    }

    private func clampedScoreOffset(_ offset: CGPoint) -> CGPoint {
        let maxX = max(0, scoreScroll.contentSize.width - scoreScroll.bounds.width)
        let maxY = max(0, scoreScroll.contentSize.height - scoreScroll.bounds.height)
        return CGPoint(
            x: min(max(0, offset.x), maxX),
            y: min(max(0, offset.y), maxY)
        )
    }

    private func scoreIsAtDefaultView() -> Bool {
        abs(scoreMagnification - 1) < 0.02
            && abs(scoreScroll.contentOffset.x) < 1
            && abs(scoreScroll.contentOffset.y) < 1
    }

    private func updateRecenterVisibility() {
        recenterButton.isHidden = scoreIsAtDefaultView()
    }

    private func publishScoreView() {
        onScoreViewChanged?(scoreMagnification, scoreScroll.contentOffset)
    }

    private func layoutRecenterButton() {
        let fit = recenterButton.sizeThatFits(CGSize(width: 220, height: 40))
        let width = fit.width
        let height = max(28, fit.height)
        let x = max(scoreScroll.frame.minX + 6, scoreScroll.frame.maxX - width - 6)
        recenterButton.frame = CGRect(x: x, y: scoreScroll.frame.minY + 6, width: width, height: height)
        updateRecenterVisibility()
    }

    private func recenterButtonConfiguration() -> UIButton.Configuration {
        var config = UIButton.Configuration.plain()
        config.title = "RECENTER"
        config.baseForegroundColor = .white
        config.background.backgroundColor = UIColor(hex: 0x070707)
        config.background.strokeColor = UIColor(hex: 0x6A6A6A)
        config.background.strokeWidth = 1
        config.background.cornerRadius = 0
        config.cornerStyle = .fixed
        config.contentInsets = NSDirectionalEdgeInsets(top: 4, leading: 8, bottom: 4, trailing: 8)
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = moogFont(size: 12, weight: .medium)
            return outgoing
        }
        return config
    }

    /// Wide enough for a caption and the switch with its color circle, three across.
    private func comfortableColumnWidth(
        rockerWidth: CGFloat,
        keyWidth: CGFloat,
        clearWidth: CGFloat,
        pairGap: CGFloat
    ) -> CGFloat {
        let pair = rockerWidth + 6 + 24
        func caption(_ label: UILabel) -> CGFloat {
            ceil(label.attributedText?.size().width ?? 0)
        }
        let topSlot = max(pair, caption(showNotesLabel), caption(showKeyLabel), caption(keepAliveLabel)) + 8
        let bottomSlot = max(pair, caption(tromboneLabel), caption(showPositionsLabel), caption(midiLabel)) + 8
        return max(topSlot * 3, bottomSlot * 3, keyWidth + pairGap + clearWidth)
    }

    private static let staffContentWidth: CGFloat = 560
    private static let scoreMagnificationMax: CGFloat = 4

    private func layoutTitleBand(in band: CGRect) {
        let ball: CGFloat = 30
        let gap: CGFloat = 10
        let titleSize = titleLabel.attributedText?.boundingRect(
            with: CGSize(width: 2000, height: titleBandHeight),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            context: nil
        ).integral.size ?? .zero
        let rowWidth = titleSize.width + gap + ball
        let x = max(band.minX, band.maxX - rowWidth)
        titleLabel.frame = CGRect(
            x: x,
            y: band.midY - titleSize.height / 2,
            width: titleSize.width,
            height: titleSize.height
        )
        helpButton.frame = CGRect(
            x: titleLabel.frame.maxX + gap,
            y: band.midY - ball / 2,
            width: ball,
            height: ball
        )
    }

    @objc private func helpTapped() {
        guard let presenter = enclosingViewController(), presenter.presentedViewController == nil else { return }
        let help = HelpViewController()
        if let popover = help.popoverPresentationController {
            popover.sourceView = helpButton
            popover.sourceRect = helpButton.bounds
            popover.permittedArrowDirections = .up
            popover.backgroundColor = MoogPalette.panel
        }
        presenter.present(help, animated: true)
    }

    private func presentKey(_ key: KeySignature, notify: Bool) {
        keyButton.configuration = keyButtonConfiguration(title: key.title)
        keyButton.menu = UIMenu(children: KeySignature.catalog.map { choice in
            UIAction(title: choice.title, state: choice.id == key.id ? .on : .off) { [weak self] _ in
                self?.presentKey(choice, notify: true)
            }
        })
        score.keySignature = key
        if notify {
            onKeySignatureChanged?(key)
        }
    }

    private func keyButtonConfiguration(title: String) -> UIButton.Configuration {
        var config = UIButton.Configuration.plain()
        config.title = title
        config.baseForegroundColor = .white
        config.background.backgroundColor = UIColor(hex: 0x070707)
        config.background.strokeColor = UIColor(hex: 0x6A6A6A)
        config.background.strokeWidth = 1
        config.background.cornerRadius = 0
        config.cornerStyle = .fixed
        config.contentInsets = NSDirectionalEdgeInsets(top: 4, leading: 10, bottom: 4, trailing: 8)
        config.image = UIImage(
            systemName: "chevron.down",
            withConfiguration: UIImage.SymbolConfiguration(pointSize: 9, weight: .medium)
        )
        config.imagePlacement = .trailing
        config.imagePadding = 8
        config.titleLineBreakMode = .byTruncatingTail
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = moogFont(size: 13, weight: .medium)
            return outgoing
        }
        return config
    }

    private func clearButtonConfiguration() -> UIButton.Configuration {
        var config = UIButton.Configuration.plain()
        config.title = "CLEAR SCORE"
        config.baseForegroundColor = .white
        config.background.backgroundColor = UIColor(hex: 0x070707)
        config.background.strokeColor = UIColor(hex: 0x6A6A6A)
        config.background.strokeWidth = 1
        config.background.cornerRadius = 0
        config.cornerStyle = .fixed
        config.contentInsets = NSDirectionalEdgeInsets(top: 4, leading: 6, bottom: 4, trailing: 6)
        config.titleLineBreakMode = .byClipping
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = moogFont(size: 13, weight: .medium)
            return outgoing
        }
        return config
    }

    func recordPlayed(started: [Int], stopped: [Int]) {
        score.record(started: started, stopped: stopped)
    }

    @objc private func scaleChanged() {
        onScaleChanged?(fader.value)
    }

    @objc private func notesChanged() {
        onShowNotesChanged?(rocker.isOn)
    }

    @objc private func showKeyChanged() {
        onShowKeyChanged?(showKeyRocker.isOn)
    }

    @objc private func keepAliveChanged() {
        onKeepAliveChanged?(keepAliveRocker.isOn)
    }

    @objc private func instrumentChanged() {
        onInstrumentChanged?(instrumentRocker.isOn ? .trombone : .piano)
    }

    @objc private func showPositionsChanged() {
        onShowPositionsChanged?(showPositionsRocker.isOn)
    }

    @objc private func midiChanged() {
        let enabled = midiRocker.isOn
        bluetoothButton.isEnabled = enabled
        bluetoothButton.alpha = enabled ? 1 : 0.35
        onMidiChanged?(enabled)
    }

    @objc private func bluetoothTapped() {
        guard midiRocker.isOn else { return }
        guard let presenter = enclosingViewController(), presenter.presentedViewController == nil else { return }
        let midi = CABTMIDILocalPeripheralViewController()
        let navigation = UINavigationController(rootViewController: midi)
        navigation.modalPresentationStyle = .formSheet
        let done = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(dismissBluetooth))
        midi.navigationItem.rightBarButtonItem = done
        presenter.present(navigation, animated: true) {
            midi.navigationItem.rightBarButtonItem = done
        }
    }

    @objc private func dismissBluetooth() {
        enclosingViewController()?.dismiss(animated: true)
    }

    @objc private func noteColorChanged() {
        guard let color = noteColorWell.selectedColor else { return }
        onNoteColorChanged?(color)
    }

    @objc private func positionColorChanged() {
        guard let color = positionColorWell.selectedColor else { return }
        onPositionColorChanged?(color)
    }

    @objc private func hatchWellTapped() {
        guard let presenter = enclosingViewController(), presenter.presentedViewController == nil else { return }
        let picker = HatchPickerViewController(selected: hatchWell.hatch)
        picker.onSelect = { [weak self, weak picker] hatch in
            self?.hatchWell.hatch = hatch
            self?.onKeyHatchChanged?(hatch)
            picker?.dismiss(animated: true)
        }
        if let popover = picker.popoverPresentationController {
            popover.sourceView = hatchWell
            popover.sourceRect = hatchWell.bounds
            popover.permittedArrowDirections = [.up, .down]
            popover.backgroundColor = MoogPalette.panel
        }
        presenter.present(picker, animated: true)
    }

    private func enclosingViewController() -> UIViewController? {
        var responder: UIResponder? = self
        while let next = responder?.next {
            if let controller = next as? UIViewController {
                return controller
            }
            responder = next
        }
        return nil
    }

    private func configureColorWell(_ well: UIColorWell, title: String) {
        well.selectedColor = MoogPalette.labelGreen
        well.supportsAlpha = false
        well.title = title
    }

    /// Centers the caption on its switch, keeping it inside the column.
    private func placeCaption(
        _ label: UILabel,
        over rocker: CGRect,
        columnWidth: CGFloat,
        y: CGFloat,
        height: CGFloat
    ) {
        let width = min(columnWidth, ceil(label.attributedText?.size().width ?? rocker.width))
        let x = min(max(0, rocker.midX - width / 2), max(0, columnWidth - width))
        label.frame = CGRect(x: x, y: y, width: width, height: height)
    }

    private func wellFrame(beside rocker: CGRect) -> CGRect {
        let diameter: CGFloat = 24
        return CGRect(
            x: rocker.maxX + 6,
            y: rocker.midY - diameter / 2,
            width: diameter,
            height: diameter
        )
    }

    private func bluetoothButtonConfiguration() -> UIButton.Configuration {
        var config = UIButton.Configuration.plain()
        config.image = UIImage(
            systemName: "bluetooth",
            withConfiguration: UIImage.SymbolConfiguration(pointSize: 11, weight: .medium)
        )
        config.baseForegroundColor = .white
        config.background.backgroundColor = UIColor(hex: 0x070707)
        config.background.strokeColor = UIColor(hex: 0x6A6A6A)
        config.background.strokeWidth = 1
        config.background.cornerRadius = 12
        config.cornerStyle = .fixed
        config.contentInsets = .zero
        return config
    }

    @objc private func clearPressed() {
        score.clear()
    }
}

private func moogCaption(_ text: String) -> UILabel {
    let label = UILabel()
    label.textAlignment = .center
    label.attributedText = NSAttributedString(
        string: text.uppercased(),
        attributes: [
            .font: moogFont(size: 12, weight: .medium),
            .foregroundColor: UIColor.white,
            .kern: 1.8,
        ]
    )
    return label
}

final class MoogFader: UIControl {
    var minimum: Double = 0
    var maximum: Double = 1
    var value: Double = 1 {
        didSet { setNeedsDisplay() }
    }

    private let thumbWidth: CGFloat = 18

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
        guard let context = UIGraphicsGetCurrentContext() else { return }
        context.setFillColor(UIColor(hex: 0x070707).cgColor)
        context.fill(bounds)
        context.setStrokeColor(UIColor(hex: 0x6A6A6A).cgColor)
        context.setLineWidth(1)
        context.stroke(bounds.insetBy(dx: 0.5, dy: 0.5))

        let span = max(1, maximum - minimum)
        let t = clamped((value - minimum) / span, min: 0, max: 1)
        let travel = max(0, bounds.width - thumbWidth)
        let left = CGFloat(t) * travel
        let thumb = CGRect(
            x: 1 + 3 + left,
            y: 1 + 4,
            width: thumbWidth,
            height: max(0, bounds.height - 2 - 8)
        )
        let thumbPath = UIBezierPath(rect: thumb)
        context.saveGState()
        context.addPath(thumbPath.cgPath)
        context.clip()
        if let gradient = CGGradient(
            colorsSpace: CGColorSpaceCreateDeviceRGB(),
            colors: [
                UIColor(hex: 0x6E6E6E).cgColor,
                UIColor(hex: 0xF4F4F4).cgColor,
                UIColor(hex: 0x8E8E8E).cgColor,
                UIColor(hex: 0xE4E4E4).cgColor,
            ] as CFArray,
            locations: [0, 0.33, 0.66, 1]
        ) {
            context.drawLinearGradient(
                gradient,
                start: CGPoint(x: thumb.minX, y: thumb.midY),
                end: CGPoint(x: thumb.maxX, y: thumb.midY),
                options: []
            )
        }
        context.restoreGState()
        context.setStrokeColor(UIColor(hex: 0x2A2A2A).cgColor)
        context.setLineWidth(1)
        context.stroke(thumb.insetBy(dx: 0.5, dy: 0.5))
        context.setFillColor(UIColor(hex: 0x1A1A1A).cgColor)
        context.fill(CGRect(x: thumb.midX - 0.75, y: thumb.minY, width: 1.5, height: thumb.height))
    }

    override func beginTracking(_ touch: UITouch, with event: UIEvent?) -> Bool {
        update(touch)
        return true
    }

    override func continueTracking(_ touch: UITouch, with event: UIEvent?) -> Bool {
        update(touch)
        return true
    }

    private func update(_ touch: UITouch) {
        let x = touch.location(in: self).x
        let travel = max(1, bounds.width - thumbWidth - 6)
        let t = clamped((Double(x) - 3 - Double(thumbWidth) / 2) / Double(travel), min: 0, max: 1)
        value = minimum + t * (maximum - minimum)
        sendActions(for: .valueChanged)
    }
}

/// Two caps in a dark housing. The red cap sits on the left when off and on the right when on.
final class MoogRocker: UIControl {
    var isOn = false {
        didSet {
            guard isOn != oldValue else { return }
            setNeedsLayout()
        }
    }

    private let darkCap = CapView(base: UIColor(hex: 0x2C2C2C))
    private let redCap = CapView(base: UIColor(hex: 0xE23C12))

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = UIColor(hex: 0x0C0C0C)
        layer.borderColor = UIColor(hex: 0x8A8A8A).cgColor
        layer.borderWidth = 1.4
        darkCap.isUserInteractionEnabled = false
        redCap.isUserInteractionEnabled = false
        addSubview(darkCap)
        addSubview(redCap)
        addTarget(self, action: #selector(tapped), for: .touchUpInside)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let inset: CGFloat = 1.4 + 3
        let inner = bounds.insetBy(dx: inset, dy: inset)
        let capWidth = max(0, (inner.width - 2) / 2)
        let left = CGRect(x: inner.minX, y: inner.minY, width: capWidth, height: inner.height)
        let right = CGRect(x: inner.minX + capWidth + 2, y: inner.minY, width: capWidth, height: inner.height)
        let redFrame = isOn ? right : left
        let darkFrame = isOn ? left : right
        let slides = redCap.bounds.width > 0
            && abs(redCap.bounds.width - redFrame.width) < 1
            && abs(redCap.frame.minX - redFrame.minX) > 1
        let place = {
            self.redCap.frame = redFrame
            self.darkCap.frame = darkFrame
        }
        if slides, window != nil {
            UIView.animate(
                withDuration: 0.12,
                delay: 0,
                options: [.curveEaseOut, .allowUserInteraction, .beginFromCurrentState],
                animations: place
            )
        } else {
            place()
        }
        redCap.setRaised(true, animated: slides)
        darkCap.setRaised(false, animated: slides)
    }

    @objc private func tapped() {
        guard isEnabled else { return }
        isOn.toggle()
        sendActions(for: .valueChanged)
    }
}

private final class CapView: UIView {
    override class var layerClass: AnyClass { CAGradientLayer.self }

    private let base: UIColor
    private var isRaised: Bool?

    init(base: UIColor) {
        self.base = base
        super.init(frame: .zero)
        guard let gradient = layer as? CAGradientLayer else { return }
        gradient.startPoint = CGPoint(x: 0.5, y: 0)
        gradient.endPoint = CGPoint(x: 0.5, y: 1)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func setRaised(_ raised: Bool, animated: Bool) {
        guard let gradient = layer as? CAGradientLayer else { return }
        if isRaised == raised { return }
        let top = base.lerp(toward: .white, amount: raised ? 0.32 : 0.08)
        let bottom = base.lerp(toward: .black, amount: raised ? 0.22 : 0.45)
        let colors = [top.cgColor, base.cgColor, bottom.cgColor]
        if animated, isRaised != nil {
            let animation = CABasicAnimation(keyPath: "colors")
            animation.fromValue = gradient.colors
            animation.toValue = colors
            animation.duration = 0.09
            gradient.add(animation, forKey: "colors")
        }
        isRaised = raised
        gradient.colors = colors
    }
}
