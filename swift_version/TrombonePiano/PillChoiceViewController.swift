import UIKit

/// Black opening screen. Red opens the keyboard. Blue opens games. The device stays in its current orientation.
final class PillChoiceViewController: UIViewController {
    /// About 20 cm. Taller than a phone, so a large iPad is the case that hits it.
    private static let maxPillHeight = CGFloat(200 * ipadProPointsPerMillimeter)
    private static let margin: CGFloat = 28
    private static let gap: CGFloat = 28

    private let redButton = PillButton(named: "red_pill", label: "Keyboard", identifier: "red-pill")
    private let blueButton = PillButton(named: "blue_pill", label: "Games", identifier: "blue-pill")
    private let explainButton = explainAppButton()
    private var explainWork: DispatchWorkItem?
    private var explainGeneration = 0

    private static let explainHeight: CGFloat = 44
    private static let explainGap: CGFloat = 16

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        UIDevice.current.userInterfaceIdiom == .pad ? .all : .allButUpsideDown
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        redButton.addTarget(self, action: #selector(openKeyboard), for: .touchUpInside)
        blueButton.addTarget(self, action: #selector(openGames), for: .touchUpInside)
        explainButton.alpha = 0
        explainButton.isUserInteractionEnabled = false
        explainButton.addTarget(self, action: #selector(openHelp), for: .touchUpInside)
        view.addSubview(redButton)
        view.addSubview(blueButton)
        view.addSubview(explainButton)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        scheduleExplainFade()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        cancelExplainFade()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let safe = view.bounds.inset(by: view.safeAreaInsets).insetBy(dx: Self.margin, dy: Self.margin)
        guard safe.width > 1, safe.height > 1 else { return }
        let below = Self.explainGap + Self.explainHeight
        let chosen = arrangement(
            redRatio: imageRatio(redButton),
            blueRatio: imageRatio(blueButton),
            limit: CGSize(width: safe.width, height: max(1, safe.height - below))
        )
        let stackHeight = chosen.size.height + below
        let origin = CGPoint(
            x: safe.midX - chosen.size.width / 2,
            y: safe.midY - stackHeight / 2
        )
        redButton.frame = chosen.red.offsetBy(dx: origin.x, dy: origin.y)
        blueButton.frame = chosen.blue.offsetBy(dx: origin.x, dy: origin.y)
        explainButton.frame = CGRect(
            x: origin.x,
            y: origin.y + chosen.size.height + Self.explainGap,
            width: chosen.size.width,
            height: Self.explainHeight
        )
    }

    @objc private func openKeyboard() {
        guard presentedViewController == nil else { return }
        let piano = PianoViewController()
        piano.modalPresentationStyle = .fullScreen
        present(piano, animated: true)
    }

    @objc private func openGames() {
        guard presentedViewController == nil else { return }
        let audio = PianoAudio()
        audio.start(instrument: .trombone)
        let games = GamesFlowController(
            audio: audio,
            startingKey: .bFlat,
            log: GameLog.store()
        )
        present(games, animated: true)
    }

    @objc private func openHelp() {
        guard presentedViewController == nil else { return }
        present(AppHelpViewController(), animated: true)
    }

    /// Each appearance starts black. After 5 seconds the button fades in over 5 seconds. Leaving cancels that and the next appearance waits again.
    private func scheduleExplainFade() {
        cancelExplainFade()
        let generation = explainGeneration
        let work = DispatchWorkItem { [weak self] in
            guard let self, self.explainGeneration == generation else { return }
            self.explainButton.isUserInteractionEnabled = true
            UIView.animate(withDuration: 5, delay: 0, options: [.curveLinear, .allowUserInteraction]) {
                self.explainButton.alpha = 1
            }
        }
        explainWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 5, execute: work)
    }

    private func cancelExplainFade() {
        explainGeneration += 1
        explainWork?.cancel()
        explainWork = nil
        explainButton.layer.removeAllAnimations()
        explainButton.alpha = 0
        explainButton.isUserInteractionEnabled = false
    }

    private func imageRatio(_ button: PillButton) -> CGFloat {
        button.aspectRatio
    }

    private func arrangement(redRatio: CGFloat, blueRatio: CGFloat, limit: CGSize) -> Arrangement {
        let gap = Self.gap
        let widthBudget = max(1, limit.width - gap)
        let natural = Self.maxPillHeight * redRatio + Self.maxPillHeight * blueRatio
        var height = min(limit.height, Self.maxPillHeight)
        if natural > 0 {
            height = min(height, Self.maxPillHeight * widthBudget / natural)
        }
        let used = height * redRatio + height * blueRatio
        if used > widthBudget {
            height *= widthBudget / used
        }
        let redSize = CGSize(width: height * redRatio, height: height)
        let blueSize = CGSize(width: height * blueRatio, height: height)
        let rowHeight = max(redSize.height, blueSize.height)
        let red = CGRect(x: 0, y: (rowHeight - redSize.height) / 2, width: redSize.width, height: redSize.height)
        let blue = CGRect(
            x: redSize.width + gap,
            y: (rowHeight - blueSize.height) / 2,
            width: blueSize.width,
            height: blueSize.height
        )
        return Arrangement(red: red, blue: blue, size: CGSize(width: blue.maxX, height: rowHeight))
    }
}

private func explainAppButton() -> UIButton {
    var config = UIButton.Configuration.plain()
    config.title = "Explain this app"
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
    button.accessibilityIdentifier = "explain-this-app"
    return button
}

private struct Arrangement {
    var red: CGRect
    var blue: CGRect
    var size: CGSize
}

private final class PillButton: UIControl {
    let aspectRatio: CGFloat
    private let imageView = UIImageView()

    init(named name: String, label: String, identifier: String) {
        let image = UIImage(named: name)
        if let image, image.size.height > 0 {
            aspectRatio = image.size.width / image.size.height
        } else {
            aspectRatio = 1
        }
        super.init(frame: .zero)
        imageView.image = image
        imageView.contentMode = .scaleAspectFit
        imageView.isUserInteractionEnabled = false
        addSubview(imageView)
        accessibilityLabel = label
        accessibilityIdentifier = identifier
        accessibilityTraits = .button
        isAccessibilityElement = true
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override var isHighlighted: Bool {
        didSet { alpha = isHighlighted ? 0.72 : 1 }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        imageView.frame = bounds
    }
}
