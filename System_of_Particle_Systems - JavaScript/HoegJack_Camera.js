/*
	Camera
	by Jack Hoeg
	Last Edited: February 8, 2020
*/

/*
	TODO:
		make better rotation method so that tilt is more responsive
		add lookAt mode
		improve constructor
		add roll functionality
		allow discrete values to be used in place of dollySpeed, panStep, tiltStep, etc.
		add viewports
		Dollying in 2 directions at once increases the speed
		movement functions normalize displace, it will save time
 */

/*
 * Constructor
 */
function Camera() {
	this.camType = 1; //1 = Perspective, 0 = Ortho

	this.fov = glMatrix.glMatrix.toRadian(40.0); //glMatrix.mat4.perspective expects radians
	this.upV = glMatrix.vec3.fromValues(0.0, 0.0, 1.0);
	glMatrix.vec3.normalize(this.upV, this.upV);

	this.panPoint = 3.725;
	this.panStep = 0.02; //pan speed
	this.tiltPoint = 30.209;
	this.tiltStep = 0.015; //tilt speed
	this.eyePoint  = glMatrix.vec3.fromValues(80.579,  47.326,  30.112); //camera position
	this.lookPoint = glMatrix.vec3.fromValues(	this.eyePoint[0]+Math.cos(this.panPoint), 
										this.eyePoint[1] + Math.sin(this.panPoint), 
										this.tiltPoint);
	this.dollySpeed = 0.3; //speed for horizontal, vertical movement
	
	this.znear = 0.01; //near clipping plane
	this.zfar = 600.0; //far clipping plane
	this.zdist = (this.zfar - this.znear) / 3;
	
	this.perAspect;
	
	this.halfHeight = this.zdist * Math.tan(Math.PI / 9);
	this.halfWidth = this.halfHeight * this.perAspect; 
	
	this.changed = true;
	
	this.viewMat = glMatrix.mat4.create();
	this.projMat = glMatrix.mat4.create();
	this.vp = glMatrix.mat4.create();
	this.mvp = glMatrix.mat4.create();; //provides faster access to models with id model matricies
}

/*
 * Initializes Camera
 */
Camera.prototype.init = function() {
	this.refreshAspect();
	this.refreshView();
	this.refreshVP();
}

/*
 * Generates MVP from incoming model mat
 *
 * @param {mat4} mat model matrix
 */
Camera.prototype.camStart = function(mat) {
	glMatrix.mat4.identity(mat);
	glMatrix.mat4.multiply(mat, mat, this.vp);
}

/*
 * Swaps between Perspective and Orthographic Views
 */
Camera.prototype.changeType = function() {
	this.camType = !this.camType;
	this.refreshProj();
}

/*
 * Updates aspect ratio
 */
Camera.prototype.refreshAspect = function() {
	this.perAspect = g_canvas.width / g_canvas.height;
	this.refreshProj();
}

/*
 * Updates view matrix
 */
Camera.prototype.refreshView = function() {
	glMatrix.mat4.lookAt(this.viewMat, this.eyePoint, this.lookPoint, this.upV);
    this.changed = true;
}

/*
 * Updates projection matrix
 */
Camera.prototype.refreshProj = function() {
	if (this.camType)
  		glMatrix.mat4.perspective(this.projMat, this.fov, this.perAspect, this.znear, this.zfar);	
  	else {
  		this.halfWidth = this.halfHeight * this.perAspect; 
  		glMatrix.mat4.ortho(this.projMat, -this.halfWidth, this.halfWidth, -this.halfHeight, this.halfHeight, 
  					this.znear, this.zfar);
  	}
  	this.changed = true;
}

/*
 * Updates view-projection matrix
 */
Camera.prototype.refreshVP = function() {
	this.vp = glMatrix.mat4.clone(this.projMat)//new Matrix4(this.projMat);
	glMatrix.mat4.multiply(this.vp, this.vp, this.viewMat);
	this.changed = false;
	this.refreshMVP();
}

/*
 * Updates model view projection matrix
 */
Camera.prototype.refreshMVP = function() {
	glMatrix.mat4.identity(this.mvp);
	glMatrix.mat4.multiply(this.mvp, this.mvp, this.vp);
}

//=============Cam Controls

/**
 * Gets the normalized vector in the direction of the camera
 *
 */
Camera.prototype.getForwardDir = function() {
	var displace = glMatrix.vec3.create();
	glMatrix.vec3.sub(displace, this.lookPoint, this.eyePoint);
	glMatrix.vec3.normalize(displace, displace);
	return displace;
}

/**
 * Gets the normalized vector perpendicular to the camera
 *
 */
Camera.prototype.getSideDir = function() {
	var displace = glMatrix.vec3.create();
	glMatrix.vec3.sub(displace, this.lookPoint, this.eyePoint);
	glMatrix.vec3.cross(displace, displace, this.upV);
	glMatrix.vec3.normalize(displace, displace);
	return displace;
}

/*
 * Transforms vp in view direc
 */
