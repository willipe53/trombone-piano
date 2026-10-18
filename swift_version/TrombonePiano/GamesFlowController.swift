import UIKit

/// Chooser, then a deal, then Easier / Next / Harder. Info leaves game mode. Games returns to the chooser.
final class GamesFlowController: UIViewController {
    var onFinish: (() -> Void)?

    private let audio: PianoAudio
    private let log: GameLog
    private let openingKey: KeySignature
    private var soundOn = true
    private var seed = 1
    private var golfLevel = GolfLevel.start(clef: .bass)
    private var scaleLevel: ScaleLevel
    private var golfDeal: GolfDeal?
    private var scaleDeal: ScaleInventoryDeal?
    private var phraseToken = 0

    private let chooser = UIStackView()
    private let titleHeader = AppTitleHeader()
    private let gamesListButton = gameTextButton("Games")
    private let soundLabel = UILabel()
    private let soundSwitch = UISwitch()
    private let undoButton = gameTextButton("Undo")
    private let peekButton = gameTextButton("Peek")
    private let boardHost = UIView()
    private var golfBoard: GolfBoardView?
    private var scaleBoard: ScaleBoardView?
    private let nextLabel = UILabel()
    private let easierButton = gameTextButton("Easier")
    private let nextButton = gameTextButton("Next")
    private let harderButton = gameTextButton("Harder")
    private var playingGolf = false

