<!DOCTYPE>
<html xmlns="http://www.w3.org/1999/xhtml">
	<!--
		Freemind Viewer V0.2.0
		Authors: 
			Konstantin Röhm, student research project, Hochschule Furtwangen University, Summer 2014
			Jirka Dell'Oro-Friedl, Hochschule Furtwangen University, project initiator and maintainer
	-->
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
		<title>Freemind Canvas</title>
		<link rel="shortcut icon" href="lib/img/favicon.ico" type="image/x-icon">
		<link rel="icon" href="lib/img/favicon.ico" type="image/x-icon">
		<link type="text/css" rel="stylesheet" href="lib/style/main.css" />
		<link type="text/css" rel="stylesheet" href="lib/style/normalize.css" />
		<script type="text/javascript" src="lib/js/jquery-1.9.1.min.js"></script>
		<script type="text/javascript" src="lib/js/jquery-migrate-1.2.1.js"></script>
		<script type="text/javascript" src="lib/js/kinetic-v5.0.1.min.js"></script>
		<script type="text/javascript" src="lib/js/main.js"></script>
	</head>
	<body>
		<noscript>Sie haben JavaScript deaktiviert. Um die Seite nutzen zu können, muss JavaScript in ihrem Browser aktiviert sein.</noscript>
		<?php
		if(!empty($_GET['id'])){
			echo "<script type='text/javascript'>var existingData = '".$_GET['id']."';</script>";
		} 
		if(!empty($_GET['path'])){
			echo "<script type='text/javascript'>var existingPath = '".$_GET['path']."';</script>";
		} 
		?>
		<div id="upload">
			<div>
				<div class="headline">
					Freemind Viewer
				</div>
				<form class="startView">
					<div class="DragDrop">Drop Freemind Datei</div>
					<label class="file_label">
						<img src="lib/img/freemind_logo.png">
						<div>Dateiauswahl</div>
						<input type="file" accept="" name="data" title="Freemind Datei hochladen" />
					</label>
					<div class="fileName"></div>
				</form>
			</div>
		</div>
		<div class="map_gui">
			<div>
				<div class="gui_scale">
					<div class="verticalAlignParent">
						<div class="verticalAlign">
							<button class="rangeButton minus"></button>
						</div>
						<div class="verticalAlign">
							<input type="range" name="scale" min="0" max="200" value="100" />
						</div>
						<div class="verticalAlign">
							<button class="rangeButton plus"></button>
						</div>
						<label class="scale verticalAlign">100%</label>
					</div>
				</div>
				<button class="generateURL" title="Mindmap teilen"><img src="lib/img/button_share.png" height="30"></button>
				<button class="switchView" title="Ansicht wechseln"><img src="lib/img/button_view.png" height="30" width="30"></button>
			</div>
		</div>
		<div id="canvas"></div>
		<div class="loader"><div class="pic"></div></div>
		<div id="textView"></div>
		<div id="shareDialogContainer">
			<div>
				<div class="close_button"></div>
				<a target="_blank" href="www.blabla.de" />www.blabla.de</a>
			</div>
		</div>
	</body>
</html>