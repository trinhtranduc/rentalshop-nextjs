#!/usr/bin/env python3
"""#1375: wire the "Việc cần làm" widget into the Xcode project (idempotent).

Adds the new Swift files to the app, the unit tests, the DraftOrderActivity static library and the AnyRentLiveActivity
widget extension, the extension entitlements file, and the App Group build settings (APP_GROUP_ID per configuration).
It does not touch signing, the team or any provisioning setting.

    python3 scripts/patch_today_widget_pbxproj.py            # everything
    python3 scripts/patch_today_widget_pbxproj.py tests      # only the unit test files
"""
import hashlib
import re
import sys
from pathlib import Path

PBX = Path(__file__).resolve().parents[1] / "POS ADBD.xcodeproj" / "project.pbxproj"
text = PBX.read_text()
only = sys.argv[1] if len(sys.argv) > 1 else "all"


def new_id(seed):
    """A stable 24-hex id per name, so a second run (or `tests` then `all`) never collides"""
    return "A1375F" + hashlib.md5(seed.encode()).hexdigest()[:18].upper()


def add_file(sibling, name, kind="sourcecode.swift", in_sources=True):
    """Add `name` next to `sibling`: same group, same Sources phase."""
    global text
    if re.search(r"/\* %s \*/ = \{isa = PBXFileReference" % re.escape(name), text):
        print("skip (exists):", name)
        return
    ref_match = re.search(r"\t\t(\w+) /\* %s \*/ = \{isa = PBXFileReference" % re.escape(sibling), text)
    assert ref_match, "no file reference for sibling " + sibling
    sibling_ref = ref_match.group(1)
    ref, build = new_id("ref " + name), new_id("build " + name)
    ref_line = ('\t\t%s /* %s */ = {isa = PBXFileReference; lastKnownFileType = %s; path = %s; sourceTree = "<group>"; };\n'
                % (ref, name, kind, name))
    text = text.replace("/* Begin PBXFileReference section */\n", "/* Begin PBXFileReference section */\n" + ref_line, 1)
    # group: right after the sibling's line (the one without "in Sources")
    group_line = "\t\t\t\t%s /* %s */,\n" % (sibling_ref, sibling)
    assert text.count(group_line) == 1, "sibling %s is in %d groups" % (sibling, text.count(group_line))
    text = text.replace(group_line, group_line + "\t\t\t\t%s /* %s */,\n" % (ref, name), 1)
    if not in_sources:
        return
    build_match = re.search(r"\t\t(\w+) /\* %s in Sources \*/ = \{isa = PBXBuildFile; fileRef = %s " % (re.escape(sibling), sibling_ref), text)
    assert build_match, "no build file for sibling " + sibling
    sibling_build = build_match.group(1)
    build_line = "\t\t%s /* %s in Sources */ = {isa = PBXBuildFile; fileRef = %s /* %s */; };\n" % (build, name, ref, name)
    text = text.replace("/* Begin PBXBuildFile section */\n", "/* Begin PBXBuildFile section */\n" + build_line, 1)
    phase_line = "\t\t\t\t%s /* %s in Sources */,\n" % (sibling_build, sibling)
    assert text.count(phase_line) == 1, "sibling %s is in %d Sources phases" % (sibling, text.count(phase_line))
    text = text.replace(phase_line, phase_line + "\t\t\t\t%s /* %s in Sources */,\n" % (build, name), 1)
    print("added:", name)


def also_compile(name, after_name):
    """Compile an existing file in one more target: a second build file in the same Sources phase as `after_name`
    (the extension compiles the shared widget files itself, like it already does for DraftOrderAttributes.swift)"""
    global text
    ref = re.search(r"\t\t(\w+) /\* %s \*/ = \{isa = PBXFileReference" % re.escape(name), text).group(1)
    anchor = re.search(r"\t\t(\w+) /\* %s in Sources \*/ = \{isa = PBXBuildFile" % re.escape(after_name), text).group(1)
    build = new_id("extension build " + name)
    if build in text:
        print("skip (exists): extension", name)
        return
    text = text.replace("/* Begin PBXBuildFile section */\n",
                        "/* Begin PBXBuildFile section */\n\t\t%s /* %s in Sources */ = {isa = PBXBuildFile; fileRef = %s /* %s */; };\n"
                        % (build, name, ref, name), 1)
    phase_line = "\t\t\t\t%s /* %s in Sources */,\n" % (anchor, after_name)
    assert text.count(phase_line) == 1
    text = text.replace(phase_line, phase_line + "\t\t\t\t%s /* %s in Sources */,\n" % (build, name), 1)
    print("also compiled in the extension:", name)


