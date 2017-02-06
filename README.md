# FreeMindViewer
Online-Viewer for MindMaps created with FreeMind

Project initiated and maintained by Jirka Dell'Oro-Friedl, Hochschule Furtwangen University
First version written by Konstantin Röhm as student research project in summer 2014


##Current Version 0.3.0
- php-parts disconnected (needs testing), no support for upload
- view solely via Javascript, upload maps via ftp etc.
- load index.html with get-parameters:
 - path (to the folder containing the Mindmap-File)
 - map (name of the file including extension ".mm")

##Current Version 0.2.0
a server running php needed in order to serve and store the mind maps

## Todo
- remove php relicts
- remove data-folder
- support touch devices (tablets, smartphones)
- add functionality to collaps/expand all, especially in html-view
- minimize interface
- support text-nodes in html-format

## Done
Remove php-skripts to make it run javascript only. Uploading maps is outside of the scope of this project and should be implemented, when it's extended to become an online editor.
