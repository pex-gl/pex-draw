var Vec2 = require('pex-math/Vec2');
var Vec3 = require('pex-math/Vec3');
var Quat = require('pex-math/Quat');
var Vec4 = require('pex-math/Vec4');
var Mat3 = require('pex-math/Mat3');
var Mat4 = require('pex-math/Mat4');
var Rect = require('pex-geom/Rect');
var AABB = require('pex-geom/AABB');


var MAT4_IDENTITY = Mat4.create();
var VEC2_ONE      = [1,1];
var VEC3_ZERO     = [0,0,0];
var AXIS_X = Vec3.xAxis();
var AXIS_Y = Vec3.yAxis();
var AXIS_Z = Vec3.zAxis();

var DEFAULT_VECTOR_HEAD_LENGTH = 0.125 * 0.5;
var DEFAULT_VECTOR_HEAD_RADIUS = 0.075 * 0.5;

var NORMAL_HEAD_LENGTH = DEFAULT_VECTOR_HEAD_LENGTH * 0.5;
var NORMAL_HEAD_RADIUS = DEFAULT_VECTOR_HEAD_RADIUS * 0.5;

var GIZMO_ROTATION_FOCUS_AXIS_LINE_WIDTH_SCALE = 3;
var GIZMO_ROTATION_FOCUS_PIVOT_SCALE = 0.25;

function createArrWithValuesArgs(numElements,args){
    var elementSize = arguments.length - 1;
    var element     = new Array(elementSize);
    var out         = new Array(elementSize * numElements);

    for(var i = 0; i < elementSize; ++i){
        element[i] = arguments[1 + i];
    }
    for(var i = 0, l = out.length; i < l; i += elementSize){
        for(var j = 0; j < elementSize; ++j){
            out[i + j] = element[j];
        }
    }

    return out;
}

function createArrWithValuesv(numElements,v){
    var length = v.length;
    var out    = new Array(length * numElements);

    for(var i = 0, l = out.length; i < l; i += length){
        for(var j = 0; j < length; ++j){
            out[i + j] = v[j];
        }
    }

    return out;
}

function concatArrv(args){
    var out = arguments[0];
    for(var i = 1, l = arguments.length; i < l; ++i){
        out = out.concat(arguments[i]);
    }
    return out;
}

function arrFillVec3(a,v){
    for(var i = 0, l = a.length; i < l; i+=3){
        a[i  ] = v[0];
        a[i+1] = v[1];
        a[i+2] = v[2];
    }
    return a;
}

function arrFillVec4(a,v){
    for(var i = 0, l = a.length; i < l; i+=4){
        a[i  ] = v[0];
        a[i+1] = v[1];
        a[i+2] = v[2];
        a[i+3] = v[3];
    }
    return a;
}

function arrUnpack3(a,out){
    out.length = a.length * 3;
    for(var i = 0, j = 0, l = out.length, element; i < l; i+=3, j+=1){
        element = a[j];
        out[i  ] = element[0];
        out[i+1] = element[1];
        out[i+2] = element[2];
    }
    return out;
}

function arrUnpack32(a,out){
    out.length = a.length * 3 * 2;
    for(var i = 0, j = 0, l = out.length, element; i < l; i+=6,j+=1){
        element = a[j][0];
        out[i  ] = element[0];
        out[i+1] = element[1];
        out[i+2] = element[2];
        element = a[j][1];
        out[i+3] = element[0];
        out[i+4] = element[1];
        out[i+5] = element[2];
    }
    return out;
}

function genTriangleFan(start,end,out){
    var arr = out || [];
    var len = end - start;
    if(len < 3){
        return arr;
    }
    arr.length = (len - 1) * 3 - 3;

    var begin = start;
    var end_2 = end - 2;
    var index = 0;

    while(start < end_2){
        arr[index    ] = begin;
        arr[index + 1] = start + 1;
        arr[index + 2] = start + 2;
        start++;
        index += 3;
    }

    return arr;
}

function multVec3Mat4AI(a,b,i){
    var x = a[i];
    var y = a[i + 1];
    var z = a[i + 2];

    a[i    ] = b[0] * x + b[4] * y + b[8] * z + b[12];
    a[i + 1] = b[1] * x + b[5] * y + b[9] * z + b[13];
    a[i + 2] = b[2] * x + b[6] * y + b[10] * z + b[14];
}

