sap.ui.define([
    "./HashProvider"
], function (HashProvider) {
    "use strict";
    /*global hasher */
    
	var _oNavigationProvider;
	
    var NavigationProvider = function() {

        // instantiate and exchange the HashChanger from UI5
        this.hashChanger = new HashProvider();
        
        /**
         * The navigation filter statuses that should be returned by a navigation filter
         */
        this.NavigationFilterStatus = this.hashChanger.NavigationFilterStatus;
        
        /**
         * Constructs the full shell hash and
         * sets it, thus triggering a navigation to it
         * @param {string} sAppHash specific hash
         * @param {boolean} bWriteHistory if true it adds a history entry in the browser if not it replaces the hash
         * @private
         */
        this.toAppHash = function (sAppHash, bWriteHistory) {
            this.hashChanger.toAppHash(sAppHash, bWriteHistory);
        };

        /**
         * Initializes ShellNavigation
         *
         * This function should be used by a custom renderer in order to implement custom navigation.
         *
         * This method should be invoked by the Shell in order to:
         * - Register the event listener
         * - Register the container callback for the (currently single) ShellHash changes.
         *
         * Signature of the callback function(
         *         sShellHashPart,  // The hash part on the URL that is resolved and used for application loading
         *         sAppSpecificPart // Typically ignored
         *         sOldShellHashPart, // The old shell hash part, if exist
         *         sOldAppSpecificPart, // The old app hash part, if exist
         *
         * @param {function} fnShellCallback The callback method for hash changes
         * @returns {object} this
         * @public
         */
        this.init = function (fnShellCallback) {
            hasher.prependHash = "";
            sap.ui.core.routing.HashChanger.replaceHashChanger(this.hashChanger);
            this.hashChanger.initShellNavigation(fnShellCallback);
            return this;
        };

        /**
         * Register the navigation filter callback function.
         * A navigation filter provides plugins with the ability to intervene in the navigation flow,
         * and optionally to stop the navigation.
         *
         * Use <code>Function.prototype.bind()</code> to determine the callback's <code>this</code> or
         * some of its arguments.
         *
         * @param {Object} fnFilter
         * 
         */
        this.registerNavigationFilter = function (fnFilter) {
            this.hashChanger.registerNavigationFilter(fnFilter);
        };
        
    };

    return {
        getInstance: function () {
            if (!_oNavigationProvider) {
                _oNavigationProvider = new NavigationProvider();
            }
            return _oNavigationProvider;
        }
    };

}, true /* bExport */);