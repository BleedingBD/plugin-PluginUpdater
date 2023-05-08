import Updater from "./Updater";
import { Plugin } from "betterdiscord";

export default class PluginUpdater implements Plugin {
    updateAllInterval?: NodeJS.Timer;

    public start() {
        this.updateAllInterval = setInterval(
            () => this.checkAllForUpdates(),
            15 * 60 * 1000
        );
        this.checkAllForUpdates();
    }

    public stop() {
        clearInterval(this.updateAllInterval!);
    }

    async checkAllForUpdates() {
        BdApi.Plugins.getAll().forEach((plugin) => {
            Updater.checkForUpdate(plugin as Record<string, string>);
        });
    }
}