function Draw(ctx){
    this._ctx = ctx;

    this._programPrev = null;

    this._programHasAttribPosition = false;
    this._programHasAttribNormal   = false;
    this._programHasAttribColor    = false;
    this._programHasAttribTexcoord = false;

    this._color     = Vec4.create();
    this._pointSize = 1;
    this._numSegmentsCircle = 16;
    this._numSegmentsEllipse = 16;


    // POINT

    this._bufferPointPosition = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(3), ctx.DYNAMIC_DRAW, true
    );

    this._bufferPointColor = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(4), ctx.DYNAMIC_DRAW, true
    );

    this._vaoPoint = ctx.createVertexArray([
        { buffer : this._bufferPointPosition, location : ctx.ATTRIB_POSITION, size : 3 },
        { buffer : this._bufferPointColor,    location : ctx.ATTRIB_COLOR,    size : 4 }
    ]);

    // POINTS

    this._bufferPointsPosition = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(0), ctx.DYNAMIC_DRAW, true
    );

    this._bufferPointsColor = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(0), ctx.DYNAMIC_DRAW, true
    );

    this._vaoPoints = ctx.createVertexArray([
        { buffer : this._bufferPointsPosition, location : ctx.ATTRIB_POSITION, size : 3 },
        { buffer : this._bufferPointsColor,    location : ctx.ATTRIB_COLOR,    size : 4 }
    ]);

    this._tempArrPoints = [];

    // LINE

    this._bufferLinePosition = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(6), ctx.DYNAMIC_DRAW, true
    );

    this._bufferLineColor = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(8), ctx.DYNAMIC_DRAW, true
    );

    this._vaoLine = ctx.createVertexArray([
        { buffer : this._bufferLinePosition, location : ctx.ATTRIB_POSITION, size : 3 },
        { buffer : this._bufferLineColor,    location : ctx.ATTRIB_COLOR, size : 4}
    ]);

    // LINE STRIP

    this._bufferLineStripPosition = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(0), ctx.DYNAMIC_DRAW, true
    );

    this._bufferLineStripColor = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(0), ctx.DYNAMIC_DRAW, true
    );

    this._vaoLineStrip = ctx.createVertexArray([
        { buffer : this._bufferLineStripPosition, location : ctx.ATTRIB_POSITION, size : 3},
        { buffer : this._bufferLineStripColor,    location : ctx.ATTRIB_COLOR, size : 4}
    ]);

    this._tempArrLineStrip = [];

    // LINES

    this._bufferLinesPosition = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(0), ctx.DYNAMIC_DRAW, true
    );

    this._bufferLinesColor = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(0), ctx.DYNAMIC_DRAW, true
    );

    this._vaoLines = ctx.createVertexArray([
        { buffer : this._bufferLinesPosition, location : ctx.ATTRIB_POSITION, size : 3},
        { buffer : this._bufferLinesColor,    location : ctx.ATTRIB_COLOR, size : 4}
    ]);

    this._tempArrLines = [];

    // RECT POINTS

    this._bufferRectPosition = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array([
            0,0,
            1,0,
            1,1,
            0,1
        ]),ctx.STATIC_DRAW
    );

    this._bufferRectTexcoord = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array([
            0,0,
            1,0,
            1,1,
            0,1
        ]),ctx.STATIC_DRAW
    );

    this._bufferRectPointsColor = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(createArrWithValuesArgs(4,1,1,1,1)),
        ctx.DYNAMIC_DRAW,true
    );

    this._vaoRectPoints = ctx.createVertexArray([
        { buffer : this._bufferRectPosition,    location : ctx.ATTRIB_POSITION, size : 2},
        { buffer : this._bufferRectPointsColor, location : ctx.ATTRIB_COLOR,    size : 4}
    ]);

    // RECT STROKED

    this._bufferRectStrokedColor = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(createArrWithValuesArgs(4,1,1,1,1)),
        ctx.DYNAMIC_DRAW,true
    );

    this._vaoRectStroked = ctx.createVertexArray([
        { buffer : this._bufferRectPosition,     location : ctx.ATTRIB_POSITION, size : 2},
        { buffer : this._bufferRectStrokedColor, location : ctx.ATTRIB_COLOR,    size : 4}
    ]);

    // RECT

    this._bufferRectColor = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(createArrWithValuesArgs(4,1,1,1,1)),
        ctx.DYNAMIC_DRAW,true
    );

    this._bufferRectIndex = ctx.createBuffer(ctx.ELEMENT_ARRAY_BUFFER,
        new Uint16Array([
            0,1,2,
            2,3,0
        ]),ctx.STATIC_DRAW
    );

    this._vaoRect = ctx.createVertexArray([
        { buffer : this._bufferRectPosition, location : ctx.ATTRIB_POSITION, size : 2},
        { buffer : this._bufferRectColor,    location : ctx.ATTRIB_COLOR,    size : 4},
        { buffer : this._bufferRectTexcoord, location : ctx.ATTRIB_TEX_COORD_0, size : 2}
    ], this._bufferRectIndex);

    // CIRCLE

    this._numSegmentsCircleMin  = 3;
    this._numSegmentsCircleMax  = 128;
    this._numSegmentsCirclePrev = -1;

    this._bufferCirclePosition = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(this._numSegmentsCircleMax * 3),
        ctx.DYNAMIC_DRAW,true
    );

    this._bufferCircleColor = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(createArrWithValuesArgs(this._numSegmentsCircleMax,1,1,1,1)),
        ctx.DYNAMIC_DRAW,true
    );

    this._bufferCircleTexcoord = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(this._numSegmentsCircleMax * 2),
        ctx.DYNAMIC_DRAW,true
    );

    this._bufferCircleNormal = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(createArrWithValuesArgs(this._numSegmentsCircle,1,0,0)),
        ctx.STATIC_DRAW,true
    );

    this._vaoCircle = ctx.createVertexArray([
        { buffer : this._bufferCirclePosition, location : ctx.ATTRIB_POSITION,    size : 2, offset : 0 },
        { buffer : this._bufferCircleColor,    location : ctx.ATTRIB_COLOR,       size : 4, offset : 0 },
        { buffer : this._bufferCircleTexcoord, location : ctx.ATTRIB_TEX_COORD_0, size : 2, offset : 0 },
        { buffer : this._bufferCircleNormal,   location : ctx.ATTRIB_NORMAL,      size : 3, offset : 0 }
    ]);

    // CUBE STROKED / POINTS

    this._bufferCubeCornerPosition = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array([
            -0.5,-0.5,-0.5,
             0.5,-0.5,-0.5,
             0.5,-0.5, 0.5,
            -0.5,-0.5, 0.5,
            -0.5, 0.5,-0.5,
             0.5, 0.5,-0.5,
             0.5, 0.5, 0.5,
            -0.5, 0.5, 0.5
        ]),ctx.STATIC_DRAW
    );

    this._bufferCubeStrokedColor = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(createArrWithValuesArgs(8,1,1,1,1)),
        ctx.DYNAMIC_DRAW, true
    );

    this._bufferCubeStrokedIndex = ctx.createBuffer(ctx.ELEMENT_ARRAY_BUFFER,
        new Uint16Array([
            0, 1, 1, 2, 2, 3, 3, 0,
            4, 5, 5, 6, 6, 7, 7, 4,
            0, 4,
            1, 5,
            2, 6,
            3, 7
        ]),
        ctx.STATIC_DRAW
    );

    this._bufferCubePointsColor = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(createArrWithValuesArgs(8,1,1,1,1)),
        ctx.DYNAMIC_DRAW, true
    );

    this._vaoCubeStroked = ctx.createVertexArray([
        { buffer : this._bufferCubeCornerPosition, location : ctx.ATTRIB_POSITION, size : 3},
        { buffer : this._bufferCubeStrokedColor,   location : ctx.ATTRIB_COLOR,    size : 4}
    ], this._bufferCubeStrokedIndex);

    this._vaoCubePoints = ctx.createVertexArray([
        { buffer : this._bufferCubeCornerPosition, location : ctx.ATTRIB_POSITION, size : 3},
        { buffer : this._bufferCubePointsColor,    location : ctx.ATTRIB_COLOR,    size : 4}
    ]);

    // CUBE COLORED

    this._bufferCubeColored = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array([
             0.5, 0.5, 0.5,   1.0, 0.0, 0.0,
            -0.5, 0.5, 0.5,   1.0, 0.0, 0.0,
             0.5,-0.5, 0.5,   1.0, 0.0, 0.0,
            -0.5,-0.5, 0.5,   1.0, 0.0, 0.0,

             0.5, 0.5, 0.5,   0.0, 1.0, 0.0,
             0.5,-0.5, 0.5,   0.0, 1.0, 0.0,
             0.5, 0.5,-0.5,   0.0, 1.0, 0.0,
             0.5,-0.5,-0.5,   0.0, 1.0, 0.0,

             0.5, 0.5, 0.5,   0.0, 0.0, 1.0,
             0.5, 0.5,-0.5,   0.0, 0.0, 1.0,
            -0.5, 0.5, 0.5,   0.0, 0.0, 1.0,
            -0.5, 0.5,-0.5,   0.0, 0.0, 1.0,

             0.5, 0.5,-0.5,   1.0, 1.0, 0.0,
             0.5,-0.5,-0.5,   1.0, 1.0, 0.0,
            -0.5, 0.5,-0.5,   1.0, 1.0, 0.0,
            -0.5,-0.5,-0.5,   1.0, 1.0, 0.0,

            -0.5, 0.5, 0.5,   0.0, 1.0, 1.0,
            -0.5, 0.5,-0.5,   0.0, 1.0, 1.0,
            -0.5,-0.5, 0.5,   0.0, 1.0, 1.0,
            -0.5,-0.5,-0.5,   0.0, 1.0, 1.0,

             0.5,-0.5, 0.5,   1.0, 0.0, 1.0,
            -0.5,-0.5, 0.5,   1.0, 0.0, 1.0,
             0.5,-0.5,-0.5,   1.0, 0.0, 1.0,
            -0.5,-0.5,-0.5,   1.0, 0.0, 1.0
        ]),
        ctx.STATIC_DRAW
    );

    this._bufferCubeIndex =  ctx.createBuffer(ctx.ELEMENT_ARRAY_BUFFER,
        new Uint16Array([
             0, 1, 2, 2, 1, 3,
             4, 5, 6, 6, 5, 7,
             8, 9,10,10, 9,11,
            12,13,14,14,13,15,
            16,17,18,18,17,19,
            20,21,22,22,21,23
        ]),
        ctx.STATIC_DRAW
    );

    this._vaoCubeColored = ctx.createVertexArray([
        {buffer : this._bufferCubeColored, location : ctx.ATTRIB_POSITION, size : 3, stride : 6 * 4, offset : 0    },
        {buffer : this._bufferCubeColored, location : ctx.ATTRIB_COLOR,    size : 3, stride : 6 * 4, offset : 3 * 4}
    ], this._bufferCubeIndex);

    // CUBE

    this._bufferCubePosition = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array([
             0.5, 0.5, 0.5,
            -0.5, 0.5, 0.5,
             0.5,-0.5, 0.5,
            -0.5,-0.5, 0.5,

             0.5, 0.5, 0.5,
             0.5,-0.5, 0.5,
             0.5, 0.5,-0.5,
             0.5,-0.5,-0.5,

             0.5, 0.5, 0.5,
             0.5, 0.5,-0.5,
            -0.5, 0.5, 0.5,
            -0.5, 0.5,-0.5,

             0.5, 0.5,-0.5,
             0.5,-0.5,-0.5,
            -0.5, 0.5,-0.5,
            -0.5,-0.5,-0.5,

            -0.5, 0.5, 0.5,
            -0.5, 0.5,-0.5,
            -0.5,-0.5, 0.5,
            -0.5,-0.5,-0.5,

             0.5,-0.5, 0.5,
            -0.5,-0.5, 0.5,
             0.5,-0.5,-0.5,
            -0.5,-0.5,-0.5
        ]),
        ctx.STATIC_DRAW
    );

    this._bufferCubeColor = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(createArrWithValuesArgs(24,1,1,1,1)),
        ctx.DYNAMIC_DRAW, true
    );

    this._vaoCube = ctx.createVertexArray([
        { buffer : this._bufferCubePosition, location : ctx.ATTRIB_POSITION, size : 3 },
        { buffer : this._bufferCubeColor,    location : ctx.ATTRIB_COLOR, size : 4    }
    ], this._bufferCubeIndex);

    // GRID

    this._bufferGridPosition = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(0), ctx.DYNAMIC_DRAW, true
    );

    this._bufferGridColor = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(0), ctx.DYNAMIC_DRAW, true
    );

    this._bufferGridIndex = ctx.createBuffer(ctx.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(0), ctx.DYNAMIC_DRAW, true
    );

    this._gridSubdivs = null;
    this._gridNumIndices = 0;
    this._gridNumElements = 0;

    this._vaoGrid = ctx.createVertexArray([
        { buffer : this._bufferGridPosition, location : ctx.ATTRIB_POSITION, size : 3 },
        { buffer : this._bufferGridColor,    location : ctx.ATTRIB_COLOR,    size : 4 }
    ], this._bufferGridIndex);

    // PIVOT

    this._pivotAxisLength = null;
    this._pivotHeadLength = null;
    this._pivotHeadRadius = null;

    var numHeadPositions = 16;

    this._bufferPivotPositions = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(concatArrv(
            [0,0,0, 1,0,0, 0,0,0, 0,1,0, 0,0,0, 0,0,1], // origin -> axes
            new Array(numHeadPositions * 3 * 3)         // positions head per axis
        )),
        ctx.DYNAMIC_DRAW,true
    );

    this._bufferPivotColors = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(concatArrv(
            [1,0,0, 1,0,0, 0,1,0, 0,1,0, 0,0,1, 0,0,1],   // colors x,y,z origin -> axis
            createArrWithValuesArgs(numHeadPositions, 1,0,0), // colors head x axis
            createArrWithValuesArgs(numHeadPositions, 0,1,0), // colors head y axis
            createArrWithValuesArgs(numHeadPositions, 0,0,1)  // colors head z axis
        )),
        ctx.STATIC_DRAW,true
    );

    this._bufferPivotIndices = ctx.createBuffer(ctx.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(concatArrv(
            genTriangleFan( 6, 6 + 16), // indices head x axis
            genTriangleFan(22,22 + 16), // indices head y axis
            genTriangleFan(38,38 + 16)  // indices head z axis
        )),
        ctx.STATIC_DRAW,true
    );

    this._vaoPivot = ctx.createVertexArray([
            { buffer : this._bufferPivotPositions, location : ctx.ATTRIB_POSITION, size : 3},
            { buffer : this._bufferPivotColors,    location : ctx.ATTRIB_COLOR,    size : 3}],
        this._bufferPivotIndices
    );

    // VECTOR

    this._vectorAxisLength    = null;
    this._vectorHeadLength    = null;
    this._vectorHeadRadius    = null;
    this._vectorHeadPositions = new Float32Array(numHeadPositions * 3);

    this._bufferVectorPosition = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(6 + numHeadPositions * 3),
        ctx.DYNAMIC_DRAW, true
    );

    this._bufferVectorColor = ctx.createBuffer(ctx.ARRAY_BUFFER,
        new Float32Array(createArrWithValuesArgs(2 + numHeadPositions,1,1,1,1)),
        ctx.DYNAMIC_DRAW, true
    );

    this._bufferVectorIndex = ctx.createBuffer(ctx.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(genTriangleFan(2, 2 + 16)),
        ctx.STATIC_DRAW
    );

    this._vaoVector = ctx.createVertexArray([
        { buffer : this._bufferVectorPosition, location : ctx.ATTRIB_POSITION, size : 3 },
        { buffer : this._bufferVectorColor,    location : ctx.ATTRIB_COLOR,    size : 4 }
    ], this._bufferVectorIndex);


    // TEMP
    this._tempVec20 = Vec2.create();
    this._tempVec30 = Vec3.create();
    this._tempVec31 = Vec3.create();
    this._tempVec32 = Vec3.create();
    this._tempVec33 = Vec3.create();
    this._tempVec34 = Vec3.create();
    this._tempVec35 = Vec3.create();
    this._tempVec40 = Vec4.create();
    this._tempQuat0 = Quat.create();
    this._tempMat30 = Mat3.create();
    this._tempMat40 = Mat4.create();
    this._tempMat41 = Mat4.create();
    this._tempMat42 = Mat4.create();
}

