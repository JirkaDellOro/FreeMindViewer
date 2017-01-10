/**
 *	Freemind Viewer V0.2.0
 *	Authors: 
 *		Konstantin Röhm, student research project, Hochschule Furtwangen University, Summer 2014
 *		Jirka Dell'Oro-Friedl, Hochschule Furtwangen University, project initiator and maintainer
 *
 * variable localFile is the path to the freemind map
 * it's NECESSARY(!) that the explicit map is in the same directory as index.php
 * if the variable localFile is commented the normal startpage with the upload form will load
 */
//var localFile = 'filename.mm'; //Freemind filename with fileextension .mm


var ScaleFix = 0; //ScaleFix fuer Textlaenge Marko F.

var xml;
//stores xml data
var stage;
//main canvas
var main;
//main layer
var shareData;
//stores whole xml data
var config = {
	drag : false, //stage of drag & drop
	fieldPadding : 10, //padding-left and padding-right of the text in a node
	lineSmooth : 10, //smooth parameter for the quadratic connection curves
	middleOffset : 50, //horizontal offset from the root ellipse
	nodeOffset : 30, //horizontal offset from the parent node
	rootRadius : 0, //x Radius of the root ellipse
	arrowlink : []	//stores the graphic arrow links with start and endnode
};
var res = {//object stores string resources
	xhr : {
		view : 'lib/view.php',
		path : 'lib/data/'
	},
	xml : {
		attr : {
			text : 'TEXT',
			id : 'ID',
			pos : 'POSITION',
			fillColor : 'COLOR',
			bgColor : 'BACKGROUND_COLOR',
			link : 'LINK',
			folded : 'FOLDED',
			destination : 'DESTINATION'
		}
	},
	canvas : {
		left : 'Mainleft',
		right : 'Mainright'
	},
	left : 'left',
	right : 'right'
};

$(document).ready(function() {

	if ( typeof localFile != "undefined") {
		//if predefined mindmap file over a variable
		var url = location.origin;
		if (location.pathname.match(/index.php/i) != null) {
			url += location.pathname.replace("index.php", "");
		} else {
			url += location.pathname;
		}
		url += localFile;
		newData(url);
		$('#upload').addClass("mapView").fadeIn();
		$('.generateURL').hide();
		$('.map_gui').show();
	} else if ( typeof existingData != "undefined") {
		// if id is just the identifier of a mindmap in the lib/data-folder
		var url = res.xhr.path + existingData + '.mm';
		if (typeof existingPath != "undefined")
			// if id is full path to mindmap
			url = existingPath + existingData + '.mm';
		
		newData(url);
		$('#upload').addClass("mapView").fadeIn();
		$('.generateURL').hide();
		$('.map_gui').show();
	}
	$('#upload').css('display', 'table');

	initEventHandler();

	//create canvas and main layers
	stage = new Kinetic.Stage({
		container : "canvas",
		width : $(document).width(),
		height : $(document).height()
	});
	//main layer
	main = new Kinetic.Layer({
		draggable : true
	});
	//background layer for drag & drop
	var bgDraggableLayer = new Kinetic.Layer({
		width : stage.getWidth(),
		height : stage.getHeight()
	});
	var oldPos = {
		x : 0,
		y : 0
	};
	var rect = new Kinetic.Rect({
		width : stage.getWidth(),
		height : stage.getHeight(),
		draggable : true
	}).on('dragstart', function(event) {
		oldPos = {
			x : 0,
			y : 0
		};
		$('body').css('cursor', 'move');
	}).on('dragmove', function(event) {
		var newPos = this.getPosition();
		var xDiff = newPos.x - oldPos.x;
		var yDiff = newPos.y - oldPos.y;
		main.move({
			x : xDiff,
			y : yDiff
		});
		this.setPosition({
			x : 0,
			y : 0
		});
		oldPos = newPos;
		main.batchDraw();
	}).on('dragend', function(event) {
		$('body').css('cursor', 'default');
		bgDraggableLayer.moveToBottom();
	});
	bgDraggableLayer.add(rect);
	stage.add(bgDraggableLayer).add(main);

	var dragStart = {};
	main.on('dragstart', function(event) {
		dragStart.x = event.pageX;
		dragStart.y = event.pageY;
		$('body').css('cursor', 'move');
		config.drag = true;
	}).on('dragend', function(event) {
		$('body').css('cursor', 'default');
		config.drag = false;
		//if dragmove is too small then dispatch node click
		if (event.pageX - dragStart.x < 3 && event.pageY - dragStart.y < 3) {
			event.targetNode.fire('click', null, true);
		}
	});

});

/*
 initEventHandler
 create event handlers

 return 	void
 */
