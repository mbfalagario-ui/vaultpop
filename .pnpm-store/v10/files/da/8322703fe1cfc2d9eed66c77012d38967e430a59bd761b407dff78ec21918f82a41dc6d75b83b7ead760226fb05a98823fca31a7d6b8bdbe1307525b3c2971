"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateAdRequestConfiguration = validateAdRequestConfiguration;
var _common = require("./common");
var _MaxAdContentRating = require("./MaxAdContentRating");
var _AgeRestrictedTreatment = require("./types/AgeRestrictedTreatment");
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

function validateAdRequestConfiguration(requestConfiguration) {
  const out = {};
  if (!(0, _common.isObject)(requestConfiguration)) {
    throw new Error("'requestConfiguration' expected an object value");
  }
  if (requestConfiguration.maxAdContentRating) {
    if (!Object.values(_MaxAdContentRating.MaxAdContentRating).includes(requestConfiguration.maxAdContentRating)) {
      throw new Error(`'requestConfiguration.maxAdContentRating' expected one of ${Object.values(_MaxAdContentRating.MaxAdContentRating).join(', ')}`);
    }
    out.maxAdContentRating = requestConfiguration.maxAdContentRating;
  }
  if (requestConfiguration.ageRestrictedTreatment) {
    if (!Object.values(_AgeRestrictedTreatment.AgeRestrictedTreatment).includes(requestConfiguration.ageRestrictedTreatment)) {
      throw new Error(`'requestConfiguration.ageRestrictedTreatment' expected one of ${Object.values(_AgeRestrictedTreatment.AgeRestrictedTreatment).join(', ')}`);
    }
    out.ageRestrictedTreatment = requestConfiguration.ageRestrictedTreatment;
  }
  if ((0, _common.isPropertySet)(requestConfiguration, 'tagForChildDirectedTreatment')) {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const tagForChildDirectedTreatment = requestConfiguration.tagForChildDirectedTreatment;
    if (!(0, _common.isBoolean)(tagForChildDirectedTreatment)) {
      throw new Error("'requestConfiguration.tagForChildDirectedTreatment' expected a boolean value");
    }

    // eslint-disable-next-line @typescript-eslint/no-deprecated
    out.tagForChildDirectedTreatment = requestConfiguration.tagForChildDirectedTreatment;
  }
  if ((0, _common.isPropertySet)(requestConfiguration, 'tagForUnderAgeOfConsent')) {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const tagForUnderAgeOfConsent = requestConfiguration.tagForUnderAgeOfConsent;
    if (!(0, _common.isBoolean)(tagForUnderAgeOfConsent)) {
      throw new Error("'requestConfiguration.tagForUnderAgeOfConsent' expected a boolean value");
    }

    // eslint-disable-next-line @typescript-eslint/no-deprecated
    out.tagForUnderAgeOfConsent = requestConfiguration.tagForUnderAgeOfConsent;
  }
  if ((0, _common.isPropertySet)(requestConfiguration, 'testDeviceIdentifiers')) {
    if (!(0, _common.isArray)(requestConfiguration.testDeviceIdentifiers)) {
      throw new Error("'requestConfiguration.testDeviceIdentifiers' expected an array value");
    }
    out.testDeviceIdentifiers = requestConfiguration.testDeviceIdentifiers;
  }
  return out;
}
//# sourceMappingURL=validateAdRequestConfiguration.js.map