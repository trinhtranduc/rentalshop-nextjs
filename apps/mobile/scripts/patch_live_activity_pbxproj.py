#!/usr/bin/env python3
"""Insert DraftOrderActivity static lib + AnyRentLiveActivity widget into the Xcode project."""
from pathlib import Path

PBX = Path(__file__).resolve().parents[1] / "POS ADBD.xcodeproj" / "project.pbxproj"
text = PBX.read_text()

BUILD = """
		A4B110012F1E0101000001 /* DraftOrderAttributes.swift in Sources */ = {isa = PBXBuildFile; fileRef = A4B110012F1E0101000011 /* DraftOrderAttributes.swift */; };
		A4B110012F1E0101000002 /* DraftOrderLiveActivityView.swift in Sources */ = {isa = PBXBuildFile; fileRef = A4B110012F1E0101000012 /* DraftOrderLiveActivityView.swift */; };
		A4B110012F1E0101000003 /* DraftOrderLiveActivityWidget.swift in Sources */ = {isa = PBXBuildFile; fileRef = A4B110012F1E0101000013 /* DraftOrderLiveActivityWidget.swift */; };
		A4B110012F1E0101000004 /* DraftOrderLiveActivityBridge.swift in Sources */ = {isa = PBXBuildFile; fileRef = A4B110012F1E0101000014 /* DraftOrderLiveActivityBridge.swift */; };
		A4B110012F1E0101000005 /* AnyRentLiveActivityBundle.swift in Sources */ = {isa = PBXBuildFile; fileRef = A4B110012F1E0101000015 /* AnyRentLiveActivityBundle.swift */; };
		A4B110012F1E0101000006 /* libDraftOrderActivity.a in Frameworks */ = {isa = PBXBuildFile; fileRef = A4B110012F1E0101000017 /* libDraftOrderActivity.a */; };
		A4B110012F1E0101000007 /* libDraftOrderActivity.a in Frameworks */ = {isa = PBXBuildFile; fileRef = A4B110012F1E0101000017 /* libDraftOrderActivity.a */; };
		A4B110012F1E0101000008 /* AnyRentLiveActivity.appex in Embed App Extensions */ = {isa = PBXBuildFile; fileRef = A4B110012F1E0101000018 /* AnyRentLiveActivity.appex */; settings = {ATTRIBUTES = (RemoveHeadersOnCopy, ); }; };
		A4B110012F1E0101000009 /* WidgetKit.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = A4B110012F1E0101000019 /* WidgetKit.framework */; };
		A4B110012F1E010100000A /* SwiftUI.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = A4B110012F1E010100001A /* SwiftUI.framework */; };
		A4B110012F1E010100000B /* ActivityKit.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = A4B110012F1E010100001B /* ActivityKit.framework */; };
		A4B110012F1E010100000C /* WidgetKit.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = A4B110012F1E0101000019 /* WidgetKit.framework */; };
		A4B110012F1E010100000D /* SwiftUI.framework in Frameworks */ = {isa = PBXBuildFile; fileRef = A4B110012F1E010100001A /* SwiftUI.framework */; };
"""

if "A4B110012F1E0101000001" in text:
    print("Already patched")
    raise SystemExit(0)

text = text.replace(
    "/* Begin PBXBuildFile section */\n",
    "/* Begin PBXBuildFile section */\n" + BUILD,
)

text = text.replace(
    "/* End PBXContainerItemProxy section */",
    """		A4B110012F1E0101000020 /* PBXContainerItemProxy */ = {
			isa = PBXContainerItemProxy;
			containerPortal = 88E4146E21A99B3B00BAF4A1 /* Project object */;
			proxyType = 1;
			remoteGlobalIDString = A4B110012F1E0101000030;
			remoteInfo = DraftOrderActivity;
		};
		A4B110012F1E0101000021 /* PBXContainerItemProxy */ = {
			isa = PBXContainerItemProxy;
			containerPortal = 88E4146E21A99B3B00BAF4A1 /* Project object */;
			proxyType = 1;
			remoteGlobalIDString = A4B110012F1E0101000031;
			remoteInfo = AnyRentLiveActivity;
		};
		A4B110012F1E0101000022 /* PBXContainerItemProxy */ = {
			isa = PBXContainerItemProxy;
			containerPortal = 88E4146E21A99B3B00BAF4A1 /* Project object */;
			proxyType = 1;
			remoteGlobalIDString = A4B110012F1E0101000030;
			remoteInfo = DraftOrderActivity;
		};
/* End PBXContainerItemProxy section */""",
)

