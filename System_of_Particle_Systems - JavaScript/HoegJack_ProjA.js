/*
	System of Particle Systems
	by Jack Hoeg
	Last Edited: February 8, 2020
*/

//Global Variables------
var gl;

var g_canvas = document.getElementById('webgl');
var g_timeStep = 1 / 60; //global timeStep
var g_runMode = 3;
var g_drawForce = false;
var g_drawCon = false;

groundGrid = new GroundGrid();

Sys1 = new PartSys(35000);		//Position-dependent
Sys2 = new PartSys(100);		//Flocking
Sys3 = new PartSys(50000);		//Flame
Sys4 = new PartSys(4);		//Springs

camera = new Camera();

gui = new GUI("container");
helpGui = new GUI("container");
bonusGui = new GUI("container");

var needRefresh = true; //Signals that the canvas needs to be redrawn

var lineShaderLoc;
var lineVAOLoc;
var lineVBOLoc;
var lineIBOLoc;

var lineVBOContents;
var lineIBOContents;

var lineU_ModelMatLoc;
var lineU_VpMatLoc;
var lineU_ColorLoc;

var lineStartEnd = [];

var lineLims = [];
var lineForces = [];

var selected = Sys1;
var selectNum = 1;

var helpToggle = false;

var ctrlMode = 0;

var isBonus = true;

/*
	TODO:
		Add controls
		Make Disc and Rect Emitters Targeted
		Make mass change over time
		Give color constraints relative modes
		Hybrid needs to switch to CPU mode on certain solvers
		make solver global?
		Switch HSI to Radians
		Make Constraints and Ground Grid share a single program
		Add Meshes for Position-Dependent Forces
		Add Meshes for Emitters
		LIM_VOL does not translate properly
		Add Fog
		add camera vs system control mode to gui
 */

function main() {
//==============================================================================
  	// Get the rendering context for WebGL
  	gl = g_canvas.getContext("webgl2", { preserveDrawingBuffer: true});
  	if (!gl) {
    	console.log('Failed to get the rendering context for WebGL');
  		return;
  	}

  	// Specify the color for clearing <canvas>
  	gl.clearColor(0.15, 0.15, 0.15, 1.0);
  	gl.enable(gl.DEPTH_TEST);
	
	init(gl);
	
	drawResize();
	
	/*
	 * I put draw calls into conditionals in hopes of reducing energy impact.
	 * The difference is audible on my machine (the fans turned off)
	 * These bench marks are crude estimate based on Apple's Activity Monitor
	 * All taken when paused
	 *		Redraw Every Frame:
	 *			Firefox 72: Range [150, 180]	Mean ~ 160
	 *			Chrome:		Range [190, 210]	Mean ~ 200 
	 *
	 *		Redraw As Needed:
	 *			Firefox 72: Range [1.0, 2.5],	Mean ~ 1.2
	 *			Chrome: 	Range [7.5, 10],	Mean ~ 8.0
	 */
  	var tick = function() {
  		myPress();
  		if (camera.changed) {
  			camera.refreshVP();
    		drawAll(gl);   // Draw shapes
    	} else if (g_runMode > 1 || needRefresh === true) {
    		drawAll(gl);   // Draw shapes
    		needRefresh = false;
    	}
    	requestAnimationFrame(tick);   
  	};
  	tick();
}

function init(gl) {
//==============================================================================
	groundGrid.init(gl);

	initSys1();
	initSys2();
	initSys3();
	initSys4();
	camera.init();
	initLines();
	initPage();
}

/**
 * Initializes event listeners and gui
 */
function initPage() {
	// Listen for Mouse, Keyboard Commands
	window.addEventListener("keydown", myKeyDown, false);
	window.addEventListener("keyup", myKeyUp, false);
	window.addEventListener("keypress", myKeyPress, false);
	
	gui.init();
	
	gui.addDynamic("P", "", selected.name, "name");
	gui.addDynamic("P", "", "Midpoint", "solver");
	refreshSolver(selected.solverType);
	if (selected.sysType == SYS_CPU) {
		gui.addDynamic("P", "Mode: ", "CPU", "sysType");
	} else if (selected.sysType == SYS_HYBRID) {
		gui.addDynamic("P", "Mode: ", "Hybrid", "sysType");
	} else {
		gui.addDynamic("P", "Mode: ", "GPU", "sysType");
	}
	gui.addDynamic("P", "Count: ", selected.partCount, "count");
	gui.addDynamic("P", "", "Run", "runMode");
	
	helpGui.addWindow("DIV", "overlay", "center");
	helpGui.addStatic("P", "Keymap: (all lower case - technically you can use capitals, but don't)");
	helpGui.addStatic("P", "WASD = Camera Movement");
	helpGui.addStatic("P", "Spacebar = Camera Up");
	helpGui.addStatic("P", "Shift = Camera Down");
	helpGui.addStatic("P", "Arrows = Pan/Tilt");
	helpGui.addStatic("P", "M = Toggle Perspective / Orthographic View");
	helpGui.addStatic("P", "T = Toggle HUD");
	helpGui.addStatic("P", "1 = Pause");
	helpGui.addStatic("P", "2 = Step");
	helpGui.addStatic("P", "3 = Run");
	helpGui.addStatic("P", "R = Add Random Velocity to Particles");
	helpGui.addStatic("P", "C = Toggle Constraint Visibility");
	helpGui.addStatic("P", "F = Toggle Fountain");
	helpGui.addStatic("P", "– = Select Last");
	helpGui.addStatic("P", "+ = Select Next");
	helpGui.addStatic("P", "[ = Decrement Solver");
	helpGui.addStatic("P", "] = Increment Solver");
	helpGui.addStatic("P", "Enter = Toggle Camera/System Mode (System Mode lets you drive the fire, and vortex)");

	helpGui.toggleUI();
	
	bonusGui.addWindow("DIV", "overlay", "upRight");
	bonusGui.addStatic("P", "Press 'h' for Help");
}