Draw.prototype._updateProgramProperties = function(){
    var ctx = this._ctx;
    var program = ctx.getProgram();
    if(program == this._programPrev){
        return;
    }

    this._programHasAttribPosition = program.hasAttributeAtLocation(ctx.ATTRIB_POSITION);
    this._programHasAttribNormal   = program.hasAttributeAtLocation(ctx.ATTRIB_NORMAL);
    this._programHasAttribColor    = program.hasAttributeAtLocation(ctx.ATTRIB_COLOR);
    this._porgramHasAttribTexcoord = program.hasAttributeAtLocation(ctx.ATTRIB_TEX_COORD_0);

    this._programHasUniformPointSize = program.hasUniform('uPointSize');

    this._programPrev = program;
};

Draw.prototype.setColor = function(color){
    Vec4.set(this._color,color);
};

Draw.prototype.setColor4 = function(r,g,b,a){
    Vec4.set4(this._color,r,g,b,a);
};

Draw.prototype.getColor = function(out){
    out = out === undefined ? Vec4.create() : out;
    return Vec4.set(out,this._color);
};

Draw.prototype.setLineWidth = function(width){
    this._ctx.setLineWidth(width);
};

Draw.prototype.getLineWidth = function(){
    return this._ctx.getLineWidth();
};

Draw.prototype.setPointSize = function(pointSize){
    this._pointSize = pointSize;
    if(this._programHasUniformPointSize){
        this._ctx.getProgram().setUniform('uPointSize',pointSize);
    }
};

Draw.prototype.getPointSize = function(){
    return this._pointSize;
};

Draw.prototype.setCircleNumSegments = function(numSegments){
    this._numSegmentsCircle = Math.max(this._numSegmentsCircleMin,Math.min(numSegments,this._numSegmentsCircleMax));
};

Draw.prototype.getCirlceNumSegments = function(){
    return this._numSegmentsCircle;
};

Draw.prototype.setEllipseNumSegments = function(numSegments){
    this._numSegmentsEllipse = numSegments;
};

Draw.prototype.getEllipseNumSegments = function(){
    return this._numSegmentsEllipse;
};


Draw.prototype._genHead = function(length, radius, positions, offset){
    offset = offset === undefined ? 0 : offset;

    var numSteps = 15;
    var step     = (Math.PI * 2) / (numSteps - 1);

    positions[offset++] = 0;
    positions[offset++] = 0;
    positions[offset++] = length;

    numSteps *= 3;
    numSteps  = offset + numSteps;
    for(var i = offset, j = 0, angle; i < numSteps; i+=3, j+=1){
        angle = step * j;

        positions[i  ] = Math.cos(angle) * radius;
        positions[i+1] = Math.sin(angle) * radius;
        positions[i+2] = 0;
    }
};

Draw.prototype._updatePivotGeom = function(axisLength, headLength, headRadius){
    if(this._pivotAxisLength == axisLength &&
       this._pivotHeadLength == headLength &&
       this._pivotHeadRadius == headRadius){
        return;
    }

    var axisHeadLength = axisLength - headLength;
    var positions = this._bufferPivotPositions.getData();

    positions[ 3] = axisLength;
    positions[10] = axisLength;
    positions[17] = axisLength;

    var numPositions = 48;
    var offsetHeadX  = 18;
    var offsetHeadY  = offsetHeadX + numPositions;
    var offsetHeadZ  = offsetHeadY + numPositions;

    this._genHead(headLength,headRadius,positions,offsetHeadX);
    this._genHead(headLength,headRadius,positions,offsetHeadY);
    this._genHead(headLength,headRadius,positions,offsetHeadZ);

    var pi_2 = Math.PI * 0.5;

    var matrix0 = Mat4.identity(this._tempMat40);
    var matrix1 = Mat4.identity(this._tempMat41);
    var matrix2 = Mat4.identity(this._tempMat42);

    Mat4.setTranslation3(matrix0,axisHeadLength,0,0);
    Mat4.setRotationXYZ3(matrix1,0,pi_2,0);
    Mat4.mult(matrix0,matrix1);

    for(var i = offsetHeadX, l = offsetHeadX + numPositions; i < l; i+=3){
        multVec3Mat4AI(positions,matrix0,i);
    }

    Mat4.identity(matrix0);
    Mat4.identity(matrix1);
    Mat4.identity(matrix2);

    Mat4.setTranslation3(matrix0,0,axisHeadLength,0);
    Mat4.setRotationXYZ3(matrix1,-pi_2,0,0);
    Mat4.mult(matrix0,matrix1);

    for(var i = offsetHeadY, l = offsetHeadY + numPositions; i < l; i+=3){
        multVec3Mat4AI(positions,matrix0,i);
    }

    Mat4.identity(matrix0);
    Mat4.identity(matrix1);
    Mat4.identity(matrix2);

    Mat4.setTranslation3(matrix0,0,0,axisHeadLength);

    for(var i = offsetHeadZ, l = offsetHeadZ + numPositions; i < l; i+=3){
        multVec3Mat4AI(positions,matrix0,i);
    }

    this._bufferPivotPositions.bufferData();

    this._pivotAxisLength = axisLength;
    this._pivotHeadLength = headLength;
    this._pivotHeadRadius = headRadius;
};

