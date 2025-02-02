/***************************************************************************************
 * (c) 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 ****************************************************************************************/

var window = require('@adobe/reactor-window');

module.exports = function (turbineEmbedCode, cdnAllowList, debugController) {
  // even an empty list is flagging to us that we're trying to enforce dynamic
  var isDynamicEnforced = Array.isArray(cdnAllowList);
  var shouldAugment = Boolean(isDynamicEnforced && turbineEmbedCode);

  // TODO: web only? I think embedded TVs wouldn't have
  //  __satellite.container.dynamicEnforced turned on
  var turbineUrl = document.createElement('a');
  turbineUrl.href = turbineEmbedCode;
  if (
    (!/^https?:\/\/.*/.test(turbineEmbedCode) || !turbineUrl.host) &&
    isDynamicEnforced
  ) {
    var missingEmbedCodeError = new Error(
      'Unable to find the Library Embed Code for Dynamic Host Resolution.'
    );
    missingEmbedCodeError.code = 'dynamic_host_resolver_constructor_error';
    throw missingEmbedCodeError;
  }

  if (isDynamicEnforced && cdnAllowList.indexOf(turbineUrl.hostname) === -1) {
    var dynamicDeniedError = new Error(
      'This library is not authorized for this domain. ' +
        'Please contact your CSM for more information.'
    );
    dynamicDeniedError.code = 'dynamic_host_not_allowed';
    throw dynamicDeniedError;
  }

  /**
   * Returns the host of the Turbine embed code, or an empty string if Dynamic Host
   * is not enabled.
   * @returns {string}
   */
  var memoizedHostResult;
  var getTurbineHost = function () {
    if (memoizedHostResult != null) {
      return memoizedHostResult;
    }

    if (shouldAugment) {
      // be sure we always force https to Adobe managed domains.
      // IE 10/11 returns the :443 protocol when modern browsers don't, so this replacement
      // is bringing every browser in line with the same return value
      var sanitizedHost = turbineUrl.host;
      if (/:80$/.test(sanitizedHost)) {
        sanitizedHost = sanitizedHost.replace(':80', '');
      } else if (/:80\/$/.test(sanitizedHost)) {
        sanitizedHost = sanitizedHost.replace(':80/', '');
      } else if (/:443$/.test(sanitizedHost)) {
        sanitizedHost = sanitizedHost.replace(':443', '');
      } else if (/:443\/$/.test(sanitizedHost)) {
        sanitizedHost = sanitizedHost.replace(':443/', '');
      }

      memoizedHostResult = 'https://' + sanitizedHost;
    } else {
      memoizedHostResult = '';
    }

    return memoizedHostResult;
  };

  /**
   * Returns a url decorated with the host of the Turbine embed code. If Dynamic host
   * is disabled, the original sourceUrl is returned unmodified.
   * @param sourceUrl
   * @returns {string|*}
   */
  var decorateWithDynamicHost = function (sourceUrl) {
    if (shouldAugment && typeof sourceUrl === 'string') {
      var urlParts = [
        getTurbineHost(),
        sourceUrl.charAt(0) === '/' ? sourceUrl.slice(1) : sourceUrl
      ];

      return urlParts.join('/');
    }

    return sourceUrl;
  };

  var dynamicHostResolver = {
    getTurbineHost: getTurbineHost,
    decorateWithDynamicHost: decorateWithDynamicHost,
    get isDynamicEnforced() {
      return isDynamicEnforced;
    }
  };

  if (window) {
    debugController.onDebugChanged(function (isEnabled) {
      if (isEnabled) {
        window.dynamicHostResolver = dynamicHostResolver;
      } else {
        delete window.dynamicHostResolver;
      }
    });
  }

  return dynamicHostResolver;
};
