//
//  PadSplit.swift
//  POS ADBD
//
//  #973 iPad in landscape: Orders and Settings show the list and the opened screen side by side, Home shows the
//  products as a grid with the cart beside it, and the screens of the old design (flags off) sit in a centered
//  column. Built only on iPad (TabbarViewController); iPhone keeps its tabs exactly as before.
//

import UIKit

enum PadSplit {
    /// Width of the list pane (Orders, Settings)
    static func primaryWidth(total: CGFloat) -> CGFloat {
        min(max(total * 0.36, 360), 440)
    }

    /// Width of the cart beside the Home grid
    static func cartPanelWidth(total: CGFloat) -> CGFloat {
        min(max(total * 0.32, 360), 420)
    }

    /// The cart panel is there while the cart has items
    static func showsCartPanel(itemCount: Int) -> Bool {
        itemCount > 0
    }

    /// The cart takes taps while it is the screen in front: the top of the stack, or the panel beside the Home grid
    /// while that Home is the top
    static func cartIsInFront(_ cart: UIViewController, top: UIViewController?) -> Bool {
        guard let top else { return false }
        if top === cart { return true }
        return cart.parent is HomeCartSplitViewController && top === cart.parent
    }

    /// The screen a tab shows: inside its navigation controller, a pane container or the centered column.
    /// On iPhone a tab is a navigation controller around the screen itself.
    static func unwrap(_ controller: UIViewController?) -> UIViewController? {
        guard let controller else { return nil }
        if let nav = controller as? UINavigationController { return unwrap(nav.viewControllers.first) }
        if let split = controller as? PadSplitViewController { return split.primary }
        if let home = controller as? HomeCartSplitViewController { return home.home }
        if let column = controller as? PadCenteredViewController { return column.content }
        return controller
    }

    /// Tab screen for iPad: Orders and Settings (new design) in two panes, Home with the cart panel, screens of the
    /// old design in a centered column, the others as they are. Keeps the tab item and title.
    static func tabRoot(for screen: UIViewController) -> UIViewController {
        let root: UIViewController
        switch screen {
        case is OrdersViewController:
            root = PadSplitViewController(primary: screen, emptyText: "ipad.split.orders.empty".localized(),
                                          symbol: "list.bullet.rectangle")
        case is SettingsV2ViewController:
            root = PadSplitViewController(primary: screen, emptyText: "ipad.split.settings.empty".localized(),
                                          symbol: "gearshape")
        case let home as ProductsHomeViewController:
            root = HomeCartSplitViewController(home: home)
        case is MainViewController, is SaleViewController, is CalendarViewController, is OverviewViewController,
             is SettingsViewController:
            root = PadCenteredViewController(content: screen)
        default:
            return screen
        }
        root.tabBarItem = screen.tabBarItem
        root.navigationItem.title = screen.navigationItem.title
        return root
    }
}

// MARK: - Grid

/// #973 Home on iPad: products in columns (one per row on iPhone)
enum HomeGrid {
    static let minTileWidth: CGFloat = 300
    static let maxColumns = 4

    static func columns(width: CGFloat) -> Int {
        guard width >= 600 else { return 1 }
        return max(2, min(maxColumns, Int(width / minTileWidth)))
    }

    static func rows(count: Int, columns: Int) -> Int {
        guard count > 0, columns > 0 else { return 0 }
        return (count + columns - 1) / columns
    }

    /// Product indexes shown on grid row `row`
    static func indices(row: Int, columns: Int, count: Int) -> Range<Int> {
        let start = min(row * columns, count)
        return start..<min(start + columns, count)
    }
}

// MARK: - Two panes

/// List on the left, the screen it opens on the right. A push from the list replaces the right pane; a push from
/// the right pane stacks there; "back" on the right pane returns to the empty state.
final class PadSplitViewController: UIViewController {
    let primary: UIViewController
    let primaryNav: PadPrimaryNavigationController
    let secondaryNav: PadSecondaryNavigationController
    private let placeholder: PadPlaceholderViewController
    private let divider = UIView()
    private var primaryWidth: NSLayoutConstraint?