Draw.prototype.drawPivotAxes = function(axisLength, headLength, headRadius){
    axisLength = axisLength === undefined ? 1.0 : axisLength;
    headLength = headLength === undefined ? DEFAULT_VECTOR_HEAD_LENGTH : headLength;
    headRadius = headRadius === undefined ? DEFAULT_VECTOR_HEAD_RADIUS : headRadius;

    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    this._updatePivotGeom(axisLength,headLength,headRadius);
    this._ctx.bindVertexArray(this._vaoPivot);
    this._ctx.drawArrays(this._ctx.LINES,0,6);
    this._ctx.drawElements(this._ctx.TRIANGLES,126);
};


Draw.prototype.gizmoTranslation = function(scale,showViewPlane,showXPlane,showYPlane,showZPlane,ratioPlanes){
    scale = scale === undefined ? 1.0 : scale;

    showViewPlane = showViewPlane === undefined ? false : showViewPlane;
    showXPlane    = showXPlane === undefined ? false : showXPlane;
    showYPlane    = showYPlane === undefined ? false : showYPlane;
    showZPlane    = showZPlane === undefined ? false : showZPlane;
    ratioPlanes   = ratioPlanes === undefined ? 0.25 : ratioPlanes;

    var ctx   = this._ctx;

    var color     = Vec4.set(this._tempVec40,this._color);
    var blend     = ctx.getBlend();
    var blendFunc = ctx.getBlendFunc();

    this.drawPivotAxes(scale);

    if(showViewPlane || showXPlane || showYPlane || showZPlane){
        ctx.setBlend(true);
        ctx.setBlendFunc(ctx.SRC_ALPHA,ctx.ONE_MINUS_SRC_ALPHA);

        ctx.pushModelMatrix();
            ctx.scale(Vec3.set3(this._tempVec30,ratioPlanes,ratioPlanes,ratioPlanes));
            if(showViewPlane){
                var rotation = Mat4.fromMat3(this._tempMat40,Mat3.fromMat4(this._tempMat30,Mat4.invert(ctx.getViewMatrix())));

                ctx.pushModelMatrix();
                    ctx.multMatrix(rotation);
                    ctx.translate(Vec3.set3(this._tempVec30,-0.5,-0.5,0));

                    this.setColor4(0.5,0.5,0.5,0.5);
                    this.drawRect();
                    this.setColor4(0.5,0.5,0.5,1);
                    this.drawRectStroked();
                ctx.popModelMatrix();
            }

            if(showXPlane || showYPlane || showZPlane){
                if(showZPlane){
                    this.setColor4(0,0,1,0.5);
                    this.drawRect();
                    this.setColor4(0,0,1,1);
                    this.drawRectStroked();
                }

                if(showYPlane || showXPlane){
                    ctx.rotateXYZ(Vec3.set3(this._tempVec30,Math.PI * 0.5,0,0));
                }

                if(showYPlane){
                    this.setColor4(0,1,0,0.5);
                    this.drawRect();
                    this.setColor4(0,1,0,1);
                    this.drawRectStroked();
                }

                if(showXPlane){
                    ctx.rotateXYZ(Vec3.set3(this._tempVec30,0,Math.PI * 0.5,0));

                    this.setColor4(1,0,0,0.5);
                    this.drawRect();
                    this.setColor4(1,0,0,1);
                    this.drawRectStroked();
                }
            }
        ctx.popModelMatrix();

        this.setColor(color);
        ctx.setBlendFunc(blendFunc[0],blendFunc[1]);
        ctx.setBlend(blend);
    }
};

Draw.prototype.gizmoRotation = function(scale,showAxes,focusXAxis,focusYAxis,focusZAxis,showSphere){
    scale  = scale === undefined ? 1.0 : scale;

    focusXAxis = focusXAxis === undefined ? false : focusXAxis;
    focusYAxis = focusYAxis === undefined ? false : focusYAxis;
    focusZAxis = focusZAxis === undefined ? false : focusZAxis;
    showSphere = showSphere === undefined ? true  : showSphere;

    var ctx = this._ctx;

    var numSegmentsCircle = this._numSegmentsCircle;
    var lineWidth         = ctx.getLineWidth();
    var color             = Vec4.set(this._tempVec40,this._color);

    var invViewMatrix = ctx.getViewMatrix(this._tempMat40);
    Mat4.invert(invViewMatrix);
    Mat4.setTranslation3(invViewMatrix,0,0,0);

    var rotationY = Vec3.set3(this._tempVec31,-Math.PI * 0.5,0,0);
    var rotationX = Vec3.set3(this._tempVec32,0,Math.PI * 0.5,0);

    this.setCircleNumSegments(60);

    if(showSphere){
        ctx.pushModelMatrix();
            //ctx.loadIdentity();
            ctx.multMatrix(invViewMatrix);
            //TODO: Replace with sphere for masking
            //ctx.setDepthTest(false);
            //ctx.setColorMask(false,false,false,false);
            //this.drawCircle(scale * 0.5);
            //ctx.setColorMask(true,true,true,true);
            this.setColor4(0.25,0.25,0.25,1.0);
            this.drawCircleStroked(scale * 0.5);
            //ctx.setDepthTest(true);
        ctx.popModelMatrix();
    }

    ctx.pushModelMatrix();
        ctx.scale(Vec3.set3(this._tempVec30,scale,scale,scale));
        ctx.pushModelMatrix();
            var axisFocused = focusXAxis || focusYAxis || focusZAxis;
            if(axisFocused || showAxes){
                this.setColor4(0.25,0.25,0.25,1.0);
                this.drawLine6(0,0,0, GIZMO_ROTATION_FOCUS_PIVOT_SCALE,0,0);
                this.drawLine6(0,0,0, 0,GIZMO_ROTATION_FOCUS_PIVOT_SCALE,0);
                this.drawLine6(0,0,0, 0,0,GIZMO_ROTATION_FOCUS_PIVOT_SCALE);
            }
            if(axisFocused){
                var depthTest = ctx.getDepthTest();
                var blend     = ctx.getBlend();
                var blendFunc = ctx.getBlendFunc();

                this.setColor4(0.25,0.25,0.25,0.25);

                ctx.setDepthTest(false);
                ctx.setBlendFunc(ctx.SRC_ALPHA,ctx.ONE_MINUS_SRC_ALPHA);

                if(focusZAxis){
                    ctx.setBlend(true);
                    this.drawCircle();
                    ctx.setBlend(blend);
                    this.drawCircleStroked();
                }
                ctx.rotateXYZ(rotationY);
                if(focusYAxis){
                    ctx.setBlend(true);
                    this.drawCircle();
                    ctx.setBlend(blend);
                    this.drawCircleStroked();
                }
                ctx.rotateXYZ(rotationX);
                if(focusXAxis){
                    ctx.setBlend(true);
                    this.drawCircle();
                    ctx.setBlend(blend);
                    this.drawCircleStroked();
                }

                ctx.setBlendFunc(blendFunc[0],blendFunc[1]);
                ctx.setDepthTest(depthTest);
                ctx.setBlend(blend);
            }
        ctx.popModelMatrix();
        ctx.pushModelMatrix();
            this.setColor4(0,0,1,1);
            if(focusZAxis){
                ctx.setLineWidth(lineWidth * GIZMO_ROTATION_FOCUS_AXIS_LINE_WIDTH_SCALE);
                this.drawCircleStroked();
                this.drawLine6(0,0,0, 0,0,0.5);
                ctx.setLineWidth(lineWidth);
            }
            else {
                this.drawCircleStroked();
            }

            ctx.rotateXYZ(rotationY);
            this.setColor4(0,1,0,1);
            if(focusYAxis){
                ctx.setLineWidth(lineWidth * GIZMO_ROTATION_FOCUS_AXIS_LINE_WIDTH_SCALE);
                this.drawCircleStroked();
                this.drawLine6(0,0,0, 0,0,0.5);
                ctx.setLineWidth(lineWidth);
            }
            else {
                this.drawCircleStroked();
            }

            ctx.rotateXYZ(rotationX);
            this.setColor4(1,0,0,1);
            if(focusXAxis){
                ctx.setLineWidth(lineWidth * GIZMO_ROTATION_FOCUS_AXIS_LINE_WIDTH_SCALE);
                this.drawCircleStroked();
                this.drawLine6(0,0,0, 0,0,0.5);
                ctx.setLineWidth(lineWidth);
            }
            else {
                this.drawCircleStroked();
            }
        ctx.popModelMatrix();
    ctx.popModelMatrix();

    this.setColor(color);
    this.setCircleNumSegments(numSegmentsCircle);
    ctx.setLineWidth(lineWidth);
};

//NOTE: We keep this for now
Draw.prototype.drawPivotRotation = Draw.prototype.gizmoRotation;

Draw.prototype.drawQuat = function(){

};

