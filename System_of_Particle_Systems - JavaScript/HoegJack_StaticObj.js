/*
	Static Objects
	by Jack Hoeg
	Last Edited: February 6, 2020
*/

/*
	TODO:
		Make GroundGrid less of a mess
			a) Use IBOs
			b) Come up with a better way to store colors
			c) Can it share a shader with the CLimit lines?
*/

var LINE_VSHADER = `#version 300 es
	precision mediump float;
	uniform mat4 u_ModelMatrix;
	uniform mat4 u_VpMatrix;
	uniform vec4 u_Color;
	
	in vec4 a_Position;
	
	out vec4 v_Color;
	
	void main() {
		gl_Position = u_VpMatrix * u_ModelMatrix * a_Position;
		v_Color = u_Color;
	}`;
	
var LINE_FSHADER = `#version 300 es
	precision mediump float;
	
	in vec4 v_Color;
	out vec4 myOutputColor;
	
	void main() {
		myOutputColor = v_Color;
	}`;

//GroundGrid imported from Project C
function GroundGrid() {
	// Vertex shader program----------------------------------
	this.VSHADER_SOURCE = `#version 300 es
		uniform mat4 u_ModelMatrix;
		uniform mat4 u_VpMatrix;
		
		in vec4 a_Position;
		in vec4 a_Color;
		
		out vec4 v_Color;
		
		void main() {
			gl_Position = u_VpMatrix * u_ModelMatrix * a_Position;
			v_Color = a_Color;
		}
	`;

// Fragment shader program----------------------------------
	this.FSHADER_SOURCE = `#version 300 es
		precision mediump float;
		
		in vec4 v_Color;
		
		out vec4 myOutputColor;
		void main() {
			myOutputColor = v_Color;
		}
	`;

	this.floatsPerVertex = 7;

	this.vboContents = this.make();
	this.vboVerts = this.vboContents.length / this.floatsPerVertex;
							// # of vertices held in 'vboContents' array
	this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
	                              // bytes req'd by 1 vboContents array element;
																// (why? used to compute stride and offset 
																// in bytes for vertexAttribPointer() calls)
	
  	this.vboBytes = this.vboContents.length * this.FSIZE;               
                                // total number of bytes stored in vboContents
                                // (#  of floats in vboContents array) * 
                                // (# of bytes/float).
	this.vboStride = this.vboBytes / this.vboVerts; 
	                              // (== # of bytes to store one complete vertex).
	                              // From any attrib in a given vertex in the VBO, 
	                              // move forward by 'vboStride' bytes to arrive 
	                              // at the same attrib for the next vertex. 

	            //----------------------Attribute sizes
  	this.vboFcount_a_Position =  4;    // # of floats in the VBO needed to store the
                                // attribute named a_Pos0. (4: x,y,z,w values)
  	this.vboFcount_a_Color = 3;   // # of floats for this attrib (r,g,b values) 
  	console.assert((this.vboFcount_a_Position +     // check the size of each and
                  this.vboFcount_a_Color) *   // every attribute in our VBO
                  this.FSIZE == this.vboStride, // for agreeement with'stride'
                  "Uh oh! GroundGrid.vboStride disagrees with attribute-size values!");

              //----------------------Attribute offsets  
	this.vboOffset_a_Position = 0;    // # of bytes from START of vbo to the START
	                              // of 1st a_Pos0 attrib value in vboContents[]
  	this.vboOffset_a_Color = this.vboFcount_a_Position * this.FSIZE;    
                                // (4 floats * bytes/float) 
                                // # of bytes from START of vbo to the START
                                // of 1st a_Colr0 attrib value in vboContents[]
	            //-----------------------GPU memory locations:
	this.vboLoc;									// GPU Location for Vertex Buffer Object, 
	                              // returned by gl.createBuffer() function call
	this.shaderLoc;								// GPU Location for compiled Shader-program  
	                            	// set by compile/link of VERT_SRC and FRAG_SRC.
								          //------Attribute locations in our shaders:
	this.a_PosLoc;								// GPU location for 'a_Pos0' attribute
	this.a_ColrLoc;								// GPU location for 'a_Colr0' attribute

	            //---------------------- Uniform locations &values in our shaders
	this.modelMats = [];
	this.u_MvpMatLoc;		
}

