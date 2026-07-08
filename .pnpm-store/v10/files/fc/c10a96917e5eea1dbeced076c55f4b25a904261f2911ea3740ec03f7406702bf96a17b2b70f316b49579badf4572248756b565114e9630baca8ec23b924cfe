"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GoogleMobileAdsNativeEventEmitter = void 0;
var _reactNative = require("react-native");
var _NativeAppModule = _interopRequireDefault(require("../specs/modules/NativeAppModule"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
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

const RNAppModule = _NativeAppModule.default;
class GANativeEventEmitter extends _reactNative.NativeEventEmitter {
  constructor() {
    super(RNAppModule);
    this.ready = false;
  }
  addListener(eventType, listener, context) {
    if (!this.ready) {
      RNAppModule.eventsNotifyReady(true);
      this.ready = true;
    }
    RNAppModule.eventsAddListener(eventType);
    const subscription = super.addListener(`rnapp_${eventType}`, listener, context);

    // override the default remove to unsubscribe our native listener, then call super
    subscription.remove = () => {
      RNAppModule.eventsRemoveListener(eventType, false);
      subscription.remove();
    };
    return subscription;
  }
  removeAllListeners(eventType) {
    RNAppModule.eventsRemoveListener(eventType, true);
    super.removeAllListeners(`rnapp_${eventType}`);
  }
}
const GoogleMobileAdsNativeEventEmitter = exports.GoogleMobileAdsNativeEventEmitter = new GANativeEventEmitter();
//# sourceMappingURL=GoogleMobileAdsNativeEventEmitter.js.map