/**
 * Initializes a shared shader for line-based geometry
 */
function initLines() {
	var tmpVBO = [];
	var tmpIBO = [];
	
	for (i = 0; i < Sys1.forceList.length; i++) {
		if (Sys1.forceList[i].forceType == F_FIELD) {
			lineForces.push(Sys1.forceList[i]);
			lineStartEnd.push(tmpIBO.length);
			var offset = tmpVBO.length / 3;
			for (k=0; k < Sys1.forceList[i].vboContents.length; k++) {
				tmpVBO.push(Sys1.forceList[i].vboContents[k]);
			}
			for (j=0; j < Sys1.forceList[i].iboContents.length; j++) {
				tmpIBO.push(Sys1.forceList[i].iboContents[j] + offset);
			}
			lineStartEnd.push(tmpIBO.length);
		}
	}
	
	for (i = 0; i < Sys2.forceList.length; i++) {
		if (Sys2.forceList[i].forceType == F_FIELD) {
			lineForces.push(Sys2.forceList[i]);
			lineStartEnd.push(tmpIBO.length);
			var offset = tmpVBO.length / 3;
			for (k=0; k < Sys2.forceList[i].vboContents.length; k++) {
				tmpVBO.push(Sys2.forceList[i].vboContents[k]);
			}
			for (j=0; j < Sys2.forceList[i].iboContents.length; j++) {
				tmpIBO.push(Sys2.forceList[i].iboContents[j] + offset);
			}
			lineStartEnd.push(tmpIBO.length);
		}
	}
	
	for (i = 0; i < Sys3.forceList.length; i++) {
		if (Sys3.forceList[i].forceType == F_FIELD) {
			lineForces.push(Sys3.forceList[i]);
			lineStartEnd.push(tmpIBO.length);
			var offset = tmpVBO.length / 3;
			for (k=0; k < Sys3.forceList[i].vboContents.length; k++) {
				tmpVBO.push(Sys3.forceList[i].vboContents[k]);
			}
			for (j=0; j < Sys3.forceList[i].iboContents.length; j++) {
				tmpIBO.push(Sys3.forceList[i].iboContents[j] + offset);
			}
			lineStartEnd.push(tmpIBO.length);
		}
	}
	
	for (i = 0; i < Sys4.forceList.length; i++) {
		if (Sys4.forceList[i].forceType == F_FIELD) {
			lineForces.push(Sys4.forceList[i]);
			lineStartEnd.push(tmpIBO.length);
			var offset = tmpVBO.length / 3;
			for (k=0; k < Sys4.forceList[i].vboContents.length; k++) {
				tmpVBO.push(Sys4.forceList[i].vboContents[k]);
			}
			for (j=0; j < Sys4.forceList[i].iboContents.length; j++) {
				tmpIBO.push(Sys4.forceList[i].iboContents[j] + offset);
			}
			lineStartEnd.push(tmpIBO.length);
		}
	}
	
	for (i = 0; i < Sys1.limitList.length; i++) {
		switch(Sys1.limitList[i].limitType) {
			default:
				break;
			case LIM_COLOR_AGE:
			case LIM_COLOR_VEL:
			case LIM_VEL_CMPDR:
				continue;
				break;
		}
		lineLims.push(Sys1.limitList[i]);
		lineStartEnd.push(tmpIBO.length);
		var offset = tmpVBO.length / 3;
		for (k=0; k <Sys1.limitList[i].vboContents.length; k++) {
			tmpVBO.push(Sys1.limitList[i].vboContents[k]);
		}
		for (j=0; j < Sys1.limitList[i].iboContents.length; j++) {
			tmpIBO.push(Sys1.limitList[i].iboContents[j] + offset);
		}
		lineStartEnd.push(tmpIBO.length);
	}
	
	for (i = 0; i < Sys2.limitList.length; i++) {
		switch(Sys2.limitList[i].limitType) {
			default:
				break;
			case LIM_COLOR_AGE:
			case LIM_COLOR_VEL:
			case LIM_VEL_CMPDR:
				continue;
				break;
		}
		lineLims.push(Sys2.limitList[i]);
		lineStartEnd.push(tmpIBO.length);
		var offset = tmpVBO.length / 3;
		for (k=0; k <Sys2.limitList[i].vboContents.length; k++) {
			tmpVBO.push(Sys2.limitList[i].vboContents[k]);
		}
		for (j=0; j < Sys2.limitList[i].iboContents.length; j++) {
			tmpIBO.push(Sys2.limitList[i].iboContents[j] + offset);
		}
		lineStartEnd.push(tmpIBO.length);
	}
	for (i = 0; i < Sys3.limitList.length; i++) {
		switch(Sys3.limitList[i].limitType) {
			default:
				break;
			case LIM_COLOR_AGE:
			case LIM_COLOR_VEL:
			case LIM_VEL_CMPDR:
				continue;
				break;
		}
		lineLims.push(Sys3.limitList[i]);
		lineStartEnd.push(tmpIBO.length);
		var offset = tmpVBO.length / 3;
		for (k=0; k <Sys3.limitList[i].vboContents.length; k++) {
			tmpVBO.push(Sys3.limitList[i].vboContents[k]);
		}
		for (j=0; j < Sys3.limitList[i].iboContents.length; j++) {
			tmpIBO.push(Sys3.limitList[i].iboContents[j] + offset);
		}
		lineStartEnd.push(tmpIBO.length);
	}
	
	for (i = 0; i < Sys4.limitList.length; i++) {
		switch(Sys3.limitList[i].limitType) {
			default:
				break;
			case LIM_COLOR_AGE:
			case LIM_COLOR_VEL:
			case LIM_VEL_CMPDR:
				continue;
				break;
		}
		lineLims.push(Sys4.limitList[i]);
		lineStartEnd.push(tmpIBO.length);
		var offset = tmpVBO.length / 3;
		for (k=0; k <Sys4.limitList[i].vboContents.length; k++) {
			tmpVBO.push(Sys4.limitList[i].vboContents[k]);
		}
		for (j=0; j < Sys4.limitList[i].iboContents.length; j++) {
			tmpIBO.push(Sys4.limitList[i].iboContents[j] + offset);
		}
		lineStartEnd.push(tmpIBO.length);
	}

	lineVBOContents = new Float32Array(tmpVBO);
	lineIBOContents = new Uint16Array(tmpIBO);

	lineShaderLoc = createProgram(gl, LINE_VSHADER, LINE_FSHADER);
	if (!lineShaderLoc) {
   		console.log(this.constructor.name + 
    						'failed to create executable Shaders on the GPU. Bye!');
    	return;
  	}
  	
  	gl.program = lineShaderLoc;
  	
  	lineU_ModelMatLoc = gl.getUniformLocation(lineShaderLoc, 'u_ModelMatrix');
	if (!lineU_ModelMatLoc) { 
		console.log(this.constructor.name + 
							'.init() failed to get GPU location for u_ModelMatrix uniform');
		return;
	}
  	
  	lineU_VpMatLoc = gl.getUniformLocation(lineShaderLoc, 'u_VpMatrix');
	if (!lineU_VpMatLoc) { 
		console.log(this.constructor.name + 
							'.init() failed to get GPU location for u_VpMatrix uniform');
		return;
	}
	
	lineU_ColorLoc = gl.getUniformLocation(lineShaderLoc, 'u_Color');
	if (!lineU_ColorLoc) { 
		console.log(this.constructor.name + 
							'.init() failed to get GPU location for u_Color uniform');
		return;
	} 
  	
  	lineVAOLoc = gl.createVertexArray();
  	gl.bindVertexArray(lineVAOLoc);

	lineVBOLoc = gl.createBuffer();	
  	if (!lineVBOLoc) {
    	console.log(this.constructor.name + 
    						'failed to create VBO in GPU. Bye!'); 
    	return;
  	}
  	lineIBOLoc = gl.createBuffer();
	if (!lineIBOLoc) {
		console.log(this.constructor.name + 
							'.init() failed to create IBO in GPU. Bye!'); 
		return;
	}
  	
  	gl.bindBuffer(gl.ARRAY_BUFFER, lineVBOLoc);
  	gl.bufferData(gl.ARRAY_BUFFER, lineVBOContents, gl.STATIC_DRAW);
  	
  	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineIBOLoc);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, lineIBOContents, gl.STATIC_DRAW);
  	
  	var a_PosLoc = gl.getAttribLocation(lineShaderLoc, 'a_Position');
  	if(this.a_PosLoc < 0) {
    	console.log(this.constructor.name + 
    							'.init() Failed to get GPU location of attribute a_Position');
    	return -1;	// error exit.
  	}
	
	var vboFcount_a_Position = 3;
	var vboStride = 4 * 3;
	var vboOffset_a_Position = 0;
	gl.enableVertexAttribArray(a_PosLoc);
  	gl.vertexAttribPointer(
		a_PosLoc,
		vboFcount_a_Position,
		gl.FLOAT,			
		false,	
		vboStride,
		vboOffset_a_Position);
	
	gl.bindVertexArray(null);
}

