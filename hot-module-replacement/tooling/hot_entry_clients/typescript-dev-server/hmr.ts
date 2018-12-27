/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra, AlexLeung
*/
/*globals __webpack_hash__ */
export const RELOAD_SIGNAL = 'TypeScriptDevServerReload';
var hotEmitter = require("../webpack/emitter");
function reload() {
    hotEmitter.emit(RELOAD_SIGNAL);
}
if (module.hot) {
	var lastHash;
	var upToDate = function upToDate() {
		return lastHash.indexOf(__webpack_hash__) >= 0;
	};
	var log = require("../webpack/log");
	var check = function check() {
		(module.hot as any)
			.check(true)
			.then(function(updatedModules) {
				if (!updatedModules) {
					log("warning", "[HMR] Cannot find update. Need to do a full reload!");
					log(
						"warning",
						"[HMR] (Probably because of restarting the webpack-dev-server)"
					);
					reload();
					return;
				}

				if (!upToDate()) {
					check();
				}

				require("../webpack/log-apply-result")(updatedModules, updatedModules);

				if (upToDate()) {
					log("info", "[HMR] App is up to date.");
				}
			})
			.catch(function(err) {
				var status = module.hot.status();
				if (["abort", "fail"].indexOf(status) >= 0) {
					log(
						"warning",
						"[HMR] Cannot apply update. Need to do a full reload!"
					);
					log("warning", "[HMR] " + err.stack || err.message);
					reload();
				} else {
					log("warning", "[HMR] Update failed: " + err.stack || err.message);
				}
			});
	};
	hotEmitter.on("webpackHotUpdate", function(currentHash) {
		lastHash = currentHash;
		if (!upToDate()) {
			var status = module.hot.status();
			if (status === "idle") {
				log("info", "[HMR] Checking for updates on the server...");
				check();
			} else if (["abort", "fail"].indexOf(status) >= 0) {
				log(
					"warning",
					"[HMR] Cannot apply update as a previous update " +
						status +
						"ed. Need to do a full reload!"
                );
                reload();
			}
		}
	});
	log("info", "[HMR] Waiting for update signal from WDS...");
} else {
	throw new Error("[HMR] Hot Module Replacement is disabled.");
}
