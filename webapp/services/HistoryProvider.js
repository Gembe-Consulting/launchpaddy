sap.ui.define(function() {
	"use strict";
	
	var HistoryProvider = function() {
		this._history = [];
		this.backwards = false;
		this._historyPosition = -1;
		this._virtual = {};
	};

	HistoryProvider.prototype.hashChange = function(newHash, oldHash) {
		var historyIndex = this._history.indexOf(newHash);

		//new history entry
		if (historyIndex === -1) {
			//new item and there where x back navigations before - remove all the forward items from the history
			if (this._historyPosition + 1 < this._history.length) {
				this._history = this._history.slice(0, this._historyPosition + 1);
			}

			this._history.push(newHash);

			this._historyPosition += 1;
			this.backwards = false;
			this.forwards = false;
		} else {
			//internalNavigation
			this.backwards = this._historyPosition > historyIndex;
			this.forwards = this._historyPosition < historyIndex;

			this._historyPosition = historyIndex;
		}
	};

	HistoryProvider.prototype.pop = function() {
		var sLastHistory;
		if (this._history.length > 0) {
			sLastHistory = this._history.pop();
			this._historyPosition--;
		}
		return sLastHistory;
	};

	HistoryProvider.prototype.isVirtualHashchange = function(newHash, oldHash) {
		//the old hash was flagged as virtual
		return this._virtual.hasOwnProperty(oldHash) &&
			//the new Hash is the current One
			this.getCurrentHash() === newHash &&
			//the history has forward entries
			this._history.length - 1 > this._historyPosition &&
			//the old hash was the hash in the forward history direction
			this._history[this._historyPosition + 1] === oldHash;
	};

	HistoryProvider.prototype.setVirtualNavigation = function(hash) {
		this._virtual[hash] = true;
	};

	HistoryProvider.prototype.getCurrentHash = function() {
		return this._history[this._historyPosition] || null;
	};

	HistoryProvider.prototype.getHashIndex = function(hash) {
		return this._history.indexOf(hash);
	};

	HistoryProvider.prototype.getHistoryLength = function() {
		return this._history.length;
	};

	return HistoryProvider;

}, /* bExport= */ true);