function initEventHandler() {
	//if file is changed then create new mindmap
	$('input[type="file"]').on('change', function(event) {
		var name = $(event.target).val();
		if (name.length > 0) {
			startView();
		}
	});

	//drag & drop events for the form element
	$("form").on('dragenter', function(e) {
		e.stopPropagation();
		e.preventDefault();
		$(this).css('border-color', '#f00');
	}).on('dragover', function(e) {
		e.stopPropagation();
		e.preventDefault();
	}).on('drop', function(e) {
		$(this).css('border-color', '#000');
		e.stopPropagation();
		e.preventDefault();
		var file = e.originalEvent.dataTransfer.files;
		$('input[type="file"]').eq(0).prop('files', file);
		startView();
	});
	//prevent dropping on the document
	$(document).on('dragenter dragover drop', function(event) {
		event.stopPropagation();
		event.preventDefault();
		if (event.type == 'dragover') {
			$("form").css('border-color', '#000');
		}
	});

	//set ctrl+scroll to zoom the mindmap
	$(document).on('keydown keypress DOMMouseScroll mousewheel', function(event) {
		if (event.ctrlKey && (event.type == "DOMMouseScroll" || event.type == "mousewheel")) {
			event.preventDefault();
			if (event.originalEvent.detail > 0 || event.originalEvent.wheelDelta < 0) {
				scale("-");
			} else {
				scale("+");
			}
		}
		if (event.ctrlKey && (event.keyCode == 189 || event.keyCode == 187)) {
			event.preventDefault();
			if (event.keyCode == 189) {
				scale("-");
			} else {
				scale("+");
			}
			return false;
		}
		if (event.ctrlKey && event.keyCode == 48) {
			setScale(1);
		}
		//firefox
		if ($.browser.mozilla) {
			if (event.ctrlKey && (event.which == 171 || event.which == 173)) {
				event.preventDefault();
				if (event.which == 171) {
					scale("+");
				} else {
					scale("-");
				}
				return false;
			}
		}
		function scale(type) {
			var scale = getScale() * 100;
			if (type == "+") {
				scale += (scale < 190) ? 10 : 200 - scale;
			} else {
				scale -= (scale > 10) ? 10 : scale;
			}
			setScale(scale / 100);
		}

	});

	//form submit event
	$('form').on('submit', function(event) {
		event.preventDefault();
		if ($('input[type="file"]').val() == "") {
			return;
		}
		var daten = new FormData();
		daten.append("file", this[0].files[0]);
		$('.loader').show();
		$.ajax({
			url : res.xhr.view,
			data : daten,
			type : "POST",
			processData : false,
			contentType : false,
			dataType : "xml",
			success : function(data) {
				if ($(data).find("root").length > 0) {
					alert("Falsches Dateiformat");
					location.reload();
				}
				shareData = data;
				xml = $(data).find("node").eq(0);
				if ($('#textView:visible').length > 0) {
					createList();
					$('.loader').hide();
				} else {
					$('#canvas').fadeOut(function() {
						newMap(xml);
					});
				}
				$('.generateURL').show();
				$('input[type="file"]').val('');
			}
		});
	});

	//prevent right click on canvas
	$("#canvas").on('contextmenu', function(event) {
		event.preventDefault();
	});

	//event handler for the share button
	$('.generateURL').on('click', function() {
		$.ajax({
			url : res.xhr.view,
			data : ( typeof shareData.context != "undefined") ? shareData.context : shareData,
			type : "POST",
			processData : false,
			contentType : "xml",
			dataType : "json",
			success : function(data) {
				if (data.success) {
					var url = location.origin + location.pathname + "?id=" + data.id;
					$('#shareDialogContainer a').text(url).attr('href', url);
					$('#shareDialogContainer').fadeIn();
					$('#shareDialogContainer .close_button').on('click', function() {
						$('#shareDialogContainer').fadeOut();
					});
				} else {
					alert('Teilen ist fehlgeschlagen! Bitte später nochmal probieren!');
				}
			},
			error : function(jqXHR, textStatus, errorThrown) {
				log(textStatus);
				log(errorThrown);
			}
		});
	});

	//range slider input event
	$('input[type="range"]').on('input', function(event) {
		setScale($(event.target).val() / 100);
	});

	//zoom buttons click event
	$('button.rangeButton').on('click', function(event) {
		var scale = getScale() * 100;
		if ($(event.target).hasClass('plus')) {
			scale += (scale < 190) ? 10 : 200 - scale;
		} else {
			scale -= (scale > 10) ? 10 : scale;
		}
		setScale(scale / 100);
	});

	//switch view button click event
	$('button.switchView').on('click', switchView);
}

/*
 startView
 create Mindmap View and fade Upload View

 return 	void
 */
function startView() {
	if (!$('#upload').hasClass("mapView")) {
		$('#upload').fadeOut(function() {
			$('form').submit();
			$('#upload').addClass("mapView").fadeIn();
			$('.map_gui').show();
		});
	} else {
		$('form').submit();
	}
}

/*
 switchView
 switch view between list view and mindmap view

 return 	void
 */
function switchView() {
	if ($('#textView:visible').length > 0) {
		if ($(xml).eq(0).attr(res.xml.attr.text) != main.find('#root')[0].firstText().getText()) {
			$('#textView').fadeOut();
			newMap(xml);
		} else {
			$('#textView').fadeOut(function() {
				$('#canvas').fadeIn();
			});
		}
		$('.gui_scale').show();
	} else {
		createList();
	}
}

/*
 createList
 create list view and change GUI

 return 	void
 */