text = text.replace(
    "/* End PBXCopyFilesBuildPhase section */",
    """		A4B110012F1E0101000023 /* Embed App Extensions */ = {
			isa = PBXCopyFilesBuildPhase;
			buildActionMask = 2147483647;
			dstPath = "";
			dstSubfolderSpec = 13;
			files = (
				A4B110012F1E0101000008 /* AnyRentLiveActivity.appex in Embed App Extensions */,
			);
			name = "Embed App Extensions";
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXCopyFilesBuildPhase section */""",
)

text = text.replace(
    "/* Begin PBXFileReference section */\n",
    """/* Begin PBXFileReference section */
		A4B110012F1E0101000011 /* DraftOrderAttributes.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = DraftOrderAttributes.swift; sourceTree = "<group>"; };
		A4B110012F1E0101000012 /* DraftOrderLiveActivityView.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = DraftOrderLiveActivityView.swift; sourceTree = "<group>"; };
		A4B110012F1E0101000013 /* DraftOrderLiveActivityWidget.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = DraftOrderLiveActivityWidget.swift; sourceTree = "<group>"; };
		A4B110012F1E0101000014 /* DraftOrderLiveActivityBridge.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = DraftOrderLiveActivityBridge.swift; sourceTree = "<group>"; };
		A4B110012F1E0101000015 /* AnyRentLiveActivityBundle.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AnyRentLiveActivityBundle.swift; sourceTree = "<group>"; };
		A4B110012F1E0101000016 /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
		A4B110012F1E0101000017 /* libDraftOrderActivity.a */ = {isa = PBXFileReference; explicitFileType = archive.ar; includeInIndex = 0; path = libDraftOrderActivity.a; sourceTree = BUILT_PRODUCTS_DIR; };
		A4B110012F1E0101000018 /* AnyRentLiveActivity.appex */ = {isa = PBXFileReference; explicitFileType = "wrapper.app-extension"; includeInIndex = 0; path = AnyRentLiveActivity.appex; sourceTree = BUILT_PRODUCTS_DIR; };
		A4B110012F1E0101000019 /* WidgetKit.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = WidgetKit.framework; path = System/Library/Frameworks/WidgetKit.framework; sourceTree = SDKROOT; };
		A4B110012F1E010100001A /* SwiftUI.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = SwiftUI.framework; path = System/Library/Frameworks/SwiftUI.framework; sourceTree = SDKROOT; };
		A4B110012F1E010100001B /* ActivityKit.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = ActivityKit.framework; path = System/Library/Frameworks/ActivityKit.framework; sourceTree = SDKROOT; };
""",
)

# App frameworks phase
text = text.replace(
    "				F53E36E4295E06D35B9F35C4 /* Pods_POS_ADBD.framework in Frameworks */,\n",
    "				F53E36E4295E06D35B9F35C4 /* Pods_POS_ADBD.framework in Frameworks */,\n				A4B110012F1E0101000006 /* libDraftOrderActivity.a in Frameworks */,\n",
)

