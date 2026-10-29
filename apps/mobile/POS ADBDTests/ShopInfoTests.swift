import XCTest
@testable import POS_ADBD

/// #1313: the owner edits the shop and each branch on the phone; the branch manager edits own branch; staff only view.
/// Same cases in the Android `ShopInfoLogicTest`.
final class ShopInfoTests: XCTestCase {
    func testRowTitleFollowsRole() {
        XCTAssertEqual(ShopInfoLogic.rowTitleKey(role: .merchant), "Store Information")
        for role in [Role.outletAdmin, .outletStaff, .outletInventory] {
            XCTAssertEqual(ShopInfoLogic.rowTitleKey(role: role), "Branch Information")
        }
    }

    func testDestinationByRole() {
        XCTAssertEqual(ShopInfoLogic.destination(role: .merchant), .shopAndBranches)
        XCTAssertEqual(ShopInfoLogic.destination(role: .outletAdmin), .ownBranch(editable: true))
        XCTAssertEqual(ShopInfoLogic.destination(role: .outletStaff), .ownBranch(editable: false))
        XCTAssertEqual(ShopInfoLogic.destination(role: .outletInventory), .ownBranch(editable: false))
        XCTAssertEqual(ShopInfoLogic.destination(role: nil), .ownBranch(editable: false))
    }

    func testOnlyOwnerEditsShop() {
        XCTAssertTrue(ShopInfoLogic.canEditShop(role: .merchant))
        for role in [Role.outletAdmin, .outletStaff, .outletInventory, .admin] {
            XCTAssertFalse(ShopInfoLogic.canEditShop(role: role))
        }
        XCTAssertFalse(ShopInfoLogic.canEditShop(role: nil))
    }

    func testWhoEditsWhichBranch() {
        XCTAssertTrue(ShopInfoLogic.canEditBranch(role: .merchant, branchId: 5, ownBranchId: nil))
        XCTAssertTrue(ShopInfoLogic.canEditBranch(role: .outletAdmin, branchId: 5, ownBranchId: 5))
        XCTAssertFalse(ShopInfoLogic.canEditBranch(role: .outletAdmin, branchId: 6, ownBranchId: 5))
        XCTAssertFalse(ShopInfoLogic.canEditBranch(role: .outletAdmin, branchId: 5, ownBranchId: nil))
        XCTAssertFalse(ShopInfoLogic.canEditBranch(role: .outletStaff, branchId: 5, ownBranchId: 5))
        XCTAssertFalse(ShopInfoLogic.canEditBranch(role: .outletInventory, branchId: 5, ownBranchId: 5))
    }

    func testAddressLineJoinsStreetDistrictCity() {
        XCTAssertEqual(ShopInfoLogic.addressLine(address: "12 Đường Số 1", state: "P. Tân Phú, Quận 7", city: "TP. Hồ Chí Minh"),
                       "12 Đường Số 1, P. Tân Phú, Quận 7, TP. Hồ Chí Minh")
    }

    func testAddressLineSkipsEmptyAndRepeatedParts() {
        XCTAssertEqual(ShopInfoLogic.addressLine(address: " 12 Lê Lợi ", state: nil, city: "Hà Nội"), "12 Lê Lợi, Hà Nội")
        XCTAssertEqual(ShopInfoLogic.addressLine(address: "Hà Nội", state: "", city: "Hà Nội"), "Hà Nội")
        XCTAssertEqual(ShopInfoLogic.addressLine(address: nil, state: nil, city: nil), "")
    }

    func testShopSummaryPhoneAndTaxId() {
        XCTAssertEqual(ShopInfoLogic.shopSummary(phone: "0900 000 001", taxId: "0123456789", taxIdLabel: "MST"),
                       "0900 000 001 · MST 0123456789")
        XCTAssertEqual(ShopInfoLogic.shopSummary(phone: "0900 000 001", taxId: " ", taxIdLabel: "MST"), "0900 000 001")
        XCTAssertEqual(ShopInfoLogic.shopSummary(phone: nil, taxId: "0123", taxIdLabel: "MST"), "MST 0123")
        XCTAssertEqual(ShopInfoLogic.shopSummary(phone: nil, taxId: nil, taxIdLabel: "MST"), "")
    }

