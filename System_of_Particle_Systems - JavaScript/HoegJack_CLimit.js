/*
	CLimit
	by Jack Hoeg
	Last Edited: Ferbruary 6, 2020
*/

/**
 * CLimit constructor
 *
 * @param {Number} type determines which type of constraint to initialize
 * @param {var} a-f depend on on which type is called.
 */
function CLimit(type, a, b, c, d, e, f) {	
// 	this.modelMat = glMatrix.mat4.create();	// Transforms CVV axes to model axes.
	
	this.limitType = type;
	
	this.init(a, b, c, d, e, f);
	
	this.id = 0;
// 	this.startInd = 0;
}

/*
	TODO:
		Meshes aren't translated at all. This is fine for static constraints, but will be
		problematic if movement is desired.
		Add Kill constraints
 */

//====INITITALIZATION====//

/**
 * Initializes CLimit based on this.limitType
 *
 * @params {var} all dependent on this.limitType
 */
CLimit.prototype.init = function(a, b, c, d, e, f) {
	switch(this.limitType) {
		default:
		case LIM_NONE:
			break;
		case LIM_VOL:
			if (typeof(a) != "undefined" && typeof(b) != "undefined" && typeof(c) != "undefined")
				this.initLimVol(a, b, c, d, e);
			else
				this.initLimVol([0, 0, 75], [200, 200, 150], [1.0, 0.5, 0.0], [-0.5, 1.0, 0.0], 0.85);
			break;
		case LIM_BALL_IN:
		case LIM_BALL_OUT:
			if (typeof(a) != "undefined" && typeof(b) != "undefined" && typeof(c) != "undefined")
				this.initLimBallOut(a, b, c);
			else
				this.initLimBallOut([0.0, 0.0, 6.0], 5, 0.85);
			break;
		case LIM_PLATE:
			if (typeof(a) != "undefined" && typeof(b) != "undefined" && typeof(c) != "undefined")
				this.initLimPlate(a, b, c, d, e, f);
			else
				this.initLimPlate(	glMatrix.vec3.fromValues(0.0, 0.0, 5.0),	//wall center
									glMatrix.vec3.fromValues(1.0, 0.5, 0.0), 	//length vec
									glMatrix.vec3.fromValues(0.0, 1.0, 0.0), 	//width vec
									10.0, 10.0, 0.85);							//lmax, wmax
			break;
		case LIM_PLATE_HOLE:
			if (typeof(a) != "undefined" && typeof(b) != "undefined" && typeof(c) != "undefined")
				this.initLimPlateHole(a, b, c, d, e, f);
			else
				this.initLimPlateHole(glMatrix.vec3.fromValues(0.0, 0.0, 0.0),	//wall center
									glMatrix.vec3.fromValues(1.0, 0.0, 0.0), 	//length vec
									glMatrix.vec3.fromValues(0.0, 1.0, 0.0), 	//width vec
									10.0, 10.0, 0.55, 4.0);							//lmax, wmax
			break;
		case LIM_INF_PLANE:
			if (typeof(a) != "undefined" && typeof(b) != "undefined" && typeof(c) != "undefined")
				this.initLimInfPlane(a, b, c);
			else
				this.initLimInfPlane(	[0.0, 0.0, 0.0],
										[0.0, 0.0, 1.0],
										0.85);
			break;
		case LIM_VORTEX:
			if (typeof(a) != "undefined" && typeof(b) != "undefined" && typeof(c) != "undefined")
				this.initLimVortex(a, b, c, d, e, f);
			else
				this.initLimVortex([0.0, 0.0, 0.0], 15.0, 30.0, [0.0, 0.0, 1.0],
									4, 2);
			break;
		case LIM_COLOR_AGE:
			if (typeof(a) != "undefined" && typeof(b) != "undefined" && typeof(c) != "undefined")
				this.initLimColorAge(a, b, c, d);
			else
				this.initLimColorAge(2, 0, 0.25, 1);
			break;
		case LIM_COLOR_VEL:
			if (typeof(a) != "undefined")
				this.initLimColorVel(a);
			else
				this.initLimColorVel(0);
			break;
		case LIM_VEL_CMPDR:
			if (typeof(a) != "undefined" && typeof(b) != "undefined")
				this.initLimVelCmpdr(a, b);
			else
				this.initLimVelCmpdr(0.5, 10.0);
			break;
	}
}

/**
 * Initializes LIM_VOL is a rectangular prism
 *
 * @param {vec3} pos position at center of volume
 * @param {vec3} dim dimensions of volume [length, width, height]
 * @param {vec3} lv length vector
 * @param {vec3} wv width vector
 * @param {Number} kres coefficient of restitution
 */
CLimit.prototype.initLimVol = function(pos, dim, lv, wv, kres) {
	this.pos = glMatrix.vec3.clone(pos);
	this.len = glMatrix.vec3.clone(lv);
	glMatrix.vec3.normalize(this.len, this.len);
	this.wid = glMatrix.vec3.clone(wv);
	glMatrix.vec3.normalize(this.wid, this.wid);
	this.norm = glMatrix.vec3.create(); 				// height vector
	glMatrix.vec3.cross(this.norm, this.len, this.wid);
	glMatrix.vec3.normalize(this.norm, this.norm);
	glMatrix.vec3.negate(this.norm, this.norm);
	
	this.dim = glMatrix.vec3.clone(dim);
	glMatrix.vec3.scale(this.dim, this.dim, 0.5); //store dimensions at 1 = 1/2 scale
	this.K_resti = kres;
	
	//begin initializing world2prism
	this.w2p = glMatrix.mat4.create();
	this.w2p[0] = this.len[0];
	this.w2p[1] = this.wid[0];
	this.w2p[2] = this.norm[0];
	this.w2p[4] = this.len[1];
	this.w2p[5] = this.wid[1];
	this.w2p[6] = this.norm[1];
	this.w2p[8] = this.len[2];
	this.w2p[9] = this.wid[2];
	this.w2p[10] = this.norm[2];
	
	var tempArr = glMatrix.mat4.create(); //automatically init as id mat
	tempArr[12] = -this.pos[0];
	tempArr[13] = -this.pos[1];
	tempArr[14] = -this.pos[2];
	
	glMatrix.mat4.multiply(this.w2p, this.w2p, tempArr); //finished init world2prism
	
	var ang = (Math.PI / 2) - glMatrix.vec3.angle(this.len, this.wid);
	glMatrix.mat4.invert(this.w2p, this.w2p);
	this.vboContents = generator.cube(this.pos, this.dim);

	
	for (i =0; i < this.vboContents.length; i += 3) {
		var temp = glMatrix.vec4.fromValues(this.vboContents[i],
											this.vboContents[i+1],
											this.vboContents[i+2],
											1.0
											);
		glMatrix.vec4.transformMat4(temp, temp, this.w2p);
		
		this.vboContents[i] = temp[0] + this.pos[0];
		this.vboContents[i+1] = temp[1] + this.pos[1];
		this.vboContents[i+2] = temp[2] + this.pos[2];
	}
	glMatrix.mat4.invert(this.w2p, this.w2p);

	this.iboContents = generator.cubeIndLS();
	
	this.modelMat = glMatrix.mat4.create();
}

/**
 * Initializes LIM_BALL_OUT
 *
 * @param {vec3} pos vector of sphere center
 * @param {Number} r radius of sphere
 * @param {Number} kres coefficient of restitution
 */
CLimit.prototype.initLimBallOut = function(pos, r, kres) {
	this.px = pos[0]; this.py = pos[1]; this.pz = pos[2]; this.radius = r;	//Sphere centered at (px, py, pz)
	this.K_resti = kres;
	this.pos = glMatrix.vec3.clone(pos);
	
	this.vboContents = generator.sphere(pos, r, 24);
	this.iboContents = generator.sphereIndLS(24);
	
	this.modelMat = glMatrix.mat4.create();
}

/**
 * Initializes LIM_PLATE
 *
 * @param {vec3} c vector at wall center
 * @param {vec3} lv length vector
 * @param {vec3} wv width vector
 * @param {Number} lm length max
 * @param {Number} wm width max
 * @param {Number} kres coefficient of restitution
 */