# Frameworks group
text = text.replace(
    "			name = Frameworks;\n			sourceTree = \"<group>\";\n		};\n/* End PBXGroup section */",
    """			name = Frameworks;
			sourceTree = "<group>";
		};
		A4B110012F1E0101000040 /* DraftOrderActivity */ = {
			isa = PBXGroup;
			children = (
				A4B110012F1E0101000011 /* DraftOrderAttributes.swift */,
				A4B110012F1E0101000012 /* DraftOrderLiveActivityView.swift */,
				A4B110012F1E0101000013 /* DraftOrderLiveActivityWidget.swift */,
				A4B110012F1E0101000014 /* DraftOrderLiveActivityBridge.swift */,
			);
			path = DraftOrderActivity;
			sourceTree = "<group>";
		};
		A4B110012F1E0101000041 /* AnyRentLiveActivity */ = {
			isa = PBXGroup;
			children = (
				A4B110012F1E0101000015 /* AnyRentLiveActivityBundle.swift */,
				A4B110012F1E0101000016 /* Info.plist */,
			);
			path = AnyRentLiveActivity;
			sourceTree = "<group>";
		};
/* End PBXGroup section */""",
)

text = text.replace(
    """		88E4146D21A99B3B00BAF4A1 = {
			isa = PBXGroup;
			children = (
""",
    """		88E4146D21A99B3B00BAF4A1 = {
			isa = PBXGroup;
			children = (
				A4B110012F1E0101000040 /* DraftOrderActivity */,
				A4B110012F1E0101000041 /* AnyRentLiveActivity */,
""",
)

text = text.replace(
    """			children = (
				88E4147621A99B3B00BAF4A1 /* POS ADBD.app */,
				C9B32979240D728B00FEB650 /* POS ADBDUITests.xctest */,
			);""",
    """			children = (
				88E4147621A99B3B00BAF4A1 /* POS ADBD.app */,
				A4B110012F1E0101000017 /* libDraftOrderActivity.a */,
				A4B110012F1E0101000018 /* AnyRentLiveActivity.appex */,
				C9B32979240D728B00FEB650 /* POS ADBDUITests.xctest */,
			);""",
)

# Native targets
text = text.replace(
    """			buildPhases = (
				B0849554F87375815E3C69D4 /* [CP] Check Pods Manifest.lock */,
				88E4147221A99B3B00BAF4A1 /* Sources */,
				88E4147321A99B3B00BAF4A1 /* Frameworks */,
				88E4147421A99B3B00BAF4A1 /* Resources */,
				C9EC792324363B28005FF31D /* ShellScript */,
				88B716BC2A935E1100499F6C /* Embed Frameworks */,
				715D797CD7AC5DDD1BFDA812 /* [CP] Embed Pods Frameworks */,
			);
			buildRules = (
			);
			dependencies = (
			);""",
    """			buildPhases = (
				B0849554F87375815E3C69D4 /* [CP] Check Pods Manifest.lock */,
				88E4147221A99B3B00BAF4A1 /* Sources */,
				88E4147321A99B3B00BAF4A1 /* Frameworks */,
				88E4147421A99B3B00BAF4A1 /* Resources */,
				C9EC792324363B28005FF31D /* ShellScript */,
				88B716BC2A935E1100499F6C /* Embed Frameworks */,
				715D797CD7AC5DDD1BFDA812 /* [CP] Embed Pods Frameworks */,
				A4B110012F1E0101000023 /* Embed App Extensions */,
			);
			buildRules = (
			);
			dependencies = (
				A4B110012F1E0101000024 /* PBXTargetDependency */,
				A4B110012F1E0101000025 /* PBXTargetDependency */,
			);""",
)

