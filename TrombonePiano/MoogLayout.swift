import Foundation

/// Heights for the black panel and the bar above the keys.
///
/// The bar is 120% of one third of the key height when the screen can also keep
/// `minPanelHeight` for the controls. On a short screen that proportion is too
/// thin to drag, so the bar stays at `minWoodHeight` while the panel still fits.
struct MoogLayout: Equatable {
    var panelHeight: Double
    var woodHeight: Double

    static let minPanelHeight: Double = 188
    /// Tall enough to drag the keyboard. The layout formula turns a larger leftover into this strip.
    static let minWoodHeight: Double = 44
    /// Extra bar height around the trombone drawing, which stays at the previous bar height.
    static let barHeightFactor: Double = 1.2

    /// On-screen key height that still leaves the panel and a draggable strip.
    static func maxVisibleKeyHeight(viewportHeight: Double) -> Double {
        let reserved = minPanelHeight + minWoodHeight * 3 / barHeightFactor
        return max(0, viewportHeight - reserved)
    }

    static func layout(
        viewportHeight: Double,
        keyHeight: Double,
        minPanelHeight: Double = MoogLayout.minPanelHeight
    ) -> MoogLayout {
        let room = min(max(viewportHeight - keyHeight, 0), viewportHeight)
        let availableForWood = max(0, room - minPanelHeight)
        let natural = min(keyHeight, availableForWood) / 3 * barHeightFactor
        let woodHeight = min(availableForWood, max(natural, min(minWoodHeight, availableForWood)))
        return MoogLayout(
            panelHeight: room - woodHeight,
            woodHeight: woodHeight
        )
    }
}
