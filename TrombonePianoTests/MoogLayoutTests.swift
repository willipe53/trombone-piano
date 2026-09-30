import XCTest
@testable import TrombonePiano

final class MoogLayoutTests: XCTestCase {
    func testRosewoodBarIsOneThirdOfTheKeysWhenThePanelStillFits() {
        let keyHeight = 200.0
        let layout = MoogLayout.layout(viewportHeight: 1000, keyHeight: keyHeight)
        XCTAssertEqual(layout.woodHeight, keyHeight / 3 * MoogLayout.barHeightFactor)
        XCTAssertEqual(layout.panelHeight, 1000 - keyHeight - keyHeight / 3 * MoogLayout.barHeightFactor)
    }

    func testRosewoodBarYieldsWhenAFullHeightBarWouldHideThePanel() {
        let viewport = 1032.0
        let keyHeight = 624.0
        let layout = MoogLayout.layout(viewportHeight: viewport, keyHeight: keyHeight)
        let roomLeftAfterPanel = viewport - keyHeight - MoogLayout.minPanelHeight
        XCTAssertEqual(layout.woodHeight, roomLeftAfterPanel / 3 * MoogLayout.barHeightFactor, accuracy: 0.001)
        XCTAssertGreaterThanOrEqual(layout.panelHeight, MoogLayout.minPanelHeight)
        XCTAssertEqual(layout.panelHeight + layout.woodHeight, viewport - keyHeight)
    }

    func testShortScreenKeepsThePanelAndADraggableStrip() {
        let viewport = 375.0
        let keyHeight = MoogLayout.maxVisibleKeyHeight(viewportHeight: viewport)
        let layout = MoogLayout.layout(viewportHeight: viewport, keyHeight: keyHeight)
        XCTAssertGreaterThanOrEqual(layout.panelHeight, MoogLayout.minPanelHeight - 0.01)
        XCTAssertEqual(layout.woodHeight, MoogLayout.minWoodHeight, accuracy: 0.01)
    }

    func testFullSizeKeysStillFitAnElevenInchLandscape() {
        let fullVisible = whiteKeyHeightMm * ipadProPointsPerMillimeter * 0.85
        XCTAssertLessThanOrEqual(fullVisible, MoogLayout.maxVisibleKeyHeight(viewportHeight: 834))
    }
}
