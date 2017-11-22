

const Actions = {};

Actions.DBM = null;

Actions.location = null;

Actions.server = {};
Actions.global = {};


/**
 *  Returns True/False if the specified action is a function.
 * 
 * @function exists
 * @memberOf Actions
 * @param {action} action The action to check that it is a Function
 * @returns {boolean} True if the action is a function, false if not.
 */
Actions.exists = function(action) {
	if(!action) return false;
	return typeof(this[action]) === 'function';
};

/**
 * Returns a file thats local to DBM (Within DBM's File Structure)
 *
 * @function getLocalFile
 * @memberOf Actions
 * @param {string} url The path to the Local File.
 * @returns {string} The full path of the file.
 */
Actions.getLocalFile = function(url) {
	return require('path').join(__dirname, '..', url);
};

/**
 * Returns DBM itself.
 * @function getDBM
 * @memberOf Actions
 * @returns {any} DBM
 */
Actions.getDBM = function() {
	return this.DBM;
};

/**
 * Returns a Variable thats within the Actions by Name
 * @function getActionVariable
 * @memberOf Actions
 * @param {any} name The name of the Variable.
 * @param {any} defaultValue If the variable doesn't exist, this value is returned.
 * @returns {any} The Variable.
 */
Actions.getActionVariable = function(name, defaultValue) {
	if(this[name] === undefined && defaultValue !== undefined) {
		this[name] = defaultValue;
	}
	return this[name];
};

/**
 * Evaluates code using DBM's variables.
 * @function eval
 * @memberOf Actions
 * @param {any} content 
 * @param {any} cache 
 * @returns {any} The Evaluated Content
 */
Actions.eval = function(content, cache) {
	if(!content) return false;
	const tempVars = this.getActionVariable.bind(cache.temp);
	let serverVars = null;
	if(cache.server) {
		serverVars = this.getActionVariable.bind(this.server[cache.server.id]);
	}
	const globalVars = this.getActionVariable.bind(this.global);
	const msg = cache.msg;
	const server = cache.server;
	let user = '', member = '', mentionedUser = '', mentionedChannel = '', defaultChannel = '';
	if(msg) {
		user = msg.author;
		member = msg.member;
		if(msg.mentions) {
			mentionedUser = msg.mentions.users.first() || '';
			mentionedChannel = msg.mentions.channels.first() || '';
		}
	}
	if(server) {
		defaultChannel = server.getDefaultChannel();
	}
	try {
		return eval(content);
	} catch(e) {
		console.error(e);
		return false;
	}
};

/**
 * Replaces ${variable("")} with the proper Variables.
 * @function evalMessage
 * @memberOf Actions
 * @param {any} content 
 * @param {any} cache 
 * @returns {any} The Evaluated Content
 */