text = text.replace(
    """/* End PBXNativeTarget section */""",
    """		A4B110012F1E0101000030 /* DraftOrderActivity */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = A4B110012F1E0101000052 /* Build configuration list for PBXNativeTarget "DraftOrderActivity" */;
			buildPhases = (
				A4B110012F1E0101000032 /* Sources */,
				A4B110012F1E0101000033 /* Frameworks */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = DraftOrderActivity;
			productName = DraftOrderActivity;
			productReference = A4B110012F1E0101000017 /* libDraftOrderActivity.a */;
			productType = "com.apple.product-type.library.static";
		};
		A4B110012F1E0101000031 /* AnyRentLiveActivity */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = A4B110012F1E0101000055 /* Build configuration list for PBXNativeTarget "AnyRentLiveActivity" */;
			buildPhases = (
				A4B110012F1E0101000034 /* Sources */,
				A4B110012F1E0101000035 /* Frameworks */,
				A4B110012F1E0101000036 /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
				A4B110012F1E0101000026 /* PBXTargetDependency */,
			);
			name = AnyRentLiveActivity;
			productName = AnyRentLiveActivity;
			productReference = A4B110012F1E0101000018 /* AnyRentLiveActivity.appex */;
			productType = "com.apple.product-type.app-extension";
		};
/* End PBXNativeTarget section */""",
)

text = text.replace(
    """			targets = (
				88E4147521A99B3B00BAF4A1 /* POS ADBD */,
				C9B32978240D728B00FEB650 /* POS ADBDUITests */,
			);""",
    """			targets = (
				88E4147521A99B3B00BAF4A1 /* POS ADBD */,
				A4B110012F1E0101000030 /* DraftOrderActivity */,
				A4B110012F1E0101000031 /* AnyRentLiveActivity */,
				C9B32978240D728B00FEB650 /* POS ADBDUITests */,
			);""",
)

text = text.replace(
    "				TargetAttributes = {\n					88E4147521A99B3B00BAF4A1 = {\n						CreatedOnToolsVersion = 9.4.1;\n					};",
    """				TargetAttributes = {
					A4B110012F1E0101000030 = {
						CreatedOnToolsVersion = 16.0;
					};
					A4B110012F1E0101000031 = {
						CreatedOnToolsVersion = 16.0;
					};
					88E4147521A99B3B00BAF4A1 = {
						CreatedOnToolsVersion = 9.4.1;
					};""",
)

# Frameworks / sources / resources phases
text = text.replace(
    "/* End PBXFrameworksBuildPhase section */",
    """		A4B110012F1E0101000033 /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
				A4B110012F1E0101000009 /* WidgetKit.framework in Frameworks */,
				A4B110012F1E010100000A /* SwiftUI.framework in Frameworks */,
				A4B110012F1E010100000B /* ActivityKit.framework in Frameworks */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
		A4B110012F1E0101000035 /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
				A4B110012F1E0101000007 /* libDraftOrderActivity.a in Frameworks */,
				A4B110012F1E010100000C /* WidgetKit.framework in Frameworks */,
				A4B110012F1E010100000D /* SwiftUI.framework in Frameworks */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */""",
)

text = text.replace(
    "/* End PBXResourcesBuildPhase section */",
    """		A4B110012F1E0101000036 /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */""",
)

text = text.replace(
    "/* End PBXSourcesBuildPhase section */",
    """		A4B110012F1E0101000032 /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				A4B110012F1E0101000001 /* DraftOrderAttributes.swift in Sources */,
				A4B110012F1E0101000002 /* DraftOrderLiveActivityView.swift in Sources */,
				A4B110012F1E0101000003 /* DraftOrderLiveActivityWidget.swift in Sources */,
				A4B110012F1E0101000004 /* DraftOrderLiveActivityBridge.swift in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
		A4B110012F1E0101000034 /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				A4B110012F1E0101000005 /* AnyRentLiveActivityBundle.swift in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */""",
)

text = text.replace(
    "/* End PBXTargetDependency section */",
    """		A4B110012F1E0101000024 /* PBXTargetDependency */ = {
			isa = PBXTargetDependency;
			target = A4B110012F1E0101000030 /* DraftOrderActivity */;
			targetProxy = A4B110012F1E0101000020 /* PBXContainerItemProxy */;
		};
		A4B110012F1E0101000025 /* PBXTargetDependency */ = {
			isa = PBXTargetDependency;
			target = A4B110012F1E0101000031 /* AnyRentLiveActivity */;
			targetProxy = A4B110012F1E0101000021 /* PBXContainerItemProxy */;
		};
		A4B110012F1E0101000026 /* PBXTargetDependency */ = {
			isa = PBXTargetDependency;
			target = A4B110012F1E0101000030 /* DraftOrderActivity */;
			targetProxy = A4B110012F1E0101000022 /* PBXContainerItemProxy */;
		};
/* End PBXTargetDependency section */""",
)