Draw.prototype.drawVector = function(fromOrDirection,to,headLength,headRadius){
    if(to === undefined){
        this.drawVector6(0,0,0,fromOrDirection[0],fromOrDirection[1],fromOrDirection[2]);
        return;
    }
    this.drawVector6(fromOrDirection[0],fromOrDirection[1],fromOrDirection[2],to[0],to[1],to[2],headLength,headRadius);
};

Draw.prototype.drawVector6 = function(x0,y0,z0,x1,y1,z1,headLength,headRadius){
    if(x0 == x1 && y0 == y1 && z0 == z1){
        return;
    }

    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    if(x1 === undefined){
        x1 = x0;
        y1 = y0;
        z1 = z0;
        x0 = y0 = z0 = 0;
    }

    headLength = headLength === undefined ? DEFAULT_VECTOR_HEAD_LENGTH : headLength;
    headRadius = headRadius === undefined ? DEFAULT_VECTOR_HEAD_RADIUS : headRadius;

    var start = Vec3.set3(this._tempVec30,x0,y0,z0);
    var end   = Vec3.set3(this._tempVec31,x1,y1,z1);

    var axis       = Vec3.sub(Vec3.set(this._tempVec32,end),start);
    var axisLength = Vec3.length(axis);

    var positions = this._bufferVectorPosition.getData();

    if(this._vectorAxisLength != axisLength ||
       this._vectorHeadLength != headLength ||
       this._vectorHeadRadius != headRadius ||
       positions[0] != x0 ||
       positions[1] != y0 ||
       positions[2] != z0 ||
       positions[3] != x1 ||
       positions[4] != y1 ||
       positions[5] != z1){

        positions[0] = x0;
        positions[1] = y0;
        positions[2] = z0;
        positions[3] = x1;
        positions[4] = y1;
        positions[5] = z1;

        if(this._vectorHeadLength != headLength ||
           this._vectorHeadRadius != headRadius){
            this._genHead(headLength,headRadius,this._vectorHeadPositions,0);
            this._vectorHeadLength = headLength;
            this._vectorHeadRadius = headRadius;
        }

        positions.set(this._vectorHeadPositions,6);

        Vec3.normalize(axis);

        var left = Vec3.normalize(Vec3.cross(Vec3.set3(this._tempVec33,0,1,0),axis));
        var up   = Vec3.normalize(Vec3.cross(Vec3.set(this._tempVec34,axis),left));

        if(start[0] == end[0] && start[2] == end[2]){
            if(start[1] > end[1]){
                Vec3.set3(left,0,0,1);
                Vec3.set3(up,1,0,0);
                Vec3.set3(axis,0,-1,0);
            }
            else {
                Vec3.set3(left,1,0,0);
                Vec3.set3(up,0,0,1);
                Vec3.set3(axis,0,1,0);
            }
        }

        var axisScaled = Vec3.scale(Vec3.set(this._tempVec35,axis),axisLength - headLength);
        Vec3.add(Vec3.set(end,start),axisScaled);

        var matrix = Mat4.identity(this._tempMat40);
        Mat4.setTranslation3(matrix,end[0],end[1],end[2]);

        Mat4.setRotationFromOnB(matrix,left,up,axis);

        var x, y, z;

        for(var i = 6, l = positions.length; i < l; i+=3){
            x = positions[i  ];
            y = positions[i+1];
            z = positions[i+2];

            positions[i  ] = matrix[ 0] * x + matrix[ 4] * y + matrix[ 8] * z + matrix[12];
            positions[i+1] = matrix[ 1] * x + matrix[ 5] * y + matrix[ 9] * z + matrix[13];
            positions[i+2] = matrix[ 2] * x + matrix[ 6] * y + matrix[10] * z + matrix[14];
        }

        this._bufferVectorPosition.bufferData();

        this._vectorAxisLength = axisLength;
    }

    if(this._programHasAttribColor){
        var colors = this._bufferVectorColor.getData();
        if(!Vec4.equals(colors,this._color)){
            arrFillVec4(colors,this._color);
            this._bufferVectorColor.bufferData();
        }
    }

    this._ctx.bindVertexArray(this._vaoVector);
    this._ctx.drawArrays(this._ctx.LINES,0,2);
    this._ctx.drawElements(this._ctx.TRIANGLES,42);
};


Draw.prototype._updateGrid = function(subdivs){
    var colors = this._bufferGridColor.getData();

    if(subdivs == this._gridSubdivs){
        if(!Vec4.equals(colors,this._color)){
            arrFillVec4(colors,this._color);
            this._bufferGridColor.bufferData();
        }
        return;
    }

    var subdivs1 = subdivs + 1;
    var num      = subdivs1 * subdivs1;

    var positions = new Float32Array(num * 3);
    colors        = new Float32Array(createArrWithValuesv(num,this._color));

    var step = 1.0 / subdivs;

    for(var i = 0, j, index; i < subdivs1; ++i){
        for(j = 0; j < subdivs1; ++j){
            index = (i * subdivs1 + j) * 3;
            positions[index  ] = -0.5 + step * j;
            positions[index+1] = 0;
            positions[index+2] = -0.5 + step * i;
        }
    }

    var indices = [];

    for(var i = 0, j, k; i < subdivs1; ++i){
        for(j = 0; j < subdivs1; ++j){
            if(j < subdivs){
                k = i * subdivs1 + j;
                indices.push(k,k+1);
            }
            if(i < subdivs){
                k = i * subdivs1 + j;
                indices.push(k,k+subdivs1);
            }
        }
    }

    indices = new Uint16Array(indices);


    this._bufferGridPosition.bufferData(positions);
    this._bufferGridColor.bufferData(colors);
    this._bufferGridIndex.bufferData(indices);

    this._gridSubdivs     = subdivs;
    this._gridNumIndices  = indices.length;
    this._gridNumElements = positions.length / 3;
};

Draw.prototype._drawGridInternal = function(size, subdivs, mode){
    size    = (size === undefined || (size[0] < 0 || size[1] < 0)) ? VEC2_ONE : size;
    subdivs = (subdivs === undefined || subdivs < 0) ? 1 : subdivs;

    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    this._updateGrid(subdivs);

    this._ctx.bindVertexArray(this._vaoGrid);
    this._ctx.pushModelMatrix();
        Vec3.set3(this._tempVec30,size[0],1.0,size[1]);
        this._ctx.scale(this._tempVec30);
        if(mode == this._ctx.LINES){
            this._ctx.drawElements(this._ctx.LINES, this._gridNumIndices);
        }
        else {
            this._ctx.drawArrays(this._ctx.POINTS, 0, this._gridNumElements);
        }

    this._ctx.popModelMatrix();
};

Draw.prototype.drawGrid = function(size, subdivs){
    this._drawGridInternal(size,subdivs,this._ctx.LINES);
};

Draw.prototype.drawGridPoints = function(size, subdivs){
    this._drawGridInternal(size,subdivs,this._ctx.POINTS);
};

Draw.prototype.drawPoint = function(v){
    this.drawPoint3(v[0],v[1],v[2]);
};

Draw.prototype.drawPoint3 = function(x,y,z){
    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    if(this._programHasAttribColor){
        var colors = this._bufferPointColor.getData();
        if(!Vec4.equals(colors,this._color)){
            Vec4.set(colors,this._color);
            this._bufferPointColor.bufferData();
        }
    }

    var positions = this._bufferPointPosition.getData();
    if(!Vec3.equals3(positions,x,y,z)){
        Vec3.set3(positions,x,y,z);
        this._bufferPointPosition.bufferData();
    }

    this._ctx.bindVertexArray(this._vaoPoint);
    this._ctx.drawArrays(this._ctx.POINTS,0,1);
};

Draw.prototype.drawPoints = function(points){
    this.drawPointsFlat(arrUnpack3(points,this._tempArrPoints));
};

Draw.prototype.drawPointsFlat = function(points){
    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    var exceedsDstLen;
    var srcLen      = points.length;
    var numElements = srcLen / 3;

    var positions = this._bufferPointsPosition.getData();
    exceedsDstLen = srcLen > positions.length;

    if(!exceedsDstLen){
        positions.set(points);
    }
    else {
        positions = new Float32Array(points);
    }

    this._bufferPointsPosition.bufferData(positions);

    if(this._programHasAttribColor){
        var colors    = this._bufferPointsColor.getData();
        exceedsDstLen = (numElements * 4) > colors.length;

        if(exceedsDstLen){
            colors = new Float32Array(createArrWithValuesv(numElements,this._color));
            this._bufferPointsColor.bufferData(colors);
        }
        else {
            if(!Vec4.equals(colors,this._color)){
                arrFillVec4(colors,this._color);
                this._bufferPointsColor.bufferData();
            }
        }
    }

    this._ctx.bindVertexArray(this._vaoPoints);
    this._ctx.drawArrays(this._ctx.POINTS, 0, numElements);
};

