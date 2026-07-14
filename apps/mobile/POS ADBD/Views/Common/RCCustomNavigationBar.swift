import UIKit
import SnapKit

/// A reusable custom navigation bar component
/// Supports left/right buttons, title with left/center alignment
class RCCustomNavigationBar: UIView {
    
    // MARK: - UI Components
    private lazy var backButton: UIButton = {
        let button = UIButton(type: .custom)
        if let backImage = UIImage(named: "ic_back") {
            button.setImage(backImage, for: .normal)
        } else {
            button.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        }
        button.tintColor = .black
        button.addTarget(self, action: #selector(backButtonTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var leftButtonsStackView: UIStackView = {
        let stackView = UIStackView()
        stackView.axis = .horizontal
        stackView.spacing = 8
        stackView.alignment = .center
        stackView.distribution = .fill
        return stackView
    }()
    
    private lazy var rightButtonsStackView: UIStackView = {
        let stackView = UIStackView()
        stackView.axis = .horizontal
        stackView.spacing = 8
        stackView.alignment = .center
        stackView.distribution = .fill
        return stackView
    }()
    
    private lazy var titleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16)
        label.textColor = APP_TEXT_COLOR
        label.textAlignment = .left
        return label
    }()
    
    private var customTitleView: UIView? {
        didSet {
            oldValue?.removeFromSuperview()
            if customTitleView != nil {
                titleLabel.isHidden = true
                addSubview(customTitleView!)
            } else {
                titleLabel.isHidden = false
            }
            updateTitleConstraints()
        }
    }
    
    // MARK: - Properties
    var title: String? {
        didSet {
            titleLabel.text = title
            if let customTitle = customTitleView as? UILabel {
                customTitle.text = title
            }
        }
    }
    
    var barBackgroundColor: UIColor = .white {
        didSet {
            backgroundColor = barBackgroundColor
            updateStatusBarStyle()
        }
    }
    
    var onStatusBarStyleChanged: ((UIStatusBarStyle) -> Void)?
    
    var backButtonTintColor: UIColor = .black {
        didSet {
            backButton.tintColor = backButtonTintColor
        }
    }
    
    var titleColor: UIColor = APP_TEXT_COLOR {
        didSet {
            titleLabel.textColor = titleColor
        }
    }
    
    var onBackTapped: (() -> Void)?
    
    private var isTitleCentered: Bool = false
    private var isCustomTitleCentered: Bool = false
    
    // MARK: - Initializers
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }
    
    convenience init(title: String) {
        self.init(frame: .zero)
        self.title = title
    }
    
    convenience init(title: String, backgroundColor: UIColor) {
        self.init(frame: .zero)
        self.title = title
        self.barBackgroundColor = backgroundColor
    }
    
    // MARK: - Setup
    private func setupView() {
        backgroundColor = barBackgroundColor
        
        // Add back button to left stack view
        leftButtonsStackView.addArrangedSubview(backButton)
        
        // Add subviews
        addSubview(leftButtonsStackView)
        addSubview(titleLabel)
        addSubview(rightButtonsStackView)
        
        // Layout constraints
        setupConstraints()
        
        // Back button size
        backButton.snp.makeConstraints { make in
            make.width.height.equalTo(44)
        }
        
        // Fixed height
        snp.makeConstraints { make in
            make.height.equalTo(44)
        }
        
        updateStatusBarStyle()
    }
    
    private func setupConstraints() {
        // Left buttons stack view
        leftButtonsStackView.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(8)
            make.centerY.equalToSuperview()
            make.height.equalTo(44)
        }
        
        // Right buttons stack view
        rightButtonsStackView.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-8)
            make.centerY.equalToSuperview()
            make.height.equalTo(44)
        }
        
        // Title label constraints
        updateTitleConstraints()
    }
    
    private func updateTitleConstraints() {
        let titleView = customTitleView ?? titleLabel
        
        titleView.snp.remakeConstraints { make in
            make.centerY.equalToSuperview()

            // Keep the title vertically centered while still preventing oversized custom views
            // from breaking the navigation bar layout.
            let maxHeight: CGFloat = customTitleView != nil ? 44 : 32
            make.height.lessThanOrEqualTo(maxHeight)
            
            let isCentered = customTitleView != nil ? isCustomTitleCentered : isTitleCentered
            
            if isCentered {
                // Center between left and right buttons
                make.centerX.equalToSuperview()
                make.leading.greaterThanOrEqualTo(leftButtonsStackView.snp.trailing).offset(12)
                make.trailing.lessThanOrEqualTo(rightButtonsStackView.snp.leading).offset(-12)
            } else {
                // Left aligned after left buttons
                make.leading.equalTo(leftButtonsStackView.snp.trailing).offset(12)
                make.trailing.lessThanOrEqualTo(rightButtonsStackView.snp.leading).offset(-12)
            }
        }
    }
    
    // MARK: - Actions
    @objc private func backButtonTapped() {
        onBackTapped?()
    }
    
    // MARK: - Back Button
    func setBackButtonImage(_ image: UIImage?) {
        backButton.setImage(image, for: .normal)
    }
    
    func setDismissButton() {
        // Set X button for dismiss action (used for presented view controllers)
        let xImage = UIImage(systemName: "xmark")
        backButton.setImage(xImage, for: .normal)
    }
    
    func hideBackButton() {
        backButton.isHidden = true
    }
    
    func showBackButton() {
        backButton.isHidden = false
    }
    
    // MARK: - Left Buttons
    func addLeftButton(_ button: UIButton, size: CGSize? = nil) {
        configureButton(button, size: size)
        leftButtonsStackView.addArrangedSubview(button)
    }
    
    func removeLeftButton(_ button: UIButton) {
        leftButtonsStackView.removeArrangedSubview(button)
        button.removeFromSuperview()
    }
    
    func removeAllLeftButtons() {
        leftButtonsStackView.arrangedSubviews.forEach { view in
            if view != backButton {
                leftButtonsStackView.removeArrangedSubview(view)
                view.removeFromSuperview()
            }
        }
    }
    
    // MARK: - Right Buttons
    func addRightButton(_ button: UIButton, size: CGSize? = nil) {
        configureButton(button, size: size)
        rightButtonsStackView.addArrangedSubview(button)
    }
    
    func removeRightButton(_ button: UIButton) {
        rightButtonsStackView.removeArrangedSubview(button)
        button.removeFromSuperview()
    }
    
    func removeAllRightButtons() {
        rightButtonsStackView.arrangedSubviews.forEach { view in
            rightButtonsStackView.removeArrangedSubview(view)
            view.removeFromSuperview()
        }
    }
    
    // MARK: - Button Configuration Helper
    private func configureButton(_ button: UIButton, size: CGSize?) {
        button.titleLabel?.numberOfLines = 1
        button.titleLabel?.adjustsFontSizeToFitWidth = false
        button.titleLabel?.lineBreakMode = .byTruncatingTail
        
        if let size = size {
            // Fixed size button
            button.snp.makeConstraints { make in
                make.width.equalTo(size.width)
                make.height.equalTo(size.height)
            }
        } else {
            // Auto-sizing button
            button.snp.makeConstraints { make in
                make.height.equalTo(44)
                make.width.greaterThanOrEqualTo(44)
            }
            button.setContentHuggingPriority(.defaultHigh, for: .horizontal)
            button.setContentCompressionResistancePriority(.required, for: .horizontal)
            button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 8, bottom: 0, right: 8)
        }
    }
    
    // MARK: - Title
    func setTitleCentered(_ centered: Bool) {
        isTitleCentered = centered
        titleLabel.textAlignment = centered ? .center : .left
        updateTitleConstraints()
    }
    
    func setCustomTitleView(_ view: UIView?, centered: Bool = false) {
        isCustomTitleCentered = centered
        customTitleView = view
    }
    
    func removeCustomTitleView() {
        customTitleView = nil
        isCustomTitleCentered = false
    }
    
    // MARK: - Status Bar Style
    private func updateStatusBarStyle() {
        let statusBarStyle: UIStatusBarStyle = barBackgroundColor.isLightColor ? .darkContent : .lightContent
        onStatusBarStyleChanged?(statusBarStyle)
    }
}

// MARK: - UIColor Extension
extension UIColor {
    var isLightColor: Bool {
        var white: CGFloat = 0
        getWhite(&white, alpha: nil)
        return white > 0.5
    }
}
