/*
	WebGL GUI
	by Jack Hoeg
	Last Edited: Februar 6, 2020
*/

/*
	TODO:
		Add Input Support
		Remove Redundancy
		Add position, size controls
		Streamline updateDyn (Pointers? Getters?)
		Add Hover/Animation Support
		Add Help Window
*/


/* Based on https://webglfundamentals.org/webgl/lessons/webgl-text-html.html */

/**
 * GUI Constructor
 * 
 * @param {Number} regionId number that specifies where to place the gui (currently null)
 */
function GUI(regionId) {
	this.isOn = true;

	this.container = document.getElementById(regionId);
	this.guiWindow;
	this.guiText;
	
	this.windowNodes = [];
	this.staticNodes = [];
	this.dynamicNodes = [];
}

/**
 * Creates base overlay that text and other elements will be atop
 *
 */
GUI.prototype.init = function() {
	this.addWindow("DIV", "overlay", "upLeft");
}

/**
 * Adds new window
 *
 * @param {String} tag to start window with
 * @param {String} class of window
 * @param {String} class2 second class to modify the window
 */
GUI.prototype.addWindow = function(tag, className, id) {
	var node = document.createElement(tag);
	node.className = className;
	if (typeof(id) != "undefined")
		node.id = id;
	this.windowNodes.push(node);
	this.guiWindow = node;
	this.container.appendChild(node);
}

/**
 * Deletes window
 *
 * @param {String} id of window to remove
 */
GUI.prototype.deleteWindow = function(id)  {
	this.container.removeChild(document.getElementById(id));
}

/**
 * Adds an unchanging line of text
 *
 * @param {String} tag that tells how to style text
 * @param {String} text that will be printed in HTML
 */
GUI.prototype.addStatic = function(tag, text) {
	var index = this.staticNodes.length - 1;
	this.staticNodes[index] = new GUI_Line();

	this.guiWindow.appendChild(this.staticNodes[index].addStat(tag,text));
}

/**
 * Adds an dynamically changing line of text
 *
 * @param {String} tag that tells how to style text
 * @param {String} text that will stay throughout changes
 * @param {String} dynText that will be continuously updated
 * @param {String} id to identify element in document
 */
GUI.prototype.addDynamic = function(tag, text, dynText, id) {
	var index = this.dynamicNodes.length - 1;
	this.dynamicNodes[index] = new GUI_Line();
	this.guiWindow.appendChild(this.dynamicNodes[index].addDyn(tag,text, dynText, id));
}

/**
 * Updates dynamic regions of dynamic nodes
 *
 * @param {String} id identifies which element to update
 * @param {String} dynText that will replace previous text
 */
GUI.prototype.updateDyn = function(id, dynText) {
	try {
		document.getElementById(id).innerHTML = dynText;
	} catch {
		this.toggleUI();
		document.getElementById(id).innerHTML = dynText;
		this.toggleUI();
	}
}

/**
 * Clears and Restores UI Window
 *
 */
GUI.prototype.toggleUI = function() {
	if (this.isOn) {
		this.guiText = this.guiWindow.innerHTML;
		this.guiWindow.innerHTML = "";
		this.guiWindow.className = "";
		this.isOn = false;
	}
	else {
		this.guiWindow.className = "overlay";
		this.guiWindow.innerHTML = this.guiText;
		this.isOn = true;
	}
}

//===============================================================================//

/**
 * GUI_Line Constructor
 *
 */
function GUI_Line() {
	this.type = 0; //0=Static Text, 1=Dynamic Text

	this.id;
	this.tag;
	
	this.node;
	this.span;
}

/**
 * Adds a new line of text
 * 
 * @param {String} tag that tells how to style text
 * @param {String} text to be displayed
 */
GUI_Line.prototype.add = function(tag, text) {
	var node = document.createElement(tag);
	var textnode = document.createTextNode(text);
	node.appendChild(textnode);
	return node;
}

/**
 * Adds a new line of static text
 * 
 * @param {String} tag that tells how to style text
 * @param {String} text to be displayed
 */
GUI_Line.prototype.addStat = function(tag, text) {
	this.node = this.add(tag, text);
	this.tag = tag;
	return this.node;
}

/**
 * Adds a new line of dynamic text
 * 
 * @param {String} tag that tells how to style text
 * @param {String} text to be displayed
 * @param {String} dynText that will be continuously updating
 * @param {String} id provides a way to identify the element for future updates
 */
GUI_Line.prototype.addDyn = function(tag, text, dynText, id) {
	var node = this.add(tag, text);
	
	var dynNode = this.add("SPAN", dynText);
	dynNode.id = id;
	
	node.appendChild(dynNode);
	
	this.type = 1;
	this.id = id;
	this.tag = tag;
	this.node = node;
	this.span = dynNode;
	
	return this.node;
}