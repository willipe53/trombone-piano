import XCTest

final class PhoneLayoutUITests: XCTestCase {
    func testPlaySlideAndHelpInEveryOrientation() throws {
        let app = XCUIApplication()
        app.launch()
        let window = app.windows.firstMatch
        XCTAssertTrue(window.waitForExistence(timeout: 5))

        let shots = URL(fileURLWithPath: "/tmp/trombone-shots", isDirectory: true)
        try FileManager.default.createDirectory(at: shots, withIntermediateDirectories: true)
        let deviceName = ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"]
            ?? UIDevice.current.model
        let slug = deviceName.replacingOccurrences(of: " ", with: "-")

        let phone = UIDevice.current.userInterfaceIdiom == .phone
        var orientations: [(String, UIDeviceOrientation)] = [
            ("landscapeLeft", .landscapeLeft),
            ("landscapeRight", .landscapeRight),
        ]
        if !phone {
            orientations.insert(("portraitUpsideDown", .portraitUpsideDown), at: 0)
            orientations.insert(("portrait", .portrait), at: 0)
        }
        for (name, orientation) in orientations {
            XCUIDevice.shared.orientation = orientation
            let landscape = orientation == .landscapeLeft || orientation == .landscapeRight
            XCTAssertTrue(
                waitUntil(window: window) { frame in
                    landscape ? frame.width > frame.height : frame.height > frame.width
                },
                "\(name) stayed at \(window.frame.size)"
            )
            try XCUIScreen.main.screenshot().pngRepresentation.write(
                to: shots.appendingPathComponent("\(slug)-\(name).png")
            )

            window.coordinate(withNormalizedOffset: CGVector(dx: 0.55, dy: 0.9)).tap()
            window.coordinate(withNormalizedOffset: CGVector(dx: 0.7, dy: 0.9)).tap()

            let strip = app.otherElements["mahogany-strip"]
            XCTAssertTrue(strip.waitForExistence(timeout: 2), "mahogany strip missing in \(name)")
            if strip.isHittable {
                let start = strip.coordinate(withNormalizedOffset: CGVector(dx: 0.75, dy: 0.5))
                let end = strip.coordinate(withNormalizedOffset: CGVector(dx: 0.2, dy: 0.5))
                start.press(forDuration: 0.1, thenDragTo: end)
            }

            let notes = app.buttons["Show notes"]
            if notes.exists, notes.isHittable {
                notes.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
            }

            let help = app.buttons["Help"]
            if landscape {
                XCTAssertTrue(help.waitForExistence(timeout: 2) && help.isHittable, "help not on screen in \(name)")
                help.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
                sleep(1)
                try XCUIScreen.main.screenshot().pngRepresentation.write(
                    to: shots.appendingPathComponent("\(slug)-\(name)-help.png")
                )
                window.coordinate(withNormalizedOffset: CGVector(dx: 0.15, dy: 0.92)).tap()
            }
        }
    }

    func testPinchGrowsAndShrinksTheStaff() throws {
        let app = XCUIApplication()
        app.launchArguments = [
            "-scoreMagnification", "1",
            "-scoreOffsetX", "0",
            "-scoreOffsetY", "0",
        ]
        app.launch()
        let window = app.windows.firstMatch
        XCTAssertTrue(window.waitForExistence(timeout: 8))

        let shots = URL(fileURLWithPath: "/tmp/trombone-shots", isDirectory: true)
        try FileManager.default.createDirectory(at: shots, withIntermediateDirectories: true)
        let deviceName = ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"] ?? UIDevice.current.model
        let slug = deviceName.replacingOccurrences(of: " ", with: "-")
        let phone = UIDevice.current.userInterfaceIdiom == .phone
        let orientations: [(String, UIDeviceOrientation)] = phone
            ? [("landscapeLeft", .landscapeLeft), ("landscapeRight", .landscapeRight)]
            : [("portrait", .portrait), ("landscapeLeft", .landscapeLeft)]

        let staff = app.scrollViews["staff"]
        XCTAssertTrue(staff.waitForExistence(timeout: 4))

        for (name, orientation) in orientations {
            XCUIDevice.shared.orientation = orientation
            let landscape = orientation == .landscapeLeft || orientation == .landscapeRight
            XCTAssertTrue(
                waitUntil(window: window) { frame in
                    landscape ? frame.width > frame.height : frame.height > frame.width
                },
                "\(name) stayed at \(window.frame.size)"
            )
            let recenter = app.buttons["RECENTER"]
            if recenter.exists {
                recenter.tap()
            }
            XCTAssertFalse(recenter.waitForExistence(timeout: 1), "recenter was showing before the pinch in \(name)")

            staff.pinch(withScale: 2, velocity: 2)
            XCTAssertTrue(recenter.waitForExistence(timeout: 3), "grow pinch did not leave the fitted view in \(name)")
            try XCUIScreen.main.screenshot().pngRepresentation.write(
                to: shots.appendingPathComponent("\(slug)-\(name)-pinched.png")
            )

            staff.pinch(withScale: 0.45, velocity: -2)
            if recenter.exists {
                recenter.tap()
            }
            let gone = waitUntil(window: window) { _ in !app.buttons["RECENTER"].exists }
            XCTAssertTrue(gone, "squeeze or recenter left the button up in \(name)")
            try XCUIScreen.main.screenshot().pngRepresentation.write(
                to: shots.appendingPathComponent("\(slug)-\(name)-recentered.png")
            )
        }
    }

    private func waitUntil(window: XCUIElement, matches: (CGRect) -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(4)
        while Date() < deadline {
            if matches(window.frame) { return true }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        return matches(window.frame)
    }
}