function drawAll(gl) {
//==============================================================================
  	// Clear <canvas>  colors AND the depth buffer
  	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  	Sys3.draw(camera); //drawing first prevents blending from spreading
  	groundGrid.draw(camera);
  	Sys2.draw(camera);
  	Sys1.draw(camera);
  	Sys4.draw(camera);
  	if (g_drawCon || g_drawForce)
  		drawLines();
  		
  	if (g_runMode == 2) g_runMode = 1;
}

function drawResize() {
	g_canvas.width = innerWidth;
	g_canvas.height = innerHeight;
	var header = document.getElementById('header');
	if (header) {
	    console.log("header exists!")
	    g_canvas.height -= header.clientHeight;
	} else {console.log("no header");}
	camera.refreshAspect();
	gl.viewport(0, 0, g_canvas.width, g_canvas.height);
}

function drawLines() {
	gl.useProgram(lineShaderLoc);
	gl.bindVertexArray(lineVAOLoc);
	
	gl.uniformMatrix4fv(lineU_VpMatLoc, false, camera.vp);
	for (i = 0; i < lineStartEnd.length; i += 2) {
		if (i < 2 * lineForces.length) {
			if (!g_drawForce)
				continue;
			gl.uniform4f(lineU_ColorLoc, 0.0, 0.7, 0.0, 1.0);
			gl.uniformMatrix4fv(lineU_ModelMatLoc, false, lineForces[i / 2].modelMat);
		}
		else {
			if (!g_drawCon)
				continue;
			gl.uniform4f(lineU_ColorLoc, 1.0, 0.0, 0.0, 1.0);
			gl.uniformMatrix4fv(lineU_ModelMatLoc, false, lineLims[(i / 2) - lineForces.length].modelMat);
		}
		gl.drawElements(gl.LINE_STRIP, lineStartEnd[i+1] - lineStartEnd[i],
						gl.UNSIGNED_SHORT, lineStartEnd[i] * 2);
	}
	gl.bindVertexArray(null);
}