def add_setting(block_id, line, after=None):
    """Put a build setting into the XCBuildConfiguration `block_id` (once)."""
    global text
    start = text.index("\t\t%s /* " % block_id)
    settings = text.index("buildSettings = {\n", start) + len("buildSettings = {\n")
    end = text.index("\t\t\t};\n", settings)
    block = text[settings:end]
    key = line.split(" = ")[0].strip()
    if re.search(r"^\t\t\t\t%s = " % re.escape(key), block, re.M):
        print("skip (exists):", key, block_id)
        return
    if after and ("\t\t\t\t%s = " % after) in block:
        anchor = re.search(r"^\t\t\t\t%s = .*\n" % re.escape(after), block, re.M)
        insert_at = settings + anchor.end()
    else:
        insert_at = settings
    text = text[:insert_at] + "\t\t\t\t" + line + "\n" + text[insert_at:]
    print("setting:", key, "->", block_id)


# Unit tests
add_file("HandOverCollateralTests.swift", "TodayWidgetDisplayTests.swift")
add_file("HandOverCollateralTests.swift", "TodayWidgetDataTests.swift")

if only == "all":
    # DraftOrderActivity static library (Swift 5, shared by the app and the extension)
    for name in ("TodayWidgetSnapshot.swift", "TodayWidgetDisplay.swift", "TodayWidgetStore.swift", "TodayWidgetBridge.swift"):
        add_file("DraftOrderLiveActivityBridge.swift", name)
    # Widget extension
    add_file("AnyRentLiveActivityBundle.swift", "TodayWorkWidget.swift")
    add_file("AnyRentLiveActivityBundle.swift", "AnyRentLiveActivity.entitlements", kind="text.plist.entitlements", in_sources=False)
    for name in ("TodayWidgetSnapshot.swift", "TodayWidgetDisplay.swift", "TodayWidgetStore.swift"):
        also_compile(name, "TodayWorkWidget.swift")
    # UI test that puts the widget on the Simulator home screen (skips unless E2E_WIDGET_SIZE is set)
    add_file("AnyRentE2ETests.swift", "WidgetHomeScreenUITests.swift")
    # App (Swift 4)
    add_file("TodayWork.swift", "TodayWidgetData.swift")
    add_file("DraftOrderReminder.swift", "TodayWidgetSync.swift")
    add_file("OrdersViewController.swift", "WidgetGuideViewController.swift")

    # App Group id per configuration (Debug -> Development scheme, Release -> Production scheme)
    APP_DEBUG, APP_RELEASE = "88E4148921A99B3E00BAF4A1", "88E4148A21A99B3E00BAF4A1"
    EXT_DEBUG, EXT_RELEASE = "A4B110012F1E0101000053", "A4B110012F1E0101000054"
    for block, group in ((APP_DEBUG, "group.com.anyrent"), (APP_RELEASE, "group.com.anyrent"),
                         (EXT_DEBUG, "group.com.anyrent"), (EXT_RELEASE, "group.com.anyrent")):
        add_setting(block, "APP_GROUP_ID = %s;" % group, after="API_BASE_URL")
    for block in (EXT_DEBUG, EXT_RELEASE):
        add_setting(block, "CODE_SIGN_ENTITLEMENTS = AnyRentLiveActivity/AnyRentLiveActivity.entitlements;", after="APPLICATION_EXTENSION_API_ONLY")

PBX.write_text(text)
print("Patched", PBX)