CLimit.prototype.initLimPlate = function(c, lv, wv, lm, wm, kres) {
	this.wc = glMatrix.vec3.clone(c); 	//wall-surface point
	this.len = glMatrix.vec3.clone(lv); //plate-length vector
	glMatrix.vec3.normalize(this.len, this.len);
	this.wid = glMatrix.vec3.clone(wv);	//plate-width vector
	glMatrix.vec3.normalize(this.wid, this.wid);
	this.norm = glMatrix.vec3.create(); 					//plate-surface
	glMatrix.vec3.cross(this.norm, this.len, this.wid);
	glMatrix.vec3.normalize(this.norm, this.norm);
	this.lMax = lm;
	this.wMax = wm;
	this.K_resti = kres;
	
	//begin initializing world2wall
	this.world2wall = glMatrix.mat4.create();
	this.world2wall[0] = this.len[0];
	this.world2wall[1] = this.wid[0];
	this.world2wall[2] = this.norm[0];
	this.world2wall[4] = this.len[1];
	this.world2wall[5] = this.wid[1];
	this.world2wall[6] = this.norm[1];
	this.world2wall[8] = this.len[2];
	this.world2wall[9] = this.wid[2];
	this.world2wall[10] = this.norm[2];
	
	var tempArr = glMatrix.mat4.create(); //automatically init as id mat
	tempArr[12] = -this.wc[0];
	tempArr[13] = -this.wc[1];
	tempArr[14] = -this.wc[2];
	
	glMatrix.mat4.multiply(this.world2wall, this.world2wall, tempArr); //finished init world2wall
	
	this.vboContents = generator.quad(this.wc, this.norm, this.lMax, this.wMax);
	this.iboContents = generator.quadIndLS();
	
	this.modelMat = glMatrix.mat4.create();
}

/**
 * Initializes LIM_PLATE_HOLE
 *
 * @param {vec3} c vector at wall center
 * @param {vec3} lv length vector
 * @param {vec3} wv width vector
 * @param {Number} lm length max
 * @param {Number} wm width max
 * @param {Number} kres coefficient of restitution
 * @param {Number} radius of hole within plate
 */
CLimit.prototype.initLimPlateHole = function(c, lv, wv, lm, wm, kres, r) {
	this.wc = glMatrix.vec3.clone(c); 	//wall-surface point
	this.len = glMatrix.vec3.clone(lv); //plate-length vector
	glMatrix.vec3.normalize(this.len, this.len);
	this.wid = glMatrix.vec3.clone(wv);	//plate-width vector
	glMatrix.vec3.normalize(this.wid, this.wid);
	this.norm = glMatrix.vec3.create(); 					//plate-surface
	glMatrix.vec3.cross(this.norm, this.len, this.wid);
	this.lMax = lm;
	this.wMax = wm;
	this.K_resti = kres;
	this.radius = r;
	if (this.radius > this.lMax || this.radius > this.wMax) {
		this.radius = Math.max(this.lMax, this.wMax);
	}
	
	//begin initializing world2wall
	this.world2wall = glMatrix.mat4.create();
	this.world2wall[0] = this.len[0];
	this.world2wall[1] = this.wid[0];
	this.world2wall[2] = this.norm[0];
	this.world2wall[4] = this.len[1];
	this.world2wall[5] = this.wid[1];
	this.world2wall[6] = this.norm[1];
	this.world2wall[8] = this.len[2];
	this.world2wall[9] = this.wid[2];
	this.world2wall[10] = this.norm[2];
	
	var tempArr = glMatrix.mat4.create(); //automatically init as id mat
	tempArr[12] = -this.wc[0];
	tempArr[13] = -this.wc[1];
	tempArr[14] = -this.wc[2];
	
	glMatrix.mat4.multiply(this.world2wall, this.world2wall, tempArr); //finished init world2wall

	this.vboContents = generator.quadHole(this.wc, this.norm, this.lMax, this.wMax, this.radius);
	this.iboContents = generator.quadHoleIndLS();
	
	this.modelMat = glMatrix.mat4.create();
}

/**
 * Initializes LIM_INF_PLANE
 *
 * @param {vec3} p vector somewhere on the plane
 * @param {vec3} n vector normal to the plane
 * @param {Number} kres coefficient of restitution
 */
CLimit.prototype.initLimInfPlane = function(p, n, kres) {
	var nrmz = glMatrix.vec3.clone(n); 									//normalized normal
	glMatrix.vec3.normalize(nrmz, nrmz);
	var d = glMatrix.vec3.dot(p, nrmz);									//Ax + By + Cz = D
	this.norm = glMatrix.vec4.fromValues(nrmz[0],nrmz[1],nrmz[2], -d); 	//Ax + By + Cz - D = 0
	this.K_resti = kres;
	this.point = glMatrix.vec3.clone(p);
	
	this.vboContents = generator.quad(p, n, 5, 5);
	this.iboContents = generator.quadIndLS();
	
	this.modelMat = glMatrix.mat4.create();
}

/**
 * Initializes LIM_VORTEX
 *
 * @param {vec3} base position at bottom center of vortex
 * @param {Number} radius of cylinder
 * @param {Number} height of cylinder
 * @param {vec3} axis vector of cylinder
 * @param {Number} freq of rotation, measured in Hz
 * @param {Number} tight, tightness of falloff (2 is physically accurate)
 */
CLimit.prototype.initLimVortex = function(base, radius, height, axis, freq, tight) {
	this.base = base;
	this.radius = radius;
	this.height = height;
	this.axis = glMatrix.vec3.clone(axis);
	glMatrix.vec3.normalize(this.axis, this.axis);
	this.freq = freq;
	this.tight = tight
	this.fmax = 6.0;										//upper bound on frequency

	this.vboContents = generator.cylin(base, radius, height, this.axis, 16);
	this.iboContents = generator.cylinIndLS(16);
	
	this.modelMat = glMatrix.mat4.create();
}

/**
 * Initializes LIM_COLOR_AGE
 *
 * @param {Number} mode 0=Hue, 1=S, 2=I
 * @param {Number} min
 * @param {Number} max 
 */
CLimit.prototype.initLimColorAge = function(mode, min, max) {
	this.mode = mode;
	this.start = min;
	this.range = max - this.start;
}

/**
 * Initializes LIM_COLOR_VEL
 *
 * @param {Number} offset of hue
 */
CLimit.prototype.initLimColorVel = function(offset) {
	this.offset = offset;
}

/**
 * Initializes LIM_VEL_CMPDR
 *
 * @param {Number} min minimum velocity
 * @param {Number} max maximum velocity
 */
CLimit.prototype.initLimVelCmpdr = function(min, max) {
	// stores the square of min and max to speed up vel mag calculation
	this.min = min;
	this.max = max;
}

//====CALCULATION====//

 /*
 	TODO:
 		LIM_VOL is adjusting the wrong way for parallelograms
 		LIM_BALL_OUT doesn't like particles starting inside 
 		LIM_VOL/BALL/PLANE/PLATE/HOLE add coefficient of friction
 		Calculating LIM_VORTEX after VOL has terrible results!
 		Add Cylinder
 */

/**
 * Determines which limit calculation to do
 *
 * @param {Float32Array} s1 state-variable current position
 * @param {Float32Array} s2 state-variable next position
 * @param {Number} i index of target particle
 */
CLimit.prototype.calculate = function(s1, s2, i) {
	switch(this.limitType) {
		default:
		case LIM_NONE:
			break;
		case LIM_VOL:
			this.limVolCalc(s1, s2, i);
			break;
		case LIM_BALL_IN:
			this.limBallInCalc(s1, s2, i);
			break;
		case LIM_BALL_OUT:
			this.limBallOutCalc(s1, s2, i);
			break;
		case LIM_PLATE:
			this.limPlateCalc(s1, s2, i);
			break;
		case LIM_PLATE_HOLE:
			this.limPlateHoleCalc(s1, s2, i);
			break;
		case LIM_INF_PLANE:
			this.limInfPlaneCalc(s1, s2, i);
			break;
		case LIM_VORTEX:
			this.limVortexCalc(s1, s2, i);
			break;
		case LIM_COLOR_AGE:
			this.limColorAge(s1, s2, i);
			break;
		case LIM_COLOR_VEL:
			this.limColorVel(s1, s2, i);
			break;
		case LIM_VEL_CMPDR:
			this.limVelCmpdr(s1, s2, i);
			break
	}
}

/**
 * Calculates the effect a bounding box has on a particle
 *	Assumes particles start inside the bod
 *
 * @param {Float32Array} s1 state-variable current position
 * @param {Float32Array} s2 state-variable next position
 * @param {Number} i index of target particle
 */
