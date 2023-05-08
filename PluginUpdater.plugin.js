/**
 * @name PluginUpdater
 * @version 1.0.0
 * @description A lightweight plugin for automatic plugin updates.
 * @license Unlicense
 * @author Qb
 * @pluginPath PluginUpdater.plugin.js
 * @configPath PluginUpdater.config.json
 * @updateUrl https://raw.githubusercontent.com/BleedingBD/plugin-PluginUpdater/main/PluginUpdater.plugin.js
 * @dependencies :
 *
 *
 * semiver -- 1.1.0
 * License: MIT
 * Author: Luke Edwards
 */

'use strict';

var fs = require('fs');
var path = require('path');

class Logger {
    static style = "font-weight: 700; color: blue";
    static debug(name, ...args) {
        console.debug(`%c[${name}]%c`, this.style, "", ...args);
    }
    static info(name, ...args) {
        console.info(`%c[${name}]%c`, this.style, "", ...args);
    }
    static log(name, ...args) {
        console.log(`%c[${name}]%c`, this.style, "", ...args);
    }
    static warn(name, ...args) {
        console.warn(`%c[${name}]%c`, this.style, "", ...args);
    }
    static error(name, ...args) {
        console.error(`%c[${name}]%c`, this.style, "", ...args);
    }
    static assert(condition, name, ...args) {
        console.assert(condition, `%c[${name}]%c`, this.style, "", ...args);
    }
    static trace(name, ...args) {
        console.trace(`%c[${name}]%c`, this.style, "", ...args);
    }
}

function applyChildren(node, children) {
    for (const child of children.filter((c) => c || c == 0)) {
        if (Array.isArray(child))
            applyChildren(node, child);
        else
            node.append(child);
    }
}
/**
 * Creates a new HTML element in a similar way to React.createElement.
 * @param tag The tag name of the element to create
 * @param attrs The attributes to set on the element
 * @param children The children to append to the element
 * @returns A new HTML element with the given tag name and attributes
 */
function createHTMLElement(tag, attrs, ...children) {
    const element = document.createElement(tag);
    if (attrs)
        Object.assign(element, attrs);
    applyChildren(element, children);
    return element;
}

const COMMENT = /\/\*\*\s*\n([^*]|(\*(?!\/)))*\*\//g;
const STAR_MATCHER = /^ \* /;
const FIELD_MATCHER = /^@(\w+)\s+(.*)/m;
function parseMetadata(fileContent, strict = true) {
    const match = fileContent.match(COMMENT);
    if (!match || (fileContent.indexOf(match[0]) != 0 && strict))
        return;
    const comment = match[0]
        // remove /**
        .replace(/^\/\*\*?/, "")
        // remove */
        .replace(/\*\/$/, "")
        // split lines
        .split(/\n\r?/)
        // remove ' * ' at the beginning of a line
        .map((l) => l.replace(STAR_MATCHER, ""));
    const ret = { "": "" };
    let currentKey = "";
    for (const line of comment) {
        const field = line.match(FIELD_MATCHER);
        if (field) {
            currentKey = field[1];
            ret[currentKey] = field[2];
        }
        else {
            ret[currentKey] += "\n" + line;
        }
    }
    ret[currentKey] = ret[currentKey].trimEnd();
    delete ret[""];
    return ret;
}

const pendingUpdates = new Map();
const listeners = new Set();
class PendingUpdateStore {
    static getPendingUpdate(name) {
        return pendingUpdates.get(name);
    }
    static getPendingUpdates() {
        return [...pendingUpdates.values()];
    }
    static addPendingUpdate(name, currentMetadata, remoteMetadata) {
        if (pendingUpdates.has(name)) {
            if (pendingUpdates.get(name)?.remoteMetadata.version !=
                remoteMetadata.version) {
                pendingUpdates.set(name, {
                    name,
                    currentMetadata,
                    remoteMetadata,
                });
                this.emit();
            }
        }
        else {
            pendingUpdates.set(name, {
                name,
                currentMetadata,
                remoteMetadata,
            });
            this.emit();
        }
    }
    static removePendingUpdate(name) {
        pendingUpdates.delete(name);
        this.emit();
    }
    static emit() {
        listeners.forEach((listener) => listener(this.getPendingUpdates()));
    }
    static subscribe(callback) {
        listeners.add(callback);
    }
}

