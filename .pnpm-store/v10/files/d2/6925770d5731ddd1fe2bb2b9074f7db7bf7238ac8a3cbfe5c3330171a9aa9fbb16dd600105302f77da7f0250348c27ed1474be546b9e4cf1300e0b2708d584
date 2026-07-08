"use strict";

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

import React, { createRef } from 'react';
import { BaseAd } from './BaseAd';
import { Commands } from '../specs/components/GoogleMobileAdsBannerViewNativeComponent';
import { jsx as _jsx } from "react/jsx-runtime";
export class GAMBannerAd extends React.Component {
  ref = /*#__PURE__*/createRef();
  recordManualImpression() {
    if (this.ref.current) {
      Commands.recordManualImpression(this.ref.current);
    }
  }
  load() {
    if (this.ref.current) {
      Commands.load(this.ref.current);
    }
  }
  render() {
    return /*#__PURE__*/_jsx(BaseAd, {
      ref: this.ref,
      ...this.props
    });
  }
}
//# sourceMappingURL=GAMBannerAd.js.map