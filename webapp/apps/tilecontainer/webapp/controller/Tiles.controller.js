sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel"
], function(Controller, JSONModel) {
	"use strict";
	
	return Controller.extend("de.app.tilecontainer.controller.Tiles", {
		
		S_MODEL_NAME : "AppTiles",
		
		onInit: function() {

			this._oApplicationList = sap.ui.getCore().getModel("ResolvableApplicationTargets").getData();
			this._oApplicationList = {
				apps: this._oApplicationList
			};

			this._oFilteredAppTileModel = new JSONModel(this._oApplicationList);

			this.getView().setModel(this._oFilteredAppTileModel, this.S_MODEL_NAME);

		},

		appTileListFactory: function(sId, oContext) {
			var oTileControl = null;

			oTileControl = new sap.m.StandardTile(sId, {
				title: oContext.getProperty("title")
				,info: oContext.getProperty("info")
				// ,infoState: oContext.getProperty("infoState")
				// ,activeIcon: oContext.getProperty("activeIcon")
				// ,number: oContext.getProperty("number")
			});

			oTileControl.attachPress(this.onAppTilePress, this);

			oTileControl.addCustomData(new sap.ui.core.CustomData({
				key: "tileAppUrl",
				value: oContext.getProperty("intent")
			}));

			return oTileControl;
		},

		onAppSearch: function(oControlEvent) {
			var sSearchString = oControlEvent.getParameter("query"),
				bClearSearch = oControlEvent.getParameter("clearButtonPressed"),
				oSearchControl = oControlEvent.getSource();

			if (bClearSearch) {
				this.resetFilterTiles();
				return;
			}
			
			sSearchString = this._cleanupSearchInput(sSearchString);

			if (sSearchString && oSearchControl) {
				this.searchApplicationTile(sSearchString);
			}
			
		},

		onAppLiveSearch: function(oControlEvent) {
			var sSearchString = oControlEvent.getParameter("newValue"),
				oSearchControl = oControlEvent.getSource();

			this.resetFilterTiles();
			
			sSearchString = this._cleanupSearchInput(sSearchString);

			if (sSearchString && sSearchString !== "" && oSearchControl) {
				this.searchApplicationTile(sSearchString);
			}

		},

		searchApplicationTile: function(sSearchString) {
			var oFilterResult,
				oAvailableApplications = this.getApplications(),
				aSearchStringList = sSearchString.split(" ");

			oFilterResult = jQuery.grep(oAvailableApplications, function(app) {
				for (var key in app) {
					for(var i = 0; i < aSearchStringList.length; i++){
						if ((typeof app[key] === "string") && app[key].toLowerCase().indexOf(aSearchStringList[i]) !== -1) {
							return true;
						}	
					}
				}
				return false;
			});

			this.filterTiles(oFilterResult, aSearchStringList);
		},

		filterTiles: function(oFilterResult, aSearchStringList) {
			this._oFilteredAppTileModel.setData({
				apps: oFilterResult
			});
			
			this.getView().setModel(this._oFilteredAppTileModel, this.S_MODEL_NAME);
			
			this.highlightSearchText(aSearchStringList);
		},

		highlightSearchText: function(aSearchStringList) {
			$(".sapMTileContent").highlight(aSearchStringList);
		},

		unhighlightSearchText: function() {
			$(".sapMTileContent").unhighlight();
		},

		resetFilterTiles: function() {
			this._oFilteredAppTileModel = new JSONModel(this._oApplicationList);
			
			this.getView().setModel(this._oFilteredAppTileModel, this.S_MODEL_NAME);
			
			this.unhighlightSearchText();
		},

		getApplications: function() {
			return this.getApplicationModel().getData();
		},

		getApplicationModel: function() {
			if (!this._oAppTileModel) {
				this._oAppTileModel = sap.ui.getCore().getModel("ResolvableApplicationTargets");
			}
			return this._oAppTileModel;
		},

		onAppTilePress: function(oControlEvent) {
			this.handleAppTilePress(oControlEvent);
		},

		handleAppTilePress: function(oControlEvent) {
			var oSource = oControlEvent.getSource();
			jQuery.sap.log.info(oSource.data("tileAppId") + " navigate to " + oSource.data("tileAppUrl"), oSource);
			this._navigateToTileApp(oSource.data());
		},
		
		_cleanupSearchInput: function(sSearchString){
			
			if(typeof sSearchString !== "string"){
				return null;
			}
			
			return sSearchString.trim().toLowerCase();
		},

		_navigateToTileApp: function(oTileData) {
			if (oTileData.tileAppUrl) {
				if (oTileData.tileAppUrl[0] === "#") {
					hasher.setHash(oTileData.tileAppUrl);
				} else {
					window.open(oTileData.tileAppUrl, "_blank");
				}
			}
		}
	});
});