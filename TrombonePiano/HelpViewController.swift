import UIKit

/// Round help control drawn as a shaded ball with a question mark.
final class HelpBallButton: UIControl {
    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
        contentMode = .redraw
        accessibilityLabel = "Help"
        accessibilityTraits = .button
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override var isHighlighted: Bool {
        didSet {
            alpha = isHighlighted ? 0.65 : 1
        }
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        let ball = bounds.insetBy(dx: 0.5, dy: 0.5)
        let oval = UIBezierPath(ovalIn: ball)
        context.saveGState()
        context.addPath(oval.cgPath)
        context.clip()
        if let gradient = CGGradient(
            colorsSpace: CGColorSpaceCreateDeviceRGB(),
            colors: [
                UIColor(hex: 0xFFFFFF).cgColor,
                UIColor(hex: 0xD0D0D0).cgColor,
                UIColor(hex: 0x7A7A7A).cgColor,
            ] as CFArray,
            locations: [0, 0.55, 1]
        ) {
            context.drawRadialGradient(
                gradient,
                startCenter: CGPoint(x: ball.midX - ball.width * 0.16, y: ball.midY - ball.height * 0.2),
                startRadius: 0,
                endCenter: CGPoint(x: ball.midX + ball.width * 0.06, y: ball.midY + ball.height * 0.08),
                endRadius: ball.width * 0.72,
                options: [.drawsAfterEndLocation]
            )
        }
        context.restoreGState()

        let font = moogFont(size: ball.width * 0.62, weight: .medium)
        let mark = "?" as NSString
        let markSize = mark.size(withAttributes: [.font: font])
        mark.draw(
            at: CGPoint(
                x: ball.midX - markSize.width / 2,
                y: ball.midY - markSize.height / 2 - ball.width * 0.02
            ),
            withAttributes: [
                .font: font,
                .foregroundColor: UIColor(hex: 0x1A1A1A),
            ]
        )
    }
}

