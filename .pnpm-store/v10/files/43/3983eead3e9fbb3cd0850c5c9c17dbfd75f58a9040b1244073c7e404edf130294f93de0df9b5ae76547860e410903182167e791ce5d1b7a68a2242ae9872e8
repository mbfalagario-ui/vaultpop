"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.withIosAlternativeBilling = exports.modifyProjectBuildGradle = void 0;
const config_plugins_1 = require("expo/config-plugins");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const pkg = require('../../package.json');
// Global flag to prevent duplicate logs
let hasLoggedPluginExecution = false;
const addLineToGradle = (content, anchor, lineToAdd, offset = 1) => {
    const lines = content.split('\n');
    const index = lines.findIndex((line) => line.match(anchor));
    if (index === -1) {
        console.warn(`Anchor "${anchor}" not found in build.gradle. Appending to end.`);
        lines.push(lineToAdd);
    }
    else {
        lines.splice(index + offset, 0, lineToAdd);
    }
    return lines.join('\n');
};
const modifyProjectBuildGradle = (gradle) => {
    // Keep backward-compatible behavior: add supportLibVersion inside ext { } if missing
    if (!gradle.includes('supportLibVersion')) {
        const lines = gradle.split('\n');
        const extIndex = lines.findIndex((line) => line.trim() === 'ext {');
        if (extIndex !== -1) {
            lines.splice(extIndex + 1, 0, 'supportLibVersion = "28.0.0"');
            return lines.join('\n');
        }
    }
    return gradle;
};
exports.modifyProjectBuildGradle = modifyProjectBuildGradle;
const OPENIAP_COORD = 'io.github.hyochan.openiap:openiap-google';
function loadOpenIapConfig() {
    const versionsPath = (0, node_path_1.resolve)(__dirname, '../../openiap-versions.json');
    try {
        const raw = (0, node_fs_1.readFileSync)(versionsPath, 'utf8');
        const parsed = JSON.parse(raw);
        const googleVersion = typeof parsed?.google === 'string' ? parsed.google.trim() : '';
        if (!googleVersion) {
            throw new Error('react-native-iap: "google" version missing or invalid in openiap-versions.json');
        }
        return { google: googleVersion };
    }
    catch (error) {
        throw new Error(`react-native-iap: Unable to load openiap-versions.json (${error instanceof Error ? error.message : error})`);
    }
}
let cachedOpenIapVersion = null;
const getOpenIapVersion = () => {
    if (cachedOpenIapVersion) {
        return cachedOpenIapVersion;
    }
    cachedOpenIapVersion = loadOpenIapConfig().google;
    return cachedOpenIapVersion;
};
const modifyAppBuildGradle = (gradle) => {
    let modified = gradle;
    let openiapVersion;
    try {
        openiapVersion = getOpenIapVersion();
    }
    catch (error) {
        config_plugins_1.WarningAggregator.addWarningAndroid('react-native-iap', `react-native-iap: Failed to resolve OpenIAP version (${error instanceof Error ? error.message : error})`);
        return gradle;
    }
    // Replace legacy Billing/GMS instructions with OpenIAP Google library
    // Remove any old billingclient or play-services-base lines we may have added previously
    modified = modified
        .replace(/^[ \t]*(implementation|api)[ \t]+["']com\.android\.billingclient:billing-ktx:[^"']+["'][ \t]*$/gim, '')
        .replace(/^[ \t]*(implementation|api)[ \t]+["']com\.google\.android\.gms:play-services-base:[^"']+["'][ \t]*$/gim, '')
        .replace(/\n{3,}/g, '\n\n');
    const openiapDep = `    implementation "${OPENIAP_COORD}:${openiapVersion}"`;
    if (!modified.includes(OPENIAP_COORD)) {
        if (!/dependencies\s*{/.test(modified)) {
            modified += `\n\ndependencies {\n${openiapDep}\n}\n`;
        }
        else {
            modified = addLineToGradle(modified, /dependencies\s*{/, openiapDep);
        }
        if (!hasLoggedPluginExecution) {
            console.log(`🛠️ react-native-iap: Added OpenIAP (${openiapVersion}) to build.gradle`);
        }
    }
    return modified;
};
const withIapAndroid = (config, props) => {
    // Add OpenIAP dependency to app build.gradle
    config = (0, config_plugins_1.withAppBuildGradle)(config, (config) => {
        config.modResults.contents = modifyAppBuildGradle(config.modResults.contents);
        return config;
    });
    config = (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        const manifest = config.modResults;
        if (!manifest.manifest['uses-permission']) {
            manifest.manifest['uses-permission'] = [];
        }
        const permissions = manifest.manifest['uses-permission'];
        const billingPerm = { $: { 'android:name': 'com.android.vending.BILLING' } };
        const alreadyExists = permissions.some((p) => p.$['android:name'] === 'com.android.vending.BILLING');
        if (!alreadyExists) {
            permissions.push(billingPerm);
            if (!hasLoggedPluginExecution) {
                console.log('✅ Added com.android.vending.BILLING to AndroidManifest.xml');
            }
        }
        else {
            if (!hasLoggedPluginExecution) {
                console.log('ℹ️ com.android.vending.BILLING already exists in AndroidManifest.xml');
            }
        }
        // Add IAPKit API key as meta-data if provided
        if (props?.iapkitApiKey) {
            const application = manifest.manifest.application;
            const app = application?.[0];
            if (app) {
                if (!app['meta-data']) {
                    app['meta-data'] = [];
                }
                const metaDataKey = 'dev.iapkit.API_KEY';
                const existingMetaData = app['meta-data'].find((m) => m.$?.['android:name'] === metaDataKey);
                if (!existingMetaData) {
                    app['meta-data'].push({
                        $: {
                            'android:name': metaDataKey,
                            'android:value': props.iapkitApiKey,
                        },
                    });
                    if (!hasLoggedPluginExecution) {
                        console.log('✅ Added IAPKit API key to AndroidManifest.xml');
                    }
                }
            }
        }
        return config;
    });
    return config;
};
/** Add external purchase entitlements and Info.plist configuration */
const withIosAlternativeBilling = (config, options) => {
    if (!options || !options.countries || options.countries.length === 0) {
        return config;
    }
    // Add entitlements
    config = (0, config_plugins_1.withEntitlementsPlist)(config, (config) => {
        // Always add basic external purchase entitlement when countries are specified
        config.modResults['com.apple.developer.storekit.external-purchase'] = true;
        if (!hasLoggedPluginExecution) {
            console.log('✅ Added com.apple.developer.storekit.external-purchase to entitlements');
        }
        // Add external purchase link entitlement if enabled
        if (options.enableExternalPurchaseLink) {
            config.modResults['com.apple.developer.storekit.external-purchase-link'] =
                true;
            if (!hasLoggedPluginExecution) {
                console.log('✅ Added com.apple.developer.storekit.external-purchase-link to entitlements');
            }
        }
        // Add streaming entitlement if enabled
        if (options.enableExternalPurchaseLinkStreaming) {
            config.modResults['com.apple.developer.storekit.external-purchase-link-streaming'] = true;
            if (!hasLoggedPluginExecution) {
                console.log('✅ Added com.apple.developer.storekit.external-purchase-link-streaming to entitlements');
            }
        }
        return config;
    });
    // Add Info.plist configuration
    config = (0, config_plugins_1.withInfoPlist)(config, (config) => {
        const plist = config.modResults;
        // Helper function to normalize country codes to uppercase
        const normalize = (code) => code.trim().toUpperCase();
        // 1. SKExternalPurchase (Required)
        const normalizedCountries = options.countries?.map(normalize);
        plist.SKExternalPurchase = normalizedCountries;
        if (!hasLoggedPluginExecution) {
            console.log(`✅ Added SKExternalPurchase with countries: ${normalizedCountries?.join(', ')}`);
        }
        // 2. SKExternalPurchaseLink (Optional - iOS 15.4+)
        if (options.links && Object.keys(options.links).length > 0) {
            plist.SKExternalPurchaseLink = Object.fromEntries(Object.entries(options.links).map(([code, url]) => [
                normalize(code),
                url,
            ]));
            if (!hasLoggedPluginExecution) {
                console.log(`✅ Added SKExternalPurchaseLink for ${Object.keys(options.links).length} countries`);
            }
        }
        // 3. SKExternalPurchaseMultiLink (iOS 17.5+)
        if (options.multiLinks && Object.keys(options.multiLinks).length > 0) {
            plist.SKExternalPurchaseMultiLink = Object.fromEntries(Object.entries(options.multiLinks).map(([code, urls]) => [
                normalize(code),
                urls,
            ]));
            if (!hasLoggedPluginExecution) {
                console.log(`✅ Added SKExternalPurchaseMultiLink for ${Object.keys(options.multiLinks).length} countries`);
            }
        }
        // 4. SKExternalPurchaseCustomLinkRegions (iOS 18.1+)
        if (options.customLinkRegions && options.customLinkRegions.length > 0) {
            plist.SKExternalPurchaseCustomLinkRegions =
                options.customLinkRegions.map(normalize);
            if (!hasLoggedPluginExecution) {
                console.log(`✅ Added SKExternalPurchaseCustomLinkRegions: ${options.customLinkRegions
                    .map(normalize)
                    .join(', ')}`);
            }
        }
        // 5. SKExternalPurchaseLinkStreamingRegions (iOS 18.2+)
        if (options.streamingLinkRegions &&
            options.streamingLinkRegions.length > 0) {
            plist.SKExternalPurchaseLinkStreamingRegions =
                options.streamingLinkRegions.map(normalize);
            if (!hasLoggedPluginExecution) {
                console.log(`✅ Added SKExternalPurchaseLinkStreamingRegions: ${options.streamingLinkRegions
                    .map(normalize)
                    .join(', ')}`);
            }
        }
        return config;
    });
    return config;
};
exports.withIosAlternativeBilling = withIosAlternativeBilling;
const withIapIosFollyWorkaround = (config, props) => {
    const newKey = props?.ios?.['with-folly-no-coroutines'];
    const oldKey = props?.ios?.['with-folly-no-couroutines'];
    if (oldKey && !hasLoggedPluginExecution) {
        // Temporary deprecation notice; remove when old key is dropped
        config_plugins_1.WarningAggregator.addWarningIOS('react-native-iap', "react-native-iap: 'ios.with-folly-no-couroutines' is deprecated; use 'ios.with-folly-no-coroutines'.");
    }
    const enabled = !!(newKey ?? oldKey);
    if (!enabled)
        return config;
    return (0, config_plugins_1.withPodfile)(config, (config) => {
        let contents = config.modResults.contents;
        // Idempotency: if any of the defines already exists, assume it's applied
        if (contents.includes('FOLLY_CFG_NO_COROUTINES') ||
            contents.includes('FOLLY_HAS_COROUTINES=0')) {
            return config;
        }
        const anchor = 'post_install do |installer|';
        const snippet = `
  # react-native-iap (expo): Disable Folly coroutines to avoid including non-vendored <folly/coro/*> headers
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      defs = (config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)'])
      defs << 'FOLLY_NO_CONFIG=1' unless defs.any? { |d| d.to_s.include?('FOLLY_NO_CONFIG') }
      # Portability.h respects FOLLY_CFG_NO_COROUTINES to fully disable coroutine support
      defs << 'FOLLY_CFG_NO_COROUTINES=1' unless defs.any? { |d| d.to_s.include?('FOLLY_CFG_NO_COROUTINES') }
      defs << 'FOLLY_HAS_COROUTINES=0' unless defs.any? { |d| d.to_s.include?('FOLLY_HAS_COROUTINES') }
      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
    end
  end`;
        if (contents.includes(anchor)) {
            contents = contents.replace(anchor, `${anchor}\n${snippet}`);
        }
        else {
            // As a fallback, append a new post_install block
            contents += `

${anchor}
${snippet}
end
`;
        }
        config.modResults.contents = contents;
        return config;
    });
};
/** Add IAPKit API key to iOS Info.plist */
const withIapkitApiKeyIOS = (config, apiKey) => {
    if (!apiKey) {
        return config;
    }
    return (0, config_plugins_1.withInfoPlist)(config, (config) => {
        const plist = config.modResults;
        const plistKey = 'IAPKitAPIKey';
        if (!plist[plistKey]) {
            plist[plistKey] = apiKey;
            if (!hasLoggedPluginExecution) {
                console.log('✅ Added IAPKit API key to Info.plist');
            }
        }
        return config;
    });
};
const withIAP = (config, props) => {
    try {
        let result = withIapAndroid(config, { iapkitApiKey: props?.iapkitApiKey });
        result = withIapIosFollyWorkaround(result, props);
        // Add iOS alternative billing configuration if provided
        if (props?.iosAlternativeBilling) {
            result = withIosAlternativeBilling(result, props.iosAlternativeBilling);
        }
        // Add IAPKit API key to iOS Info.plist if provided
        if (props?.iapkitApiKey) {
            result = withIapkitApiKeyIOS(result, props.iapkitApiKey);
        }
        // Set flag after first execution to prevent duplicate logs
        hasLoggedPluginExecution = true;
        return result;
    }
    catch (error) {
        config_plugins_1.WarningAggregator.addWarningAndroid('react-native-iap', `react-native-iap plugin encountered an error: ${error}`);
        console.error('react-native-iap plugin error:', error);
        return config;
    }
};
const _wrapped = (0, config_plugins_1.createRunOncePlugin)(withIAP, pkg.name, pkg.version);
const pluginExport = ((config, props) => _wrapped(config, props));
exports.default = pluginExport;