GroundGrid.prototype.init = function() {
//=============================================================================
	for (i=0; i < 9; i++) {
		this.modelMats[i] = glMatrix.mat4.create()
	}
	glMatrix.mat4.translate(this.modelMats[1], this.modelMats[1], [-200, -200, 0]);
	glMatrix.mat4.translate(this.modelMats[2], this.modelMats[2], [-200, 0, 0]);
	glMatrix.mat4.translate(this.modelMats[3], this.modelMats[3], [-200, 200, 0]);
	glMatrix.mat4.translate(this.modelMats[4], this.modelMats[4], [0, -200, 0]);
	glMatrix.mat4.translate(this.modelMats[5], this.modelMats[5], [0, 200, 0]);
	glMatrix.mat4.translate(this.modelMats[6], this.modelMats[6], [200, -200, 0]);
	glMatrix.mat4.translate(this.modelMats[7], this.modelMats[7], [200, 0, 0]);
	glMatrix.mat4.translate(this.modelMats[8], this.modelMats[8], [200, 200, 0]);


	this.shaderLoc = createProgram(gl, this.VSHADER_SOURCE, this.FSHADER_SOURCE);
	if (!this.shaderLoc) {
   		console.log(this.constructor.name + 
    						'.init() failed to create executable Shaders on the GPU. Bye!');
    	return;
  	}

	gl.program = this.shaderLoc;		// (to match cuon-utils.js -- initShaders())

	this.vaoLoc = gl.createVertexArray();
  	gl.bindVertexArray(this.vaoLoc);

	this.vboLoc = gl.createBuffer();	
  	if (!this.vboLoc) {
    	console.log(this.constructor.name + 
    						'.init() failed to create VBO in GPU. Bye!'); 
    	return;
  	}

	gl.bindBuffer(gl.ARRAY_BUFFER,	      // GLenum 'target' for this GPU buffer 
  									this.vboLoc);				  // the ID# the GPU uses for this buffer.

  	gl.bufferData(gl.ARRAY_BUFFER, 			  // GLenum target(same as 'bindBuffer()')
 					 				this.vboContents, 		// JavaScript Float32Array
  							 		gl.STATIC_DRAW);			// Usage hint.
  	this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, 'a_Position');
  	if(this.a_PosLoc < 0) {
    	console.log(this.constructor.name + 
    							'.init() Failed to get GPU location of attribute a_Position');
    	return -1;	// error exit.
  	}
 	this.a_ColrLoc = gl.getAttribLocation(this.shaderLoc, 'a_Color');
  	if(this.a_ColrLoc < 0) {
    	console.log(this.constructor.name + 
    							'.init() failed to get the GPU location of attribute a_Color');
    	return -1;	// error exit.
  	}

	this.u_VpMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_VpMatrix');
  	if (!this.u_VpMatLoc) { 
    	console.log(this.constructor.name + 
    							'.init() failed to get GPU location for u_VpMatrix uniform');
    	return;
  	}  
  	
  	this.u_ModelMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMatrix');
  	if (!this.u_ModelMatLoc) { 
    	console.log(this.constructor.name + 
    							'.init() failed to get GPU location for u_ModelMatrix uniform');
    	return;
  	}  
  	
  	gl.enableVertexAttribArray(this.a_PosLoc);
  	gl.vertexAttribPointer(
		this.a_PosLoc,
		this.vboFcount_a_Position,
		gl.FLOAT,			
		false,	
		this.vboStride,
		this.vboOffset_a_Position);						
	
	gl.enableVertexAttribArray(this.a_ColrLoc);
  	gl.vertexAttribPointer(this.a_ColrLoc, this.vboFcount_a_Color, 
                        gl.FLOAT, false, 
                        this.vboStride, this.vboOffset_a_Color);
  	
  	gl.bindVertexArray(null);
}