Draw.prototype.drawLine = function(a,b){
    this.drawLine6(a[0],a[1],a[2],b[0],b[1],b[2]);
};

Draw.prototype.drawLine6 = function(x0,y0,z0,x1,y1,z1){
    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    if(this._programHasAttribColor){
        var colors = this._bufferLineColor.getData();
        if(!Vec4.equals(colors,this._color)){
            arrFillVec4(colors,this._color);
            this._bufferLineColor.bufferData();
        }
    }

    var positions = this._bufferLinePosition.getData();

    if(positions[0] != x0 ||
       positions[1] != y0 ||
       positions[2] != z0 ||
       positions[3] != x1 ||
       positions[4] != y1 ||
       positions[5] != z1){
        positions[0] = x0;
        positions[1] = y0;
        positions[2] = z0;
        positions[3] = x1;
        positions[4] = y1;
        positions[5] = z1;
        this._bufferLinePosition.bufferData();
    }

    this._ctx.bindVertexArray(this._vaoLine);
    this._ctx.drawArrays(this._ctx.LINES, 0, 2);
};

Draw.prototype.drawLineStripFlat = function(lines,loop){
    if(lines.length == 0){
        return;
    }

    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    loop = loop === undefined ? false : loop;

    var exceedsDstLen;
    var srcLen = lines.length;
    var numElements = srcLen / 3;

    var positions = this._bufferLineStripPosition.getData();
    exceedsDstLen = srcLen > positions.length;

    if(!exceedsDstLen){
        positions.set(lines);
        this._bufferLineStripPosition.bufferData();
    }
    else {
        positions = new Float32Array(lines);
        this._bufferLineStripPosition.bufferData(positions);
    }

    if(this._programHasAttribColor){
        var colors    = this._bufferLineStripColor.getData();
        exceedsDstLen = (numElements * 4) > colors.length;

        if(exceedsDstLen){
            colors = new Float32Array(createArrWithValuesv(numElements,this._color));
            this._bufferLineStripColor.bufferData(colors);
        }
        else {
            if(!Vec4.equals(colors,this._color)){
                arrFillVec4(colors,this._color);
                this._bufferLineStripColor.bufferData();
            }
        }
    }

    this._ctx.bindVertexArray(this._vaoLineStrip);
    this._ctx.drawArrays(loop ? this._ctx.LINE_LOOP : this._ctx.LINE_STRIP, 0, numElements);
};

Draw.prototype.drawLineStrip = function(lines,loop){
    if(lines.length == 0){
        return;
    }
    this.drawLineStripFlat(arrUnpack3(lines,this._tempArrLineStrip),loop);
};

Draw.prototype.drawLines = function(lines){
    if(lines.length == 0){
        return;
    }
    this.drawLinesFlat(arrUnpack32(lines,this._tempArrLines));
};

Draw.prototype.drawLinesFlat = function(lines){
    if(lines.length == 0){
        return;
    }
    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    var exceedsDstLen;
    var srcLen      = lines.length;
    var numElements = srcLen / 3;

    var positions = this._bufferLinesPosition.getData();
    exceedsDstLen = srcLen > positions.length;

    if(!exceedsDstLen){
        positions.set(lines);
    }
    else {
        positions = new Float32Array(lines);
    }

    this._bufferLinesPosition.bufferData(positions);

    if(this._programHasAttribColor){
        var colors    = this._bufferLinesColor.getData();
        exceedsDstLen = (numElements * 4) > colors.length;

        if(exceedsDstLen){
            colors = new Float32Array(createArrWithValuesv(numElements,this._color));
            this._bufferLinesColor.bufferData(colors);
        }
        else {
            if(!Vec4.equals(colors,this._color)){
                arrFillVec4(colors,this._color);
                this._bufferLinesColor.bufferData();
            }
        }
    }

    this._ctx.bindVertexArray(this._vaoLines);
    this._ctx.drawArrays(this._ctx.LINES, 0, numElements);
};

Draw.prototype.drawRect = function(width,height){
    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    if(this._programHasAttribColor){
        var colors = this._bufferRectColor.getData();
        if(!Vec4.equals(colors,this._color)){
            arrFillVec4(colors,this._color);
            this._bufferRectColor.bufferData();
        }
    }

    width  = width === undefined ? 1 : width;
    height = height === undefined ? width : height;

    this._ctx.bindVertexArray(this._vaoRect);
    if(width != 1 || height != 1){
        Vec3.set3(this._tempVec30,width,height,0);
        this._ctx.pushModelMatrix();
            this._ctx.scale(this._tempVec30);
            this._ctx.drawElements(this._ctx.TRIANGLES,6);
        this._ctx.popModelMatrix();
    } else {
        this._ctx.drawElements(this._ctx.TRIANGLES,6);
    }
};

Draw.prototype.drawRectPoints = function(width, height){
    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    if(this._programHasAttribColor){
        var colors = this._bufferRectPointsColor.getData();
        if(!Vec4.equals(colors,this._color)){
            arrFillVec4(colors,this._color);
            this._bufferRectColor.bufferData();
        }
    }

    width  = width === undefined ? 1 : width;
    height = height === undefined ? width : height;

    this._ctx.bindVertexArray(this._vaoRectPoints);
    if(width != 1 || height != 1){
        Vec3.set3(this._tempVec30,width,height,0);
        this._ctx.pushModelMatrix();
            this._ctx.scale(this._tempVec30);
            this._ctx.drawArrays(this._ctx.POINTS,0,4);
        this._ctx.popModelMatrix();
    } else {
        this._ctx.drawArrays(this._ctx.POINTS,0,4);
    }
};

Draw.prototype.drawRectStroked = function(width, height){
    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    if(this._programHasAttribColor){
        var colors = this._bufferRectStrokedColor.getData();
        if(!Vec4.equals(colors,this._color)){
            arrFillVec4(colors,this._color);
            this._bufferRectStrokedColor.bufferData();
        }
    }

    width  = width === undefined ? 1 : width;
    height = height === undefined ? width : height;

    this._ctx.bindVertexArray(this._vaoRectStroked);
    if(width != 1 || height != 1){
        Vec3.set3(this._tempVec30,width,height,0);
        this._ctx.pushModelMatrix();
            this._ctx.scale(this._tempVec30);
            this._ctx.drawArrays(this._ctx.LINE_LOOP,0,4);
        this._ctx.popModelMatrix();
    } else {
        this._ctx.drawArrays(this._ctx.LINE_LOOP,0,4);
    }
};

Draw.prototype._genCircleGeom = function(positions,normals,colors,texcoords,numSegments,color){
    var step = Math.PI * 2 / numSegments;
    var r = color[0];
    var g = color[1];
    var b = color[2];
    var a = color[3];
    for(var i = 0, j = 0; i < numSegments; ++i){
        j = i * 2;
        positions[j  ] = Math.cos(step * i);
        positions[j+1] = Math.sin(step * i);

        texcoords[j  ] = 0.5 + positions[j  ];
        texcoords[j+1] = 0.5 + positions[j+1];

        j = i * 4;
        colors[j  ] = r;
        colors[j+1] = g;
        colors[j+2] = b;
        colors[j+3] = a;
    }
};

Draw.prototype._updateCircleGeom = function(positions, texCoords, numSegments, offsetPositions, offsetTexcoords){
    offsetPositions = offsetPositions === undefined ? 0 : offsetPositions;
    offsetTexcoords = offsetTexcoords === undefined ? 0 : offsetTexcoords;
    var step = Math.PI * 2 / numSegments;
    for(var i = 0, j, k; i < numSegments; ++i){
        j = offsetPositions + i * 2;
        positions[j  ] = Math.cos(step * i);
        positions[j+1] = Math.sin(step * i);

        k = offsetTexcoords + i * 2;
        texCoords[k  ] = 0.5 + positions[j ];
        texCoords[k+1] = 0.5 + positions[j+1]
    }
};


Draw.prototype._drawCircleInternal = function(radius,drawMode){
    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    if(this._numSegmentsCircle != this._numSegmentsCirclePrev){
        var positions = this._bufferCirclePosition.getData();
        var texcoords = this._bufferCircleTexcoord.getData();
        this._updateCircleGeom(positions,texcoords,this._numSegmentsCircle);
        this._bufferCirclePosition.bufferData();
        this._bufferCircleTexcoord.bufferData();
        this._numSegmentsCirclePrev = this._numSegmentsCircle;
    }

    var colors = this._bufferCircleColor.getData();
    if(!Vec4.equals(colors,this._color)){
        arrFillVec4(colors,this._color);
        this._bufferCircleColor.bufferData();
    }

    this._ctx.bindVertexArray(this._vaoCircle);
    this._ctx.pushModelMatrix();
        this._ctx.scale(Vec3.set3(this._tempVec30,radius,radius,radius));
        this._ctx.drawArrays(drawMode,0,this._numSegmentsCircle);
    this._ctx.popModelMatrix();
};

