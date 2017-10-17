sap.ui.define([
], function () {
    "use strict";
    var ComponentHandle = function (oComponent) {
    	if(!oComponent){ throw "No component for ComponentHandle provided"; }
        this._oComponent = oComponent;
    };
    ComponentHandle.prototype.getInstance = function () {
        return this._oComponent;
    };
    ComponentHandle.prototype.getMetadata = function () {
        return this._oComponent.getMetadata();
    };
    return ComponentHandle;
});