//==================System Specific

//=======SYSTEM 1

/*
 * Initializes Particle System #1 (Position-dependent)
 */
function initSys1() {
	Sys1.setName("Vortex");
	Sys1.addForce(F_GRAV_E);
	Sys1.addForce(F_FIELD, [-70, 0, 50,], 100, -20000, 1.5);
	
	Sys1.addLimit(LIM_VORTEX, [-70.0, 0.0, 0.0], 100.0, 90.0, [0.0, 0.0, 1.0], 2, 10);
	Sys1.addLimit(LIM_INF_PLANE, [0.0, 0.0, 0.0], [0, 0, 1], 0.85);
	
	Sys1.orb = false;
	Sys1.blend2 = true;
	Sys1.aging = true;
	
	Sys1.pickSys();
	Sys1.initEmitter(E_POINT, [-70, 0,  1.5]);
	Sys1.emit.setRange(CPU_PART_XVEL, [5, 12]);
	Sys1.emit.setRange(CPU_PART_HUE, [200, 200]);
	Sys1.emit.setRange(CPU_PART_SAT, [0.15, 0.55]);
	Sys1.emit.setRange(CPU_PART_INT, [0.0, 0.04]);
	Sys1.emit.setRange(CPU_PART_LIFE, [1, 4]);
	Sys1.initParticles();
	Sys1.compileShader();
}

function sys1Forward() {
	var dir = camera.getForwardDir();
	glMatrix.vec2.normalize(dir, dir);
	dir[0] *= 0.35;
	dir[1] *= 0.35;
	
	Sys1.emit.pos[0] += dir[0];
	Sys1.emit.pos[1] += dir[1];
	
	Sys1.forceList[1].pos[0] += dir[0];
	Sys1.forceList[1].pos[1] += dir[1];
	
	Sys1.limitList[0].base[0] += dir[0];
	Sys1.limitList[0].base[1] += dir[1];
	
	glMatrix.mat4.translate(Sys1.forceList[1].modelMat, Sys1.forceList[1].modelMat, 
							[dir[0], dir[1], 0.0]);
	glMatrix.mat4.translate(Sys1.limitList[0].modelMat, Sys1.limitList[0].modelMat, 
							[dir[0], dir[1], 0.0]);
}

