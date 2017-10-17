sap.ui.define([
	"sap/ushell/utils",
	"./URLParser"
], function(utils, URLParser) {
	"use strict";
	/*global jQuery, sap, window, hasher */
	var _oMetadataProvider;

	var MetadataProvider = function() {
			var oMetadata = {};

			/**
			 * Returns the current metadata.
			 *
			 * {
			 *      title: {string}
			 *      library: {string}
			 *      version: {string}
			 *      fullWidth: {boolean}
			 * }
			 *
			 * @returns {object} a copy of the metadata object
			 */
			this.getMetadata = function(oApplication) {
				if (!oApplication) {
					jQuery.sap.log.error("No Application provided.", null, "de.app.launchpaddy.MetadataProvider");
				}
				if (oApplication) {
					var sHash = hasher && hasher.getHash ? hasher.getHash() : '',
						sKey = this._processKey(sHash);
					if (!(oMetadata.hasOwnProperty(sKey)) || !oMetadata[sKey].complete) {
						this.addMetadata(oApplication, sKey);
					}
					if (!oMetadata[sKey]) {
						oMetadata[sKey] = {
							complete: false
						};
					}
					if (!oMetadata[sKey].title) {
						oMetadata[sKey].title = oApplication.text || oApplication.name || "UI5 Application";
					}
					return oMetadata[sKey];
				}
				return {};
			};

			/**
			 * Processes given key
			 */
			this._processKey = function(sCompleteHash) {
				var sIntent = sCompleteHash.split('?')[0],
					sParams = sCompleteHash.split('?')[1],
					sSplitedParams,
					oParams = {},
					aSortedParmasKeys,
					sProcessedParams = '',
					sPrefix = '',
					oParsedShellHash;
				if (sParams) {
					sSplitedParams = sParams.split('&');
					sSplitedParams.forEach(function(item) {
						var aCurrentParam = item.split('=');
						oParams[aCurrentParam[0]] = aCurrentParam[1];
					});
					aSortedParmasKeys = Object.keys(oParams).sort();
					aSortedParmasKeys.forEach(function(sKey, iIndex) {
						sPrefix = iIndex ? '&' : '?';
						sProcessedParams += sPrefix + sKey + '=' + oParams[sKey];
					});
					return sIntent + sProcessedParams;
				}
				oParsedShellHash = URLParser.getInstance().parseShellHash(sCompleteHash);
				sIntent = oParsedShellHash ? oParsedShellHash.semanticObject + "-" + oParsedShellHash.action : "";
				return sIntent;
			};

			/**
			 * Sets the title of the browser tabSets the title of the browser tab.
			 * @param {string} sTitle title
			 */
			this.setWindowTitle = function(sTitle) {
				window.document.title = sTitle;
			};

			/**
			 * Sets the icons of the browser.
			 * @param {object} oIconsProperties Icon properties An object holding icon URLs
			 */
			this.setIcons = function(oIconsProperties) {
				jQuery.sap.setIcons(oIconsProperties);
			};

			/**
			 * ApplicationName
			 */
			this.getApplicationName = function(oApplication) {
				/*jslint regexp: true */
				var aMatches,
					sAdditionalInformation = (oApplication && oApplication.additionalInformation) || null;
				if (sAdditionalInformation) {
					aMatches = /^SAPUI5\.Component=(.+)$/i.exec(sAdditionalInformation); // SAPUI5.Component=<fully-qualified-component-name>
					if (aMatches) {
						return aMatches[1];
					}
				}
				return null;
			};
			/**
			 * ApplicationUrl
			 */
			this.getApplicationUrl = function(oApplication) {
				var sUrl = (oApplication && oApplication.url) || null,
					iIndexOfQuestionmark;
				if (sUrl) {
					iIndexOfQuestionmark = sUrl.indexOf("?");
					if (iIndexOfQuestionmark >= 0) {
						sUrl = sUrl.slice(0, iIndexOfQuestionmark);
					}
					if (sUrl.slice(-1) !== '/') {
						sUrl += '/'; // ensure URL ends with a slash
					}
				}
				return sUrl;
			};

			/**
			 * Reads a property value from the configuration
			 */
			this.getPropertyValueFromConfig = function(oConfig, sPropertyKey, oResourceBundle) {
				var oValue;
				if (oResourceBundle && oConfig.hasOwnProperty(sPropertyKey + "Resource")) {
					oValue = oResourceBundle.getText(oConfig[sPropertyKey + "Resource"]);
				} else if (oConfig.hasOwnProperty(sPropertyKey)) {
					oValue = oConfig[sPropertyKey];
				}
				return oValue;
			};

			/**
			 * Reads a property value from the manifest
			 */
			this.getPropertyValueFromManifest = function(oLocalMetadataComponent, oProperties, sPropertyKey) {
				var sManifestEntryKey = oProperties[sPropertyKey].manifestEntryKey,
					sManifestPropertyPath = oProperties[sPropertyKey].path,
					oManifestEntry = oLocalMetadataComponent.getManifestEntry(sManifestEntryKey);

				return jQuery.sap.getObject(sManifestPropertyPath, undefined, oManifestEntry);
			};

			/**
			 * Adds the application metadata to oMetadata object.
			 * Application metadata is taken from the manifest/descriptor (1st priority), if exists, and from the component configuration (2nd priority).
			 *
			 * @param {object} oApplication Includes data for launching the application, such as applicationType, url, etc..
			 * @param {string} sKey - the complete url hash of the application which consists of the app Intent and the parameters in lexicographically sorted order.
			 */
			this.addMetadata = function(oApplication, sKey) {
				try {
					var sComponentName = this.getApplicationName(oApplication),
						sUrl = this.getApplicationUrl(oApplication),
						oLocalMetadataComponent,
						oConfig,
						oProperties = {
							"fullWidth": {
								"manifestEntryKey": "sap.ui",
								"path": "fullWidth"
							},
							"hideLightBackground": {
								"manifestEntryKey": "sap.ui",
								"path": "hideLightBackground"
							},
							"title": {
								"manifestEntryKey": "sap.app",
								"path": "title"
							},
							"icon": {
								"manifestEntryKey": "sap.ui",
								"path": "icons.icon"
							},
							"favIcon": {
								"manifestEntryKey": "sap.ui",
								"path": "icons.favIcon"
							},
							"homeScreenIconPhone": {
								"manifestEntryKey": "sap.ui",
								"path": "icons.phone"
							},
							"homeScreenIconPhone@2": {
								"manifestEntryKey": "sap.ui",
								"path": "icons.phone@2"
							},
							"homeScreenIconTablet": {
								"manifestEntryKey": "sap.ui",
								"path": "icons.tablet"
							},
							"homeScreenIconTablet@2": {
								"manifestEntryKey": "sap.ui",
								"path": "icons.tablet@2"
							},
							"startupImage320x460": {
								"manifestEntryKey": "sap.ui",
								"path": "icons.startupImage640x920"
							},
							"startupImage640x920": {
								"manifestEntryKey": "sap.ui",
								"path": "icons.startupImage640x920"
							},
							"startupImage640x1096": {
								"manifestEntryKey": "sap.ui",
								"path": "icons.startupImage640x1096"
							},
							"startupImage768x1004": {
								"manifestEntryKey": "sap.ui",
								"path": "icons.startupImage768x1004"
							},
							"startupImage748x1024": {
								"manifestEntryKey": "sap.ui",
								"path": "icons.startupImage748x1024"
							},
							"startupImage1536x2008": {
								"manifestEntryKey": "sap.ui",
								"path": "icons.startupImage1536x2008"
							},
							"startupImage1496x2048": {
								"manifestEntryKey": "sap.ui",
								"path": "icons.startupImage1496x2048"
							},
							"compactContentDensity": {
								"manifestEntryKey": "sap.ui5",
								"path": "contentDensities.compact"
							},
							"cozyContentDensity": {
								"manifestEntryKey": "sap.ui5",
								"path": "contentDensities.cozy"
							}
						},
						potentiallyRelativeUrls,
						sComponentUrl,
						isUrlRelative,
						bManifestExists,
						sPropertyKey,
						sConfigResourceBundleUrl,
						oResourceBundle,
						oComponentHandle = oApplication && oApplication.componentHandle;

					if (sKey) {
						if (!(oMetadata.hasOwnProperty(sKey))) {
							oMetadata[sKey] = {
								complete: false
							};
						}
						if (!oMetadata[sKey].complete) {
							if (oComponentHandle) {
								oLocalMetadataComponent = oComponentHandle.getMetadata();
							} else if (sComponentName) {
								jQuery.sap.log.warning("No component handle available for '" + sComponentName + "'; SAPUI5 component metadata is incomplete", null, "de.app.launchpaddy.MetadataProvider");
								return;
							}
							if (oLocalMetadataComponent) {
								oConfig = oLocalMetadataComponent.getConfig();
								bManifestExists = (oLocalMetadataComponent.getManifest() !== undefined);
								oMetadata[sKey].complete = true;
								if (oConfig) {
									sConfigResourceBundleUrl = oConfig.resourceBundle || "";
									if (sConfigResourceBundleUrl) {
										if (sConfigResourceBundleUrl.slice(0, 1) !== '/') {
											sConfigResourceBundleUrl = sUrl + sConfigResourceBundleUrl;
										}
										oResourceBundle = jQuery.sap.resources({
											url: sConfigResourceBundleUrl,
											locale: sap.ui.getCore().getConfiguration().getLanguage()
										});
									}
								}
								// Loop over all property names, and for each one - get the value from the manifest or from the application configuration
								for (sPropertyKey in oProperties) {
									if (oProperties.hasOwnProperty(sPropertyKey)) {
										if (bManifestExists) {
											// Get property value from the manifest
											oMetadata[sKey][sPropertyKey] = this.getPropertyValueFromManifest(oLocalMetadataComponent, oProperties, sPropertyKey);
										}
										if (oConfig && oMetadata[sKey][sPropertyKey] === undefined) {
											// Get property value from the configuration
											oMetadata[sKey][sPropertyKey] = this.getPropertyValueFromConfig(oConfig, sPropertyKey, oResourceBundle);
										}
									}
								}
								oMetadata[sKey].version = oLocalMetadataComponent.getVersion();
								oMetadata[sKey].libraryName = oLocalMetadataComponent.getLibraryName();
							} else {
								jQuery.sap.log.warning("No technical information for the given application could be determined", null, "de.app.launchpaddy.MetadataProvider");
							}
						}
						/*
						 * Special behavior for relative URLs:
						 * Relative URLs are considered relative to the folder containing the Component.js,
						 * which requires adjustments here. Otherwise the browser would interpret them as
						 * relative to the location of the HTML file, which might be different and also
						 * hard to guess for app developers.
						 */
						potentiallyRelativeUrls = [
							"favIcon",
							"homeScreenIconPhone",
							"homeScreenIconPhone@2",
							"homeScreenIconTablet",
							"homeScreenIconTablet@2",
							"startupImage320x460",
							"startupImage640x920",
							"startupImage640x1096",
							"startupImage768x1004",
							"startupImage748x1024",
							"startupImage1536x2008",
							"startupImage1496x2048"
						];
						sComponentUrl = (sUrl && sUrl[sUrl.length - 1] === '/') ? sUrl.substring(0, sUrl.length - 1) : sUrl;
						isUrlRelative = function(sUrl) {
							/*jslint regexp : true*/
							if (sUrl.match(/^https?:\/\/.*/)) {
								return false;
							}
							return sUrl && sUrl[0] !== '/';
						};
						potentiallyRelativeUrls.forEach(function(sPropName) {
							var sOrigValue = oMetadata[sKey][sPropName],
								sFinalValue = null;
							if (sOrigValue) {
								sFinalValue = isUrlRelative(sOrigValue) ?
									sComponentUrl + "/" + sOrigValue : sOrigValue;
							}
							oMetadata[sKey][sPropName] = sFinalValue;
						});
					}
				} catch (err) {
					jQuery.sap.log.error("Metadata could not be parsed", null, "de.app.launchpaddy.MetadataProvider");
				}
			};

		};

		return {
			getInstance: function() {
				if (!_oMetadataProvider) {
					_oMetadataProvider = new MetadataProvider();
				}
				return _oMetadataProvider;
			}
		};

}, true);