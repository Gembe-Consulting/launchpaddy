/*
 * The SAPUI5 framework has built-in support for modularizing comprehensive JavaScript applications. 
 * That means, instead of defining and loading one large bundle of JavaScript code, an application can be split into smaller parts 
 * which then can be loaded at runtime at the time when they are needed. These smaller individual files are called modules. 
 * 
 * sap.ui.define(sModuleName?, aDependencies?, vFactory, bExport?)
 * https://openui5.hana.ondemand.com/#/api/sap.ui
 * 
 */
sap.ui.define([], function() {
	"use strict";

	// privates
	var oConfig; // Will hold the configuration as read from window["sap-ushell-config"] during bootstrap

	// create a new class 'PadContainer'
	function PadContainer() {

		jQuery.sap.log.debug("You summoned the PaddyContainer", null, "de.app.launchpaddy.services.PadContainer");

		this.create = function(sRendererName, bTestMode) {

			console.log(oConfig);

			var oComponentData = {},
				sComponentName,
				oRenderer,
				oRendererControl,
				oRendererConfig;

			sRendererName = sRendererName || (oConfig && oConfig.renderer);

			if (!sRendererName) {
				throw new Error("Missing renderer name");
			}

			//check if we have the oConfig Object on hand, provided by startup script and defined in window["de-app-launchpaddy-config"]

			oRendererConfig = (oConfig && oConfig.renderers && oConfig.renderers[sRendererName]) || {};

			if (oRendererConfig.componentData && oRendererConfig.componentData.config) {
				// oComponentData = {
				// 	config: oRendererConfig.componentData.config
				// };
				oComponentData = oRendererConfig.componentData;
				jQuery.sap.log.info("Found componentData config from window[\"de-app-launchpaddy-config\"]:",
					JSON.stringify(oConfig), "de.app.launchpaddy.PadContainer");
			} else {
				oRendererConfig = {
					componentData: {
						config: {
							rootIntent: "Shell-home",
							testMode: bTestMode || false
						}
					}
				};
				jQuery.sap.log.info("Didnt't find componentData config from window[\"de-app-launchpaddy-config\"]. Using default instead:",
					JSON.stringify(oRendererConfig), "de.app.launchpaddy.PadContainer");
			}

			sComponentName = (sRendererName.indexOf(".") < 0 ? "de.app.launchpaddy.renderers." + sRendererName + ".Renderer" : sRendererName);

			jQuery.sap.require(sComponentName);

			oRenderer = new(jQuery.sap.getObject(sComponentName))({
				componentData: oComponentData
			});

			if (!oRenderer) {
				throw new Error("Renderer could not be created");
			}

			if (oRenderer instanceof sap.ui.core.UIComponent) {
				oRendererControl = new sap.ui.core.ComponentContainer({
					component: oRenderer,
					height: "100%",
					width: "100%"
				});
			}

			if (!oRendererControl) {
				throw new Error("Renderer Control could not be created");
			}

			if (!(oRendererControl instanceof sap.ui.core.Control)) {
				throw new Error("Renderer is not an instance of sap.ui.core.Control");
			}

			return oRendererControl;
		}
	};

	de.app.launchpaddy.init = function() {

		var oDeferred = new jQuery.Deferred();

		if (de.app.launchpaddy.PadContainer) {
			throw new Error("Container 'de.app.launchpaddy.PadContainer' already exists");
		}

		setTimeout(function() {

			de.app.launchpaddy.PadContainer = new PadContainer();

			oConfig = jQuery.extend({}, true, window["de-app-launchpaddy-config"] || {});

			oDeferred.resolve();
			
		}, 0);

		return oDeferred;
	};
});