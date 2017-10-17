/**
 * Define globals
 * Here we attach some objects we need for settings up Launchpaddy
 */
this.de = this.de || {};
this.de.app = this.de.app || {};
this.de.app.launchpaddy = this.de.app.launchpaddy || {};
/**
 * This is a self-executing funcion (function(){}())
 */
(function() {
	"use strict";
	/*global jQuery, window */

	/**
	 * Callback from UI5 bootstrap
	 */
	function fnUi5BootTask(fnCallbackWhenDone) {
		
		sap.ui.require(["sap/ui/core/BusyIndicator"],function(BusyIndicator){
			var iDelay = 0;
			sap.ui.core.BusyIndicator.show(iDelay);
		});
		
	
		jQuery.sap.log.info("Bootstrapping Launchpaddy from " + getBootstrapScriptPath());
		
		jQuery.sap.require("de.app.launchpaddy.services.PadContainer");
		
		de.app.launchpaddy.init().done(fnCallbackWhenDone);
	};
	
	/**
	 * Get the path of our own script; module paths are registered relative to this path, not
	 * relative to the HTML page we introduce an ID for the bootstrap script, similar to UI5;
	 * allows to reference it later as well
	 * @return {String} path of the bootstrap script
	 */
	function getBootstrapScriptPath() {
		return window.document.baseURI.split('?')[0].split('/').slice(0, -1).join('/') + '/';
	};

	/**
	 * Bootstrap is registered as sapui5 boot task.
	 * This callback is useful for sending asynchronous back-end requests at the earliest opportunity without delaying
	 * the core bootstrap of SAPUI5 and the Unified Shell container.
	 */
	window['sap-ui-config'] = {
		"xx-bootTask": fnUi5BootTask
	};

}());