CLimit.prototype.limVolCalc = function(s1, s2, i) {
	var p1 = glMatrix.vec4.fromValues(s1[i+CPU_PART_XPOS], s1[i+CPU_PART_YPOS], s1[i+CPU_PART_ZPOS], 1.0);
	var p2 = glMatrix.vec4.fromValues(s2[i+CPU_PART_XPOS], s2[i+CPU_PART_YPOS], s2[i+CPU_PART_ZPOS], 1.0);


	var wp1 = glMatrix.vec4.create();
	var wp2 = glMatrix.vec4.create();
	glMatrix.vec4.transformMat4(wp1, p1, this.w2p);
	glMatrix.vec4.transformMat4(wp2, p2, this.w2p);

	var bound;
	var boundNorm;
	if (Math.abs(wp2[0]) > this.dim[0]) {
		bound = 0;
		boundNorm = this.len;
	}
	else if (Math.abs(wp2[1]) > this.dim[1]) {
		bound = 1;
		boundNorm = this.wid;
	}
	else if (Math.abs(wp2[2]) > this.dim[2]) {
		bound = 2;
		boundNorm = this.norm;
	}
	else 
		return;
		
	var vn = glMatrix.vec3.clone(boundNorm);

	var velocity = glMatrix.vec3.create();
	glMatrix.vec3.sub(velocity, p2, p1);
	glMatrix.vec3.scale(velocity, velocity, 1 / g_timeStep);
	
	glMatrix.vec3.scale(vn, vn, glMatrix.vec3.dot(velocity, vn));
	var vt = glMatrix.vec3.create();
	glMatrix.vec3.sub(vt, velocity, vn);
	
	var sub = glMatrix.vec3.create();
	//distances from particle to plane
	var plane1 = glMatrix.vec3.create();
	glMatrix.vec3.scale(plane1, boundNorm, this.dim[bound]);
	var plane2 = glMatrix.vec3.clone(plane1);
	glMatrix.vec3.sub(plane1, this.pos, plane1)
	glMatrix.vec3.add(plane2, this.pos, plane2);
	var dist1 = glMatrix.vec3.dist(plane1, p2);
	var dist2 = glMatrix.vec3.dist(plane2, p2);
	
	if (dist1 <= dist2) {
		glMatrix.vec3.sub(sub, p2, plane1);
	} else {
		glMatrix.vec3.sub(sub, p2, plane2);
	}
	
	var dn1 = glMatrix.vec3.dot(sub, boundNorm);
	dn1 *= (1.0 + this.K_resti);
	
	s2[i+CPU_PART_XPOS] -= dn1 * boundNorm[0];
	s2[i+CPU_PART_YPOS] -= dn1 * boundNorm[1];
	s2[i+CPU_PART_ZPOS] -= dn1 * boundNorm[2];
	
	glMatrix.vec3.scale(vn, vn, -this.K_resti);
			
	s2[i+CPU_PART_XVEL] = vn[0] + vt[0];
	s2[i+CPU_PART_YVEL] = vn[1] + vt[1];
	s2[i+CPU_PART_ZVEL] = vn[2] + vt[2];
}

/**
 * Calculates the effect a sphere has on a particle
 *
 * @param {Float32Array} s1 state-variable current position
 * @param {Float32Array} s2 state-variable next position
 * @param {Number} i index of target particle
 */
CLimit.prototype.limBallInCalc = function(s1, s2, i) {
	var d1 = glMatrix.vec3.fromValues(	s2[i+CPU_PART_XPOS] - this.px,	//dist x
								s2[i+CPU_PART_YPOS] - this.py,	//dist y
								s2[i+CPU_PART_ZPOS] - this.pz);	//dist z
			
	var dist = glMatrix.vec3.len(d1); //dist mag
			
	//based on:
	//http://www.ambrsoft.com/TrigoCalc/Sphere/SpherLineIntersection_.htm
	
	if (dist > this.radius) {	
		dist -= this.radius;	
		glMatrix.vec3.normalize(d1, d1);
		glMatrix.vec3.negate(d1, d1);
		
		var velocity = glMatrix.vec3.fromValues(s2[i+CPU_PART_XVEL],
												s2[i+CPU_PART_YVEL],
												s2[i+CPU_PART_ZVEL]);
		
		var kresPlus = 1.0 + this.K_resti;
		dist *= -kresPlus;
		
		var newPos = glMatrix.vec3.create();
		glMatrix.vec3.scale(newPos, d1, dist);
		s2[i+CPU_PART_XPOS] -= newPos[0];
		s2[i+CPU_PART_YPOS] -= newPos[1];
		s2[i+CPU_PART_ZPOS] -= newPos[2];			
		var reflect = glMatrix.vec3.create();
		glMatrix.vec3.scale(reflect, d1, kresPlus * glMatrix.vec3.dot(d1, velocity));
		glMatrix.vec3.subtract(reflect, velocity, reflect);
		
		s2[i+CPU_PART_XVEL] = reflect[0];
		s2[i+CPU_PART_YVEL] = reflect[1];
		s2[i+CPU_PART_ZVEL] = reflect[2];
	}
}

/**
 * Calculates the effect a sphere has on a particle
 *
 * @param {Float32Array} s1 state-variable current position
 * @param {Float32Array} s2 state-variable next position
 * @param {Number} i index of target particle
 */
CLimit.prototype.limBallOutCalc = function(s1, s2, i) {
	var d1 = glMatrix.vec3.fromValues(	s2[i+CPU_PART_XPOS] - this.px,	//dist x
								s2[i+CPU_PART_YPOS] - this.py,	//dist y
								s2[i+CPU_PART_ZPOS] - this.pz);	//dist z
	
	if (d1[0] >= this.radius || d1[1] >= this.radius || d1[2] >= this.radius)
		return;
			
	var dist = glMatrix.vec3.len(d1); //dist mag
			
	//based on:
	//http://www.ambrsoft.com/TrigoCalc/Sphere/SpherLineIntersection_.htm
	
	if (dist < this.radius) {		
		var difXYZ = glMatrix.vec3.fromValues(	s2[i+CPU_PART_XPOS] - s1[i+CPU_PART_XPOS], 	//diff x
										s2[i+CPU_PART_YPOS] - s1[i+CPU_PART_YPOS],	//diff y
										s2[i+CPU_PART_ZPOS] - s1[i+CPU_PART_ZPOS]);	//diff z

		var difC = glMatrix.vec3.fromValues(	this.px - s1[i+CPU_PART_XPOS],
									this.py - s1[i+CPU_PART_YPOS],
									this.pz - s1[i+CPU_PART_ZPOS]);

		var a = glMatrix.vec3.sqrLen(difXYZ);
		var b = -2 * glMatrix.vec3.dot(difXYZ, difC);
		var c = glMatrix.vec3.sqrLen(difC);
		c -= this.radius * this.radius;
				
		var disc = (b * b) - (4 * a * c);
				
		var t = -b - Math.sqrt(disc);
		t /= (2 * a);
		
		glMatrix.vec3.scale(difXYZ, difXYZ, t);
		
		s2[i+CPU_PART_XPOS] = s1[i+CPU_PART_XPOS] + difXYZ[0];
		s2[i+CPU_PART_YPOS] = s1[i+CPU_PART_YPOS] + difXYZ[1];
		s2[i+CPU_PART_ZPOS] = s1[i+CPU_PART_ZPOS] + difXYZ[2];	
		
		var invRad = 1.0 / this.radius;
		
		var unitNormal = glMatrix.vec3.fromValues(	(s2[i+CPU_PART_XPOS] - this.px) * invRad,
											(s2[i+CPU_PART_YPOS] - this.py) * invRad,
											(s2[i+CPU_PART_ZPOS] - this.pz) * invRad);
		
		var velImpact = glMatrix.vec3.fromValues(s2[i+CPU_PART_XVEL],//~vel at intersection
												s2[i+CPU_PART_YVEL],
												s2[i+CPU_PART_ZVEL]);
		
		//based on:
		//	https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/reflect.xhtml
		
		var velDotN = 2 * glMatrix.vec3.dot(unitNormal, velImpact);

		glMatrix.vec3.scale(unitNormal, unitNormal, velDotN);
		
		glMatrix.vec3.sub(velImpact, velImpact, unitNormal);
		s2[i+CPU_PART_XVEL] = velImpact[0] * this.K_resti;
		s2[i+CPU_PART_YVEL] = velImpact[1] * this.K_resti;
		s2[i+CPU_PART_ZVEL] = velImpact[2] * this.K_resti;

		/*
			The following lines increase the accuracy of the simulation.
			The impact is small in most cases. May cause other constraints to break
		*/
// 		t = (1-t)/240;
// 		s2[i+CPU_PART_XPOS] += s2[i+CPU_PART_XVEL] * t;	//calculates correct position 
// 		s2[i+CPU_PART_YPOS] += s2[i+CPU_PART_YVEL] * t; //for this time step.
// 		s2[i+CPU_PART_ZPOS] += s2[i+CPU_PART_ZVEL] * t; //disable if sluggish
	}
}

/**
 * Calculates the effect a plate has on a particle
 *
 * @param {Float32Array} s1 state-variable current position
 * @param {Float32Array} s2 state-variable next position
 * @param {Number} i index of target particle
 */