Camera.prototype.dollyForward = function() {
	var displace = glMatrix.vec3.create();
	glMatrix.vec3.sub(displace, this.lookPoint, this.eyePoint);
	glMatrix.vec3.normalize(displace, displace);
	glMatrix.vec3.scale(displace, displace, this.dollySpeed);
	glMatrix.vec3.add(this.eyePoint, this.eyePoint, displace);
	glMatrix.vec3.add(this.lookPoint, this.lookPoint, displace);
	this.tiltPoint = this.lookPoint[2];
	glMatrix.vec3.negate(displace, displace)
	glMatrix.mat4.translate(this.viewMat,this.viewMat, displace);
	this.changed = true;
}

/*
 * Transforms vp in oppositie of view direc
 */
Camera.prototype.dollyBack = function() {
	var displace = glMatrix.vec3.create();
	glMatrix.vec3.sub(displace, this.lookPoint, this.eyePoint);
	glMatrix.vec3.normalize(displace, displace);
	glMatrix.vec3.scale(displace, displace, -this.dollySpeed);
	glMatrix.vec3.add(this.eyePoint, this.eyePoint, displace);
	glMatrix.vec3.add(this.lookPoint, this.lookPoint, displace);
	this.tiltPoint = this.lookPoint[2];
	glMatrix.vec3.negate(displace, displace)
	glMatrix.mat4.translate(this.viewMat,this.viewMat, displace);
	this.changed = true;
}

/*
 * Transforms vp perpendicular to view direc
 */
Camera.prototype.strafeLeft = function() {
	var displace = glMatrix.vec3.create();
	glMatrix.vec3.sub(displace, this.lookPoint, this.eyePoint);
	glMatrix.vec3.cross(displace, displace, this.upV);
	glMatrix.vec3.normalize(displace, displace);
	glMatrix.vec3.scale(displace, displace, -this.dollySpeed);
	glMatrix.vec3.add(this.eyePoint, this.eyePoint, displace);
	glMatrix.vec3.add(this.lookPoint, this.lookPoint, displace);
	glMatrix.vec3.negate(displace,displace);
	glMatrix.mat4.translate(this.viewMat, this.viewMat, displace);
	this.changed = true;
}

/*
 * Transforms vp perpendicular to view direc
 */
Camera.prototype.strafeRight = function() {
	var displace = glMatrix.vec3.create();
	glMatrix.vec3.sub(displace, this.lookPoint, this.eyePoint);
	glMatrix.vec3.cross(displace, displace, this.upV);
	glMatrix.vec3.normalize(displace, displace);
	glMatrix.vec3.scale(displace, displace, this.dollySpeed);
	glMatrix.vec3.add(this.eyePoint, this.eyePoint, displace);
	glMatrix.vec3.add(this.lookPoint, this.lookPoint, displace);
	glMatrix.vec3.negate(displace,displace);
	glMatrix.mat4.translate(this.viewMat, this.viewMat, displace);
	this.changed = true;
}

/*
 * Moves look point up
 */
Camera.prototype.tiltUp = function() {
	this.tiltPoint += this.tiltStep;
	this.lookPoint[2] = this.tiltPoint;
}

/*
 * Moves look point down
 */
Camera.prototype.tiltDown = function() {
	this.tiltPoint -= this.tiltStep;
	this.lookPoint[2] = this.tiltPoint;
}

/*
 * Rotates view left
 */
Camera.prototype.panLeft = function() {
	this.panPoint += this.panStep;
	this.lookPoint[0] = this.eyePoint[0]+Math.cos(this.panPoint);
	this.lookPoint[1] = this.eyePoint[1]+Math.sin(this.panPoint);
}

/*
 * Rotates view right
 */
Camera.prototype.panRight = function() {
	this.panPoint -= this.panStep;
	this.lookPoint[0] = this.eyePoint[0]+Math.cos(this.panPoint);
	this.lookPoint[1] = this.eyePoint[1]+Math.sin(this.panPoint);
}

/*
 * Transforms vp mat toward up direction
 */
Camera.prototype.craneUp = function() {
	this.eyePoint[2] += this.dollySpeed;
	this.lookPoint[2] += this.dollySpeed;
	this.tiltPoint = this.lookPoint[2];
	var scaledUp = glMatrix.vec3.clone(this.upV); //assumes this.upV is normalized
	scaledUp = glMatrix.vec3.scale(scaledUp, scaledUp, -this.dollySpeed);
	glMatrix.mat4.translate(this.viewMat, this.viewMat, scaledUp);
	this.changed = true;
}

/*
 * Transforms vp mat away from up direction
 */
Camera.prototype.craneDown = function() {	
	this.eyePoint[2] -= this.dollySpeed;
	this.lookPoint[2] -= this.dollySpeed;
	this.tiltPoint = this.lookPoint[2];
	var scaledUp = glMatrix.vec3.clone(this.upV); //assumes this.upV is normalized
	scaledUp = glMatrix.vec3.scale(scaledUp, scaledUp, this.dollySpeed);
	glMatrix.mat4.translate(this.viewMat, this.viewMat, scaledUp);
	this.changed = true;
}