    init(primary: UIViewController, emptyText: String, symbol: String) {
        self.primary = primary
        primaryNav = PadPrimaryNavigationController(rootViewController: primary)
        placeholder = PadPlaceholderViewController(text: emptyText, symbol: symbol)
        secondaryNav = PadSecondaryNavigationController(rootViewController: placeholder)
        super.init(nibName: nil, bundle: nil)
        primaryNav.split = self
        primaryNav.setNavigationBarHidden(true, animated: false)
        secondaryNav.setNavigationBarHidden(true, animated: false)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    /// The screen on the right, nil for the empty state
    var detail: UIViewController? {
        secondaryNav.viewControllers.count > 1 ? secondaryNav.viewControllers.last : nil
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        divider.backgroundColor = DS.Color.border
        for child in [primaryNav, secondaryNav] as [UIViewController] {
            addChildViewController(child)
            child.view.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(child.view)
            child.didMove(toParentViewController: self)
        }
        divider.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(divider)
        let left = primaryNav.view!, right = secondaryNav.view!
        let width = left.widthAnchor.constraint(equalToConstant: PadSplit.primaryWidth(total: view.bounds.width))
        primaryWidth = width
        NSLayoutConstraint.activate([
            left.topAnchor.constraint(equalTo: view.topAnchor),
            left.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            left.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            width,
            divider.topAnchor.constraint(equalTo: view.topAnchor),
            divider.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            divider.leadingAnchor.constraint(equalTo: left.trailingAnchor),
            divider.widthAnchor.constraint(equalToConstant: 1),
            right.topAnchor.constraint(equalTo: view.topAnchor),
            right.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            right.leadingAnchor.constraint(equalTo: divider.trailingAnchor),
            right.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        primaryWidth?.constant = PadSplit.primaryWidth(total: view.bounds.width)
    }

    func showDetail(_ controller: UIViewController) {
        controller.hidesBottomBarWhenPushed = false
        secondaryNav.setViewControllers([placeholder, controller], animated: false)
    }

    func clearDetail() {
        secondaryNav.setViewControllers([placeholder], animated: false)
    }
}

/// The list pane: its pushes open on the right
final class PadPrimaryNavigationController: BaseNavigationController {
    weak var split: PadSplitViewController?

    override func pushViewController(_ viewController: UIViewController, animated: Bool) {
        if let split, !viewControllers.isEmpty {
            split.showDetail(viewController)
            return
        }
        super.pushViewController(viewController, animated: animated)
    }
}

/// The detail pane: the tabs stay visible while screens stack here
final class PadSecondaryNavigationController: BaseNavigationController {
    override func pushViewController(_ viewController: UIViewController, animated: Bool) {
        viewController.hidesBottomBarWhenPushed = false
        super.pushViewController(viewController, animated: animated)
    }
}

/// Empty right pane: icon and "pick something on the left"
final class PadPlaceholderViewController: UIViewController {
    private let text: String
    private let symbol: String

    init(text: String, symbol: String) {
        self.text = text
        self.symbol = symbol
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        view.accessibilityIdentifier = "ipad.split.empty"
        let icon = UIImageView(image: UIImage(systemName: symbol, withConfiguration: UIImage.SymbolConfiguration(pointSize: 40, weight: .light)))
        icon.tintColor = DS.Color.textMuted
        let label = UILabel()
        label.text = text
        label.font = Utils.regularFont(size: DS.TextSize.body)
        label.textColor = DS.Color.textMuted
        label.textAlignment = .center
        label.numberOfLines = 0
        let stack = UIStackView(arrangedSubviews: [icon, label])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stack.widthAnchor.constraint(lessThanOrEqualTo: view.widthAnchor, constant: -64),
        ])
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }
}

// MARK: - Home with the cart

/// Home grid on the left, the cart on the right while it has items. The top-right cart button still opens the full cart.
final class HomeCartSplitViewController: UIViewController {
    let home: ProductsHomeViewController
    private(set) var cartPanel: CartV2ViewController?
    private let divider = UIView()
    private var homeTrailing: NSLayoutConstraint?

    init(home: ProductsHomeViewController) {
        self.home = home
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        addChildViewController(home)
        home.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(home.view)
        home.didMove(toParentViewController: self)
        let trailing = home.view.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        homeTrailing = trailing
        NSLayoutConstraint.activate([
            home.view.topAnchor.constraint(equalTo: view.topAnchor),
            home.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            home.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            trailing,
        ])
        divider.backgroundColor = DS.Color.border
        NotificationCenter.default.addObserver(self, selector: #selector(cartChanged), name: .cartStoreDidChange, object: nil)
        updatePanel()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        updatePanel()
    }

    @objc private func cartChanged() {
        updatePanel()
    }

    private func updatePanel() {
        guard isViewLoaded else { return }
        let show = PadSplit.showsCartPanel(itemCount: CartStore.shared.cart.items.count)
        if show, cartPanel == nil {
            let cart = CartV2ViewController()
            cart.isPanel = true
            addChildViewController(cart)
            cart.view.translatesAutoresizingMaskIntoConstraints = false
            divider.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(divider)
            view.addSubview(cart.view)
            homeTrailing?.isActive = false
            let width = PadSplit.cartPanelWidth(total: view.bounds.width > 0 ? view.bounds.width : UIScreen.main.bounds.width)
            NSLayoutConstraint.activate([
                cart.view.topAnchor.constraint(equalTo: view.topAnchor),
                cart.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
                cart.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                cart.view.widthAnchor.constraint(equalToConstant: width),
                divider.topAnchor.constraint(equalTo: view.topAnchor),
                divider.bottomAnchor.constraint(equalTo: view.bottomAnchor),
                divider.widthAnchor.constraint(equalToConstant: 1),
                divider.trailingAnchor.constraint(equalTo: cart.view.leadingAnchor),
                home.view.trailingAnchor.constraint(equalTo: divider.leadingAnchor),
            ])
            cart.didMove(toParentViewController: self)
            cartPanel = cart
        } else if !show, let cart = cartPanel {
            cart.willMove(toParentViewController: nil)
            cart.view.removeFromSuperview()
            cart.removeFromParentViewController()
            divider.removeFromSuperview()
            homeTrailing?.isActive = true
            cartPanel = nil
        }
    }
}

// MARK: - Old design

/// A screen of the old design (its flag off) in a centered column, so it does not stretch across the iPad
final class PadCenteredViewController: UIViewController {
    let content: UIViewController

    init(content: UIViewController) {
        self.content = content
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        addChildViewController(content)
        content.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(content.view)
        let column = view.readableColumn()
        NSLayoutConstraint.activate([
            content.view.topAnchor.constraint(equalTo: view.topAnchor),
            content.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            content.view.leadingAnchor.constraint(equalTo: column.leadingAnchor),
            content.view.trailingAnchor.constraint(equalTo: column.trailingAnchor),
        ])
        content.didMove(toParentViewController: self)
    }

    /// The old screens put their title and bar buttons on their own navigation item
    override var navigationItem: UINavigationItem { content.navigationItem }
}
