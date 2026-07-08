"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NativeMediaView = void 0;
var _react = _interopRequireWildcard(require("react"));
var _GoogleMobileAdsMediaViewNativeComponent = _interopRequireDefault(require("../../specs/components/GoogleMobileAdsMediaViewNativeComponent"));
var _NativeAsset = require("./NativeAsset");
var _NativeAdContext = require("./NativeAdContext");
var _jsxRuntime = require("react/jsx-runtime");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
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

const NativeMediaView = props => {
  const {
    resizeMode,
    style,
    ...viewProps
  } = props;
  const {
    nativeAd
  } = (0, _react.useContext)(_NativeAdContext.NativeAdContext);
  const {
    responseId,
    mediaContent
  } = nativeAd;
  return (
    /*#__PURE__*/
    // @ts-ignore
    (0, _jsxRuntime.jsx)(_NativeAsset.NativeAsset, {
      assetType: 'media',
      children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_GoogleMobileAdsMediaViewNativeComponent.default, {
        ...viewProps,
        responseId: responseId,
        resizeMode: resizeMode,
        style: [{
          aspectRatio: mediaContent?.aspectRatio
        }, style]
      })
    })
  );
};
exports.NativeMediaView = NativeMediaView;
//# sourceMappingURL=NativeMediaView.js.map