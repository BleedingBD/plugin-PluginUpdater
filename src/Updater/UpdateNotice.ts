import { CloseNotice } from "betterdiscord/ui";
import { createHTMLElement } from "../common/Utilities";
import { applyUpdate } from "./UpdatePerformer";

const pluginsList: HTMLElement = createHTMLElement("span", {
    className: "PluginUpdater--UpdateNotice--pluginsList",
});
const noticeNode: HTMLElement = createHTMLElement(
    "span",
    { className: "PluginUpdater--UpdateNotice--notice" },
    "The following plugins have updates: ",
    pluginsList
);

let currentCloseFunction: CloseNotice | undefined;

export const update = (outdatedPlugins: string[]) => {
    const isShown = currentCloseFunction && document.contains(noticeNode);
    if (!outdatedPlugins.length) {
        if (isShown) currentCloseFunction!();
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
                        outdatedPlugins.forEach((plugin) =>
                            applyUpdate(plugin)
                        );
                        currentCloseFunction!();
                        currentCloseFunction = undefined;
                    },
                },
            ],
        });
    }
    pluginsList.innerHTML = "";
    outdatedPlugins.forEach((plugin) => {
        pluginsList.append(
            createHTMLElement(
                "strong",
                {
                    className: "PluginUpdater--UpdateNotice--plugin",
                    onclick: () => {
                        applyUpdate(plugin);
                    },
                },
                plugin
            )
        );
        pluginsList.append(", ");
    });
    pluginsList.lastChild?.remove?.();
};