function sys1Backward() {
	var dir = camera.getForwardDir();
	glMatrix.vec2.normalize(dir, dir);
	dir[0] *= 0.35;
	dir[1] *= 0.35;
	
	Sys1.emit.pos[0] -= dir[0];
	Sys1.emit.pos[1] -= dir[1];
	
	Sys1.forceList[1].pos[0] -= dir[0];
	Sys1.forceList[1].pos[1] -= dir[1];
	
	Sys1.limitList[0].base[0] -= dir[0];
	Sys1.limitList[0].base[1] -= dir[1];
	
	glMatrix.mat4.translate(Sys1.forceList[1].modelMat, Sys1.forceList[1].modelMat, 
							[-dir[0], -dir[1], 0.0]);
	glMatrix.mat4.translate(Sys1.limitList[0].modelMat, Sys1.limitList[0].modelMat, 
							[-dir[0], -dir[1], 0.0]);
}

function sys1Left() {
	var dir = camera.getSideDir();
	dir[0] *= 0.35;
	dir[1] *= 0.35;
	
	Sys1.emit.pos[0] -= dir[0];
	Sys1.emit.pos[1] -= dir[1];
	
	Sys1.forceList[1].pos[0] -= dir[0];
	Sys1.forceList[1].pos[1] -= dir[1];
	
	Sys1.limitList[0].base[0] -= dir[0];
	Sys1.limitList[0].base[1] -= dir[1];
	
	glMatrix.mat4.translate(Sys1.forceList[1].modelMat, Sys1.forceList[1].modelMat, 
							[-dir[0], -dir[1], 0.0]);
	glMatrix.mat4.translate(Sys1.limitList[0].modelMat, Sys1.limitList[0].modelMat, 
							[-dir[0], -dir[1], 0.0]);
}

function sys1Right() {
	var dir = camera.getSideDir();
	dir[0] *= 0.35;
	dir[1] *= 0.35;
	
	Sys1.emit.pos[0] += dir[0];
	Sys1.emit.pos[1] += dir[1];
	
	Sys1.forceList[1].pos[0] += dir[0];
	Sys1.forceList[1].pos[1] += dir[1];
	
	Sys1.limitList[0].base[0] += dir[0];
	Sys1.limitList[0].base[1] += dir[1];
	
	glMatrix.mat4.translate(Sys1.forceList[1].modelMat, Sys1.forceList[1].modelMat, 
							[dir[0], dir[1], 0.0]);
	glMatrix.mat4.translate(Sys1.limitList[0].modelMat, Sys1.limitList[0].modelMat, 
							[dir[0], dir[1], 0.0]);
}

//=======SYSTEM 2

/*
 * Initializes Particle System #2 (Flocking)
 */
function initSys2() {
	Sys2.addForce(F_FLOCK, 1, 0.75, 0.3, 15, 25, 100, 240, 3);

	Sys2.addLimit(LIM_VOL, 	[0, 0, 75], [200, 200, 150], [1.0, 0.5, 0.0],
							[-0.5, 1.0, 0.0], 0.85);
	Sys2.addLimit(LIM_COLOR_VEL, 90);
// 	Sys2.addLimit(LIM_INF_PLANE);
	Sys2.addLimit(LIM_VEL_CMPDR, 3, 9);
	
// 	Sys2.sysType = SYS_CPU;
	Sys2.setName("Flocking");
	Sys2.pickSys();
	Sys2.initEmitter(E_VOL, [0, 0, 3], [5, 5, 5]);
	Sys2.emit.setRange(CPU_PART_XVEL, [2, 5]);
	Sys2.emit.setRange(CPU_PART_MASS, [2.4, 2.4]);
	Sys2.initParticles();
	Sys2.compileShader();
}

//=======SYSTEM 3

/*
 * Initializes Particle System #3 (Flame)
 */
function initSys3() {
	Sys3.addForce(F_GRAV_E, 2.2, [0, 0, -1]);
	Sys3.addForce(F_STATIC, [0, 0, 1], 7.0);
	Sys3.addForce(F_DRAG, 0.15);
	
	Sys3.addLimit(LIM_INF_PLANE, [0.0, 0.0, 0.0], [0, 0, 1], 0.6);
	
	Sys3.addLimit(LIM_COLOR_AGE, 0, 30, 4);
	Sys3.addLimit(LIM_COLOR_AGE, 1, 0.45, 0.9);
	Sys3.addLimit(LIM_COLOR_AGE, 2, 1.0, 0.4);
	
	Sys3.orb = false;
	Sys3.blend = true;
	
	Sys3.setName("Flame");
	
	Sys3.pickSys();
	Sys3.initEmitter(E_SPHERE, [-50, -75, 8], 4);
	Sys3.emit.setRange(CPU_PART_XVEL, [0, 6]);
	Sys3.emit.setRange(CPU_PART_MASS, [1, 5]);
	Sys3.initParticles();
	Sys3.compileShader();
	Sys3.aging = true;
}

