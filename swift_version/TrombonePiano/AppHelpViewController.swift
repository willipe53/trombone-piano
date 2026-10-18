import MarkdownUI
import SwiftUI
import UIKit

/// Full-screen help. Back returns to the pills. The info ball is not on this page.
final class AppHelpViewController: UIViewController {
    init() {
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        UIDevice.current.userInterfaceIdiom == .pad ? .all : .allButUpsideDown
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = MoogPalette.panel
        let host = UIHostingController(rootView: AppHelpView(onBack: { [weak self] in
            self?.dismiss(animated: true)
        }))
        host.view.backgroundColor = MoogPalette.panel
        addChild(host)
        host.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(host.view)
        NSLayoutConstraint.activate([
            host.view.topAnchor.constraint(equalTo: view.topAnchor),
            host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
        host.didMove(toParent: self)
    }
}

private struct AppHelpView: View {
    var onBack: () -> Void
    private let markdown: String

    init(onBack: @escaping () -> Void) {
        self.onBack = onBack
        markdown = Self.helpMarkdown()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button("Back", action: onBack)
                .font(Font(moogFont(size: 17, weight: .medium)))
                .foregroundStyle(Color.white)
                .accessibilityIdentifier("help-back")
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
            ScrollView {
                Markdown(markdown)
                    .markdownTheme(Self.theme)
                    .markdownImageProvider(.asset)
                    .markdownInlineImageProvider(.asset)
                    .padding(20)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .background(Self.panel)
    }

    private static let panel = Color(uiColor: MoogPalette.panel)

    private static let theme = Theme()
        .text {
            ForegroundColor(Color.white.opacity(0.88))
            BackgroundColor(panel)
            FontFamily(.custom("Futura-Medium"))
            FontSize(16)
        }
        .link {
            ForegroundColor(Color(red: 158 / 255, green: 203 / 255, blue: 1))
        }
        .heading2 { configuration in
            configuration.label
                .relativeLineSpacing(.em(0.125))
                .markdownMargin(top: 22, bottom: 8)
                .markdownTextStyle {
                    FontWeight(.semibold)
                    FontSize(.em(1.15))
                    ForegroundColor(.white)
                }
        }
        .paragraph { configuration in
            configuration.label
                .fixedSize(horizontal: false, vertical: true)
                .relativeLineSpacing(.em(0.2))
                .markdownMargin(top: 0, bottom: 16)
        }

    private static func helpMarkdown() -> String {
        let base: String
        if let url = Bundle.main.url(forResource: "Help", withExtension: "md"),
           let text = try? String(contentsOf: url, encoding: .utf8) {
            base = text
        } else {
            base = "Help could not be loaded."
        }
        guard let notice = sampleLicenseNotice() else { return base }
        let paragraphs = notice
            .components(separatedBy: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .joined(separator: "\n\n")
        return base + "\n\n" + paragraphs + "\n"
    }

    /// The MIT notice shipped with the samples. The file is hard-wrapped, so each body paragraph is joined onto one line. The title and copyright lines at the top keep their own lines.
    private static func sampleLicenseNotice() -> String? {
        guard let url = Bundle.main.url(forResource: "NOTICE", withExtension: "txt"),
              let raw = try? String(contentsOf: url, encoding: .utf8) else { return nil }
        let paragraphs = raw
            .components(separatedBy: "\n\n")
            .enumerated()
            .map { index, paragraph in
                paragraph
                    .split(separator: "\n", omittingEmptySubsequences: true)
                    .map { $0.trimmingCharacters(in: .whitespaces) }
                    .joined(separator: index == 0 ? "\n" : " ")
            }
            .filter { !$0.isEmpty }
        return paragraphs.isEmpty ? nil : paragraphs.joined(separator: "\n")
    }
}
