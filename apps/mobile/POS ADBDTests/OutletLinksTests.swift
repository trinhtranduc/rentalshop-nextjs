import XCTest
@testable import POS_ADBD

/// #1643: links of a branch. The same cases as `tests/outlet-links.test.ts` (web / API) and the Android `OutletLinksTest`.
final class OutletLinksTests: XCTestCase {
    private func ok(_ type: OutletLinkType, _ url: String, _ label: String? = nil, file: StaticString = #filePath, line: UInt = #line) -> OutletLink {
        switch OutletLinkLogic.normalize(type: type, url: url, label: label) {
        case .success(let link): return link
        case .failure(let error):
            XCTFail("expected ok, got \(error) for \(url)", file: file, line: line)
            return OutletLink(type: type, url: "")
        }
    }

    private func bad(_ type: OutletLinkType, _ url: String, _ label: String? = nil) -> OutletLinkError? {
        if case .failure(let error) = OutletLinkLogic.normalize(type: type, url: url, label: label) { return error }
        return nil
    }

    func testAddsHttpsLowercasesTheHostTrimsAndDropsABareSlash() {
        XCTAssertEqual(ok(.website, "  Tenshop.VN "), OutletLink(type: .website, url: "https://tenshop.vn"))
        XCTAssertEqual(ok(.website, "http://tenshop.vn/"), OutletLink(type: .website, url: "http://tenshop.vn"))
        XCTAssertEqual(ok(.website, "https://tenshop.vn/dat-lich?x=1").url, "https://tenshop.vn/dat-lich?x=1")
        XCTAssertEqual(ok(.website, "tenshop.vn:8080/x").url, "https://tenshop.vn:8080/x")
    }

    func testRefusesAnythingThatIsNotAUsableHttpAddress() {
        let urls = ["", "   ", "facebook", "javascript:alert(1)", "mailto:a@b.com", "ftp://tenshop.vn", "data:text/html,hi",
                    "https://user:pw@tenshop.vn", "https://.vn", "ht tp://x.vn", "https://tenshop.vn/" + String(repeating: "a", count: 300)]
        for url in urls { XCTAssertEqual(bad(.website, url), .invalid, url) }
    }

    func testEachNetworkAcceptsItsOwnHostsAndRefusesOthers() {
        XCTAssertEqual(ok(.facebook, "www.facebook.com/tenshop").url, "https://www.facebook.com/tenshop")
        XCTAssertEqual(ok(.facebook, "fb.me/tenshop").type, .facebook)
        XCTAssertEqual(ok(.instagram, "instagram.com/tenshop").type, .instagram)
        XCTAssertEqual(ok(.tiktok, "https://www.tiktok.com/@tenshop").type, .tiktok)
        XCTAssertEqual(ok(.youtube, "youtu.be/abc").type, .youtube)
        XCTAssertEqual(ok(.zalo, "https://zalo.me/0901234567").url, "https://zalo.me/0901234567")
        XCTAssertEqual(ok(.facebook, "https://m.facebook.com/tenshop").type, .facebook)
        XCTAssertEqual(bad(.instagram, "tiktok.com/@tenshop"), .platform)
        XCTAssertEqual(bad(.facebook, "notfacebook.com/x"), .platform)
        XCTAssertEqual(bad(.zalo, "https://evilzalo.me/1"), .platform)
        XCTAssertEqual(bad(.tiktok, "https://tiktok.com.evil.vn/x"), .platform)
    }

    func testWebsiteAndOtherTakeAnyHostOtherNeedsAName() {
        XCTAssertEqual(ok(.website, "https://shopee.vn/tenshop").type, .website)
        XCTAssertEqual(ok(.other, "https://shopee.vn/tenshop", " Shopee "), OutletLink(type: .other, url: "https://shopee.vn/tenshop", label: "Shopee"))
        XCTAssertEqual(bad(.other, "https://shopee.vn/x"), .labelRequired)
        XCTAssertEqual(bad(.other, "https://shopee.vn/x", "   "), .labelRequired)
        XCTAssertEqual(bad(.other, "https://shopee.vn/x", String(repeating: "x", count: 31)), .labelTooLong)
        XCTAssertEqual(ok(.other, "https://shopee.vn/x", String(repeating: "x", count: 30)).label?.count, 30)
        // a name on any other type is ignored, never stored
        XCTAssertEqual(ok(.website, "https://a.vn", "ignored"), OutletLink(type: .website, url: "https://a.vn"))
    }

    // MARK: - A whole list

    private func entry(_ type: String, _ url: String) -> OutletLinkEntry { OutletLinkEntry(type: type, url: url, label: nil) }