function createList() {
	config.arrowlink = [];
	var string = '<div><h1>' + $(xml).eq(0).attr(res.xml.attr.text) + '</h1>';
	string = createListView($(xml).eq(0).children(), string) + '</div>';
	$('#textView').html(string);
	$('#textView>div>ul').show();
	$('#canvas').fadeOut(function() {
		$('.gui_scale').hide();
		$('#textView').fadeIn();
	});
	$('#textView').find('span').on('click', function() {
		$(this).siblings('ul').slideToggle();
		$(this).parent().toggleClass('listItem');
	});
	for (var i = 0; i < config.arrowlink.length; i++) {
		var start = $('#' + config.arrowlink[i].start).eq(0);
		$(start).children('span').after('<a class="listLink" href="#' + config.arrowlink[i].end + '" target="_blank"></a>');
	}
	$('.listLink').on('click', function(event) {
		var link = $(this).attr('href');
		if (link.match(/#/i) !== null) {
			var target = $(link).eq(0).parents('ul');
			$(target).each(function() {
				if (!$(this).parent().is("div")) {
					$(this).show();
					$(this).parent().addClass('listItem');
				}
			});
			$(link).children('span').addClass('highlight');
			setTimeout(function() {
				$(link).children('span').removeClass('highlight');
			}, 3000);
			event.preventDefault();
			return false;
		}
	});
}

/*
 newData
 load new Mindmap Data as XML

 @param	url 	filelink
 return 	void
 */
function newData(url) {
	$.ajax({
		url : url,
		dataType : "xml",
		success : function(data) {
			xml = $(data).find("node").eq(0);
			shareData = xml;
			newMap(xml);
		},
		error : function(jqXHR, textStatus, errorThrown) {
			if (errorThrown == "Not Found") {
				alert("Freemind Datei nicht vorhanden!");
				if (location.href.match(/\?id=/i) !== null) {
					location.href = location.href.substring(0, location.href.indexOf("?") - 1);
				}
			}
		}
	});
}

/*
 getScale
 get current scale from label

 return 	float
 */
function getScale() {
	var scaling = parseInt($('label.scale').text().replace("%", "")) / 100;
	
	return scaling;
}

/*
 setScaleLabel
 set scale label text

 return 	void
 */
function setScaleLabel(scale) {
	$('label.scale').text(Math.round(scale * 100) + '%');
	$('input[type="range"]').val(Math.round(scale * 100));
}

/*
 setScale
 scale main layer

 @param	scale 	new scale value
 return 	void
 */
function setScale(scale) {
	setScaleLabel(scale);
	var stageWidth = stage.getWidth() / 2;
	var stageHeight = stage.getHeight() / 2;
	stage.setOffset({
		x : stageWidth,
		y : stageHeight
	}).setPosition({
		x : stageWidth,
		y : stageHeight
	}).scale({
		x : scale,
		y : scale
	});
	main.draw();
}

/*
 newMap
 create new mindmap

 @param	data 	xml data
 return 	void
 */
function newMap(data) {
	main.destroyChildren();
	stage.scale({
		x : 1,
		y : 1
	});
	stage.setOffset({
		x : 0,
		y : 0
	});
	stage.setPosition({
		x : 0,
		y : 0
	});
	setScaleLabel(1);

	var returnNode = root({
		x : stage.getWidth() / 2,
		y : stage.getHeight() / 2,
		text : $(data).eq(0).attr(res.xml.attr.text)
	});

	main.add(returnNode);

	var leftMain = new Kinetic.Group({
		name : res.canvas.left
	});
	var rightMain = new Kinetic.Group({
		name : res.canvas.right
	});

	returnNode.add(leftMain).add(rightMain);

	config.arrowlink = [];
	iterate({
		data : $(data).eq(0).children(),
		preNode : returnNode,
	});
	initializeConnections(res.right);
	initializeConnections(res.left);
	initializeArrowlinks();
	main.draw();
	$('.loader').fadeOut();
	$('#canvas').fadeIn(1000);
}

/*
 initializeArrowlinks
 draw graphic links in the mindmap if the two nodes are visible

 return 	void
 */
function initializeArrowlinks() {
	var node = main.find('.arrowlink');
	node.each(function(knoten) {
		knoten.destroy();
	});
	var group = new Kinetic.Group({
		id : 'arrowlinks'
	});
	for (var i = 0; i < config.arrowlink.length; i++) {
		var startNode = main.find('#' + config.arrowlink[i].start);
		var endNode = main.find('#' + config.arrowlink[i].end);
		var startPos = 0;
		var endPos = 0;
		if (startNode.length > 0 && endNode.length > 0) {
			startNode = startNode[0];
			endNode = endNode[0];
			if ((startNode.parent.getAttr('childVisible') || startNode.parent.getDepth() == 3) && (endNode.parent.getAttr('childVisible') || endNode.parent.getDepth() == 3)) {
				startPos = startNode.getAbsolutePosition();
				endPos = endNode.getAbsolutePosition();
			} else {
				break;
			}
		}
		endPos.x = (endPos.x - startPos.x);
		endPos.y = (endPos.y - startPos.y);
		startPos = {
			x : 0,
			y : 0
		};

		startPos.x *= 1 / getScale();
		startPos.y *= 1 / getScale();

		endPos.x *= 1 / getScale();
		endPos.y *= 1 / getScale();

		var controlPoint = {
			x : startPos.x + (endPos.x - startPos.x) / 2,
			y : startPos.y - (endPos.y - startPos.y) / 2
		};

		var link = new Kinetic.Shape({
			name : 'test',
			sceneFunc : function(context) {
				context.beginPath();
				context.moveTo(startPos.x, startPos.y);
				context.quadraticCurveTo(controlPoint.x, controlPoint.y, endPos.x, endPos.y);
				context.stroke();
			},
			stroke : "black",
			strokeWidth : 1,
		});
		var arrow = drawArrow(controlPoint.x, controlPoint.y, endPos.x, endPos.y);
		var subgroup = new Kinetic.Group({
			name : 'arrowlink'
		});
		subgroup.add(link).add(arrow);
		startNode.add(subgroup);
	}
	main.draw();
}

/*
 drawArrow
 draw arrow for the graphic link ending

 @param	fromx 	startX value
 @param 	fromy 	startY value
 @param 	tox 	endX value
 @param 	toy 	endY value
 return 	Kinetic.Line
 */
function drawArrow(fromx, fromy, tox, toy) {
	var headlen = 20;
	var angle = Math.atan2(toy - fromy, tox - fromx);

	line = new Kinetic.Line({
		points : [tox, toy, tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6), tox, toy, tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6)],
		stroke : "black",
		strokeWidth : 1
	});
	return line;
}

/*
 String.prototype.getId
 extend String Object with the function getId

 return 	String
 */
String.prototype.getId = function() {
	return this.replace("ID", "").replace("_", "");
};