    func testShopNeedsAName() {
        var form = ShopFormValues(name: "  ")
        XCTAssertEqual(ShopInfoLogic.problem(shop: form), .nameRequired)
        form.name = "Áo dài Hoa Sen"
        XCTAssertNil(ShopInfoLogic.problem(shop: form))
    }

    func testBranchNeedsNameThenAddress() {
        var form = BranchFormValues(name: "", phone: "0900", address: "")
        XCTAssertEqual(ShopInfoLogic.problem(branch: form), .nameRequired)
        form.name = "Quận 7"
        XCTAssertEqual(ShopInfoLogic.problem(branch: form), .addressRequired)
        form.address = "  "
        XCTAssertEqual(ShopInfoLogic.problem(branch: form), .addressRequired)
        form.address = "12 Đường Số 1"
        XCTAssertNil(ShopInfoLogic.problem(branch: form))
    }

    func testShopPayloadHasTheMockupFieldsAndNoWebsite() {
        let form = ShopFormValues(name: " Hoa Sen ", phone: "0900 000 001 ", taxId: "0123456789", address: "12 Đường Số 1",
                                  state: "P. Tân Phú, Quận 7", city: "TP. Hồ Chí Minh", country: "Việt Nam", zipCode: "", description: " Áo dài ")
        let payload = ShopInfoLogic.shopPayload(form)
        XCTAssertEqual(Set(payload.keys), ["name", "phone", "taxId", "address", "state", "city", "country", "zipCode", "description"])
        XCTAssertEqual(payload["name"] as? String, "Hoa Sen")
        XCTAssertEqual(payload["phone"] as? String, "0900 000 001")
        XCTAssertEqual(payload["zipCode"] as? String, "")
        XCTAssertEqual(payload["description"] as? String, "Áo dài")
        XCTAssertNil(payload["website"])
    }

    func testBranchPayloadIsNameAddressPhone() {
        let payload = ShopInfoLogic.branchPayload(BranchFormValues(name: " Thủ Đức ", phone: " 0900 000 102", address: "45 Đường Số 9 "))
        XCTAssertEqual(Set(payload.keys), ["name", "phone", "address"])
        XCTAssertEqual(payload["name"] as? String, "Thủ Đức")
        XCTAssertEqual(payload["phone"] as? String, "0900 000 102")
        XCTAssertEqual(payload["address"] as? String, "45 Đường Số 9")
    }

    func testBranchListHidesClosedBranchesAndPutsDefaultFirst() {
        let rows = ShopInfoLogic.branchRows([
            BranchRow(id: 2, name: "B", isActive: true, isDefault: false),
            BranchRow(id: 3, name: "C", isActive: false, isDefault: false),
            BranchRow(id: 1, name: "A", isActive: true, isDefault: true),
            BranchRow(id: 4, name: "D", isActive: nil, isDefault: nil),
        ])
        XCTAssertEqual(rows.map(\.id), [1, 2, 4])
    }

    func testSettingsRowValueByRole() {
        func value(_ role: Role?, name: String? = "Hoa Sen · Quận 7", count: Int? = 3) -> String? {
            ShopInfoLogic.rowValue(role: role, branchName: name, branchCount: count, countText: { "\($0) chi nhánh" }, readOnlyText: "Chỉ xem")
        }
        XCTAssertEqual(value(.merchant), "3 chi nhánh")
        XCTAssertNil(value(.merchant, count: nil))
        XCTAssertEqual(value(.outletAdmin), "Hoa Sen · Quận 7")
        XCTAssertNil(value(.outletAdmin, name: " "))
        XCTAssertEqual(value(.outletStaff), "Chỉ xem")
        XCTAssertEqual(value(.outletInventory), "Chỉ xem")
    }
}
