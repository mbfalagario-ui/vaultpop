"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AdsConsent = void 0;
var _core = require("@iabtcf/core");
var _AdsConsentPurposes = require("./AdsConsentPurposes");
var _AdsConsentSpecialFeatures = require("./AdsConsentSpecialFeatures");
var _common = require("./common");
var _NativeConsentModule = _interopRequireWildcard(require("./specs/modules/NativeConsentModule"));
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/*
 * Copyright (c) 2016-present Invertase Limited & Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this library except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

const AdsConsent = exports.AdsConsent = {
  requestInfoUpdate(options = {}) {
    if (!(0, _common.isObject)(options)) {
      throw new Error("AdsConsent.requestInfoUpdate(*) 'options' expected an object value.");
    }
    const debugGeography = options.debugGeography;
    if (debugGeography !== undefined && !Object.values(_NativeConsentModule.AdsConsentDebugGeography).includes(debugGeography)) {
      throw new Error("AdsConsent.requestInfoUpdate(*) 'options.debugGeography' expected one of AdsConsentDebugGeography.DISABLED, AdsConsentDebugGeography.EEA, AdsConsentDebugGeography.NOT_EEA, AdsConsentDebugGeography.REGULATED_US_STATE or AdsConsentDebugGeography.OTHER.");
    }
    if ((0, _common.isPropertySet)(options, 'tagForUnderAgeOfConsent') && !(0, _common.isBoolean)(options.tagForUnderAgeOfConsent)) {
      throw new Error("AdsConsent.requestInfoUpdate(*) 'options.tagForUnderAgeOfConsent' expected a boolean value.");
    }
    if ((0, _common.isPropertySet)(options, 'testDeviceIdentifiers')) {
      if (!(0, _common.isArray)(options.testDeviceIdentifiers)) {
        throw new Error("AdsConsent.requestInfoUpdate(*) 'options.testDeviceIdentifiers' expected an array of string values.");
      }
      for (const deviceId of options.testDeviceIdentifiers ?? []) {
        if (!(0, _common.isString)(deviceId)) {
          throw new Error("AdsConsent.requestInfoUpdate(*) 'options.testDeviceIdentifiers' expected an array of string values.");
        }
      }
    }
    return _NativeConsentModule.default.requestInfoUpdate(options);
  },
  showForm() {
    return _NativeConsentModule.default.showForm();
  },
  showPrivacyOptionsForm() {
    return _NativeConsentModule.default.showPrivacyOptionsForm();
  },
  loadAndShowConsentFormIfRequired() {
    return _NativeConsentModule.default.loadAndShowConsentFormIfRequired();
  },
  getConsentInfo() {
    return _NativeConsentModule.default.getConsentInfo();
  },
  async gatherConsent(options = {}) {
    await this.requestInfoUpdate(options);
    return this.loadAndShowConsentFormIfRequired();
  },
  reset() {
    _NativeConsentModule.default.reset();
  },
  getTCString() {
    return _NativeConsentModule.default.getTCString();
  },
  async getTCModel() {
    const tcString = await _NativeConsentModule.default.getTCString();
    return _core.TCString.decode(tcString);
  },
  getGdprApplies() {
    return _NativeConsentModule.default.getGdprApplies();
  },
  getPurposeConsents() {
    return _NativeConsentModule.default.getPurposeConsents();
  },
  getPurposeLegitimateInterests() {
    return _NativeConsentModule.default.getPurposeLegitimateInterests();
  },
  async getUserChoices() {
    const tcString = await _NativeConsentModule.default.getTCString();
    let tcModel;
    try {
      tcModel = _core.TCString.decode(tcString);
    } catch (e) {
      tcModel = new _core.TCModel();
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to decode tcString ${tcString}:`, e);
      }
    }
    return {
      activelyScanDeviceCharacteristicsForIdentification: tcModel.specialFeatureOptins.has(_AdsConsentSpecialFeatures.AdsConsentSpecialFeatures.ACTIVELY_SCAN_DEVICE_CHARACTERISTICS_FOR_IDENTIFICATION),
      applyMarketResearchToGenerateAudienceInsights: tcModel.purposeConsents.has(_AdsConsentPurposes.AdsConsentPurposes.APPLY_MARKET_RESEARCH_TO_GENERATE_AUDIENCE_INSIGHTS),
      createAPersonalisedAdsProfile: tcModel.purposeConsents.has(_AdsConsentPurposes.AdsConsentPurposes.CREATE_A_PERSONALISED_ADS_PROFILE),
      createAPersonalisedContentProfile: tcModel.purposeConsents.has(_AdsConsentPurposes.AdsConsentPurposes.CREATE_A_PERSONALISED_CONTENT_PROFILE),
      developAndImproveProducts: tcModel.purposeConsents.has(_AdsConsentPurposes.AdsConsentPurposes.DEVELOP_AND_IMPROVE_PRODUCTS),
      measureAdPerformance: tcModel.purposeConsents.has(_AdsConsentPurposes.AdsConsentPurposes.MEASURE_AD_PERFORMANCE),
      measureContentPerformance: tcModel.purposeConsents.has(_AdsConsentPurposes.AdsConsentPurposes.MEASURE_CONTENT_PERFORMANCE),
      selectBasicAds: tcModel.purposeConsents.has(_AdsConsentPurposes.AdsConsentPurposes.SELECT_BASIC_ADS),
      selectPersonalisedAds: tcModel.purposeConsents.has(_AdsConsentPurposes.AdsConsentPurposes.SELECT_PERSONALISED_ADS),
      selectPersonalisedContent: tcModel.purposeConsents.has(_AdsConsentPurposes.AdsConsentPurposes.SELECT_PERSONALISED_CONTENT),
      storeAndAccessInformationOnDevice: tcModel.purposeConsents.has(_AdsConsentPurposes.AdsConsentPurposes.STORE_AND_ACCESS_INFORMATION_ON_DEVICE),
      usePreciseGeolocationData: tcModel.specialFeatureOptins.has(_AdsConsentSpecialFeatures.AdsConsentSpecialFeatures.USE_PRECISE_GEOLOCATION_DATA)
    };
  }
};
//# sourceMappingURL=AdsConsent.js.map