CLimit.prototype.limPlateCalc = function(s1, s2, i) {
	var p1 = glMatrix.vec4.fromValues(s1[i+CPU_PART_XPOS], s1[i+CPU_PART_YPOS], s1[i+CPU_PART_ZPOS], 1.0);
	var p2 = glMatrix.vec4.fromValues(s2[i+CPU_PART_XPOS], s2[i+CPU_PART_YPOS], s2[i+CPU_PART_ZPOS], 1.0);
	
	var wp1 = glMatrix.vec4.create();
	var wp2 = glMatrix.vec4.create();
	glMatrix.vec4.transformMat4(wp1, p1, this.world2wall);
	glMatrix.vec4.transformMat4(wp2, p2, this.world2wall);
	
	if (wp2[0] * wp2[0] <= this.lMax * this.lMax && 
		wp2[1] * wp2[1] <= this.wMax * this.wMax) {
		if ((wp1[2] > 0.0 && wp2[2] <= 0.0) || (wp1[2] <= 0.0 && wp2[2] > 0.0)){
			var velocity = glMatrix.vec3.fromValues(s2[i+CPU_PART_XVEL],
													s2[i+CPU_PART_YVEL],
													s2[i+CPU_PART_ZVEL]);
			var vn = glMatrix.vec3.clone(this.norm);
			glMatrix.vec3.scale(vn, vn, glMatrix.vec3.dot(velocity, vn));
			var vt = glMatrix.vec3.create();
			glMatrix.vec3.sub(vt, velocity, vn);
			var sub = glMatrix.vec3.create();
			glMatrix.vec3.sub(sub, p2, this.wc);
			var dn1 = glMatrix.vec3.dot(sub, this.norm);
			dn1 *= (1.0 + this.K_resti);
			
			s2[i+CPU_PART_XPOS] -= dn1 * this.norm[0];
			s2[i+CPU_PART_YPOS] -= dn1 * this.norm[1];
			s2[i+CPU_PART_ZPOS] -= dn1 * this.norm[2];
			
			glMatrix.vec3.scale(vn, vn, -this.K_resti);
			
			s2[i+CPU_PART_XVEL] = vn[0] + vt[0];
			s2[i+CPU_PART_YVEL] = vn[1] + vt[1];
			s2[i+CPU_PART_ZVEL] = vn[2] + vt[2];
		}
	}
}

/**
 * Calculates the effect a plate with a hole in it has on a particle
 *
 * @param {Float32Array} s1 state-variable current position
 * @param {Float32Array} s2 state-variable next position
 * @param {Number} i index of target particle
 */
CLimit.prototype.limPlateHoleCalc = function(s1, s2, i) {
	var p1 = glMatrix.vec4.fromValues(s1[i+CPU_PART_XPOS], s1[i+CPU_PART_YPOS], s1[i+CPU_PART_ZPOS], 1.0);
	var p2 = glMatrix.vec4.fromValues(s2[i+CPU_PART_XPOS], s2[i+CPU_PART_YPOS], s2[i+CPU_PART_ZPOS], 1.0);
	
	var wp1 = glMatrix.vec4.create();
	var wp2 = glMatrix.vec4.create();
	glMatrix.vec4.transformMat4(wp1, p1, this.world2wall);
	glMatrix.vec4.transformMat4(wp2, p2, this.world2wall);
	
	if (wp2[0] * wp2[0] <= this.lMax * this.lMax && 
		wp2[1] * wp2[1] <= this.wMax * this.wMax) {
		if ((wp1[2] > 0 && wp2[2] <= 0) || (wp1[2] <= 0 && wp2[2] > 0)) {
			if (glMatrix.vec3.distance(p2, this.wc) > this.radius) { //true == bounce()
				var velocity = glMatrix.vec3.fromValues(s2[i+CPU_PART_XVEL],
													s2[i+CPU_PART_YVEL],
													s2[i+CPU_PART_ZVEL]);
				var vn = glMatrix.vec3.clone(this.norm);
				glMatrix.vec3.scale(vn, vn, glMatrix.vec3.dot(velocity, vn));
				var vt = glMatrix.vec3.create();
				glMatrix.vec3.sub(vt, velocity, vn);
				var sub = glMatrix.vec3.create();
				glMatrix.vec3.sub(sub, p2, this.wc);
				var dn1 = glMatrix.vec3.dot(sub, this.norm);
				dn1 *= (1.0 + this.K_resti);
			
				s2[i+CPU_PART_XPOS] -= dn1 * this.norm[0];
				s2[i+CPU_PART_YPOS] -= dn1 * this.norm[1];
				s2[i+CPU_PART_ZPOS] -= dn1 * this.norm[2];
			
				glMatrix.vec3.scale(vn, vn, -this.K_resti);
			
				s2[i+CPU_PART_XVEL] = vn[0] + vt[0];
				s2[i+CPU_PART_YVEL] = vn[1] + vt[1];
				s2[i+CPU_PART_ZVEL] = vn[2] + vt[2];
			}
		}
	}
}

/**
 * Calculates the effect a plane has on a particle
 *
 * @param {Float32Array} s1 state-variable current position
 * @param {Float32Array} s2 state-variable next position
 * @param {Number} i index of target particle
 */
CLimit.prototype.limInfPlaneCalc = function(s1, s2, i) {
	var posBefore = glMatrix.vec4.fromValues(s1[i+CPU_PART_XPOS], s1[i+CPU_PART_YPOS], s1[i+CPU_PART_ZPOS], 1.0);
	var posAfter = glMatrix.vec4.fromValues(s2[i+CPU_PART_XPOS], s2[i+CPU_PART_YPOS], s2[i+CPU_PART_ZPOS], 1.0);
	
	var dot1 = glMatrix.vec4.dot(posBefore, this.norm);
	var dot2 = glMatrix.vec4.dot(posAfter, this.norm);
	
	if ((dot1 >= 0.0 && dot2 >= 0) || (dot1 < 0.0 && dot2 < 0.0))
		return;

	var fakeVel = glMatrix.vec3.create();
	glMatrix.vec3.sub(fakeVel, posAfter, posBefore);
	glMatrix.vec3.scale(fakeVel, fakeVel, 1.0 / g_timeStep);
	
	var vDotN = glMatrix.vec3.dot(fakeVel, this.norm);
	var d = dot1 / vDotN;
	
	var velChange = glMatrix.vec3.fromValues(	s2[i+CPU_PART_XVEL] - s1[i+CPU_PART_XVEL],
												s2[i+CPU_PART_YVEL] - s1[i+CPU_PART_YVEL],
												s2[i+CPU_PART_ZVEL] - s1[i+CPU_PART_ZVEL]);
	glMatrix.vec3.scale(velChange, velChange, d);
	var velImpact = glMatrix.vec3.len([ s1[i+CPU_PART_XVEL] + velChange[0],
										s1[i+CPU_PART_YVEL] + velChange[1],
										s1[i+CPU_PART_ZVEL] + velChange[2]]);
	glMatrix.vec3.normalize(fakeVel, fakeVel);
	glMatrix.vec3.scale(fakeVel, fakeVel, velImpact);
	
	var incomingVel = glMatrix.vec3.clone(fakeVel);
	var iDotN = glMatrix.vec3.dot(incomingVel, this.norm) * 2.0;
	glMatrix.vec3.scale(velChange, this.norm, iDotN);
	glMatrix.vec3.sub(incomingVel, incomingVel, velChange);
	
	s2[i+CPU_PART_XVEL] = incomingVel[0] * this.K_resti;
	s2[i+CPU_PART_YVEL] = incomingVel[1] * this.K_resti;
	s2[i+CPU_PART_ZVEL] = incomingVel[2] * this.K_resti;
	
	glMatrix.vec3.scale(fakeVel, fakeVel, d);
	glMatrix.vec3.add(fakeVel, fakeVel, posBefore);
	
	s2[i+CPU_PART_XPOS] = fakeVel[0];
	s2[i+CPU_PART_YPOS] = fakeVel[1];
	s2[i+CPU_PART_ZPOS] = fakeVel[2];
}

/**
 * Calculates the effect a vortex has on a particle
 *
 * @param {Float32Array} s1 state-variable current position
 * @param {Float32Array} s2 state-variable next position
 * @param {Number} i index of target particle
 */
CLimit.prototype.limVortexCalc = function(s1, s2, i) {
	//Chapter 5.2.2 in "Foundations of Physically Based Modelling"

	var xvi = glMatrix.vec3.fromValues(	s2[i+CPU_PART_XPOS] - this.base[0], //vector base to particle
								s2[i+CPU_PART_YPOS] - this.base[1],
								s2[i+CPU_PART_ZPOS] - this.base[2]);
	var li = glMatrix.vec3.dot(xvi, this.axis);	// length of projection of xvi on axis
	
	if (!(li >= 0 && li <= this.height)) //is particle within the axial length
		return;
	
	var ri = glMatrix.vec3.create();
	glMatrix.vec3.scaleAndAdd(ri, xvi, this.axis, -li); 	// vec from axis to particle
	var distRi = glMatrix.vec3.length(ri);				//||ri||
	
	if (distRi > this.radius)			//is particle within radius
		return;
	
	var fi = Math.pow(this.radius / distRi, this.tight) * this.freq;
	
	fi = Math.min(this.fmax, fi);
	
	var w = 2 * Math.PI * fi; //angular velociy
	
	//fancy vOp integrator, ooh
	var s1V = glMatrix.vec3.fromValues(s1[i+CPU_PART_XVEL], s1[i+CPU_PART_YVEL], s1[i+CPU_PART_ZVEL]);
	var s2V = glMatrix.vec3.fromValues(s2[i+CPU_PART_XVEL], s2[i+CPU_PART_YVEL], s2[i+CPU_PART_ZVEL]);
	var vAvg = glMatrix.vec3.create();
	var angVel = glMatrix.vec3.create();
	glMatrix.vec3.add(vAvg, s1V, s2V);
	glMatrix.vec3.scale(vAvg, vAvg, 0.5);
	
	glMatrix.vec3.cross(angVel, ri, this.axis);
	glMatrix.vec3.normalize(angVel, angVel);
	glMatrix.vec3.scale(angVel, angVel, w);
	
	glMatrix.vec3.add(vAvg, vAvg, angVel);
	glMatrix.vec3.scale(vAvg, vAvg, g_timeStep); 

	s2[i+CPU_PART_XPOS] += vAvg[0];
	s2[i+CPU_PART_YPOS] += vAvg[1];
	s2[i+CPU_PART_ZPOS] += vAvg[2];
}