/**
 * Moves Sys3 in forward from camera perspective
 */
function sys3Forward() {
	var dir = camera.getForwardDir();
	glMatrix.vec2.normalize(dir, dir);
	Sys3.emit.pos[0] += dir[0];
	Sys3.emit.pos[1] += dir[1];
}

/**
 * Moves Sys3 in backward from camera perspective
 */
function sys3Backward() {
	var dir = camera.getForwardDir();
	glMatrix.vec2.normalize(dir, dir);
	Sys3.emit.pos[0] -= dir[0];
	Sys3.emit.pos[1] -= dir[1];
}

/**
 * Moves Sys3 in left from camera perspective
 */
function sys3Left() {
	var dir = camera.getSideDir(); //since upVector is always the same, dont renormalize
	Sys3.emit.pos[0] -= dir[0];
	Sys3.emit.pos[1] -= dir[1];
}

/**
 * Moves Sys3 in right from camera perspective
 */
function sys3Right() {
	var dir = camera.getSideDir(); //since upVector is always the same, dont renormalize
	Sys3.emit.pos[0] += dir[0];
	Sys3.emit.pos[1] += dir[1];
}

/**
 * Moves Sys3 up
 */
function sys3Up() {
	Sys3.emit.pos[0] += camera.upV[0] * 0.5;
	Sys3.emit.pos[1] += camera.upV[1] * 0.5;
	Sys3.emit.pos[2] += camera.upV[2] * 0.5;
}

/**
 * Moves Sys3 up
 */
function sys3Down() {
	if (Sys3.emit.pos[2] - 1 > Sys3.emit.radius) {
		Sys3.emit.pos[0] -= camera.upV[0] * 0.5;
		Sys3.emit.pos[1] -= camera.upV[1] * 0.5;
		Sys3.emit.pos[2] -= camera.upV[2] * 0.5;
	}
}

//=======SYSTEM 4

/**
 * Initializes Particle System #4 (Springs)
 */
function initSys4() {
	Sys4.setName("Springs");
	
	Sys4.addForce(F_SPRING, 0, CPU_PART_MAXVAR, 30, 0.4, 2.5);
	Sys4.addForce(F_SPRING, 0, 2 * CPU_PART_MAXVAR, 30, 0.4, 2.5);
	Sys4.addForce(F_SPRING, 0, 3 * CPU_PART_MAXVAR, 30, 0.4, 2.5);
	
	Sys4.addForce(F_SPRING, CPU_PART_MAXVAR, 2 * CPU_PART_MAXVAR, 30, 0.4, 2.5);
	Sys4.addForce(F_SPRING, CPU_PART_MAXVAR, 3 * CPU_PART_MAXVAR, 30, 0.4, 2.5);
	
	Sys4.addForce(F_SPRING, 2 * CPU_PART_MAXVAR, 3 * CPU_PART_MAXVAR, 30, 0.4, 2.5);
	
	Sys4.addForce(F_GRAV_E, 2.4, [0, 0, -1]);
	
	Sys4.addLimit(LIM_BALL_IN, [40, 40 ,20], 10, 0.7);
	
	Sys4.sysType = 0;
	Sys4.solverType = SOLV_SYMP_EULER
	Sys4.pickSys();
	Sys4.initEmitter(E_POINT, [40, 40,  20]);
	Sys4.emit.setRange(CPU_PART_MASS, [5, 5]);
	Sys4.initParticles();
	Sys4.compileShader();
}

//==================Mouse & Keyboard Handler
//Keymap based on this forum: 
//	https://stackoverflow.com/questions/5203407/how-to-detect-if-multiple-keys-are-pressed-at-once-using-javascript

var keys = {
	87: false,
	83: false,
	65: false,
	68: false,
	38: false,
	40: false,
	37: false,
	39: false,
	32: false,
	16: false,
	17: false,
	67: false,
};

function myKeyDown(kev) {
	if (kev.keyCode == 87)
		keys["87"] = true;
	else if (kev.keyCode == 83)
		keys["83"] = true;
	if (kev.keyCode == 65)
		keys["65"] = true;
	else if (kev.keyCode == 68)
		keys["68"] = true;
	if (kev.keyCode == 38)
		keys["38"] = true;
	else if (kev.keyCode == 40)
		keys["40"] = true;
	if (kev.keyCode == 37)
		keys["37"] = true;
	else if (kev.keyCode == 39)
		keys["39"] = true;
	if (kev.keyCode == 32)
		keys["32"] = true;
	else if (kev.keyCode == 16)
		keys["16"] = true;
	if (kev.keyCode == 17)
		keys["17"] = true;
	if (kev.keyCode == 67)
		keys["67"] = true;
}

