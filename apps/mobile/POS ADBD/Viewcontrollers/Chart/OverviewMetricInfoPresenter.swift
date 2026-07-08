//
//  OverviewMetricInfoPresenter.swift
//  POS ADBD
//

import UIKit
import SnapKit

enum OverviewMetricInfoPresenter {

    static func makeInfoButton(metric: OverviewMetric, target: Any?, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 10, weight: .regular)
        button.setPreferredSymbolConfiguration(config, forImageIn: .normal)
        button.setImage(UIImage(systemName: "info.circle"), for: .normal)
        button.tintColor = UIColor.textTertiary.withAlphaComponent(0.85)
        button.tag = metric.rawValue
        button.addTarget(target, action: action, for: .touchUpInside)
        button.snp.makeConstraints { make in
            make.size.equalTo(22)
        }
        return button
    }

    static func present(metric: OverviewMetric, from viewController: UIViewController) {
        let contentVC = UIViewController()
        contentVC.view.backgroundColor = .systemBackground

        let header = makeSheetHeaderView(title: metric.title)
        contentVC.view.addSubview(header)

        let textView = UITextView()
        textView.text = metric.explanation
        textView.font = .preferredFont(forTextStyle: .body)
        textView.textColor = .label
        textView.isEditable = false
        textView.textContainerInset = UIEdgeInsets(top: 16, left: 16, bottom: 16, right: 16)
        contentVC.view.addSubview(textView)

        header.snp.makeConstraints { make in
            make.top.equalTo(contentVC.view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
        }
        textView.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }

        let nav = UINavigationController(rootViewController: contentVC)
        nav.modalPresentationStyle = .pageSheet
        nav.isNavigationBarHidden = true
        applyDefaultSheetPresentation(to: nav.sheetPresentationController)
        viewController.present(nav, animated: true)
    }

    private static func makeSheetHeaderView(title: String) -> UIView {
        let container = UIView()
        container.backgroundColor = .white

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .bodyBold(size: 17)
        titleLabel.textColor = .label
        titleLabel.textAlignment = .center

        let separator = UIView()
        separator.backgroundColor = .separator

        container.addSubview(titleLabel)
        container.addSubview(separator)
        container.snp.makeConstraints { make in
            make.height.equalTo(56)
        }
        titleLabel.snp.makeConstraints { make in
            make.center.equalToSuperview()
        }
        separator.snp.makeConstraints { make in
            make.leading.trailing.bottom.equalToSuperview()
            make.height.equalTo(1 / UIScreen.main.scale)
        }
        return container
    }

    private static func applyDefaultSheetPresentation(to sheet: UISheetPresentationController?) {
        guard let sheet = sheet else { return }
        if #available(iOS 15.0, *) {
            sheet.detents = [.medium()]
            sheet.prefersGrabberVisible = true
        }
    }
}
