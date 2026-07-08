"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GAMBannerAd = void 0;
var _react = _interopRequireWildcard(require("react"));
var _BaseAd = require("./BaseAd");
var _GoogleMobileAdsBannerViewNativeComponent = require("../specs/components/GoogleMobileAdsBannerViewNativeComponent");
var _jsxRuntime = require("react/jsx-runtime");
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

class GAMBannerAd extends _react.default.Component {
  ref = /*#__PURE__*/(0, _react.createRef)();
  recordManualImpression() {
    if (this.ref.current) {
      _GoogleMobileAdsBannerViewNativeComponent.Commands.recordManualImpression(this.ref.current);
    }
  }
  load() {
    if (this.ref.current) {
      _GoogleMobileAdsBannerViewNativeComponent.Commands.load(this.ref.current);
    }
  }
  render() {
    return /*#__PURE__*/(0, _jsxRuntime.jsx)(_BaseAd.BaseAd, {
      ref: this.ref,
      ...this.props
    });
  }
}
exports.GAMBannerAd = GAMBannerAd;
//# sourceMappingURL=GAMBannerAd.js.map