final class HelpViewController: UIViewController, UIPopoverPresentationControllerDelegate {
    init() {
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .popover
        preferredContentSize = CGSize(width: 420, height: 540)
        popoverPresentationController?.delegate = self
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = MoogPalette.panel
        let text = UITextView()
        text.isEditable = false
        text.backgroundColor = .clear
        text.indicatorStyle = .white
        text.linkTextAttributes = [
            .foregroundColor: UIColor(hex: 0x9ECBFF),
            .underlineStyle: NSUnderlineStyle.single.rawValue,
        ]
        text.textContainerInset = UIEdgeInsets(top: 18, left: 16, bottom: 18, right: 16)
        text.attributedText = helpText()
        text.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(text)
        NSLayoutConstraint.activate([
            text.topAnchor.constraint(equalTo: view.topAnchor),
            text.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            text.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            text.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
    }

    func adaptivePresentationStyle(
        for controller: UIPresentationController,
        traitCollection: UITraitCollection
    ) -> UIModalPresentationStyle {
        .none
    }

    private func helpText() -> NSAttributedString {
        let sections: [(String, String)] = [
            (
                "KEYBOARD",
                "Polyphonic. Slide the keyboard back and forth with the mahogany strip."
            ),
            (
                "KEY SIZE",
                "Sets how large the keys are."
            ),
            (
                "SHOW NOTES",
                "Prints the note name on each white key. The circle next to the switch sets the color."
            ),
            (
                "SHOW KEY",
                "Marks keys outside the key signature. The circle next to the switch sets the pattern."
            ),
            (
                "KEEP ALIVE",
                "Leaves the screen on while the app is open."
            ),
            (
                "TROMBONE",
                "On plays the trombone and shows the horn. Off plays the piano."
            ),
            (
                "SHOW POSITIONS",
                "Prints the slide position on keys a straight tenor trombone can play, and moves the slide on the trombone image. The circle next to the switch sets the color."
            ),
            (
                "MIDI",
                "On sends the keys to a computer and stays quiet on this device. Off plays here. The button beside the switch opens Bluetooth. See below for MIDI details."
            ),
            (
                "KEY SIGNATURE",
                "Sets the signature on the score and the SHOW KEY marks."
            ),
            (
                "SCORE",
                "Notes you play are written on the right. Trombone uses tenor and bass clef. Piano uses treble and bass. CLEAR SCORE empties it. With show positions on, the trombone score also prints the position above each note. Pinch the staff to grow or shrink it, and slide it to look around. RECENTER puts that view back."
            ),
            (
                "MIDI DETAILS",
                "With MIDI on, the keys send note on and note off, and this device stays quiet. The staff, the horn, and the slide positions still follow the keys. The computer plays its own sound.\nGarageBand on a Mac. Use a data cable and unlock the iPad. Turn MIDI on. On the Mac, open Audio MIDI Setup, choose Window, Show MIDI Studio, and enable the iPad if it is gray. That is once per iPad. The iPad icon is the input. MIDI Studio does not show a port named Trombone Piano.\nIn GarageBand, add a Software Instrument track. The instrument does not matter. Select the track, turn its record button on, and play. GarageBand Settings, Audio/MIDI, leaves MIDI Controller on None. That menu is for control surfaces. An iPad entry under Input Device is the microphone. MIDI Status flashes when a key arrives. If nothing flashes, quit GarageBand, rescan MIDI, and open GarageBand again.\nLogic, Ableton, and MuseScore on the Mac use that same iPad. Other apps on this iPad can use the name Trombone Piano.\nWindows, Wi-Fi. Put the iPad and the PC on the same network. A guest network that isolates devices will not work. Install the free rtpMIDI driver, add a session, enable it, and connect to the iPad. If the iPad is not in the list, add it by its address, and allow that UDP port and the next one through the firewall. In MuseScore, select that session as the MIDI input, start note input, and play. The USB cable does not make the iPad a MIDI device on Windows.\nBluetooth. Turn MIDI on, tap the button beside the switch, and turn advertising on. On a Mac, pair from the Bluetooth control in MIDI Studio. On Windows 10 or later, pair it as a Bluetooth MIDI device, then choose Trombone Piano as the MIDI input."
            ),
        ]
        let heading = NSMutableParagraphStyle()
        heading.paragraphSpacing = 2
        let body = NSMutableParagraphStyle()
        body.lineSpacing = 2
        body.paragraphSpacing = 14
        let text = NSMutableAttributedString()
        for (index, section) in sections.enumerated() {
            if index > 0 {
                text.append(NSAttributedString(string: "\n", attributes: [
                    .font: moogFont(size: 6, weight: .medium),
                ]))
            }
            text.append(NSAttributedString(string: section.0 + "\n", attributes: [
                .font: moogFont(size: 14, weight: .medium),
                .foregroundColor: UIColor.white,
                .paragraphStyle: heading,
                .kern: 1.2,
            ]))
            text.append(NSAttributedString(string: section.1, attributes: [
                .font: moogFont(size: 15, weight: .medium),
                .foregroundColor: UIColor.white.withAlphaComponent(0.88),
                .paragraphStyle: body,
            ]))
        }
        appendHeading("PRIVACY", to: text, heading: heading)
        let policyURL = "https://extentdevices.com/privacy-policy.html"
        let privacy = "Notes and settings stay on the device. Nothing is sent to the developer. While MIDI is on, any computer on the local network can connect and receive the notes, and a cable-connected computer or another app on this device can receive them too. Bluetooth sends notes only after advertising is turned on. Privacy policy: \(policyURL)"
        let privacyText = NSMutableAttributedString(string: privacy, attributes: [
            .font: moogFont(size: 15, weight: .medium),
            .foregroundColor: UIColor.white.withAlphaComponent(0.88),
            .paragraphStyle: body,
        ])
        if let range = privacy.range(of: policyURL) {
            privacyText.addAttribute(.link, value: policyURL, range: NSRange(range, in: privacy))
        }
        text.append(privacyText)
        appendHeading("CREDITS", to: text, heading: heading)
        text.append(NSAttributedString(
            string: "Piano and trombone samples are Fluid (R3), copyright Frank Wen. The license notice is included in the app.",
            attributes: [
                .font: moogFont(size: 15, weight: .medium),
                .foregroundColor: UIColor.white.withAlphaComponent(0.88),
                .paragraphStyle: body,
            ]
        ))
        return text
    }

    private func appendHeading(_ title: String, to text: NSMutableAttributedString, heading: NSParagraphStyle) {
        text.append(NSAttributedString(string: "\n", attributes: [
            .font: moogFont(size: 6, weight: .medium),
        ]))
        text.append(NSAttributedString(string: title + "\n", attributes: [
            .font: moogFont(size: 14, weight: .medium),
            .foregroundColor: UIColor.white,
            .paragraphStyle: heading,
            .kern: 1.2,
        ]))
    }
}