GroundGrid.prototype.draw = function(camera) {
//=============================================================================
	gl.useProgram(this.shaderLoc);	
	gl.bindVertexArray(this.vaoLoc);
  	gl.uniformMatrix4fv(this.u_VpMatLoc, false, camera.mvp);
  	for (i = 0; i < this.modelMats.length; i++) {
  		gl.uniformMatrix4fv(this.u_ModelMatLoc, false, this.modelMats[i]);
  		gl.drawArrays(gl.LINES, 0, this.vboVerts);
  	}
  	gl.bindVertexArray(null);
}

// Model Matrix Functions
GroundGrid.prototype.make = function() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

	var xcount = 100;			// # of lines to draw in x,y to make the grid.
	var ycount = 100;		
	var xymax	= 100.0;			// grid size; extends to cover +/-xymax in x and y.
 	var xColr = new Float32Array([0.75, 0.5, 1.0]);	// violet
 	var yColr = new Float32Array([0.1, 0.5, 1.0]);	// blue
 	
	// Create an (global) array to hold this ground-plane's vertices:
	var gndVerts = new Float32Array(this.floatsPerVertex*2*(xcount+ycount));
						// draw a grid made of xcount+ycount lines; 2 vertices per line.
						
	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
	
	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= this.floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v  )*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = xColr[0];			// red
		gndVerts[j+5] = xColr[1];			// grn
		gndVerts[j+6] = xColr[2];			// blu
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= this.floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = yColr[0];			// red
		gndVerts[j+5] = yColr[1];			// grn
		gndVerts[j+6] = yColr[2];			// blu
	}
	return gndVerts;
}

/**
 * Stores generator functions
 *
 */
var generator = {};

/**
 * Generates the position vertices for a quad
 *
 * @param {vec3} p position at the center of the quad
 * @param {vec3} n normal vector to the quad
 * @param {Number} len length
 * @param {Number} wid width
 *
 * @return {Float32Array}
 */
generator.quad = function(p, n, len, wid) {
	var nrmz = glMatrix.vec3.clone(n); 	
	glMatrix.vec3.normalize(nrmz, nrmz);

	var genX = glMatrix.vec3.fromValues(1.0, 0.0, 0.0);	//generic x-direction vector
	var genY = glMatrix.vec3.fromValues(0.0, 1.0, 0.0);	//generic y-direction vector
	var genZ = glMatrix.vec3.fromValues(0.0, 0.0, 1.0);	//generic z-direction vector
	
	var rotQuat = glMatrix.quat.create();
	glMatrix.quat.rotationTo(rotQuat, genZ, nrmz);
	glMatrix.vec3.transformQuat(genX, genX, rotQuat);
	glMatrix.vec3.transformQuat(genY, genY, rotQuat);
	glMatrix.vec3.scale(genX, genX, len);
	glMatrix.vec3.scale(genY, genY, wid);
	
	var vertices = new Float32Array([
										p[0] + genX[0] + genY[0],
										p[1] + genX[1] + genY[1],
										p[2] + genX[2] + genY[2],
										
										p[0] - genX[0] + genY[0],
										p[1] - genX[1] + genY[1],
										p[2] - genX[2] + genY[2],
										
										p[0] - genX[0] - genY[0],
										p[1] - genX[1] - genY[1],
										p[2] - genX[2] - genY[2],
										
										p[0] + genX[0] - genY[0],
										p[1] + genX[1] - genY[1],
										p[2] + genX[2] - genY[2],
									]);
	return vertices;
}

/**
 * Generates the indices to draw a quad using LINE_STRIP
 *
 * @return {Uint16Array}
 */
generator.quadIndLS = function() {
	return new Uint16Array([0, 1, 2, 3, 0]);
}

/**
 * Generates the position vertices for a quad with a hole in it
 *
 * @param {vec3} p position at the center of the quad
 * @param {vec3} n normal vector to the quad
 * @param {Number} len length
 * @param {Number} wid width
 * @param {Number} r radius of hole
 *
 * @return {Float32Array}
 */
