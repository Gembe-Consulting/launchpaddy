sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/ComponentContainer",
	"sap/ui/model/json/JSONModel",
	"../services/HistoryProvider",
	"../services/NavigationProvider",
	"../services/URLParser",
	"../services/ComponentHandle",
	"../services/MetadataProvider"
], function(Controller, ComponentContainer, JSONModel, HistoryProvider, NavigationProvider, URLParser, ComponentHandle, MetadataProvider) {
	"use strict";

	/*global jQuery, sap, window, document, setTimeout, hasher*/

	return Controller.extend("de.app.launchpaddy.controller.Launcher", {
		onInit: function() {
/*			var oViewModel,
				fnSetAppNotBusy,
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
				this.getView().setBusy(true);
				oViewModel = new JSONModel({
					busy : true,
					delay : 0
				});
				this.getView().setModel(oViewModel, "appView");

				fnSetAppNotBusy = function() {
					oViewModel.setProperty("/busy", false);
					oViewModel.setProperty("/delay", iOriginalBusyDelay);
				};

				this.getOwnerComponent().getModel().metadataLoaded().then(fnSetAppNotBusy);
*/


			this.oConfig = (this.getView().getViewData() ? this.getView().getViewData().config : {}) || {};

			this.history = new HistoryProvider();

			this.oAppContainer = this.byId("application");

			this.oNavigationProvider = NavigationProvider.getInstance();

			this.oNavigationProvider.registerNavigationFilter(
				jQuery.proxy(this.handleEmptyHash, this)
			);

			this.oNavigationProvider.init(
				jQuery.proxy(this.onHashChange, this)
			);

			this.oAppContainer.attachNavigate(null, this.fnOnNavigate, this);
			this.oAppContainer.attachAfterNavigate(null, this.fnOnAfterNavigate, this);

		},
		
		onAfterRendering: function(){
			sap.ui.core.BusyIndicator.hide();
		},

		/*
		 * Sets application container based on information in URL hash.
		 *
		 * This is a callback registered with NavService. It's triggered
		 * whenever the url (or the hash fragment in the url) changes.
		 *
		 * NOTE: when this method is called, the new URL is already in the
		 *       address bar of the browser. Therefore back navigation is used
		 *       to restore the URL in case of wrong navigation or errors.
		 */
		onHashChange: function(sShellHash, sAppPart, sOldShellHash, sOldAppPart, oParseError) {

			var that = this,
				iOriginalHistoryLength = this.history.getHistoryLength(),
				oParsedShellHash,
				sIntent;

			// make sure, URL parser understands the current hash
			if (oParseError) {
				this.onNavigationError(iOriginalHistoryLength);
				return;
			}

			// track hash change
			this.history.hashChange(sShellHash, sOldShellHash);

			// remove leading '#' from hash
			sShellHash = this.fixShellHash(sShellHash);

			// parse hash to retrieve semantic object, action, parameters and inner-app navigation
			oParsedShellHash = URLParser.getInstance().parseShellHash(sShellHash);

			// create intent
			sIntent = oParsedShellHash ? oParsedShellHash.semanticObject + "-" + oParsedShellHash.action : "";

			// try to resolve hash into hash fragment
			this.resolve(sShellHash).done(function(oResolvedHashFragment) {

				// check if intendet Page is already loaded. 
				// In this is the case: 
				//  - destroy Page, if not root Page
				//  - return as existing Page, if root Page
				var oExistingPage = that.getRootAndDestroyExistingIfNotRoot(sIntent);

				if (oExistingPage) {
					// oExistingPage is already a Component, but we need to add a ComponentHandle
					// Todo: why?!
					oResolvedHashFragment.componentHandle = new ComponentHandle(oExistingPage);
					that.initiate(oResolvedHashFragment, sShellHash, oParsedShellHash, iOriginalHistoryLength);
					return;
				}

				// we need to create a new component from scratch
				that.createComponent(oResolvedHashFragment, oParsedShellHash)
					.done(function(oResolutionResultWithComponentHandle) {

						that.initiate(oResolvedHashFragment, sShellHash, oParsedShellHash, iOriginalHistoryLength);
						
						sap.ui.core.BusyIndicator.hide();

					}).fail(function() {
						var sErrorText = (arguments[0] ? arguments[0] + ": " : "");
						that.onNavigationError(iOriginalHistoryLength, sShellHash, sErrorText + "Could not create component");
					});

			}).fail(function() {
				var sErrorText = (arguments[0] ? arguments[0] + ": " : "");
				that.onNavigationError(iOriginalHistoryLength, sShellHash, sErrorText + "Could not resolve given hash");
			});

		},

		/**
		 * Tries to find a navigation target fragment.
		 * Triggered on navigation request, if hash is parseable.
		 * Returns resolved hash fragment.
		 */
		resolve: function(sShellHash) {

			var sFilePath,
				oResolvedHashFragment,
				oDeferred = new jQuery.Deferred();

			if (this.oConfig.testMode) {
				sFilePath = "../apps/resolvableTestTargets.json";
			} else {
				sFilePath = "./apps/resolvableTargets.json";
			}

			jQuery.getJSON(sFilePath, function(oJson) {
			
				var aResolvedTargets;

				if (!oJson) {
					oDeferred.reject("File not found");
				} else if (!oJson.apps) {
					oDeferred.reject("No apps in file");
				}
				
				// hack!
				sap.ui.getCore().setModel(new sap.ui.model.json.JSONModel(oJson.apps), "ResolvableApplicationTargets");

				aResolvedTargets = jQuery.grep(oJson.apps, function(app) {
					return app.intent === sShellHash;
				});

				if (!aResolvedTargets) {
					oDeferred.reject("Hash not found in app list");
				} else if (aResolvedTargets.length !== 1) {
					oDeferred.reject("Unambiguous Hash. App list results too many targets.");
				}

				oResolvedHashFragment = aResolvedTargets[0];

				oDeferred.resolve(oResolvedHashFragment);
			});

			return oDeferred.promise();
		},

		/**
		 * Creats the component based on given hash fragment using "sap.ui.component".
		 * Triggerd by successful hash fragment resolution.
		 * Returns the component encapsulated in a component handle.
		 */
		// TODO: Rework!
		createComponent: function(oAppProperties, oParsedShellHash, aWaitForBeforeInstantiation) {
			var oDeferred = new jQuery.Deferred(),

				sComponentUrl = oAppProperties && oAppProperties.url,
				oComponentProperties,
				bLoadCoreExt = true,
				bCoreExtAlreadyLoaded = true,
				bLoadDefaultDependencies = true,
				oApplicationDependencies = oAppProperties && oAppProperties.applicationDependencies || {},
				iIndex,
				oUrlData,
				oComponentData,
				bAmendedLoading = true,
				bCoreResourcesFullyLoaded = false;

			if (oAppProperties && oAppProperties.ui5ComponentName) {
				oComponentProperties = jQuery.extend(true, {}, oAppProperties.applicationDependencies);
				oComponentData = jQuery.extend(true, {
					startupParameters: {}
				}, oAppProperties.componentData);
				// add application configuration if specified
				if (oAppProperties.applicationConfiguration) {
					oComponentData.config = jQuery.extend(true, {}, oAppProperties.applicationConfiguration);
				}
				oComponentProperties.componentData = oComponentData;
				if (oAppProperties.hasOwnProperty("loadDefaultDependencies")) {
					bLoadDefaultDependencies = oAppProperties.loadDefaultDependencies;
				}
				bLoadDefaultDependencies = bLoadDefaultDependencies && bAmendedLoading;
				if (!oComponentProperties.asyncHints) {
					oComponentProperties.asyncHints =
						bLoadDefaultDependencies ? {
							"libs": ["sap.me", "sap.ui.unified"]
						} : {};
				}
				if (oAppProperties.hasOwnProperty("loadCoreExt")) {
					bLoadCoreExt = oAppProperties.loadCoreExt;
				}
				bCoreResourcesFullyLoaded = bLoadCoreExt && (bLoadCoreExt || bCoreExtAlreadyLoaded || (bAmendedLoading === false));

				if (aWaitForBeforeInstantiation) {
					oComponentProperties.asyncHints.waitFor = aWaitForBeforeInstantiation;
				}
				if (!oComponentProperties.name) {
					oComponentProperties.name = oAppProperties.ui5ComponentName;
				}
				if (sComponentUrl) {
					oComponentProperties.url = sComponentUrl;
				}
				oComponentProperties.async = true;
				if (oParsedShellHash) {
					oComponentProperties.id = "application-" + oParsedShellHash.semanticObject + "-" + oParsedShellHash.action + "-component";
				}

				// initiate new component
				sap.ui.component(oComponentProperties).then(function(oComponent) {
					// attach handle
					oAppProperties.componentHandle = new ComponentHandle(oComponent);
					if (bCoreResourcesFullyLoaded) {
						oAppProperties.coreResourcesFullyLoaded = true;
					}
					oDeferred.resolve(oAppProperties);
				}, function(vError) {
					var sMsg = "Failed to load UI5 component with properties '" + JSON.stringify(oComponentProperties) + "'.",
						vDetails;
					if (typeof vError === "object" && vError.stack) {
						vDetails = vError.stack;
					} else {
						vDetails = vError;
					}
					jQuery.sap.log.error(sMsg, vDetails, "se.app.launchpaddy.ComponentLoader");
					oDeferred.reject(vError);
				});
			} else {
				jQuery.sap.log.error("Something went wrong", null, "se.app.launchpaddy.ComponentLoader");
				oDeferred.reject();
			}

			return oDeferred.promise();
		},

		/**
		 * Enriches the hash fragment with metadate.
		 * Sets windows title depending on metadata.
		 * Triggerd by successful component creation.
		 * Triggers navigation to component of resolved hash fragment.
		 */
		initiate: function(oResolvedHashFragment, sShellHash, oParsedShellHash, iOriginalHistoryLength) {
			// TODO: Rework AppConfiguration
			var that = this,
				oMetadata = MetadataProvider.getInstance().getMetadata(oResolvedHashFragment);

			if (oMetadata.title) {
				window.document.title = oMetadata.title;
			} else if (oResolvedHashFragment.text) {
				window.document.title = oResolvedHashFragment.text;
			}

			try {

				this.navigate(oResolvedHashFragment, sShellHash, oParsedShellHash, oMetadata);

			} catch (oExc) {
				if (oExc.stack) {
					jQuery.sap.log.error("Application initialization (Intent: '" + sShellHash + "') failed due to an Exception:\n" + oExc.stack);
					that.onNavigationError(iOriginalHistoryLength, sShellHash, "Could not resolve given hash");
				}
			}
		},

		/**
		 * Performs navigation based on the given resolved hash fragment.
		 * Encapsulates the component into a sap.ui.ComponentContainer and adds the container into AppContainer.
		 * Triggert by successful initiation of the component.
		 * Triggers transition to new component.
		 */
		navigate: function(oResolvedHashFragment, sShellHash, oParsedShellHash, oMetadata) {

			var that = this,
				sAppId = '-' + oParsedShellHash.semanticObject + '-' + oParsedShellHash.action,
				bIsNavToHome = sShellHash === "#" ||
				(this.oConfig.rootIntent && this.oConfig.rootIntent === oParsedShellHash.semanticObject +
					"-" + oParsedShellHash.action),
				sIntent = oParsedShellHash ? oParsedShellHash.semanticObject + "-" + oParsedShellHash.action : "",
				oComponent = oResolvedHashFragment.componentHandle.getInstance(),
				iIndex = this.oAppContainer.getPages().length,
				oComponentContainer,
				oNewPage;

			if (bIsNavToHome && oComponent.oParent && this.oAppContainer.getPages().length >= 1) { // other pages not yet destroyed. Will be destroy on next navigation.
				this.oAppContainer.back(oComponent.getId());
				return;
			}

			oComponentContainer = new ComponentContainer("container-for" + sAppId, {
				component: oComponent,
				width: "100%",
				height: "100%"
			});

			this.oAppContainer.insertPage(oComponentContainer, iIndex)

			var sNewPageId = this.oAppContainer.getPages()[iIndex].getId();

			if (bIsNavToHome) {
				this.oAppContainer.insertPreviousPage(sNewPageId).backToPage(sNewPageId);
			} else {
				this.oAppContainer.to(sNewPageId);
			}

			return;
		},

		/**
		 * Forces the hash to become root intent, if hash is empty.
		 */
		handleEmptyHash: function(sHash) {
			sHash = (typeof sHash === "string") ? sHash : "";
			sHash = sHash.split("?")[0];
			if (sHash.length === 0) {
				if (this.oConfig && this.oConfig.rootIntent) {
					var sRootIntent = this.oConfig.rootIntent;
					setTimeout(function() {
						hasher.setHash(sRootIntent);
					}, 0);
					return this.oNavigationProvider.NavigationFilterStatus.Abandon;
				}
			}
			return this.oNavigationProvider.NavigationFilterStatus.Continue;
		},

		getRootAndDestroyExistingIfNotRoot: function(sIntent) {
			var sIntentedPageId = "container-for-" + sIntent,
				sRootPageId = "container-for-" + this.oConfig.rootIntent, //application-Shell-home-component
				oExistingRootPage = this.oAppContainer.getPage(sRootPageId),
				oIntentedPage = this.oAppContainer.getPage(sIntentedPageId);

			//if the page/app we are about to create already exists, we need to destroy it before
			//we go on with the flow. we have to destroy the existing page since we need to avoid
			//duplicate ID's 
			//In case that we are navigating to the root intent, we do not destroy the page.
			if (oIntentedPage && sIntentedPageId !== sRootPageId) {
				this.oAppContainer.getPage(sIntentedPageId).destroy();
				return null;
			} else if (oExistingRootPage && sIntentedPageId === sRootPageId) {
				return oExistingRootPage;
			}

			return null;
		},

		onNavigationError: function(iPreviousHistorySteps, sHash, sMessageText) {

			jQuery.sap.require("sap.m.MessageBox");

			sap.m.MessageBox.show(
				"Error: " + sMessageText, {
					icon: sap.m.MessageBox.Icon.ERROR,
					title: "Error during navigatin to '" + sHash + "'",
					onClose: function(oAction) {
						/ * do something * /
					}
				}
			);

			if (iPreviousHistorySteps === 0) {
				hasher.setHash(""); // if started with an illegal shell hash (deep link), we just remove the hash
			} else {
				window.history.back(1); // navigate to the previous URL
			}

			sap.ui.core.BusyIndicator.hide();

		},

		fixShellHash: function(sShellHash) {
			if (!sShellHash) {
				sShellHash = '#';
			} else if (sShellHash.charAt(0) !== '#') {
				sShellHash = '#' + sShellHash;
			}
			return sShellHash;
		},
		fnOnAfterNavigate: function(oEvent) {
			jQuery.sap.log.debug("Launchpaddy navigation finished.",
				"The event is fired when navigation between two pages has completed. In case of animated transitions this event is fired with some delay after the 'navigate' event.",
				"de.app.launchpaddy.Launcher");
		},
		fnOnNavigate: function(oEvent) {
			jQuery.sap.log.debug("Launchpaddy navigation starting.",
				"The event is fired when navigation between two pages has been triggered. The transition (if any) to the new page has not started yet. This event can be aborted by the application with preventDefault(), which means that there will be no navigation.",
				"de.app.launchpaddy.Launcher");
		}
	});
}, true);