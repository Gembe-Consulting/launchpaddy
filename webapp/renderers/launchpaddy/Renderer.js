sap.ui.define(["sap/ui/core/UIComponent"],
	function(UIComponent) {
		"use strict";
		var LaunchpaddyRenderer = UIComponent.extend("de.app.launchpaddy.renderers.launchpaddy.Renderer", {
			metadata: {
				version: "0.1",
				dependencies: {
					version: "0.1",
					libs: ["sap.ui.core", "sap.m"],
					components: []
				}
			}
		});
		LaunchpaddyRenderer.prototype.createContent = function() {
			var oView,
				viewData = this.getComponentData() || {},
				oAppConfig = {
					applications: {
						"Shell-home": {}
					},
					rootIntent: "Shell-home"
				};

			if (viewData.config) {
				viewData.config = jQuery.extend(oAppConfig, viewData.config);
			}

			oView = sap.ui.view("launcherView", {
				type: sap.ui.core.mvc.ViewType.XML,
				viewName: "de.app.launchpaddy.view.Launcher",
				viewData: viewData
			});

			return oView;
		};

		return LaunchpaddyRenderer;

	}, true);