/*
 parseAttributes
 analyse and parse the xml node attributes

 @param 	node 	XML node
 return 	Object
 */
function parseAttributes(node) {
	var style = {};
	var attr = node.attributes;
	for (var i = 0; i < attr.length; i++) {
		switch(attr[i].nodeName) {
		case res.xml.attr.text:
			style.text = attr[i].value;
			break;
		case res.xml.attr.id:
			style.id = attr[i].value.getId();
			break;
		case res.xml.attr.fillColor:
			style.fillColor = attr[i].value;
			break;
		case res.xml.attr.bgColor:
			style.bgColor = attr[i].value;
			break;
		case res.xml.attr.link:
			style.link = attr[i].value;
			break;
		}
	}
	if (style.text == undefined) {
		if ($(node).children().eq(0).prop("nodeName") == "richcontent") {
			var html = $(node).children().eq(0).html();
			if (html.match(/<img/i) !== null) {
				var firstIndex = html.indexOf('"');
				var lastIndex = html.lastIndexOf('"');
				var link = html.substring(firstIndex + 1, lastIndex);
				style.link = link;
				style.text = 'Bildlink';
			} else {
				style.text = $(node).children().eq(0).html().toString().replace(/<[^>]*>/g, '').trim();
			}
		} else {
			style.text = 'void';
		}
	}
	for (var i = 0; i < $(node).children().length; i++) {
		if ($(node).children().eq(i).prop("nodeName") == "font") {
			var el = $(node).children().eq(0);
			if (el.attr("BOLD")) {
				style.bold = "bold";
			}
			if (el.attr("ITALIC")) {
				style.bold = "italic";
			}
			if (el.attr("SIZE")) {
				style.fontSize = $(node).children().eq(0).attr("SIZE");
			}
			if (el.attr("NAME")) {
				style.fontFamily = $(node).children().eq(0).attr("NAME");
			}
		} else if ($(node).children().eq(i).prop("nodeName") == "arrowlink") {
			config.arrowlink.push({
				start : style.id,
				end : $(node).children().eq(i).attr(res.xml.attr.destination).getId()
			});

		}
	}

	return style;
}

/*
 createListView
 create list view recursive

 @param 	data 	XML node collection
 @param 	string 	current HTML string for the list
 return 	String
 */
