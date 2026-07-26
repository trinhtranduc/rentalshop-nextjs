//
//  OnboardingViewController.swift
//  POS ADBD
//
//  First-login onboarding: create product → customer → order.
//

import UIKit
import SnapKit

private struct OnboardingPage {
    let imageName: String
    let titleKey: String
    let bodyKey: String
}

final class OnboardingViewController: BaseViewControler {
    private let pages: [OnboardingPage] = [
        OnboardingPage(
            imageName: "onboarding_product",
            titleKey: "onboarding.product.title",
            bodyKey: "onboarding.product.body"
        ),
        OnboardingPage(
            imageName: "onboarding_customer",
            titleKey: "onboarding.customer.title",
            bodyKey: "onboarding.customer.body"
        ),
        OnboardingPage(
            imageName: "onboarding_order",
            titleKey: "onboarding.order.title",
            bodyKey: "onboarding.order.body"
        )
    ]

    private lazy var skipButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Skip".localized(), for: .normal)
        button.titleLabel?.font = Utils.mediumFont(size: 15)
        button.setTitleColor(.textSecondary, for: .normal)
        button.addTarget(self, action: #selector(finishOnboarding), for: .touchUpInside)
        return button
    }()

    private lazy var scrollView: UIScrollView = {
        let scroll = UIScrollView()
        scroll.isPagingEnabled = true
        scroll.showsHorizontalScrollIndicator = false
        scroll.delegate = self
        scroll.bounces = true
        return scroll
    }()

    private lazy var pageStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.alignment = .fill
        stack.distribution = .fillEqually
        return stack
    }()

    private lazy var pageControl: UIPageControl = {
        let control = UIPageControl()
        control.numberOfPages = pages.count
        control.currentPage = 0
        control.pageIndicatorTintColor = UIColor.systemGray4
        control.currentPageIndicatorTintColor = APP_TONE_COLOR
        control.addTarget(self, action: #selector(pageControlChanged), for: .valueChanged)
        return control
    }()

    private lazy var primaryButton: RCPrimaryButton = {
        let button = RCPrimaryButton(title: "Next".localized(), backgroundColor: APP_TONE_COLOR)
        button.addTarget(self, action: #selector(primaryTapped), for: .touchUpInside)
        return button
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        setupUI()
        buildPages()
        updatePrimaryButtonTitle()
    }

    internal override func setupUI() {
        view.addSubview(skipButton)
        view.addSubview(scrollView)
        scrollView.addSubview(pageStack)
        view.addSubview(pageControl)
        view.addSubview(primaryButton)

        skipButton.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(8)
            make.trailing.equalToSuperview().offset(-20)
            make.height.equalTo(36)
        }

        primaryButton.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(24)
            make.trailing.equalToSuperview().offset(-24)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-16)
            make.height.equalTo(52)
        }

        pageControl.snp.makeConstraints { make in
            make.centerX.equalToSuperview()
            make.bottom.equalTo(primaryButton.snp.top).offset(-20)
        }

        scrollView.snp.makeConstraints { make in
            make.top.equalTo(skipButton.snp.bottom).offset(8)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(pageControl.snp.top).offset(-12)
        }

        pageStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.height.equalToSuperview()
        }
    }

    private func buildPages() {
        pages.forEach { page in
            let pageView = OnboardingPageView(
                imageName: page.imageName,
                title: page.titleKey.localized(),
                body: page.bodyKey.localized()
            )
            pageStack.addArrangedSubview(pageView)
            pageView.snp.makeConstraints { make in
                make.width.equalTo(scrollView.snp.width)
            }
        }
    }

    private var currentPageIndex: Int {
        let width = scrollView.bounds.width
        guard width > 0 else { return 0 }
        return min(pages.count - 1, max(0, Int(round(scrollView.contentOffset.x / width))))
    }

    private func updatePrimaryButtonTitle() {
        let isLast = currentPageIndex >= pages.count - 1
        primaryButton.setTitle(
            isLast ? "Get Started".localized() : "Next".localized(),
            for: .normal
        )
        skipButton.isHidden = isLast
    }

    private func scrollToPage(_ index: Int, animated: Bool = true) {
        let clamped = min(max(index, 0), pages.count - 1)
        let offset = CGFloat(clamped) * scrollView.bounds.width
        scrollView.setContentOffset(CGPoint(x: offset, y: 0), animated: animated)
        pageControl.currentPage = clamped
        updatePrimaryButtonTitle()
    }

    @objc private func primaryTapped() {
        if currentPageIndex >= pages.count - 1 {
            finishOnboarding()
        } else {
            scrollToPage(currentPageIndex + 1)
        }
    }

    @objc private func pageControlChanged() {
        scrollToPage(pageControl.currentPage)
    }

    @objc private func finishOnboarding() {
        Utils.markOnboardingCompleted()
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
        appDelegate.loadMainUserView(forceMain: true)
    }
}

extension OnboardingViewController: UIScrollViewDelegate {
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        let width = scrollView.bounds.width
        guard width > 0 else { return }
        let page = Int(round(scrollView.contentOffset.x / width))
        if pageControl.currentPage != page {
            pageControl.currentPage = page
            updatePrimaryButtonTitle()
        }
    }
}

// MARK: - Page view

private final class OnboardingPageView: UIView {
    private let iconView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.clipsToBounds = true
        return imageView
    }()

    private let titleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.extraBoldFont(size: 26)
        label.textColor = .textPrimary
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()

    private let bodyLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16)
        label.textColor = .textSecondary
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()

    init(imageName: String, title: String, body: String) {
        super.init(frame: .zero)
        iconView.image = UIImage(named: imageName)
        titleLabel.text = title
        bodyLabel.text = body
        setupLayout()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupLayout() {
        let contentStack = UIStackView(arrangedSubviews: [iconView, titleLabel, bodyLabel])
        contentStack.axis = .vertical
        contentStack.alignment = .center
        contentStack.spacing = 20
        addSubview(contentStack)

        iconView.snp.makeConstraints { make in
            make.width.height.equalTo(220)
        }

        contentStack.setCustomSpacing(28, after: iconView)

        contentStack.snp.makeConstraints { make in
            make.centerY.equalToSuperview().offset(-24)
            make.leading.equalToSuperview().offset(32)
            make.trailing.equalToSuperview().offset(-32)
        }
    }
}