generator.quadHole = function(p, n, len, wid, r) {
	var nrmz = glMatrix.vec3.clone(n); 	
	glMatrix.vec3.normalize(nrmz, nrmz);

	var genX = glMatrix.vec3.fromValues(1.0, 0.0, 0.0);	//generic x-direction vector
	var genY = glMatrix.vec3.fromValues(0.0, 1.0, 0.0);	//generic y-direction vector
	var genZ = glMatrix.vec3.fromValues(0.0, 0.0, 1.0);	//generic z-direction vector
	
	var rotQuat = glMatrix.quat.create();
	glMatrix.quat.rotationTo(rotQuat, genZ, nrmz);
	glMatrix.vec3.transformQuat(genX, genX, rotQuat);
	glMatrix.vec3.transformQuat(genY, genY, rotQuat);
	glMatrix.vec3.scale(genX, genX, len);
	glMatrix.vec3.scale(genY, genY, wid);
	
	var positions = [
										p[0] + genX[0] + genY[0],	//X
										p[1] + genX[1] + genY[1],	//Y
										p[2] + genX[2] + genY[2],	//Z
										
										p[0] + genY[0],
										p[1] + genY[1],
										p[2] + genY[2],
										
										p[0] - genX[0] + genY[0],
										p[1] - genX[1] + genY[1],
										p[2] - genX[2] + genY[2],
										
										p[0] - genX[0],
										p[1] - genX[1],
										p[2] - genX[2],
										
										p[0] - genX[0] - genY[0],
										p[1] - genX[1] - genY[1],
										p[2] - genX[2] - genY[2],
										
										p[0] - genY[0],
										p[1] - genY[1],
										p[2] - genY[2],
										
										p[0] + genX[0] - genY[0],
										p[1] + genX[1] - genY[1],
										p[2] + genX[2] - genY[2],
										
										p[0] + genX[0],
										p[1] + genX[1],
										p[2] + genX[2],
									];
	var ax = glMatrix.vec3.create();
	var ay = glMatrix.vec3.create();
	
	glMatrix.vec3.normalize(genX, genX);
	glMatrix.vec3.normalize(genY, genY);
	glMatrix.vec3.scale(genX, genX, r);
	glMatrix.vec3.scale(genY, genY, r);
	
	var CIRC_DIV = 16;
	var stepSize = glMatrix.glMatrix.toRadian(360.0 / CIRC_DIV);
	for (i=0; i < CIRC_DIV; i++) {
		glMatrix.vec3.scale(ax, genX, Math.cos(i * stepSize));
		glMatrix.vec3.scale(ay, genY, Math.sin(i * stepSize));
		
		positions.push(p[0] + ax[0] + ay[0]);			//X
		positions.push(p[1] + ax[1] + ay[1]);			//Y
		positions.push(p[2] + ax[2] + ay[2]);			//Z
	}
	
	var vertices = new Float32Array(positions);
	
	return vertices;
}

/**
 * Generates the indices to draw a quad with hole using LINE_STRIP
 *
 * @return {Uint16Array}
 */
generator.quadHoleIndLS = function() {
	var CIRC_DIV = 16;
	var positions = [0, 2, 4, 6, 0, 1];
	for (i = 8 + (CIRC_DIV / 4.0); i <= 8 + (CIRC_DIV / 2.0); i++) {
		positions.push(i);
	}
	positions.push(3);
	for (i = 8 + (CIRC_DIV / 2.0); i <= 8 + (3.0 * CIRC_DIV / 4.0); i++) {
		positions.push(i);
	}
	positions.push(5);
	for (i = 8 + (3.0 * CIRC_DIV / 4.0); i < 8 + CIRC_DIV; i++) {
		positions.push(i);
	}
	positions.push(8);
	positions.push(7);
	for (i = 8; i <= 8 + (CIRC_DIV / 4.0); i++) {
		positions.push(i);
	}
	
	return new Uint16Array(positions);
}

/**
 * Generates the position vertices for an axis-aligned rectangular prism
 *
 * @param {vec3} pos position at center of prism
 * @param {vec3} dim dimensions of prism [length, width, height]
 */
generator.cube = function(pos, dim) {
// 	glMatrix.vec3.scale(dim, dim, 0.5);	//divides dimensions in half to easily center
	var xmin = pos[0] - dim[0];		var xmax = pos[0] + dim[0];
	var ymin = pos[1] - dim[1];		var ymax = pos[1] + dim[1];
	var zmin = pos[2] - dim[2]; 	var zmax = pos[2] + dim[2];
	return new Float32Array([
								xmin, ymin, zmin, 	//0
  								xmax, ymin, zmin, 	//1
  								xmax, ymax, zmin, 	//2
  								xmin, ymax, zmin, 	//3

  								xmin, ymin, zmax, 	//4
  								xmax, ymin, zmax, 	//5
  								xmax, ymax, zmax, 	//6
  								xmin, ymax, zmax, 	//7
							]);
}

