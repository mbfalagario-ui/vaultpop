"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NativeAssetType = exports.NativeAsset = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _NativeAdContext = require("./NativeAdContext");
var _GoogleMobileAdsNativeViewNativeComponent = require("../../specs/components/GoogleMobileAdsNativeViewNativeComponent");
var _ref = require("../../common/ref");
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
let NativeAssetType = exports.NativeAssetType = /*#__PURE__*/function (NativeAssetType) {
  NativeAssetType["ADVERTISER"] = "advertiser";
  NativeAssetType["BODY"] = "body";
  NativeAssetType["CALL_TO_ACTION"] = "callToAction";
  NativeAssetType["HEADLINE"] = "headline";
  NativeAssetType["PRICE"] = "price";
  NativeAssetType["STORE"] = "store";
  NativeAssetType["STAR_RATING"] = "starRating";
  NativeAssetType["ICON"] = "icon";
  NativeAssetType["IMAGE"] = "image";
  return NativeAssetType;
}({});
const NativeAsset = props => {
  const {
    assetType,
    children
  } = props;
  const {
    viewRef
  } = (0, _react.useContext)(_NativeAdContext.NativeAdContext);
  const ref = (0, _react.useRef)(null);
  (0, _react.useEffect)(() => {
    if (!viewRef.current) {
      return;
    }
    const node = ref.current;
    const reactTag = (0, _reactNative.findNodeHandle)(node);
    if (reactTag) {
      _GoogleMobileAdsNativeViewNativeComponent.Commands.registerAsset(viewRef.current, assetType, reactTag);
    }
  }, [viewRef]);
  if (! /*#__PURE__*/_react.default.isValidElement(children)) {
    return null;
  }
  const childrenRef = (0, _ref.getElementRef)(children);
  return /*#__PURE__*/_react.default.cloneElement(children, {
    // @ts-ignore
    ref: (0, _ref.composeRefs)(ref, childrenRef)
  });
};
exports.NativeAsset = NativeAsset;
//# sourceMappingURL=NativeAsset.js.map