/**
 * Calculates the change in color due to age
 *
 * @param {Float32Array} s1 state-variable current position
 * @param {Float32Array} s2 state-variable next position
 * @param {Number} i index of target particle
 */
CLimit.prototype.limColorAge = function(s1, s2, i) {
	var AtoL = s2[i+CPU_PART_AGE] / s2[i+CPU_PART_LIFE];
	
	AtoL *= this.range;
	AtoL += this.start;
	s2[i + CPU_PART_HUE + this.mode] = AtoL;
}

/**
 * Calculates the hue based on direction-xy
 *
 * @param {Float32Array} s1 state-variable current position
 * @param {Float32Array} s2 state-variable next position
 * @param {Number} i index of target particle
 */
CLimit.prototype.limColorVel = function(s1, s2, i) {
	var vel = glMatrix.vec2.fromValues(	s2[i+CPU_PART_XVEL],
										s2[i+CPU_PART_YVEL]);
	var cmp = glMatrix.vec2.create();
	cmp[0] = 1;
	var ang = glMatrix.vec2.angle(cmp, vel);
	ang *= 180.0 / Math.PI;
	if (vel[1] < 0.0)
		ang = -ang;
	s2[i+CPU_PART_HUE] = ang + this.offset;
}

/**
 * Compress/Expands the velocity to be within the defined range
 *
 * @param {Float32Array} s1 state-variable current position
 * @param {Float32Array} s2 state-variable next position
 * @param {Number} i index of target particle
 */
CLimit.prototype.limVelCmpdr = function(s1, s2, i) {
	var vel = glMatrix.vec3.fromValues(	s2[i+CPU_PART_XVEL],
										s2[i+CPU_PART_YVEL],
										s2[i+CPU_PART_ZVEL]);
	var mag = glMatrix.vec3.sqrLen(vel);
	if (mag < this.min * this.min) {
		glMatrix.vec3.normalize(vel, vel);
		glMatrix.vec3.scale(vel, vel, this.min);
	} else if (mag > this.max * this.max) {
		glMatrix.vec3.normalize(vel, vel);
		glMatrix.vec3.scale(vel, vel, this.max);
	} else {
		return;	
	}
	s2[i+CPU_PART_XVEL] = vel[0];
	s2[i+CPU_PART_YVEL] = vel[1];
	s2[i+CPU_PART_ZVEL] = vel[2];
}

//=============UNIFORMS=======================================================//

/**
 * Generates GLSL for the structs of each constraint
 *
 */
CLimit.prototype.getStructs = function() {
	var str = `
		struct LIM_VOL {
			mat4 w2p;
			vec3 pos;
			vec3 dim;
			vec3 len;
			vec3 wid;
			vec3 norm;
			float kres;
		};
		
		struct LIM_BALL_IN {
			vec3 pos;
			float r;
			float kres;
		};
		
		struct LIM_BALL_OUT {
			vec3 pos;
			float r;
			float kres;
		};
		
		struct LIM_PLATE {
			mat4 w2w;
			vec3 wc;
			vec3 norm;
			float lMax;
			float wMax;
			float kres;
		};
		
		struct LIM_PLATE_HOLE {
			mat4 w2w;
			vec3 wc;
			vec3 norm;
			float lMax;
			float wMax;
			float kres;
			float r;
		};
		
		struct LIM_INF_PLANE {
			vec4 norm;
			float kres;
		};
		
		struct LIM_VORTEX {
			vec3 base;
			vec3 axis;
			float radius;
			float height;
			float freq;
			float tight;
		};
		
		struct LIM_COLOR_AGE {
			float start;
			float range;
		};
		
		struct LIM_COLOR_VEL {
			float offset;
		};
		
		struct LIM_VEL_CMPDR {
			float min;
			float max;
		};
	`;
	return str;
}

/**
 * Generates GLSL for uniforms of each constraint
 *
 * @param {Number} t total indices of struct to create
 */
CLimit.prototype.getUniforms = function(t) {
	if (t != this.id)
		return "";
	
	var str = "";
	switch(this.limitType) {
		default:
			break;
		case LIM_VOL:
			str += "uniform LIM_VOL u_limVol[" + t + "];\n";
			break;
		case LIM_BALL_IN:
			str += "uniform LIM_BALL_IN u_limBallIn[" + t + "];\n";
			break;
		case LIM_BALL_OUT:
			str += "uniform LIM_BALL_OUT u_limBallOut[" + t + "];\n";
			break;
		case LIM_PLATE:
			str += "uniform LIM_PLATE u_limPlate[" + t + "];\n";
			break;
		case LIM_PLATE_HOLE:
			str += "uniform LIM_PLATE_HOLE u_limPlateHole[" + t + "];\n";
			break;
		case LIM_INF_PLANE:
			str += "uniform LIM_INF_PLANE u_limInfPlane[" + t + "];\n";
			break;
		case LIM_VORTEX:
			str += "uniform LIM_VORTEX u_limVortex[" + t + "];\n";
			break;
		case LIM_COLOR_AGE:
			str += "uniform LIM_COLOR_AGE u_limColorAge[" + t + "];\n";
			break;
		case LIM_COLOR_VEL:
			str += "uniform LIM_COLOR_VEL u_limColorVel[" + t + "];\n";
			break;
		case LIM_VEL_CMPDR:
			str += "uniform LIM_VEL_CMPDR u_limVelCmpdr[" + t + "];\n";
			break;
	}
	return str;
}

/**
 * Stores the uniform locations in the constraint
 *
 * @param {ShaderLoc} shaderLoc location of shader that the constraint belongs to
 */