function myKeyUp(kev) {
	if (kev.keyCode == 87)
		keys["87"] = false;
	else if (kev.keyCode == 83)
		keys["83"] = false;
	if (kev.keyCode == 65)
		keys["65"] = false;
	else if (kev.keyCode == 68)
		keys["68"] = false;
	if (kev.keyCode == 38)
		keys["38"] = false;
	else if (kev.keyCode == 40)
		keys["40"] = false;
	if (kev.keyCode == 37)
		keys["37"] = false;
	else if (kev.keyCode == 39)
		keys["39"] = false;
	if (kev.keyCode == 32)
		keys["32"] = false;
	else if (kev.keyCode == 16)
		keys["16"] = false;
	if (kev.keyCode == 17)
		keys["17"] = false;
	if (kev.keyCode == 67)
		keys["67"] = false;
}

function myPress() {
	var isRotPress = false;
	if (keys["87"]) {
		if (ctrlMode == 0)
			camera.dollyForward();
		else if (g_runMode > 1) {
			switch(this.selectNum) {
				default:
				case 2:
				case 4:
					break;
				case 1:
					sys1Forward();
					break;
				case 3:
					sys3Forward();
					break;
			}
		}
	}
	else if (keys["83"]){
		if (ctrlMode == 0)
			camera.dollyBack();
		else if (g_runMode > 1) {
			switch(this.selectNum) {
				default:
				case 2:
				case 4:
					break;
				case 1:
					sys1Backward();
					break;
				case 3:
					sys3Backward();
					break;
			}
		}
	}
	if (keys["65"]) {
		if (ctrlMode == 0)
			camera.strafeLeft();
		else if (g_runMode > 1) {
			switch(this.selectNum) {
				default:
				case 2:
				case 4:
					break;
				case 1:
					sys1Left();
					break;
				case 3:
					sys3Left();
					break;
			}
		}
	}
	else if (keys["68"]) {
		if (ctrlMode == 0)
			camera.strafeRight();
		else if (g_runMode > 1) {
			switch(this.selectNum) {
				default:
				case 2:
				case 4:
					break;
				case 1:
					sys1Right();
					break;
				case 3:
					sys3Right();
					break;
			}
		}
	}
	if (keys["38"]) {
		camera.tiltUp();
		isRotPress = true;
	}
	else if (keys["40"]) {
		camera.tiltDown();
		isRotPress = true;
	}
	if (keys["37"]) {
		camera.panLeft();
		isRotPress = true;
	}
	else if (keys["39"]) {
		camera.panRight();
		isRotPress = true;
	}
	if (keys["32"]) {
		if (ctrlMode == 0)
			camera.craneUp();
		else if (g_runMode > 1) {
			switch(this.selectNum) {
				default:
				case 2:
				case 4:
					break;
				case 1:
					break;
				case 3:
					sys3Up();
					break;
			}
		}
	}
	else if (keys["16"]) {
		if (ctrlMode == 0)
			camera.craneDown();
		else if (g_runMode > 1) {
			switch(this.selectNum) {
				default:
				case 2:
				case 4:
					break;
				case 1:
					break;
				case 3:
					sys3Down();
					break;
			}
		}
	}
	
	if (isRotPress)
		camera.refreshView();
}