    func testListNormalisesEachAndDropsExactRepeats() {
        let result = OutletLinkLogic.normalizeList([entry("website", "a.vn"), entry("website", "https://a.vn/"), entry("instagram", "instagram.com/a")])
        XCTAssertEqual(result, .ok([OutletLink(type: .website, url: "https://a.vn"), OutletLink(type: .instagram, url: "https://instagram.com/a")]))
        XCTAssertEqual(OutletLinkLogic.normalizeList([]), .ok([]), "an empty list clears")
    }

    func testSixLinksPassSevenDoNotAndRepeatsDoNotCount() {
        let six = (0..<6).map { entry("website", "https://s\($0).vn") }
        if case .ok(let links) = OutletLinkLogic.normalizeList(six) { XCTAssertEqual(links.count, 6) } else { XCTFail("six pass") }
        XCTAssertEqual(OutletLinkLogic.normalizeList(six + [entry("website", "https://s9.vn")]), .tooMany)
        let same = (0..<8).map { _ in entry("website", "https://same.vn") }
        XCTAssertEqual(OutletLinkLogic.normalizeList(same), .ok([OutletLink(type: .website, url: "https://same.vn")]))
    }

    func testListNamesTheBadRowAndWhy() {
        XCTAssertEqual(OutletLinkLogic.normalizeList([entry("website", "a.vn"), entry("facebook", "facebook")]), .invalid(index: 1, reason: .invalid))
        XCTAssertEqual(OutletLinkLogic.normalizeList([entry("instagram", "tiktok.com/@a")]), .invalid(index: 0, reason: .platform))
        XCTAssertEqual(OutletLinkLogic.normalizeList([entry("mastodon", "a.vn")]), .invalid(index: 0, reason: .invalid))
    }

    // MARK: - Reading what the API sent

    func testStoredLinksNilIsNoLinksAndBadOnesAreDropped() {
        XCTAssertEqual(OutletLinkLogic.parseStored(nil), [])
        let stored = [
            entry("website", "https://a.vn"),
            entry("website", "javascript:alert(1)"),
            entry("instagram", "https://tiktok.com/@a"),
            entry("nope", "https://a.vn"),
            entry("zalo", "zalo.me/0901234567"),
        ]
        XCTAssertEqual(OutletLinkLogic.parseStored(stored), [OutletLink(type: .website, url: "https://a.vn"), OutletLink(type: .zalo, url: "https://zalo.me/0901234567")])
    }

    func testStoredLinksNeverMoreThanSix() {
        let stored = (0..<10).map { entry("website", "https://s\($0).vn") }
        XCTAssertEqual(OutletLinkLogic.parseStored(stored).count, 6)
    }

    // MARK: - The Outlet payload and the PUT body

    func testOutletDecodesWithAndWithoutLinks() throws {
        let old = try JSONDecoder.shared.decode(Outlet.self, from: Data(#"{"id":7,"name":"Q1","address":"12 Lê Lợi"}"#.utf8))
        XCTAssertNil(old.links, "an older API sends none: unknown, not empty")
        let new = try JSONDecoder.shared.decode(Outlet.self, from: Data(#"{"id":7,"name":"Q1","links":[{"type":"zalo","url":"https://zalo.me/1"},{"type":"other","url":"https://shopee.vn/a","label":"Shopee"}]}"#.utf8))
        XCTAssertEqual(new.links, [OutletLinkEntry(type: "zalo", url: "https://zalo.me/1", label: nil), OutletLinkEntry(type: "other", url: "https://shopee.vn/a", label: "Shopee")])
        let empty = try JSONDecoder.shared.decode(Outlet.self, from: Data(#"{"id":7,"name":"Q1","links":[]}"#.utf8))
        XCTAssertEqual(empty.links, [])
    }

    func testPayloadItemsHaveTypeUrlAndLabelOnlyForOther() {
        let payload = OutletLinkLogic.payload([OutletLink(type: .tiktok, url: "https://tiktok.com/@a"), OutletLink(type: .other, url: "https://shopee.vn/a", label: "Shopee")])
        XCTAssertEqual(payload.count, 2)
        XCTAssertEqual(Set(payload[0].keys), ["type", "url"])
        XCTAssertEqual(payload[0]["type"] as? String, "tiktok")
        XCTAssertEqual(Set(payload[1].keys), ["type", "url", "label"])
        XCTAssertEqual(payload[1]["label"] as? String, "Shopee")
    }

    func testBrandNamesAreConstantsWebsiteAndOtherAreNot() {
        XCTAssertEqual(OutletLinkType.allCases.compactMap(OutletLinkLogic.brandName), ["Facebook", "Instagram", "TikTok", "YouTube", "Zalo"])
        XCTAssertNil(OutletLinkLogic.brandName(.website))
        XCTAssertNil(OutletLinkLogic.brandName(.other))
    }
}
