File Manager and Editor
=======================

A fantastic mobile-friendly, web-based file manager, code editor, and file previewer.  Can be used to create HTML/CSS/Javascript embeds for websites, a web-based file sharing portal, and much more.  Choose from a MIT or LGPL license.

![File Manager and Editor](https://user-images.githubusercontent.com/1432111/90663402-73dc9480-e1fe-11ea-8ea6-d5952d177f15.png)

[![Donate](https://cubiclesoft.com/res/donate-shield.png)](https://cubiclesoft.com/donate/) [![Discord](https://img.shields.io/discord/777282089980526602?label=chat&logo=discord)](https://cubiclesoft.com/product-support/github/)

If you use this project, don't forget to donate to support its development!

Features
--------

* [Folder and File Explorer](https://github.com/cubiclesoft/js-fileexplorer) to navigate, manage (move, copy, delete), upload, and download files and folders.
* Tabbed, full screen, fully configurable [code editor](https://ace.c9.io/) + file/embed previewer.
* Mobile-friendly defaults.  Edit code even on a phone.
* Generate basic HTML embed codes or URLs for use on a website.
* Easy to install on any PHP enabled host.
* Lots of keyboard shortcuts.
* Very fast and lightweight.
* It might even become your favorite browser-based tool.
* Has a liberal open source license.  MIT or LGPL, your choice.
* Designed for relatively painless integration into your environment.
* Sits on GitHub for all of that pull request and issue tracker goodness to easily submit changes and ideas respectively.

Getting Started
---------------

Download or clone the latest software release.  Transfer the files to a web server directory of your choosing.

Visit 'install.php' with a web browser to start the installer.  The installer provides a guided interface for setting up the application.  While File Manager does come with a basic login system, it is recommended that you use your own existing login system by creating an appropriate 'index_hook.php' file to control user access to the tool.  After installation completes, don't forget to secure the main directory on the server.

If users won't need the tabbed interface to edit or preview files, set the "Use Tabbed Editor/Viewer" feature to "No" during installation (or modify the 'config.php' file later).  Doing so will make the [Folder and File Explorer](https://github.com/cubiclesoft/js-fileexplorer) widget instance fill the entire space and disable opening of files in the tabbed editor/previewer as well as disable loading of the ACE editor components.  Useful for when file management is needed but not tabbed editing/previewing.

That's it!  You now have a fast, lightweight PHP and Javascript-based file manager and code editor.

Embedding
---------

This section provides an overview of how to get started embedding this software into another software product.  One possible reason for wanting to embed this software might be to create isolated, per-user directory storage for managing files within an existing interface but the user doesn't need to always load this software (e.g. an iframe that gets injected into the existing DOM when a user activates a hyperlink).

The 'index_hook.php' file can be used to validate that the user is signed into the main software product and make appropriate adjustments to the global `$config` array.  Also, the following two functions may be defined to more precisely control the actions of the widget on both server and client sides with minimal effort:

* ModifyFileExplorerOptions(&$options) - Receives the options array that will be passed to `FileExplorerFSHelper::HandleActions()` for optional modification.
* ModifyFileManagerOptions() - Allows additional Javascript to be emitted to modify the options passed to the FileManager instance.  Useful for injecting additional parameters for XHR callbacks into `xhrparammap` (e.g. a user ID).

Obviously, server-side code should always validate all incoming requests such that the user actually has access to a resource.