    init(audio: PianoAudio, startingKey: KeySignature, log: GameLog) {
        self.audio = audio
        self.log = log
        self.openingKey = ScaleLevel.start(key: startingKey).key
        self.scaleLevel = ScaleLevel.start(key: startingKey)
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .all }
    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = MoogPalette.panel
        audio.setSounding([])
        audio.setGameSession(true)
        titleHeader.onInfo = { [weak self] in
            self?.dismiss(animated: true)
        }
        view.addSubview(titleHeader)
        buildChooser()
        buildChrome()
        showChooser()
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        guard isBeingDismissed else { return }
        phraseToken += 1
        audio.setGameSession(false)
        onFinish?()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let safe = view.safeAreaInsets
        let width = view.bounds.width
        let rowYTop = safe.top + 4
        layoutDealControls(safe: safe, width: width, rowYTop: rowYTop)
        let bottom = view.bounds.height - safe.bottom - 12
        let buttonWidth = min(110, (width - safe.left - safe.right - 48) / 3)
        let rowY = bottom - 40
        easierButton.frame = CGRect(x: 16 + safe.left, y: rowY, width: buttonWidth, height: 40)
        nextButton.frame = CGRect(x: (width - buttonWidth) / 2, y: rowY, width: buttonWidth, height: 40)
        harderButton.frame = CGRect(x: width - safe.right - 16 - buttonWidth, y: rowY, width: buttonWidth, height: 40)
        nextLabel.frame = CGRect(x: 16 + safe.left, y: rowY - 28, width: width - 32 - safe.left - safe.right, height: 22)
        let top = titleHeader.frame.maxY + 12
        let hostBottom = nextLabel.isHidden ? bottom : nextLabel.frame.minY - 8
        boardHost.frame = CGRect(x: 0, y: top, width: width, height: max(0, hostBottom - top))
        golfBoard?.frame = boardHost.bounds
        scaleBoard?.frame = boardHost.bounds
        chooser.frame = CGRect(
            x: 24 + safe.left,
            y: titleHeader.frame.maxY + 24,
            width: width - 48 - safe.left - safe.right,
            height: 180
        )
    }

    /// Games, Undo, Peek, and Sound stay on the left. The title and info ball take the rest of the row.
    private func layoutDealControls(safe: UIEdgeInsets, width: CGFloat, rowYTop: CGFloat) {
        let gap: CGFloat = 8
        let right = width - safe.right
        if gamesListButton.isHidden {
            titleHeader.frame = CGRect(x: safe.left, y: safe.top, width: max(0, right - safe.left), height: 44)
            return
        }
        soundLabel.sizeToFit()
        let ball: CGFloat = 30
        let switchWidth: CGFloat = 51
        let left = 16 + safe.left
        let tail = gap + soundLabel.bounds.width + gap + switchWidth + gap + ball
        let buttonGaps: CGFloat = playingGolf ? gap * 2 : 0
        let available = max(0, right - left - tail - buttonGaps)
        let gamesWidth: CGFloat
        let smallWidth: CGFloat
        if playingGolf {
            let scale = min(1, available / (88 + 72 + 72))
            gamesWidth = 88 * scale
            smallWidth = 72 * scale
        } else {
            gamesWidth = min(88, available)
            smallWidth = 0
        }
        var x = left
        gamesListButton.frame = CGRect(x: x, y: rowYTop, width: gamesWidth, height: 36)
        x = gamesListButton.frame.maxX + gap
        if playingGolf {
            undoButton.frame = CGRect(x: x, y: rowYTop, width: smallWidth, height: 36)
            x = undoButton.frame.maxX + gap
            peekButton.frame = CGRect(x: x, y: rowYTop, width: smallWidth, height: 36)
            x = peekButton.frame.maxX + gap
        }
        soundLabel.frame = CGRect(
            x: x,
            y: rowYTop + (36 - soundLabel.bounds.height) / 2,
            width: soundLabel.bounds.width,
            height: soundLabel.bounds.height
        )
        x = soundLabel.frame.maxX + gap
        soundSwitch.frame = CGRect(x: x, y: rowYTop + 2, width: switchWidth, height: 31)
        x = soundSwitch.frame.maxX + gap
        titleHeader.frame = CGRect(x: x, y: safe.top, width: max(0, right - x), height: 44)
    }

    private func buildChooser() {
        chooser.axis = .vertical
        chooser.spacing = 16
        chooser.alignment = .fill
        let golfRow = UIStackView()
        golfRow.axis = .horizontal
        golfRow.spacing = 12
        golfRow.distribution = .fillEqually
        let bass = gameIconButton("Golf, bass", icon: "golf_course")
        bass.accessibilityIdentifier = "golf-bass"
        bass.addTarget(self, action: #selector(startBassGolf), for: .touchUpInside)
        let tenor = gameIconButton("Golf, tenor", icon: "golf_course")
        tenor.accessibilityIdentifier = "golf-tenor"
        tenor.addTarget(self, action: #selector(startTenorGolf), for: .touchUpInside)
        golfRow.addArrangedSubview(bass)
        golfRow.addArrangedSubview(tenor)
        golfRow.heightAnchor.constraint(equalToConstant: 52).isActive = true
        chooser.addArrangedSubview(golfRow)
        let scale = gameIconButton("Scale inventory", icon: "queue_music")
        scale.accessibilityIdentifier = "scale-inventory"
        scale.addTarget(self, action: #selector(startScale), for: .touchUpInside)
        scale.heightAnchor.constraint(equalToConstant: 52).isActive = true
        chooser.addArrangedSubview(scale)
        view.addSubview(chooser)
    }

    private func buildChrome() {
        gamesListButton.accessibilityIdentifier = "games-list"
        gamesListButton.addTarget(self, action: #selector(leaveDeal), for: .touchUpInside)
        undoButton.addTarget(self, action: #selector(undoGolf), for: .touchUpInside)
        peekButton.isEnabled = false
        peekButton.addTarget(self, action: #selector(peekGolf), for: .touchUpInside)
        easierButton.accessibilityIdentifier = "easier"
        nextButton.accessibilityIdentifier = "next"
        harderButton.accessibilityIdentifier = "harder"
        easierButton.addTarget(self, action: #selector(easier), for: .touchUpInside)
        nextButton.addTarget(self, action: #selector(nextDeal), for: .touchUpInside)
        harderButton.addTarget(self, action: #selector(harder), for: .touchUpInside)
        soundLabel.attributedText = NSAttributedString(
            string: "Sound",
            attributes: [.font: moogFont(size: 15, weight: .medium), .foregroundColor: UIColor.white]
        )
        soundSwitch.isOn = true
        soundSwitch.onTintColor = MoogPalette.labelGreen
        soundSwitch.addTarget(self, action: #selector(soundChanged), for: .valueChanged)
        nextLabel.textColor = UIColor.white.withAlphaComponent(0.85)
        nextLabel.font = moogFont(size: 14, weight: .medium)
        nextLabel.textAlignment = .center
        for item in [gamesListButton, undoButton, peekButton, soundLabel, soundSwitch, boardHost, nextLabel, easierButton, nextButton, harderButton] {
            view.addSubview(item)
        }
    }

    private func showChooser() {
        phraseToken += 1
        chooser.isHidden = false
        setDealChrome(hidden: true)
        golfBoard?.removeFromSuperview()
        scaleBoard?.removeFromSuperview()
        golfBoard = nil
        scaleBoard = nil
        golfDeal = nil
        scaleDeal = nil
    }

    private func setDealChrome(hidden: Bool) {
        for item in [gamesListButton, soundLabel, soundSwitch, boardHost] {
            item.isHidden = hidden
        }
        undoButton.isHidden = hidden || !playingGolf
        peekButton.isHidden = hidden || !playingGolf
        if hidden {
            setRoundEnd(hidden: true)
        }
    }

    private func setRoundEnd(hidden: Bool) {
        nextLabel.isHidden = hidden
        easierButton.isHidden = hidden
        nextButton.isHidden = hidden
        harderButton.isHidden = hidden
        if !hidden {
            nextLabel.text = playingGolf ? golfLevel.nextLine : scaleLevel.nextLine
        }
        view.setNeedsLayout()
    }

    @objc private func startBassGolf() {
        golfLevel = GolfLevel.start(clef: .bass)
        beginGolf()
    }

    @objc private func startTenorGolf() {
        golfLevel = GolfLevel.start(clef: .tenor)
        beginGolf()
    }

    @objc private func startScale() {
        scaleLevel = ScaleLevel.start(key: openingKey)
        beginScale()
    }

    private func beginGolf() {
        phraseToken += 1
        playingGolf = true
        let now = Date()
        let deal = GolfDeal.deal(level: golfLevel, seed: seed, now: now)
        seed += 1
        golfDeal = deal
        scaleDeal = nil
        scaleBoard?.removeFromSuperview()
        scaleBoard = nil
        let board = GolfBoardView(deal: deal)
        board.onColumn = { [weak self] column in
            self?.takeGolf(column: column)
        }
        golfBoard = board
        boardHost.addSubview(board)
        chooser.isHidden = true
        setDealChrome(hidden: false)
        setRoundEnd(hidden: true)
        refreshPeek()
        view.setNeedsLayout()
    }

    private func beginScale() {
        phraseToken += 1
        playingGolf = false
        let now = Date()
        let deal = ScaleInventoryDeal.deal(level: scaleLevel, seed: seed, now: now)
        seed += 1
        scaleDeal = deal
        golfDeal = nil
        golfBoard?.removeFromSuperview()
        golfBoard = nil
        let board = ScaleBoardView(deal: deal)
        board.onPlace = { [weak self] midi, slot in
            self?.placeScale(midi: midi, slot: slot) ?? false
        }
        scaleBoard = board
        boardHost.addSubview(board)
        chooser.isHidden = true
        setDealChrome(hidden: false)
        setRoundEnd(hidden: true)
        view.setNeedsLayout()
    }

    private func takeGolf(column: Int) {
        guard var deal = golfDeal else { return }
        switch deal.take(column: column, at: Date()) {
        case .rejected:
            golfBoard?.armedColumn = column
            golfDeal = deal
            golfBoard?.deal = deal
            refreshPeek()
        case .took(_, let cleared, let answer):
            golfBoard?.armedColumn = nil
            golfDeal = deal
            golfBoard?.deal = deal
            refreshPeek()
            record(answer)
            if cleared {
                if soundOn {
                    play(deal.waste.dropFirst().map(\.midi))
                }
                setRoundEnd(hidden: false)
            } else if soundOn {
                play([answer.note])
            }
        }
    }

    @objc private func peekGolf() {
        guard var deal = golfDeal, let column = golfBoard?.armedColumn else { return }
        guard let answer = deal.peek(column: column, at: Date()) else { return }
        golfDeal = deal
        golfBoard?.deal = deal
        refreshPeek()
        record(answer)
        if soundOn {
            play([answer.note])
        }
    }

    @objc private func undoGolf() {
        guard var deal = golfDeal else { return }
        guard deal.undo() else { return }
        phraseToken += 1
        golfDeal = deal
        golfBoard?.deal = deal
        golfBoard?.armedColumn = nil
        refreshPeek()
        setRoundEnd(hidden: !deal.isCleared)
    }

    private func placeScale(midi: Int, slot: Int) -> Bool {
        guard var deal = scaleDeal else { return false }
        guard let answer = deal.place(midi: midi, at: slot, now: Date()) else { return false }
        scaleDeal = deal
        scaleBoard?.deal = deal
        record(answer)
        if deal.isCleared {
            if soundOn {
                play(deal.notes)
            }
            setRoundEnd(hidden: false)
        } else if soundOn {
            play([midi])
        }
        return true
    }

    @objc private func easier() {
        if playingGolf {
            golfLevel = golfLevel.eased()
            beginGolf()
        } else {
            scaleLevel = scaleLevel.eased()
            beginScale()
        }
    }

    @objc private func nextDeal() {
        if playingGolf {
            beginGolf()
        } else {
            scaleLevel = scaleLevel.stepped()
            beginScale()
        }
    }

    @objc private func harder() {
        if playingGolf {
            golfLevel = golfLevel.hardened()
            beginGolf()
        } else {
            scaleLevel = scaleLevel.hardened()
            beginScale()
        }
    }

    @objc private func leaveDeal() {
        showChooser()
    }

    @objc private func soundChanged() {
        soundOn = soundSwitch.isOn
        if !soundOn {
            phraseToken += 1
        }
    }

    private func refreshPeek() {
        guard playingGolf, let column = golfBoard?.armedColumn, let card = golfDeal?.bottom(column) else {
            peekButton.isEnabled = false
            return
        }
        peekButton.isEnabled = card.revealed == nil
    }

    private func record(_ answer: GameAnswer) {
        try? log.append(answer.entry())
    }

    private func play(_ notes: [Int]) {
        phraseToken += 1
        let token = phraseToken
        for (index, note) in notes.enumerated() {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(index) * 0.28) { [weak self] in
                guard let self, self.soundOn, self.phraseToken == token else { return }
                self.audio.playOneShot(midi: note)
            }
        }
    }
}

private func gameIconButton(_ title: String, icon: String) -> UIButton {
    var config = UIButton.Configuration.plain()
    config.title = title
    config.image = gameIcon(icon)
    config.imagePlacement = .leading
    config.imagePadding = 8
    config.baseForegroundColor = .white
    config.background.backgroundColor = UIColor(hex: 0x2C2C2C)
    config.background.cornerRadius = 6
    config.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 10, bottom: 8, trailing: 10)
    config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
        var outgoing = incoming
        outgoing.font = moogFont(size: 16, weight: .medium)
        return outgoing
    }
    let button = UIButton(configuration: config)
    button.tintAdjustmentMode = .normal
    return button
}

private func gameIcon(_ name: String) -> UIImage? {
    guard let image = UIImage(named: name) else { return nil }
    let side: CGFloat = 22
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: side, height: side))
    return renderer.image { _ in
        image.draw(in: CGRect(x: 0, y: 0, width: side, height: side))
    }.withRenderingMode(.alwaysOriginal)
}

private func gameTextButton(_ title: String) -> UIButton {
    var config = UIButton.Configuration.plain()
    config.title = title
    config.baseForegroundColor = .white
    config.background.backgroundColor = UIColor(hex: 0x2C2C2C)
    config.background.cornerRadius = 6
    config.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 10, bottom: 8, trailing: 10)
    config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
        var outgoing = incoming
        outgoing.font = moogFont(size: 16, weight: .medium)
        return outgoing
    }
    let button = UIButton(configuration: config)
    button.tintAdjustmentMode = .normal
    return button
}
