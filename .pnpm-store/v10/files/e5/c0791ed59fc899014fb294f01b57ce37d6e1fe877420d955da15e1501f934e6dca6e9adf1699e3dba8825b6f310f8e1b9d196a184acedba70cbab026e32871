"use strict";

/**
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

import { TurboModuleRegistry } from 'react-native';
/**
 * AdsConsentDebugGeography enum.
 *
 * Used to set a mock location when testing the `AdsConsent` helper.
 */
export let AdsConsentDebugGeography = /*#__PURE__*/function (AdsConsentDebugGeography) {
  /**
   * Disable any debug geography.
   */
  AdsConsentDebugGeography[AdsConsentDebugGeography["DISABLED"] = 0] = "DISABLED";
  /**
   * Geography appears as in EEA for debug devices.
   */
  AdsConsentDebugGeography[AdsConsentDebugGeography["EEA"] = 1] = "EEA";
  /**
   * @deprecated Use `OTHER`.
   */
  AdsConsentDebugGeography[AdsConsentDebugGeography["NOT_EEA"] = 2] = "NOT_EEA";
  /**
   * Geography appears as in a regulated US State.
   */
  AdsConsentDebugGeography[AdsConsentDebugGeography["REGULATED_US_STATE"] = 3] = "REGULATED_US_STATE";
  /**
   * Geography appears as in a region with no regulation in force.
   */
  AdsConsentDebugGeography[AdsConsentDebugGeography["OTHER"] = 4] = "OTHER";
  return AdsConsentDebugGeography;
}({});

/**
 * AdsConsentStatus enum.
 */
export let AdsConsentStatus = /*#__PURE__*/function (AdsConsentStatus) {
  /**
   * Unknown consent status, AdsConsent.requestInfoUpdate needs to be called to update it.
   */
  AdsConsentStatus["UNKNOWN"] = "UNKNOWN";
  /**
   * User consent required but not yet obtained.
   */
  AdsConsentStatus["REQUIRED"] = "REQUIRED";
  /**
   * User consent not required.
   */
  AdsConsentStatus["NOT_REQUIRED"] = "NOT_REQUIRED";
  /**
   * User consent already obtained.
   */
  AdsConsentStatus["OBTAINED"] = "OBTAINED";
  return AdsConsentStatus;
}({});

/**
 * AdsConsentPrivacyOptionsRequirementStatus enum.
 */
export let AdsConsentPrivacyOptionsRequirementStatus = /*#__PURE__*/function (AdsConsentPrivacyOptionsRequirementStatus) {
  /**
   * Unknown consent status, AdsConsent.requestInfoUpdate needs to be called to update it.
   */
  AdsConsentPrivacyOptionsRequirementStatus["UNKNOWN"] = "UNKNOWN";
  /**
   * User consent required but not yet obtained.
   */
  AdsConsentPrivacyOptionsRequirementStatus["REQUIRED"] = "REQUIRED";
  /**
   * User consent not required.
   */
  AdsConsentPrivacyOptionsRequirementStatus["NOT_REQUIRED"] = "NOT_REQUIRED";
  return AdsConsentPrivacyOptionsRequirementStatus;
}({});

/**
 * The options used when requesting consent information.
 */

/**
 * The result of requesting info about a users consent status.
 */

/**
 * The options used when requesting consent information.
 *
 * https://vendor-list.consensu.org/v2/vendor-list.json
 * https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
 */

export default TurboModuleRegistry.getEnforcing('RNGoogleMobileAdsConsentModule');
//# sourceMappingURL=NativeConsentModule.js.map