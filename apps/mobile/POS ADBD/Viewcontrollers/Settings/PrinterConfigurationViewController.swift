import UIKit
import SnapKit

/// Network thermal printer (ESC/POS over TCP). Form layout so IP and notes
/// can actually be typed — the old table accessoryView clipped the field.
class PrinterConfigurationViewController: BaseViewControler {
    /// #459: new style, set by Settings v2 before the page is shown
    var v2 = false

    private lazy var scrollView: UIScrollView = {
        let scrollView = UIScrollView()
        scrollView.keyboardDismissMode = .interactive
        scrollView.alwaysBounceVertical = true
        return scrollView
    }()

    private lazy var containerView = UIView()

    private lazy var hintLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14)
        label.textColor = .textSecondary
        label.numberOfLines = 0
        label.text = "Configure network thermal printer (ESC/POS). Enter the printer IP, then save and run a test print.".localized()
        return label
    }()

    private lazy var ipField: LabeledTextField = {
        let field = LabeledTextField(
            title: "IP Address".localized(),
            placeholder: "Enter printer IP address".localized()
        )
        field.titleLabel.isHidden = true
        field.textField.keyboardType = PrinterSetup.ipKeyboardType // #1028: has "." in Vietnamese
        field.textField.returnKeyType = .done
        field.textField.delegate = self
        field.textField.autocorrectionType = .no
        field.textField.autocapitalizationType = .none
        field.textField.spellCheckingType = .no
        field.textField.addTarget(self, action: #selector(ipChanged), for: .editingChanged)
        return field
    }()

    private lazy var noteTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16)
        label.textColor = .textPrimary
        label.text = "Printer Notes".localized()
        return label
    }()

    private lazy var noteTextView: UITextView = {
        let textView = UITextView()
        textView.font = Utils.regularFont(size: 16)
        textView.textColor = .textPrimary
        textView.backgroundColor = .clear
        textView.delegate = self
        textView.textContainerInset = UIEdgeInsets(top: 4, left: 0, bottom: 4, right: 0)
        textView.isScrollEnabled = true
        return textView
    }()

    /// #622: print the outlet's bank account + VietQR at the end of bills (this device only)
    private lazy var bankQrSwitch: UISwitch = {
        let toggle = UISwitch()
        toggle.onTintColor = APP_TONE_COLOR
        toggle.accessibilityLabel = "printer.bankQr.title".localized()
        toggle.accessibilityIdentifier = "printer.bankQr.switch"
        toggle.addTarget(self, action: #selector(bankQrChanged), for: .valueChanged)
        return toggle
    }()

    // MARK: - #1308 bill settings of the branch (server)

    private var canEditBill = OutletPrintSettings.canEdit(role: User.current()?.role)
    private var branches: [Outlet] = []
    private var outletId: Int?
    private var billLoaded = false
    /// What the server has, to save the note only when it changed
    private var serverNote = ""

    private lazy var branchButton: UIButton = {
        let button = UIButton(type: .system)
        button.titleLabel?.font = Utils.boldFont(size: 16)
        button.contentHorizontalAlignment = .leading
        button.isHidden = true
        button.accessibilityIdentifier = "printer.branch.button"
        button.addTarget(self, action: #selector(chooseBranch), for: .touchUpInside)
        return button
    }()

    private lazy var readOnlyLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14)
        label.textColor = .textSecondary
        label.numberOfLines = 0
        label.text = "printer.outlet.readonly".localized()
        label.isHidden = canEditBill
        return label
    }()

    private lazy var supportLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .accentOrange
        label.numberOfLines = 0
        label.text = "*** Compatible with thermal receipt printers supporting ESC/POS commands.".localized()
        return label
    }()

    private lazy var testButton: RCPrimaryButton = {
        let button = RCPrimaryButton(
            title: "Test Printer".localized(),
            borderStyle: true,
            borderColor: APP_TONE_COLOR
        )
        button.addTarget(self, action: #selector(testPrinter), for: .touchUpInside)
        return button
    }()

    private lazy var saveButton: RCPrimaryButton = {
        let button = RCPrimaryButton(
            title: "Save".localized(),
            backgroundColor: APP_TONE_COLOR
        )
        button.addTarget(self, action: #selector(save), for: .touchUpInside)
        return button
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        if !v2 {
            setupNavigationBar()
        }
        setupUI()
        loadCurrentConfig()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func setupUI() {
        if v2 {
            setupV2UI()
            return
        }
        view.backgroundColor = .backgroundPrimary

        let tap = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        tap.cancelsTouchesInView = false
        view.addGestureRecognizer(tap)

        guard let customNavBar = customNavBar else { return }

        view.addSubview(scrollView)
        view.addSubview(testButton)
        view.addSubview(saveButton)
        scrollView.addSubview(containerView)

        let settingsCard = makeCard()
        let ipRow = makeValueRow(title: "IP Address".localized(), field: ipField)
        let noteBlock = makeNoteBlock()
        let bankQrRow = makeBankQrRow()
        bankQrRow.layoutMargins = UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16)
        bankQrRow.isLayoutMarginsRelativeArrangement = true
        let settingsStack = UIStackView(arrangedSubviews: [ipRow, makeSeparator(), noteBlock, makeSeparator(), bankQrRow])
        settingsStack.axis = .vertical
        settingsStack.spacing = 0
        settingsCard.addSubview(settingsStack)
        settingsStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        let stack = UIStackView(arrangedSubviews: [hintLabel, branchButton, readOnlyLabel, settingsCard, supportLabel])
        stack.axis = .vertical
        stack.spacing = 16
        containerView.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }

        saveButton.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(20)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-12)
            make.height.equalTo(50)
        }
        testButton.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(20)
            make.bottom.equalTo(saveButton.snp.top).offset(-10)
            make.height.equalTo(50)
        }
        scrollView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(testButton.snp.top).offset(-16)
        }
        containerView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 16, left: 16, bottom: 24, right: 16))
            make.width.equalTo(scrollView).offset(-32)
        }
    }

    /// v2: ‹ header, labelled IP and note fields, Kiểm tra máy in + Lưu at the bottom (same actions)
    private func setupV2UI() {
        view.backgroundColor = .white
        let tap = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        tap.cancelsTouchesInView = false
        view.addGestureRecognizer(tap)

        let back = SettingsDetailV2.backButton()
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        let line = SettingsDetailV2.installHeader(on: view, title: "settings.v2.printing".localized(), back: back) // #1270: In & phiếu

        let test = V2.secondaryButton("Test Printer".localized())
        test.contentEdgeInsets = UIEdgeInsets(top: 0, left: 20, bottom: 0, right: 20)
        test.setContentHuggingPriority(.required, for: .horizontal)
        test.addTarget(self, action: #selector(testPrinter), for: .touchUpInside)
        let save = V2.primaryButton("Save".localized())
        save.addTarget(self, action: #selector(self.save), for: .touchUpInside)
        let bar = SettingsDetailV2.installBottomBar(on: view, buttons: [test, save])

        hintLabel.font = Utils.regularFont(size: DS.TextSize.secondary)
        hintLabel.textColor = DS.Color.textMuted
        supportLabel.font = Utils.regularFont(size: DS.TextSize.secondary)
        supportLabel.textColor = V2.warn
        noteTextView.isScrollEnabled = true
        // #1270 plan B: two sections, PHIẾU (the printed note) and MÁY IN (IP, test print)
        func sectionTitle(_ key: String) -> UILabel {
            let label = V2.label(key.localized().uppercased(), size: DS.TextSize.secondary, weight: .bold, color: DS.Color.textMuted)
            label.accessibilityTraits = UIAccessibilityTraitHeader
            return label
        }
        let form = UIStackView(arrangedSubviews: [
            sectionTitle("settings.v2.printing.group.slip"),
            branchButton,
            SettingsDetailV2.textArea("Printer Notes".localized(), noteTextView),
            makeBankQrRow(),
            readOnlyLabel,
            sectionTitle("settings.v2.printing.group.printer"),
            hintLabel,
            SettingsDetailV2.field("IP Address".localized(), ipField.textField),
            supportLabel,
        ])
        form.axis = .vertical
        form.spacing = 16

        view.addSubview(scrollView)
        scrollView.addSubview(form)
        scrollView.snp.makeConstraints { make in
            make.top.equalTo(line.snp.bottom)
            make.leading.trailing.equalTo(view.readableColumn()) // #973 centered column on iPad
            make.bottom.equalTo(bar.snp.top)
        }
        form.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(16)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalToSuperview().offset(-16)
            make.width.equalToSuperview().offset(-2 * DS.Spacing.lg)
        }
    }

    @objc private func backTapped() {
        navigationController?.popViewController(animated: true)
    }

    private func setupNavigationBar() {
        setupCustomNavigationBar(
            title: "Printer Configuration".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .pop
        )
    }

    private func loadCurrentConfig() {
        ipField.textField.text = Utils.loadBillPrinter()
        applyBillEditable()
        loadBranches()
    }

    /// The note and the QR switch follow the role, and wait for the server values
    private func applyBillEditable() {
        let on = canEditBill && billLoaded
        noteTextView.isEditable = on
        noteTextView.alpha = canEditBill ? 1 : 0.6
        bankQrSwitch.isEnabled = on
    }

    private func loadBranches() {
        OutletService.shared.getOutlets { [weak self] outlets, error in
            guard let self else { return }
            guard error == nil else { return self.showAlert(message: "printer.outlet.loadFailed".localized()) }
            self.branches = (outlets ?? []).filter { $0.isActive ?? true }
            let list = self.branches.map { (id: $0.id, isDefault: $0.isDefault ?? false) }
            guard let id = OutletPrintSettings.initialOutletId(own: User.account()?.outletId, current: CurrentOutlet.shared.id, outlets: list) else { return }
            self.showBranch(id)
        }
    }

    /// Fills the note and the switch from the branch's server values (the owner gets the old device note once, unsaved)
    private func showBranch(_ id: Int) {
        outletId = id
        guard let outlet = branches.first(where: { $0.id == id }) else { return }
        serverNote = outlet.printNote ?? ""
        noteTextView.text = OutletPrintSettings.prefillNote(serverNote: outlet.printNote, legacyNote: OutletPrintSettings.legacyDeviceNote, canEdit: canEditBill)
        bankQrSwitch.isOn = OutletPrintSettings.printsBankQr(outlet.printBankQr)
        billLoaded = true
        applyBillEditable()
        // the picker only for an owner with more than one branch
        branchButton.isHidden = !(canEditBill && branches.count > 1)
        branchButton.setTitle("\("printer.outlet.branch".localized()): \(outlet.name) ▾", for: .normal)
    }

    @objc private func chooseBranch() {
        let sheet = UIAlertController(title: "printer.outlet.branch".localized(), message: nil, preferredStyle: .actionSheet)
        for outlet in branches {
            let action = UIAlertAction(title: outlet.name, style: .default) { [weak self] _ in self?.showBranch(outlet.id) }
            action.setValue(outlet.id == outletId, forKey: "checked")
            sheet.addAction(action)
        }
        sheet.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        sheet.popoverPresentationController?.anchor(to: branchButton, fallback: view)
        present(sheet, animated: true)
    }

    /// Saves the branch's note (when asked) and QR switch with `PUT /api/outlets`; a failure shows the error and
    /// puts the server values back
    private func saveBill(withNote: Bool, completion: ((Bool) -> Void)? = nil) {
        guard canEditBill, billLoaded, let id = outletId else { completion?(true); return }
        var values: [String: Any] = ["printBankQr": bankQrSwitch.isOn]
        if withNote { values["printNote"] = noteTextView.text ?? "" }
        OutletService.shared.updateOutlet(outletId: id, withValues: values) { [weak self] outlet, error in
            guard let self else { return }
            if let error {
                UIAlertController.errorAlert(parent: self, error: error)
                self.loadBranches()
                completion?(false)
                return
            }
            if let index = self.branches.firstIndex(where: { $0.id == id }) {
                self.branches[index].printBankQr = self.bankQrSwitch.isOn
                if withNote { self.branches[index].printNote = OutletPrintSettings.note(serverNote: self.noteTextView.text) }
            }
            if withNote { self.serverNote = OutletPrintSettings.note(serverNote: self.noteTextView.text) ?? "" }
            OutletPrintSettings.clearLegacyDeviceValues(includingNote: withNote)
            completion?(true)
        }
    }

    /// "In QR chuyển khoản trên bill" + one-line hint, switch on the right
    private func makeBankQrRow() -> UIStackView {
        let title = UILabel()
        title.font = Utils.boldFont(size: 16)
        title.textColor = .textPrimary
        title.numberOfLines = 0
        title.text = "printer.bankQr.title".localized()
        let hint = UILabel()
        hint.font = Utils.regularFont(size: 14)
        hint.textColor = .textSecondary
        hint.numberOfLines = 0
        hint.text = "printer.bankQr.hint".localized()
        let texts = UIStackView(arrangedSubviews: [title, hint])
        texts.axis = .vertical
        texts.spacing = 2
        bankQrSwitch.setContentCompressionResistancePriority(.required, for: .horizontal)
        bankQrSwitch.setContentHuggingPriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [texts, bankQrSwitch])
        row.spacing = 12
        row.alignment = .center
        return row
    }

    @objc private func bankQrChanged() {
        saveBill(withNote: false)
    }

    private func makeCard() -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 12
        card.layer.borderWidth = 0.5
        card.layer.borderColor = UIColor.separator.withAlphaComponent(0.25).cgColor
        return card
    }

    private func makeSeparator() -> UIView {
        let separator = UIView()
        separator.backgroundColor = UIColor.separator.withAlphaComponent(0.25)
        separator.snp.makeConstraints { make in
            make.height.equalTo(0.5)
        }
        return separator
    }

    private func makeValueRow(title: String, field: LabeledTextField) -> UIView {
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = Utils.regularFont(size: 16)
        titleLabel.textColor = .textPrimary
        titleLabel.setContentHuggingPriority(.required, for: .horizontal)

        let valueField = field.textField
        valueField.font = Utils.regularFont(size: 16)
        valueField.textAlignment = .right
        valueField.layer.borderWidth = 0
        valueField.backgroundColor = .clear
        valueField.leftView = nil
        valueField.leftViewMode = .never
        valueField.rightView = nil
        valueField.rightViewMode = .never

        let row = UIStackView(arrangedSubviews: [titleLabel, valueField])
        row.axis = .horizontal
        row.spacing = 12
        row.alignment = .center

        let wrapper = UIView()
        wrapper.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16))
            make.height.greaterThanOrEqualTo(44)
        }
        return wrapper
    }

    private func makeNoteBlock() -> UIView {
        let wrapper = UIView()
        wrapper.addSubview(noteTitleLabel)
        wrapper.addSubview(noteTextView)
        noteTitleLabel.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview().inset(16)
        }
        noteTextView.snp.makeConstraints { make in
            make.top.equalTo(noteTitleLabel.snp.bottom).offset(8)
            make.leading.trailing.equalToSuperview().inset(12)
            make.bottom.equalToSuperview().offset(-12)
            make.height.equalTo(120)
        }
        return wrapper
    }

    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }

    @objc private func save() {
        view.endEditing(true)
        persistConfig()
        saveBill(withNote: true) { [weak self] ok in
            if ok { self?.showAlert(message: "Configuration saved successfully".localized(), isError: false) }
        }
    }

    /// #1028: "," → ".", no spaces, as it is typed
    @objc private func ipChanged() {
        let text = ipField.textField.text ?? ""
        let normalized = PrinterSetup.normalizedIP(text)
        if normalized != text { ipField.textField.text = normalized }
    }

    private func persistConfig() {
        Utils.saveBillPrinter(ip: PrinterSetup.normalizedIP(ipField.textField.text ?? ""))
        Utils.savePrintMethod(method: "network")
    }

    @objc private func testPrinter() {
        persistConfig()
        let ipAddress = PrinterSetup.normalizedIP(ipField.textField.text ?? "")
        guard !ipAddress.isEmpty else {
            showAlert(message: "Please enter printer IP address".localized())
            return
        }

        let ipRegex = "^([0-9]{1,3}\\.){3}[0-9]{1,3}$"
        let ipPredicate = NSPredicate(format: "SELF MATCHES %@", ipRegex)
        guard ipPredicate.evaluate(with: ipAddress) else {
            showAlert(message: "Invalid IP address format".localized())
            return
        }

        // #970: a progress HUD while sending (an alert here hid the result alert), then one result alert
        testButton.isEnabled = false
        showProgressText(text: "Connecting to printer and sending test print...".localized())
        PrinterManager.shared.testPrintWithConnection(ip: ipAddress, port: 9100) { [weak self] result in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                self.testButton.isEnabled = true
                switch result {
                case .success:
                    self.showAlert(message: "Test print sent successfully! Check your printer.".localized(), isError: false)
                case .failure(let error):
                    self.showAlert(message: PrinterSetup.failureMessage(error, ip: ipAddress))
                }
            }
        }
    }

    private func showAlert(message: String, isError: Bool = true) {
        let alert = UIAlertController(
            title: isError ? "Error".localized() : nil,
            message: message.localized(),
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        present(alert, animated: true)
    }
}

extension PrinterConfigurationViewController: UITextFieldDelegate {
    func textFieldDidEndEditing(_ textField: UITextField) {
        persistConfig()
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }
}

extension PrinterConfigurationViewController: UITextViewDelegate {
    func textViewDidEndEditing(_ textView: UITextView) {
        // #1308: the note belongs to the branch on the server; saved when it changed
        if canEditBill, billLoaded, (textView.text ?? "") != serverNote { saveBill(withNote: true) }
    }
}