CLimit.prototype.getUniformLocations = function(shaderLoc) {
	switch(this.limitType) {
		default:
			break;
		case LIM_VOL:
			this.u_w2p = gl.getUniformLocation(shaderLoc, 'u_limVol[' + (this.id - 1) + '].w2p');
			this.u_pos = gl.getUniformLocation(shaderLoc, 'u_limVol[' + (this.id - 1) + '].pos');
			this.u_dim = gl.getUniformLocation(shaderLoc, 'u_limVol[' + (this.id - 1) + '].dim');
			this.u_len = gl.getUniformLocation(shaderLoc, 'u_limVol[' + (this.id - 1) + '].len');
			this.u_wid = gl.getUniformLocation(shaderLoc, 'u_limVol[' + (this.id - 1) + '].wid');
			this.u_norm = gl.getUniformLocation(shaderLoc, 'u_limVol[' + (this.id - 1) + '].norm');
			this.u_kres = gl.getUniformLocation(shaderLoc, 'u_limVol[' + (this.id - 1) + '].kres');
			break;
		case LIM_BALL_IN:
			this.u_pos = gl.getUniformLocation(shaderLoc, 'u_limBallIn[' + (this.id - 1) + '].pos');
			this.u_r = gl.getUniformLocation(shaderLoc, 'u_limBallIn[' + (this.id - 1) + '].r');
			this.u_kres = gl.getUniformLocation(shaderLoc, 'u_limBallIn[' + (this.id - 1) + '].kres');
			break;
		case LIM_BALL_OUT:
			this.u_pos = gl.getUniformLocation(shaderLoc, 'u_limBallOut[' + (this.id - 1) + '].pos');
			this.u_r = gl.getUniformLocation(shaderLoc, 'u_limBallOut[' + (this.id - 1) + '].r');
			this.u_kres = gl.getUniformLocation(shaderLoc, 'u_limBallOut[' + (this.id - 1) + '].kres');
			break;
		case LIM_PLATE:
			this.u_w2w = gl.getUniformLocation(shaderLoc, 'u_limPlate[' + (this.id - 1) + '].w2w');
			this.u_wc = gl.getUniformLocation(shaderLoc, 'u_limPlate[' + (this.id - 1) + '].wc');
			this.u_norm = gl.getUniformLocation(shaderLoc, 'u_limPlate[' + (this.id - 1) + '].norm');
			this.u_lMax = gl.getUniformLocation(shaderLoc, 'u_limPlate[' + (this.id - 1) + '].lMax');
			this.u_wMax = gl.getUniformLocation(shaderLoc, 'u_limPlate[' + (this.id - 1) + '].wMax');
			this.u_kres = gl.getUniformLocation(shaderLoc, 'u_limPlate[' + (this.id - 1) + '].kres');
			break;
		case LIM_PLATE_HOLE:
			this.u_w2w = gl.getUniformLocation(shaderLoc, 'u_limPlateHole[' + (this.id - 1) + '].w2w');
			this.u_wc = gl.getUniformLocation(shaderLoc, 'u_limPlateHole[' + (this.id - 1) + '].wc');
			this.u_norm = gl.getUniformLocation(shaderLoc, 'u_limPlateHole[' + (this.id - 1) + '].norm');
			this.u_lMax = gl.getUniformLocation(shaderLoc, 'u_limPlateHole[' + (this.id - 1) + '].lMax');
			this.u_wMax = gl.getUniformLocation(shaderLoc, 'u_limPlateHole[' + (this.id - 1) + '].wMax');
			this.u_kres = gl.getUniformLocation(shaderLoc, 'u_limPlateHole[' + (this.id - 1) + '].kres');
			this.u_r = gl.getUniformLocation(shaderLoc, 'u_limPlateHole[' + (this.id - 1) + '].r');
			break;
		case LIM_INF_PLANE:
			this.u_norm = gl.getUniformLocation(shaderLoc, 'u_limInfPlane[' + (this.id - 1) + '].norm');
			this.u_kres = gl.getUniformLocation(shaderLoc, 'u_limInfPlane[' + (this.id - 1) + '].kres');
			break;
		case LIM_VORTEX:
			this.u_base = gl.getUniformLocation(shaderLoc, 'u_limVortex[' + (this.id - 1) + '].base');
			this.u_axis = gl.getUniformLocation(shaderLoc, 'u_limVortex[' + (this.id - 1) + '].axis');
			this.u_radius = gl.getUniformLocation(shaderLoc, 'u_limVortex[' + (this.id - 1) + '].radius');
			this.u_height = gl.getUniformLocation(shaderLoc, 'u_limVortex[' + (this.id - 1) + '].height');
			this.u_freq = gl.getUniformLocation(shaderLoc, 'u_limVortex[' + (this.id - 1) + '].freq');
			this.u_tight = gl.getUniformLocation(shaderLoc, 'u_limVortex[' + (this.id - 1) + '].tight');
			break;
		case LIM_COLOR_AGE:
			this.u_start = gl.getUniformLocation(shaderLoc, 'u_limColorAge[' + (this.id - 1) + '].start');
			this.u_range = gl.getUniformLocation(shaderLoc, 'u_limColorAge[' + (this.id - 1) + '].range');
			break;
		case LIM_COLOR_VEL:
			this.u_offset = gl.getUniformLocation(shaderLoc, 'u_limColorVel[' + (this.id - 1) + '].offset');
			break;
		case LIM_VEL_CMPDR:
			this.u_min = gl.getUniformLocation(shaderLoc, 'u_limVelCmpdr[' + (this.id - 1) + '].min');
			this.u_max = gl.getUniformLocation(shaderLoc, 'u_limVelCmpdr[' + (this.id - 1) + '].max');
			break;
	}
}

/**
 * Binds uniforms to currently equipped shader
 */
CLimit.prototype.bindUniforms = function() {
	switch(this.limitType) {
		default:
			break;
		case LIM_VOL:
			gl.uniformMatrix4fv(this.u_w2p, false, this.w2p);
			gl.uniform3fv(this.u_pos, this.pos);
			gl.uniform3fv(this.u_dim, this.dim);
			gl.uniform3fv(this.u_len, this.len);
			gl.uniform3fv(this.u_wid, this.wid);
			gl.uniform3fv(this.u_norm, this.norm);
			gl.uniform1f(this.u_kres, this.K_resti);
			break;
		case LIM_BALL_IN:
			gl.uniform3fv(this.u_pos, this.pos);
			gl.uniform1f(this.u_r, this.r);
			gl.uniform1f(this.u_kres, this.kres);
			break;
		case LIM_BALL_OUT:
			gl.uniform3fv(this.u_pos, this.pos);
			gl.uniform1f(this.u_r, this.r);
			gl.uniform1f(this.u_kres, this.kres);
			break;
		case LIM_PLATE:
			gl.uniformMatrix4fv(this.u_w2w, false, this.w2w);
			gl.uniform3fv(this.u_wc, this.wc);
			gl.uniform3fv(this.u_norm, this.norm);
			gl.uniform1f(this.u_lMax, this.lMax);
			gl.uniform1f(this.u_wMax, this.wMax);
			gl.uniform1f(this.u_kres, this.kres);
			break;
		case LIM_PLATE_HOLE:
			gl.uniformMatrix4fv(this.u_w2w, false, this.w2w);
			gl.uniform3fv(this.u_wc, this.wc);
			gl.uniform3fv(this.u_norm, this.norm);
			gl.uniform1f(this.u_lMax, this.lMax);
			gl.uniform1f(this.u_wMax, this.wMax);
			gl.uniform1f(this.u_kres, this.kres);
			gl.uniform1f(this.u_r, this.r);
			break;
		case LIM_INF_PLANE:
			gl.uniform4fv(this.u_norm, this.norm);
			gl.uniform1f(this.u_kres, this.K_resti);
			break;
		case LIM_VORTEX:
			gl.uniform3fv(this.u_base, this.base);
			gl.uniform3fv(this.u_axis, this.axis);
			gl.uniform1f(this.u_radius, this.radius);
			gl.uniform1f(this.u_height, this.height);
			gl.uniform1f(this.u_freq, this.freq);
			gl.uniform1f(this.u_tight, this.tight);
			break;
		case LIM_COLOR_AGE:
			gl.uniform1f(this.u_start, this.start);
			gl.uniform1f(this.u_range, this.range);
			break;
		case LIM_COLOR_VEL:
			gl.uniform1f(this.u_offset, this.offset);
			break;
		case LIM_VEL_CMPDR:
			gl.uniform1f(this.u_min, this.min);
			gl.uniform1f(this.u_max, this.max);
			break;
	}
}

//=============GENERATE GLSL CODE=============================================//

//=============Calculations

/**
 * Generates a string of GLSL code to handle the calculation in shader
 *
 * @return {String} string of calc function
 */
CLimit.prototype.getCalc = function() {
	switch(this.limitType) {
		default:
  		case LIM_NONE:
  			return;
  			break;
  		case LIM_VOL:
  			return this.getLimVolCalc();
  			break;
  		case LIM_BALL_IN:
  			return this.getLimBallInCalc();
  			break;
  		case LIM_BALL_OUT:
  			return this.getLimBallOutCalc();
  			break;
  		case LIM_PLATE:
  			return this.getLimPlateCalc();
  			break;
  		case LIM_PLATE_HOLE:
  			return this.getLimPlateHoleCalc();
  			break;
  		case LIM_INF_PLANE:
  			return this.getLimInfPlaneCalc();
  			break;
  		case LIM_VORTEX:
  			return this.getLimVortexCalc();
  			break;
  		case LIM_COLOR_AGE:
  			return this.getLimColorAgeCalc();
  			break;
  		case LIM_COLOR_VEL:
  			return this.getLimColorVelCalc();
  			break;
  		case LIM_VEL_CMPDR:
  			return this.getLimVelCmpdrCalc();
  			break;
	}
}

/**
 * Generates a string of GLSL code to handle the calculation in shader
 *
 * @return {String} string of calc function
 */
CLimit.prototype.getLimVolCalc = function() {
 	var str = `
 		/**
		 * Calculates the effect a bounding box has on a particle
		 *	Assumes particles start inside the box
		 *
		 * @param {mat4} w2p world to prism matrix
		 * @param {vec3} pos position vector
		 * @param {vec3} dim dimensions vector
		 * @param {vec3} len length vector
		 * @param {vec3} wid width vector
		 * @param {vec3} norm normal vector
		 * @param {float} kres coefficient of restitution
		 */
		 void limVolCalc(mat4 w2p, vec3 pos, vec3 dim, vec3 len, vec3 wid, vec3 norm, float kres) {
		 	vec4 wp2 = w2p * vec4(v_Position, 1.0);
		 	
		 	int bound;
		 	vec3 boundNorm;
		 	if (abs(wp2[0]) > dim[0]) {
		 		bound = 0;
		 		boundNorm = len;
		 	} 
		 	else if (abs(wp2[1]) > dim[1]) {
		 		bound = 1;
		 		boundNorm = wid;
		 	}
		 	else if (abs(wp2[2]) > dim[2]) {
		 		bound = 2;
		 		boundNorm = norm;
		 	}
		 	else
		 		return;
		 		
		 	vec3 velocity = (v_Position - a_Position) / u_timeStep;
		 	vec3 vn = boundNorm * dot(velocity, boundNorm);
		 	vec3 vt = velocity - vn;
		 	
		 	vec3 plane = boundNorm * dim[bound];
		 	
		 	float dist1 = distance((pos - plane), v_Position);
		 	float dist2 = distance((pos + plane), v_Position);
		 	
		 	if (dist1 <= dist2)
		 		plane = v_Position - (pos - plane);
		 	else
		 		plane = v_Position - (pos + plane);
		 	
		 	float dn1 = (1.0 + kres) * dot(plane, boundNorm);
		 	
		 	v_Position -= dn1 * boundNorm;
		 	
		 	v_Velocity = (vn * -kres) + vt;
		 }
 	`;
 	return str;
}