function createListView(data, string) {
	string += '<ul style="display:none;">';
	data.each(function(index) {
		if ($(this).prop("nodeName") != "node") {
			return;
		}
		var style = parseAttributes(this);
		if ($(this).children().length > 0 && $(this).find("node").length > 0) {
			string += '<li id="' + style.id + '" class="noListItem">';
			string += '<span style="' + parseStyle(style) + '">' + style.text + '</span>';
			if (style.link) {
				style.link = parseLink(style.link);
				string += '<a class="listLink" href="' + style.link + '" target="_blank"></a>';
			}
			string = createListView($(this).children(), string);
		} else {
			string += '<li id="' + style.id + '" class="standardListItem">';
			string += '<span style="' + parseStyle(style) + '">' + style.text + '</span>';
			if (style.link) {
				style.link = parseLink(style.link);
				string += '<a class="listLink" href="' + style.link + '" target="_blank"></a>';
			}
		}
		string += '</li>';
	});
	string += '</ul>';
	function parseLink(link) {
		if (link.match(/#ID/i) !== null) {
			link = link.replace("ID", "").replace("_", "");
		} else if (link.match(/www/i) !== null) {
			link = "http://" + link;
		} else if (link.match(/http/i) == null) {
			var targetLink = location.origin;
			if (location.pathname.match(/index.php/i) !== null) {
				targetLink += location.pathname.replace("index.php", "");
			} else {
				targetLink += location.pathname;
			}
			if ( typeof localFile != "undefined") {
				targetLink += link;
			} else {
				targetLink += res.xhr.path + link;
			}
			link = targetLink;
		}
		return link;
	}

	function parseStyle(style) {
		var css = '';
		if (style.bgColor) {
			css += 'background-color:' + style.bgColor + ';';
		}
		if (style.fillColor) {
			css += 'color:' + style.fillColor + ';';
		}
		if (style.bold) {
			css += 'font-weight:' + style.bold + ';';
		}
		if (style.fontSize) {
			css += 'font-size:' + style.fontSize + ';';
		}
		if (style.fontFamily) {
			css += 'font-family:' + style.bgColor + ';';
		}
		return css;
	}

	return string;
}

/*
 iterate
 create canvas Mindmap recursive; only the nodes who aren't folded

 @param 	arg.preNode		parent Kinetic.Group for the new nodes
 @param 	arg.data 		XML node collection
 @param	arg.oneChild	determines if only one childrow is created
 return 	void
 */
function iterate(arg) {
	var init = false;
	if (arg.preNode.getId() == "root") {
		init = true;
	}
	arg.data.each(function(index) {
		if ($(this).prop("nodeName") != "node") {
			return;
		}
		var style = parseAttributes(this);
		var direction;
		if (!$(this).attr(res.xml.attr.pos)) {
			direction = arg.preNode.getName();
		} else {
			direction = $(this).attr(res.xml.attr.pos);
		}

		if (init) {
			var n = arg.preNode.getName();
			if (n == res.canvas.left || n == res.canvas.right) {
				arg.preNode = arg.preNode.parent.find('.Main'+direction)[0];
			} else {
				arg.preNode = arg.preNode.find('.Main'+direction)[0];
			}
		}

		var newNode = arg.preNode.addBranch({
			style : style
		});

		if ($(this).children().length > 0 && $(this).find("node").length > 0) {
			if ($(this).attr(res.xml.attr.folded) === "true" || arg.oneChild) {
				newNode.toggleHint();
			} else {
				iterate({
					data : $(this).children(),
					preNode : newNode
				});
			}
		}
	});
	if (arg.oneChild) {
		arg.preNode.center(true);
	} else {
		arg.preNode.center(false);
	}
}

/*
 String.prototype.capitalize
 helper function to uppercase the first letter of a string

 return 	String
 */
String.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

/*
 initializeConnections
 draw the quadratic curves between the nodes

 @param	direction	direction of the changed mindmap
 return 	void
 */
function initializeConnections(direction) {
	var curveName = 'curve' + direction.capitalize();
	main.find("." + curveName).each(function(node) {
		node.destroy();
	});
	main.find('.' + direction).each(function(node, index) {
		if (node.visible()) {
			var ancestor = node.parent;
			var points = composeControlPoints(direction, ancestor, node);

			var triangle = new Kinetic.Shape({
				name : curveName,
				sceneFunc : function(context) {
					context.beginPath();
					context.moveTo(points.start.x, points.start.y);
					context.quadraticCurveTo(points.bezierPointDown.x, points.bezierPointDown.y, points.midPoint.x, points.midPoint.y);
					context.quadraticCurveTo(points.bezierPointUp.x, points.bezierPointUp.y, points.end.x, points.end.y);
					context.stroke();
				},
				width : Math.abs(points.end.x - points.start.x),
				height : Math.abs(points.end.y - points.start.y),
				stroke : 'black',
				strokeWidth : 2,
				x : 0,
				y : 0
			});
			node.add(triangle);

		}
	});
}

/*
 composeControlPoints
 calculate the quadratic curve points between the nodes

 @param	side 		direction of the new curve
 @param 	ancestor 	parent node
 @param 	node 		current node
 return 	Object
 */
function composeControlPoints(side, ancestor, node) {
	var control = {};
	var ancFirstText = ancestor.firstText();
	var nodeFirstText = node.firstText();
	var root = node.parent.parent;
	var nodePos = node.getPosition();
	if (side == res.right) {//if right
		control.start = {
			x : -(nodePos.x - (ancFirstText.getWidth() + config.fieldPadding)),
			y : -(nodePos.y - ancFirstText.getHeight())
		};
		if (root.getId() == "root") {
			control.start.x = -(nodePos.x - config.rootRadius);
			control.start.y = -(nodePos.y);
		}
		control.end = {
			x : -config.fieldPadding,
			y : nodeFirstText.getHeight()
		};
		var controlDiff = {
			x : (control.end.x - control.start.x),
			y : (control.end.y - control.start.y)
		};
		control.midPoint = {
			x : controlDiff.x / 2 + control.start.x,
			y : controlDiff.y / 2 + control.start.y
		};
		var smoothing = {
			x : Math.abs(controlDiff.x) / config.lineSmooth,
			y : Math.abs(controlDiff.y) / config.lineSmooth
		};
		control.bezierPointDown = {
			x : (controlDiff.x) / 2 + control.start.x - smoothing.x,
			y : control.start.y - smoothing.y
		};
		control.bezierPointUp = {
			x : controlDiff.x / 2 + control.start.x + smoothing.x,
			y : controlDiff.y + control.start.y + smoothing.y
		};
	} else {//if left
		control.start = {
			x : config.fieldPadding,
			y : nodeFirstText.getHeight()
		};
		control.end = {
			x : -(nodePos.x + config.fieldPadding + ancFirstText.getWidth()),
			y : -(nodePos.y - ancFirstText.getHeight())
		};
		if (root.getId() == "root") {
			control.end.x = -(nodePos.x + config.rootRadius);
			control.end.y = -(nodePos.y);
		}
		var controlDiff = {
			x : (control.end.x - control.start.x),
			y : (control.end.y - control.start.y)
		};
		control.midPoint = {
			x : controlDiff.x / 2 + control.start.x,
			y : controlDiff.y / 2 + control.start.y
		};
		var smoothing = {
			x : Math.abs(controlDiff.x) / config.lineSmooth,
			y : Math.abs(controlDiff.y) / config.lineSmooth
		};
		control.bezierPointDown = {
			x : (controlDiff.x) / 2 + control.start.x - smoothing.x,
			y : control.start.y - smoothing.x
		};
		control.bezierPointUp = {
			x : (controlDiff.x) / 2 + control.start.x + smoothing.x,
			y : (controlDiff.y) + control.start.y + smoothing.y
		};
	}
	return control;
}

/*
 openLink
 click event handler for the node links

 @param	event 	click event object
 return 	void
 */
function openLink(event) {
	var link;
	if (event.targetNode.getClassName() == "Image") {
		event.cancelBubble = true;
		link = event.targetNode.getAttr("link");
	} else {
		link = event.targetNode.parent.children.find("Image")[0].getAttr("link");
	}
	//if internal link
	if (link.match(/#ID/i)) {
		link = link.replace("#ID", "").replace("_", "");
		var target = main.find('#' + link);
		//if target node exists
		if (target.length > 0) {
			target = target[0];

			var dispatchNode = target.parent;
			while (dispatchNode.getDepth() > 3) {
				if (!dispatchNode.getAttr('childVisible')) {
					dispatchNode.find('Text')[0].fire("click", null, true);
				}
				dispatchNode = dispatchNode.parent;
			}
		} else {
			//if target node don't exists
			target = $(xml).find('[ID="ID_' + link + '"]');
			if (target.length > 0) {
				var indices = [];
				target = target[0];
				var iterator = $(target);
				while (main.find('#' + $(iterator).attr(res.xml.attr.id).getId()).length == 0) {
					indices.push($(iterator).attr(res.xml.attr.id).getId());
					iterator = $(iterator).parent();
				}
				indices.push($(iterator).attr(res.xml.attr.id).getId());
				for (var i = 1; i < indices.length; i++) {
					main.find('#'+indices[i])[0].firstText().fire("click", null, true);
				}
			}
		}
		target = main.find('#'+link)[0];
		main.move({
			x : stage.getWidth() / 2 - target.getAbsolutePosition().x,
			y : stage.getHeight() / 2 - target.getAbsolutePosition().y
		});
		main.draw();
		//if internet link with http
	} else if (link.match(/http/i) !== null) {
		window.open(link);
		//if internet link without http
	} else if (link.match(/www/i) !== null) {
		link = "http://" + link;
		window.open(link);
	} else if (typeof existingPath != "undefined") {
		window.open(existingPath + link);
	} else {
		//if internal media link
		var targetLink = location.origin;
		if (location.pathname.match(/index.php/i) !== null) {
			targetLink += location.pathname.replace("index.php", "");
		} else {
			targetLink += location.pathname;
		}
		if ( typeof localFile != "undefined") {
			targetLink += link;
		} else {
			targetLink += res.xhr.path + link;
		}
		window.open(targetLink);
	}
}

/*
 hover
 extends the Kinetic.Util with a hover function

 @param	mouseenter	mouseEnter Callback
 @param 	mouseout	mouseOut Callback
 return 	self
 */
Kinetic.Util.addMethods(Kinetic.Image, {
	hover : function(mouseenter, mouseout) {
		this.on('mouseenter', mouseenter);
		this.on('mouseleave', mouseout);
		return this;
	}
});
Kinetic.Util.addMethods(Kinetic.Text, {
	hover : function(mouseenter, mouseout) {
		this.on('mouseenter', mouseenter);
		this.on('mouseleave', mouseout);
		return this;
	}
});

/*
 root
 draw root node in the canvas

 @param	arg.x 		x-Position
 @param 	arg.y 		y-Position
 @param	arg.text 	root text
 return 	Kinetic.Group
 */
function root(arg) {
	var group = new Kinetic.Group({
		x : arg.x,
		y : arg.y,
		id : 'root'
	});
	var test = new Kinetic.Text({
		text : arg.text,
		fontSize : 24,
		fontFamily : 'Calibri',
		fill : "black"
	});
	var text = new Kinetic.Text({
		x : -test.getWidth() / 2,
		y : -test.getHeight() / 2,
		text : arg.text,
		fontSize : 24,
		fontFamily : 'Calibri',
		fill : "black"
	});
	text.hover(function(event) {
		$('body').css('cursor', 'pointer');
	}, function(event) {
		$('body').css('cursor', 'default');
	});
	test.destroy();
	var ellipse = new Kinetic.Ellipse({
		x : 0,
		y : 0,
		radius : {
			x : text.getWidth() / 2 + 20,
			y : text.getHeight() / 2 * 1.5 + 20
		},
		stroke : 'black'
	});
	config.rootRadius = ellipse.getAttr('radiusX');
	group.setAttr('show', true);
	group.add(ellipse).add(text);

	//onclick handler: open/close the first child layer
	group.on('click tab', function(event) {
		if (event.which > 1) {
			return;
		}
		var root = event.targetNode.parent;
		var show = root.getAttr('show');
		var left = main.find('.'+res.canvas.left)[0];
		var right = main.find('.'+res.canvas.right)[0];
		left.children.each(function(node) {
			if (!node.getAttr('childVisible') && show || node.getAttr('childVisible') && !show) {
				node.firstText().fire('click', null, true);
			}
		});
		right.children.each(function(node) {
			if (!node.getAttr('childVisible') && show || node.getAttr('childVisible') && !show) {
				node.firstText().fire('click', null, true);
			}
		});
		root.setAttr('show', !show);
		main.draw();
	})
	return group;
}

/*
 nodeClick
 draw root node in the canvas

 @param	event 	click event object
 return 	void
 */
function nodeClick(event) {
	if (event.which > 1 || config.drag) {
		return;
	}
	event.cancelBubble = true;
	var root = event.targetNode.parent;
	var direction = root.getName();
	var childs = root.find('.' + direction);
	//if children exists in the current mindmap set
	if (childs.length > 0) {
		var moveUp = root.getAbsolutePosition().y - root.getMinY();
		var moveDown = root.getMaxY() - (root.getAbsolutePosition().y + root.firstText().getHeight() * getScale());
		var visibleAttr = true;
		if (root.getAttr('childVisible')) {
			visibleAttr = false;
			root.setAttr('childVisible', false);
		} else {
			root.setAttr('childVisible', true);
		}

		root.children.each(function(node) {
			if (node.getName() == direction) {
				node.visible(visibleAttr);
			}
		});
		if (visibleAttr) {
			moveUp = root.getAbsolutePosition().y - root.getMinY();
			moveDown = root.getMaxY() - (root.getAbsolutePosition().y + root.firstText().getHeight() * getScale());
			moveUp *= -1;
			moveDown *= -1;
		}
		var scale = getScale();
		scale = 1 / scale;
		var iterator = root;
		//move the node recursive up and down
		while (iterator.getDepth() > 2) {
			iterator.parent.children.each(function(node, index) {
				if (node.getName() == direction) {
					if (index < iterator.index) {
						node.move({
							x : 0,
							y : moveUp * scale
						});
					} else if (index > iterator.index) {
						node.move({
							x : 0,
							y : -moveDown * scale
						});
					}
				}
			});
			iterator = iterator.parent;
		}
	} else {//if children doesn't exist->create children layer
		var data = $(xml).find('[ID="ID_'+root.getAttr('id')+'"]')[0];
		if ($(data).children().length > 0 && $(data).find("node").length > 0) {
			//create new children
			iterate({
				preNode : root,
				oneChild : true,
				data : $(data).children()
			});
			root.setAttr('childVisible', true);
		} else {
			return;
		}
	}
	//draw new connections and graphic links
	initializeConnections(direction);
	initializeArrowlinks();

	root.toggleHint();
	main.draw();
}

/*
 Extend Kinetic.Group with several functions
 */
Kinetic.Util.addMethods(Kinetic.Group, {
	/*
	 toggleHint
	 create and toggle the children circle hint for a node

	 return 	void
	 */
	toggleHint : function() {
		var hint = null;
		this.children.each(function(node) {
			if (node.getName() == "hint") {
				hint = node;
			}
		});
		//if hint exists
		if (hint != null) {
			// hide hint
			if (hint.visible()) {
				hint.visible(false);
			} else {// show hint
				hint.visible(true);
				hint.moveToTop();
			}
		} else {
			//create new hint
			var hintPos = {};
			var textNode = this.find("Text")[0];
			if (this.getName() == res.right) {
				hintPos = {
					x : textNode.getWidth() + config.fieldPadding,
					y : textNode.getHeight()
				};
			} else {
				hintPos = {
					x : -config.fieldPadding - textNode.getWidth(),
					y : textNode.getHeight()
				};
			}
			this.add(new Kinetic.Circle({
				x : hintPos.x,
				y : hintPos.y,
				radius : 3,
				fill : 'white',
				stroke : 'black',
				strokeWidth : 1,
				name : "hint",
				visible : true
			}));
		}
	},
	/*
	 firstText
	 get the first text in this.children

	 return 	Kinetic.Text
	 */
	firstText : function() {
		return this.find("Text")[0];
	},
	/*
	 addBranch
	 draw new node with positions from parent

	 @param 	arg.style 	several style attributes (text,fontsize etc.)
	 return 	Kinetic.Group
	 */
	addBranch : function(arg) {

		var direction = null;
		var xPos = 0;
		var yPos = 0;
		if (this.getName() == res.canvas.right) {
			direction = res.right;
		} else if (this.getName() == res.canvas.left) {
			direction = res.left;
		} else {
			direction = this.getName();
		}

		//calculate position with previous node
		var previous = null;
		this.children.each(function(node) {
			if (node.getName() == direction) {
				previous = node;
			}
		});
		//if parent is root node right
		if (this.getName() == res.canvas.right) {
			xPos = config.rootRadius + config.middleOffset;
			if (previous != null) {
				yPos = previous.getNextYPos();
			} else {
				yPos = 0;
			}
			//if parent is root node left
		} else if (this.getName() == res.canvas.left) {
			xPos = -config.rootRadius - config.middleOffset;
			if (previous != null) {
				yPos = previous.getNextYPos();
			} else {
				yPos = 0;
			}
		} else {
			//if normal previous node in collection
			if (previous != null) {
				yPos = previous.getNextYPos();
				xPos = previous.getPosition().x;
			}
			 else {
				//if node is first child
				yPos = this.firstText().getHeight() * getScale();
				if (direction == res.right) {
					xPos = this.firstText().getWidth() + config.fieldPadding * 2 + config.nodeOffset;
				} else {
					xPos = -this.firstText().getWidth() - config.fieldPadding * 2 - config.nodeOffset;
				}
			}
		}

		var group = new Kinetic.Group({
			x : xPos,
			y : yPos,
			name : direction,
			id : arg.style.id
		});

		//calculate text dimensions with a test node
		var test = new Kinetic.Text({
			text : arg.style.text,
			fontSize : (arg.style.fontSize) ? arg.style.fontSize : 24,
			fontFamily : (arg.style.fontFamily) ? arg.style.fontFamily : 'Calibri',
			fontStyle : (arg.style.bold) ? arg.style.bold : 'normal',
			fill : (arg.style.fillColor) ? arg.style.fillColor : "black"
		});

		var text = new Kinetic.Text({
			text : arg.style.text,
			fontSize : (arg.style.fontSize) ? arg.style.fontSize : 24,
			fontFamily : (arg.style.fontFamily) ? arg.style.fontFamily : 'Calibri',
			fontStyle : (arg.style.bold) ? arg.style.bold : 'normal',
			fill : (arg.style.fillColor) ? arg.style.fillColor : "black"
		});
		//if text too long then word wrap content
		ScaleFix = 0; //ScaleFix Textlaenge
		
		if (test.getWidth() > 800) {//Von 400 auf 800 geaendert selbe Groeße wie in FreeMind Vorlage Marko F.
			text.setWidth(800);
			
			//ScaleFix anhand von Textlaenge Marko F.
			if(getScale() < 1){
			ScaleFix = (2-getScale())*85;
			}
			if(getScale() > 1){
			ScaleFix = -(getScale()*(getScale()*15));	
			}
			// ------ Scale Fix -----
		
			
		}
		test.destroy();
		text.hover(function(event) {
			$('body').css('cursor', 'pointer');
		}, function(event) {
			$('body').css('cursor', 'default');
		});

		var textWidth = text.getWidth();
		var textHeight = text.getHeight();
		//if background color then create background rectangle
		if (arg.style.bgColor) {
			var rect = new Kinetic.Rect({
				x : -config.fieldPadding,
				height : textHeight,
				width : textWidth + 2 * config.fieldPadding,
				fill : arg.style.bgColor
			});
			group.add(rect);
		}
		//if link then load link icon and set the link as node attribute
		if (arg.style.link) {
			var imageObj = new Image();
			imageObj.src = 'lib/img/icon_link.png'
			imageObj.onload = function() {
				var image = new Kinetic.Image({
					x : 0,
					y : textHeight / 2 - 3,
					image : imageObj,
					width : 9,
					height : 6
				});
				if (direction == res.left) {
					image.move({
						x : 3,
						y : 0
					});
				} else {
					image.move({
						x : -config.fieldPadding - 3,
						y : 0
					});
				}
				image.setAttr('link', arg.style.link);
				image.on('click', openLink).hover(function() {
					$('body').css('cursor', 'pointer');
				}, function() {
					$('body').css('cursor', 'default');
				});
				group.add(image);
				main.draw();
			};
		}
		var line = new Kinetic.Line({
			points : [-config.fieldPadding, textHeight, textWidth + config.fieldPadding, textHeight],
			stroke : '#000',
			strokeWidth : 1
		});

		group.add(text).add(line);

		//if direction is left the move text by textWidth
		//origin is to the right side of the text in left direction node
		if (direction == res.left) {
			group.children.each(function(node) {
				node.move({
					x : -textWidth,
					y : 0
				});
			});
		}
		group.setAttr('childVisible', true);
		group.on('click tab', nodeClick);
		if (arg.style.link) {
			group.on('dblclick dbltab', openLink);
		}
		this.add(group);
		return group;
	},
	/*
	 getMaxY
	 calculate the highest vertical position in a node and its children

	 @param 	pos 	previous highest position
	 return 	int
	 */
	getMaxY : function(pos) {

		if (pos == undefined) {
			pos = 0;
		}
		if (this.visible()) {
			this.children.each(function(node) {
				if (node.hasChildren()) {
					pos = node.getMaxY(pos);
				} else if (node.getClassName() == "Text") {
					var max = node.getAbsolutePosition().y + node.getHeight() * getScale();
					if (max > pos) {
						pos = max;
					}
				}
			});
		}
		return pos;
	},
	/*
	 getMinY
	 calculate the lowest vertical position in a node and its children

	 @param 	pos 	previous lowest position
	 return 	int
	 */
	getMinY : function(pos) {
		if (pos == undefined) {
			pos = 10000;
		}
		if (this.visible()) {
			this.children.each(function(node) {
				if (node.hasChildren()) {
					pos = node.getMinY(pos);
				} else if (node.getClassName() == "Text") {
					var min = node.getAbsolutePosition().y;
					if (min < pos) {
						pos = min;
					}
				}
			});
		}
		return pos;
	},
	/*
	 getNextYPos
	 calculate the next vertical position from a previous node

	 return 	int
	 */
	getNextYPos : function() {

		//Resizer für Skalierungen Marko.F
		var resizer = 0;
		var Scaling = 0;
		if(getScale() > 1){
			Scaling = 6-(getScale()*4);
		}
		if(getScale()== 1){
			Scaling = 8;
		}
	
		if(getScale() < 1){
			Scaling = (2-getScale())*17;
		}
		
		resizer = (getScale()/getScale())*(Scaling*(getScale()/getScale()));
		// --- Resizer ---

		return this.getPosition().y + (this.getMaxY() - this.getAbsolutePosition().y + resizer+ ScaleFix);
	},
	/*
	 center
	 center all node in relation to its parent

	 @param 	recursive 	determines if the centering goes recursive through the tree
	 return 	void
	 */
	center : function(recursive) {
		//if this is the root left or root right node
		if (this.getName() == res.canvas.right || this.getName() == res.canvas.left) {
			var left = main.find('.'+res.canvas.left)[0];
			var right = main.find('.'+res.canvas.right)[0];

			var min = left.getMinY();
			var max = left.getMaxY();
			var diff = ((min - left.getAbsolutePosition().y) + ((max - min) / 2));
			left.children.each(function(node) {
				if (node.getName() == res.left) {
					node.move({
						x : 0,
						y : -diff
					});
				}
			});
			min = right.getMinY();
			max = right.getMaxY();
			diff = ((min - right.getAbsolutePosition().y) + ((max - min) / 2));
			right.children.each(function(node) {
				if (node.getName() == res.right) {
					node.move({
						x : 0,
						y : -diff
					});
				}
			});
		} else {
			//normal node
			var direction = this.getName();
			var min = this.getMinY();
			var max = this.getMaxY();
			var textHeight = this.firstText().getHeight() * getScale();
			var diff = ((min - (this.getAbsolutePosition().y + textHeight / 2)) + ((max - min) / 2)) + textHeight / 2;
			if (this.find('.' + direction).length > 2) {
				diff -= textHeight / 2;
			}
			var scale = 1 / getScale();
			this.children.each(function(node) {
				if (node.getName() == direction) {
					node.move({
						x : 0,
						y : -diff * scale
					});
				}
			});

			if (recursive) {
				//traverse through its parent and center the children
				var moveUp = this.getAbsolutePosition().y - this.getMinY();
				var moveDown = this.getMaxY() - (this.getAbsolutePosition().y + this.firstText().getHeight() * getScale());

				var iterator = this;
				while (iterator.getDepth() > 2) {
					iterator.parent.children.each(function(node, index) {
						if (node.getName() == direction) {
							if (index < iterator.index) {
								node.move({
									x : 0,
									y : -moveUp * scale
								});
							} else if (index > iterator.index) {
								node.move({
									x : 0,
									y : moveDown * scale
								});
							}
						}
					});
					iterator = iterator.parent;
				}
			} else {
				//only move this up or down
				var firstIndex = null;
				this.parent.children.each(function(node, index) {
					if (node.getName() == direction && firstIndex == null) {
						firstIndex = index;
					}
				});
				if (this.index > firstIndex && this.find('.' + direction).length > 0) {
					var moveThis = this.getAbsolutePosition().y - this.getMinY();
					this.move({
						x : 0,
						y : moveThis
					});
				}
			}
		}
	}
});

//log function
function log(_string) {
	console.log(_string);
}