Draw.prototype.drawCircle = function(radius){
    radius = radius === undefined ? 0.5 : radius;
    this._drawCircleInternal(radius, this._ctx.TRIANGLE_FAN);
};

Draw.prototype.drawCircleStroked = function(radius){
    radius = radius === undefined ? 0.5 : radius;
    this._drawCircleInternal(radius, this._ctx.LINE_LOOP);
};

Draw.prototype.drawCircles = function(){

};

Draw.prototype.drawCirclesFlat = function(){

};

Draw.prototype.drawCirclesStroked = function(){

};

Draw.prototype.drawCirclesStrokedFlat = function(){

};

Draw.prototype.drawEllipse = function(){

};

Draw.prototype.drawEllipse3 = function(){

};

Draw.prototype.drawEllipseStroked = function(){

};

Draw.prototype.drawEllispeStroked3 = function(){

};

Draw.prototype.drawEllipses = function(){

};

Draw.prototype.drawEllipsesFlat = function(){

};

Draw.prototype.drawEllipsesStroked = function(){

};

Draw.prototype.drawEllipsesStrokedFlat = function(){

};

Draw.prototype.drawTriangle = function(){

};

Draw.prototype.drawTriangle9 = function(){

};

Draw.prototype.drawTriangleStroked = function(){

};

Draw.prototype.drawTriangleStroked9 = function(){

};

Draw.prototype.drawCube = function(scale){
    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    if(this._programHasAttribColor){
        var colors = this._bufferCubeColor.getData();
        if(!Vec4.equals(colors, this._color)){
            arrFillVec4(colors, this._color);
        }
        this._bufferCubeColor.bufferData();
    }

    this._ctx.bindVertexArray(this._vaoCube);
    if(scale !== undefined){
        Vec3.set3(this._tempVec30, scale, scale, scale);
        this._ctx.pushModelMatrix();
            this._ctx.scale(this._tempVec30);
            this._ctx.drawElements(this._ctx.TRIANGLES, 36);
        this._ctx.popModelMatrix();
    }
    else {
        this._ctx.drawElements(this._ctx.TRIANGLES, 36);
    }
};

Draw.prototype.drawCubeColored = function(scale){
    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    this._ctx.bindVertexArray(this._vaoCubeColored);

    if(scale !== undefined){
        Vec3.set3(this._tempVec30, scale, scale, scale);
        this._ctx.pushModelMatrix();
            this._ctx.scale(this._tempVec30);
            this._ctx.drawElements(this._ctx.TRIANGLES, 36);
        this._ctx.popModelMatrix();
    }
    else {
        this._ctx.drawElements(this._ctx.TRIANGLES, 36);
    }
};

Draw.prototype.drawCubePoints = function(scale){
    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    if(this._programHasAttribColor){
        var colors = this._bufferCubePointsColor.getData();
        if(!Vec4.equals(colors,this._color)){
            arrFillVec4(colors,this._color);
            this._bufferCubePointsColor.bufferData();
        }
    }

    this._ctx.bindVertexArray(this._vaoCubePoints);
    if(scale !== undefined){
        Vec3.set3(this._tempVec30, scale, scale, scale);
        this._ctx.pushModelMatrix();
            this._ctx.scale(this._tempVec30);
            this._ctx.drawArrays(this._ctx.POINTS, 0, 8);
        this._ctx.popModelMatrix();
    }
    else {
        this._ctx.drawArrays(this._ctx.POINTS, 0, 8);
    }
};

Draw.prototype.drawCubeStroked = function(scale){
    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    if(this._programHasAttribColor){
        var colors = this._bufferCubeStrokedColor.getData();
        if(!Vec4.equals(colors,this._color)){
            arrFillVec4(colors,this._color);
            this._bufferCubeStrokedColor.bufferData();
        }
    }

    this._ctx.bindVertexArray(this._vaoCubeStroked);
    if(scale !== undefined){
        Vec3.set3(this._tempVec30, scale, scale, scale);
        this._ctx.pushModelMatrix();
            this._ctx.scale(this._tempVec30);
            this._ctx.drawElements(this._ctx.LINES, 24);
        this._ctx.popModelMatrix();
    }
    else {
        this._ctx.drawElements(this._ctx.LINES, 24);
    }
};

Draw.prototype.drawSphere = function(){

};

Draw.prototype.drawSpherePoints = function(){

};

Draw.prototype.drawSphereStroked = function(){

};

Draw.prototype.drawFrustum = function(){

};

Draw.prototype.drawOnB = function(){

};

Draw.prototype.drawFullscreenWindowRect = function(windowWidth,windowHeight,topleft){
    this.drawScreenAlignedRect(windowWidth,windowHeight,windowWidth,windowHeight,topleft);
};

Draw.prototype.drawScreenAlignedRect = function(x,y,width,height,windowWidth,windowHeight,topleft){
    this._updateProgramProperties();

    if(!this._programHasAttribPosition){
        return;
    }

    topleft = topleft === undefined ? false : topleft;

    this._ctx.pushMatrices();
        this._ctx.loadIdentities();
        if(topleft){
            this._ctx.setProjectionMatrix(Mat4.ortho(this._tempMat40,0,windowWidth,windowHeight,0,-1,1));
        } else {
            this._ctx.setProjectionMatrix(Mat4.ortho(this._tempMat40,0,windowWidth,0,windowHeight,-1,1));
        }
        this._ctx.translate(Vec3.set3(this._tempVec30,x,y,0));
        this.drawRect(width,height);
    this._ctx.popMatrices();
};

// DEBUG

Draw.prototype.debugArcball = function(arcball,showAxesDragArea,showPanOrigin){
    showAxesDragArea = showAxesDragArea === undefined ? false : showAxesDragArea;
    showPanOrigin    = showPanOrigin    === undefined ? true  : showPanOrigin;

    var ctx = this._ctx;
    var camera = arcball._camera;
    var target = camera.getTarget(this._tempVec34);

    var isConstrained = arcball.isConstrained();
    var isDragging    = arcball.isDragging();
    var isPanning     = arcball.isPanning();

    ctx.pushModelMatrix();
        ctx.translate(target);

        if(isConstrained){
            var axisX = arcball._constrainAxisIndex == 0;
            var axisY = arcball._constrainAxisIndex == 1;
            var axisZ = arcball._constrainAxisIndex == 2;

            if(arcball._constrainMode == 0){
                var rotation = Mat4.fromMat3(this._tempMat40,Mat3.fromMat4(this._tempMat30,camera.getInverseViewMatrix()));

                ctx.pushModelMatrix();
                    ctx.multMatrix(rotation);
                    ctx.scale(Vec3.set3(this._tempVec30, 1.0, 1.0, 1.0));
                    this.gizmoRotation(1.0,false,axisX,axisY,axisZ,false);
                ctx.popModelMatrix();
            }else{
                this.gizmoRotation(1,true,axisX,axisY,axisZ);
            }
        }
        else{
            this.gizmoRotation(1,isDragging || isPanning);
        }
    ctx.popModelMatrix();

    if(showPanOrigin && isPanning){
        this.gizmoTranslation(0.5,true,false,false,false,0.125);

        if(isDragging){
            ctx.pushModelMatrix();
                ctx.translate(arcball._planePosDownWorld);
                this.gizmoTranslation(0.5,true,false,false,false,0.125);
            ctx.popModelMatrix();
        }
    }

    if(showAxesDragArea){
        var color = Vec4.set(this._tempVec40,this._color);
        var numSegmentsCircle = this._numSegmentsCircle;

        var bounds = arcball._boundsSize;
        var center = arcball._center;

        this.setCircleNumSegments(60);

        ctx.pushMatrices();
            ctx.loadIdentities();
            ctx.setViewMatrix(Mat4.ortho(this._tempMat40,0,bounds[0],bounds[1],0,-1,1));
            ctx.translate(Vec3.set3(this._tempVec30,center[0],center[1],0));
            this.setColor4(0.25,0.25,0.25,1.0);

            this.drawCircleStroked(bounds[1] * arcball._radiusScale);
        ctx.popMatrices();

        this.setCircleNumSegments(numSegmentsCircle);
        this.setColor(color);
    }
};

Draw.prototype.drawArcball = Draw.prototype.debugArcball;

