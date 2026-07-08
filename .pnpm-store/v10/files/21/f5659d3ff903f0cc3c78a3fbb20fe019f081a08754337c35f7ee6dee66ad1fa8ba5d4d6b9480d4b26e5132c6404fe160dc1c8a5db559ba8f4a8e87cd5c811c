"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useFullScreenAd = useFullScreenAd;
var _react = require("react");
var _AdEventType = require("../AdEventType");
var _RewardedAdEventType = require("../RewardedAdEventType");
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

const initialState = {
  isLoaded: false,
  isOpened: false,
  isClicked: false,
  isClosed: false,
  error: undefined,
  reward: undefined,
  isEarnedReward: false
};
function useFullScreenAd(ad) {
  const [state, dispatch] = (0, _react.useReducer)((prevState, newState) => ({
    ...prevState,
    ...newState
  }), initialState);
  const isShowing = state.isOpened && !state.isClosed;
  const load = (0, _react.useCallback)(() => {
    if (ad) {
      dispatch(initialState);
      ad.load();
    }
  }, [ad]);
  const show = (0, _react.useCallback)(showOptions => {
    if (ad) {
      // ad.show returns a promise but we don't await
      // errors handled by library-consumer-provided functions
      void ad.show(showOptions);
    }
  }, [ad]);
  (0, _react.useEffect)(() => {
    dispatch(initialState);
    if (!ad) {
      return;
    }
    const unsubscribe = ad.addAdEventsListener(({
      type,
      payload
    }) => {
      switch (type) {
        case _AdEventType.AdEventType.LOADED:
          dispatch({
            isLoaded: true
          });
          break;
        case _AdEventType.AdEventType.OPENED:
          dispatch({
            isOpened: true
          });
          break;
        case _AdEventType.AdEventType.PAID:
          dispatch({
            revenue: payload
          });
          break;
        case _AdEventType.AdEventType.CLOSED:
          dispatch({
            isClosed: true,
            isLoaded: false
          });
          break;
        case _AdEventType.AdEventType.CLICKED:
          dispatch({
            isClicked: true
          });
          break;
        case _AdEventType.AdEventType.ERROR:
          dispatch({
            error: payload
          });
          break;
        case _RewardedAdEventType.RewardedAdEventType.LOADED:
          dispatch({
            isLoaded: true,
            reward: payload
          });
          break;
        case _RewardedAdEventType.RewardedAdEventType.EARNED_REWARD:
          dispatch({
            isEarnedReward: true,
            reward: payload
          });
          break;
      }
    });
    return () => {
      unsubscribe();
    };
  }, [ad]);
  return {
    ...state,
    isShowing,
    load,
    show
  };
}
//# sourceMappingURL=useFullScreenAd.js.map