/**
 * Generates a string of GLSL code to handle the calculation in shader
 *
 * @return {String} string of calc function
 */
CLimit.prototype.getLimBallInCalc = function() {
	var str = `
 		/**
		 * Calculates LIM_BALL_IN
 		 *
 		 * @param {vec3} pos vector of sphere center
		 * @param {float} r radius of sphere
		 * @param {float} kres coefficient of restitution
		 */
		 void limBallInCalc(vec3 pos, float r, float kres) {
		 	float dist = distance(v_Position, pos);
		 	if (dist <= r)
		 		return;
		 	
		 	vec3 normal = normalize(pos - v_Position);
			v_Position -= (1.0 + kres) * (r-dist) * normal;
			v_Velocity -= (1.0 + kres) * normal * dot(v_Velocity, normal);
		 }
	`;
	return str;
}

/**
 * Generates a string of GLSL code to handle the calculation in shader
 *
 * @return {String} string of calc function
 */
CLimit.prototype.getLimBallOutCalc = function() {
 	var str = `
 		/**
		 * Calculates LIM_BALL_OUT
 		 *
 		 * @param {vec3} pos vector of sphere center
		 * @param {float} r radius of sphere
		 * @param {float} kres coefficient of restitution
		 */
		 void limBallOutCalc(vec3 pos, float r, float kres) {
		 	float dist = distance(v_Position, pos);
		 	if (dist >= r)
		 		return;
		 		
		 	//based on:
			//	http://www.ambrsoft.com/TrigoCalc/Sphere/SpherLineIntersection_.htm
		 		
		 	vec3 difXYZ = v_Position - a_Position;
		 	vec3 difC = pos - a_Position;
		 	
		 	float a = dot(difXYZ, difXYZ);		//x*x + y*y + z*z
		 	float b = -2.0 * dot(difXYZ, difC);
		 	float c = dot(difC, difC);
		 	c -= r * r;
		 	
		 	float disc = (b * b) - (4.0 * a * c);
		 	float t = -b - sqrt(disc);
		 	t /= 2.0 * a;
		 	
		 	difXYZ *= t;
		 	
		 	v_Position = a_Position + difXYZ;
		 	
		 	vec3 unitNormal = normalize(v_Position - pos);
		 	
		 	v_Velocity = reflect(v_Velocity, unitNormal) * kres;
		 }
 	`;
 	return str;
}

/**
 * Generates a string of GLSL code to handle the calculation in shader
 *
 * @return {String} string of calc function
 */
CLimit.prototype.getLimPlateCalc = function() {
 	var str = `
 		/**
		 * Calculates LIM_PLATE
		 *
		 * @param {mat4} w2w world to wall transformation matrix
		 * @param {vec3} wc wall center point
		 * @param {vec3} norm normal to the plate
		 * @param {float} lMax length
		 * @param {float} wMax width
		 * @param {float} kres coefficient of restitution
		 */
		 void limPlateCalc(mat4 w2w, vec3 wc, vec3 norm, float lMax, float wMax, float kres) {
		 	vec4 wp1 = w2w * vec4(a_Position, 1.0);
		 	vec4 wp2 = w2w * vec4(v_Position, 1.0);
		 	
		 	if (wp2.x * wp2.x <= lMax * lMax && wp2.y * wp2.y <= wMax * wMax) {
		 		if ((wp1.z > 0.0 && wp2.z <= 0.0) || (wp1.z <= 0.0 && wp2.z > 0.0)) {
		 			// algorithm adapted from Chapter 4.4.3 in 
		 			// "Foundations of Physically Based Modeling and Animation"
		 			vec3 vn = dot(v_Velocity, norm) * norm;
		 			vec3 vt = v_Velocity - vn;
		 			float dn1 = dot(v_Position - wc, norm);
		 			v_Position -= (1.0 + kres) * dn1 * norm;
		 			v_Velocity = -kres * vn + vt;
		 		}
		 	}
		 }
 	`;
 	return str;
}

/**
 * Generates a string of GLSL code to handle the calculation in shader
 *
 * @return {String} string of calc function
 */
CLimit.prototype.getLimPlateHoleCalc = function() {
 	var str = `
 		/**
		 * Calculates LIM_PLATE_HOLE
		 *
		 * @param {mat4} w2w world to wall transformation matrix
		 * @param {vec3} wc wall center point
		 * @param {vec3} norm normal to the plate
		 * @param {float} lMax length
		 * @param {float} wMax width
		 * @param {float} kres coefficient of restitution
		 * @param {float} r radius of hole
		 */
		 void limPlateHoleCalc(mat4 w2w, vec3 wc, vec3 norm, float lMax, float wMax, float kres, float r) {
		 	vec4 wp1 = w2w * vec4(a_Position, 1.0);
		 	vec4 wp2 = w2w * vec4(v_Position, 1.0);
		 	
		 	if (wp2.x * wp2.x <= lMax * lMax && wp2.y * wp2.y <= wMax * wMax) {
		 		if ((wp1.z > 0.0 && wp2.z <= 0.0) || (wp1.z <= 0.0 && wp2.z > 0.0)) {
		 			if (distance(v_Position, wc) >= r) {
						vec3 vn = dot(v_Velocity, norm) * norm;
						vec3 vt = v_Velocity - vn;
						float dn1 = dot(v_Position - wc, norm);
						v_Position -= (1.0 + kres) * dn1 * norm;
						v_Velocity = -kres * vn + vt;
					}
		 		}
		 	}
		 }
 	`;
 	return str;
}

/**
 * Generates a string of GLSL code to handle the calculation in shader
 *
 * @return {String} string of calc function
 */
CLimit.prototype.getLimInfPlaneCalc = function() {
	var str = `
		/**
		 * Calculates Infinite Collision surface
		 *
		 * @param {vec4} norm vector normal to the plane
		 * @param {float} kres coefficient of restitution
		 */
		void limInfPlaneCalc(vec4 norm, float kres) {
			float dot1 = dot(vec4(a_Position, 1.0), norm);
			float dot2 = dot(vec4(v_Position, 1.0), norm);
			
			//checks for sign change in Ax + By + Cz - D = 0
			if ((dot1 >= 0.0 && dot2 >= 0.0) || (dot1 < 0.0 && dot2 < 0.0))
				return;
			
			vec3 fakeVel = (v_Position - a_Position) / u_timeStep;
			
			float vDotN = dot(fakeVel, norm.xyz);
			float d = dot1 / vDotN;
			
			vec3 velChange = v_Velocity - a_Velocity;	//comment out for less stable 
			float velImpact = length(a_Velocity + (velChange * d)); //results
			fakeVel = normalize(fakeVel) * velImpact;
			
			v_Velocity = reflect(fakeVel, norm.xyz) * kres;
			v_Position = a_Position.xyz + (fakeVel * d);
		}
	`;
	return str;
}

/**
 * Generates a string of GLSL code to handle the calculation in shader
 * fmax is currently constant
 *
 * @return {String} string of calc function
 */
CLimit.prototype.getLimVortexCalc = function() {
 	var str = `
 		/**
 		 * Calculates the effect a vortex has on a particle
 		 *
 		 * @param {vec3} base position at bottom center of vortex
 		 * @param {vec3} axis of cylinder (normalized)
 		 * @param {float} radius of cylinder
 		 * @param {float} height of cylinder
 		 * @param {float} frequency of rotation, measured in Hz
 		 * @param {float} tight, tightness of falloff (2 is physically accurate)
 		 */
 		 void limVortexCalc(vec3 base, vec3 axis, float radius, float height, float freq, float tight) {
 		 	//Chapter 5.2.2 in "Foundations of Physically Based Modelling"
 		 	
 		 	vec3 xvi = v_Position - base;	//vector base to particle
 		 	float li = dot(xvi, axis); 		//length of projection of xvi on axis
 		 	
 		 	if (!(li >= 0.0 && li <= height)) //is particle within axial length
 		 		return;
 		 		
 		 	vec3 ri = xvi + (axis * -li);		// vec from axis to particle
 		 	float distRi = length(ri);			//||ri||
 		 	
 		 	if (distRi > radius)	//is particle within radius?
 		 		return;
 		 	
 		 	float fi = pow(radius / distRi, tight) * freq;
 		 	fi = min(6.0, fi);
 		 	
 		 	float w = 2.0 * PI * fi;	//angular velocity
 		 	
 		 	vec3 vAvg = (v_Velocity + a_Velocity) * 0.5;
 		 	vec3 angVel = cross(ri, axis);
 		 	angVel = normalize(angVel) * w;
 		 	
 		 	vAvg += angVel;
 		 	vAvg *= u_timeStep;
 		 	
 		 	v_Position += vAvg;
 		 }
 	`;
 	return str;
}
 