Draw.prototype.debugCamera = function(camera) {
    var lines = [];

    var position = camera.getPosition();
    var target = camera.getTarget();

    var frustumNear = camera.getNear();
    var frustumFar = camera.getFar();
    var frustumTop = Math.tan(camera.getFov() / 180 * Math.PI / 2) * frustumNear;
    var frustumRight = frustumTop * camera.getAspectRatio();
    var frustumLeft = -frustumTop;
    var frustumBottom = -frustumLeft;

    var front = Vec3.normalize(Vec3.sub(Vec3.copy(camera.getTarget()), camera.getPosition()));
    var up = Vec3.copy(camera.getUp());
    var right = Vec3.normalize(Vec3.cross(Vec3.copy(front), up));

    var frontNear = Vec3.scale(Vec3.copy(front), frustumNear);
    var upTop = Vec3.scale(Vec3.copy(up), frustumTop);
    var rightRight = Vec3.scale(Vec3.copy(right), frustumRight);

    var frustumNearTopLeft     = Vec3.add(Vec3.sub(Vec3.copy(frontNear), rightRight), upTop);
    var frustumNearTopRight    = Vec3.add(Vec3.add(Vec3.copy(frontNear), rightRight), upTop);
    var frustumNearBottomRight = Vec3.sub(Vec3.add(Vec3.copy(frontNear), rightRight), upTop);
    var frustumNearBottomLeft  = Vec3.sub(Vec3.sub(Vec3.copy(frontNear), rightRight), upTop);

    var farNearRatio = frustumFar / frustumNear;

    var frustumFarTopLeft     = Vec3.scale(Vec3.copy(frustumNearTopLeft    ), farNearRatio);
    var frustumFarTopRight    = Vec3.scale(Vec3.copy(frustumNearTopRight   ), farNearRatio);
    var frustumFarBottomRight = Vec3.scale(Vec3.copy(frustumNearBottomRight), farNearRatio);
    var frustumFarBottomLeft  = Vec3.scale(Vec3.copy(frustumNearBottomLeft ), farNearRatio);

    var zero = [0, 0, 0];
    lines.push([zero, right]);
    lines.push([zero, up]);
    lines.push([zero, front]);

    lines.push([zero, frustumFarTopLeft]);
    lines.push([zero, frustumFarTopRight]);
    lines.push([zero, frustumFarBottomRight]);
    lines.push([zero, frustumFarBottomLeft]);

    lines.push([frustumNearTopLeft, frustumNearTopRight]);
    lines.push([frustumNearTopRight, frustumNearBottomRight]);
    lines.push([frustumNearBottomRight, frustumNearBottomLeft]);
    lines.push([frustumNearBottomLeft, frustumNearTopLeft]);

    lines.push([frustumFarTopLeft, frustumFarTopRight]);
    lines.push([frustumFarTopRight, frustumFarBottomRight]);
    lines.push([frustumFarBottomRight, frustumFarBottomLeft]);
    lines.push([frustumFarBottomLeft, frustumFarTopLeft]);

    this._ctx.pushModelMatrix();
        this._ctx.translate(position);
        this.setColor4(1,1,1,1);
        this.drawLines(lines);
    this._ctx.popModelMatrix();
};

//TODO: implement drawFrustum
Draw.prototype.drawFrustum = function(){
    throw new Error('Draw.drawFrustum is not implemented');
};

Draw.prototype.debugRect = function(rect,showMinMax,showCenter){
    showMinMax = showMinMax === undefined ? false : showMinMax;
    showCenter = showCenter === undefined ? false : showCenter;

    var pointSize = this._pointSize;
    var color     = Vec4.set(this._tempVec40,this._color);

    var center = Rect.getCenter(rect,this._tempVec20);
        center = Vec3.set3(this._tempVec30,center[0],center[1],0);
    var size   = Rect.getSize(rect,this._tempVec20);

    this._ctx.pushModelMatrix();
        this._ctx.translate(center);
        this._ctx.scale(size);
        this.drawRectStroked(size[0],size[1]);
    this._ctx.popModelMatrix();

    if(showMinMax || showCenter){
        this.setPointSize(4);
    }

    if(showMinMax){
        this.setColor4(1,0,0,1);
        this.drawPoint(Vec3.set3(this._tempVec30,rect[0][0],rect[0][1],0));
        this.setColor4(0,0,1,1);
        this.drawPoint(Vec3.set3(this._tempVec30,rect[1][0],rect[1][1],0));
    }

    if(showCenter){
        this.setColor4(1,0,1,1);
        this.drawPoint(center);
    }

    this.setColor(color);
    this.setPointSize(pointSize);
};

Draw.prototype.debugAABB = function(aabb,showMinMax,showCenter){
    showMinMax = showMinMax === undefined ? false : showMinMax;
    showCenter = showCenter === undefined ? false : showCenter;

    var pointSize = this._pointSize;
    var color     = Vec4.set(this._tempVec40,this._color);

    var center = AABB.center(aabb,this._tempVec30);

    this._ctx.pushModelMatrix();
        this._ctx.translate(center);
        this._ctx.scale(AABB.size(aabb,this._tempVec30));
        this.drawCubeStroked();
    this._ctx.popModelMatrix();

    if(showMinMax || showCenter){
        this.setPointSize(4);
    }

    if(showMinMax){
        this.setColor4(1,0,0,1);
        this.drawPoint(aabb[0]);
        this.setColor4(0,0,1,1);
        this.drawPoint(aabb[1]);
    }

    if(showCenter){
        this.setColor4(1,0,1,1);
        this.drawPoint(center);
    }

    this.setColor(color);
    this.setPointSize(pointSize);
};

Draw.prototype.debugRay = function(ray,useDirectionColor){
    useDirectionColor = useDirectionColor === undefined ? false : useDirectionColor;

    var pointSize = this._pointSize;
    var color     = Vec4.set(this._tempVec40,this._color);

    var start = ray[0];
    var end   = Vec3.add(Vec3.set(this._tempVec31,start),Vec3.scale(Vec3.set(this._tempVec32,ray[1]),1000));

    if(useDirectionColor){
        this.setColor4(0.5 + ray[1][0] * 0.5,0.5 + ray[1][1] * 0.5,0.5 + ray[1][2] * 0.5,1);
    }
    this.drawLine(start,end);

    this.setPointSize(4);
    this.setColor4(0,1,0,1);
    this.drawPoint(start);

    this.setColor(color);
    this.setPointSize(pointSize);
};

Draw.prototype.debugPlane = function(plane,useNormalColor,planeScale,normalScale){
    planeScale     = planeScale === undefined ? 1.0 : planeScale;
    normalScale    = normalScale === undefined ? 1.0 : normalScale;
    useNormalColor = useNormalColor === undefined ? true : useNormalColor;

    var pointSize = this._pointSize;
    var color     = Vec4.set(this._tempVec40,this._color);

    var point  = plane[0];
    var normal = plane[1];

    if(useNormalColor){
        this.setColor4(0.5 + normal[0] * 0.5,0.5 + normal[1] * 0.5,0.5 + normal[2] * 0.5,1.0);
    }
    var ctx = this._ctx;

    ctx.pushModelMatrix();
        ctx.translate(point);
        ctx.pushModelMatrix();
            ctx.rotateQuat(Quat.fromDirection(this._tempQuat0,normal,AXIS_Y));
            ctx.scale(Vec3.set3(this._tempVec31,planeScale,planeScale,planeScale));
            ctx.translate(Vec3.set3(this._tempVec31,-0.5,-0.5,0));
            this.drawRectStroked();
        ctx.popModelMatrix();
        if(normalScale !== 1.0){
            this._ctx.scale(Vec3.set3(this._tempVec31,normalScale,normalScale,normalScale));
        }
        this.drawVector(VEC3_ZERO,normal,NORMAL_HEAD_LENGTH,NORMAL_HEAD_RADIUS);
    ctx.popModelMatrix();

    this.setPointSize(4);
    this.setColor4(0,1,0,1);
    this.drawPoint(point);

    this.setColor(color);
    this.setPointSize(pointSize);
};

Draw.prototype.debugOnB = function(onb,scale){
    scale = scale === undefined ? 1.0 : scale;

    var color = Vec4.set(this._tempVec40,this._color);

    this._ctx.pushModelMatrix();
        this._ctx.scale(Vec3.set3(this._tempVec30,scale,scale,scale));
        this._ctx.multMatrix(Mat4.setRotationFromOnB(Mat4.identity(this._tempMat40),onb[0],onb[1],onb[2]));
        this.setColor4(1,0,0,1);
        this.drawVector(VEC3_ZERO,AXIS_X);
        this.setColor4(0,1,0,1);
        this.drawVector(VEC3_ZERO,AXIS_Y);
        this.setColor4(0,0,1,1);
        this.drawVector(VEC3_ZERO,AXIS_Z);
    this._ctx.popModelMatrix();

    this.setColor(color);
};

module.exports = Draw;