function myKeyPress(ev) {
//===============================================================================
// Best for capturing alphanumeric keys and key-combinations such as 
// CTRL-C, alt-F, SHIFT-4, etc.
	var myChar = String.fromCharCode(ev.keyCode);
	switch(myChar)
	{
		case '1':	
			g_runMode = 0;						// PAUSE
			gui.updateDyn("runMode", "Pause");
			needRefresh = true;
			break;
		case '2':
			g_runMode = 2;						// STEP
			gui.updateDyn("runMode", "Step");
			needRefresh = true;
			break;
		case '3':
			g_runMode = 3;						// RUN!
			gui.updateDyn("runMode", "Run");
			needRefresh = true;
			break;
		case 'r':
		case 'R':
			selected.nudge(4.0);
			break;
		case 'm':
		case 'M':
			camera.changeType();
			break;
		case 'c':
		case 'C':
			if (!g_drawCon && !g_drawForce)
				g_drawCon = !g_drawCon;
			else if (g_drawCon && g_drawForce) {
				g_drawCon = !g_drawCon;
				g_drawForce = !g_drawForce;
			} else if (g_drawCon) {
				g_drawCon = !g_drawCon;
				g_drawForce = !g_drawForce;
			} else {
				g_drawCon = !g_drawCon;
			}
			needRefresh = true;
			break;
		case 'f':
		case 'F':
			particles.aging = !particles.aging;
			break;
		case 't':
		case 'T':
			if (!helpGui.isOn) {
				gui.toggleUI();
				try {refreshGui();}
				catch {;}
			}
			break;
		case 'h':
		case 'H':
			helpGui.toggleUI();
			if (helpGui.isOn && gui.isOn) {
				gui.toggleUI();
				helpToggle = true;
			} else if (!helpGui.isOn && helpToggle == true) {
				gui.toggleUI();
				helpToggle = false;
			}
			if(isBonus) {
				bonusGui.toggleUI();
				delete bonusGui;
				isBonus = false;
			}
			break;
		case '[':
		case '{':
			selected.solverType -= 2;
		case ']':
		case '}':
			selected.solverType++;
			selected.solverType %= SOLV_MAX;
			if (selected.solverType < 0)
				selected.solverType = SOLV_MAX - 1;
			try {refreshSolver(selected.solverType);}
			catch{;}
			break;
		case '-':
		case '_':
			switch(selectNum) {
				case 1:
					selected = Sys4;
					selectNum = 4;
					break;
				default:
				case 2:
					selected = Sys1;
					selectNum--;
					break;
				case 3:
					selected = Sys2;
					selectNum--;
					break;
				case 4:
					selected = Sys3;
					selectNum--;
					break;
			}
			refreshGui();
			break;
		case '+':
		case '=':
			switch(selectNum) {
				case 1:
					selected = Sys2;
					selectNum++;
					break;
				case 2:
					selected = Sys3;
					selectNum++;
					break;
				case 3:
					selected = Sys4;
					selectNum++;
					break;
				default:
				case 4:
					selected = Sys1;
					selectNum = 1;
					break;
			}
			try {refreshGui();}
			catch {;}
			break;
		case 'p':
			Sys3.emit.pos[1] += 1;
			break;
		case 'l':
			Sys3.emit.pos[0] -= 1;
			break;
		case 'k':
			Sys3.emit.pos[1] -= 1;
			break;
		case 'o':
			Sys3.emit.pos[0] += 1;
			break;
		case '13':
			console.log("pressed enter");
			break;
		default:
			break;
	}
	if (ev.keyCode == 13) {
		ctrlMode = !ctrlMode
	}
}

/**
 * Updates the gui to represent the selected particle system
 *
 */
function refreshGui() {
	gui.updateDyn("name", selected.name);
	gui.updateDyn("count", selected.partCount);
	refreshMode(selected.sysType);
	refreshSolver(selected.solverType);
}

/**
 * Tells GUI which mode is currently active
 *
 */
function refreshMode(sys) {
	switch(sys) {
		default:
		case SYS_GPU:
			gui.updateDyn("sysType", "GPU");
			break;
		case SYS_HYBRID:
			gui.updateDyn("sysType", "Hybrid");
			break;
		case SYS_CPU:
			gui.updateDyn("sysType", "CPU");
			break;
	}
}

/**
 * Tells GUI which solver is currently active
 *
 * @param {Number} st solverType
 */
function refreshSolver(st) {
	switch(st) {
		default:
		case SOLV_EULER:
			gui.updateDyn("solver", "Euler");
			break;
		case SOLV_MIDPOINT:
			gui.updateDyn("solver", "Midpoint");
			break;
		case SOLV_VEL_VERLET:
			gui.updateDyn("solver", "Velocity Verlet");
			break;
		case SOLV_BACK_EULER:
			gui.updateDyn("solver", "Backwind Euler");
			break;
		case SOLV_BACK_MIDPT:
			gui.updateDyn("solver", "Backwind Midpoint");
			break;
		case SOLV_SYMP_EULER:
			gui.updateDyn("solver", "Semi-Implicit Euler");
			break;
	}
}

function temp_keymapOut() {
// 	console.log("My GUI / HUD library isn't done, so you're stuck with the console\n");
	console.log("Keymap: (all lower case - technically you can do capitals, but don't)");
	console.log("\tWASD		= Camera Movement");
	console.log("\tSpacebar	= Camera Up");
	console.log("\tShift\t\t= Camera Down");
	console.log("\tArrows\t\t= Pan/Tilt");
	console.log("\tM		= Toggle Perspective / Orthographic View");
	console.log("\tT 		= Toggle HUD");
	console.log("\t1		= Pause");
	console.log("\t2		= Step");
	console.log("\t3		= Run");
	console.log("\tR		= Add Random Velocity to Particles");
	console.log("\tC		= Toggle Constraint Visibility");
	console.log("\tF		= Toggle Fountain");
	console.log("\t[		= Decrement Solver");
	console.log("\t]		= Increment Solver");
}