Actions.evalMessage = function(content, cache) {
	if(!content) return '';
	if(!content.match(/\$\{.*\}/im)) return content;
	return this.eval('`' + content.replace(/`/g,'\\`') + '`', cache);
};


/**
 * TODO.
 * @function initMods
 * @memberOf Actions
 */
Actions.initMods = function() {
	const fs  = require('fs');
	fs.readdirSync(this.location).forEach(function(file) {
		if(file.match(/\.js/i)) {
			const action = require(require('path').join(this.location, file));
			this[action.name] = action.action;
			if(action.mod) {
				try {
					action.mod(this.DBM);
				} catch(e) {
					console.error(e);
				}
			}
		}
	}.bind(this));
};

/**
 * Checks conditions then Invokes the action matching the supplied command.
 * @function preformActions
 * @memberOf Actions
 * @param {any} msg 
 * @param {any} cmd 
 */
Actions.preformActions = function(msg, cmd) {
	if(this.checkConditions(msg, cmd)) {
		this.invokeActions(msg, cmd.actions);
	}
};

/**
 * TODO
 * @function checkConditions
 * @memberOf Actions
 * @param {any} msg 
 * @param {any} cmd 
 * @returns {TODO} 
 */
Actions.checkConditions = function(msg, cmd) {
	const isServer = Boolean(msg.guild && msg.member);
	const restriction = parseInt(cmd.restriction);
	const permissions = cmd.permissions;
	switch(restriction) {
		case 0:
			if(isServer) {
				return this.checkPermissions(msg, permissions);
			} else {
				return true;
			}
		case 1:
			return isServer && this.checkPermissions(msg, permissions);
		case 2:
			return isServer && msg.guild.owner === msg.member;
		case 3:
			return !isServer;
		case 4:
			const Files = this.DBM.Files;
			return Files.data.settings.ownerId && msg.author.id === Files.data.settings.ownerId;
		default:
			return true;
	}
};

/**
 * TODO
 * @function checkPermissions
 * @memberOf Actions
 * @param {any} msg 
 * @param {any} permissions 
 * @returns {TODO} 
 */
Actions.checkPermissions = function(msg, permissions) {
	const author = msg.member;
	if(!author) return false;
	if(permissions === 'NONE') return true;
	if(msg.guild.owner === author) return true;
	return author.permissions.has([permissions]);
};

/**
 * TODO
 * @function invokeActions
 * @memberOf Actions
 * @param {any} msg 
 * @param {any} actions 
 * @returns {TODO} 
 */
Actions.invokeActions = function(msg, actions) {
	const act = actions[0];
	if(!act) return;
	if(this.exists(act.name)) {
		const cache = {
			actions: actions,
			index: 0,
			temp: {},
			server: msg.guild,
			msg: msg
		}
		try {
			this[act.name](cache);
		} catch(e) {
			this.displayError(act, cache, e);
		}
	} else {
		console.error(act.name + " does not exist!");
	}
};

/**
 * TODO
 * @function invokeEvent
 * @memberOf Actions
 * @param {any} event 
 * @param {any} server 
 * @param {any} temp 
 * @returns {TODO} 
 */
Actions.invokeEvent = function(event, server, temp) {
	const actions = event.actions;
	const act = actions[0];
	if(!act) return;
	if(this.exists(act.name)) {
		const cache = {
			actions: actions,
			index: 0,
			temp: temp,
			server: server
		}
		try {
			this[act.name](cache);
		} catch(e) {
			this.displayError(act, cache, e);
		}
	} else {
		console.error(act.name + " does not exist!");
	}
};

/**
 * Calls the next Action in the sequence
 * @function callNextAction
 * @memberOf Actions
 * @param {any} cache 
 * @returns {TODO} 
 */
Actions.callNextAction = function(cache) {
	cache.index++;
	const index = cache.index;
	const actions = cache.actions;
	const act = actions[index];
	if(!act) {
		if(cache.callback) {
			cache.callback();
		}
		return;
	}
	if(this.exists(act.name)) {
		try {
			this[act.name](cache);
		} catch(e) {
			this.displayError(act, cache, e);
		}
	} else {
		console.error(act.name + " does not exist!");
	}
};

/**
 * TODO
 * @function getErrorString
 * @memberOf Actions
 * @param {any} data 
 * @param {any} cache 
 * @returns {TODO} 
 */
Actions.getErrorString = function(data, cache) {
	const type = data.permissions ? 'Command' : 'Event';
	return `Error with ${type} "${data.name}", Action #${cache.index + 1}`;
};

/**
 * TODO
 * @function displayError
 * @memberOf Actions
 * @param {any} data 
 * @param {any} cache 
 * @param {any} err 
 */
Actions.displayError = function(data, cache, err) {
	const dbm = this.getErrorString(data, cache);
	console.error(dbm + ":\n" + err);
	this.DBM.Events.onError(dbm, err.stack ? err.stack : err, cache);
};

/**
 * TODO
 * @function getSendTarget
 * @memberOf Actions
 * @param {any} type 
 * @param {any} varName 
 * @param {any} cache 
 * @returns {TODO} 
 */
Actions.getSendTarget = function(type, varName, cache) {
	const msg = cache.msg;
	const server = cache.server;
	switch(type) {
		case 0:
			if(msg) {
				return msg.channel;
			}
			break;
		case 1:
			if(msg) {
				return msg.author;
			}
			break;
		case 2:
			if(msg && msg.mentions) {
				return msg.mentions.users.first();
			}
			break;
		case 3:
			if(msg && msg.mentions) {
				return msg.mentions.channels.first();
			}
			break;
		case 4:
			if(server) {
				return server.getDefaultChannel();
			}
			break;
		case 5:
			return cache.temp[varName];
			break;
		case 6:
			if(server && this.server[server.id]) {
				return this.server[server.id][varName];
			}
			break;
		case 7:
			return this.global[varName];
			break;
		default:
			break;
	}
	return false;
};

/**
 * TODO
 * @function getMember
 * @memberOf Actions
 * @param {any} type 
 * @param {any} varName 
 * @param {any} cache 
 * @returns {TODO} 
 */
Actions.getMember = function(type, varName, cache) {
	const msg = cache.msg;
	const server = cache.server;
	switch(type) {
		case 0:
			if(msg && msg.mentions && msg.mentions.members) {
				return msg.mentions.members.first();
			}
			break;
		case 1:
			if(msg) {
				return msg.member || msg.author;
			}
			break;
		case 2:
			return cache.temp[varName];
			break;
		case 3:
			if(server && this.server[server.id]) {
				return this.server[server.id][varName];
			}
			break;
		case 4:
			return this.global[varName];
			break;
		default:
			break;
	}
	return false;
};

/**
 * TODO
 * @function getMessage
 * @memberOf Actions
 * @param {any} type 
 * @param {any} varName 
 * @param {any} cache 
 * @returns {TODO} 
 */
Actions.getMessage = function(type, varName, cache) {
	const msg = cache.msg;
	const server = cache.server;
	switch(type) {
		case 0:
			if(msg) {
				return msg;
			}
			break;
		case 1:
			return cache.temp[varName];
			break;
		case 2:
			if(server && this.server[server.id]) {
				return this.server[server.id][varName];
			}
			break;
		case 3:
			return this.global[varName];
			break;
		default:
			break;
	}
	return false;
};

/**
 * TODO
 * @function getServer
 * @memberOf Actions
 * @param {any} type 
 * @param {any} varName 
 * @param {any} cache 
 * @returns {TODO} 
 */
Actions.getServer = function(type, varName, cache) {
	const server = cache.server;
	switch(type) {
		case 0:
			if(server) {
				return server;
			}
			break;
		case 1:
			return cache.temp[varName];
			break;
		case 2:
			if(server && this.server[server.id]) {
				return this.server[server.id][varName];
			}
			break;
		case 3:
			return this.global[varName];
			break;
		default:
			break;
	}
	return false;
};

/**
 * TODO
 * @function getRole
 * @memberOf Actions
 * @param {any} type 
 * @param {any} varName 
 * @param {any} cache 
 * @returns {TODO} 
 */
Actions.getRole = function(type, varName, cache) {
	const msg = cache.msg;
	const server = cache.server;
	switch(type) {
		case 0:
			if(msg && msg.mentions && msg.mentions.roles) {
				return msg.mentions.roles.first();
			}
			break;
		case 1:
			if(msg && msg.member && msg.member.roles) {
				return msg.member.roles.first();
			}
			break;
		case 2:
			if(server && server.roles) {
				return server.roles.first();
			}
			break;
		case 3:
			return cache.temp[varName];
			break;
		case 4:
			if(server && this.server[server.id]) {
				return this.server[server.id][varName];
			}
			break;
		case 5:
			return this.global[varName];
			break;
		default:
			break;
	}
	return false;
};

/**
 * TODO
 * @function getChannel
 * @memberOf Actions
 * @param {any} type 
 * @param {any} varName 
 * @param {any} cache 
 * @returns {TODO} 
 */
Actions.getChannel = function(type, varName, cache) {
	const msg = cache.msg;
	const server = cache.server;
	switch(type) {
		case 0:
			if(msg) {
				return msg.channel;
			}
			break;
		case 1:
			if(msg && msg.mentions) {
				return msg.mentions.channels.first();
			}
			break;
		case 2:
			if(server) {
				return server.channels.first();
			}
			break;
		case 3:
			return cache.temp[varName];
			break;
		case 4:
			if(server && this.server[server.id]) {
				return this.server[server.id][varName];
			}
			break;
		case 5:
			return this.global[varName];
			break;
		default: 
			break;
	}
	return false;
};

/**
 * TODO
 * @function getList
 * @memberOf Actions
 * @param {any} type 
 * @param {any} varName 
 * @param {any} cache 
 * @returns {TODO} 
 */
Actions.getList = function(type, varName, cache) {
	const msg = cache.msg;
	const server = cache.server;
	switch(type) {
		case 0:
			if(server) {
				return server.members.array();
			}
			break;
		case 1:
			if(server) {
				return server.channels.array();
			}
			break;
		case 2:
			if(server) {
				return server.roles.array();
			}
			break;
		case 3:
			if(server) {
				return server.emojis.array();
			}
			break;
		case 4:
			return this.DBM.Bot.bot.guilds.array();
			break;
		case 5:
			if(msg && msg.mentions && msg.mentions.members) {
				return msg.mentions.members.first().roles.array();
			}
			break;
		case 6:
			if(msg && msg.member) {
				return msg.member.roles.array();
			}
			break;
		case 7:
			return cache.temp[varName];
			break;
		case 8:
			if(server && this.server[server.id]) {
				return this.server[server.id][varName];
			}
			break;
		case 9:
			return this.global[varName];
			break;
		default: 
			break;
	}
	return false;
};

/**
 * TODO
 * @function getVariable
 * @memberOf Actions
 * @param {any} type 
 * @param {any} varName 
 * @param {any} cache 
 * @returns {TODO} 
 */
Actions.getVariable = function(type, varName, cache) {
	const server = cache.server;
	switch(type) {
		case 1:
			return cache.temp[varName];
			break;
		case 2:
			if(server && this.server[server.id]) {
				return this.server[server.id][varName];
			}
			break;
		case 3:
			return this.global[varName];
			break;
		default:
			break;
	}
	return false;
};

/**
 * TODO
 * @function storeValue
 * @memberOf Actions
 * @param {any} value 
 * @param {any} type 
 * @param {any} varName 
 * @param {any} cache 
 */
Actions.storeValue = function(value, type, varName, cache) {
	const server = cache.server;
	switch(type) {
		case 1:
			cache.temp[varName] = value;
			break;
		case 2:
			if(server) {
				if(!this.server[server.id]) this.server[server.id] = {};
				this.server[server.id][varName] = value;
			}
			break;
		case 3:
			this.global[varName] = value;
			break;
		default:
			break;
	}
};

/**
 * TODO
 * @function executeResults
 * @memberOf Actions
 * @param {any} result 
 * @param {any} data 
 * @param {any} cache 
 */
Actions.executeResults = function(result, data, cache) {
	if(result) {
		const type = parseInt(data.iftrue);
		switch(type) {
			case 0:
				this.callNextAction(cache);
				break;
			case 2:
				const val = parseInt(this.evalMessage(data.iftrueVal, cache));
				const index = Math.max(val - 1, 0);
				if(cache.actions[index]) {
					cache.index = index - 1;
					this.callNextAction(cache);
				}
				break;
			case 3:
				const amnt = parseInt(this.evalMessage(data.iftrueVal, cache));
				const index2 = cache.index + amnt + 1;
				if(cache.actions[index2]) {
					cache.index = index2 - 1;
					this.callNextAction(cache);
				}
				break;
			default:
				break;
		}
	} else {
		const type = parseInt(data.iffalse);
		switch(type) {
			case 0:
				this.callNextAction(cache);
				break;
			case 2:
				const val = parseInt(this.evalMessage(data.iffalseVal, cache));
				const index = Math.max(val - 1, 0);
				if(cache.actions[index]) {
					cache.index = index - 1;
					this.callNextAction(cache);
				}
				break;
			case 3:
				const amnt = parseInt(this.evalMessage(data.iffalseVal, cache));
				const index2 = cache.index + amnt + 1;
				if(cache.actions[index2]) {
					cache.index = index2 - 1;
					this.callNextAction(cache);
				}
				break;
			default:
				break;
		}
	}
};

module.exports = Actions;