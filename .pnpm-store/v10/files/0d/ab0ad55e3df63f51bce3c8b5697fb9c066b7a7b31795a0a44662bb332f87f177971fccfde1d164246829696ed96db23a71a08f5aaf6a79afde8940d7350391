"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateNativeAdRequestOptions = validateNativeAdRequestOptions;
var _common = require("./common");
var _validateAdRequestOptions = require("./validateAdRequestOptions");
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

function validateNativeAdRequestOptions(options) {
  const base = (0, _validateAdRequestOptions.validateAdRequestOptions)(options);
  const out = {
    ...base
  };
  if (!(0, _common.isUndefined)(options?.adChoicesPlacement)) {
    if (!(0, _common.isNumber)(options.adChoicesPlacement)) {
      throw new Error("'options.adChoicesPlacement' expected a number value");
    }
    out.adChoicesPlacement = options.adChoicesPlacement;
  }
  if (!(0, _common.isUndefined)(options?.aspectRatio)) {
    if (!(0, _common.isNumber)(options.aspectRatio)) {
      throw new Error("'options.aspectRatio' expected a number value");
    }
    out.aspectRatio = options.aspectRatio;
  }
  if (!(0, _common.isUndefined)(options?.startVideoMuted)) {
    if (!(0, _common.isBoolean)(options.startVideoMuted)) {
      throw new Error("'options.startVideoMuted' expected a boolean value");
    }
    out.startVideoMuted = options.startVideoMuted;
  }
  return out;
}
//# sourceMappingURL=validateNativeAdRequestOptions.js.map