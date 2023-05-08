# PluginUpdater

This plugin will automatically check for updates to your plugins and notify you when an update is available. Other than the existing update methods however this will not require the plugin to work with a plugin library like ZeresPluginLibrary or BDFDB but is able to update any plugin that provides an `@updateURL` in its metadata.

Another advantage of this plugin is that it supports renaming plugins and config files if they provide an `@pluginPath` or `@configPath`. This means that you can rename your plugins and config files and they will still be updated correctly.

## Security

Because PluginUpdater will update the plugins directly from their source all plugin updates are unchecked. This means that if a plugin author decides to push an update that contains malicious code it will be executed on your machine. **Use at your own risk!**