/**
 * Generates the position vertices for an axis-aligned rectangular prism
 *
 * @param {vec3} pos position at center of prism
 * @param {vec3} dim dimensions of prism [length, width, height]
 * @param {vec3} lv length vector
 * @param {vec3} wv width vector
 * @param {vec3} nv normal vector
 */
generator.cube2 = function(pos, dim, lv, wv, nv) {	
	var p = glMatrix.vec3.clone(pos);
	var len = glMatrix.vec3.create();
	var wid = glMatrix.vec3.create();
	var norm = glMatrix.vec3.create();
	glMatrix.vec3.scale(len, lv, dim[0]);
	glMatrix.vec3.scale(wid, wv, dim[1]);
	glMatrix.vec3.scale(norm, nv, dim[2]);
	glMatrix.vec3.sub(p, p, norm);
	glMatrix.vec3.scale(norm, norm, 2.0);
	
	return new Float32Array([	//v0
								p[0] - len[0] - wid[0],	//X
								p[1] - len[1] - wid[1],	//Y
								p[2] - len[2] - wid[2],	//Z
								//v1
								p[0] + len[0] - wid[0],	//X
								p[1] + len[1] - wid[1],	//Y
								p[2] + len[2] - wid[2],	//Z
								//v2
								p[0] + len[0] + wid[0],	//X
								p[1] + len[1] + wid[1],	//Y
								p[2] + len[2] + wid[2],	//Z
								//v3
								p[0] - len[0] + wid[0],	//X
								p[1] - len[1] + wid[1],	//Y
								p[2] - len[2] + wid[2],	//Z
								//v4
								p[0] - len[0] - wid[0] + norm[0],	//X
								p[1] - len[1] - wid[1] + norm[1],	//Y
								p[2] - len[2] - wid[2] + norm[2],	//Z
								//v5
								p[0] + len[0] - wid[0] + norm[0],	//X
								p[1] + len[1] - wid[1] + norm[1],	//Y
								p[2] + len[2] - wid[2] + norm[2],	//Z
								//v6
								p[0] + len[0] + wid[0] + norm[0],	//X
								p[1] + len[1] + wid[1] + norm[1],	//Y
								p[2] + len[2] + wid[2] + norm[2],	//Z
								//v7
								p[0] - len[0] + wid[0] + norm[0],	//X
								p[1] - len[1] + wid[1] + norm[1],	//Y
								p[2] - len[2] + wid[2] + norm[2],	//Z
							]);
}

/**
 * Generates the indices to draw a cube using LINE_STRIP
 *
 * @return {Uint16Array}
 */
generator.cubeIndLS = function() {
	return new Uint16Array([0,
  							1, 5, 1,
  							2, 6, 2,
  							3, 7, 3,
  							0, 4, 5, 6, 7, 4]);
}

/**
 * Generates the position vertices for a cylinder
 * 
 * @param {vec3} base at center bottom of cylinder
 * @param {Number} radius
 * @param {Number} height
 * @param {vec3} axis running length of cylinder
 * @param {Number} div number of radial divisions
 *
 * @return {Float32Array}
 */
