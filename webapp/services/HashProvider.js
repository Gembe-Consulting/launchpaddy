sap.ui.define([
    "sap/ui/core/routing/HashChanger",
    "sap/ui/thirdparty/hasher",
    "./URLParser"
], function (HashChanger, hasher, URLParser) {
    "use strict";

    var HashProvider = HashChanger.extend("launchpaddy.services.HashProvider", {

        constructor : function (oConfig) {

            sap.ui.core.routing.HashChanger.apply(this);
            
            this._bHashProviderInitialized = false;
            this._fnShellCallback = null;
            this._appHashPrefix = "&/";
            this._hashPrefix = "#";
            this.aNavigationFilters = [];
            this.NavigationFilterStatus = {
                Continue : "Continue",
                Custom   : "Custom",
                Abandon  : "Abandon"
            };

            /**
             * obtain the current shell hash (with #) urlDecoded
             * @return {string} shell hash
             */
            this._getCurrentShellHash = function () {
                var res = this._splitHash(hasher.getHash());
                return { hash : "#" + ((res && res.shellPart) ? res.shellPart : "") };
            };

            /**
             * construct the next hash, with #
             * @param {string} sAppSpecific Application specific hash
             * @return {string} constructed full hash
             */
            this._constructHash = function (sAppSpecific) {
                var o = this._getCurrentShellHash();
                o.hash = o.hash + sAppSpecific;
                return o;
            };

            /**
             * internal, without #
             * @param {object} oShellHash shell hash concept
             * @return {string} return constructed string
             */
            this._constructShellHash = function (oShellHash) {
                return URLParser.getInstance().constructShellHash(oShellHash);
            };

            /** 
             * split a shell hash into app and shell specific part
             *  @returns <code>null</code>, if sHash is not a valid hash (not parseable);
             *      otherwise an object with properties <code>shellPart</code> and <code>appSpecificRoute</code>
             *      the properties are <code>null</code> if sHash is falsy
             */
            this._splitHash = function (sHash) {
                var oShellHash,
                    oShellHashParams,
                    sAppSpecificRoute;

                if (sHash === undefined || sHash === null || sHash === "") {
                    return {
                        shellPart : null,
                        appSpecificRoute : null,
                        intent: null,
                        params: null
                    };
                }
                // break down hash into parts
                // "#SO-ABC~CONTXT?ABC=3A&DEF=4B&/detail/1?A=B");
                oShellHash =  URLParser.getInstance().parseShellHash(sHash);
                if (oShellHash === undefined || oShellHash === null) {
                    return null;
                }

                oShellHashParams = (oShellHash.params && !jQuery.isEmptyObject(oShellHash.params)) ? oShellHash.params : null;
                sAppSpecificRoute = oShellHash.appSpecificRoute;
                oShellHash.appSpecificRoute = undefined;
                return {
                    shellPart : this._stripLeadingHash(this._constructShellHash(oShellHash)) || null,
                    appSpecificRoute : sAppSpecificRoute || null, // ,"&/detail/1?A=B");
                    intent: (oShellHash.semanticObject && oShellHash.action
                        && (oShellHash.semanticObject + "-" + oShellHash.action + (oShellHash.contextRaw || ""))) || null,
                    params: oShellHashParams
                };
            };

            /**
             * internal, central navigation hook that trigger hash change
             * triggers events and sets the hash
             * @param {string} sFullHash full shell hash
             * @param {string} sAppHash application specific hash
             * @param {boolean} bWriteHistory whether to create a history record (true, undefined) or replace the hash (false)
             */
            this._setHash = function (sFullHash, sAppHash, bWriteHistory) {
                hasher.prependHash = "";
                sFullHash = this._stripLeadingHash(sFullHash);
                sAppHash = sAppHash || "";
                if (bWriteHistory === undefined) {
                    bWriteHistory = true;
                }
                // don't call method on super class
                // we set the full hash and fire the events for the app-specific part only
                // this is necessary for consistency of all events; hashSet and hashReplaced are
                // evaluated by sap.ui.core.routing.History
                if (bWriteHistory) {
                    this.fireEvent("hashSet", { sHash : sAppHash });
                    hasher.setHash(sFullHash);
                } else {
                    this.fireEvent("hashReplaced", { sHash : sAppHash });
                    hasher.replaceHash(sFullHash);
                }
            };

            this._stripLeadingHash = function (sHash) {
                if (sHash[0] === '#') {
                    return sHash.substring(1);
                }
                return sHash;
            };
            
            this._getAppHash = function (oArgs) {
                var sAppHash, oShellHash;
                if (oArgs && oArgs.target && (typeof oArgs.target.shellHash === "string")) {
                    oShellHash = URLParser.getInstance().parseShellHash(oArgs.target.shellHash);
                    sAppHash = oShellHash && oShellHash.appSpecificRoute;
                    sAppHash = sAppHash && sAppHash.substring(2);
                }
                return sAppHash;
            };
            
            this.registerNavigationFilter = function (fnFilter) {
                if (typeof fnFilter !== "function") {
                    throw new Error("fnFilter must be a function");
                }
                this.aNavigationFilters.push(fnFilter);
            };

            /**
             * constructs the full shell hash and sets it, thus triggering a navigation to it
             * @param {string} sAppHash specific hash
             * @param {boolean} bWriteHistory if true it adds a history entry in the browser if not it replaces the hash
             */
            this.toAppHash = function (sAppHash, bWriteHistory) {
                var sHash = this._constructHash(this._appHashPrefix + sAppHash).hash;
                this._setHash(sHash, sAppHash, bWriteHistory);
            };
        }
    });


    /**
     * Initialization for the shell navigation.
     *
     * This will start listening to hash changes and also fire a hash changed event with the initial hash.
     * @param {function} fnShellCallback Shell callback
     * @protected
     * @return {boolean} false if it was initialized before, true if it was initialized the first time
     */
    HashProvider.prototype.initShellNavigation = function (fnShellCallback) {

        if (this._bHashProviderInitialized) {
            jQuery.sap.log.info("initShellNavigation already called on this ShellNavigationHashChanger instance.");
            return false;
        }

        this._fnShellCallback = fnShellCallback;

        hasher.changed.add(this.treatHashChanged, this); //parse hash changes

        if (!hasher.isActive()) {
            hasher.initialized.addOnce(this.treatHashChanged, this); //parse initial hash
            hasher.init(); //start listening for history change
        } else {
            this.treatHashChanged(hasher.getHash());
        }
        this._bHashProviderInitialized = true;
        return true;
    };

    /**
     * Initialization for the application
     *
     * The init method of the base class is overridden, because the hasher initialization (registration for hash changes) is already done
     * in <code>initShellNavigation</code> method. The application-specific initialization ensures that the application receives a hash change event for the
     * application-specific part if set in the  initial hash.
     * @return {boolean} false if it was initialized before, true if it was initialized the first time
     * @protected
     */
    HashProvider.prototype.init = function () {

        if (this._initialized) {
            jQuery.sap.log.info("init already called on this ShellNavigationHashChanger instance.");
            return false;
        }
        // fire initial hash change event for the app-specific part
        var oNewHash = this._splitHash(hasher.getHash()),
            sAppSpecificRoute = oNewHash && (oNewHash.appSpecificRoute || "  ").substring(2);  // strip &/
        this.fireEvent("hashChanged", { newHash : sAppSpecificRoute });
        this._initialized = true;
        return true;
    };

    /**
     * Fires the hashchanged event, may be extended to modify the hash before firing the event
     * @param {string} newHash the new hash of the browser
     * @param {string} oldHash - the previous hash
     * @protected
     */
    HashProvider.prototype.treatHashChanged = function (newHash, oldHash) {

        if (this.inAbandonFlow) {
            // in case and navigation was abandon by a navigation filter, we ignore the hash reset event
            return;
        }

        var sAppSpecificRoute,
            sOldAppSpecificRoute,
            oNewHash,
            oOldHash,
            sNewIntent,
            sOldIntent,
            oError,
            sFilterResult;

        oNewHash = this._splitHash(newHash);
        oOldHash = this._splitHash(oldHash);

        if (!oNewHash) {
            oError = new Error("Illegal new hash - cannot be parsed: '" + newHash + "'");
            this.fireEvent("shellHashChanged", {
                newShellHash : newHash,
                newAppSpecificRoute : null,
                oldShellHash : (oOldHash ? oOldHash.shellPart : oldHash),
                error: oError
            });
            this._fnShellCallback(newHash, null, (oOldHash ? oOldHash.shellPart : oldHash), (oOldHash ? oOldHash.appSpecificRoute : null), oError);
            return;
        } else {
            sNewIntent = oNewHash.intent;
        }

        if (!oOldHash) {
            oOldHash = {
                shellPart: oldHash,
                appSpecificRoute: null
            };
        } else {
            sOldIntent = oOldHash.intent;
        }

        //call all navigation filters
        for (var i = 0; i < this.aNavigationFilters.length; i ++) {
            try {
                sFilterResult = this.aNavigationFilters[i].call(undefined, newHash, oldHash);
                if (sFilterResult === this.NavigationFilterStatus.Custom) {
                    //filter is handling navigation - stop the navigation flow.
                    return;
                }
                if (sFilterResult === this.NavigationFilterStatus.Abandon) {
                    //filter abandon this navigation, therefore we need to reset the hash and stop the navigation flow
                    this.inAbandonFlow = true;
                    hasher.replaceHash(oldHash);
                    this.inAbandonFlow = false;
                    return;
                }
            } catch (e) {
                jQuery.sap.log.error("Error while calling Navigation filter! ignoring filter...", e.message, "de.app.launchpaddy.HashProvider");
            }
        }

        if (sNewIntent === sOldIntent && (oldHash !== undefined)) { // second condition holds true for initial load where we always want to trigger the shell navigation

            if (!this._parametersChanged(oNewHash.params, oOldHash.params)) {	// app specific change only !
                sAppSpecificRoute = (oNewHash.appSpecificRoute || "  ").substring(2);  // strip &/
                sOldAppSpecificRoute = (oOldHash.appSpecificRoute || "  ").substring(2);  // strip &/
                jQuery.sap.log.info("Inner App Hash changed from '" + sOldAppSpecificRoute + "' to '" + sAppSpecificRoute + "'", null, "de.app.launchpaddy.HashProvider");
                // an empty string has to be propagated!
                this.fireEvent("hashChanged", { newHash : sAppSpecificRoute, oldHash : sOldAppSpecificRoute });
                return;
            }
        }
        	
        jQuery.sap.log.info("Outer shell hash changed from '" + oldHash + "' to '" + newHash + "'", null, "de.app.launchpaddy.HashProvider");

		var iDelay = 0;
		sap.ui.core.BusyIndicator.show(iDelay);

        // all Shell specific callback -> load other app !
        this.fireEvent("shellHashChanged", { newShellHash : oNewHash.shellPart, newAppSpecificRoute : oNewHash.appSpecificRoute, oldShellHash :  oOldHash.shellPart, oldAppSpecificRoute : oOldHash.appSpecificRoute});
        this._fnShellCallback(oNewHash.shellPart, oNewHash.appSpecificRoute, oOldHash.shellPart, oOldHash.appSpecificRoute);
    };

    /**
     * Checks whether shell hash parameters have changed
     * @param {object} oNewParameters the new parameters
     * @param {object} oOldParameters the new parameters
     * @returns {boolean} <code>true</code> if oNewParameters are not equal to oOldParameters
     */
    HashProvider.prototype._parametersChanged = function (oNewParameters, oOldParameters) {
        return !jQuery.sap.equal(oNewParameters, oOldParameters);
    };

    /**
     * Sets the hash to a certain value, this hash is prefixed by the shell hash if present
     * @param {string} sHash the hash
     *  adds a history entry in the browser if not it replaces the hash
     * @protected
     */
    HashProvider.prototype.setHash = function (sHash) {
        this.toAppHash(sHash, /*bWriteHistory*/true);
    };

    /**
     * Replaces the hash to a certain value. When using the replace function no browser history is written.
     * If you want to have an entry in the browser history, please use set setHash function.
     * this function has a side effect
     * @param {string} sHash the hash
     * @protected
     */
    HashProvider.prototype.replaceHash = function (sHash) {
        this.toAppHash(sHash, /* bWriteHistory */false);
    };

    /**
     * Gets the current hash
     *
     * Override the implementation of the base class and just return the application-specific hash part
     * @returns {string} returned string
     * @protected
     */
    HashProvider.prototype.getHash = function () {
        return this.getAppHash();
    };

    /**
     * Gets the current application-specific hash part
     *
     * @returns {string} the current application hash
     * @_ate
     */
    HashProvider.prototype.getAppHash = function () {
        var oNewHash = this._splitHash(hasher.getHash()),
            sAppSpecificRoute = oNewHash && (oNewHash.appSpecificRoute || "  ").substring(2);  // strip &/
        return sAppSpecificRoute;
    };

    /**
     * Cleans the event registration
     * @see sap.ui.base.Object.prototype.destroy
     * @protected
     */
    HashProvider.prototype.destroy = function () {
        hasher.changed.remove(this.treatHashChanged, this);
        sap.ui.core.routing.HashChanger.prototype.destroy.apply(this, arguments);
    };

    return HashProvider;
}, true);