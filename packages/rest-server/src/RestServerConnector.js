const { Connector } = require('@cedalo/sdk-streams');
const { EventEmittingRESTServer } = require('@cedalo/rest-server-core');

module.exports = class RestConsumer extends Connector {
	constructor(streamConfig) {
		super(streamConfig);
		this._restServer = undefined;
		this._pendingRequests = new Map();
		this._handlers = new Map();
	}

	async connect() {
		if (typeof this._restServer === 'undefined') {
			this._restServer = EventEmittingRESTServer.instance();
			if (this.config.topics) {
				const { baseUrl } = this.config.connector;
				// this._unregisterListeners();
				this._registerListeners(this.config.topics, baseUrl);
			}
			await this._restServer.start();
		}
		this.setConnected();
	}

	async dispose() {
		this._unregisterListeners();
		this._handlers.clear();
	}

	_registerListeners(topics, baseUrl = '') {
		if (!Array.isArray(topics)) {
			return;
		}

		const uniqueTopics = new Set(topics.map((topic) => [baseUrl, topic].join('/').replace(/\/+/, '/').replace(/^\//, '')));
		uniqueTopics.forEach((topic) => {
			this._restServer.timeoutProvider = this;
			this._handlers.set(topic, (message) =>
				this.onMessage(topic, message)
			);
			this._restServer.on(topic, this._handlers.get(topic));
		});
	}

	_unregisterListeners() {
		this._handlers.forEach((value, key) => {
			this._restServer.off(key, value);
		});
	}
};
