import XCTest

/// Store screenshots for the 6.9-inch and 6.5-inch iPhone slots and the 13-inch iPad slot.
/// The file prefix follows the screenshot's long side. Saves raw simulator frames.
final class StoreScreenshotUITests: XCTestCase {
    func testCaptureStoreScreenshots() throws {
        let shots = URL(fileURLWithPath: storeShotDirectory, isDirectory: true)
        try FileManager.default.createDirectory(at: shots, withIntermediateDirectories: true)

        let app = XCUIApplication()
        app.launch()
        let window = app.windows.firstMatch
        XCTAssertTrue(window.waitForExistence(timeout: 8))

        let phone = UIDevice.current.userInterfaceIdiom == .phone
        let prefix = shotPrefix(phone: phone, png: XCUIScreen.main.screenshot().pngRepresentation)
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(
            waitUntil(window: window) { $0.width > $0.height },
            "landscape stayed at \(window.frame.size)"
        )
        sleep(1)
        try save("\(prefix)-landscape-trombone.png", to: shots)

        for dx in [0.40, 0.48, 0.56, 0.64, 0.72, 0.80] {
            window.coordinate(withNormalizedOffset: CGVector(dx: dx, dy: 0.90)).tap()
            sleep(1)
        }
        sleep(1)
        try save("\(prefix)-landscape-phrase.png", to: shots)

        if phone {
            let trombone = app.buttons["Trombone"]
            XCTAssertTrue(trombone.waitForExistence(timeout: 2))
            trombone.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
            sleep(1)
            try save("\(prefix)-landscape-piano.png", to: shots)
        } else {
            XCUIDevice.shared.orientation = .portrait
            XCTAssertTrue(
                waitUntil(window: window) { $0.height > $0.width },
                "portrait stayed at \(window.frame.size)"
            )
            sleep(1)
            try save("ipad-13-portrait-trombone.png", to: shots)
        }
    }

    /// Names follow the screenshot bitmap, not UIScreen, which can disagree with the PNG.
    /// 2868 is the 6.9-inch slot. 2778 and 2688 are the 6.5-inch slot.
    private func shotPrefix(phone: Bool, png: Data) -> String {
        if !phone { return "ipad-13" }
        let longSide = pngPixelLongSide(png)
        if longSide >= 2800 { return "iphone-6.9" }
        if longSide >= 2600 { return "iphone-6.5" }
        return "iphone-\(longSide)"
    }

    private func pngPixelLongSide(_ data: Data) -> Int {
        guard data.count >= 24 else { return 0 }
        let width = data.subdata(in: 16..<20).withUnsafeBytes { Int(UInt32(bigEndian: $0.load(as: UInt32.self))) }
        let height = data.subdata(in: 20..<24).withUnsafeBytes { Int(UInt32(bigEndian: $0.load(as: UInt32.self))) }
        return max(width, height)
    }

    private func save(_ name: String, to directory: URL) throws {
        let url = directory.appendingPathComponent(name)
        try XCUIScreen.main.screenshot().pngRepresentation.write(to: url)
    }

    private func waitUntil(window: XCUIElement, matches: (CGRect) -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(6)
        while Date() < deadline {
            if matches(window.frame) { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        return matches(window.frame)
    }
}

private let storeShotDirectory = "/Users/willipe/github/trombone-piano/app-store/screenshots"