generator.cylin = function(base, radius, height, axis, div) {
	var genX = glMatrix.vec3.fromValues(1.0, 0.0, 0.0);				//generic x-direction vector
	var genY = glMatrix.vec3.fromValues(0.0, 1.0, 0.0);				//generic y-direction vector
	var genZ = glMatrix.vec3.fromValues(0.0, 0.0, 1.0);				//generic z-direction vector
	
	var rotQuat = glMatrix.quat.create();
	glMatrix.quat.rotationTo(rotQuat, genZ, axis);
	glMatrix.vec3.transformQuat(genX, genX, rotQuat);
	glMatrix.vec3.transformQuat(genY, genY, rotQuat);
	glMatrix.vec3.transformQuat(genZ, genZ, rotQuat);
	glMatrix.vec3.scale(genX, genX, radius);
	glMatrix.vec3.scale(genY, genY, radius);
	glMatrix.vec3.scale(genZ, genZ, height);
	
	var stepSize = glMatrix.glMatrix.toRadian(360.0 / div);
	
	var ax = glMatrix.vec3.create();
	var ay = glMatrix.vec3.create();
	var positions = [];
	
	for (i = 0; i < div * 2; i++) {
		glMatrix.vec3.scale(ax, genX, Math.cos(i * stepSize));
		glMatrix.vec3.scale(ay, genY, Math.sin(i * stepSize));
		
		positions.push(base[0] + ax[0] + ay[0]);			//X
		positions.push(base[1] + ax[1] + ay[1]);			//Y
		positions.push(base[2] + ax[2] + ay[2]);			//Z
		
		positions.push(base[0] + ax[0] + ay[0] + genZ[0]);	//X
		positions.push(base[1] + ax[1] + ay[1] + genZ[1]);	//Y
		positions.push(base[2] + ax[2] + ay[2] + genZ[2]);	//Z
	}
	return new Float32Array(positions);
}

/**
 * Generates the indices to draw a cylinder using LINE_STRIP
 *
 * @param {Number} div number of radial divisions
 *
 * @return {Uint16Array}
 */
generator.cylinIndLS = function(div) {
	var indices = [];
	for (i=0; i <= div * 2; i += 2) {
		indices.push(i);
		indices.push(i+1);
		indices.push(i);
	}
	for (i=1; i < div * 2; i += 2) {
		indices.push(i);
	}
	indices.push(1);
	return new Uint16Array(indices);
}

/**
 * Generates the vertices for a sphere
 *
 * @param {vec3} pos position of sphere center
 * @param {Number} radius
 * @param {Number} div number of sphere divisions
 */
generator.sphere = function(pos, radius, div) {
	var i, ai, si, ci;
  	var j, aj, sj, cj;
  	var positions = [];
  	
  	for (j = 0; j <= div; j++) {
    	aj = j * Math.PI / div;
    	sj = Math.sin(aj);
    	cj = Math.cos(aj);
    	for (i = 0; i <= div; i++) {
      		ai = i * 2 * Math.PI / div;
      		si = Math.sin(ai);
      		ci = Math.cos(ai);

      		positions.push((si * sj * radius) + pos[0]);  // X
      		positions.push((cj * radius) + pos[1]);       // Y
      		positions.push((ci * sj * radius) + pos[2]);  // Z
    	}
  	}
  	return new Float32Array(positions);
}

/**
 * Generates the indices to draw a sphere
 *
 * 
 * @param {Number} div number of sphere divisions
 *
 * @return {Uint16Array}
 */
generator.sphereInd = function(div) {
	var indices = [];
	var p1, p2;
	
	for (j = 0; j < div; j++) {
    	for (i = 0; i < div; i++) {
     		p1 = j * (div+1) + i;
      		p2 = p1 + (div+1);

      		indices.push(p1);
      		indices.push(p2);
      		indices.push(p1 + 1);

      		indices.push(p1 + 1);
      		indices.push(p2);
      		indices.push(p2 + 1);
    	}
  	}
  	return new Uint16Array(indices);
}

/**
 * Generates the indices to draw a sphere using LINE_STRIP
 * The resulting ibo is 2/9 the size of the normal sphereInd
 * 
 * @param {Number} div number of sphere divisions
 *
 * @return {Uint16Array}
 */
generator.sphereIndLS = function(div) {
	var indices = [];
	var p1, p2;
	
	for (j = 0; j < div; j++) {
    	for (i = 0; i < div; i+=6) {
     		p1 = j * (div+1) + i;
      		p2 = p1 + (div+1);

      		indices.push(p1);

      		indices.push(p2);
      		indices.push(p2 + 1);
      		indices.push(p2 + 2);
      		indices.push(p2 + 3);
      		indices.push(p2 + 4);
      		indices.push(p2 + 5);
      		indices.push(p2 + 6);
    	}
  	}
  	return new Uint16Array(indices);
}