async function applyUpdate(pluginName) {
    /**
     * All file system operations are synchronous for now because BD currently polyfills
     * them in a synchronous way. Hopefully this will change in the future.
     */
    try {
        const pendingUpdate = PendingUpdateStore.getPendingUpdate(pluginName);
        if (!pendingUpdate)
            return false;
        const { currentMetadata } = pendingUpdate;
        const response = await fetch(currentMetadata.updateUrl);
        const fileContent = await response.text();
        const incomingMetadata = parseMetadata(fileContent);
        if (!incomingMetadata || !incomingMetadata.name)
            return false;
        // check for config file path changes
        const targetConfigPath = path.resolve(BdApi.Plugins.folder, incomingMetadata.configPath ||
            `${incomingMetadata.name}.config.json`);
        const currentConfigPath = path.resolve(BdApi.Plugins.folder, currentMetadata.configPath || `${currentMetadata.name}.config.json`);
        if (targetConfigPath != currentConfigPath) {
            fs.renameSync(currentConfigPath, targetConfigPath);
        }
        // determine target path and write plugin to disk
        const targetPath = path.resolve(BdApi.Plugins.folder, incomingMetadata.pluginPath || `${incomingMetadata.name}.plugin.js`);
        await fs.writeFileSync(targetPath, fileContent, "utf-8");
        // check for plugin file path changes
        const currentPath = path.resolve(BdApi.Plugins.folder, currentMetadata.filename);
        if (targetPath != currentPath) {
            await fs.unlinkSync(currentPath);
        }
        PendingUpdateStore.removePendingUpdate(pluginName);
        return true;
    }
    catch (e) {
        Logger.error("Updater", `Error while trying to update ${pluginName}`, e);
        return false;
    }
}

const pluginsList = createHTMLElement("span", {
    className: "PluginUpdater--UpdateNotice--pluginsList",
});
const noticeNode = createHTMLElement("span", { className: "PluginUpdater--UpdateNotice--notice" }, "The following plugins have updates: ", pluginsList);
let currentCloseFunction;
const update = (outdatedPlugins) => {
    const isShown = currentCloseFunction && document.contains(noticeNode);
    if (!outdatedPlugins.length) {
        if (isShown)
            currentCloseFunction();
        return;
    }
    if (!isShown) {
        currentCloseFunction = BdApi.UI.showNotice(noticeNode, {
            type: "info",
            timeout: 0,
            buttons: [
                {
                    label: "Update All",
                    onClick: () => {
                        outdatedPlugins.forEach((plugin) => applyUpdate(plugin));
                        currentCloseFunction();
                        currentCloseFunction = undefined;
                    },
                },
            ],
        });
    }
    pluginsList.innerHTML = "";
    outdatedPlugins.forEach((plugin) => {
        pluginsList.append(createHTMLElement("strong", {
            className: "PluginUpdater--UpdateNotice--plugin",
            onclick: () => {
                applyUpdate(plugin);
            },
        }, plugin));
        pluginsList.append(", ");
    });
    pluginsList.lastChild?.remove?.();
};

var fn = new Intl.Collator(0, { numeric:1 }).compare;

function semiver (a, b, bool) {
	a = a.split('.');
	b = b.split('.');

	return fn(a[0], b[0]) || fn(a[1], b[1]) || (
		b[2] = b.slice(2).join('.'),
		bool = /[.-]/.test(a[2] = a.slice(2).join('.')),
		bool == /[.-]/.test(b[2]) ? fn(a[2], b[2]) : bool ? -1 : 1
	);
}

const regex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
const valid = (v) => regex.test(v);
const gt = (v1, v2) => semiver(v1, v2) > 0;

PendingUpdateStore.subscribe((pendingUpdates) => {
    update(pendingUpdates.map((pendingUpdate) => pendingUpdate.name));
});
class Updater {
    static async checkForUpdate(metadata) {
        const name = metadata.name;
        const currentVersion = metadata.version;
        const updateUrl = metadata.updateUrl;
        if (!name || !currentVersion || !updateUrl || !valid(currentVersion))
            return;
        Logger.debug("Updater", `Checking ${name} (@${currentVersion}) for updates.`);
        try {
            const remoteMeta = await this.fetchMetadata(updateUrl);
            const remoteVersion = remoteMeta?.version;
            if (remoteVersion && valid(remoteVersion)) {
                if (gt(remoteVersion, currentVersion)) {
                    Logger.debug("Updater", `Found update for ${name} (${currentVersion} -> ${remoteVersion}).`);
                    PendingUpdateStore.addPendingUpdate(name, metadata, remoteMeta);
                    return true;
                }
            }
        }
        catch (error) {
            Logger.error("Updater", `Failed to check for updates for ${name} (@${currentVersion}).`, error);
        }
        return false;
    }
    static async fetchMetadata(url) {
        const response = await fetch(url);
        const text = await response.text();
        return parseMetadata(text);
    }
}

class PluginUpdater {
    updateAllInterval;
    start() {
        this.updateAllInterval = setInterval(() => this.checkAllForUpdates(), 15 * 60 * 1000);
        this.checkAllForUpdates();
    }
    stop() {
        clearInterval(this.updateAllInterval);
    }
    async checkAllForUpdates() {
        BdApi.Plugins.getAll().forEach((plugin) => {
            Updater.checkForUpdate(plugin);
        });
    }
}

module.exports = PluginUpdater;
