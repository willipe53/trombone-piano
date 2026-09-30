import UIKit

final class RosewoodView: UIView {
    private let mahogany = UIImage(named: "mahogany")

    override init(frame: CGRect) {
        super.init(frame: frame)
        isOpaque = true
        contentMode = .redraw
        backgroundColor = UIColor(hex: 0x4A1A10)
        clipsToBounds = true
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func draw(_ rect: CGRect) {
        mahogany?.draw(in: bounds)
    }
}