/**
 * Generates a string of GLSL code to handle the calculation in shader
 * fmax is currently constant
 *
 * @return {String} string of calc function
 */
CLimit.prototype.getLimColorAgeCalc = function() {
 	var str = `
 		/**
 		 * Calculates the color based on age
 		 *
 		 * @param {int} mode 0 = Hue, 1 = Sat, 2 = Int
 		 * @param {float} start starting value
 		 * @param {float} range values (end - start)
 		 */
 		 void limColorAgeCalc(int mode, float start, float range) {
 		 	float AtoL = v_Age / v_Life;
 		 	
 		 	AtoL *= range;
 		 	AtoL += start;
 		 	if (mode == 0)
 		 		v_HSI.r = AtoL;
 		 	else if (mode == 1)
 		 		v_HSI.g = AtoL;
 		 	else
 		 		v_HSI.b = AtoL;
 		 }
 	`;
 	return str;
}

/**
 * Generates a string of GLSL code to handle the calculation in shader
 * fmax is currently constant
 *
 * @return {String} string of calc function
 */
CLimit.prototype.getLimColorVelCalc = function() {
 	var str = `
 		/**
 		 * Calculates the color based on age
 		 *
 		 * @param {float} offset of hue change
 		 */
 		 void limColorVelCalc(float offset) {
 		 	float cmp = dot(v_Velocity.xy, vec2(1.0, 0.0)) / length(v_Velocity.xy);
			float ang = acos(cmp);
			ang = degrees(ang);
			if (v_Velocity.y < 0.0)
				ang = -ang;
			v_HSI.r = ang + offset;
 		 }
 	`;
 	return str;
}
 
/**
 * Generates a string of GLSL code to handle the calculation in shader
 * fmax is currently constant
 *
 * @return {String} string of calc function
 */
CLimit.prototype.getLimVelCmpdrCalc = function() {
	var str = `
		/**
 		 * Compress/Expands the velocity to be within the defined range
 		 *
 		 * @param {float} min minimum velocity magnitude
 		 * @param {float} max maximum velocity magnitude
  		 */
 		void limVelCmpdrCalc(float min, float max) {
 			float sqrLen = length(v_Velocity);
 			if (sqrLen < min) {
 				v_Velocity = normalize(v_Velocity) * min;
 			} else if (sqrLen > max) {
 				v_Velocity = normalize(v_Velocity) * max;
 			}
 		}
	`;
	return str;
}
 
//=============Do Constraint

/**
 * Generates a string of GLSL code to go inside the doConstraint Function
 *
 * @return {String} string to call calc function
 */
CLimit.prototype.getCall = function() {
	switch(this.limitType) {
		default:
  		case LIM_NONE:
  			return;
  			break;
  		case LIM_VOL:
  			return this.getLimVolCall();
  			break;
  		case LIM_BALL_IN:
  			return this.getLimBallInCall();
  			break;
  		case LIM_BALL_OUT:
  			return this.getLimBallOutCall();
  			break;
  		case LIM_PLATE:
  			return this.getLimPlateCall();
  			break;
  		case LIM_PLATE_HOLE:
  			return this.getLimPlateHoleCall();
  			break;
  		case LIM_INF_PLANE:
  			return this.getLimInfPlaneCall();
  			break;
  		case LIM_VORTEX:
  			return this.getLimVortexCall();
  			break;
  		case LIM_COLOR_AGE:
  			return this.getLimColorAgeCall();
  			break;
  		case LIM_COLOR_VEL:
  			return this.getLimColorVelCall();
  			break;
  		case LIM_VEL_CMPDR:
  			return this.getLimVelCmpdrCall();
  			break;
	}
}

/**
 * Generates a string of GLSL code to go inside the doConstraint Function
 * Not currently uniform capable. 
 *
 * @return {String} string to call calc function
 */
CLimit.prototype.getLimVolCall = function() {
 	var str = "limVolCalc(u_limVol[" + (this.id - 1) + "].w2p, u_limVol[" + (this.id - 1) + "].pos, " 
 				+ "u_limVol[" + (this.id - 1) + "].dim, u_limVol[" + (this.id - 1) + "].len, " 
				+ "u_limVol[" + (this.id - 1) + "].wid, u_limVol[" + (this.id - 1) + "].norm, "
				+ "u_limVol[" + (this.id - 1) + "].kres);\n";
	return str;
}

/**
 * Generates a string of GLSL code to go inside the doConstraint Function
 * Not currently uniform capable. 
 *
 * @return {String} string to call calc function
 */
CLimit.prototype.getLimBallInCall = function() {
	var str = "limBallInCalc(u_limBallIn[" + (this.id - 1) + "].pos, u_limBallIn[" 
						+ (this.id - 1) + "].r, u_limBallIn[" + (this.id - 1) + "].kres);\n";
	return str;
}

/**
 * Generates a string of GLSL code to go inside the doConstraint Function
 * Not currently uniform capable. 
 *
 * @return {String} string to call calc function
 */
CLimit.prototype.getLimBallOutCall = function() {
	var str = "limBallOutCalc(u_limBallOut[" + (this.id - 1) + "].pos, u_limBallOut[" 
						+ (this.id - 1) + "].r, u_limBallOut[" + (this.id - 1) + "].kres);\n";
	return str;
}

/*
 * Generates a string of GLSL code to go inside the doConstraint Function
 * Not currently uniform capable. 
 *
 * @return {String} string to call calc function
 */
CLimit.prototype.getLimPlateCall = function() {
	var str =  "limPlateCalc(u_limPlate[" + (this.id - 1) + "].w2w, u_limPlate[" + (this.id - 1) + "].wc, " 
 				+ "u_limPlate[" + (this.id - 1) + "].norm, u_limPlate[" + (this.id - 1) + "].lMax, " 
				+ "u_limPlate[" + (this.id - 1) + "].wMax, u_limPlate[" + (this.id - 1) + "].kres);\n";
	return str;
}

/*
 * Generates a string of GLSL code to go inside the doConstraint Function
 * Not currently uniform capable. 
 *
 * @return {String} string to call calc function
 */
CLimit.prototype.getLimPlateHoleCall = function() {
	var str = "limPlateHoleCalc(u_limPlateHole[" + (this.id - 1) + "].w2w, u_limPlateHole[" + (this.id - 1) + "].wc, " 
 				+ "u_limPlateHole[" + (this.id - 1) + "].norm, u_limPlateHole[" + (this.id - 1) + "].lMax, " 
				+ "u_limPlateHole[" + (this.id - 1) + "].wMax, u_limPlateHole[" + (this.id - 1) + "].kres, "
				+ "u_limPlateHole[" + (this.id - 1) + "].r);\n";
	return str;
}

/**
 * Generates a string of GLSL code to go inside the doConstraint Function
 * Not currently uniform capable. 
 *
 * @return {String} string to call calc function
 */
CLimit.prototype.getLimInfPlaneCall = function() {
	var str = "limInfPlaneCalc(u_limInfPlane[" + (this.id - 1) + "].norm, u_limInfPlane[" 
						+ (this.id - 1) + "].kres);\n";
	return str;
}

/**
 * Generates a string of GLSL code to go inside the doConstraint Function
 * Not currently uniform capable. 
 *
 * @return {String} string to call calc function
 */
CLimit.prototype.getLimVortexCall = function() {
	var str =  "limVortexCalc(u_limVortex[" + (this.id - 1) + "].base, u_limVortex[" + (this.id - 1) + "].axis, " 
 				+ "u_limVortex[" + (this.id - 1) + "].radius, u_limVortex[" + (this.id - 1) + "].height, " 
				+ "u_limVortex[" + (this.id - 1) + "].freq, u_limVortex[" + (this.id - 1) + "].tight);\n";
	return str;
}

/**
 * Generates a string of GLSL code to go inside the doConstraint Function
 * Not currently uniform capable. 
 *
 * @return {String} string to call calc function
 */
CLimit.prototype.getLimColorAgeCall = function() {
	var str = "limColorAgeCalc(" + this.mode + ", u_limColorAge[" + (this.id - 1) + "].start, u_limColorAge[" 
						+ (this.id - 1) + "].range);\n";
	return str;
}

/**
 * Generates a string of GLSL code to go inside the doConstraint Function
 * Not currently uniform capable. 
 *
 * @return {String} string to call calc function
 */
CLimit.prototype.getLimColorVelCall = function() {
	var str = "limColorVelCalc(u_limColorVel[" + (this.id - 1) + "].offset);\n";
	return str;
}

/**
 * Generates a string of GLSL code to go inside the doConstraint Function
 * Not currently uniform capable. 
 *
 * @return {String} string to call calc function
 */
CLimit.prototype.getLimVelCmpdrCall = function() {
	var str = "limVelCmpdrCalc(u_limVelCmpdr[" + (this.id - 1) + "].min, u_limVelCmpdr[" 
						+ (this.id - 1) + "].max);\n";
	return str;
}