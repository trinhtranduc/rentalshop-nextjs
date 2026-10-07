//
//  OverviewTopAllViewController.swift
//  POS ADBD
//
//  #633: "Xem tất cả" of Top sản phẩm / Top khách hàng on Tổng quan. The period's ranking, up to
//  `OverviewDashLogic.topAllLimit` (50, like the web drawer `TOP_ALL_LIMIT`), from the same period report as the
//  card. Rows look and behave like the card's: a tap opens that product's / customer's orders in the period.
//

import UIKit
import SnapKit
import Alamofire

final class OverviewTopAllViewController: BaseViewControler {
    private let products: Bool
    private let range: DayKeyRange
    private let vietnamese: Bool

    private let scroll = UIScrollView()
    private let stack = UIStackView()
    private var request: DataRequest?

    init(products: Bool, range: DayKeyRange, vietnamese: Bool) {
        self.products = products
        self.range = range
        self.vietnamese = vietnamese
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    deinit { request?.cancel() }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = OVColor.page
        let back = SettingsDetailV2.backButton()
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        let title = (products ? "overview.dash.top.products" : "overview.dash.top.customers").localized()
        let line = SettingsDetailV2.installHeader(on: view, title: title, back: back)

        let period = OVFont.label(OverviewLogic.longRange(range, locale: OrdersHomeLogic.appLocale), DS.TextSize.secondary,
                                  color: OVColor.muted)
        view.addSubview(period)
        period.snp.makeConstraints { make in
            make.top.equalTo(line.snp.bottom).offset(10)
            make.leading.trailing.equalToSuperview().inset(16)
        }

        stack.axis = .vertical
        stack.spacing = 4
        scroll.alwaysBounceVertical = true
        view.addSubview(scroll)
        scroll.snp.makeConstraints { make in
            make.top.equalTo(period.snp.bottom).offset(8)
            make.leading.trailing.bottom.equalToSuperview()
        }
        let box = UIView()
        box.backgroundColor = OVColor.surface
        box.layer.cornerRadius = 14
        box.layer.borderWidth = 1
        box.layer.borderColor = OVColor.line.resolvedColor(with: traitCollection).cgColor
        scroll.addSubview(box)
        box.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(4)
            make.bottom.equalToSuperview().inset(24)
            make.leading.trailing.equalTo(view).inset(16)
        }
        box.addSubview(stack)
        stack.snp.makeConstraints { make in make.edges.equalToSuperview().inset(14) }
        load()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    @objc private func backTapped() {
        navigationController?.popViewController(animated: true)
    }

    // MARK: - Data

    private func load() {
        let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
        spinner.startAnimating()
        show([spinner])
        request?.cancel()
        request = TabsV2APIService.shared.overviewReport(range, limit: OverviewDashLogic.topAllLimit) { [weak self] report, error in
            DispatchQueue.main.async { self?.render(report, error: error) }
        }
    }

    private func render(_ report: OverviewReport?, error: NSError?) {
        guard let report else {
            let message = OVFont.label(error?.localizedDescription ?? "overview.dash.top.empty".localized(), DS.TextSize.secondary,
                                       color: OVColor.muted, lines: 0)
            let retry = UIButton(type: .system)
            retry.setTitle("Retry".localized(), for: .normal)
            retry.contentHorizontalAlignment = .leading
            retry.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
            show([message, retry])
            return
        }
        let rows = products ? OverviewDashLogic.topProductRows(report.topProducts, limit: OverviewDashLogic.topAllLimit)
                            : OverviewDashLogic.topCustomerRows(report.topCustomers, limit: OverviewDashLogic.topAllLimit)
        guard !rows.isEmpty else {
            show([OVFont.label("overview.dash.top.empty".localized(), DS.TextSize.secondary, color: OVColor.muted, lines: 0)])
            return
        }
        show(rows.map { row in
            let view = OverviewV2ViewController.topRowView(row, products: products, vietnamese: vietnamese)
            if row.id != nil {
                view.addTarget(self, action: #selector(rowTapped(_:)), for: .touchUpInside)
            }
            return view
        })
    }

    private func show(_ views: [UIView]) {
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        views.forEach(stack.addArrangedSubview)
    }

    @objc private func retryTapped() { load() }

    /// Same as the card row: that product's / customer's orders in the period
    @objc private func rowTapped(_ sender: OverviewTopRowView) {
        guard let id = sender.row.id else { return }
        let filter: OverviewRankingOrdersFilter = products ? .product(id: id, name: sender.row.name)
                                                           : .customer(id: id, name: sender.row.name)
        let controller = OverviewRankingOrdersViewController(
            filter: filter,
            startDate: OverviewLogic.date(of: range.start),
            endDate: OverviewLogic.date(of: range.end),
            periodSubtitle: OverviewLogic.longRange(range))
        controller.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(controller, animated: true)
    }
}