WIDGET_DEBUG = r"""
		A4B110012F1E0101000050 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				APPLICATION_EXTENSION_API_ONLY = YES;
				CLANG_ENABLE_MODULES = YES;
				CODE_SIGN_IDENTITY = "Apple Development";
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 0321202601;
				DEFINES_MODULE = YES;
				DEVELOPMENT_TEAM = 2K6L2KZC9A;
				IPHONEOS_DEPLOYMENT_TARGET = 15.0;
				MACH_O_TYPE = staticlib;
				MARKETING_VERSION = 1.1.3;
				OTHER_LDFLAGS = "-ObjC";
				PRODUCT_MODULE_NAME = DraftOrderActivity;
				PRODUCT_NAME = DraftOrderActivity;
				SKIP_INSTALL = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Debug;
		};
		A4B110012F1E0101000051 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				APPLICATION_EXTENSION_API_ONLY = YES;
				CLANG_ENABLE_MODULES = YES;
				CODE_SIGN_IDENTITY = "Apple Development";
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 0321202601;
				DEFINES_MODULE = YES;
				DEVELOPMENT_TEAM = 2K6L2KZC9A;
				IPHONEOS_DEPLOYMENT_TARGET = 15.0;
				MACH_O_TYPE = staticlib;
				MARKETING_VERSION = 1.1.3;
				OTHER_LDFLAGS = "-ObjC";
				PRODUCT_MODULE_NAME = DraftOrderActivity;
				PRODUCT_NAME = DraftOrderActivity;
				SKIP_INSTALL = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Release;
		};
		A4B110012F1E0101000053 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				APPLICATION_EXTENSION_API_ONLY = YES;
				CODE_SIGN_IDENTITY = "Apple Development";
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 0321202601;
				DEVELOPMENT_TEAM = 2K6L2KZC9A;
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = AnyRentLiveActivity/Info.plist;
				IPHONEOS_DEPLOYMENT_TARGET = 16.1;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
					"@executable_path/../../Frameworks",
				);
				MARKETING_VERSION = 1.1.3;
				PRODUCT_BUNDLE_IDENTIFIER = com.anyrent.debug.liveactivity;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SKIP_INSTALL = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Debug;
		};
		A4B110012F1E0101000054 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				APPLICATION_EXTENSION_API_ONLY = YES;
				CODE_SIGN_IDENTITY = "Apple Development";
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 0321202601;
				DEVELOPMENT_TEAM = 2K6L2KZC9A;
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = AnyRentLiveActivity/Info.plist;
				IPHONEOS_DEPLOYMENT_TARGET = 16.1;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
					"@executable_path/../../Frameworks",
				);
				MARKETING_VERSION = 1.1.3;
				PRODUCT_BUNDLE_IDENTIFIER = com.anyrent.liveactivity;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SKIP_INSTALL = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Release;
		};
"""

text = text.replace(
    "/* End XCBuildConfiguration section */",
    WIDGET_DEBUG + "/* End XCBuildConfiguration section */",
)

text = text.replace(
    "/* End XCConfigurationList section */",
    """		A4B110012F1E0101000052 /* Build configuration list for PBXNativeTarget "DraftOrderActivity" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				A4B110012F1E0101000050 /* Debug */,
				A4B110012F1E0101000051 /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Debug;
		};
		A4B110012F1E0101000055 /* Build configuration list for PBXNativeTarget "AnyRentLiveActivity" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				A4B110012F1E0101000053 /* Debug */,
				A4B110012F1E0101000054 /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Debug;
		};
/* End XCConfigurationList section */""",
)

PBX.write_text(text)
print("Patched", PBX)
