//
//  UpdateRequiredViewController.swift
//  POS ADBD
//
//  Blocking screen when this build is below the minimum version from the app config (#370).
//

import UIKit
import SnapKit

final class UpdateRequiredViewController: UIViewController {
    private let storeUrl: URL?

    init(storeUrl: String?) {
        self.storeUrl = storeUrl.flatMap(URL.init(string:))
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
        isModalInPresentation = true
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface

        let title = UILabel()
        title.text = "Update required".localized()
        title.font = Utils.boldFont(size: 22)
        title.textColor = DS.Color.text
        title.textAlignment = .center
        title.numberOfLines = 0

        let message = UILabel()
        message.text = "A new version of AnyRent is needed to keep working. Please update the app.".localized()
        message.font = Utils.regularFont(size: 16)
        message.textColor = DS.Color.textMuted
        message.textAlignment = .center
        message.numberOfLines = 0

        let stack = UIStackView(arrangedSubviews: [title, message])
        stack.axis = .vertical
        stack.spacing = DS.Spacing.md
        view.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.centerY.equalToSuperview().offset(-40)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.xl)
        }

        guard storeUrl != nil else { return }
        let button = UIButton(type: .system)
        button.setTitle("Update".localized(), for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 16)
        button.setTitleColor(.white, for: .normal)
        button.backgroundColor = DS.Color.primary
        button.layer.cornerRadius = 14
        button.addTarget(self, action: #selector(openStore), for: .touchUpInside)
        view.addSubview(button)
        button.snp.makeConstraints { make in
            make.top.equalTo(stack.snp.bottom).offset(DS.Spacing.xl)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.xl)
            make.height.equalTo(52)
        }
    }

    @objc private func openStore() {
        guard let storeUrl else { return }
        UIApplication.shared.open(storeUrl)
    }
}
