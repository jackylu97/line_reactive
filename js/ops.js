"use strict";

var CABLES=CABLES||{};
CABLES.OPS=CABLES.OPS||{};

var Ops=Ops || {};
Ops.Gl=Ops.Gl || {};
Ops.Ui=Ops.Ui || {};
Ops.Anim=Ops.Anim || {};
Ops.Html=Ops.Html || {};
Ops.Math=Ops.Math || {};
Ops.Vars=Ops.Vars || {};
Ops.Patch=Ops.Patch || {};
Ops.Value=Ops.Value || {};
Ops.String=Ops.String || {};
Ops.Boolean=Ops.Boolean || {};
Ops.Devices=Ops.Devices || {};
Ops.Sidebar=Ops.Sidebar || {};
Ops.Trigger=Ops.Trigger || {};
Ops.WebAudio=Ops.WebAudio || {};
Ops.Gl.Matrix=Ops.Gl.Matrix || {};
Ops.Gl.Meshes=Ops.Gl.Meshes || {};
Ops.Gl.Shader=Ops.Gl.Shader || {};
Ops.Devices.Mouse=Ops.Devices.Mouse || {};
Ops.Gl.ShaderEffects=Ops.Gl.ShaderEffects || {};
Ops.Gl.TextureEffects=Ops.Gl.TextureEffects || {};
Ops.Gl.TextureEffects.Noise=Ops.Gl.TextureEffects.Noise || {};



// **************************************************************
// 
// Ops.Gl.MainLoop
// 
// **************************************************************

Ops.Gl.MainLoop = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const fpsLimit = op.inValue("FPS Limit", 0);
const trigger = op.outTrigger("trigger");
const width = op.outValue("width");
const height = op.outValue("height");
const reduceFocusFPS = op.inValueBool("Reduce FPS not focussed", true);
const reduceLoadingFPS = op.inValueBool("Reduce FPS loading");
const clear = op.inValueBool("Clear", true);
const clearAlpha = op.inValueBool("ClearAlpha", true);
const fullscreen = op.inValueBool("Fullscreen Button", false);
const active = op.inValueBool("Active", true);
const hdpi = op.inValueBool("Hires Displays", false);

op.onAnimFrame = render;
hdpi.onChange = function ()
{
    if (hdpi.get()) op.patch.cgl.pixelDensity = window.devicePixelRatio;
    else op.patch.cgl.pixelDensity = 1;

    op.patch.cgl.updateSize();
    if (CABLES.UI) gui.setLayout();
};

active.onChange = function ()
{
    op.patch.removeOnAnimFrame(op);

    if (active.get())
    {
        op.setUiAttrib({ "extendTitle": "" });
        op.onAnimFrame = render;
        op.patch.addOnAnimFrame(op);
        op.log("adding again!");
    }
    else
    {
        op.setUiAttrib({ "extendTitle": "Inactive" });
    }
};

const cgl = op.patch.cgl;
let rframes = 0;
let rframeStart = 0;

if (!op.patch.cgl) op.uiAttr({ "error": "No webgl cgl context" });

const identTranslate = vec3.create();
vec3.set(identTranslate, 0, 0, 0);
const identTranslateView = vec3.create();
vec3.set(identTranslateView, 0, 0, -2);

fullscreen.onChange = updateFullscreenButton;
setTimeout(updateFullscreenButton, 100);
let fsElement = null;


let winhasFocus = true;
let winVisible = true;

window.addEventListener("blur", () => { winhasFocus = false; });
window.addEventListener("focus", () => { winhasFocus = true; });
document.addEventListener("visibilitychange", () => { winVisible = !document.hidden; });


function getFpsLimit()
{
    if (reduceLoadingFPS.get() && op.patch.loading.getProgress() < 1.0) return 5;

    if (reduceFocusFPS.get())
    {
        if (!winVisible) return 10;
        if (!winhasFocus) return 30;
    }

    return fpsLimit.get();
}


function updateFullscreenButton()
{
    function onMouseEnter()
    {
        if (fsElement)fsElement.style.display = "block";
    }

    function onMouseLeave()
    {
        if (fsElement)fsElement.style.display = "none";
    }

    op.patch.cgl.canvas.addEventListener("mouseleave", onMouseLeave);
    op.patch.cgl.canvas.addEventListener("mouseenter", onMouseEnter);

    if (fullscreen.get())
    {
        if (!fsElement)
        {
            fsElement = document.createElement("div");

            const container = op.patch.cgl.canvas.parentElement;
            if (container)container.appendChild(fsElement);

            fsElement.addEventListener("mouseenter", onMouseEnter);
            fsElement.addEventListener("click", function (e)
            {
                if (CABLES.UI && !e.shiftKey) gui.cycleRendererSize();
                else cgl.fullScreen();
            });
        }

        fsElement.style.padding = "10px";
        fsElement.style.position = "absolute";
        fsElement.style.right = "5px";
        fsElement.style.top = "5px";
        fsElement.style.width = "20px";
        fsElement.style.height = "20px";
        fsElement.style.cursor = "pointer";
        fsElement.style["border-radius"] = "40px";
        fsElement.style.background = "#444";
        fsElement.style["z-index"] = "9999";
        fsElement.style.display = "none";
        fsElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" id=\"Capa_1\" x=\"0px\" y=\"0px\" viewBox=\"0 0 490 490\" style=\"width:20px;height:20px;\" xml:space=\"preserve\" width=\"512px\" height=\"512px\"><g><path d=\"M173.792,301.792L21.333,454.251v-80.917c0-5.891-4.776-10.667-10.667-10.667C4.776,362.667,0,367.442,0,373.333V480     c0,5.891,4.776,10.667,10.667,10.667h106.667c5.891,0,10.667-4.776,10.667-10.667s-4.776-10.667-10.667-10.667H36.416     l152.459-152.459c4.093-4.237,3.975-10.99-0.262-15.083C184.479,297.799,177.926,297.799,173.792,301.792z\" fill=\"#FFFFFF\"/><path d=\"M480,0H373.333c-5.891,0-10.667,4.776-10.667,10.667c0,5.891,4.776,10.667,10.667,10.667h80.917L301.792,173.792     c-4.237,4.093-4.354,10.845-0.262,15.083c4.093,4.237,10.845,4.354,15.083,0.262c0.089-0.086,0.176-0.173,0.262-0.262     L469.333,36.416v80.917c0,5.891,4.776,10.667,10.667,10.667s10.667-4.776,10.667-10.667V10.667C490.667,4.776,485.891,0,480,0z\" fill=\"#FFFFFF\"/><path d=\"M36.416,21.333h80.917c5.891,0,10.667-4.776,10.667-10.667C128,4.776,123.224,0,117.333,0H10.667     C4.776,0,0,4.776,0,10.667v106.667C0,123.224,4.776,128,10.667,128c5.891,0,10.667-4.776,10.667-10.667V36.416l152.459,152.459     c4.237,4.093,10.99,3.975,15.083-0.262c3.992-4.134,3.992-10.687,0-14.82L36.416,21.333z\" fill=\"#FFFFFF\"/><path d=\"M480,362.667c-5.891,0-10.667,4.776-10.667,10.667v80.917L316.875,301.792c-4.237-4.093-10.99-3.976-15.083,0.261     c-3.993,4.134-3.993,10.688,0,14.821l152.459,152.459h-80.917c-5.891,0-10.667,4.776-10.667,10.667s4.776,10.667,10.667,10.667     H480c5.891,0,10.667-4.776,10.667-10.667V373.333C490.667,367.442,485.891,362.667,480,362.667z\" fill=\"#FFFFFF\"/></g></svg>";
    }
    else
    {
        if (fsElement)
        {
            fsElement.style.display = "none";
            fsElement.remove();
            fsElement = null;
        }
    }
}

op.onDelete = function ()
{
    cgl.gl.clearColor(0, 0, 0, 0);
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
};


function render(time)
{
    if (!active.get()) return;
    if (cgl.aborted || cgl.canvas.clientWidth === 0 || cgl.canvas.clientHeight === 0) return;

    const startTime = performance.now();

    op.patch.config.fpsLimit = getFpsLimit();

    if (cgl.canvasWidth == -1)
    {
        cgl.setCanvas(op.patch.config.glCanvasId);
        return;
    }

    if (cgl.canvasWidth != width.get() || cgl.canvasHeight != height.get())
    {
        width.set(cgl.canvasWidth);
        height.set(cgl.canvasHeight);
    }

    if (CABLES.now() - rframeStart > 1000)
    {
        CGL.fpsReport = CGL.fpsReport || [];
        if (op.patch.loading.getProgress() >= 1.0 && rframeStart !== 0)CGL.fpsReport.push(rframes);
        rframes = 0;
        rframeStart = CABLES.now();
    }
    CGL.MESH.lastShader = null;
    CGL.MESH.lastMesh = null;

    cgl.renderStart(cgl, identTranslate, identTranslateView);

    if (clear.get())
    {
        cgl.gl.clearColor(0, 0, 0, 1);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
    }

    trigger.trigger();

    if (CGL.MESH.lastMesh)CGL.MESH.lastMesh.unBind();

    if (CGL.Texture.previewTexture)
    {
        if (!CGL.Texture.texturePreviewer) CGL.Texture.texturePreviewer = new CGL.Texture.texturePreview(cgl);
        CGL.Texture.texturePreviewer.render(CGL.Texture.previewTexture);
    }
    cgl.renderEnd(cgl);

    if (clearAlpha.get())
    {
        cgl.gl.clearColor(1, 1, 1, 1);
        cgl.gl.colorMask(false, false, false, true);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT);
        cgl.gl.colorMask(true, true, true, true);
    }

    if (!cgl.frameStore.phong)cgl.frameStore.phong = {};
    rframes++;

    CGL.profileData.profileMainloopMs = performance.now() - startTime;
}


};

Ops.Gl.MainLoop.prototype = new CABLES.Op();
CABLES.OPS["b0472a1d-db16-4ba6-8787-f300fbdc77bb"]={f:Ops.Gl.MainLoop,objName:"Ops.Gl.MainLoop"};




// **************************************************************
// 
// Ops.Sequence
// 
// **************************************************************

Ops.Sequence = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    cleanup = op.inTriggerButton("Clean up connections"),
    exe = op.inTrigger("exe");

const
    exes = [],
    triggers = [],
    num = 16;

let updateTimeout = null;

exe.onTriggered = triggerAll;
cleanup.onTriggered = clean;
cleanup.hidePort();

for (let i = 0; i < num; i++)
{
    const p = op.outTrigger("trigger " + i);
    triggers.push(p);
    p.onLinkChanged = updateButton;

    if (i < num - 1)
    {
        let newExe = op.inTrigger("exe " + i);
        newExe.onTriggered = triggerAll;
        exes.push(newExe);
    }
}

function updateButton()
{
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() =>
    {
        let show = false;
        for (let i = 0; i < triggers.length; i++)
            if (triggers[i].links.length > 1) show = true;

        cleanup.setUiAttribs({ "hideParam": !show });

        if (op.isCurrentUiOp()) op.refreshParams();
    }, 60);
}

function triggerAll()
{
    for (let i = 0; i < triggers.length; i++) triggers[i].trigger();
}

function clean()
{
    let count = 0;
    for (let i = 0; i < triggers.length; i++)
    {
        let removeLinks = [];

        if (triggers[i].links.length > 1)
            for (let j = 1; j < triggers[i].links.length; j++)
            {
                while (triggers[count].links.length > 0) count++;

                removeLinks.push(triggers[i].links[j]);
                const otherPort = triggers[i].links[j].getOtherPort(triggers[i]);
                op.patch.link(op, "trigger " + count, otherPort.parent, otherPort.name);
                count++;
            }

        for (let j = 0; j < removeLinks.length; j++) removeLinks[j].remove();
    }
    updateButton();
}


};

Ops.Sequence.prototype = new CABLES.Op();
CABLES.OPS["a466bc1f-06e9-4595-8849-bffb9fe22f99"]={f:Ops.Sequence,objName:"Ops.Sequence"};




// **************************************************************
// 
// Ops.Gl.Matrix.OrbitControls
// 
// **************************************************************

Ops.Gl.Matrix.OrbitControls = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const render = op.inTrigger("render");
const minDist = op.inValueFloat("min distance");
const maxDist = op.inValueFloat("max distance");

const minRotY = op.inValue("min rot y", 0);
const maxRotY = op.inValue("max rot y", 0);

// const minRotX=op.inValue("min rot x",0);
// const maxRotX=op.inValue("max rot x",0);

const initialRadius = op.inValue("initial radius", 0);
const initialAxis = op.inValueSlider("initial axis y");
const initialX = op.inValueSlider("initial axis x");

const mul = op.inValueFloat("mul");
const smoothness = op.inValueSlider("Smoothness", 1.0);
const speedX = op.inValue("Speed X", 1);
const speedY = op.inValue("Speed Y", 1);

const active = op.inValueBool("Active", true);

const allowPanning = op.inValueBool("Allow Panning", true);
const allowZooming = op.inValueBool("Allow Zooming", true);
const allowRotation = op.inValueBool("Allow Rotation", true);
const restricted = op.inValueBool("restricted", true);
const pointerLock = op.inValueBool("Pointerlock", false);

const trigger = op.outTrigger("trigger");
const outRadius = op.outValue("radius");
const outXDeg = op.outValue("Rot X");
const outYDeg = op.outValue("Rot Y");

const inReset = op.inTriggerButton("Reset");

op.setPortGroup("Initial Values", [initialAxis, initialX, initialRadius]);
op.setPortGroup("Interaction", [mul, smoothness, speedX, speedY]);
op.setPortGroup("Boundaries", [minRotY, maxRotY, minDist, maxDist]);

mul.set(1);
minDist.set(0.05);
maxDist.set(99999);

inReset.onTriggered = reset;

const cgl = op.patch.cgl;
let eye = vec3.create();
const vUp = vec3.create();
const vCenter = vec3.create();
const viewMatrix = mat4.create();
const tempViewMatrix = mat4.create();
const vOffset = vec3.create();
const finalEyeAbs = vec3.create();

initialAxis.set(0.5);

let mouseDown = false;
let radius = 5;
outRadius.set(radius);

let lastMouseX = 0, lastMouseY = 0;
let percX = 0, percY = 0;

vec3.set(vCenter, 0, 0, 0);
vec3.set(vUp, 0, 1, 0);

const tempEye = vec3.create();
const finalEye = vec3.create();
const tempCenter = vec3.create();
const finalCenter = vec3.create();

let px = 0;
let py = 0;

let divisor = 1;
let element = null;
updateSmoothness();

op.onDelete = unbind;

let doLockPointer = false;

pointerLock.onChange = function ()
{
    doLockPointer = pointerLock.get();
    op.log("doLockPointer", doLockPointer);
};

const halfCircle = Math.PI;
const fullCircle = Math.PI * 2;

function reset()
{
    let off = 0;

    if (px % fullCircle < -halfCircle)
    {
        off = -fullCircle;
        px %= -fullCircle;
    }
    else
    if (px % fullCircle > halfCircle)
    {
        off = fullCircle;
        px %= fullCircle;
    }
    else px %= fullCircle;

    py %= (Math.PI);

    vec3.set(vOffset, 0, 0, 0);
    vec3.set(vCenter, 0, 0, 0);
    vec3.set(vUp, 0, 1, 0);

    percX = (initialX.get() * Math.PI * 2 + off);
    percY = (initialAxis.get() - 0.5);

    radius = initialRadius.get();
    eye = circlePos(percY);
}

function updateSmoothness()
{
    divisor = smoothness.get() * 10 + 1.0;
}

smoothness.onChange = updateSmoothness;

let initializing = true;

function ip(val, goal)
{
    if (initializing) return goal;
    return val + (goal - val) / divisor;
}

let lastPy = 0;
const lastPx = 0;

render.onTriggered = function ()
{
    // if (cgl.frameStore.shadowPass) return trigger.trigger();

    cgl.pushViewMatrix();

    px = ip(px, percX);
    py = ip(py, percY);

    let degY = (py + 0.5) * 180;

    if (minRotY.get() !== 0 && degY < minRotY.get())
    {
        degY = minRotY.get();
        py = lastPy;
    }
    else if (maxRotY.get() !== 0 && degY > maxRotY.get())
    {
        degY = maxRotY.get();
        py = lastPy;
    }
    else
    {
        lastPy = py;
    }

    const degX = (px) * CGL.RAD2DEG;

    outYDeg.set(degY);
    outXDeg.set(degX);

    circlePosi(eye, py);

    vec3.add(tempEye, eye, vOffset);
    vec3.add(tempCenter, vCenter, vOffset);

    finalEye[0] = ip(finalEye[0], tempEye[0]);
    finalEye[1] = ip(finalEye[1], tempEye[1]);
    finalEye[2] = ip(finalEye[2], tempEye[2]);

    finalCenter[0] = ip(finalCenter[0], tempCenter[0]);
    finalCenter[1] = ip(finalCenter[1], tempCenter[1]);
    finalCenter[2] = ip(finalCenter[2], tempCenter[2]);

    const empty = vec3.create();
    // var fpm=mat4.create();

    // mat4.translate(fpm, fpm, finalEye);
    // mat4.rotate(fpm, fpm, px, vUp);
    // mat4.multiply(fpm,fpm, cgl.vMatrix);
    // vec3.transformMat4(finalEyeAbs, empty, fpm);

    // outPosX.set(finalEyeAbs[0]);
    // outPosY.set(finalEyeAbs[1]);
    // outPosZ.set(finalEyeAbs[2]);

    mat4.lookAt(viewMatrix, finalEye, finalCenter, vUp);
    mat4.rotate(viewMatrix, viewMatrix, px, vUp);

    // finaly multiply current scene viewmatrix
    mat4.multiply(cgl.vMatrix, cgl.vMatrix, viewMatrix);

    // vec3.transformMat4(finalEyeAbs, empty, cgl.vMatrix);

    // outPosX.set(finalEyeAbs[0]);
    // outPosY.set(finalEyeAbs[1]);
    // outPosZ.set(finalEyeAbs[2]);

    // var fpm=mat4.create();
    // mat4.identity(fpm);
    // mat4.translate(fpm,fpm,finalEye);
    // mat4.rotate(fpm, fpm, px, vUp);
    // mat4.multiply(fpm,fpm,cgl.vMatrix);

    // // vec3.copy(finalEyeAbs,finalEye);
    // // vec3.set(finalEyeAbs,0,1,0);
    // // mat4.rotate(viewMatrix, viewMatrix, px, vUp);
    // // vec3.transformMat4( finalEyeAbs, finalEye, fpm );

    // // vec3.transformMat4( finalEyeAbs, finalEyeAbs, cgl.vMatrix );
    // // mat4.getTranslation(finalEyeAbs,fpm);
    // var pos=vec3.create();
    // vec3.transformMat4(finalEyeAbs, empty, fpm);

    // outPosX.set(finalEyeAbs[0]);
    // outPosY.set(finalEyeAbs[1]);
    // outPosZ.set(finalEyeAbs[2]);

    trigger.trigger();
    cgl.popViewMatrix();
    initializing = false;
};

function circlePosi(vec, perc)
{
    const mmul = mul.get();
    if (radius < minDist.get() * mmul) radius = minDist.get() * mmul;
    if (radius > maxDist.get() * mmul) radius = maxDist.get() * mmul;

    outRadius.set(radius * mmul);

    let i = 0, degInRad = 0;
    // var vec=vec3.create();
    degInRad = 360 * perc / 2 * CGL.DEG2RAD;
    vec3.set(vec,
        Math.cos(degInRad) * radius * mmul,
        Math.sin(degInRad) * radius * mmul,
        0);
    return vec;
}

function circlePos(perc)
{
    const mmul = mul.get();
    if (radius < minDist.get() * mmul)radius = minDist.get() * mmul;
    if (radius > maxDist.get() * mmul)radius = maxDist.get() * mmul;

    outRadius.set(radius * mmul);

    let i = 0, degInRad = 0;
    const vec = vec3.create();
    degInRad = 360 * perc / 2 * CGL.DEG2RAD;
    vec3.set(vec,
        Math.cos(degInRad) * radius * mmul,
        Math.sin(degInRad) * radius * mmul,
        0);
    return vec;
}

function onmousemove(event)
{
    if (!mouseDown) return;

    const x = event.clientX;
    const y = event.clientY;

    let movementX = (x - lastMouseX);
    let movementY = (y - lastMouseY);

    if (doLockPointer)
    {
        movementX = event.movementX * mul.get();
        movementY = event.movementY * mul.get();
    }

    movementX *= speedX.get();
    movementY *= speedY.get();

    if (event.buttons == 2 && allowPanning.get())
    {
        vOffset[2] += movementX * 0.01 * mul.get();
        vOffset[1] += movementY * 0.01 * mul.get();
    }
    else
    if (event.buttons == 4 && allowZooming.get())
    {
        radius += movementY * 0.05;
        eye = circlePos(percY);
    }
    else
    {
        if (allowRotation.get())
        {
            percX += movementX * 0.003;
            percY += movementY * 0.002;

            if (restricted.get())
            {
                if (percY > 0.5)percY = 0.5;
                if (percY < -0.5)percY = -0.5;
            }
        }
    }

    lastMouseX = x;
    lastMouseY = y;
}

function onMouseDown(event)
{
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    mouseDown = true;

    try { element.setPointerCapture(event.pointerId); }
    catch (e) {}

    if (doLockPointer)
    {
        const el = op.patch.cgl.canvas;
        el.requestPointerLock = el.requestPointerLock || el.mozRequestPointerLock || el.webkitRequestPointerLock;
        if (el.requestPointerLock) el.requestPointerLock();
        else op.warn("no requestPointerLock found");
        // document.addEventListener("mousemove", onmousemove, false);

        document.addEventListener("pointerlockchange", lockChange, false);
        document.addEventListener("mozpointerlockchange", lockChange, false);
        document.addEventListener("webkitpointerlockchange", lockChange, false);
    }
}

function onMouseUp(e)
{
    mouseDown = false;
    // cgl.canvas.style.cursor='url(/ui/img/rotate.png),pointer';

    try { element.releasePointerCapture(e.pointerId); }
    catch (e) {}

    if (doLockPointer)
    {
        document.removeEventListener("pointerlockchange", lockChange, false);
        document.removeEventListener("mozpointerlockchange", lockChange, false);
        document.removeEventListener("webkitpointerlockchange", lockChange, false);

        if (document.exitPointerLock) document.exitPointerLock();
        document.removeEventListener("mousemove", pointerLock, false);
    }
}

function lockChange()
{
    const el = op.patch.cgl.canvas;

    if (document.pointerLockElement === el || document.mozPointerLockElement === el || document.webkitPointerLockElement === el)
    {
        document.addEventListener("mousemove", onmousemove, false);
    }
}

function onMouseEnter(e)
{
    // cgl.canvas.style.cursor='url(/ui/img/rotate.png),pointer';
}

initialRadius.onChange = function ()
{
    radius = initialRadius.get();
    reset();
};

initialX.onChange = function ()
{
    px = percX = (initialX.get() * Math.PI * 2);
};

initialAxis.onChange = function ()
{
    py = percY = (initialAxis.get() - 0.5);
    eye = circlePos(percY);
};

const onMouseWheel = function (event)
{
    if (allowZooming.get())
    {
        const delta = CGL.getWheelSpeed(event) * 0.06;
        radius += (parseFloat(delta)) * 1.2;

        eye = circlePos(percY);
    }
};

const ontouchstart = function (event)
{
    doLockPointer = false;
    if (event.touches && event.touches.length > 0) onMouseDown(event.touches[0]);
};

const ontouchend = function (event)
{
    doLockPointer = false;
    onMouseUp();
};

const ontouchmove = function (event)
{
    doLockPointer = false;
    if (event.touches && event.touches.length > 0) onmousemove(event.touches[0]);
};

active.onChange = function ()
{
    if (active.get())bind();
    else unbind();
};

function setElement(ele)
{
    unbind();
    element = ele;
    bind();
}

function bind()
{
    element.addEventListener("pointermove", onmousemove);
    element.addEventListener("pointerdown", onMouseDown);
    element.addEventListener("pointerup", onMouseUp);
    element.addEventListener("pointerleave", onMouseUp);
    element.addEventListener("pointerenter", onMouseEnter);
    element.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    element.addEventListener("wheel", onMouseWheel, { "passive": true });

    // element.addEventListener("touchmove", ontouchmove, { "passive": true });
    // element.addEventListener("touchstart", ontouchstart, { "passive": true });
    // element.addEventListener("touchend", ontouchend, { "passive": true });
}

function unbind()
{
    if (!element) return;

    element.removeEventListener("pointermove", onmousemove);
    element.removeEventListener("pointerdown", onMouseDown);
    element.removeEventListener("pointerup", onMouseUp);
    element.removeEventListener("pointerleave", onMouseUp);
    element.removeEventListener("pointerenter", onMouseUp);
    element.removeEventListener("wheel", onMouseWheel);

    // element.removeEventListener("touchmove", ontouchmove);
    // element.removeEventListener("touchstart", ontouchstart);
    // element.removeEventListener("touchend", ontouchend);
}

eye = circlePos(0);
setElement(cgl.canvas);

bind();

initialX.set(0.25);
initialRadius.set(0.05);


};

Ops.Gl.Matrix.OrbitControls.prototype = new CABLES.Op();
CABLES.OPS["eaf4f7ce-08a3-4d1b-b9f4-ebc0b7b1cde1"]={f:Ops.Gl.Matrix.OrbitControls,objName:"Ops.Gl.Matrix.OrbitControls"};




// **************************************************************
// 
// Ops.Gl.Meshes.LinesArray
// 
// **************************************************************

Ops.Gl.Meshes.LinesArray = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    render=op.inTrigger('render'),
    width=op.inValueFloat("width",10),
    height=op.inValueFloat("height",1),
    doLog=op.inValueBool("Logarithmic",false),
    pivotX=op.inValueSelect("pivot x",["center","left","right"],"center"),
    pivotY=op.inValueSelect("pivot y",["center","top","bottom"],"center"),
    nColumns=op.inValueInt("num columns",10),
    nRows=op.inValueInt("num rows",10),
    axis=op.inValueSelect("axis",["xy","xz"],"xy"),
    trigger=op.outTrigger('trigger'),
    outPointArrays=op.outArray("Point Arrays");

const cgl=op.patch.cgl;
var meshes=[];

op.setPortGroup("Size",[width,height]);
op.setPortGroup("Alignment",[pivotX,pivotY]);

axis.onChange=
    pivotX.onChange=
    pivotY.onChange=
    width.onChange=
    height.onChange=
    nRows.onChange=
    nColumns.onChange=
    doLog.onChange=rebuildDelayed;

rebuild();

render.onTriggered=function()
{
    for(var i=0;i<meshes.length;i++) meshes[i].render(cgl.getShader());
    trigger.trigger();
};

var delayRebuild=0;
function rebuildDelayed()
{
    clearTimeout(delayRebuild);
    delayRebuild=setTimeout(rebuild,60);
}

function rebuild()
{
    var x=0;
    var y=0;

    if(pivotX.get()=='center') x=0;
    if(pivotX.get()=='right') x=-width.get()/2;
    if(pivotX.get()=='left') x=+width.get()/2;

    if(pivotY.get()=='center') y=0;
    if(pivotY.get()=='top') y=-height.get()/2;
    if(pivotY.get()=='bottom') y=+height.get()/2;

    var numRows=parseInt(nRows.get(),10);
    var numColumns=parseInt(nColumns.get(),10);

    var stepColumn=width.get()/numColumns;
    var stepRow=height.get()/numRows;

    var c,r;
    meshes.length=0;

    var vx,vy,vz;
    var verts=[];
    var tc=[];
    var indices=[];
    var count=0;

    function addMesh()
    {
        var geom=new CGL.Geometry();
        geom.vertices=verts;
        geom.texCoords=tc;
        geom.verticesIndices=indices;

        var mesh=new CGL.Mesh(cgl, geom, cgl.gl.LINES);
        mesh.setGeom(geom);
        meshes.push(mesh);

        verts.length=0;
        tc.length=0;
        indices.length=0;
        count=0;
        lvx=null;
    }

    var min=Math.log(1/numRows);
    var max=Math.log(1);
    // op.log(min,max);

    var lines=[];

    for(r=numRows;r>=0;r--)
    {
        // op.log(r/numRows);
        var lvx=null,lvy=null,lvz=null;
        var ltx=null,lty=null;
        var log=0;
        var doLoga=doLog.get();

        var linePoints=[];
        lines.push(linePoints);


        for(c=numColumns;c>=0;c--)
        {
            vx = c * stepColumn - width.get()  / 2 + x;
            if(doLoga)
                vy=(Math.log((r/numRows) )/min)*height.get() - height.get() /2+y;
            else
                vy = r * stepRow    - height.get() / 2 + y;

            var tx = c/numColumns;
            var ty = 1.0-r/numRows;
            if(doLoga) ty = (Math.log((r/numRows) )/min);

            vz=0.0;

            if(axis.get()=='xz')
            {
                vz=vy;
                vy= 0.0 ;
            }
            if(axis.get()=='xy') vz=0.0;

            if(lvx!==null)
            {
                verts.push( lvx );
                verts.push( lvy );
                verts.push( lvz );

                linePoints.push(lvx,lvy,lvz);

                verts.push( vx );
                verts.push( vy );
                verts.push( vz );

                tc.push( ltx );
                tc.push( lty );

                tc.push( tx );
                tc.push( ty );

                indices.push(count);
                count++;
                indices.push(count);
                count++;
            }

            if(count>64000)
            {
                addMesh();
            }

            ltx=tx;
            lty=ty;

            lvx=vx;
            lvy=vy;
            lvz=vz;
        }
    }

    outPointArrays.set(lines);

    addMesh();

    // op.log(meshes.length,' meshes');


}


};

Ops.Gl.Meshes.LinesArray.prototype = new CABLES.Op();
CABLES.OPS["a75265c2-957b-4719-9d03-7bbf00ace364"]={f:Ops.Gl.Meshes.LinesArray,objName:"Ops.Gl.Meshes.LinesArray"};




// **************************************************************
// 
// Ops.Gl.ShaderEffects.VertexDisplacementMap_v4
// 
// **************************************************************

Ops.Gl.ShaderEffects.VertexDisplacementMap_v4 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={vertdisplace_body_vert:"\nvec2 MOD_tc=texCoord;\n\n#ifdef MOD_FLIP_Y\n    MOD_tc.y=1.0-MOD_tc.y;\n#endif\n#ifdef MOD_FLIP_X\n    MOD_tc.x=1.0-MOD_tc.x;\n#endif\n#ifdef MOD_FLIP_XY\n    MOD_tc=1.0-MOD_tc;\n#endif\n\nvec4 MOD_sample=texture2D( MOD_texture, vec2(MOD_tc.x+MOD_offsetX,MOD_tc.y+MOD_offsetY) );\nvec3 MOD_disp;\n\n#ifdef MOD_INPUT_R\n    MOD_disp=vec3(MOD_sample.r);\n#endif\n#ifdef MOD_INPUT_G\n    MOD_disp=vec3(MOD_sample.g);\n#endif\n#ifdef MOD_INPUT_B\n    MOD_disp=vec3(MOD_sample.b);\n#endif\n#ifdef MOD_INPUT_A\n    MOD_disp=vec3(MOD_sample.a);\n#endif\n#ifdef MOD_INPUT_RGB\n    MOD_disp=MOD_sample.rgb;\n#endif\n#ifdef MOD_INPUT_LUMI\n    MOD_disp=vec3(dot(vec3(0.2126,0.7152,0.0722), MOD_sample.rgb));\n#endif\n\n\n\n#ifdef MOD_HEIGHTMAP_INVERT\n   MOD_disp=1.0-MOD_disp;\n#endif\n// #ifdef MOD_HEIGHTMAP_NORMALIZE\n//   MOD_disp-=0.5;\n//   MOD_disp*=2.0;\n// #endif\n\n\n#ifdef MOD_HEIGHTMAP_NORMALIZE\n    MOD_disp=(MOD_disp-0.5)*2.0;\n    // MOD_disp=(MOD_disp-0.5)*-1.0+0.5;\n#endif\n\n\nfloat MOD_zero=0.0;\n\n#ifdef MOD_MODE_DIV\n    MOD_zero=1.0;\n#endif\n#ifdef MOD_MODE_MUL\n    MOD_zero=1.0;\n#endif\n\n\n\nvec3 MOD_mask=vec3(1.0);\n\n#ifdef MOD_AXIS_X\n    MOD_mask=vec3(1.,0.,0.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n#ifdef MOD_AXIS_Y\n    MOD_mask=vec3(0.,1.,0.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n#ifdef MOD_AXIS_Z\n    MOD_mask=vec3(0.,0.,1.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n#ifdef MOD_AXIS_XY\n    MOD_mask=vec3(1.,1.,0.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n#ifdef MOD_AXIS_XYZ\n    MOD_mask=vec3(1.,1.,1.);\n    MOD_disp*=MOD_mask*MOD_extrude;\n#endif\n\n\n// MOD_disp=smoothstep(-1.,1.,MOD_disp*MOD_disp*MOD_disp);\n// MOD_disp=MOD_disp*MOD_disp*MOD_disp;\n\n// #ifdef MOD_FLIP_Y\n//     MOD_mask.y=1.0-MOD_mask.y;\n// #endif\n// #ifdef MOD_FLIP_X\n//     MOD_mask.x=1.0-MOD_mask.x;\n// #endif\n// #ifdef MOD_FLIP_XY\n//     MOD_mask.xy=1.0-MOD_mask.xy;\n// #endif\n\n\n\n#ifdef MOD_MODE_DIV\n    pos.xyz/=MOD_disp*MOD_mask;\n#endif\n\n#ifdef MOD_MODE_MUL\n    pos.xyz*=MOD_disp*MOD_mask;\n#endif\n\n#ifdef MOD_MODE_ADD\n    pos.xyz+=MOD_disp*MOD_mask;\n#endif\n\n#ifdef MOD_MODE_NORMAL\n\n    vec3 MOD_t=norm;\n    #ifdef MOD_SMOOTHSTEP\n        MOD_t=smoothstep(-1.,1.,MOD_t);\n    #endif\n\n    pos.xyz+=MOD_t*MOD_disp*MOD_mask;\n\n#endif\n\n#ifdef MOD_MODE_TANGENT\n    MOD_disp*=-1.0;\n\n    vec3 MOD_t=attrTangent;\n    #ifdef MOD_SMOOTHSTEP\n        MOD_t=smoothstep(-1.,1.,MOD_t);\n    #endif\n\n    pos.xyz+=MOD_t*MOD_disp*MOD_mask;\n\n#endif\n\n#ifdef MOD_MODE_BITANGENT\n    MOD_disp*=-1.0;\n    vec3 MOD_t=attrBiTangent;\n\n    #ifdef MOD_SMOOTHSTEP\n        MOD_t=smoothstep(-1.,1.,MOD_t);\n    #endif\n\n    pos.xyz+=MOD_t*MOD_disp*MOD_mask;\n\n#endif\n\n\n// pos.y*=-1.0;\n    // pos.xy+=vec2(MOD_texVal*MOD_extrude)*normalize(pos.xy);\n\n\nMOD_displHeightMapColor=MOD_disp;\n\n\n#ifdef CALC_NORMALS\n    norm+=MOD_calcNormal(MOD_texture,MOD_tc);\n#endif",vertdisplace_head_vert:"OUT vec3 MOD_displHeightMapColor;\n\n// mat4 rotationX( in float angle ) {\n// \treturn mat4(\t1.0,\t\t0,\t\t\t0,\t\t\t0,\n// \t\t\t \t\t0, \tcos(angle),\t-sin(angle),\t\t0,\n// \t\t\t\t\t0, \tsin(angle),\t cos(angle),\t\t0,\n// \t\t\t\t\t0, \t\t\t0,\t\t\t  0, \t\t1);\n// }\n\n// mat4 rotationY( in float angle ) {\n// \treturn mat4(\tcos(angle),\t\t0,\t\tsin(angle),\t0,\n// \t\t\t \t\t\t\t0,\t\t1.0,\t\t\t 0,\t0,\n// \t\t\t\t\t-sin(angle),\t0,\t\tcos(angle),\t0,\n// \t\t\t\t\t\t\t0, \t\t0,\t\t\t\t0,\t1);\n// }\n\n// mat4 rotationZ( in float angle ) {\n// \treturn mat4(\tcos(angle),\t\t-sin(angle),\t0,\t0,\n// \t\t\t \t\tsin(angle),\t\tcos(angle),\t\t0,\t0,\n// \t\t\t\t\t\t\t0,\t\t\t\t0,\t\t1,\t0,\n// \t\t\t\t\t\t\t0,\t\t\t\t0,\t\t0,\t1);\n// }\n\n\nvec3 MOD_calcNormal(sampler2D tex,vec2 uv)\n{\n    float strength=13.0;\n    float texelSize=1.0/512.0;\n\n    float tl = abs(texture(tex, uv + texelSize * vec2(-1.0, -1.0)).x);   // top left\n    float  l = abs(texture(tex, uv + texelSize * vec2(-1.0,  0.0)).x);   // left\n    float bl = abs(texture(tex, uv + texelSize * vec2(-1.0,  1.0)).x);   // bottom left\n    float  t = abs(texture(tex, uv + texelSize * vec2( 0.0, -1.0)).x);   // top\n    float  b = abs(texture(tex, uv + texelSize * vec2( 0.0,  1.0)).x);   // bottom\n    float tr = abs(texture(tex, uv + texelSize * vec2( 1.0, -1.0)).x);   // top right\n    float  r = abs(texture(tex, uv + texelSize * vec2( 1.0,  0.0)).x);   // right\n    float br = abs(texture(tex, uv + texelSize * vec2( 1.0,  1.0)).x);   // bottom right\n\n    //     // Compute dx using Sobel:\n    //     //           -1 0 1\n    //     //           -2 0 2\n    //     //           -1 0 1\n    float dX = tr + 2.0*r + br -tl - 2.0*l - bl;\n\n    //     // Compute dy using Sobel:\n    //     //           -1 -2 -1\n    //     //            0  0  0\n    //     //            1  2  1\n    float dY = bl + 2.0*b + br -tl - 2.0*t - tr;\n\n    //     // Build the normalized normal\n\n    vec3 N = normalize(vec3(dX,dY, 1.0 / strength));\n\n    //     //convert (-1.0 , 1.0) to (0.0 , 1.0), if needed\n    N= N * 0.5 + 0.5;\n\n   return N;\n}\n",};
const
    render = op.inTrigger("Render"),

    // meth = op.inValueSelect("Mode", ["normal", "normal xy", "mul xyz", "mul xy", "sub x", "add x", "add xy", "add y", "add z", "mul y", "mul z", "sub z", "normal2", "normal RGB", "m14"], "normal"),
    extrude = op.inValue("Extrude", 0.5),
    meth = op.inSwitch("Mode", ["Norm", "Tang", "BiTang", "*", "+", "/"], "Norm"),
    axis = op.inSwitch("Axis", ["XYZ", "XY", "X", "Y", "Z"], "XYZ"),

    texture = op.inTexture("Texture"),
    channel = op.inSwitch("Channel", ["Luminance", "R", "G", "B", "A", "RGB"], "Luminance"),
    flip = op.inSwitch("Flip", ["None", "X", "Y", "XY"], "None"),
    range = op.inSwitch("Range", ["0-1", "1-0", "Normalized"], "0-1"),
    offsetX = op.inValueFloat("Offset X"),
    offsetY = op.inValueFloat("Offset Y"),

    calcNormals = op.inValueBool("Calc Normals", false),
    removeZero = op.inValueBool("Discard Zero Values"),
    colorize = op.inValueBool("colorize", false),
    colorizeMin = op.inValueSlider("Colorize Min", 0),
    colorizeMax = op.inValueSlider("Colorize Max", 1),
    next = op.outTrigger("trigger");

const cgl = op.patch.cgl;

op.setPortGroup("Input", [texture, flip, channel, range, offsetX, offsetY]);
op.setPortGroup("Colorize", [colorize, colorizeMin, colorizeMax]);

op.toWorkPortsNeedToBeLinked(texture, next, render);

render.onTriggered = dorender;

channel.onChange =
colorize.onChange =
axis.onChange =
    range.onChange =
    removeZero.onChange =
    flip.onChange =
    calcNormals.onChange =
    meth.onChange = updateDefines;

const srcHeadVert = attachments.vertdisplace_head_vert;
const srcBodyVert = attachments.vertdisplace_body_vert;

const srcHeadFrag = ""
    .endl() + "IN vec3 MOD_displHeightMapColor;"
    .endl() + "float MOD_map(float value, float inMin, float inMax, float outMin, float outMax) { return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);}"

    .endl();

const srcBodyFrag = ""
    .endl() + "#ifdef MOD_HEIGHTMAP_COLORIZE"
    .endl() + "   col.rgb*=MOD_map( MOD_displHeightMapColor, 0.0,1.0 , MOD_colorizeMin,MOD_colorizeMax);"
    .endl() + "#endif"
    .endl() + "#ifdef MOD_DISPLACE_REMOVE_ZERO"
    .endl() + "   if(MOD_displHeightMapColor.r==0.0)discard;"
    .endl() + "#endif"
    .endl();

const mod = new CGL.ShaderModifier(cgl, op.name);
mod.addModule({
    "title": op.name,
    "name": "MODULE_VERTEX_POSITION",
    "srcHeadVert": srcHeadVert,
    "srcBodyVert": srcBodyVert
});

mod.addModule({
    "title": op.name,
    "name": "MODULE_COLOR",
    "srcHeadFrag": srcHeadFrag,
    "srcBodyFrag": srcBodyFrag
});

mod.addUniformVert("t", "MOD_texture", 0);
mod.addUniformVert("f", "MOD_extrude", extrude);
mod.addUniformVert("f", "MOD_offsetX", offsetX);
mod.addUniformVert("f", "MOD_offsetY", offsetY);

mod.addUniformFrag("f", "MOD_colorizeMin", colorizeMin);
mod.addUniformFrag("f", "MOD_colorizeMax", colorizeMax);

updateDefines();

function updateDefines()
{
    mod.toggleDefine("MOD_HEIGHTMAP_COLORIZE", colorize.get());

    mod.toggleDefine("MOD_HEIGHTMAP_INVERT", range.get() == "1-0");
    mod.toggleDefine("MOD_HEIGHTMAP_NORMALIZE", range.get() == "Normalized");

    mod.toggleDefine("MOD_DISPLACE_REMOVE_ZERO", removeZero.get());

    mod.toggleDefine("MOD_INPUT_R", channel.get() == "R");
    mod.toggleDefine("MOD_INPUT_G", channel.get() == "G");
    mod.toggleDefine("MOD_INPUT_B", channel.get() == "B");
    mod.toggleDefine("MOD_INPUT_A", channel.get() == "A");
    mod.toggleDefine("MOD_INPUT_RGB", channel.get() == "RGB");
    mod.toggleDefine("MOD_INPUT_LUMI", channel.get() == "Luminance");

    mod.toggleDefine("MOD_FLIP_X", flip.get() == "X");
    mod.toggleDefine("MOD_FLIP_Y", flip.get() == "Y");
    mod.toggleDefine("MOD_FLIP_XY", flip.get() == "XY");

    mod.toggleDefine("MOD_AXIS_X", axis.get() == "X");
    mod.toggleDefine("MOD_AXIS_Y", axis.get() == "Y");
    mod.toggleDefine("MOD_AXIS_Z", axis.get() == "Z");
    mod.toggleDefine("MOD_AXIS_XYZ", axis.get() == "XYZ");
    mod.toggleDefine("MOD_AXIS_XY", axis.get() == "XY");

    mod.toggleDefine("MOD_MODE_BITANGENT", meth.get() == "BiTang");
    mod.toggleDefine("MOD_MODE_TANGENT", meth.get() == "Tang");
    mod.toggleDefine("MOD_MODE_NORMAL", meth.get() == "Norm");
    mod.toggleDefine("MOD_MODE_MUL", meth.get() == "*");
    mod.toggleDefine("MOD_MODE_ADD", meth.get() == "+");
    mod.toggleDefine("MOD_MODE_DIV", meth.get() == "/");
    mod.toggleDefine("MOD_SMOOTHSTEP", 0);

    // mod.toggleDefine("MOD_DISPLACE_METH_MULXYZ", meth.get() == "mul xyz");
    // mod.toggleDefine("MOD_DISPLACE_METH_MULXY", meth.get() == "mul xy");
    // mod.toggleDefine("MOD_DISPLACE_METH_ADDZ", meth.get() == "add z");
    // mod.toggleDefine("MOD_DISPLACE_METH_ADDY", meth.get() == "add y");
    // mod.toggleDefine("MOD_DISPLACE_METH_ADDX", meth.get() == "add x");
    // mod.toggleDefine("MOD_DISPLACE_METH_ADDXY", meth.get() == "add xy");
    // mod.toggleDefine("MOD_DISPLACE_METH_SUBX", meth.get() == "sub x");
    // mod.toggleDefine("MOD_DISPLACE_METH_MULY", meth.get() == "mul y");
    // mod.toggleDefine("MOD_DISPLACE_METH_MULZ", meth.get() == "mul z");
    // mod.toggleDefine("MOD_DISPLACE_METH_NORMAL", meth.get() == "normal");
    // mod.toggleDefine("MOD_DISPLACE_METH_NORMAL_XY", meth.get() == "normal xy");
    // mod.toggleDefine("MOD_DISPLACE_METH_NORMAL2", meth.get() == "normal2");

    // mod.toggleDefine("MOD_DISPLACE_METH_NORMAL_RGB", meth.get() == "normal RGB");
    // mod.toggleDefine("MOD_DISPLACE_METH_14", meth.get() == "m14");

    mod.toggleDefine("CALC_NORMALS", calcNormals.get());
}

function dorender()
{
    mod.bind();

    if (texture.get()) mod.pushTexture("MOD_texture", texture.get().tex);
    else mod.pushTexture("MOD_texture", CGL.Texture.getEmptyTexture(cgl).tex);

    next.trigger();

    mod.unbind();
}


};

Ops.Gl.ShaderEffects.VertexDisplacementMap_v4.prototype = new CABLES.Op();
CABLES.OPS["ed36e5ad-457b-4ac6-a929-11b66951cb6c"]={f:Ops.Gl.ShaderEffects.VertexDisplacementMap_v4,objName:"Ops.Gl.ShaderEffects.VertexDisplacementMap_v4"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.ImageCompose_v2
// 
// **************************************************************

Ops.Gl.TextureEffects.ImageCompose_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={imgcomp_frag:"UNI float a;\nvoid main()\n{\n   outColor= vec4(0.0,0.0,0.0,a);\n}\n",};
const
    render = op.inTrigger("Render"),
    useVPSize = op.inBool("Use viewport size", true),
    width = op.inValueInt("Width", 640),
    height = op.inValueInt("Height", 480),
    tfilter = op.inSwitch("Filter", ["nearest", "linear", "mipmap"], "linear"),
    twrap = op.inValueSelect("Wrap", ["clamp to edge", "repeat", "mirrored repeat"], "repeat"),
    fpTexture = op.inValueBool("HDR"),
    inTransp = op.inValueBool("Transparent", false),

    trigger = op.outTrigger("Next"),
    texOut = op.outTexture("texture_out"),
    outRatio = op.outValue("Aspect Ratio");

const cgl = op.patch.cgl;
op.setPortGroup("Texture Size", [useVPSize, width, height]);
op.setPortGroup("Texture Settings", [twrap, tfilter, fpTexture, inTransp]);

texOut.set(CGL.Texture.getEmptyTexture(cgl));
let effect = null;
let tex = null;
let w = 8, h = 8;

const prevViewPort = [0, 0, 0, 0];
let reInitEffect = true;

const bgShader = new CGL.Shader(cgl, "imgcompose bg");
bgShader.setSource(bgShader.getDefaultVertexShader(), attachments.imgcomp_frag);

const uniAlpha = new CGL.Uniform(bgShader, "f", "a", !inTransp.get());

let selectedFilter = CGL.Texture.FILTER_LINEAR;
let selectedWrap = CGL.Texture.WRAP_CLAMP_TO_EDGE;

const fps = 0;
const fpsStart = 0;

twrap.onChange = onWrapChange;
tfilter.onChange = onFilterChange;

render.onTriggered = op.preRender = doRender;

onFilterChange();
onWrapChange();
updateSizePorts();

inTransp.onChange = () =>
{
    uniAlpha.setValue(!inTransp.get());
};

function initEffect()
{
    if (effect)effect.delete();
    if (tex)tex.delete();

    if (fpTexture.get() && tfilter.get() == "mipmap") op.setUiError("fpmipmap", "Don't use mipmap and HDR at the same time, many systems do not support this.");
    else op.setUiError("fpmipmap", null);

    effect = new CGL.TextureEffect(cgl, { "isFloatingPointTexture": fpTexture.get() });

    tex = new CGL.Texture(cgl,
        {
            "name": "image_compose_v2" + op.id,
            "isFloatingPointTexture": fpTexture.get(),
            "filter": selectedFilter,
            "wrap": selectedWrap,
            "width": Math.ceil(width.get()),
            "height": Math.ceil(height.get()),
        });

    effect.setSourceTexture(tex);
    texOut.set(CGL.Texture.getEmptyTexture(cgl));

    reInitEffect = false;
}

fpTexture.onChange = function ()
{
    reInitEffect = true;
};

function updateResolution()
{
    if (!effect)initEffect();

    if (useVPSize.get())
    {
        w = cgl.getViewPort()[2];
        h = cgl.getViewPort()[3];
    }
    else
    {
        w = Math.ceil(width.get());
        h = Math.ceil(height.get());
    }

    if ((w != tex.width || h != tex.height) && (w !== 0 && h !== 0))
    {
        height.set(h);
        width.set(w);
        tex.setSize(w, h);
        outRatio.set(w / h);
        effect.setSourceTexture(tex);
        texOut.set(CGL.Texture.getEmptyTexture(cgl));
        texOut.set(tex);
    }

    if (texOut.get() && selectedFilter != CGL.Texture.FILTER_NEAREST)
    {
        if (!texOut.get().isPowerOfTwo()) op.setUiError("hintnpot", "texture dimensions not power of two! - texture filtering when scaling will not work on ios devices.", 0);
        else op.setUiError("hintnpot", null, 0);
    }
    else op.setUiError("hintnpot", null, 0);
}

function updateSizePorts()
{
    width.setUiAttribs({ "greyout": useVPSize.get() });
    height.setUiAttribs({ "greyout": useVPSize.get() });
}

useVPSize.onChange = function ()
{
    updateSizePorts();
};

op.preRender = function ()
{
    doRender();
    bgShader.bind();
};

function doRender()
{
    if (!effect || reInitEffect) initEffect();

    const vp = cgl.getViewPort();
    prevViewPort[0] = vp[0];
    prevViewPort[1] = vp[1];
    prevViewPort[2] = vp[2];
    prevViewPort[3] = vp[3];

    cgl.pushBlend(false);

    updateResolution();

    cgl.currentTextureEffect = effect;
    effect.setSourceTexture(tex);

    effect.startEffect();

    cgl.pushShader(bgShader);
    cgl.currentTextureEffect.bind();
    cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);
    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();

    texOut.set(effect.getCurrentSourceTexture());

    effect.endEffect();

    cgl.setViewPort(prevViewPort[0], prevViewPort[1], prevViewPort[2], prevViewPort[3]);

    // if(selectedFilter == CGL.Texture.FILTER_MIPMAP)
    // {
    // fps++;

    // if(performance.now()-fpsStart>1000)
    // {
    //     if(fps>10)
    //     {
    //     op.setUiError("manymipmap", "generating mipmaps", 1);
    //     }
    //     else op.setUiError("manymipmap", null, 1);

    //     fps=0;
    //     fpsStart=performance.now();

    // }
    // }

    cgl.popBlend(false);
    cgl.currentTextureEffect = null;
}

function onWrapChange()
{
    if (twrap.get() == "repeat") selectedWrap = CGL.Texture.WRAP_REPEAT;
    if (twrap.get() == "mirrored repeat") selectedWrap = CGL.Texture.WRAP_MIRRORED_REPEAT;
    if (twrap.get() == "clamp to edge") selectedWrap = CGL.Texture.WRAP_CLAMP_TO_EDGE;

    reInitEffect = true;
    // updateResolution();
}

function onFilterChange()
{
    if (tfilter.get() == "nearest") selectedFilter = CGL.Texture.FILTER_NEAREST;
    if (tfilter.get() == "linear") selectedFilter = CGL.Texture.FILTER_LINEAR;
    if (tfilter.get() == "mipmap") selectedFilter = CGL.Texture.FILTER_MIPMAP;

    reInitEffect = true;
    // updateResolution();
}


};

Ops.Gl.TextureEffects.ImageCompose_v2.prototype = new CABLES.Op();
CABLES.OPS["a5b43d4c-a9ea-4eaf-9ed0-f257d222659d"]={f:Ops.Gl.TextureEffects.ImageCompose_v2,objName:"Ops.Gl.TextureEffects.ImageCompose_v2"};




// **************************************************************
// 
// Ops.WebAudio.AudioBuffer_v2
// 
// **************************************************************

Ops.WebAudio.AudioBuffer_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    audioCtx = CABLES.WEBAUDIO.createAudioContext(op),
    inUrlPort = op.inUrl("URL", "audio"),
    audioBufferPort = op.outObject("Audio Buffer"),
    finishedLoadingPort = op.outValue("Finished Loading", false),
    sampleRatePort = op.outValue("Sample Rate", 0),
    lengthPort = op.outValue("Length", 0),
    durationPort = op.outValue("Duration", 0),
    numberOfChannelsPort = op.outValue("Number of Channels", 0);

if (!audioBufferPort.isLinked())
{
    op.setUiError("notConnected", "To play back sound, connect this op to a playback operator such as SamplePlayer or AudioBufferPlayer.", 0);
}
else
{
    op.setUiError("notConnected", null);
}

audioBufferPort.onLinkChanged = () =>
{
    if (audioBufferPort.isLinked())
    {
        op.setUiError("notConnected", null);
    }
    else
    {
        op.setUiError("notConnected", "To play back sound, connect this op to a playback operator such as SamplePlayer or AudioBufferPlayer.", 0);
    }
};
// change listeners
inUrlPort.onChange = function ()
{
    const url = op.patch.getFilePath(inUrlPort.get());

    if (typeof url === "string" && url.length > 1)
    {
        const ext = url.substr(url.lastIndexOf(".") + 1);
        if (ext === "wav")
        {
            op.setUiError("wavFormat", "You are using a .wav file. Make sure the .wav file is 16 bit to be supported by all browsers. Safari does not support 24 bit .wav files.", 1);
        }
        else
        {
            op.setUiError("wavFormat", null);
        }
        CABLES.WEBAUDIO.loadAudioFile(op.patch, url, onLoadFinished, onLoadFailed);
    }
    else
    {
        invalidateOutPorts();
        op.setUiError("wavFormat", null);
        op.setUiError("failedLoading", null);
    }
};

function onLoadFinished(buffer)
{
    lengthPort.set(buffer.length);
    durationPort.set(buffer.duration);
    numberOfChannelsPort.set(buffer.numberOfChannels);
    sampleRatePort.set(buffer.sampleRate);
    audioBufferPort.set(buffer);
    op.setUiError("failedLoading", null);
    finishedLoadingPort.set(true);
}

function onLoadFailed(e)
{
    op.error("Error: Loading audio file failed: ", e);
    op.setUiError("failedLoading", "The audio file could not be loaded. Make sure the right file URL is used.", 2);
    invalidateOutPorts();
}

function invalidateOutPorts()
{
    lengthPort.set(0);
    durationPort.set(0);
    numberOfChannelsPort.set(0);
    sampleRatePort.set(0);
    audioBufferPort.set(null);
    finishedLoadingPort.set(false);
}


};

Ops.WebAudio.AudioBuffer_v2.prototype = new CABLES.Op();
CABLES.OPS["5f1d6a2f-1c04-4744-b0fb-910825beceee"]={f:Ops.WebAudio.AudioBuffer_v2,objName:"Ops.WebAudio.AudioBuffer_v2"};




// **************************************************************
// 
// Ops.WebAudio.AudioAnalyzer_v2
// 
// **************************************************************

Ops.WebAudio.AudioAnalyzer_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
const MAX_DBFS_RANGE_24_BIT = -144;
const MAX_DBFS_RANGE_26_BIT = -96;

let audioCtx = CABLES.WEBAUDIO.createAudioContext(op);

const inTrigger = op.inTrigger("Trigger In");

const analyser = audioCtx.createAnalyser();
analyser.smoothingTimeConstant = 0.3;
analyser.fftSize = 256;

const FFT_BUFFER_SIZES = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];

const audioIn = op.inObject("Audio In");
const inFFTSize = op.inDropDown("FFT size", FFT_BUFFER_SIZES, 256);
const inSmoothing = op.inFloatSlider("Smoothing", 0.3);

const inRangeMin = op.inFloat("Min", -90);
const inRangeMax = op.inFloat("Max", 0);

op.setPortGroup("Inputs", [inTrigger, audioIn]);
op.setPortGroup("FFT Options", [inFFTSize, inSmoothing]);
op.setPortGroup("Range (in dBFS)", [inRangeMin, inRangeMax]);
const outTrigger = op.outTrigger("Trigger Out");
const audioOut = op.outObject("Audio Out");
const fftOut = op.outArray("FFT Array");
const ampOut = op.outArray("Waveform Array");
const frequencyOut = op.outArray("Frequencies by Index Array");
const fftLength = op.outNumber("Array Length");
const avgVolumePeak = op.outNumber("Average Volume");
const avgVolumeAmp = op.outNumber("Average Volume Time-Domain");
const avgVolumeRMS = op.outNumber("RMS Volume");
let updating = false;

let fftBufferLength = analyser.frequencyBinCount;
let fftDataArray = new Uint8Array(fftBufferLength);
let ampDataArray = new Uint8Array(fftBufferLength);
let frequencyArray = [];
frequencyArray.length = fftBufferLength;
let oldAudioIn = null;

audioIn.onChange = () =>
{
    if (audioIn.get())
    {
        const audioNode = audioIn.get();
        if (audioNode.connect)
        {
            audioNode.connect(analyser);
            audioOut.set(analyser);
            op.setUiError("audioCtx", null);
        }
        else
        {
            op.setUiError("audioCtx", "The passed input is not an audio context. Please make sure you connect an audio context to the input.", 2);
        }
    }
    else
    {
        if (oldAudioIn)
        {
            if (oldAudioIn.disconnect) oldAudioIn.disconnect(analyser);
            audioOut.set(null);
        }
        op.setUiError("audioCtx", null);
    }
    oldAudioIn = audioIn.get();
};

function updateAnalyser()
{
    try
    {
        analyser.smoothingTimeConstant = clamp(inSmoothing.get(), 0.0, 1.0);
        analyser.fftSize = Number(inFFTSize.get());
        const minDecibels = clamp(inRangeMin.get(), MAX_DBFS_RANGE_24_BIT, -0.0001);
        const maxDecibels = Math.max(inRangeMax.get(), analyser.minDecibels + 0.0001);
        analyser.minDecibels = minDecibels;
        analyser.maxDecibels = maxDecibels;

        if (minDecibels < MAX_DBFS_RANGE_24_BIT)
        {
            op.setUiError("maxDbRangeMin",
                "Your minimum is below the lowest possible dBFS value: "
                + MAX_DBFS_RANGE_24_BIT
                + "dBFS. To make sure your analyser data is correct, try increasing the minimum.",
                1
            );
        }
        else
        {
            op.setUiError("maxDbRangeMin", null);
        }

        if (maxDecibels > 0)
        {
            op.setUiError("maxDbRangeMax", "Your maximum is above 0 dBFS. As digital signals only go to 0 dBFS and not above, you should use 0 as your maximum.", 1);
        }
        else
        {
            op.setUiError("maxDbRangeMax", null);
        }
    }
    catch (e)
    {
        op.log(e);
    }
}

inFFTSize.onChange = inSmoothing.onChange
= inRangeMin.onChange = inRangeMax.onChange = () =>
    {
        if (inTrigger.isLinked()) updating = true;
        else updateAnalyser();
    };

inTrigger.onTriggered = function ()
{
    if (updating)
    {
        updateAnalyser();
        updating = false;
    }

    if (fftBufferLength != analyser.frequencyBinCount)
    {
        fftBufferLength = analyser.frequencyBinCount;
        fftDataArray = new Uint8Array(fftBufferLength);
        ampDataArray = new Uint8Array(fftBufferLength);

        frequencyArray = [];
        frequencyArray.length = fftBufferLength;

        for (let index = 0; index < fftBufferLength; index += 1)
        {
            frequencyArray[index] = Math.round(index * audioCtx.sampleRate / (analyser.fftSize * 2));
        }

        frequencyOut.set(null);
        frequencyOut.set(frequencyArray);
    }

    if (!fftDataArray) return;
    if (!ampDataArray) return;

    const fftSize = Number(inFFTSize.get());

    try
    {
        analyser.getByteFrequencyData(fftDataArray);
        analyser.getByteTimeDomainData(ampDataArray);

        let values = 0;
        let peakValues = 0;
        let ampPeakValues = 0;
        for (let i = 0; i < analyser.frequencyBinCount; i++)
        {
            values += ampDataArray[i] * ampDataArray[i];
            peakValues += fftDataArray[i];
            ampPeakValues += ampDataArray[i];
        }

        const peakAverage = peakValues / analyser.frequencyBinCount;
        const peakAmpAverage = ampPeakValues / analyser.frequencyBinCount;

        avgVolumePeak.set(peakAverage / 128);
        avgVolumeAmp.set(peakAmpAverage / 256);

        let rms = Math.sqrt(values / analyser.frequencyBinCount);
        rms = Math.max(rms, rms * inSmoothing.get());
        avgVolumeRMS.set(rms / 256);
    }
    catch (e) { op.log(e); }

    fftOut.set(null);
    fftOut.set(fftDataArray);

    ampOut.set(null);
    ampOut.set(ampDataArray);

    fftLength.set(fftDataArray.length);
    outTrigger.trigger();
};


};

Ops.WebAudio.AudioAnalyzer_v2.prototype = new CABLES.Op();
CABLES.OPS["ff9bf46c-676f-4aa1-95bf-5595a6813ed7"]={f:Ops.WebAudio.AudioAnalyzer_v2,objName:"Ops.WebAudio.AudioAnalyzer_v2"};




// **************************************************************
// 
// Ops.WebAudio.AudioBufferPlayer_v2
// 
// **************************************************************

Ops.WebAudio.AudioBufferPlayer_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const audioCtx = CABLES.WEBAUDIO.createAudioContext(op);

// input ports
const audioBufferPort = op.inObject("Audio Buffer");
const playPort = op.inBool("Start / Stop", false);
const autoPlayPort = op.inBool("Autoplay", false);
const loopPort = op.inBool("Loop", false);
const inResetStart = op.inTriggerButton("Restart");
const startTimePort = op.inFloat("Start Time", 0);
const stopTimePort = op.inFloat("Stop Time", 0);
const offsetPort = op.inFloat("Offset", 0);
const playbackRatePort = op.inFloat("Playback Rate", 1);
const detunePort = op.inFloat("Detune", 0);

op.setPortGroup("Playback Controls", [playPort, autoPlayPort, loopPort, inResetStart]);
op.setPortGroup("Time Controls", [startTimePort, stopTimePort, offsetPort]);
op.setPortGroup("Miscellaneous", [playbackRatePort, detunePort]);
// output ports
const audioOutPort = op.outObject("Audio Out");
const outPlaying = op.outBool("Is Playing", false);
// vars
let source = null;
let isPlaying = false;
let hasEnded = false;
let pausedAt = null;
let startedAt = null;

const gainNode = audioCtx.createGain();

if (!audioBufferPort.isLinked())
{
    op.setUiError("inputNotConnected", "To be able to play back sound, you need to connect an AudioBuffer to this op.", 0);
}
else
{
    op.setUiError("inputNotConnected", null);
}

audioBufferPort.onLinkChanged = () =>
{
    if (!audioBufferPort.isLinked())
    {
        op.setUiError("inputNotConnected", "To be able to play back sound, you need to connect an AudioBuffer to this op.", 0);
    }
    else
    {
        op.setUiError("inputNotConnected", null);
    }
};

if (!audioOutPort.isLinked())
{
    op.setUiError("outputNotConnected", "To be able to hear sound playing, you need to connect this op to an Output op.", 0);
}
else
{
    op.setUiError("outputNotConnected", null);
}

audioOutPort.onLinkChanged = () =>
{
    if (!audioOutPort.isLinked())
    {
        op.setUiError("outputNotConnected", "To be able to hear sound playing, you need to connect this op to an Output op.", 0);
    }
    else
    {
        op.setUiError("outputNotConnected", null);
    }
};
// change listeners
audioBufferPort.onChange = function ()
{
    if (audioBufferPort.get())
    {
        if (!(audioBufferPort.get() instanceof AudioBuffer))
        {
            op.setUiError("noAudioBuffer", "The passed object is not an AudioBuffer. You have to pass an AudioBuffer to be able to play back sound.", 2);
            return;
        }

        op.setUiError("noAudioBuffer", null);

        createAudioBufferSource();

        if (
            (autoPlayPort.get() && audioBufferPort.get()) ||
        (playPort.get() && audioBufferPort.get())
        )
        {
            start(startTimePort.get(), offsetPort.get());
        }
    }
    else
    {
        op.setUiError("noAudioBuffer", null);

        if (isPlaying)
        {
            stop(0);
            setTimeout(function ()
            {
                if (isPlaying) source.stop();
            }, 30);
        }
    }
};
playPort.onChange = function ()
{
    if (source)
    {
        if (playPort.get())
        {
            const startTime = startTimePort.get() || 0;
            createAudioBufferSource();
            start(startTime);
        }
        else
        {
            const stopTime = stopTimePort.get() || 0;
            stop(stopTime);
        }
    }
};

loopPort.onChange = function ()
{
    if (source)
    {
        source.loop = !!loopPort.get();
    }
};

detunePort.onChange = setDetune;

function setDetune()
{
    if (source)
    {
        const detune = detunePort.get() || 0;
        if (source.detune)
        {
            source.detune.setValueAtTime(
                detune,
                audioCtx.currentTime
            );
        }
    }
}

playbackRatePort.onChange = setPlaybackRate;

function setPlaybackRate()
{
    if (source)
    {
        const playbackRate = playbackRatePort.get() || 0;
        if (playbackRate >= source.playbackRate.minValue && playbackRate <= source.playbackRate.maxValue)
        {
            source.playbackRate.setValueAtTime(
                playbackRate,
                audioCtx.currentTime
            );
        }
    }
}

let resetTriggered = false;
inResetStart.onTriggered = function ()
{
    if (source)
    {
        if (playPort.get())
        {
            if (isPlaying)
            {
                stop(0);
                resetTriggered = true;
            }
            else
            {
                start(0);
            }
        }
    }
};

// functions
function createAudioBufferSource()
{
    if (source)
    {
        stop(0);
        source.disconnect(gainNode);
    }
    source = audioCtx.createBufferSource();
    const buffer = audioBufferPort.get();

    if (buffer)
    {
        source.buffer = buffer;
    }

    source.onended = onPlaybackEnded;
    source.loop = loopPort.get();

    source.connect(gainNode);

    setPlaybackRate();
    setDetune();
    audioOutPort.set(gainNode);

    if (resetTriggered)
    {
        start(0);
        resetTriggered = false;
    }
}

let timeOuting = false;
let timerId = null;

function start(time)
{
    try
    {
        if (offsetPort.get() > source.buffer.duration)
        {
            op.setUiError("offsetTooLong", "Your offset value is higher than the total time of your audio file. Please decrease the duration to be able to hear sound when playing back your buffer.", 1);
        }
        else
        {
            op.setUiError("offsetTooLong", null);
        }

        source.start(time, offsetPort.get()); // 0 = now

        isPlaying = true;
        hasEnded = false;
        outPlaying.set(true);
    }
    catch (e)
    {
        op.log("Error on start: ", e);
        outPlaying.set(false);

        isPlaying = false;
    }
}

function stop(time)
{
    try
    {
        if (isPlaying && !hasEnded)
        {
            source.stop();
        }

        isPlaying = false;
        outPlaying.set(false);
    }
    catch (e)
    {
        op.setUiError(e);
        outPlaying.set(false);
    }
}

function onPlaybackEnded()
{
    outPlaying.set(false);
    isPlaying = false;
    hasEnded = true;

    createAudioBufferSource(); // we can only play back once, so we need to create a new one
}


};

Ops.WebAudio.AudioBufferPlayer_v2.prototype = new CABLES.Op();
CABLES.OPS["3abd0dbb-eeee-4c65-ae31-b8bc2345e2d5"]={f:Ops.WebAudio.AudioBufferPlayer_v2,objName:"Ops.WebAudio.AudioBufferPlayer_v2"};




// **************************************************************
// 
// Ops.WebAudio.AnalyzerTexture_v2
// 
// **************************************************************

Ops.WebAudio.AnalyzerTexture_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={default_frag:"IN vec2 texCoord;\n\nUNI sampler2D texFFT;\nUNI float width;\n\nvoid main()\n{\n   outColor = texture(texFFT, texCoord);\n}",mirror_frag:"IN vec2 texCoord;\n\nUNI sampler2D tex;\nUNI float width;\n\nvoid main()\n{\n   vec4 col = vec4(1.0, 0.0, 0.0, 1.0);\n\n   float x = texCoord.x;\n\n   if (texCoord.x >= 0.5) x = 1.0 - texCoord.x;\n\n    x *= (1. - width) * 2.0;\n\n   col = texture(tex, vec2(x, texCoord.y));\n\n   outColor = col;\n}",};
const cgl = op.patch.cgl;

const inRefresh = op.inTrigger("Refresh");
const inFFTArray = op.inArray("FFT Array");

const inMirrorActive = op.inBool("Mirror Active", false);
const inMirrorWidth = op.inFloatSlider("Mirror Width", 0.5);

const inTextureSize = op.inSwitch("Texture Size", [64, 128, 256, 512, 1024, 2048], 512);

op.setPortGroup("Texture Options", [inTextureSize]);
op.setPortGroup("Mirror Options", [inMirrorActive, inMirrorWidth]);

const outTexture = op.outTexture("Texture Out");

let updateTextureSize = false;
inTextureSize.onChange = () =>
{
    updateTextureSize = true;
};

inMirrorActive.onChange = () =>
{
    inMirrorWidth.setUiAttribs({ "greyout": !inMirrorActive.get() });
};

const texFFT = new CGL.Texture(cgl,
    {
        "name": "AnalyzerTexture - FFT Texture " + op.id,
        "wrap": CGL.Texture.CLAMP_TO_EDGE,
        "filter": CGL.Texture.FILTER_LINEAR,
    });

const texDefault = new CGL.Texture(cgl,
    {
        "name": "AnalyzerTexture - Render Texture " + op.id,
        "wrap": CGL.Texture.CLAMP_TO_EDGE,
        "filter": CGL.Texture.FILTER_LINEAR,
        "width": Number(inTextureSize.get()),
        "height": Number(inTextureSize.get()),
    });

let data = [];

let line = 0;
let height = 256;

let buffer = new Uint8Array();

function updateFFT()
{
    const arr = inFFTArray.get();
    if (!arr) return;

    const width = arr.length;
    // height = width;
    if (!width) return;

    if (data.length === 0 || data.length !== width * 4)
    {
        data.length = width * 4;
        buffer = new Uint8Array(width * height * 4);
    }

    line++;

    if (line >= height) line = 0;

    for (let i = 0; i < width; i++)
    {
        data[i * 4 + 0] = arr[i];
        data[i * 4 + 1] = arr[i];
        data[i * 4 + 2] = arr[i];
        data[i * 4 + 3] = 255;
    }

    buffer.set(data, line * width * 4);

    if (texFFT.width != width || texFFT.height != height)
    {
        texFFT.setSize(
            width, height
        );
        // effect.setSourceTexture(texFFT);
    }

    texFFT.initFromData(
        buffer,
        width, height,
        // Number(inTextureSize.get()),
        // Number(inTextureSize.get()),
        CGL.Texture.FILTER_LINEAR,
        CGL.Texture.WRAP_CLAMP_TO_EDGE
    );
}

let effect = new CGL.TextureEffect(cgl,
    {
        // "isFloatingPointTexture": true,
        "filter": CGL.Texture.FILTER_LINEAR,
        "wrap": CGL.Texture.WRAP_CLAMP_TO_EDGE,
        "width": Number(inTextureSize.get()),
        "height": Number(inTextureSize.get()),
    }
);

let prevViewPort = [0, 0, 0, 0];

// ------------------

const shaderDefault = new CGL.Shader(cgl, "AnalyzerTexture - defaultShader");
shaderDefault.setSource(shaderDefault.getDefaultVertexShader(), attachments.default_frag);
const texUniformDefault = new CGL.Uniform(shaderDefault, "t", "texFFT", 1);

const shaderMirror = new CGL.Shader(cgl);

shaderMirror.setSource(shaderMirror.getDefaultVertexShader(), attachments.mirror_frag);

const textureUniformMirror = new CGL.Uniform(shaderMirror, "t", "tex", 0);
const uniWidthMirror = new CGL.Uniform(shaderMirror, "f", "width", inMirrorWidth);

function mirrorTexture()
{
    cgl.pushShader(shaderMirror);

    effect.startEffect();
    effect.setSourceTexture(effect.getCurrentSourceTexture());

    effect.bind();

    cgl.setTexture(0, texFFT.tex);

    effect.finish();
    effect.endEffect();

    cgl.popShader();
}

inRefresh.onTriggered = () =>
{
    if (!inFFTArray.get()) return;

    updateFFT();

    if (updateTextureSize)
    {
        texDefault.setSize(
            Number(inTextureSize.get()),
            Number(inTextureSize.get()),
        );

        effect.setSourceTexture(texDefault);
        updateTextureSize = false;
    }

    if (texFFT)
    {
        cgl.pushShader(shaderDefault);
        effect.startEffect();
        effect.setSourceTexture(texDefault);
        effect.bind();

        cgl.setTexture(1, texFFT.tex);

        effect.finish();
        effect.endEffect();

        cgl.popShader();
    }

    if (inMirrorActive.get()) mirrorTexture();

    outTexture.set(null);
    outTexture.set(effect.getCurrentSourceTexture());
};


};

Ops.WebAudio.AnalyzerTexture_v2.prototype = new CABLES.Op();
CABLES.OPS["decba955-636b-41c5-bfb8-c2506cbcabd2"]={f:Ops.WebAudio.AnalyzerTexture_v2,objName:"Ops.WebAudio.AnalyzerTexture_v2"};




// **************************************************************
// 
// Ops.WebAudio.Output_v2
// 
// **************************************************************

Ops.WebAudio.Output_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
function clamp(val, min, max)
{
    return Math.min(Math.max(val, min), max);
}

op.requirements = [CABLES.Requirements.WEBAUDIO];

let audioCtx = CABLES.WEBAUDIO.createAudioContext(op);

// vars
const gainNode = audioCtx.createGain();
const destinationNode = audioCtx.destination;

// inputs
const inAudio = op.inObject("Audio In");
const inGain = op.inFloatSlider("Volume", 1);
const inMute = op.inBool("Mute", false);

op.setPortGroup("Volume Settings", [inMute, inGain]);

let masterVolume = 1;
let oldAudioIn = null;
let connectedToOut = false;

inAudio.onChange = function ()
{
    if (!inAudio.get())
    {
        if (oldAudioIn)
        {
            try
            {
                if (oldAudioIn.disconnect)
                {
                    oldAudioIn.disconnect(gainNode);
                }
            }
            catch (e)
            {
                op.log(e);
            }
        }
        op.setUiError("audioCtx", null);
        op.setUiError("multipleInputs", null);

        if (connectedToOut)
        {
            gainNode.disconnect(destinationNode);
            connectedToOut = false;
        }
    }
    else
    {
        if (inAudio.links.length > 1) op.setUiError("multipleInputs", "You have connected multiple inputs. It is possible that you experience unexpected behaviour. Please use a Mixer op to connect multiple audio streams.", 1);
        else op.setUiError("multipleInputs", null);
        if (inAudio.val.connect)
        {
            inAudio.val.connect(gainNode);
            op.setUiError("audioCtx", null);
        }
        else op.setUiError("audioCtx", "The passed input is not an audio context. Please make sure you connect an audio context to the input.", 2);
    }
    oldAudioIn = inAudio.get();

    if (!connectedToOut)
    {
        gainNode.connect(destinationNode);
        connectedToOut = true;
    }
};

// functions
// sets the volume, multiplied by master volume
function setVolume()
{
    let volume = inGain.get() * masterVolume;
    gainNode.gain.setValueAtTime(clamp(volume, 0, 1), audioCtx.currentTime);
}

function mute(b)
{
    if (b)
    {
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    }
    else
    {
        setVolume();
    }
}

// change listeners
inMute.onChange = () =>
{
    mute(inMute.get());
};

inGain.onChange = () =>
{
    if (inMute.get())
    {
        return;
    }
    setVolume();
};

op.patch.on("pause", () =>
{
    masterVolume = 0;
    setVolume();
});

op.patch.on("resume", () =>
{
    if (op.patch.config.masterVolume !== 0) masterVolume = op.patch.config.masterVolume;
    else masterVolume = 0;
    setVolume();
});

op.onMasterVolumeChanged = (v) =>
{
    if (op.patch._paused) masterVolume = 0;
    else masterVolume = v;
    setVolume();
};


};

Ops.WebAudio.Output_v2.prototype = new CABLES.Op();
CABLES.OPS["90b95403-b0c4-4980-ab3b-b6c354771c81"]={f:Ops.WebAudio.Output_v2,objName:"Ops.WebAudio.Output_v2"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.DrawImage_v3
// 
// **************************************************************

Ops.Gl.TextureEffects.DrawImage_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={drawimage_frag:"#ifdef HAS_TEXTURES\n    IN vec2 texCoord;\n    UNI sampler2D tex;\n    UNI sampler2D image;\n#endif\n\nIN mat3 transform;\nUNI float rotate;\n\n{{CGL.BLENDMODES}}\n\n#ifdef HAS_TEXTUREALPHA\n   UNI sampler2D imageAlpha;\n#endif\n\nUNI float amount;\n\n#ifdef ASPECT_RATIO\n    UNI float aspectTex;\n    UNI float aspectPos;\n#endif\n\nvoid main()\n{\n    vec4 blendRGBA=vec4(0.0,0.0,0.0,1.0);\n    #ifdef HAS_TEXTURES\n        vec2 tc=texCoord;\n\n        #ifdef TEX_FLIP_X\n            tc.x=1.0-tc.x;\n        #endif\n        #ifdef TEX_FLIP_Y\n            tc.y=1.0-tc.y;\n        #endif\n\n        #ifdef ASPECT_RATIO\n            #ifdef ASPECT_AXIS_X\n                tc.y=(1.0-aspectPos)-(((1.0-aspectPos)-tc.y)*aspectTex);\n            #endif\n            #ifdef ASPECT_AXIS_Y\n                tc.x=(1.0-aspectPos)-(((1.0-aspectPos)-tc.x)/aspectTex);\n            #endif\n        #endif\n\n        #ifdef TEX_TRANSFORM\n            vec3 coordinates=vec3(tc.x, tc.y,1.0);\n            tc=(transform * coordinates ).xy;\n        #endif\n\n        blendRGBA=texture(image,tc);\n\n        vec3 blend=blendRGBA.rgb;\n        vec4 baseRGBA=texture(tex,texCoord);\n        vec3 base=baseRGBA.rgb;\n        vec3 colNew=_blend(base,blend);\n\n        #ifdef REMOVE_ALPHA_SRC\n            blendRGBA.a=1.0;\n        #endif\n\n        #ifdef HAS_TEXTUREALPHA\n            vec4 colImgAlpha=texture(imageAlpha,tc);\n            float colImgAlphaAlpha=colImgAlpha.a;\n\n            #ifdef ALPHA_FROM_LUMINANCE\n                vec3 gray = vec3(dot(vec3(0.2126,0.7152,0.0722), colImgAlpha.rgb ));\n                colImgAlphaAlpha=(gray.r+gray.g+gray.b)/3.0;\n            #endif\n\n            #ifdef ALPHA_FROM_INV_UMINANCE\n                vec3 gray = vec3(dot(vec3(0.2126,0.7152,0.0722), colImgAlpha.rgb ));\n                colImgAlphaAlpha=1.0-(gray.r+gray.g+gray.b)/3.0;\n            #endif\n\n            #ifdef INVERT_ALPHA\n                colImgAlphaAlpha=clamp(colImgAlphaAlpha,0.0,1.0);\n                colImgAlphaAlpha=1.0-colImgAlphaAlpha;\n            #endif\n\n            blendRGBA.a=colImgAlphaAlpha*blendRGBA.a;\n        #endif\n    #endif\n\n    float am=amount;\n\n    #ifdef CLIP_REPEAT\n        if(tc.y>1.0 || tc.y<0.0 || tc.x>1.0 || tc.x<0.0)\n        {\n            // colNew.rgb=vec3(0.0);\n            am=0.0;\n        }\n    #endif\n\n    #ifdef ASPECT_RATIO\n        #ifdef ASPECT_CROP\n            if(tc.y>1.0 || tc.y<0.0 || tc.x>1.0 || tc.x<0.0)\n            {\n                colNew.rgb=base.rgb;\n                am=0.0;\n            }\n\n        #endif\n    #endif\n\n\n\n    // blendRGBA.rgb=mix( colNew, base ,1.0-am);\n\n    // blendRGBA.a=clamp((blendRGBA.a*am),0.,1.);\n\n    blendRGBA.rgb=mix( colNew, base ,1.0-(am*blendRGBA.a));\n    blendRGBA.a=clamp(baseRGBA.a+(blendRGBA.a*am),0.,1.);\n\n\n    outColor= blendRGBA;\n\n}\n\n",drawimage_vert:"IN vec3 vPosition;\nIN vec2 attrTexCoord;\nIN vec3 attrVertNormal;\n\nUNI mat4 projMatrix;\nUNI mat4 mvMatrix;\n\nUNI float posX;\nUNI float posY;\nUNI float scaleX;\nUNI float scaleY;\nUNI float rotate;\n\nOUT vec2 texCoord;\nOUT vec3 norm;\nOUT mat3 transform;\n\nvoid main()\n{\n   texCoord=attrTexCoord;\n   norm=attrVertNormal;\n\n   #ifdef TEX_TRANSFORM\n        vec3 coordinates=vec3(attrTexCoord.x, attrTexCoord.y,1.0);\n        float angle = radians( rotate );\n        vec2 scale= vec2(scaleX,scaleY);\n        vec2 translate= vec2(posX,posY);\n\n        transform = mat3(   scale.x * cos( angle ), scale.x * sin( angle ), 0.0,\n            - scale.y * sin( angle ), scale.y * cos( angle ), 0.0,\n            - 0.5 * scale.x * cos( angle ) + 0.5 * scale.y * sin( angle ) - 0.5 * translate.x*2.0 + 0.5,  - 0.5 * scale.x * sin( angle ) - 0.5 * scale.y * cos( angle ) - 0.5 * translate.y*2.0 + 0.5, 1.0);\n   #endif\n\n   gl_Position = projMatrix * mvMatrix * vec4(vPosition,  1.0);\n}\n",};
const render = op.inTrigger("render");
const blendMode = CGL.TextureEffect.AddBlendSelect(op, "blendMode");
const amount = op.inValueSlider("amount", 1);

const image = op.inTexture("Image");
const removeAlphaSrc = op.inValueBool("removeAlphaSrc", false);

const imageAlpha = op.inTexture("Mask");
const alphaSrc = op.inValueSelect("Mask Src", ["alpha channel", "luminance", "luminance inv"], "luminance");
const invAlphaChannel = op.inValueBool("Invert alpha channel");

const inAspect = op.inValueBool("Aspect Ratio", false);
const inAspectAxis = op.inValueSelect("Stretch Axis", ["X", "Y"], "X");
const inAspectPos = op.inValueSlider("Position", 0.0);
const inAspectCrop = op.inValueBool("Crop", false);

const trigger = op.outTrigger("trigger");

blendMode.set("normal");
const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, "drawimage");

imageAlpha.onLinkChanged = updateAlphaPorts;

op.setPortGroup("Mask", [imageAlpha, alphaSrc, invAlphaChannel]);
op.setPortGroup("Aspect Ratio", [inAspect, inAspectPos, inAspectCrop, inAspectAxis]);

removeAlphaSrc.onChange = updateRemoveAlphaSrc;

function updateAlphaPorts()
{
    if (imageAlpha.isLinked())
    {
        removeAlphaSrc.setUiAttribs({ "greyout": true });
        alphaSrc.setUiAttribs({ "greyout": false });
        invAlphaChannel.setUiAttribs({ "greyout": false });
    }
    else
    {
        removeAlphaSrc.setUiAttribs({ "greyout": false });
        alphaSrc.setUiAttribs({ "greyout": true });
        invAlphaChannel.setUiAttribs({ "greyout": true });
    }
}

op.toWorkPortsNeedToBeLinked(image);

shader.setSource(attachments.drawimage_vert, attachments.drawimage_frag);
const textureUniform = new CGL.Uniform(shader, "t", "tex", 0);
const textureImaghe = new CGL.Uniform(shader, "t", "image", 1);
const textureAlpha = new CGL.Uniform(shader, "t", "imageAlpha", 2);

const uniTexAspect = new CGL.Uniform(shader, "f", "aspectTex", 1);
const uniAspectPos = new CGL.Uniform(shader, "f", "aspectPos", inAspectPos);

invAlphaChannel.onChange = function ()
{
    if (invAlphaChannel.get()) shader.define("INVERT_ALPHA");
    else shader.removeDefine("INVERT_ALPHA");
};

inAspect.onChange = updateAspectRatio;
inAspectCrop.onChange = updateAspectRatio;
inAspectAxis.onChange = updateAspectRatio;
function updateAspectRatio()
{
    shader.removeDefine("ASPECT_AXIS_X");
    shader.removeDefine("ASPECT_AXIS_Y");

    if (inAspect.get())
    {
        shader.define("ASPECT_RATIO");

        if (inAspectCrop.get()) shader.define("ASPECT_CROP");
        else shader.removeDefine("ASPECT_CROP");

        if (inAspectAxis.get() == "X") shader.define("ASPECT_AXIS_X");
        if (inAspectAxis.get() == "Y") shader.define("ASPECT_AXIS_Y");

        inAspectPos.setUiAttribs({ "greyout": false });
        inAspectCrop.setUiAttribs({ "greyout": false });
        inAspectAxis.setUiAttribs({ "greyout": false });
    }
    else
    {
        shader.removeDefine("ASPECT_RATIO");
        if (inAspectCrop.get()) shader.define("ASPECT_CROP");
        else shader.removeDefine("ASPECT_CROP");

        if (inAspectAxis.get() == "X") shader.define("ASPECT_AXIS_X");
        if (inAspectAxis.get() == "Y") shader.define("ASPECT_AXIS_Y");

        inAspectPos.setUiAttribs({ "greyout": true });
        inAspectCrop.setUiAttribs({ "greyout": true });
        inAspectAxis.setUiAttribs({ "greyout": true });
    }
}

function updateRemoveAlphaSrc()
{
    if (removeAlphaSrc.get()) shader.define("REMOVE_ALPHA_SRC");
    else shader.removeDefine("REMOVE_ALPHA_SRC");
}

alphaSrc.onChange = function ()
{
    shader.toggleDefine("ALPHA_FROM_LUMINANCE", alphaSrc.get() == "luminance");
    shader.toggleDefine("ALPHA_FROM_INV_UMINANCE", alphaSrc.get() == "luminance_inv");
};

alphaSrc.set("alpha channel");

{
    //
    // texture flip
    //
    const flipX = op.inValueBool("flip x");
    const flipY = op.inValueBool("flip y");

    flipX.onChange = function ()
    {
        if (flipX.get()) shader.define("TEX_FLIP_X");
        else shader.removeDefine("TEX_FLIP_X");
    };

    flipY.onChange = function ()
    {
        if (flipY.get()) shader.define("TEX_FLIP_Y");
        else shader.removeDefine("TEX_FLIP_Y");
    };
}

{
    //
    // texture transform
    //

    var doTransform = op.inValueBool("Transform");

    var scaleX = op.inValueSlider("Scale X", 1);
    var scaleY = op.inValueSlider("Scale Y", 1);

    var posX = op.inValue("Position X", 0);
    var posY = op.inValue("Position Y", 0);

    var rotate = op.inValue("Rotation", 0);

    const inClipRepeat = op.inValueBool("Clip Repeat", false);

    inClipRepeat.onChange = updateClip;
    function updateClip()
    {
        if (inClipRepeat.get()) shader.define("CLIP_REPEAT");
        else shader.removeDefine("CLIP_REPEAT");
    }

    const uniScaleX = new CGL.Uniform(shader, "f", "scaleX", scaleX);
    const uniScaleY = new CGL.Uniform(shader, "f", "scaleY", scaleY);

    const uniPosX = new CGL.Uniform(shader, "f", "posX", posX);
    const uniPosY = new CGL.Uniform(shader, "f", "posY", posY);
    const uniRotate = new CGL.Uniform(shader, "f", "rotate", rotate);

    doTransform.onChange = updateTransformPorts;
}

function updateTransformPorts()
{
    shader.toggleDefine("TEX_TRANSFORM", doTransform.get());
    if (doTransform.get())
    {
        // scaleX.setUiAttribs({hidePort:false});
        // scaleY.setUiAttribs({hidePort:false});
        // posX.setUiAttribs({hidePort:false});
        // posY.setUiAttribs({hidePort:false});
        // rotate.setUiAttribs({hidePort:false});

        scaleX.setUiAttribs({ "greyout": false });
        scaleY.setUiAttribs({ "greyout": false });
        posX.setUiAttribs({ "greyout": false });
        posY.setUiAttribs({ "greyout": false });
        rotate.setUiAttribs({ "greyout": false });
    }
    else
    {
        scaleX.setUiAttribs({ "greyout": true });
        scaleY.setUiAttribs({ "greyout": true });
        posX.setUiAttribs({ "greyout": true });
        posY.setUiAttribs({ "greyout": true });
        rotate.setUiAttribs({ "greyout": true });

        // scaleX.setUiAttribs({"hidePort":true});
        // scaleY.setUiAttribs({"hidePort":true});
        // posX.setUiAttribs({"hidePort":true});
        // posY.setUiAttribs({"hidePort":true});
        // rotate.setUiAttribs({"hidePort":true});
    }

    // op.refreshParams();
}

CGL.TextureEffect.setupBlending(op, shader, blendMode, amount);

const amountUniform = new CGL.Uniform(shader, "f", "amount", amount);

imageAlpha.onChange = function ()
{
    if (imageAlpha.get() && imageAlpha.get().tex)
    {
        shader.define("HAS_TEXTUREALPHA");
    }
    else
    {
        shader.removeDefine("HAS_TEXTUREALPHA");
    }
};

function doRender()
{
    if (!CGL.TextureEffect.checkOpInEffect(op)) return;

    const tex = image.get();
    if (tex && tex.tex && amount.get() > 0.0)
    {
        cgl.pushShader(shader);
        cgl.currentTextureEffect.bind();

        const imgTex = cgl.currentTextureEffect.getCurrentSourceTexture();
        cgl.setTexture(0, imgTex.tex);

        uniTexAspect.setValue(1 / (tex.height / tex.width * imgTex.width / imgTex.height));

        cgl.setTexture(1, tex.tex);
        // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, image.get().tex );

        if (imageAlpha.get() && imageAlpha.get().tex)
        {
            cgl.setTexture(2, imageAlpha.get().tex);
            // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, imageAlpha.get().tex );
        }

        // cgl.pushBlend(false);

        cgl.pushBlendMode(CGL.BLEND_NONE, true);

        cgl.currentTextureEffect.finish();
        cgl.popBlendMode();

        // cgl.popBlend();

        cgl.popShader();
    }

    trigger.trigger();
}

render.onTriggered = doRender;
updateTransformPorts();
updateRemoveAlphaSrc();
updateAlphaPorts();
updateAspectRatio();


};

Ops.Gl.TextureEffects.DrawImage_v3.prototype = new CABLES.Op();
CABLES.OPS["8f6b2f15-fcb0-4597-90c0-e5173f2969fe"]={f:Ops.Gl.TextureEffects.DrawImage_v3,objName:"Ops.Gl.TextureEffects.DrawImage_v3"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.Noise.FBMNoise
// 
// **************************************************************

Ops.Gl.TextureEffects.Noise.FBMNoise = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={fbmnoise_frag:"UNI sampler2D tex;\nUNI float anim;\n\nUNI float scale;\nUNI float repeat;\n\nUNI float scrollX;\nUNI float scrollY;\n\nUNI float amount;\n\nUNI bool layer1;\nUNI bool layer2;\nUNI bool layer3;\nUNI bool layer4;\nUNI vec3 color;\nUNI float aspect;\n\nIN vec2 texCoord;\n\n\n{{CGL.BLENDMODES}}\n\n// csdcsdcds\n// adapted from warp shader by inigo quilez/iq\n// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.\n\n// See here for a tutorial on how to make this: http://www.iquilezles.org/www/articles/warp/warp.htm\n\nconst mat2 m = mat2( 0.80,  0.60, -0.60,  0.80 );\n\nfloat noise( in vec2 x )\n{\n\treturn sin(1.5*x.x)*sin(1.5*x.y);\n}\n\nfloat fbm4( vec2 p )\n{\n    float f = 0.0;\n    f += 0.5000*noise( p ); p = m*p*2.02;\n    f += 0.2500*noise( p ); p = m*p*2.03;\n    f += 0.1250*noise( p ); p = m*p*2.01;\n    f += 0.0625*noise( p );\n    return f/0.9375;\n}\n\nfloat fbm6( vec2 p )\n{\n    float f = 0.0;\n    f += 0.500000*(0.5+0.5*noise( p )); p = m*p*2.02;\n    f += 0.250000*(0.5+0.5*noise( p )); p = m*p*2.03;\n    f += 0.125000*(0.5+0.5*noise( p )); p = m*p*2.01;\n    f += 0.062500*(0.5+0.5*noise( p )); p = m*p*2.04;\n    f += 0.031250*(0.5+0.5*noise( p )); p = m*p*2.01;\n    f += 0.015625*(0.5+0.5*noise( p ));\n    return f/0.96875;\n}\n\nvoid main()\n{\n    // vec4 col=texture(tex,texCoord+2.0*fbm4(texCoord+2.0*fbm6(texCoord+anim)));\n\n    vec2 tc=texCoord;\n\t#ifdef DO_TILEABLE\n\t    tc=abs(texCoord-0.5);\n\t#endif\n\n\n    vec2 p=(tc-0.5)*scale;\n\n\n    p.y/=aspect;\n    vec2 q = vec2( fbm4( p + vec2(0.3+scrollX,0.20+scrollY) ),\n                   fbm4( p + vec2(3.1+scrollX,1.3+scrollY) ) );\n\n    vec2 q2 = vec2( fbm4( p + vec2(2.0+scrollX,1.0+scrollY) ),\n                   fbm4( p + vec2(3.1+scrollX,1.3+scrollY) ) );\n\n    vec2 q3 = vec2( fbm4( p + vec2(9.0+scrollX,4.0+scrollY) ),\n                   fbm4( p + vec2(3.1+scrollX,4.3+scrollY) ) );\n\n\n\n    float v= fbm4( ( p + 4.0*q +anim*0.1)*repeat);\n    float v2= fbm4( (p + 4.0*q2 +anim*0.1)*repeat );\n\n    float v3= fbm6( (p + 4.0*q3 +anim*0.1)*repeat );\n    float v4= fbm6( (p + 4.0*q2 +anim*0.1)*repeat );\n\n\n\n\n    vec4 base=texture(tex,texCoord);\n\n    vec4 finalColor;\n    float colVal=0.0;\n    float numLayers=0.0;\n\n    if(layer1)\n    {\n        colVal+=v;\n        numLayers++;\n    }\n\n    if(layer2)\n    {\n        colVal+=v2;\n        numLayers++;\n    }\n\n    if(layer3)\n    {\n        colVal+=v3;\n        numLayers++;\n    }\n\n    if(layer4)\n    {\n        colVal+=v4;\n        numLayers++;\n    }\n\n    finalColor=vec4( color*vec3(colVal/numLayers),1.0);\n\n\n    outColor = cgl_blend(base,finalColor,amount);;\n\n}\n",};
const
    render = op.inTrigger("render"),
    blendMode = CGL.TextureEffect.AddBlendSelect(op, "Blend Mode", "normal"),
    amount = op.inValueSlider("Amount", 1),
    r = op.inValueSlider("r", 1.0),
    g = op.inValueSlider("g", 1.0),
    b = op.inValueSlider("b", 1.0),
    trigger = op.outTrigger("trigger");

r.setUiAttribs({ "colorPick": true });

const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl);

shader.setSource(shader.getDefaultVertexShader(), attachments.fbmnoise_frag);
const textureUniform = new CGL.Uniform(shader, "t", "tex", 0);

const uniScale = new CGL.Uniform(shader, "f", "scale", op.inValue("scale", 2));
const uniAnim = new CGL.Uniform(shader, "f", "anim", op.inValue("anim", 0));
const uniScrollX = new CGL.Uniform(shader, "f", "scrollX", op.inValue("scrollX", 9));
const uniScrollY = new CGL.Uniform(shader, "f", "scrollY", op.inValue("scrollY", 0));
const uniRepeat = new CGL.Uniform(shader, "f", "repeat", op.inValue("repeat", 1));
const uniAspect = new CGL.Uniform(shader, "f", "aspect", op.inValue("aspect", 1));

const uniLayer1 = new CGL.Uniform(shader, "b", "layer1", op.inValueBool("Layer 1", true));
const uniLayer2 = new CGL.Uniform(shader, "b", "layer2", op.inValueBool("Layer 2", true));
const uniLayer3 = new CGL.Uniform(shader, "b", "layer3", op.inValueBool("Layer 3", true));
const uniLayer4 = new CGL.Uniform(shader, "b", "layer4", op.inValueBool("Layer 4", true));

const uniColor = new CGL.Uniform(shader, "3f", "color", r, g, b);

const amountUniform = new CGL.Uniform(shader, "f", "amount", amount);

const tile = op.inValueBool("Tileable", false);
tile.onChange = updateTileable;
function updateTileable()
{
    if (tile.get())shader.define("DO_TILEABLE");
    else shader.removeDefine("DO_TILEABLE");
}

CGL.TextureEffect.setupBlending(op, shader, blendMode, amount);

render.onTriggered = function ()
{
    if (!CGL.TextureEffect.checkOpInEffect(op)) return;

    cgl.pushShader(shader);
    cgl.currentTextureEffect.bind();

    uniAspect.set(cgl.currentTextureEffect.getCurrentSourceTexture().width / cgl.currentTextureEffect.getCurrentSourceTexture().height);

    cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);

    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();
};


};

Ops.Gl.TextureEffects.Noise.FBMNoise.prototype = new CABLES.Op();
CABLES.OPS["7073186c-b776-48c2-a01e-041df88ad88a"]={f:Ops.Gl.TextureEffects.Noise.FBMNoise,objName:"Ops.Gl.TextureEffects.Noise.FBMNoise"};




// **************************************************************
// 
// Ops.Anim.Timer_v2
// 
// **************************************************************

Ops.Anim.Timer_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    inSpeed = op.inValue("Speed", 1),
    playPause = op.inValueBool("Play", true),
    reset = op.inTriggerButton("Reset"),
    inSyncTimeline = op.inValueBool("Sync to timeline", false),
    outTime = op.outValue("Time");

op.setPortGroup("Controls", [playPause, reset, inSpeed]);

const timer = new CABLES.Timer();
let lastTime = null;
let time = 0;
let syncTimeline = false;

playPause.onChange = setState;
setState();

function setState()
{
    if (playPause.get())
    {
        timer.play();
        op.patch.addOnAnimFrame(op);
    }
    else
    {
        timer.pause();
        op.patch.removeOnAnimFrame(op);
    }
}

reset.onTriggered = doReset;

function doReset()
{
    time = 0;
    lastTime = null;
    timer.setTime(0);
    outTime.set(0);
}

inSyncTimeline.onChange = function ()
{
    syncTimeline = inSyncTimeline.get();
    playPause.setUiAttribs({ "greyout": syncTimeline });
    reset.setUiAttribs({ "greyout": syncTimeline });
};

op.onAnimFrame = function (tt)
{
    if (timer.isPlaying())
    {
        if (CABLES.overwriteTime !== undefined)
        {
            console.log("overwritten time!", CABLES.overwriteTime);
            outTime.set(CABLES.overwriteTime * inSpeed.get());
        }
        else

        if (syncTimeline)
        {
            outTime.set(tt * inSpeed.get());
        }
        else
        {
            timer.update();
            const timerVal = timer.get();

            if (lastTime === null)
            {
                lastTime = timerVal;
                return;
            }

            const t = Math.abs(timerVal - lastTime);
            lastTime = timerVal;

            time += t * inSpeed.get();
            if (time != time)time = 0;
            outTime.set(time);
        }
    }
};


};

Ops.Anim.Timer_v2.prototype = new CABLES.Op();
CABLES.OPS["aac7f721-208f-411a-adb3-79adae2e471a"]={f:Ops.Anim.Timer_v2,objName:"Ops.Anim.Timer_v2"};




// **************************************************************
// 
// Ops.Math.Multiply
// 
// **************************************************************

Ops.Math.Multiply = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const number1 = op.inValueFloat("number1", 1);
const number2 = op.inValueFloat("number2", 2);
const result = op.outValue("result");

number1.onChange = number2.onChange = update;
update();

function update()
{
    const n1 = number1.get();
    const n2 = number2.get();

    result.set(n1 * n2);
}


};

Ops.Math.Multiply.prototype = new CABLES.Op();
CABLES.OPS["1bbdae06-fbb2-489b-9bcc-36c9d65bd441"]={f:Ops.Math.Multiply,objName:"Ops.Math.Multiply"};




// **************************************************************
// 
// Ops.Gl.Render2Texture
// 
// **************************************************************

Ops.Gl.Render2Texture = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const cgl = op.patch.cgl;

const
    render = op.inTrigger("render"),
    useVPSize = op.inValueBool("use viewport size", true),
    width = op.inValueInt("texture width", 512),
    height = op.inValueInt("texture height", 512),
    aspect = op.inBool("Auto Aspect", false),
    tfilter = op.inSwitch("filter", ["nearest", "linear", "mipmap"], "linear"),
    twrap = op.inSwitch("Wrap", ["Clamp", "Repeat", "Mirror"], "Repeat"),
    msaa = op.inSwitch("MSAA", ["none", "2x", "4x", "8x"], "none"),
    trigger = op.outTrigger("trigger"),
    tex = op.outTexture("texture"),
    texDepth = op.outTexture("textureDepth"),
    fpTexture = op.inValueBool("HDR"),
    depth = op.inValueBool("Depth", true),
    clear = op.inValueBool("Clear", true);

let fb = null;
let reInitFb = true;
tex.set(CGL.Texture.getEmptyTexture(cgl));

op.setPortGroup("Size", [useVPSize, width, height, aspect]);

// todo why does it only work when we render a mesh before>?>?????
// only happens with matcap material with normal map....

useVPSize.onChange = updateVpSize;

function updateVpSize()
{
    width.setUiAttribs({ "greyout": useVPSize.get() });
    height.setUiAttribs({ "greyout": useVPSize.get() });
    aspect.setUiAttribs({ "greyout": useVPSize.get() });
}

function initFbLater()
{
    reInitFb = true;
}

fpTexture.onChange =
    depth.onChange =
clear.onChange =
    tfilter.onChange =
twrap.onChange =
    msaa.onChange = initFbLater;

function doRender()
{
    if (!fb || reInitFb)
    {
        if (fb) fb.delete();

        let selectedWrap = CGL.Texture.WRAP_REPEAT;
        if (twrap.get() == "Clamp") selectedWrap = CGL.Texture.WRAP_CLAMP_TO_EDGE;
        else if (twrap.get() == "Mirror") selectedWrap = CGL.Texture.WRAP_MIRRORED_REPEAT;

        if (fpTexture.get() && tfilter.get() == "mipmap") op.setUiError("fpmipmap", "Don't use mipmap and HDR at the same time, many systems do not support this.");
        else op.setUiError("fpmipmap", null);

        if (cgl.glVersion >= 2)
        {
            let ms = true;
            let msSamples = 4;

            if (msaa.get() == "none")
            {
                msSamples = 0;
                ms = false;
            }
            if (msaa.get() == "2x") msSamples = 2;
            if (msaa.get() == "4x") msSamples = 4;
            if (msaa.get() == "8x") msSamples = 8;

            fb = new CGL.Framebuffer2(cgl, 8, 8,
                {
                    "name": "render2texture " + op.id,
                    "isFloatingPointTexture": fpTexture.get(),
                    "multisampling": ms,
                    "wrap": selectedWrap,
                    "depth": depth.get(),
                    "multisamplingSamples": msSamples,
                    "clear": clear.get()
                });
        }
        else
        {
            fb = new CGL.Framebuffer(cgl, 8, 8, { "isFloatingPointTexture": fpTexture.get() });
        }

        if (tfilter.get() == "nearest") fb.setFilter(CGL.Texture.FILTER_NEAREST);
        else if (tfilter.get() == "linear") fb.setFilter(CGL.Texture.FILTER_LINEAR);
        else if (tfilter.get() == "mipmap") fb.setFilter(CGL.Texture.FILTER_MIPMAP);

        texDepth.set(fb.getTextureDepth());
        reInitFb = false;
    }

    if (useVPSize.val)
    {
        width.set(cgl.getViewPort()[2]);
        height.set(cgl.getViewPort()[3]);
    }

    if (fb.getWidth() != Math.ceil(width.get()) || fb.getHeight() != Math.ceil(height.get()))
    {
        fb.setSize(
            Math.max(1, Math.ceil(width.get())),
            Math.max(1, Math.ceil(height.get())));
    }

    fb.renderStart(cgl);

    if (aspect.get()) mat4.perspective(cgl.pMatrix, 45, width.get() / height.get(), 0.1, 1000.0);

    trigger.trigger();
    fb.renderEnd(cgl);

    cgl.resetViewPort();

    tex.set(CGL.Texture.getEmptyTexture(op.patch.cgl));

    tex.set(fb.getTextureColor());
}

render.onTriggered = doRender;
op.preRender = doRender;

updateVpSize();


};

Ops.Gl.Render2Texture.prototype = new CABLES.Op();
CABLES.OPS["d01fa820-396c-4cb5-9d78-6b14762852af"]={f:Ops.Gl.Render2Texture,objName:"Ops.Gl.Render2Texture"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.ChromaticAberration
// 
// **************************************************************

Ops.Gl.TextureEffects.ChromaticAberration = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={chromatic_frag:"\nIN vec2 texCoord;\nUNI sampler2D tex;\nUNI float pixel;\nUNI float onePixel;\nUNI float amount;\nUNI float lensDistort;\n\n#ifdef MASK\nUNI sampler2D texMask;\n#endif\n\n{{CGL.BLENDMODES}}\n\nvoid main()\n{\n   vec4 base=texture(tex,texCoord);\n   vec4 col=texture(tex,texCoord);\n\n   vec2 tc=texCoord;;\n   float pix = pixel;\n   if(lensDistort>0.0)\n   {\n       float dist = distance(texCoord, vec2(0.5,0.5));\n       tc-=0.5;\n       tc *=smoothstep(-0.9,1.0*lensDistort,1.0-dist);\n       tc+=0.5;\n   }\n\n    #ifdef MASK\n        vec4 m=texture(texMask,texCoord);\n        pix*=m.r*m.a;\n    #endif\n\n    #ifdef SMOOTH\n    #ifdef WEBGL2\n        float numSamples=round(pix/onePixel/4.0+1.0);\n        col.r=0.0;\n        col.b=0.0;\n\n        for(float off=0.0;off<numSamples;off++)\n        {\n            float diff=(pix/numSamples)*off;\n            col.r+=texture(tex,vec2(tc.x+diff,tc.y)).r/numSamples;\n            col.b+=texture(tex,vec2(tc.x-diff,tc.y)).b/numSamples;\n        }\n    #endif\n    #endif\n\n    #ifndef SMOOTH\n        col.r=texture(tex,vec2(tc.x+pix,tc.y)).r;\n        col.b=texture(tex,vec2(tc.x-pix,tc.y)).b;\n    #endif\n\n//   outColor = col;\n   outColor= cgl_blend(base,col,amount);\n\n}\n",};
const
    render=op.inTrigger('render'),
    blendMode=CGL.TextureEffect.AddBlendSelect(op,"Blend Mode","normal"),
    amount=op.inValueSlider("Amount",1),
    pixel=op.inValue("Pixel",5),
    lensDistort=op.inValueSlider("Lens Distort",0),
    doSmooth=op.inValueBool("Smooth",false),
    textureMask=op.inTexture("Mask"),
    trigger=op.outTrigger('trigger');

const cgl=op.patch.cgl;
const shader=new CGL.Shader(cgl,"chromatic");

CGL.TextureEffect.setupBlending(op,shader,blendMode,amount);

shader.setSource(shader.getDefaultVertexShader(),attachments.chromatic_frag);
const textureUniform=new CGL.Uniform(shader,'t','tex',0),
    uniPixel=new CGL.Uniform(shader,'f','pixel',0),
    uniOnePixel=new CGL.Uniform(shader,'f','onePixel',0),
    unitexMask=new CGL.Uniform(shader,'t','texMask',1),
    uniAmount=new CGL.Uniform(shader,'f','amount',amount),
    unilensDistort=new CGL.Uniform(shader,'f','lensDistort',lensDistort);

doSmooth.onChange=function()
{
    if(doSmooth.get())shader.define("SMOOTH");
    else shader.removeDefine("SMOOTH");
};

textureMask.onChange=function()
{
    if(textureMask.get())shader.define("MASK");
    else shader.removeDefine("MASK");
};

render.onTriggered=function()
{
    if(!CGL.TextureEffect.checkOpInEffect(op)) return;

    var texture=cgl.currentTextureEffect.getCurrentSourceTexture();

    uniPixel.setValue(pixel.get()*(1/texture.width));
    uniOnePixel.setValue(1/texture.width);

    cgl.pushShader(shader);
    cgl.currentTextureEffect.bind();

    cgl.setTexture(0, texture.tex );

    if(textureMask.get()) cgl.setTexture(1, textureMask.get().tex );

    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();
};


};

Ops.Gl.TextureEffects.ChromaticAberration.prototype = new CABLES.Op();
CABLES.OPS["38ac43a1-1757-48f4-9450-29f07ac0d376"]={f:Ops.Gl.TextureEffects.ChromaticAberration,objName:"Ops.Gl.TextureEffects.ChromaticAberration"};




// **************************************************************
// 
// Ops.Math.Cosine
// 
// **************************************************************

Ops.Math.Cosine = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
// input
var value = op.inValue('Value');

var phase = op.inValue('Phase', 0.0);
var mul = op.inValue('Frequency', 1.0);
var amplitude = op.inValue('Amplitude', 1.0);
var invert = op.inValueBool("asine", false);

// output
var result = op.outValue('Result');

var calculate = Math.cos;

value.onChange=function()
{
    result.set(
        amplitude.get() * calculate( ( value.get()*mul.get() ) + phase.get() )
    );
};

invert.onChange = function()
{
    if(invert.get()) calculate = Math.acos;
    else calculate = Math.cos;
}


};

Ops.Math.Cosine.prototype = new CABLES.Op();
CABLES.OPS["b51166c4-e0a8-441a-b724-1531effdc52f"]={f:Ops.Math.Cosine,objName:"Ops.Math.Cosine"};




// **************************************************************
// 
// Ops.Gl.Meshes.FullscreenRectangle
// 
// **************************************************************

Ops.Gl.Meshes.FullscreenRectangle = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={shader_frag:"UNI sampler2D tex;\nIN vec2 texCoord;\n\nvoid main()\n{\n   outColor= texture(tex,vec2(texCoord.x,(1.0-texCoord.y)));\n}\n",shader_vert:"{{MODULES_HEAD}}\n\nIN vec3 vPosition;\nUNI mat4 projMatrix;\nUNI mat4 mvMatrix;\n\nOUT vec2 texCoord;\nIN vec2 attrTexCoord;\n\nvoid main()\n{\n   vec4 pos=vec4(vPosition,  1.0);\n\n   texCoord=attrTexCoord;\n\n   gl_Position = projMatrix * mvMatrix * pos;\n}\n",};
const
    render=op.inTrigger('render'),
    centerInCanvas=op.inValueBool("Center in Canvas"),
    flipY=op.inValueBool("Flip Y"),
    flipX=op.inValueBool("Flip X"),
    inTexture=op.inTexture("Texture"),
    trigger=op.outTrigger('trigger');

const cgl=op.patch.cgl;
var mesh=null;
var geom=new CGL.Geometry("fullscreen rectangle");
var x=0,y=0,z=0,w=0,h=0;

centerInCanvas.onChange=rebuild;
    flipX.onChange=rebuildFlip;
    flipY.onChange=rebuildFlip;

const shader=new CGL.Shader(cgl,'fullscreenrectangle');
shader.setModules(['MODULE_VERTEX_POSITION','MODULE_COLOR','MODULE_BEGIN_FRAG']);

shader.setSource(attachments.shader_vert,attachments.shader_frag);
shader.fullscreenRectUniform=new CGL.Uniform(shader,'t','tex',0);

var useShader=false;
var updateShaderLater=true;
render.onTriggered=doRender;

op.toWorkPortsNeedToBeLinked(render);

inTexture.onChange=function()
{
    updateShaderLater=true;
};

function updateShader()
{
    var tex=inTexture.get();
    if(tex) useShader=true;
        else useShader=false;
}

op.preRender=function()
{
    updateShader();
    // if(useShader)
    {
        shader.bind();
        if(mesh)mesh.render(shader);
        doRender();
    }
};

function doRender()
{
    if( cgl.getViewPort()[2]!=w || cgl.getViewPort()[3]!=h ||!mesh ) rebuild();

    if(updateShaderLater) updateShader();

    cgl.pushPMatrix();
    mat4.identity(cgl.pMatrix);
    mat4.ortho(cgl.pMatrix, 0, w,h, 0, -10.0, 1000);

    cgl.pushModelMatrix();
    mat4.identity(cgl.mMatrix);

    cgl.pushViewMatrix();
    mat4.identity(cgl.vMatrix);

    if(centerInCanvas.get())
    {
        var x=0;
        var y=0;
        if(w<cgl.canvasWidth) x=(cgl.canvasWidth-w)/2;
        if(h<cgl.canvasHeight) y=(cgl.canvasHeight-h)/2;

        cgl.setViewPort(x,y,w,h);
    }

    if(useShader)
    {
        if(inTexture.get())
        {
            cgl.setTexture(0,inTexture.get().tex);
            // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, inTexture.get().tex);
        }

        mesh.render(shader);
    }
    else
    {
        mesh.render(cgl.getShader());
    }

    cgl.gl.clear(cgl.gl.DEPTH_BUFFER_BIT);

    cgl.popPMatrix();
    cgl.popModelMatrix();
    cgl.popViewMatrix();

    trigger.trigger();
}

function rebuildFlip()
{
    mesh=null;
}


function rebuild()
{
    const currentViewPort=cgl.getViewPort();

    if(currentViewPort[2]==w && currentViewPort[3]==h && mesh)return;

    var xx=0,xy=0;

    w=currentViewPort[2];
    h=currentViewPort[3];

    geom.vertices = new Float32Array([
         xx+w, xy+h,  0.0,
         xx,   xy+h,  0.0,
         xx+w, xy,    0.0,
         xx,   xy,    0.0
    ]);

    var tc=null;

    if(flipY.get())
        tc=new Float32Array([
            1.0, 0.0,
            0.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ]);
    else
        tc=new Float32Array([
            1.0, 1.0,
            0.0, 1.0,
            1.0, 0.0,
            0.0, 0.0
        ]);

    if(flipX.get())
    {
        tc[0]=0.0;
        tc[2]=1.0;
        tc[4]=0.0;
        tc[6]=1.0;
    }

    geom.setTexCoords(tc);

    geom.verticesIndices = new Float32Array([
        2, 1, 0,
        3, 1, 2
    ]);


    geom.vertexNormals=new Float32Array([
        0,0,1,
        0,0,1,
        0,0,1,
        0,0,1,
        ]);
    geom.tangents=new Float32Array([
        -1,0,0,
        -1,0,0,
        -1,0,0,
        -1,0,0]);
    geom.biTangents==new Float32Array([
        0,-1,0,
        0,-1,0,
        0,-1,0,
        0,-1,0]);

                // norms.push(0,0,1);
                // tangents.push(-1,0,0);
                // biTangents.push(0,-1,0);


    if(!mesh) mesh=new CGL.Mesh(cgl,geom);
        else mesh.setGeom(geom);
}


};

Ops.Gl.Meshes.FullscreenRectangle.prototype = new CABLES.Op();
CABLES.OPS["255bd15b-cc91-4a12-9b4e-53c710cbb282"]={f:Ops.Gl.Meshes.FullscreenRectangle,objName:"Ops.Gl.Meshes.FullscreenRectangle"};




// **************************************************************
// 
// Ops.Gl.Shader.BasicMaterial_v3
// 
// **************************************************************

Ops.Gl.Shader.BasicMaterial_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={basicmaterial_frag:"{{MODULES_HEAD}}\n\nIN vec2 texCoord;\n\n#ifdef HAS_TEXTURES\n    IN vec2 texCoordOrig;\n    #ifdef HAS_TEXTURE_DIFFUSE\n        UNI sampler2D tex;\n    #endif\n    #ifdef HAS_TEXTURE_OPACITY\n        UNI sampler2D texOpacity;\n   #endif\n#endif\n\nvoid main()\n{\n    {{MODULE_BEGIN_FRAG}}\n    vec4 col=color;\n\n    #ifdef HAS_TEXTURES\n        vec2 uv=texCoord;\n\n        #ifdef CROP_TEXCOORDS\n            if(uv.x<0.0 || uv.x>1.0 || uv.y<0.0 || uv.y>1.0) discard;\n        #endif\n\n        #ifdef HAS_TEXTURE_DIFFUSE\n            col=texture(tex,uv);\n\n            #ifdef COLORIZE_TEXTURE\n                col.r*=color.r;\n                col.g*=color.g;\n                col.b*=color.b;\n            #endif\n        #endif\n        col.a*=color.a;\n        #ifdef HAS_TEXTURE_OPACITY\n            #ifdef TRANSFORMALPHATEXCOORDS\n                uv=texCoordOrig;\n            #endif\n            #ifdef ALPHA_MASK_ALPHA\n                col.a*=texture(texOpacity,uv).a;\n            #endif\n            #ifdef ALPHA_MASK_LUMI\n                col.a*=dot(vec3(0.2126,0.7152,0.0722), texture(texOpacity,uv).rgb);\n            #endif\n            #ifdef ALPHA_MASK_R\n                col.a*=texture(texOpacity,uv).r;\n            #endif\n            #ifdef ALPHA_MASK_G\n                col.a*=texture(texOpacity,uv).g;\n            #endif\n            #ifdef ALPHA_MASK_B\n                col.a*=texture(texOpacity,uv).b;\n            #endif\n            // #endif\n        #endif\n    #endif\n\n    {{MODULE_COLOR}}\n\n    #ifdef DISCARDTRANS\n        if(col.a<0.2) discard;\n    #endif\n\n    outColor = col;\n}\n",basicmaterial_vert:"IN vec3 vPosition;\nIN vec2 attrTexCoord;\nIN vec3 attrVertNormal;\nIN float attrVertIndex;\n\n{{MODULES_HEAD}}\n\nOUT vec3 norm;\nOUT vec2 texCoord;\nOUT vec2 texCoordOrig;\n\nUNI mat4 projMatrix;\nUNI mat4 modelMatrix;\nUNI mat4 viewMatrix;\n\n#ifdef HAS_TEXTURES\n    UNI float diffuseRepeatX;\n    UNI float diffuseRepeatY;\n    UNI float texOffsetX;\n    UNI float texOffsetY;\n#endif\n\nvoid main()\n{\n    mat4 mMatrix=modelMatrix;\n    mat4 mvMatrix;\n\n    norm=attrVertNormal;\n    texCoordOrig=attrTexCoord;\n    texCoord=attrTexCoord;\n    #ifdef HAS_TEXTURES\n        texCoord.x=texCoord.x*diffuseRepeatX+texOffsetX;\n        texCoord.y=(1.0-texCoord.y)*diffuseRepeatY+texOffsetY;\n    #endif\n\n    vec4 pos = vec4(vPosition, 1.0);\n\n    #ifdef BILLBOARD\n       vec3 position=vPosition;\n       mvMatrix=viewMatrix*modelMatrix;\n\n       gl_Position = projMatrix * mvMatrix * vec4((\n           position.x * vec3(\n               mvMatrix[0][0],\n               mvMatrix[1][0],\n               mvMatrix[2][0] ) +\n           position.y * vec3(\n               mvMatrix[0][1],\n               mvMatrix[1][1],\n               mvMatrix[2][1]) ), 1.0);\n    #endif\n\n    {{MODULE_VERTEX_POSITION}}\n\n    #ifndef BILLBOARD\n        mvMatrix=viewMatrix * mMatrix;\n    #endif\n\n\n    #ifndef BILLBOARD\n        // gl_Position = projMatrix * viewMatrix * modelMatrix * pos;\n        gl_Position = projMatrix * mvMatrix * pos;\n    #endif\n}\n",};
const render = op.inTrigger("render");

const trigger = op.outTrigger("trigger");
const shaderOut = op.outObject("shader", null, "shader");

shaderOut.ignoreValueSerialize = true;

op.toWorkPortsNeedToBeLinked(render);

const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, "basicmaterialnew");
shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG"]);
shader.setSource(attachments.basicmaterial_vert, attachments.basicmaterial_frag);
shaderOut.set(shader);

render.onTriggered = doRender;

// rgba colors
const r = op.inValueSlider("r", Math.random());
const g = op.inValueSlider("g", Math.random());
const b = op.inValueSlider("b", Math.random());
const a = op.inValueSlider("a", 1);
r.setUiAttribs({ "colorPick": true });

// const uniColor=new CGL.Uniform(shader,'4f','color',r,g,b,a);
shader.addUniformFrag("4f", "color", r, g, b, a);

// diffuse outTexture

const diffuseTexture = op.inTexture("texture");
let diffuseTextureUniform = null;
diffuseTexture.onChange = updateDiffuseTexture;

const colorizeTexture = op.inValueBool("colorizeTexture", false);

// opacity texture
const textureOpacity = op.inTexture("textureOpacity");
let textureOpacityUniform = null;

const alphaMaskSource = op.inSwitch("Alpha Mask Source", ["Luminance", "R", "G", "B", "A"], "Luminance");
alphaMaskSource.setUiAttribs({ "greyout": true });
textureOpacity.onChange = updateOpacity;

const texCoordAlpha = op.inValueBool("Opacity TexCoords Transform", false);
const discardTransPxl = op.inValueBool("Discard Transparent Pixels");

// texture coords

const
    diffuseRepeatX = op.inValue("diffuseRepeatX", 1),
    diffuseRepeatY = op.inValue("diffuseRepeatY", 1),
    diffuseOffsetX = op.inValue("Tex Offset X", 0),
    diffuseOffsetY = op.inValue("Tex Offset Y", 0),
    cropRepeat = op.inBool("Crop TexCoords", false);

shader.addUniformFrag("f", "diffuseRepeatX", diffuseRepeatX);
shader.addUniformFrag("f", "diffuseRepeatY", diffuseRepeatY);
shader.addUniformFrag("f", "texOffsetX", diffuseOffsetX);
shader.addUniformFrag("f", "texOffsetY", diffuseOffsetY);

const doBillboard = op.inValueBool("billboard", false);

alphaMaskSource.onChange =
    doBillboard.onChange =
    discardTransPxl.onChange =
    texCoordAlpha.onChange =
    cropRepeat.onChange =
    colorizeTexture.onChange = updateDefines;

op.setPortGroup("Color", [r, g, b, a]);
op.setPortGroup("Color Texture", [diffuseTexture, colorizeTexture]);
op.setPortGroup("Opacity", [textureOpacity, alphaMaskSource, discardTransPxl, texCoordAlpha]);
op.setPortGroup("Texture Transform", [diffuseRepeatX, diffuseRepeatY, diffuseOffsetX, diffuseOffsetY, cropRepeat]);

updateOpacity();
updateDiffuseTexture();

op.preRender = function ()
{
    shader.bind();
    doRender();
};

function doRender()
{
    if (!shader) return;

    cgl.pushShader(shader);
    shader.popTextures();

    if (diffuseTextureUniform && diffuseTexture.get()) shader.pushTexture(diffuseTextureUniform, diffuseTexture.get().tex);
    if (textureOpacityUniform && textureOpacity.get()) shader.pushTexture(textureOpacityUniform, textureOpacity.get().tex);

    trigger.trigger();

    cgl.popShader();
}

function updateOpacity()
{
    if (textureOpacity.get())
    {
        if (textureOpacityUniform !== null) return;
        shader.removeUniform("texOpacity");
        shader.define("HAS_TEXTURE_OPACITY");
        if (!textureOpacityUniform)textureOpacityUniform = new CGL.Uniform(shader, "t", "texOpacity");

        alphaMaskSource.setUiAttribs({ "greyout": false });
        texCoordAlpha.setUiAttribs({ "greyout": false });
    }
    else
    {
        shader.removeUniform("texOpacity");
        shader.removeDefine("HAS_TEXTURE_OPACITY");
        textureOpacityUniform = null;

        alphaMaskSource.setUiAttribs({ "greyout": true });
        texCoordAlpha.setUiAttribs({ "greyout": true });
    }

    updateDefines();
}

function updateDiffuseTexture()
{
    if (diffuseTexture.get())
    {
        if (!shader.hasDefine("HAS_TEXTURE_DIFFUSE"))shader.define("HAS_TEXTURE_DIFFUSE");
        if (!diffuseTextureUniform)diffuseTextureUniform = new CGL.Uniform(shader, "t", "texDiffuse");

        diffuseRepeatX.setUiAttribs({ "greyout": false });
        diffuseRepeatY.setUiAttribs({ "greyout": false });
        diffuseOffsetX.setUiAttribs({ "greyout": false });
        diffuseOffsetY.setUiAttribs({ "greyout": false });
        colorizeTexture.setUiAttribs({ "greyout": false });
    }
    else
    {
        shader.removeUniform("texDiffuse");
        shader.removeDefine("HAS_TEXTURE_DIFFUSE");
        diffuseTextureUniform = null;

        diffuseRepeatX.setUiAttribs({ "greyout": true });
        diffuseRepeatY.setUiAttribs({ "greyout": true });
        diffuseOffsetX.setUiAttribs({ "greyout": true });
        diffuseOffsetY.setUiAttribs({ "greyout": true });
        colorizeTexture.setUiAttribs({ "greyout": true });
    }
}

function updateDefines()
{
    shader.toggleDefine("CROP_TEXCOORDS", cropRepeat.get());
    shader.toggleDefine("COLORIZE_TEXTURE", colorizeTexture.get());
    shader.toggleDefine("TRANSFORMALPHATEXCOORDS", texCoordAlpha.get());
    shader.toggleDefine("DISCARDTRANS", discardTransPxl.get());
    shader.toggleDefine("BILLBOARD", doBillboard.get());

    shader.toggleDefine("ALPHA_MASK_ALPHA", alphaMaskSource.get() == "A");
    shader.toggleDefine("ALPHA_MASK_LUMI", alphaMaskSource.get() == "Luminance");
    shader.toggleDefine("ALPHA_MASK_R", alphaMaskSource.get() == "R");
    shader.toggleDefine("ALPHA_MASK_G", alphaMaskSource.get() == "G");
    shader.toggleDefine("ALPHA_MASK_B", alphaMaskSource.get() == "B");
}


};

Ops.Gl.Shader.BasicMaterial_v3.prototype = new CABLES.Op();
CABLES.OPS["ec55d252-3843-41b1-b731-0482dbd9e72b"]={f:Ops.Gl.Shader.BasicMaterial_v3,objName:"Ops.Gl.Shader.BasicMaterial_v3"};




// **************************************************************
// 
// Ops.Patch.PlayButton
// 
// **************************************************************

Ops.Patch.PlayButton = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={inner_css:"\nborder-style:solid;\nborder-color:transparent transparent transparent #ccc;\nbox-sizing:border-box;\nwidth:50px;\nheight:50px;\nmargin-top:25px;\nmargin-left:36px;\nborder-width:25px 0px 25px 40px;\npointer-events:none;\n",outer_css:"width:100px;\nheight:100px;\nleft:50%;\ntop:50%;\nborder-radius:100%;\nposition:absolute;\ncursor:pointer;\nopacity:0.7;\ntransform:translate(-50%,-50%);\nz-index:999999;\nbackground-color:#333;\nborder:5px solid #333;",};
const
    inExec = op.inTrigger("Trigger"),
    inIfSuspended = op.inValueBool("Only if Audio Suspended"),
    inReset = op.inTriggerButton("Reset"),
    inStyleOuter = op.inStringEditor("Style Outer", attachments.outer_css),
    inStyleInner = op.inStringEditor("Style Inner", attachments.inner_css),
    inActive = op.inBool("Active", true),
    outNext = op.outTrigger("Next"),
    notClickedNext = op.outTrigger("Not Clicked"),
    outState = op.outString("Audiocontext State"),
    outEle = op.outObject("Element"),
    outClicked = op.outValueBool("Clicked", false),
    outClickedTrigger = op.outTrigger("Clicked Trigger");

op.toWorkPortsNeedToBeLinked(inExec);

const canvas = op.patch.cgl.canvas.parentElement;
let wasClicked = false;
let ele = null;
let elePlay = null;
createElements();

inStyleOuter.onChange =
    inStyleInner.onChange = createElements;

inActive.onChange = () =>
{
    if (!inActive.get())ele.style.display = "none";
    else ele.style.display = "block";
};

function createElements()
{
    if (elePlay) elePlay.remove();
    if (ele) ele.remove();

    ele = document.createElement("div");
    ele.style = inStyleOuter.get();
    outEle.set(ele);
    canvas.appendChild(ele);

    elePlay = document.createElement("div");
    elePlay.style = inStyleInner.get();

    ele.appendChild(elePlay);

    ele.addEventListener("mouseenter", hover);
    ele.addEventListener("mouseleave", hoverOut);
    ele.addEventListener("click", clicked);
    ele.addEventListener("touchStart", clicked);
    op.onDelete = removeElements;
}

inReset.onTriggered = function ()
{
    createElements();
    wasClicked = false;
    outClicked.set(wasClicked);
};

inExec.onTriggered = function ()
{
    if (window.audioContext)
    {
        outState.set(window.audioContext.state);
    }

    if (inIfSuspended.get() && window.audioContext.state == "running") clicked();
    if (wasClicked) outNext.trigger();
    else notClickedNext.trigger();
};

function clicked()
{
    removeElements();
    if (window.audioContext && window.audioContext.state == "suspended")window.audioContext.resume();
    wasClicked = true;
    outClicked.set(wasClicked);
    outClickedTrigger.trigger();
}

function removeElements()
{
    if (elePlay) elePlay.remove();
    if (ele) ele.remove();
}

function hoverOut()
{
    if (ele) ele.style.opacity = 0.7;
}

function hover()
{
    if (ele) ele.style.opacity = 1.0;
}


};

Ops.Patch.PlayButton.prototype = new CABLES.Op();
CABLES.OPS["32e53fa2-4545-4c53-a94d-2204aa079246"]={f:Ops.Patch.PlayButton,objName:"Ops.Patch.PlayButton"};




// **************************************************************
// 
// Ops.Devices.Mouse.Mouse_v2
// 
// **************************************************************

Ops.Devices.Mouse.Mouse_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    active = op.inValueBool("Active", true),
    relative = op.inValueBool("relative"),
    normalize = op.inValueBool("normalize"),
    flipY = op.inValueBool("flip y", true),
    area = op.inValueSelect("Area", ["Canvas", "Document", "Parent Element"], "Canvas"),
    rightClickPrevDef = op.inBool("right click prevent default", true),
    touchscreen = op.inValueBool("Touch support", true),
    smooth = op.inValueBool("smooth"),
    smoothSpeed = op.inValueFloat("smoothSpeed", 20),
    multiply = op.inValueFloat("multiply", 1),
    outMouseX = op.outValue("x", 0),
    outMouseY = op.outValue("y", 0),
    mouseDown = op.outValueBool("button down"),
    mouseClick = op.outTrigger("click"),
    mouseUp = op.outTrigger("Button Up"),
    mouseClickRight = op.outTrigger("click right"),
    mouseOver = op.outValueBool("mouseOver"),
    outButton = op.outValue("button");

op.setPortGroup("Behavior", [relative, normalize, flipY, area, rightClickPrevDef, touchscreen]);
op.setPortGroup("Smoothing", [smooth, smoothSpeed, multiply]);

let smoothTimer = 0;
const cgl = op.patch.cgl;
let listenerElement = null;

function setValue(x, y)
{
    if (normalize.get())
    {
        let w = cgl.canvas.width / cgl.pixelDensity;
        let h = cgl.canvas.height / cgl.pixelDensity;
        if (listenerElement == document.body)
        {
            w = listenerElement.clientWidth / cgl.pixelDensity;
            h = listenerElement.clientHeight / cgl.pixelDensity;
        }
        outMouseX.set(((x || 0) / w * 2.0 - 1.0) * multiply.get());
        outMouseY.set(((y || 0) / h * 2.0 - 1.0) * multiply.get());
    }
    else
    {
        outMouseX.set((x || 0) * multiply.get());
        outMouseY.set((y || 0) * multiply.get());
    }
}

smooth.onChange = function ()
{
    if (smooth.get()) smoothTimer = setInterval(updateSmooth, 5);
    else if (smoothTimer)clearTimeout(smoothTimer);
};

let smoothX, smoothY;
let lineX = 0, lineY = 0;

normalize.onChange = function ()
{
    mouseX = 0;
    mouseY = 0;
    setValue(mouseX, mouseY);
};

var mouseX = cgl.canvas.width / 2;
var mouseY = cgl.canvas.height / 2;

lineX = mouseX;
lineY = mouseY;

outMouseX.set(mouseX);
outMouseY.set(mouseY);

let relLastX = 0;
let relLastY = 0;
let offsetX = 0;
let offsetY = 0;
addListeners();

area.onChange = addListeners;

let speed = 0;

function updateSmooth()
{
    speed = smoothSpeed.get();
    if (speed <= 0)speed = 0.01;
    const distanceX = Math.abs(mouseX - lineX);
    const speedX = Math.round(distanceX / speed, 0);
    lineX = (lineX < mouseX) ? lineX + speedX : lineX - speedX;

    const distanceY = Math.abs(mouseY - lineY);
    const speedY = Math.round(distanceY / speed, 0);
    lineY = (lineY < mouseY) ? lineY + speedY : lineY - speedY;

    setValue(lineX, lineY);
}

function onMouseEnter(e)
{
    mouseDown.set(false);
    mouseOver.set(true);
    speed = smoothSpeed.get();
}

function onMouseDown(e)
{
    outButton.set(e.which);
    mouseDown.set(true);
}

function onMouseUp(e)
{
    outButton.set(0);
    mouseDown.set(false);
    mouseUp.trigger();
}

function onClickRight(e)
{
    mouseClickRight.trigger();
    if (rightClickPrevDef.get()) e.preventDefault();
}

function onmouseclick(e)
{
    mouseClick.trigger();
}


function onMouseLeave(e)
{
    relLastX = 0;
    relLastY = 0;

    speed = 100;

    // disabled for now as it makes no sense that the mouse bounces back to the center
    // if(area.get()!='Document')
    // {
    //     // leave anim
    //     if(smooth.get())
    //     {
    //         mouseX=cgl.canvas.width/2;
    //         mouseY=cgl.canvas.height/2;
    //     }

    // }
    mouseOver.set(false);
    mouseDown.set(false);
}

relative.onChange = function ()
{
    offsetX = 0;
    offsetY = 0;
};

function onmousemove(e)
{
    mouseOver.set(true);

    if (!relative.get())
    {
        if (area.get() != "Document")
        {
            offsetX = e.offsetX;
            offsetY = e.offsetY;
        }
        else
        {
            offsetX = e.clientX;
            offsetY = e.clientY;
        }

        if (smooth.get())
        {
            mouseX = offsetX;

            if (flipY.get()) mouseY = listenerElement.clientHeight - offsetY;
            else mouseY = offsetY;
        }
        else
        {
            if (flipY.get()) setValue(offsetX, listenerElement.clientHeight - offsetY);
            else setValue(offsetX, offsetY);
        }
    }
    else
    {
        if (relLastX != 0 && relLastY != 0)
        {
            offsetX = e.offsetX - relLastX;
            offsetY = e.offsetY - relLastY;
        }
        else
        {

        }

        relLastX = e.offsetX;
        relLastY = e.offsetY;

        mouseX += offsetX;
        mouseY += offsetY;

        if (mouseY > 460)mouseY = 460;
    }
}

function ontouchstart(event)
{
    mouseDown.set(true);

    if (event.touches && event.touches.length > 0) onMouseDown(event.touches[0]);
}

function ontouchend(event)
{
    mouseDown.set(false);
    onMouseUp();
}

touchscreen.onChange = function ()
{
    removeListeners();
    addListeners();
};

function removeListeners()
{
    if (!listenerElement) return;
    listenerElement.removeEventListener("touchend", ontouchend);
    listenerElement.removeEventListener("touchstart", ontouchstart);

    listenerElement.removeEventListener("click", onmouseclick);
    listenerElement.removeEventListener("mousemove", onmousemove);
    listenerElement.removeEventListener("mouseleave", onMouseLeave);
    listenerElement.removeEventListener("mousedown", onMouseDown);
    listenerElement.removeEventListener("mouseup", onMouseUp);
    listenerElement.removeEventListener("mouseenter", onMouseEnter);
    listenerElement.removeEventListener("contextmenu", onClickRight);
    listenerElement = null;
}

function addListeners()
{
    if (listenerElement || !active.get())removeListeners();
    if (!active.get()) return;

    listenerElement = cgl.canvas;
    if (area.get() == "Document") listenerElement = document.body;
    if (area.get() == "Parent Element") listenerElement = cgl.canvas.parentElement;

    if (touchscreen.get())
    {
        listenerElement.addEventListener("touchend", ontouchend);
        listenerElement.addEventListener("touchstart", ontouchstart);
    }

    listenerElement.addEventListener("click", onmouseclick);
    listenerElement.addEventListener("mousemove", onmousemove);
    listenerElement.addEventListener("mouseleave", onMouseLeave);
    listenerElement.addEventListener("mousedown", onMouseDown);
    listenerElement.addEventListener("mouseup", onMouseUp);
    listenerElement.addEventListener("mouseenter", onMouseEnter);
    listenerElement.addEventListener("contextmenu", onClickRight);
}

active.onChange = function ()
{
    if (listenerElement)removeListeners();
    if (active.get())addListeners();
};

op.onDelete = function ()
{
    removeListeners();
};

addListeners();


};

Ops.Devices.Mouse.Mouse_v2.prototype = new CABLES.Op();
CABLES.OPS["9fa3fc46-3147-4e3a-8ee8-a93ea9e8786e"]={f:Ops.Devices.Mouse.Mouse_v2,objName:"Ops.Devices.Mouse.Mouse_v2"};




// **************************************************************
// 
// Ops.Patch.LoadingStatus
// 
// **************************************************************

Ops.Patch.LoadingStatus = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const cgl = op.patch.cgl;
const patch = op.patch;

const exe = op.addInPort(new CABLES.Port(op, "exe", CABLES.OP_PORT_TYPE_FUNCTION));
const finished = op.addOutPort(new CABLES.Port(op, "finished", CABLES.OP_PORT_TYPE_FUNCTION));
const result = op.addOutPort(new CABLES.Port(op, "status", CABLES.OP_PORT_TYPE_VALUE));
const isFinishedPort = op.outValue("all loaded", false);
const preRenderStatus = op.addOutPort(new CABLES.Port(op, "preRenderStatus", CABLES.OP_PORT_TYPE_VALUE));
const preRenderTimeFrames = op.addInPort(new CABLES.Port(op, "preRenderTimes", CABLES.OP_PORT_TYPE_VALUE));
const preRenderOps = op.inValueBool("PreRender Ops");
const startTimeLine = op.inBool("Play Timeline", true);
preRenderStatus.set(0);
const numAssets = op.addOutPort(new CABLES.Port(op, "numAssets", CABLES.OP_PORT_TYPE_VALUE));
const loading = op.addOutPort(new CABLES.Port(op, "loading", CABLES.OP_PORT_TYPE_FUNCTION));
const loadingFinished = op.outTrigger("loading finished");

let finishedAll = false;
const preRenderTimes = [];
let firstTime = true;

const identTranslate = vec3.create();
vec3.set(identTranslate, 0, 0, 0);
const identTranslateView = vec3.create();
vec3.set(identTranslateView, 0, 0, -2);

document.body.classList.add("cables-loading");

let prerenderCount = 0;
const preRenderAnimFrame = function (t)
{
    const time = preRenderTimes[prerenderCount];

    preRenderStatus.set(prerenderCount / (preRenderTimeFrames.anim.keys.length - 1));

    op.patch.timer.setTime(time);
    cgl.renderStart(cgl, identTranslate, identTranslateView);

    finished.trigger();

    cgl.gl.clearColor(0, 0, 0, 1);
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);

    loading.trigger();

    cgl.renderEnd(cgl);
    prerenderCount++;
};

let onAnimFrame = null;
const loadingIdPrerender = "";

const onLoaded = function ()
{
    if (preRenderTimeFrames.isAnimated())
        if (preRenderTimeFrames.anim)
            for (let i = 0; i < preRenderTimeFrames.anim.keys.length; i++)
                preRenderTimes.push(preRenderTimeFrames.anim.keys[i].time);

    preRenderTimes.push(1);
};

function checkPreRender()
{
    if (patch.loading.getProgress() >= 1.0)
    {
        if (preRenderTimeFrames.anim && prerenderCount >= preRenderTimeFrames.anim.keys.length)
        {
            onAnimFrame = function () {};
            isFinishedPort.set(true);
            finishedAll = true;
        }
        else
        {
            setTimeout(checkPreRender, 30);
        }
    }
    else
    {
        setTimeout(checkPreRender, 100);
    }
}

const loadingId = patch.loading.start("delayloading", "delayloading");
setTimeout(function ()
{
    patch.loading.finished(loadingId);
}, 100);

exe.onTriggered = () =>
{
    result.set(patch.loading.getProgress());
    numAssets.set(patch.loading.getNumAssets());

    if (patch.loading.getProgress() >= 1.0 && finishedAll)
    {
        if (firstTime)
        {
            if (preRenderOps.get()) op.patch.preRenderOps();
            loadingFinished.trigger();
            op.patch.timer.setTime(0);
            if (startTimeLine.get())
            {
                op.patch.timer.play();
                isFinishedPort.set(true);
            }
            firstTime = false;
        }

        finished.trigger();
        document.body.classList.remove("cables-loading");
        document.body.classList.add("cables-loaded");
    }
    else
    {
        if (!preRenderTimeFrames.anim)
        {
            finishedAll = true;
            onAnimFrame = function () {};
        }

        if (preRenderTimeFrames.anim && patch.loading.getProgress() >= 1.0
            && prerenderCount < preRenderTimeFrames.anim.keys.length
        )
        {
            onAnimFrame = preRenderAnimFrame;
            checkPreRender();
            loading.trigger();
        }

        if (patch.loading.getProgress() < 1.0)
        {
            loading.trigger();
            op.patch.timer.setTime(0);
            op.patch.timer.pause();
        }
    }
};


};

Ops.Patch.LoadingStatus.prototype = new CABLES.Op();
CABLES.OPS["30f01b6d-b234-4ebe-a2c3-ebffd96a31e9"]={f:Ops.Patch.LoadingStatus,objName:"Ops.Patch.LoadingStatus"};




// **************************************************************
// 
// Ops.Html.LoadingIndicator
// 
// **************************************************************

Ops.Html.LoadingIndicator = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={css_ellipsis_css:".lds-ellipsis {\n\n}\n.lds-ellipsis div {\n  position: absolute;\n  /*top: 33px;*/\n  margin-top:-12px;\n  margin-left:-13px;\n  width: 13px;\n  height: 13px;\n  border-radius: 50%;\n  background: #fff;\n  animation-timing-function: cubic-bezier(0, 1, 1, 0);\n}\n.lds-ellipsis div:nth-child(1) {\n  left: 8px;\n  animation: lds-ellipsis1 0.6s infinite;\n}\n.lds-ellipsis div:nth-child(2) {\n  left: 8px;\n  animation: lds-ellipsis2 0.6s infinite;\n}\n.lds-ellipsis div:nth-child(3) {\n  left: 32px;\n  animation: lds-ellipsis2 0.6s infinite;\n}\n.lds-ellipsis div:nth-child(4) {\n  left: 56px;\n  animation: lds-ellipsis3 0.6s infinite;\n}\n@keyframes lds-ellipsis1 {\n  0% {\n    transform: scale(0);\n  }\n  100% {\n    transform: scale(1);\n  }\n}\n@keyframes lds-ellipsis3 {\n  0% {\n    transform: scale(1);\n  }\n  100% {\n    transform: scale(0);\n  }\n}\n@keyframes lds-ellipsis2 {\n  0% {\n    transform: translate(0, 0);\n  }\n  100% {\n    transform: translate(24px, 0);\n  }\n}\n",css_ring_css:".lds-ring {\n}\n.lds-ring div {\n  box-sizing: border-box;\n  display: block;\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  margin: 0;\n  border: 3px solid #fff;\n  border-radius: 50%;\n  animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;\n  border-color: #fff transparent transparent transparent;\n}\n.lds-ring div:nth-child(1) {\n  animation-delay: -0.45s;\n}\n.lds-ring div:nth-child(2) {\n  animation-delay: -0.3s;\n}\n.lds-ring div:nth-child(3) {\n  animation-delay: -0.15s;\n}\n@keyframes lds-ring {\n  0% {\n    transform: rotate(0deg);\n  }\n  100% {\n    transform: rotate(360deg);\n  }\n}\n",css_spinner_css:"._cables_spinner {\n  /*width: 40px;*/\n  /*height: 40px;*/\n  /*margin: 100px auto;*/\n  background-color: #777;\n\n  border-radius: 100%;\n  -webkit-animation: sk-scaleout 1.0s infinite ease-in-out;\n  animation: sk-scaleout 1.0s infinite ease-in-out;\n}\n\n@-webkit-keyframes sk-scaleout {\n  0% { -webkit-transform: scale(0) }\n  100% {\n    -webkit-transform: scale(1.0);\n    opacity: 0;\n  }\n}\n\n@keyframes sk-scaleout {\n  0% {\n    -webkit-transform: scale(0);\n    transform: scale(0);\n  } 100% {\n    -webkit-transform: scale(1.0);\n    transform: scale(1.0);\n    opacity: 0;\n  }\n}",};
const
    inVisible = op.inBool("Visible", false),
    inStyle = op.inSwitch("Style", ["Spinner", "Ring", "Ellipsis"], "Ring");

const div = document.createElement("div");
div.dataset.op = op.id;
const canvas = op.patch.cgl.canvas.parentElement;

inStyle.onChange = updateStyle;

div.appendChild(document.createElement("div"));
div.appendChild(document.createElement("div"));
div.appendChild(document.createElement("div"));

const size = 50;

div.style.width = size + "px";
div.style.height = size + "px";
div.style.top = "50%";
div.style.left = "50%";
// div.style.border="1px solid red";

div.style["margin-left"] = "-" + size / 2 + "px";
div.style["margin-top"] = "-" + size / 2 + "px";

div.style.position = "absolute";
div.style["z-index"] = "9999999";

inVisible.onChange = updateVisible;

let eleId = "css_loadingicon_" + CABLES.uuid();

const styleEle = document.createElement("style");
styleEle.type = "text/css";
styleEle.id = eleId;

let head = document.getElementsByTagName("body")[0];
head.appendChild(styleEle);

op.onDelete = remove;

updateStyle();

function updateStyle()
{
    const st = inStyle.get();
    if (st == "Spinner")
    {
        div.classList.add("_cables_spinner");
        styleEle.textContent = attachments.css_spinner_css;
    }
    else div.classList.remove("_cables_spinner");

    if (st == "Ring")
    {
        div.classList.add("lds-ring");
        styleEle.textContent = attachments.css_ring_css;
    }
    else div.classList.remove("lds-ring");

    if (st == "Ellipsis")
    {
        div.classList.add("lds-ellipsis");
        styleEle.textContent = attachments.css_ellipsis_css;
    }
    else div.classList.remove("lds-ellipsis");
}

function remove()
{
    div.remove();
}

function updateVisible()
{
    remove();
    if (inVisible.get()) canvas.appendChild(div);
}


};

Ops.Html.LoadingIndicator.prototype = new CABLES.Op();
CABLES.OPS["e102834c-6dcf-459c-9e22-44ebccfc0d3b"]={f:Ops.Html.LoadingIndicator,objName:"Ops.Html.LoadingIndicator"};




// **************************************************************
// 
// Ops.Vars.VarGetString
// 
// **************************************************************

Ops.Vars.VarGetString = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
var val=op.outString("Value");
op.varName=op.inValueSelect("Variable",[],"",true);

new CABLES.VarGetOpWrapper(op,"string",op.varName,val);


};

Ops.Vars.VarGetString.prototype = new CABLES.Op();
CABLES.OPS["3ad08cfc-bce6-4175-9746-fef2817a3b12"]={f:Ops.Vars.VarGetString,objName:"Ops.Vars.VarGetString"};




// **************************************************************
// 
// Ops.Trigger.GateTrigger
// 
// **************************************************************

Ops.Trigger.GateTrigger = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exe = op.inTrigger('Execute'),
    passThrough = op.inValueBool('Pass Through',true),
    triggerOut = op.outTrigger('Trigger out');

exe.onTriggered = function()
{
    if(passThrough.get())
        triggerOut.trigger();
}


};

Ops.Trigger.GateTrigger.prototype = new CABLES.Op();
CABLES.OPS["65e8b8a2-ba13-485f-883a-2bcf377989da"]={f:Ops.Trigger.GateTrigger,objName:"Ops.Trigger.GateTrigger"};




// **************************************************************
// 
// Ops.Boolean.And
// 
// **************************************************************

Ops.Boolean.And = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    bool0 = op.inValueBool("bool 1"),
    bool1 = op.inValueBool("bool 2"),
    result = op.outValueBool("result");

bool0.onChange =
bool1.onChange = exec;

function exec()
{
    result.set(bool1.get() && bool0.get());
}


};

Ops.Boolean.And.prototype = new CABLES.Op();
CABLES.OPS["c26e6ce0-8047-44bb-9bc8-5a4f911ed8ad"]={f:Ops.Boolean.And,objName:"Ops.Boolean.And"};




// **************************************************************
// 
// Ops.Vars.VarSetString_v2
// 
// **************************************************************

Ops.Vars.VarSetString_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const val=op.inString("Value","New String");
op.varName=op.inDropDown("Variable",[],"",true);

new CABLES.VarSetOpWrapper(op,"string",val,op.varName);




};

Ops.Vars.VarSetString_v2.prototype = new CABLES.Op();
CABLES.OPS["0b4d9229-8024-4a30-9cc0-f6653942c2e4"]={f:Ops.Vars.VarSetString_v2,objName:"Ops.Vars.VarSetString_v2"};




// **************************************************************
// 
// Ops.String.StringEquals
// 
// **************************************************************

Ops.String.StringEquals = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    str1=op.inString("String 1"),
    str2=op.inString("String 2"),
    result=op.outValueBool("Result");


str1.onChange=
str2.onChange=
    function()
    {
        result.set(str1.get()==str2.get());
    };

};

Ops.String.StringEquals.prototype = new CABLES.Op();
CABLES.OPS["ef15195a-760b-4ac5-9630-322b0ba7b722"]={f:Ops.String.StringEquals,objName:"Ops.String.StringEquals"};




// **************************************************************
// 
// Ops.Boolean.Not
// 
// **************************************************************

Ops.Boolean.Not = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const bool = op.inValueBool("Boolean");
const outbool = op.outValue("Result");

bool.changeAlways = true;

bool.onChange = function ()
{
    // outbool.set( ! (true==bool.get()) );
    outbool.set(!bool.get());
};


};

Ops.Boolean.Not.prototype = new CABLES.Op();
CABLES.OPS["6d123c9f-7485-4fd9-a5c2-76e59dcbeb34"]={f:Ops.Boolean.Not,objName:"Ops.Boolean.Not"};




// **************************************************************
// 
// Ops.Math.MapRange
// 
// **************************************************************

Ops.Math.MapRange = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};

const result=op.outValue("result");
var v=op.inValueFloat("value");
var old_min=op.inValueFloat("old min");
var old_max=op.inValueFloat("old max");
var new_min=op.inValueFloat("new min");
var new_max=op.inValueFloat("new max");
var easing=op.inValueSelect("Easing",["Linear","Smoothstep","Smootherstep"],"Linear");

op.setPortGroup("Input Range",[old_min,old_max]);
op.setPortGroup("Output Range",[new_min,new_max]);

var ease=0;
var r=0;

easing.onChange=function()
{
    if(easing.get()=="Smoothstep") ease=1;
        else if(easing.get()=="Smootherstep") ease=2;
            else ease=0;
};


function exec()
{
    if(v.get()>=Math.max( old_max.get(),old_min.get() ))
    {
        result.set(new_max.get());
        return;
    }
    else
    if(v.get()<=Math.min( old_max.get(),old_min.get() ))
    {
        result.set(new_min.get());
        return;
    }

    var nMin=new_min.get();
    var nMax=new_max.get();
    var oMin=old_min.get();
    var oMax=old_max.get();
    var x=v.get();

    var reverseInput = false;
    var oldMin = Math.min( oMin, oMax );
    var oldMax = Math.max( oMin, oMax );
    if(oldMin!= oMin) reverseInput = true;

    var reverseOutput = false;
    var newMin = Math.min( nMin, nMax );
    var newMax = Math.max( nMin, nMax );
    if(newMin != nMin) reverseOutput = true;

    var portion=0;

    if(reverseInput) portion = (oldMax-x)*(newMax-newMin)/(oldMax-oldMin);
        else portion = (x-oldMin)*(newMax-newMin)/(oldMax-oldMin);

    if(reverseOutput) r=newMax - portion;
        else r=portion + newMin;

    if(ease===0)
    {
        result.set(r);
    }
    else
    if(ease==1)
    {
        x = Math.max(0, Math.min(1, (r-nMin)/(nMax-nMin)));
        result.set( nMin+x*x*(3 - 2*x)* (nMax-nMin) ); // smoothstep
    }
    else
    if(ease==2)
    {
        x = Math.max(0, Math.min(1, (r-nMin)/(nMax-nMin)));
        result.set( nMin+x*x*x*(x*(x*6 - 15) + 10) * (nMax-nMin) ) ; // smootherstep
    }

}

v.set(0);
old_min.set(0);
old_max.set(1);
new_min.set(-1);
new_max.set(1);


v.onChange=exec;
old_min.onChange=exec;
old_max.onChange=exec;
new_min.onChange=exec;
new_max.onChange=exec;

result.set(0);

exec();

};

Ops.Math.MapRange.prototype = new CABLES.Op();
CABLES.OPS["2617b407-60a0-4ff6-b4a7-18136cfa7817"]={f:Ops.Math.MapRange,objName:"Ops.Math.MapRange"};




// **************************************************************
// 
// Ops.Math.Ease
// 
// **************************************************************

Ops.Math.Ease = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    inVal=op.inValue("Value"),
    inMin=op.inValue("Min",0),
    inMax=op.inValue("Max",1),
    result=op.outValue("Result"),
    anim=new CABLES.Anim();

anim.createPort(op,"Easing",updateAnimEasing);
anim.setValue(0,0);
anim.setValue(1,1);

op.onLoaded=inMin.onChange=inMax.onChange=updateMinMax;

function updateMinMax()
{
    anim.keys[0].time=anim.keys[0].value=Math.min(inMin.get(),inMax.get());
    anim.keys[1].time=anim.keys[1].value=Math.max(inMin.get(),inMax.get());
}

function updateAnimEasing()
{
    anim.keys[0].setEasing(anim.defaultEasing);
}

inVal.onChange=function()
{
    const r=anim.getValue(inVal.get());
    result.set(r);
};

};

Ops.Math.Ease.prototype = new CABLES.Op();
CABLES.OPS["8f6e4a08-33e6-408f-ac4a-198bd03b417b"]={f:Ops.Math.Ease,objName:"Ops.Math.Ease"};




// **************************************************************
// 
// Ops.Sidebar.Sidebar
// 
// **************************************************************

Ops.Sidebar.Sidebar = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={style_css:"/*\n * SIDEBAR\n  http://danielstern.ca/range.css/#/\n  https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-progress-value\n */\n\n\n.icon-chevron-down {\n    top: 2px;\n    right: 9px;\n}\n\n.iconsidebar-chevron-up {\n\tbackground-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWNoZXZyb24tdXAiPjxwb2x5bGluZSBwb2ludHM9IjE4IDE1IDEyIDkgNiAxNSI+PC9wb2x5bGluZT48L3N2Zz4=);\n    top: 2px;\n    right: 9px;\n}\n\n.sidebar-cables-right\n{\n    right: 0px;\n    left: initial !important;\n}\n\n.sidebar-cables {\n    position: absolute;\n    top: 15px;\n    left: 15px;\n    border-radius: 10px;\n    /*border:10px solid #1a1a1a;*/\n    z-index: 100000;\n    color: #BBBBBB;\n    width: 220px;\n    max-height: 100%;\n    box-sizing: border-box;\n    overflow-y: auto;\n    overflow-x: hidden;\n    font-size: 13px;\n    font-family: Arial;\n    line-height: 1em; /* prevent emojis from breaking height of the title */\n    --sidebar-border-radius: 4px;\n    --sidebar-monospace-font-stack: \"SFMono-Regular\", Consolas, \"Liberation Mono\", Menlo, Courier, monospace;\n    --sidebar-hover-transition-time: .2s;\n}\n\n.sidebar-cables::selection {\n    background-color: #24baa7;\n    color: #EEEEEE;\n}\n\n.sidebar-cables::-webkit-scrollbar {\n    background-color: transparent;\n    --cables-scrollbar-width: 8px;\n    width: var(--cables-scrollbar-width);\n}\n\n.sidebar-cables::-webkit-scrollbar-track {\n    background-color: transparent;\n    width: var(--cables-scrollbar-width);\n}\n\n.sidebar-cables::-webkit-scrollbar-thumb {\n    background-color: #333333;\n    border-radius: 4px;\n    width: var(--cables-scrollbar-width);\n}\n\n.sidebar-cables--closed {\n    width: auto;\n}\n\n.sidebar__close-button {\n    background-color: #222;\n    -webkit-user-select: none;  /* Chrome all / Safari all */\n    -moz-user-select: none;     /* Firefox all */\n    -ms-user-select: none;      /* IE 10+ */\n    user-select: none;          /* Likely future */\n    transition: background-color var(--sidebar-hover-transition-time);\n    color: #CCCCCC;\n    height: 12px;\n    box-sizing: border-box;\n    padding-top: 2px;\n    text-align: center;\n    cursor: pointer;\n    /*border-top: 1px solid #272727;*/\n    border-radius: 0 0 var(--sidebar-border-radius) var(--sidebar-border-radius);\n    opacity: 1.0;\n    transition: opacity 0.3s;\n    overflow: hidden;\n}\n\n.sidebar__close-button-icon {\n    display: inline-block;\n    /*opacity: 0;*/\n    width: 21px;\n    height: 20px;\n    position: relative;\n    top: -1px;\n    /*background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWNoZXZyb24tdXAiPjxwb2x5bGluZSBwb2ludHM9IjE4IDE1IDEyIDkgNiAxNSI+PC9wb2x5bGluZT48L3N2Zz4=);*/\n    /*background-size: cover;*/\n    /*background-repeat: no-repeat;*/\n    /*background-repeat: no-repeat;*/\n    /*background-position: 0 -1px;*/\n}\n\n.sidebar--closed {\n    width: auto;\n    margin-right: 20px;\n}\n\n.sidebar--closed .sidebar__close-button {\n    margin-top: 8px;\n    margin-left: 8px;\n    padding-top: 13px;\n    padding-left: 11px;\n    padding-right: 11px;\n    width: 46px;\n    height: 46px;\n    border-radius: 50%;\n    cursor: pointer;\n    opacity: 0.3;\n}\n\n.sidebar--closed .sidebar__group\n{\n    display:none;\n\n}\n.sidebar--closed .sidebar__close-button-icon {\n    background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIHdpZHRoPSIyMnB4IiBoZWlnaHQ9IjE3cHgiIHZpZXdCb3g9IjAgMCAyMiAxNyIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj4gICAgICAgIDx0aXRsZT5Hcm91cCAzPC90aXRsZT4gICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+ICAgIDxkZWZzPjwvZGVmcz4gICAgPGcgaWQ9IkNhbnZhcy1TaWRlYmFyIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4gICAgICAgIDxnIGlkPSJEZXNrdG9wLWdyZWVuLWJsdWlzaC1Db3B5LTkiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0yMC4wMDAwMDAsIC0yMi4wMDAwMDApIj4gICAgICAgICAgICA8ZyBpZD0iR3JvdXAtMyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjAuMDAwMDAwLCAyMi4wMDAwMDApIj4gICAgICAgICAgICAgICAgPHBhdGggZD0iTTAuNSwyLjUgTDIuNSwyLjUiIGlkPSJMaW5lLTIiIHN0cm9rZT0iIzk3OTc5NyIgc3Ryb2tlLWxpbmVjYXA9InNxdWFyZSI+PC9wYXRoPiAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTAuNSwyLjUgTDIxLjUsMi41IiBpZD0iTGluZS0yIiBzdHJva2U9IiM5Nzk3OTciIHN0cm9rZS1saW5lY2FwPSJzcXVhcmUiPjwvcGF0aD4gICAgICAgICAgICAgICAgPHBhdGggZD0iTTAuNSw4LjUgTDExLjUsOC41IiBpZD0iTGluZS0yIiBzdHJva2U9IiM5Nzk3OTciIHN0cm9rZS1saW5lY2FwPSJzcXVhcmUiPjwvcGF0aD4gICAgICAgICAgICAgICAgPHBhdGggZD0iTTE5LjUsOC41IEwyMS41LDguNSIgaWQ9IkxpbmUtMiIgc3Ryb2tlPSIjOTc5Nzk3IiBzdHJva2UtbGluZWNhcD0ic3F1YXJlIj48L3BhdGg+ICAgICAgICAgICAgICAgIDxwYXRoIGQ9Ik0wLjUsMTQuNSBMNS41LDE0LjUiIGlkPSJMaW5lLTIiIHN0cm9rZT0iIzk3OTc5NyIgc3Ryb2tlLWxpbmVjYXA9InNxdWFyZSI+PC9wYXRoPiAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMTMuNSwxNC41IEwyMS41LDE0LjUiIGlkPSJMaW5lLTIiIHN0cm9rZT0iIzk3OTc5NyIgc3Ryb2tlLWxpbmVjYXA9InNxdWFyZSI+PC9wYXRoPiAgICAgICAgICAgICAgICA8Y2lyY2xlIGlkPSJPdmFsLTMiIGZpbGw9IiM5Nzk3OTciIGN4PSI2LjUiIGN5PSIyLjUiIHI9IjIuNSI+PC9jaXJjbGU+ICAgICAgICAgICAgICAgIDxjaXJjbGUgaWQ9Ik92YWwtMyIgZmlsbD0iIzk3OTc5NyIgY3g9IjE1LjUiIGN5PSI4LjUiIHI9IjIuNSI+PC9jaXJjbGU+ICAgICAgICAgICAgICAgIDxjaXJjbGUgaWQ9Ik92YWwtMyIgZmlsbD0iIzk3OTc5NyIgY3g9IjkuNSIgY3k9IjE0LjUiIHI9IjIuNSI+PC9jaXJjbGU+ICAgICAgICAgICAgPC9nPiAgICAgICAgPC9nPiAgICA8L2c+PC9zdmc+);\n    background-position: 0px 0px;\n}\n\n.sidebar__close-button:hover {\n    background-color: #111111;\n    opacity: 1.0 !important;\n}\n\n/*\n * SIDEBAR ITEMS\n */\n\n.sidebar__items {\n    /* max-height: 1000px; */\n    /* transition: max-height 0.5;*/\n    background-color: #222;\n}\n\n.sidebar--closed .sidebar__items {\n    /* max-height: 0; */\n    height: 0;\n    display: none;\n    pointer-interactions: none;\n}\n\n.sidebar__item__right {\n    float: right;\n}\n\n/*\n * SIDEBAR GROUP\n */\n\n.sidebar__group {\n    /*background-color: #1A1A1A;*/\n    overflow: hidden;\n    box-sizing: border-box;\n    animate: height;\n    /* max-height: 1000px; */\n    /* transition: max-height 0.5s; */\n--sidebar-group-header-height: 33px;\n}\n\n.sidebar__group-items\n{\n    padding-top: 15px;\n    padding-bottom: 15px;\n}\n\n.sidebar__group--closed {\n    /* max-height: 13px; */\n    height: var(--sidebar-group-header-height);\n}\n\n.sidebar__group-header {\n    box-sizing: border-box;\n    color: #EEEEEE;\n    background-color: #151515;\n    -webkit-user-select: none;  /* Chrome all / Safari all */\n    -moz-user-select: none;     /* Firefox all */\n    -ms-user-select: none;      /* IE 10+ */\n    user-select: none;          /* Likely future */\n    height: var(--sidebar-group-header-height);\n    padding-top: 7px;\n    text-transform: uppercase;\n    letter-spacing: 0.08em;\n    cursor: pointer;\n    transition: background-color var(--sidebar-hover-transition-time);\n    position: relative;\n}\n\n.sidebar__group-header:hover {\n  background-color: #111111;\n}\n\n.sidebar__group-header-title {\n  float: left;\n  overflow: hidden;\n  padding: 0 15px;\n  padding-top:5px;\n  font-weight:bold;\n}\n\n.sidebar__group-header-undo {\n    float: right;\n    overflow: hidden;\n    padding-right: 15px;\n    padding-top:5px;\n    font-weight:bold;\n  }\n\n.sidebar__group-header-icon {\n    width: 17px;\n    height: 14px;\n    background-repeat: no-repeat;\n    display: inline-block;\n    position: absolute;\n    background-size: cover;\n\n    /* icon open */\n    /* feather icon: chevron up */\n    background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWNoZXZyb24tdXAiPjxwb2x5bGluZSBwb2ludHM9IjE4IDE1IDEyIDkgNiAxNSI+PC9wb2x5bGluZT48L3N2Zz4=);\n    top: 4px;\n    right: 5px;\n    opacity: 0.0;\n    transition: opacity 0.3;\n}\n\n.sidebar__group-header:hover .sidebar__group-header-icon {\n    opacity: 1.0;\n}\n\n/* icon closed */\n.sidebar__group--closed .sidebar__group-header-icon {\n    /* feather icon: chevron down */\n    background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWNoZXZyb24tZG93biI+PHBvbHlsaW5lIHBvaW50cz0iNiA5IDEyIDE1IDE4IDkiPjwvcG9seWxpbmU+PC9zdmc+);\n    top: 4px;\n    right: 5px;\n}\n\n/*\n * SIDEBAR ITEM\n */\n\n.sidebar__item\n{\n    box-sizing: border-box;\n    padding: 7px;\n    padding-left:15px;\n    padding-right:15px;\n\n    overflow: hidden;\n    position: relative;\n}\n\n.sidebar__item-label {\n    display: inline-block;\n    -webkit-user-select: none;  /* Chrome all / Safari all */\n    -moz-user-select: none;     /* Firefox all */\n    -ms-user-select: none;      /* IE 10+ */\n    user-select: none;          /* Likely future */\n    width: calc(50% - 7px);\n    margin-right: 7px;\n    margin-top: 2px;\n    text-overflow: ellipsis;\n    /* overflow: hidden; */\n}\n\n.sidebar__item-value-label {\n    font-family: var(--sidebar-monospace-font-stack);\n    display: inline-block;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    white-space: nowrap;\n    max-width: 60%;\n}\n\n.sidebar__item-value-label::selection {\n    background-color: #24baa7;\n    color: #EEEEEE;\n}\n\n.sidebar__item + .sidebar__item,\n.sidebar__item + .sidebar__group,\n.sidebar__group + .sidebar__item,\n.sidebar__group + .sidebar__group {\n    /*border-top: 1px solid #272727;*/\n}\n\n/*\n * SIDEBAR ITEM TOGGLE\n */\n\n.sidebar__toggle {\n    cursor: pointer;\n}\n\n.sidebar__toggle-input {\n    --sidebar-toggle-input-color: #CCCCCC;\n    --sidebar-toggle-input-color-hover: #EEEEEE;\n    --sidebar-toggle-input-border-size: 2px;\n    display: inline;\n    float: right;\n    box-sizing: border-box;\n    border-radius: 50%;\n    cursor: pointer;\n    --toggle-size: 11px;\n    margin-top: 2px;\n    background-color: transparent !important;\n    border: var(--sidebar-toggle-input-border-size) solid var(--sidebar-toggle-input-color);\n    width: var(--toggle-size);\n    height: var(--toggle-size);\n    transition: background-color var(--sidebar-hover-transition-time);\n    transition: border-color var(--sidebar-hover-transition-time);\n}\n.sidebar__toggle:hover .sidebar__toggle-input {\n    border-color: var(--sidebar-toggle-input-color-hover);\n}\n\n.sidebar__toggle .sidebar__item-value-label {\n    -webkit-user-select: none;  /* Chrome all / Safari all */\n    -moz-user-select: none;     /* Firefox all */\n    -ms-user-select: none;      /* IE 10+ */\n    user-select: none;          /* Likely future */\n    max-width: calc(50% - 12px);\n}\n.sidebar__toggle-input::after { clear: both; }\n\n.sidebar__toggle--active .icon_toggle\n{\n\n    background-image: url(data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjE1cHgiIHdpZHRoPSIzMHB4IiBmaWxsPSIjMDZmNzhiIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMTAwIDEwMCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGcgZGlzcGxheT0ibm9uZSI+PGcgZGlzcGxheT0iaW5saW5lIj48Zz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iIzA2Zjc4YiIgZD0iTTMwLDI3QzE3LjM1LDI3LDcsMzcuMzUsNyw1MGwwLDBjMCwxMi42NSwxMC4zNSwyMywyMywyM2g0MCBjMTIuNjUsMCwyMy0xMC4zNSwyMy0yM2wwLDBjMC0xMi42NS0xMC4zNS0yMy0yMy0yM0gzMHogTTcwLDY3Yy05LjM4OSwwLTE3LTcuNjEtMTctMTdzNy42MTEtMTcsMTctMTdzMTcsNy42MSwxNywxNyAgICAgUzc5LjM4OSw2Nyw3MCw2N3oiPjwvcGF0aD48L2c+PC9nPjwvZz48Zz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTMwLDI3QzE3LjM1LDI3LDcsMzcuMzUsNyw1MGwwLDBjMCwxMi42NSwxMC4zNSwyMywyMywyM2g0MCAgIGMxMi42NSwwLDIzLTEwLjM1LDIzLTIzbDAsMGMwLTEyLjY1LTEwLjM1LTIzLTIzLTIzSDMweiBNNzAsNjdjLTkuMzg5LDAtMTctNy42MS0xNy0xN3M3LjYxMS0xNywxNy0xN3MxNyw3LjYxLDE3LDE3ICAgUzc5LjM4OSw2Nyw3MCw2N3oiPjwvcGF0aD48L2c+PGcgZGlzcGxheT0ibm9uZSI+PGcgZGlzcGxheT0iaW5saW5lIj48cGF0aCBmaWxsPSIjMDZmNzhiIiBzdHJva2U9IiMwNmY3OGIiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBkPSJNNyw1MGMwLDEyLjY1LDEwLjM1LDIzLDIzLDIzaDQwICAgIGMxMi42NSwwLDIzLTEwLjM1LDIzLTIzbDAsMGMwLTEyLjY1LTEwLjM1LTIzLTIzLTIzSDMwQzE3LjM1LDI3LDcsMzcuMzUsNyw1MEw3LDUweiI+PC9wYXRoPjwvZz48Y2lyY2xlIGRpc3BsYXk9ImlubGluZSIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiMwNmY3OGIiIHN0cm9rZT0iIzA2Zjc4YiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGN4PSI3MCIgY3k9IjUwIiByPSIxNyI+PC9jaXJjbGU+PC9nPjxnIGRpc3BsYXk9Im5vbmUiPjxwYXRoIGRpc3BsYXk9ImlubGluZSIgZD0iTTcwLDI1SDMwQzE2LjIxNSwyNSw1LDM2LjIxNSw1LDUwczExLjIxNSwyNSwyNSwyNWg0MGMxMy43ODUsMCwyNS0xMS4yMTUsMjUtMjVTODMuNzg1LDI1LDcwLDI1eiBNNzAsNzEgICBIMzBDMTguNDIxLDcxLDksNjEuNTc5LDksNTBzOS40MjEtMjEsMjEtMjFoNDBjMTEuNTc5LDAsMjEsOS40MjEsMjEsMjFTODEuNTc5LDcxLDcwLDcxeiBNNzAsMzFjLTEwLjQ3NywwLTE5LDguNTIzLTE5LDE5ICAgczguNTIzLDE5LDE5LDE5czE5LTguNTIzLDE5LTE5UzgwLjQ3NywzMSw3MCwzMXogTTcwLDY1Yy04LjI3MSwwLTE1LTYuNzI5LTE1LTE1czYuNzI5LTE1LDE1LTE1czE1LDYuNzI5LDE1LDE1Uzc4LjI3MSw2NSw3MCw2NXoiPjwvcGF0aD48L2c+PC9zdmc+);\n    opacity: 1;\n    transform: rotate(0deg);\n}\n\n\n.icon_toggle\n{\n    float: right;\n    width:40px;\n    height:18px;\n    background-image: url(data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjE1cHgiIHdpZHRoPSIzMHB4IiBmaWxsPSIjYWFhYWFhIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMTAwIDEwMCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGcgZGlzcGxheT0ibm9uZSI+PGcgZGlzcGxheT0iaW5saW5lIj48Zz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI2FhYWFhYSIgZD0iTTMwLDI3QzE3LjM1LDI3LDcsMzcuMzUsNyw1MGwwLDBjMCwxMi42NSwxMC4zNSwyMywyMywyM2g0MCBjMTIuNjUsMCwyMy0xMC4zNSwyMy0yM2wwLDBjMC0xMi42NS0xMC4zNS0yMy0yMy0yM0gzMHogTTcwLDY3Yy05LjM4OSwwLTE3LTcuNjEtMTctMTdzNy42MTEtMTcsMTctMTdzMTcsNy42MSwxNywxNyAgICAgUzc5LjM4OSw2Nyw3MCw2N3oiPjwvcGF0aD48L2c+PC9nPjwvZz48Zz48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTMwLDI3QzE3LjM1LDI3LDcsMzcuMzUsNyw1MGwwLDBjMCwxMi42NSwxMC4zNSwyMywyMywyM2g0MCAgIGMxMi42NSwwLDIzLTEwLjM1LDIzLTIzbDAsMGMwLTEyLjY1LTEwLjM1LTIzLTIzLTIzSDMweiBNNzAsNjdjLTkuMzg5LDAtMTctNy42MS0xNy0xN3M3LjYxMS0xNywxNy0xN3MxNyw3LjYxLDE3LDE3ICAgUzc5LjM4OSw2Nyw3MCw2N3oiPjwvcGF0aD48L2c+PGcgZGlzcGxheT0ibm9uZSI+PGcgZGlzcGxheT0iaW5saW5lIj48cGF0aCBmaWxsPSIjYWFhYWFhIiBzdHJva2U9IiNhYWFhYWEiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBkPSJNNyw1MGMwLDEyLjY1LDEwLjM1LDIzLDIzLDIzaDQwICAgIGMxMi42NSwwLDIzLTEwLjM1LDIzLTIzbDAsMGMwLTEyLjY1LTEwLjM1LTIzLTIzLTIzSDMwQzE3LjM1LDI3LDcsMzcuMzUsNyw1MEw3LDUweiI+PC9wYXRoPjwvZz48Y2lyY2xlIGRpc3BsYXk9ImlubGluZSIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGZpbGw9IiNhYWFhYWEiIHN0cm9rZT0iI2FhYWFhYSIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGN4PSI3MCIgY3k9IjUwIiByPSIxNyI+PC9jaXJjbGU+PC9nPjxnIGRpc3BsYXk9Im5vbmUiPjxwYXRoIGRpc3BsYXk9ImlubGluZSIgZD0iTTcwLDI1SDMwQzE2LjIxNSwyNSw1LDM2LjIxNSw1LDUwczExLjIxNSwyNSwyNSwyNWg0MGMxMy43ODUsMCwyNS0xMS4yMTUsMjUtMjVTODMuNzg1LDI1LDcwLDI1eiBNNzAsNzEgICBIMzBDMTguNDIxLDcxLDksNjEuNTc5LDksNTBzOS40MjEtMjEsMjEtMjFoNDBjMTEuNTc5LDAsMjEsOS40MjEsMjEsMjFTODEuNTc5LDcxLDcwLDcxeiBNNzAsMzFjLTEwLjQ3NywwLTE5LDguNTIzLTE5LDE5ICAgczguNTIzLDE5LDE5LDE5czE5LTguNTIzLDE5LTE5UzgwLjQ3NywzMSw3MCwzMXogTTcwLDY1Yy04LjI3MSwwLTE1LTYuNzI5LTE1LTE1czYuNzI5LTE1LDE1LTE1czE1LDYuNzI5LDE1LDE1Uzc4LjI3MSw2NSw3MCw2NXoiPjwvcGF0aD48L2c+PC9zdmc+);\n    background-size: 50px 37px;\n    background-position: -6px -10px;\n    transform: rotate(180deg);\n    opacity: 0.4;\n}\n\n\n\n/*.sidebar__toggle--active .sidebar__toggle-input {*/\n/*    transition: background-color var(--sidebar-hover-transition-time);*/\n/*    background-color: var(--sidebar-toggle-input-color);*/\n/*}*/\n/*.sidebar__toggle--active .sidebar__toggle-input:hover*/\n/*{*/\n/*    background-color: var(--sidebar-toggle-input-color-hover);*/\n/*    border-color: var(--sidebar-toggle-input-color-hover);*/\n/*    transition: background-color var(--sidebar-hover-transition-time);*/\n/*    transition: border-color var(--sidebar-hover-transition-time);*/\n/*}*/\n\n/*\n * SIDEBAR ITEM BUTTON\n */\n\n.sidebar__button {}\n\n.sidebar__button-input {\n    -webkit-user-select: none;  /* Chrome all / Safari all */\n    -moz-user-select: none;     /* Firefox all */\n    -ms-user-select: none;      /* IE 10+ */\n    user-select: none;          /* Likely future */\n    height: 24px;\n    background-color: transparent;\n    color: #CCCCCC;\n    box-sizing: border-box;\n    padding-top: 3px;\n    text-align: center;\n    border-radius: 125px;\n    border:2px solid #555;\n    cursor: pointer;\n}\n\n.sidebar__button-input.plus, .sidebar__button-input.minus {\n    display: inline-block;\n    min-width: 20px;\n}\n\n.sidebar__button-input:hover {\n  background-color: #333;\n  border:2px solid #07f78c;\n}\n\n/*\n * VALUE DISPLAY (shows a value)\n */\n\n.sidebar__value-display {}\n\n/*\n * SLIDER\n */\n\n.sidebar__slider {\n    --sidebar-slider-input-height: 3px;\n}\n\n.sidebar__slider-input-wrapper {\n    width: 100%;\n    margin-top: 8px;\n    position: relative;\n}\n\n.sidebar__slider-input {\n    -webkit-appearance: none;\n    appearance: none;\n    margin: 0;\n    width: 100%;\n    height: var(--sidebar-slider-input-height);\n    background: #555;\n    cursor: pointer;\n    outline: 0;\n\n    -webkit-transition: .2s;\n    transition: background-color .2s;\n    border: none;\n}\n\n.sidebar__slider-input:focus, .sidebar__slider-input:hover {\n    border: none;\n}\n\n.sidebar__slider-input-active-track {\n    user-select: none;\n    position: absolute;\n    z-index: 11;\n    top: 0;\n    left: 0;\n    background-color: #07f78c;\n    pointer-events: none;\n    height: var(--sidebar-slider-input-height);\n\n    /* width: 10px; */\n}\n\n/* Mouse-over effects */\n.sidebar__slider-input:hover {\n    /*background-color: #444444;*/\n}\n\n/*.sidebar__slider-input::-webkit-progress-value {*/\n/*    background-color: green;*/\n/*    color:green;*/\n\n/*    }*/\n\n/* The slider handle (use -webkit- (Chrome, Opera, Safari, Edge) and -moz- (Firefox) to override default look) */\n\n.sidebar__slider-input::-moz-range-thumb\n{\n    position: absolute;\n    height: 15px;\n    width: 15px;\n    z-index: 900 !important;\n    border-radius: 20px !important;\n    cursor: pointer;\n    background: #07f78c !important;\n    user-select: none;\n\n}\n\n.sidebar__slider-input::-webkit-slider-thumb\n{\n    position: relative;\n    appearance: none;\n    -webkit-appearance: none;\n    user-select: none;\n    height: 15px;\n    width: 15px;\n    display: block;\n    z-index: 900 !important;\n    border: 0;\n    border-radius: 20px !important;\n    cursor: pointer;\n    background: #777 !important;\n}\n\n.sidebar__slider-input:hover ::-webkit-slider-thumb {\n    background-color: #EEEEEE !important;\n}\n\n/*.sidebar__slider-input::-moz-range-thumb {*/\n\n/*    width: 0 !important;*/\n/*    height: var(--sidebar-slider-input-height);*/\n/*    background: #EEEEEE;*/\n/*    cursor: pointer;*/\n/*    border-radius: 0 !important;*/\n/*    border: none;*/\n/*    outline: 0;*/\n/*    z-index: 100 !important;*/\n/*}*/\n\n.sidebar__slider-input::-moz-range-track {\n    background-color: transparent;\n    z-index: 11;\n}\n\n/*.sidebar__slider-input::-moz-range-thumb:hover {*/\n  /* background-color: #EEEEEE; */\n/*}*/\n\n\n/*.sidebar__slider-input-wrapper:hover .sidebar__slider-input-active-track {*/\n/*    background-color: #EEEEEE;*/\n/*}*/\n\n/*.sidebar__slider-input-wrapper:hover .sidebar__slider-input::-moz-range-thumb {*/\n/*    background-color: #fff !important;*/\n/*}*/\n\n/*.sidebar__slider-input-wrapper:hover .sidebar__slider-input::-webkit-slider-thumb {*/\n/*    background-color: #EEEEEE;*/\n/*}*/\n\n.sidebar__slider input[type=text] {\n    box-sizing: border-box;\n    /*background-color: #333333;*/\n    text-align: right;\n    color: #BBBBBB;\n    display: inline-block;\n    background-color: transparent !important;\n\n    width: 40%;\n    height: 18px;\n    outline: none;\n    border: none;\n    border-radius: 0;\n    padding: 0 0 0 4px !important;\n    margin: 0;\n}\n\n.sidebar__slider input[type=text]:active,\n.sidebar__slider input[type=text]:focus,\n.sidebar__slider input[type=text]:hover {\n\n    color: #EEEEEE;\n}\n\n/*\n * TEXT / DESCRIPTION\n */\n\n.sidebar__text .sidebar__item-label {\n    width: auto;\n    display: block;\n    max-height: none;\n    margin-right: 0;\n    line-height: 1.1em;\n}\n\n/*\n * SIDEBAR INPUT\n */\n.sidebar__text-input textarea,\n.sidebar__text-input input[type=text] {\n    box-sizing: border-box;\n    background-color: #333333;\n    color: #BBBBBB;\n    display: inline-block;\n    width: 50%;\n    height: 18px;\n    outline: none;\n    border: none;\n    border-radius: 0;\n    border:1px solid #666;\n    padding: 0 0 0 4px !important;\n    margin: 0;\n}\n\n.sidebar__color-picker .sidebar__item-label\n{\n    width:45%;\n}\n\n.sidebar__text-input textarea,\n.sidebar__text-input input[type=text]:active,\n.sidebar__text-input input[type=text]:focus,\n.sidebar__text-input input[type=text]:hover {\n    background-color: transparent;\n    color: #EEEEEE;\n}\n\n.sidebar__text-input textarea\n{\n    margin-top:10px;\n    height:60px;\n    width:100%;\n}\n\n/*\n * SIDEBAR SELECT\n */\n\n\n\n .sidebar__select {}\n .sidebar__select-select {\n    color: #BBBBBB;\n    /*-webkit-appearance: none;*/\n    /*-moz-appearance: none;*/\n    appearance: none;\n    /*box-sizing: border-box;*/\n    width: 50%;\n    height: 20px;\n    background-color: #333333;\n    /*background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4ODg4ODgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0iZmVhdGhlciBmZWF0aGVyLWNoZXZyb24tZG93biI+PHBvbHlsaW5lIHBvaW50cz0iNiA5IDEyIDE1IDE4IDkiPjwvcG9seWxpbmU+PC9zdmc+);*/\n    background-repeat: no-repeat;\n    background-position: right center;\n    background-size: 16px 16px;\n    margin: 0;\n    /*padding: 0 2 2 6px;*/\n    border-radius: 5px;\n    border: 1px solid #777;\n    background-color: #444;\n    cursor: pointer;\n    outline: none;\n    padding-left: 5px;\n\n }\n\n.sidebar__select-select:hover,\n.sidebar__select-select:active,\n.sidebar__select-select:active {\n    background-color: #444444;\n    color: #EEEEEE;\n}\n\n/*\n * COLOR PICKER\n */\n\n .sidebar__color-picker-color-input {}\n\n .sidebar__color-picker input[type=text] {\n    box-sizing: border-box;\n    background-color: #333333;\n    color: #BBBBBB;\n    display: inline-block;\n    width: calc(50% - 21px); /* 50% minus space of picker circle */\n    height: 18px;\n    outline: none;\n    border: none;\n    border-radius: 0;\n    padding: 0 0 0 4px !important;\n    margin: 0;\n    margin-right: 7px;\n}\n\n.sidebar__color-picker input[type=text]:active,\n.sidebar__color-picker input[type=text]:focus,\n.sidebar__color-picker input[type=text]:hover {\n    background-color: #444444;\n    color: #EEEEEE;\n}\n\n.sidebar__color-picker input[type=color],\n.sidebar__palette-picker input[type=color] {\n    display: inline-block;\n    border-radius: 100%;\n    height: 14px;\n    width: 14px;\n    padding: 0;\n    border: none;\n    border-color: transparent;\n    outline: none;\n    background: none;\n    appearance: none;\n    -moz-appearance: none;\n    -webkit-appearance: none;\n    cursor: pointer;\n    position: relative;\n    top: 3px;\n}\n.sidebar__color-picker input[type=color]:focus,\n.sidebar__palette-picker input[type=color]:focus {\n    outline: none;\n}\n.sidebar__color-picker input[type=color]::-moz-color-swatch,\n.sidebar__palette-picker input[type=color]::-moz-color-swatch {\n    border: none;\n}\n.sidebar__color-picker input[type=color]::-webkit-color-swatch-wrapper,\n.sidebar__palette-picker input[type=color]::-webkit-color-swatch-wrapper {\n    padding: 0;\n}\n.sidebar__color-picker input[type=color]::-webkit-color-swatch,\n.sidebar__palette-picker input[type=color]::-webkit-color-swatch {\n    border: none;\n    border-radius: 100%;\n}\n\n/*\n * Palette Picker\n */\n.sidebar__palette-picker .sidebar__palette-picker-color-input.first {\n    margin-left: 0;\n}\n.sidebar__palette-picker .sidebar__palette-picker-color-input.last {\n    margin-right: 0;\n}\n.sidebar__palette-picker .sidebar__palette-picker-color-input {\n    margin: 0 4px;\n}\n\n.sidebar__palette-picker .circlebutton {\n    width: 14px;\n    height: 14px;\n    border-radius: 1em;\n    display: inline-block;\n    top: 3px;\n    position: relative;\n}\n\n/*\n * Preset\n */\n.sidebar__item-presets-preset\n{\n    padding:4px;\n    cursor:pointer;\n    padding-left:8px;\n    padding-right:8px;\n    margin-right:4px;\n    background-color:#444;\n}\n\n.sidebar__item-presets-preset:hover\n{\n    background-color:#666;\n}\n\n.sidebar__greyout\n{\n    background: #222;\n    opacity: 0.8;\n    width: 100%;\n    height: 100%;\n    position: absolute;\n    z-index: 1000;\n    right: 0;\n    top: 0;\n}\n",};
// vars
const CSS_ELEMENT_CLASS = "cables-sidebar-style"; /* class for the style element to be generated */
const CSS_ELEMENT_DYNAMIC_CLASS = "cables-sidebar-dynamic-style"; /* things which can be set via op-port, but not attached to the elements themselves, e.g. minimized opacity */
const SIDEBAR_CLASS = "sidebar-cables";
const SIDEBAR_ID = "sidebar" + CABLES.uuid();
const SIDEBAR_ITEMS_CLASS = "sidebar__items";
const SIDEBAR_OPEN_CLOSE_BTN_CLASS = "sidebar__close-button";
const SIDEBAR_OPEN_CLOSE_BTN_ICON_CLASS = "sidebar__close-button-icon";
const BTN_TEXT_OPEN = ""; // 'Close';
const BTN_TEXT_CLOSED = ""; // 'Show Controls';

let openCloseBtn = null;
let openCloseBtnIcon = null;
let headerTitleText = null;

// inputs
const visiblePort = op.inValueBool("Visible", true);
const opacityPort = op.inValueSlider("Opacity", 1);
const defaultMinimizedPort = op.inValueBool("Default Minimized");
const minimizedOpacityPort = op.inValueSlider("Minimized Opacity", 0.5);
const undoButtonPort = op.inValueBool("Show undo button", false);

const inTitle = op.inString("Title", "Sidebar");
const side = op.inValueBool("Side");

// outputs
const childrenPort = op.outObject("childs");

let sidebarEl = document.querySelector("." + SIDEBAR_ID);
if (!sidebarEl)
{
    sidebarEl = initSidebarElement();
}
// if(!sidebarEl) return;
const sidebarItemsEl = sidebarEl.querySelector("." + SIDEBAR_ITEMS_CLASS);
childrenPort.set({
    "parentElement": sidebarItemsEl,
    "parentOp": op,
});
onDefaultMinimizedPortChanged();
initSidebarCss();
updateDynamicStyles();

// change listeners
visiblePort.onChange = onVisiblePortChange;
opacityPort.onChange = onOpacityPortChange;
defaultMinimizedPort.onChange = onDefaultMinimizedPortChanged;
minimizedOpacityPort.onChange = onMinimizedOpacityPortChanged;
undoButtonPort.onChange = onUndoButtonChange;
op.onDelete = onDelete;

// functions

function onMinimizedOpacityPortChanged()
{
    updateDynamicStyles();
}

side.onChange = function ()
{
    if (side.get()) sidebarEl.classList.add("sidebar-cables-right");
    else sidebarEl.classList.remove("sidebar-cables-right");
};

function onUndoButtonChange()
{
    const header = document.querySelector(".sidebar-cables .sidebar__group-header");
    if (header)
    {
        initUndoButton(header);
    }
}

function initUndoButton(header)
{
    if (header)
    {
        const undoButton = document.querySelector(".sidebar-cables .sidebar__group-header .sidebar__group-header-undo");
        if (undoButton)
        {
            if (!undoButtonPort.get())
            {
                header.removeChild(undoButton);
            }
        }
        else
        {
            if (undoButtonPort.get())
            {
                const headerUndo = document.createElement("span");
                headerUndo.classList.add("sidebar__group-header-undo");
                headerUndo.classList.add("fa");
                headerUndo.classList.add("fa-undo");

                headerUndo.addEventListener("click", function (event)
                {
                    event.stopPropagation();
                    const reloadables = document.querySelectorAll(".sidebar-cables .sidebar__reloadable");
                    const doubleClickEvent = document.createEvent("MouseEvents");
                    doubleClickEvent.initEvent("dblclick", true, true);
                    reloadables.forEach((reloadable) =>
                    {
                        reloadable.dispatchEvent(doubleClickEvent);
                    });
                });
                header.appendChild(headerUndo);
            }
        }
    }
}

function onDefaultMinimizedPortChanged()
{
    if (!openCloseBtn) { return; }
    if (defaultMinimizedPort.get())
    {
        sidebarEl.classList.add("sidebar--closed");
        // openCloseBtn.textContent = BTN_TEXT_CLOSED;
    }
    else
    {
        sidebarEl.classList.remove("sidebar--closed");
        // openCloseBtn.textContent = BTN_TEXT_OPEN;
    }
}

function onOpacityPortChange()
{
    const opacity = opacityPort.get();
    sidebarEl.style.opacity = opacity;
}

function onVisiblePortChange()
{
    if (visiblePort.get())
    {
        sidebarEl.style.display = "block";
    }
    else
    {
        sidebarEl.style.display = "none";
    }
}

side.onChanged = function ()
{

};

/**
 * Some styles cannot be set directly inline, so a dynamic stylesheet is needed.
 * Here hover states can be set later on e.g.
 */
function updateDynamicStyles()
{
    const dynamicStyles = document.querySelectorAll("." + CSS_ELEMENT_DYNAMIC_CLASS);
    if (dynamicStyles)
    {
        dynamicStyles.forEach(function (e)
        {
            e.parentNode.removeChild(e);
        });
    }
    const newDynamicStyle = document.createElement("style");
    newDynamicStyle.classList.add(CSS_ELEMENT_DYNAMIC_CLASS);
    let cssText = ".sidebar--closed .sidebar__close-button { ";
    cssText += "opacity: " + minimizedOpacityPort.get();
    cssText += "}";
    const cssTextEl = document.createTextNode(cssText);
    newDynamicStyle.appendChild(cssTextEl);
    document.body.appendChild(newDynamicStyle);
}

function initSidebarElement()
{
    const element = document.createElement("div");
    element.classList.add(SIDEBAR_CLASS);
    element.classList.add(SIDEBAR_ID);
    const canvasWrapper = op.patch.cgl.canvas.parentElement; /* maybe this is bad outside cables!? */

    // header...
    const headerGroup = document.createElement("div");
    headerGroup.classList.add("sidebar__group");
    element.appendChild(headerGroup);
    const header = document.createElement("div");
    header.classList.add("sidebar__group-header");
    element.appendChild(header);
    const headerTitle = document.createElement("span");
    headerTitle.classList.add("sidebar__group-header-title");
    headerTitleText = document.createElement("span");
    headerTitleText.classList.add("sidebar__group-header-title-text");
    headerTitleText.innerHTML = inTitle.get();
    headerTitle.appendChild(headerTitleText);
    header.appendChild(headerTitle);

    initUndoButton(header);

    headerGroup.appendChild(header);
    element.appendChild(headerGroup);
    headerGroup.addEventListener("click", onOpenCloseBtnClick);

    if (!canvasWrapper)
    {
        op.warn("[sidebar] no canvas parentelement found...");
        return;
    }
    canvasWrapper.appendChild(element);
    const items = document.createElement("div");
    items.classList.add(SIDEBAR_ITEMS_CLASS);
    element.appendChild(items);
    openCloseBtn = document.createElement("div");
    openCloseBtn.classList.add(SIDEBAR_OPEN_CLOSE_BTN_CLASS);
    openCloseBtn.addEventListener("click", onOpenCloseBtnClick);
    // openCloseBtn.textContent = BTN_TEXT_OPEN;
    element.appendChild(openCloseBtn);
    openCloseBtnIcon = document.createElement("span");
    openCloseBtnIcon.classList.add(SIDEBAR_OPEN_CLOSE_BTN_ICON_CLASS);
    openCloseBtn.appendChild(openCloseBtnIcon);

    return element;
}

inTitle.onChange = function ()
{
    if (headerTitleText)headerTitleText.innerHTML = inTitle.get();
};

function setClosed(b)
{

}

function onOpenCloseBtnClick(ev)
{
    ev.stopPropagation();
    if (!sidebarEl) { op.error("Sidebar could not be closed..."); return; }
    sidebarEl.classList.toggle("sidebar--closed");
    const btn = ev.target;
    let btnText = BTN_TEXT_OPEN;
    if (sidebarEl.classList.contains("sidebar--closed")) btnText = BTN_TEXT_CLOSED;
}

function initSidebarCss()
{
    // var cssEl = document.getElementById(CSS_ELEMENT_ID);
    const cssElements = document.querySelectorAll("." + CSS_ELEMENT_CLASS);
    // remove old script tag
    if (cssElements)
    {
        cssElements.forEach(function (e)
        {
            e.parentNode.removeChild(e);
        });
    }
    const newStyle = document.createElement("style");
    newStyle.innerHTML = attachments.style_css;
    newStyle.classList.add(CSS_ELEMENT_CLASS);
    document.body.appendChild(newStyle);
}

function onDelete()
{
    removeElementFromDOM(sidebarEl);
}

function removeElementFromDOM(el)
{
    if (el && el.parentNode && el.parentNode.removeChild) el.parentNode.removeChild(el);
}


};

Ops.Sidebar.Sidebar.prototype = new CABLES.Op();
CABLES.OPS["5a681c35-78ce-4cb3-9858-bc79c34c6819"]={f:Ops.Sidebar.Sidebar,objName:"Ops.Sidebar.Sidebar"};




// **************************************************************
// 
// Ops.Sidebar.Button_v2
// 
// **************************************************************

Ops.Sidebar.Button_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
// inputs
const parentPort = op.inObject("link");
const buttonTextPort = op.inString("Text", "Button");

// outputs
const siblingsPort = op.outObject("childs");
const buttonPressedPort = op.outTrigger("Pressed Trigger");

const inGreyOut = op.inBool("Grey Out", false);
const inVisible = op.inBool("Visible", true);


// vars
const el = document.createElement("div");
el.classList.add("sidebar__item");
el.classList.add("sidebar--button");
const input = document.createElement("div");
input.classList.add("sidebar__button-input");
el.appendChild(input);
input.addEventListener("click", onButtonClick);
const inputText = document.createTextNode(buttonTextPort.get());
input.appendChild(inputText);
op.toWorkNeedsParent("Ops.Sidebar.Sidebar");

// events
parentPort.onChange = onParentChanged;
buttonTextPort.onChange = onButtonTextChanged;
op.onDelete = onDelete;

const greyOut = document.createElement("div");
greyOut.classList.add("sidebar__greyout");
el.appendChild(greyOut);
greyOut.style.display = "none";

inGreyOut.onChange = function ()
{
    greyOut.style.display = inGreyOut.get() ? "block" : "none";
};

inVisible.onChange = function ()
{
    el.style.display = inVisible.get() ? "block" : "none";
};


function onButtonClick()
{
    buttonPressedPort.trigger();
}

function onButtonTextChanged()
{
    const buttonText = buttonTextPort.get();
    input.textContent = buttonText;
    if (CABLES.UI)
    {
        op.setTitle("Button: " + buttonText);
    }
}

function onParentChanged()
{
    const parent = parentPort.get();
    if (parent && parent.parentElement)
    {
        parent.parentElement.appendChild(el);
        siblingsPort.set(null);
        siblingsPort.set(parent);
    }
    else
    { // detach
        if (el.parentElement)
        {
            el.parentElement.removeChild(el);
        }
    }
}

function showElement(el)
{
    if (el)
    {
        el.style.display = "block";
    }
}

function hideElement(el)
{
    if (el)
    {
        el.style.display = "none";
    }
}

function onDelete()
{
    removeElementFromDOM(el);
}

function removeElementFromDOM(el)
{
    if (el && el.parentNode && el.parentNode.removeChild)
    {
        el.parentNode.removeChild(el);
    }
}


};

Ops.Sidebar.Button_v2.prototype = new CABLES.Op();
CABLES.OPS["5e9c6933-0605-4bf7-8671-a016d917f327"]={f:Ops.Sidebar.Button_v2,objName:"Ops.Sidebar.Button_v2"};




// **************************************************************
// 
// Ops.Gl.Shader.ShaderInfo
// 
// **************************************************************

Ops.Gl.Shader.ShaderInfo = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exec = op.inTrigger("Exec"),
    showFrag = op.inTriggerButton("Show Fragment"),
    showVert = op.inTriggerButton("Show Vertex"),
    showModules = op.inTriggerButton("Show Modules"),
    showUniforms = op.inTriggerButton("Show Uniforms"),
    showState = op.inTriggerButton("State Info"),
    next = op.outTrigger("Next"),
    outName = op.outString("Name"),
    outId = op.outString("Id"),
    outNumUniforms = op.outValue("Num Uniforms"),
    outNumAttributes = op.outValue("Num Attributes"),
    outAttributeNames = op.outArray("Arributes Names"),
    outDefines = op.outArray("Num Defines");

const cgl = op.patch.cgl;
let shader = null;

showFrag.onTriggered = function ()
{
    if (CABLES.UI && shader) CABLES.UI.MODAL.showCode("fragment shader", shader.finalShaderFrag, "GLSL");
};

showVert.onTriggered = function ()
{
    if (CABLES.UI && shader) CABLES.UI.MODAL.showCode("vertex shader", shader.finalShaderVert, "GLSL");
};

let doStateDump = false;
let doUniformDump = false;

showState.onTriggered = function ()
{
    if (!CABLES.UI || !shader) return;
    doStateDump = true;
};

showUniforms.onTriggered = function ()
{
    if (!CABLES.UI || !shader) return;
    doUniformDump = true;
};

exec.onTriggered = function ()
{
    if (cgl.frameStore.shadowPass) return;
    shader = cgl.getShader();
    next.trigger();

    shader.bind();

    if (!shader.getProgram()) op.setUiError("prognull", "Shader is not compiled");
    else op.setUiError("prognull", null);

    if (!shader) op.setUiError("noshader", "No Shader..");
    else op.setUiError("noshader", null);

    if (shader && shader.getProgram())
    {
        const activeUniforms = cgl.gl.getProgramParameter(shader.getProgram(), cgl.gl.ACTIVE_UNIFORMS);
        outNumUniforms.set(activeUniforms);
        outNumAttributes.set(cgl.gl.getProgramParameter(shader.getProgram(), cgl.gl.ACTIVE_ATTRIBUTES));

        let i = 0;
        const attribNames = [];
        for (i = 0; i < cgl.gl.getProgramParameter(shader.getProgram(), cgl.gl.ACTIVE_ATTRIBUTES); i++)
        {
            const name = cgl.gl.getActiveAttrib(shader.getProgram(), i).name;
            attribNames.push(name);
        }
        outAttributeNames.set(attribNames);
        outDefines.set(shader.getDefines());
        outName.set(shader.getName());
        outId.set(shader.id);

        op.setUiError("prognull", null);
    }
    else
    {
        outNumUniforms.set(0);
        outNumAttributes.set(0);
        outDefines.set(0);
        outAttributeNames.set(null);
    }

    if (doUniformDump)
    {
        const json = [];
        for (let i = 0; i < shader._uniforms.length; i++)
        {
            json.push({
                "validLoc": shader._uniforms[i]._isValidLoc(),
                "name": shader._uniforms[i]._name,
                "type": shader._uniforms[i]._type,
                "value": shader._uniforms[i]._value,
                "structName": shader._uniforms[i]._structName,
                "structUniformName": shader._uniforms[i]._structUniformName
            });
        }
        CABLES.UI.MODAL.showCode("shader uniforms", JSON.stringify(json, false, 2), "json");

        doUniformDump = false;
    }

    if (doStateDump)
    {
        doStateDump = false;
        stateDump();
    }
};

function stateDump()
{
    let txt = "";
    txt += "";

    txt += "defines (" + outDefines.get().length + ")\n\n";

    for (let i = 0; i < outDefines.get().length; i++)
    {
        txt += "- ";
        txt += outDefines.get()[i][0];
        if (outDefines.get()[i][1])
        {
            txt += ": ";
            txt += outDefines.get()[i][1];
        }
        txt += "\n";
    }

    txt += "\n\n";
    txt += "texturestack (" + shader._textureStackUni.length + ")\n\n";

    for (let i = 0; i < shader._textureStackUni.length; i++)
    {
        txt += "- ";
        txt += shader._textureStackUni[i]._name;
        txt += "(" + shader._textureStackUni[i].shaderType + ")\n";
        if (shader._textureStackTexCgl[i]) txt += JSON.stringify(shader._textureStackTexCgl[i].getInfo());
        txt += "\n";
    }

    txt += "\n\n";
    txt += "uniforms: (" + shader._uniforms.length + ")\n\n";

    for (let i = 0; i < shader._uniforms.length; i++)
    {
        txt += "- ";
        txt += shader._uniforms[i]._name;
        txt += ": ";
        txt += shader._uniforms[i].getValue();

        if (shader._uniforms[i].comment)
        {
            txt += " // ";
            txt += shader._uniforms[i].comment;
        }
        txt += "\n";
    }

    CABLES.UI.MODAL.showCode("state info", txt);
}

showModules.onTriggered = function ()
{
    if (!shader) return;
    const mods = shader.getCurrentModules();

    CABLES.UI.MODAL.showCode("vertex shader", JSON.stringify(mods, false, 4), "json");
};


};

Ops.Gl.Shader.ShaderInfo.prototype = new CABLES.Op();
CABLES.OPS["7afaa77e-a976-4e65-8eb1-a6302b91c0d3"]={f:Ops.Gl.Shader.ShaderInfo,objName:"Ops.Gl.Shader.ShaderInfo"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.CustomTextureEffectShader
// 
// **************************************************************

Ops.Gl.TextureEffects.CustomTextureEffectShader = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const render=op.inTrigger("render");
const inShader=op.inObject("Shader");
const blendMode=CGL.TextureEffect.AddBlendSelect(op,"Blend Mode","normal");
const amount=op.inValueSlider("Amount",0.25);
const trigger=op.outTrigger("trigger");

const cgl=op.patch.cgl;
var shader=new CGL.Shader(cgl);

var textureUniform=null;
var amountUniform=null;

inShader.onChange=function()
{
    shader=inShader.get();
    if(!shader)return;

    shader.setSource(shader.srcVert,shader.srcFrag);
    textureUniform=new CGL.Uniform(shader,'t','tex',0);

    amountUniform=new CGL.Uniform(shader,'f','amount',amount);
};



CGL.TextureEffect.setupBlending(op,shader,blendMode,amount);


render.onTriggered=function()
{
    if(!shader)return;
    if(!CGL.TextureEffect.checkOpInEffect(op)) return;

    cgl.pushShader(shader);
    cgl.currentTextureEffect.bind();

    cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex );

    if(shader.bindTextures)shader.bindTextures();

    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();
};


};

Ops.Gl.TextureEffects.CustomTextureEffectShader.prototype = new CABLES.Op();
CABLES.OPS["474d4806-ef96-4898-84f7-1d062684dfd0"]={f:Ops.Gl.TextureEffects.CustomTextureEffectShader,objName:"Ops.Gl.TextureEffects.CustomTextureEffectShader"};




// **************************************************************
// 
// Ops.Gl.Shader.CustomShader_v2
// 
// **************************************************************

Ops.Gl.Shader.CustomShader_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    render = op.inTrigger("render"),
    fragmentShader = op.inStringEditor("Fragment Code"),
    vertexShader = op.inStringEditor("Vertex Code"),
    asMaterial = op.inValueBool("Use As Material", true),
    trigger = op.outTrigger("trigger"),
    outShader = op.outObject("Shader", null, "shader");

const cgl = op.patch.cgl;
const uniformInputs = [];
const uniformTextures = [];
const vectors = [];

op.toWorkPortsNeedToBeLinked(render);

fragmentShader.setUiAttribs({ "editorSyntax": "glsl" });
vertexShader.setUiAttribs({ "editorSyntax": "glsl" });

const shader = new CGL.Shader(cgl, "shaderMaterial");

shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG"]);

op.setPortGroup("Source Code", [fragmentShader, vertexShader]);
op.setPortGroup("Options", [asMaterial]);

fragmentShader.set(CGL.Shader.getDefaultFragmentShader());
vertexShader.set(CGL.Shader.getDefaultVertexShader());

fragmentShader.onChange = vertexShader.onChange = function () { needsUpdate = true; };

render.onTriggered = doRender;

var needsUpdate = true;
op.onLoadedValueSet = initDataOnLoad;

function initDataOnLoad(data)
{
    updateShader();
    // set uniform values AFTER shader has been compiled and uniforms are extracted and uniform ports are created.
    for (let i = 0; i < uniformInputs.length; i++)
        for (let j = 0; j < data.portsIn.length; j++)
            if (uniformInputs[i] && uniformInputs[i].name == data.portsIn[j].name)
                uniformInputs[i].set(data.portsIn[j].value);
}

op.init = function ()
{
    updateShader();
};

function doRender()
{
    setVectorValues();
    if (needsUpdate)updateShader();
    if (asMaterial.get()) cgl.pushShader(shader);
    trigger.trigger();
    if (asMaterial.get()) cgl.popShader();
}

function bindTextures()
{
    for (let i = 0; i < uniformTextures.length; i++)
        if (uniformTextures[i] && uniformTextures[i].get() && uniformTextures[i].get().tex)
            cgl.setTexture(0 + i + 3, uniformTextures[i].get().tex);
}

function hasUniformInput(name)
{
    let i = 0;
    for (i = 0; i < uniformInputs.length; i++) if (uniformInputs[i] && uniformInputs[i].name == name) return true;
    for (i = 0; i < uniformTextures.length; i++) if (uniformTextures[i] && uniformTextures[i].name == name) return true;
    return false;
}

const tempMat4 = mat4.create();
// var lastm4;
const uniformNameBlacklist = [
    "modelMatrix",
    "viewMatrix",
    "normalMatrix",
    "mvMatrix",
    "projMatrix",
    "inverseViewMatrix",
    "camPos"
];

let countTexture = 0;
const foundNames = [];

function parseUniforms(src)
{
    const lblines = src.split("\n");
    const groupUniforms = [];

    for (let k = 0; k < lblines.length; k++)
    {
        const lines = lblines[k].split(";");

        for (let i = 0; i < lines.length; i++)
        {
            let words = lines[i].split(" ");

            for (var j = 0; j < words.length; j++) words[j] = (words[j] + "").trim();

            if (words[0] === "UNI" || words[0] === "uniform")
            {
                let varnames = words[2];
                if (words.length > 4) for (var j = 3; j < words.length; j++)varnames += words[j];

                words = words.filter(function (el) { return el !== ""; });
                const type = words[1];

                let names = [varnames];
                if (varnames.indexOf(",") > -1) names = varnames.split(",");

                for (let l = 0; l < names.length; l++)
                {
                    if (uniformNameBlacklist.indexOf(names[l]) > -1) continue;
                    const uniName = names[l].trim();

                    if (type === "float")
                    {
                        foundNames.push(uniName);
                        if (!hasUniformInput(uniName))
                        {
                            const newInput = op.inFloat(uniName, 0);
                            newInput.uniform = new CGL.Uniform(shader, "f", uniName, newInput);
                            uniformInputs.push(newInput);
                            groupUniforms.push(newInput);
                        }
                    }
                    else if (type === "int")
                    {
                        foundNames.push(uniName);
                        if (!hasUniformInput(uniName))
                        {
                            const newInput = op.inInt(uniName, 0);
                            newInput.uniform = new CGL.Uniform(shader, "i", uniName, newInput);
                            uniformInputs.push(newInput);
                            groupUniforms.push(newInput);
                        }
                    }
                    else if (type === "bool")
                    {
                        foundNames.push(uniName);
                        if (!hasUniformInput(uniName))
                        {
                            const newInput = op.inBool(uniName, false);
                            newInput.uniform = new CGL.Uniform(shader, "b", uniName, newInput);
                            uniformInputs.push(newInput);
                            groupUniforms.push(newInput);
                        }
                    }
                    else if (type === "mat4")
                    {
                        foundNames.push(uniName);
                        if (!hasUniformInput(uniName))
                        {
                            const newInput = op.inArray(uniName, 0);
                            newInput.uniform = new CGL.Uniform(shader, "m4", uniName, newInput);
                            uniformInputs.push(newInput);
                            groupUniforms.push(newInput);

                            const vec = {
                                "name": uniName,
                                "num": 16,
                                "port": newInput,
                                "uni": newInput.uniform,
                                "changed": false
                            };
                            newInput.onChange = function () { this.changed = true; }.bind(vec);

                            vectors.push(vec);
                        }
                    }
                    else if (type === "sampler2D")
                    {
                        foundNames.push(uniName);
                        if (!hasUniformInput(uniName))
                        {
                            const newInputTex = op.inObject(uniName);
                            newInputTex.uniform = new CGL.Uniform(shader, "t", uniName, 3 + uniformTextures.length);
                            uniformTextures.push(newInputTex);
                            groupUniforms.push(newInputTex);
                            newInputTex.set(CGL.Texture.getTempTexture(cgl));
                            newInputTex.on("change", (v, p) =>
                            {
                                if (!v)p.set(CGL.Texture.getTempTexture(cgl));
                            });
                            countTexture++;
                        }
                    }
                    else if (type === "vec3" || type === "vec2" || type === "vec4")
                    {
                        let num = 2;
                        if (type === "vec4")num = 4;
                        if (type === "vec3")num = 3;
                        foundNames.push(uniName + " X");
                        foundNames.push(uniName + " Y");
                        if (num > 2)foundNames.push(uniName + " Z");
                        if (num > 3)foundNames.push(uniName + " W");

                        if (!hasUniformInput(uniName + " X"))
                        {
                            const group = [];
                            const vec = {
                                "name": uniName,
                                "num": num,
                                "changed": false,
                            };
                            vectors.push(vec);
                            initVectorUniform(vec);

                            const newInputX = op.inFloat(uniName + " X", 0);
                            newInputX.onChange = function () { this.changed = true; }.bind(vec);
                            uniformInputs.push(newInputX);
                            group.push(newInputX);
                            vec.x = newInputX;

                            const newInputY = op.inFloat(uniName + " Y", 0);
                            newInputY.onChange = function () { this.changed = true; }.bind(vec);
                            uniformInputs.push(newInputY);
                            group.push(newInputY);
                            vec.y = newInputY;

                            if (num > 2)
                            {
                                const newInputZ = op.inFloat(uniName + " Z", 0);
                                newInputZ.onChange = function () { this.changed = true; }.bind(vec);
                                uniformInputs.push(newInputZ);
                                group.push(newInputZ);
                                vec.z = newInputZ;
                            }
                            if (num > 3)
                            {
                                const newInputW = op.inFloat(uniName + " W", 0);
                                newInputW.onChange = function () { this.changed = true; }.bind(vec);
                                uniformInputs.push(newInputW);
                                group.push(newInputW);
                                vec.w = newInputW;
                            }

                            op.setPortGroup(uniName, group);
                        }
                    }
                }
            }
        }
    }
    op.setPortGroup("uniforms", groupUniforms);
}

function updateShader()
{
    if (!shader) return;

    shader.bindTextures = bindTextures.bind(this);
    shader.setSource(vertexShader.get(), fragmentShader.get());

    if (cgl.glVersion == 1)
    {
        cgl.gl.getExtension("OES_standard_derivatives");
        // cgl.gl.getExtension('OES_texture_float');
        // cgl.gl.getExtension('OES_texture_float_linear');
        // cgl.gl.getExtension('OES_texture_half_float');
        // cgl.gl.getExtension('OES_texture_half_float_linear');

        shader.enableExtension("GL_OES_standard_derivatives");
    // shader.enableExtension("GL_OES_texture_float");
    // shader.enableExtension("GL_OES_texture_float_linear");
    // shader.enableExtension("GL_OES_texture_half_float");
    // shader.enableExtension("GL_OES_texture_half_float_linear");
    }

    countTexture = 0;
    foundNames.length = 0;

    parseUniforms(vertexShader.get());
    parseUniforms(fragmentShader.get());

    for (var j = 0; j < uniformTextures.length; j++)
        for (var i = 0; i < foundNames.length; i++)
            if (uniformTextures[j] && foundNames.indexOf(uniformTextures[j].name) == -1)
            {
                uniformTextures[j].remove();
                uniformTextures[j] = null;
            }

    for (var j = 0; j < uniformInputs.length; j++)
        for (var i = 0; i < foundNames.length; i++)
            if (uniformInputs[j] && foundNames.indexOf(uniformInputs[j].name) == -1)
            {
                uniformInputs[j].remove();
                uniformInputs[j] = null;
            }

    for (var j = 0; j < vectors.length; j++)
    {
        initVectorUniform(vectors[j]);
        vectors[j].changed = true;
    }

    for (i = 0; i < uniformInputs.length; i++)
        if (uniformInputs[i] && uniformInputs[i].uniform)uniformInputs[i].uniform.needsUpdate = true;

    shader.compile();

    if (CABLES.UI) gui.opParams.show(op);

    outShader.set(null);
    outShader.set(shader);
    needsUpdate = false;
}

function initVectorUniform(vec)
{
    if (vec.num == 2) vec.uni = new CGL.Uniform(shader, "2f", vec.name, [0, 0]);
    else if (vec.num == 3) vec.uni = new CGL.Uniform(shader, "3f", vec.name, [0, 0, 0]);
    else if (vec.num == 4) vec.uni = new CGL.Uniform(shader, "4f", vec.name, [0, 0, 0, 0]);
}

function setVectorValues()
{
    for (let i = 0; i < vectors.length; i++)
    {
        const v = vectors[i];
        if (v.changed)
        {
            if (v.num === 2) v.uni.setValue([v.x.get(), v.y.get()]);
            else if (v.num === 3) v.uni.setValue([v.x.get(), v.y.get(), v.z.get()]);
            else if (v.num === 4) v.uni.setValue([v.x.get(), v.y.get(), v.z.get(), v.w.get()]);

            else if (v.num > 4)
            {
                v.uni.setValue(v.port.get());
                // console.log(v.port.get());
            }

            v.changed = false;
        }
    }
}


};

Ops.Gl.Shader.CustomShader_v2.prototype = new CABLES.Op();
CABLES.OPS["a165fc89-a35b-4d39-8930-7345b098bd9d"]={f:Ops.Gl.Shader.CustomShader_v2,objName:"Ops.Gl.Shader.CustomShader_v2"};




// **************************************************************
// 
// Ops.Value.Number
// 
// **************************************************************

Ops.Value.Number = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const v = op.inValueFloat("value");
const result = op.outValue("result");

v.onChange = exec;

function exec()
{
    result.set(v.get());
}


};

Ops.Value.Number.prototype = new CABLES.Op();
CABLES.OPS["8fb2bb5d-665a-4d0a-8079-12710ae453be"]={f:Ops.Value.Number,objName:"Ops.Value.Number"};




// **************************************************************
// 
// Ops.Sidebar.Slider_v3
// 
// **************************************************************

Ops.Sidebar.Slider_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
// constants
const STEP_DEFAULT = 0.00001;

// inputs
const parentPort = op.inObject("link");
const labelPort = op.inString("Text", "Slider");
const minPort = op.inValue("Min", 0);
const maxPort = op.inValue("Max", 1);
const stepPort = op.inValue("Step", STEP_DEFAULT);

const inGreyOut = op.inBool("Grey Out", false);
const inVisible = op.inBool("Visible", true);

const inputValuePort = op.inValue("Input", 0.5);
const setDefaultValueButtonPort = op.inTriggerButton("Set Default");
const reset = op.inTriggerButton("Reset");

const defaultValuePort = op.inValue("Default", 0.5);
defaultValuePort.setUiAttribs({ "hidePort": true, "greyout": true });

// outputs
const siblingsPort = op.outObject("childs");
const valuePort = op.outValue("Result", defaultValuePort.get());

op.toWorkNeedsParent("Ops.Sidebar.Sidebar");
op.setPortGroup("Range", [minPort, maxPort, stepPort]);
op.setPortGroup("Visibility", [inGreyOut, inVisible]);

// vars
const el = document.createElement("div");
el.addEventListener("dblclick", function ()
{
    valuePort.set(parseFloat(defaultValuePort.get()));
    inputValuePort.set(parseFloat(defaultValuePort.get()));
});

el.classList.add("sidebar__item");
el.classList.add("sidebar__slider");
el.classList.add("sidebar__reloadable");

const label = document.createElement("div");
label.classList.add("sidebar__item-label");

const greyOut = document.createElement("div");
greyOut.classList.add("sidebar__greyout");
el.appendChild(greyOut);
greyOut.style.display = "none";

const labelText = document.createTextNode(labelPort.get());
label.appendChild(labelText);
el.appendChild(label);

const value = document.createElement("input");
value.value = defaultValuePort.get();
value.classList.add("sidebar__text-input-input");
// value.setAttribute('type', 'number'); /* not possible to use '.' instead of ',' as separator on German computer, so not usable... */
value.setAttribute("type", "text");
// value.setAttribute('lang', 'en-US'); // force '.' as decimal separator
// value.setAttribute('pattern', '[0-9]+([\.][0-9]+)?'); // only allow '.' as separator
// value.setAttribute('step', 'any'); /* we cannot use the slider step, as it restricts valid numbers to be entered */
// value.setAttribute('formnovalidate', '');
value.oninput = onTextInputChanged;
el.appendChild(value);

const inputWrapper = document.createElement("div");
inputWrapper.classList.add("sidebar__slider-input-wrapper");
el.appendChild(inputWrapper);

const activeTrack = document.createElement("div");
activeTrack.classList.add("sidebar__slider-input-active-track");
inputWrapper.appendChild(activeTrack);
const input = document.createElement("input");
input.classList.add("sidebar__slider-input");
input.setAttribute("min", minPort.get());
input.setAttribute("max", maxPort.get());
input.setAttribute("type", "range");
input.setAttribute("step", stepPort.get());
input.setAttribute("value", defaultValuePort.get());
input.style.display = "block"; /* needed because offsetWidth returns 0 otherwise */
inputWrapper.appendChild(input);

updateActiveTrack();
input.addEventListener("input", onSliderInput);

// events
parentPort.onChange = onParentChanged;
labelPort.onChange = onLabelTextChanged;
inputValuePort.onChange = onInputValuePortChanged;
defaultValuePort.onChange = onDefaultValueChanged;
setDefaultValueButtonPort.onTriggered = onSetDefaultValueButtonPress;
minPort.onChange = onMinPortChange;
maxPort.onChange = onMaxPortChange;
stepPort.onChange = stepPortChanged;
op.onDelete = onDelete;

// op.onLoadedValueSet=function()
op.onLoaded = op.onInit = function ()
{
    if (op.patch.config.sidebar)
    {
        op.patch.config.sidebar[labelPort.get()];
        valuePort.set(op.patch.config.sidebar[labelPort.get()]);
    }
    else
    {
        valuePort.set(parseFloat(defaultValuePort.get()));
        inputValuePort.set(parseFloat(defaultValuePort.get()));
        // onInputValuePortChanged();
    }
};

reset.onTriggered = function ()
{
    const newValue = parseFloat(defaultValuePort.get());
    valuePort.set(newValue);
    value.value = newValue;
    input.value = newValue;
    inputValuePort.set(newValue);
    updateActiveTrack();
};

inGreyOut.onChange = function ()
{
    greyOut.style.display = inGreyOut.get() ? "block" : "none";
};

inVisible.onChange = function ()
{
    el.style.display = inVisible.get() ? "block" : "none";
};

function onTextInputChanged(ev)
{
    let newValue = parseFloat(ev.target.value);
    if (isNaN(newValue)) newValue = 0;
    const min = minPort.get();
    const max = maxPort.get();
    if (newValue < min) { newValue = min; }
    else if (newValue > max) { newValue = max; }
    // input.value = newValue;
    valuePort.set(newValue);
    updateActiveTrack();
    inputValuePort.set(newValue);
    if (op.isCurrentUiOp()) gui.opParams.show(op); /* update DOM */
}

function onInputValuePortChanged()
{
    let newValue = parseFloat(inputValuePort.get());
    const minValue = minPort.get();
    const maxValue = maxPort.get();
    if (newValue > maxValue) { newValue = maxValue; }
    else if (newValue < minValue) { newValue = minValue; }
    value.value = newValue;
    input.value = newValue;
    valuePort.set(newValue);
    updateActiveTrack();
}

function onSetDefaultValueButtonPress()
{
    let newValue = parseFloat(inputValuePort.get());
    const minValue = minPort.get();
    const maxValue = maxPort.get();
    if (newValue > maxValue) { newValue = maxValue; }
    else if (newValue < minValue) { newValue = minValue; }
    value.value = newValue;
    input.value = newValue;
    valuePort.set(newValue);
    defaultValuePort.set(newValue);
    if (op.isCurrentUiOp()) gui.opParams.show(op); /* update DOM */

    updateActiveTrack();
}

function onSliderInput(ev)
{
    ev.preventDefault();
    ev.stopPropagation();
    value.value = ev.target.value;
    const inputFloat = parseFloat(ev.target.value);
    valuePort.set(inputFloat);
    inputValuePort.set(inputFloat);
    if (op.isCurrentUiOp()) gui.opParams.show(op); /* update DOM */

    updateActiveTrack();
    return false;
}

function stepPortChanged()
{
    const step = stepPort.get();
    input.setAttribute("step", step);
    updateActiveTrack();
}

function updateActiveTrack(val)
{
    let valueToUse = parseFloat(input.value);
    if (typeof val !== "undefined") valueToUse = val;
    let availableWidth = input.offsetWidth; /* this returns 0 at the beginning... */
    if (availableWidth === 0) { availableWidth = 206; }
    const trackWidth = CABLES.map(
        valueToUse,
        parseFloat(input.min),
        parseFloat(input.max),
        0,
        availableWidth - 16 /* subtract slider thumb width */
    );
    // activeTrack.style.width = 'calc(' + percentage + '%' + ' - 9px)';
    activeTrack.style.width = trackWidth + "px";
}

function onMinPortChange()
{
    const min = minPort.get();
    input.setAttribute("min", min);
    updateActiveTrack();
}

function onMaxPortChange()
{
    const max = maxPort.get();
    input.setAttribute("max", max);
    updateActiveTrack();
}

function onDefaultValueChanged()
{
    const defaultValue = defaultValuePort.get();
    valuePort.set(parseFloat(defaultValue));
    onMinPortChange();
    onMaxPortChange();
    input.value = defaultValue;
    value.value = defaultValue;

    updateActiveTrack(defaultValue); // needs to be passed as argument, is this async?
}

function onLabelTextChanged()
{
    const labelText = labelPort.get();
    label.textContent = labelText;
    if (CABLES.UI) op.setTitle("Slider: " + labelText);
}

function onParentChanged()
{
    const parent = parentPort.get();
    if (parent && parent.parentElement)
    {
        parent.parentElement.appendChild(el);
        siblingsPort.set(null);
        siblingsPort.set(parent);
    }
    else if (el.parentElement) el.parentElement.removeChild(el);
}

function showElement(el)
{
    if (el)el.style.display = "block";
}

function hideElement(el)
{
    if (el)el.style.display = "none";
}

function onDelete()
{
    removeElementFromDOM(el);
}

function removeElementFromDOM(el)
{
    if (el && el.parentNode && el.parentNode.removeChild) el.parentNode.removeChild(el);
}


};

Ops.Sidebar.Slider_v3.prototype = new CABLES.Op();
CABLES.OPS["74730122-5cba-4d0d-b610-df334ec6220a"]={f:Ops.Sidebar.Slider_v3,objName:"Ops.Sidebar.Slider_v3"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.ImageCompose
// 
// **************************************************************

Ops.Gl.TextureEffects.ImageCompose = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const render = op.inTrigger("render");
const useVPSize = op.inBool("use viewport size");
const width = op.inValueInt("width");
const height = op.inValueInt("height");

const tfilter = op.inSwitch("filter", ["nearest", "linear", "mipmap"], "linear");
const twrap = op.inValueSelect("wrap", ["clamp to edge", "repeat", "mirrored repeat"]);
const fpTexture = op.inValueBool("HDR");

const trigger = op.outTrigger("trigger");
const texOut = op.outTexture("texture_out");

const bgAlpha = op.inValueSlider("Background Alpha", 0);
const outRatio = op.outValue("Aspect Ratio");

op.setPortGroup("Texture Size", [useVPSize, width, height]);
op.setPortGroup("Texture Settings", [twrap, tfilter, fpTexture]);

const cgl = op.patch.cgl;
texOut.set(CGL.Texture.getEmptyTexture(cgl));
let effect = null;
let tex = null;

let w = 8, h = 8;
const prevViewPort = [0, 0, 0, 0];
let reInitEffect = true;

const bgFrag = ""
    .endl() + "uniform float a;"
    .endl() + "void main()"
    .endl() + "{"
    .endl() + "   outColor= vec4(0.0,0.0,0.0,a);"
    .endl() + "}";
const bgShader = new CGL.Shader(cgl, "imgcompose bg");
bgShader.setSource(bgShader.getDefaultVertexShader(), bgFrag);
const uniBgAlpha = new CGL.Uniform(bgShader, "f", "a", bgAlpha);

let selectedFilter = CGL.Texture.FILTER_LINEAR;
let selectedWrap = CGL.Texture.WRAP_CLAMP_TO_EDGE;

function initEffect()
{
    if (effect)effect.delete();
    if (tex)tex.delete();

    effect = new CGL.TextureEffect(cgl, { "isFloatingPointTexture": fpTexture.get() });

    tex = new CGL.Texture(cgl,
        {
            "name": "image compose",
            "isFloatingPointTexture": fpTexture.get(),
            "filter": selectedFilter,
            "wrap": selectedWrap,
            "width": Math.ceil(width.get()),
            "height": Math.ceil(height.get()),
        });

    effect.setSourceTexture(tex);
    texOut.set(CGL.Texture.getEmptyTexture(cgl));
    // texOut.set(effect.getCurrentSourceTexture());

    // texOut.set(effect.getCurrentSourceTexture());

    reInitEffect = false;

    // op.log("reinit effect");
    // tex.printInfo();
}

fpTexture.onChange = function ()
{
    reInitEffect = true;

    // var e1=cgl.gl.getExtension('EXT_color_buffer_float');
    // var e2=cgl.gl.getExtension('EXT_float_blend');
};

function updateResolution()
{
    if (!effect)initEffect();

    if (useVPSize.get())
    {
        w = cgl.getViewPort()[2];
        h = cgl.getViewPort()[3];
    }
    else
    {
        w = Math.ceil(width.get());
        h = Math.ceil(height.get());
    }

    if ((w != tex.width || h != tex.height) && (w !== 0 && h !== 0))
    {
        height.set(h);
        width.set(w);
        tex.setSize(w, h);
        outRatio.set(w / h);
        effect.setSourceTexture(tex);
        // texOut.set(null);
        texOut.set(CGL.Texture.getEmptyTexture(cgl));
        texOut.set(tex);
    }

    if (texOut.get() && selectedFilter != CGL.Texture.FILTER_NEAREST)
    {
        if (!texOut.get().isPowerOfTwo()) op.setUiError("hintnpot", "texture dimensions not power of two! - texture filtering when scaling will not work on ios devices.", 0);
        else op.setUiError("hintnpot", null, 0);
    }
    else op.setUiError("hintnpot", null, 0);

    // if (texOut.get())
    //     if (!texOut.get().isPowerOfTwo())
    //     {
    //         if (!op.uiAttribs.hint)
    //             op.uiAttr(
    //                 {
    //                     "hint": "texture dimensions not power of two! - texture filtering will not work.",
    //                     "warning": null
    //                 });
    //     }
    //     else
    //     if (op.uiAttribs.hint)
    //     {
    //         op.uiAttr({ "hint": null, "warning": null }); // todo only when needed...
    //     }
}

function updateSizePorts()
{
    if (useVPSize.get())
    {
        width.setUiAttribs({ "greyout": true });
        height.setUiAttribs({ "greyout": true });
    }
    else
    {
        width.setUiAttribs({ "greyout": false });
        height.setUiAttribs({ "greyout": false });
    }
}

useVPSize.onChange = function ()
{
    updateSizePorts();
    if (useVPSize.get())
    {
        width.onChange = null;
        height.onChange = null;
    }
    else
    {
        width.onChange = updateResolution;
        height.onChange = updateResolution;
    }
    updateResolution();
};

op.preRender = function ()
{
    doRender();
    bgShader.bind();
};

var doRender = function ()
{
    if (!effect || reInitEffect)
    {
        initEffect();
    }
    const vp = cgl.getViewPort();
    prevViewPort[0] = vp[0];
    prevViewPort[1] = vp[1];
    prevViewPort[2] = vp[2];
    prevViewPort[3] = vp[3];

    cgl.gl.blendFunc(cgl.gl.SRC_ALPHA, cgl.gl.ONE_MINUS_SRC_ALPHA);

    updateResolution();

    cgl.currentTextureEffect = effect;
    effect.setSourceTexture(tex);

    effect.startEffect();

    // render background color...
    cgl.pushShader(bgShader);
    cgl.currentTextureEffect.bind();
    cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex);
    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();

    texOut.set(effect.getCurrentSourceTexture());
    // texOut.set(effect.getCurrentTargetTexture());

    // if(effect.getCurrentSourceTexture.filter==CGL.Texture.FILTER_MIPMAP)
    // {
    //         this._cgl.gl.bindTexture(this._cgl.gl.TEXTURE_2D, effect.getCurrentSourceTexture.tex);
    //         effect.getCurrentSourceTexture.updateMipMap();
    //     // else
    //     // {
    //     //     this._cgl.gl.bindTexture(this._cgl.gl.TEXTURE_2D, this._textureSource.tex);;
    //     //     this._textureSource.updateMipMap();
    //     // }

    //     this._cgl.gl.bindTexture(this._cgl.gl.TEXTURE_2D, null);
    // }

    effect.endEffect();

    cgl.setViewPort(prevViewPort[0], prevViewPort[1], prevViewPort[2], prevViewPort[3]);

    cgl.gl.blendFunc(cgl.gl.SRC_ALPHA, cgl.gl.ONE_MINUS_SRC_ALPHA);

    cgl.currentTextureEffect = null;
};

function onWrapChange()
{
    if (twrap.get() == "repeat") selectedWrap = CGL.Texture.WRAP_REPEAT;
    if (twrap.get() == "mirrored repeat") selectedWrap = CGL.Texture.WRAP_MIRRORED_REPEAT;
    if (twrap.get() == "clamp to edge") selectedWrap = CGL.Texture.WRAP_CLAMP_TO_EDGE;

    reInitEffect = true;
    updateResolution();
}

twrap.set("repeat");
twrap.onChange = onWrapChange;

function onFilterChange()
{
    if (tfilter.get() == "nearest") selectedFilter = CGL.Texture.FILTER_NEAREST;
    if (tfilter.get() == "linear") selectedFilter = CGL.Texture.FILTER_LINEAR;
    if (tfilter.get() == "mipmap") selectedFilter = CGL.Texture.FILTER_MIPMAP;

    reInitEffect = true;
    updateResolution();
    // effect.setSourceTexture(tex);
    // updateResolution();
}

tfilter.set("linear");
tfilter.onChange = onFilterChange;

useVPSize.set(true);
render.onTriggered = doRender;
op.preRender = doRender;

width.set(640);
height.set(360);
onFilterChange();
onWrapChange();
updateSizePorts();


};

Ops.Gl.TextureEffects.ImageCompose.prototype = new CABLES.Op();
CABLES.OPS["5c04608d-1e42-4e36-be00-1be4a81fc309"]={f:Ops.Gl.TextureEffects.ImageCompose,objName:"Ops.Gl.TextureEffects.ImageCompose"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.Blur
// 
// **************************************************************

Ops.Gl.TextureEffects.Blur = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={blur_frag:"IN vec2 texCoord;\nUNI sampler2D tex;\nUNI float dirX;\nUNI float dirY;\nUNI float amount;\n\n#ifdef HAS_MASK\n    UNI sampler2D imageMask;\n#endif\n\nfloat random(vec3 scale, float seed)\n{\n    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\n}\n\nvoid main()\n{\n    vec4 color = vec4(0.0);\n    float total = 0.0;\n\n    float am=amount;\n    #ifdef HAS_MASK\n        am=amount*texture(imageMask,texCoord).r;\n        if(am<=0.02)\n        {\n            outColor=texture(tex, texCoord);\n            return;\n        }\n    #endif\n\n    vec2 delta=vec2(dirX*am*0.01,dirY*am*0.01);\n\n\n    float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\n\n    #ifdef MOBILE\n        offset = 0.1;\n    #endif\n\n    #if defined(FASTBLUR) && !defined(MOBILE)\n        const float range=5.0;\n    #else\n        const float range=20.0;\n    #endif\n\n    for (float t = -range; t <= range; t+=1.0)\n    {\n        float percent = (t + offset - 0.5) / range;\n        float weight = 1.0 - abs(percent);\n        vec4 smpl = texture(tex, texCoord + delta * percent);\n\n        smpl.rgb *= smpl.a;\n\n        color += smpl * weight;\n        total += weight;\n    }\n\n    outColor= color / total;\n\n    outColor.rgb /= outColor.a + 0.00001;\n\n\n\n}\n",};
const render=op.inTrigger('render');
const trigger=op.outTrigger('trigger');
const amount=op.inValueFloat("amount");
const direction=op.inSwitch("direction",['both','vertical','horizontal'],'both');
const fast=op.inValueBool("Fast",true);
const cgl=op.patch.cgl;

amount.set(10);

var shader=new CGL.Shader(cgl);

shader.define("FASTBLUR");

fast.onChange=function()
{
    if(fast.get()) shader.define("FASTBLUR");
    else shader.removeDefine("FASTBLUR");
};

shader.setSource(shader.getDefaultVertexShader(),attachments.blur_frag);
var textureUniform=new CGL.Uniform(shader,'t','tex',0);

var uniDirX=new CGL.Uniform(shader,'f','dirX',0);
var uniDirY=new CGL.Uniform(shader,'f','dirY',0);

var uniWidth=new CGL.Uniform(shader,'f','width',0);
var uniHeight=new CGL.Uniform(shader,'f','height',0);

var uniAmount=new CGL.Uniform(shader,'f','amount',amount.get());
amount.onChange=function(){ uniAmount.setValue(amount.get()); };

var textureAlpha=new CGL.Uniform(shader,'t','imageMask',1);

var showingError = false;

function fullScreenBlurWarning ()
{
    if(cgl.currentTextureEffect.getCurrentSourceTexture().width == cgl.canvasWidth &&
        cgl.currentTextureEffect.getCurrentSourceTexture().height == cgl.canvasHeight)
    {
        op.setUiError('warning','Full screen blurs are slow! Try reducing the resolution to 1/2 or a 1/4',0);
    }
    else
    {
        op.setUiError('warning',null);
    }
};

var dir=0;
direction.onChange=function()
{
    if(direction.get()=='both')dir=0;
    if(direction.get()=='horizontal')dir=1;
    if(direction.get()=='vertical')dir=2;
};

var mask=op.inTexture("mask");

mask.onChange=function()
{
    if(mask.get() && mask.get().tex) shader.define('HAS_MASK');
        else shader.removeDefine('HAS_MASK');
};

render.onTriggered=function()
{
    if(!CGL.TextureEffect.checkOpInEffect(op)) return;

    cgl.pushShader(shader);

    uniWidth.setValue(cgl.currentTextureEffect.getCurrentSourceTexture().width);
    uniHeight.setValue(cgl.currentTextureEffect.getCurrentSourceTexture().height);

    fullScreenBlurWarning();

    // first pass
    if(dir===0 || dir==2)
    {

        cgl.currentTextureEffect.bind();
        cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex );


        if(mask.get() && mask.get().tex)
        {
            cgl.setTexture(1, mask.get().tex );
            // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, mask.get().tex );
        }


        uniDirX.setValue(0.0);
        uniDirY.setValue(1.0);

        cgl.currentTextureEffect.finish();
    }

    // second pass
    if(dir===0 || dir==1)
    {

        cgl.currentTextureEffect.bind();
        cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex );


        if(mask.get() && mask.get().tex)
        {
            cgl.setTexture(1, mask.get().tex );
            // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, mask.get().tex );
        }

        uniDirX.setValue(1.0);
        uniDirY.setValue(0.0);

        cgl.currentTextureEffect.finish();
    }

    cgl.popShader();
    trigger.trigger();
};





};

Ops.Gl.TextureEffects.Blur.prototype = new CABLES.Op();
CABLES.OPS["54f26f53-f637-44c1-9bfb-a2f2b722e998"]={f:Ops.Gl.TextureEffects.Blur,objName:"Ops.Gl.TextureEffects.Blur"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.DrawImage_v2
// 
// **************************************************************

Ops.Gl.TextureEffects.DrawImage_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={drawimage_frag:"#ifdef HAS_TEXTURES\n    IN vec2 texCoord;\n    UNI sampler2D tex;\n    UNI sampler2D image;\n#endif\n\nIN mat3 transform;\nUNI float rotate;\n\n{{CGL.BLENDMODES}}\n\n#ifdef HAS_TEXTUREALPHA\n   UNI sampler2D imageAlpha;\n#endif\n\nUNI float amount;\n\n#ifdef ASPECT_RATIO\n    UNI float aspectTex;\n    UNI float aspectPos;\n#endif\n\nvoid main()\n{\n    vec4 blendRGBA=vec4(0.0,0.0,0.0,1.0);\n    #ifdef HAS_TEXTURES\n        vec2 tc=texCoord;\n\n        #ifdef TEX_FLIP_X\n            tc.x=1.0-tc.x;\n        #endif\n        #ifdef TEX_FLIP_Y\n            tc.y=1.0-tc.y;\n        #endif\n\n        #ifdef ASPECT_RATIO\n            #ifdef ASPECT_AXIS_X\n                tc.y=(1.0-aspectPos)-(((1.0-aspectPos)-tc.y)*aspectTex);\n            #endif\n            #ifdef ASPECT_AXIS_Y\n                tc.x=(1.0-aspectPos)-(((1.0-aspectPos)-tc.x)/aspectTex);\n            #endif\n        #endif\n\n        #ifdef TEX_TRANSFORM\n            vec3 coordinates=vec3(tc.x, tc.y,1.0);\n            tc=(transform * coordinates ).xy;\n        #endif\n\n        blendRGBA=texture(image,tc);\n\n        vec3 blend=blendRGBA.rgb;\n        vec4 baseRGBA=texture(tex,texCoord);\n        vec3 base=baseRGBA.rgb;\n        vec3 colNew=_blend(base,blend);\n\n        #ifdef REMOVE_ALPHA_SRC\n            blendRGBA.a=1.0;\n        #endif\n\n        #ifdef HAS_TEXTUREALPHA\n            vec4 colImgAlpha=texture(imageAlpha,tc);\n            float colImgAlphaAlpha=colImgAlpha.a;\n\n            #ifdef ALPHA_FROM_LUMINANCE\n                vec3 gray = vec3(dot(vec3(0.2126,0.7152,0.0722), colImgAlpha.rgb ));\n                colImgAlphaAlpha=(gray.r+gray.g+gray.b)/3.0;\n            #endif\n\n            #ifdef ALPHA_FROM_INV_UMINANCE\n                vec3 gray = vec3(dot(vec3(0.2126,0.7152,0.0722), colImgAlpha.rgb ));\n                colImgAlphaAlpha=1.0-(gray.r+gray.g+gray.b)/3.0;\n            #endif\n\n            #ifdef INVERT_ALPHA\n            colImgAlphaAlpha=clamp(colImgAlphaAlpha,0.0,1.0);\n            colImgAlphaAlpha=1.0-colImgAlphaAlpha;\n            #endif\n\n            blendRGBA.a=colImgAlphaAlpha*blendRGBA.a;\n        #endif\n    #endif\n\n    float am=amount;\n\n    #ifdef CLIP_REPEAT\n        if(tc.y>1.0 || tc.y<0.0 || tc.x>1.0 || tc.x<0.0)\n        {\n            // colNew.rgb=vec3(0.0);\n            am=0.0;\n        }\n    #endif\n\n    #ifdef ASPECT_RATIO\n        #ifdef ASPECT_CROP\n            if(tc.y>1.0 || tc.y<0.0 || tc.x>1.0 || tc.x<0.0) colNew.rgb=base.rgb;//vec3(0.0);\n        #endif\n    #endif\n\n\n\n    blendRGBA.rgb=mix( colNew, base ,1.0-blendRGBA.a*am);\n    blendRGBA.a=1.0;\n\n    outColor= blendRGBA;\n\n}",drawimage_vert:"IN vec3 vPosition;\nIN vec2 attrTexCoord;\nIN vec3 attrVertNormal;\n\nUNI mat4 projMatrix;\nUNI mat4 mvMatrix;\n\nUNI float posX;\nUNI float posY;\nUNI float scaleX;\nUNI float scaleY;\nUNI float rotate;\n\nOUT vec2 texCoord;\nOUT vec3 norm;\nOUT mat3 transform;\n\nvoid main()\n{\n   texCoord=attrTexCoord;\n   norm=attrVertNormal;\n\n   #ifdef TEX_TRANSFORM\n        vec3 coordinates=vec3(attrTexCoord.x, attrTexCoord.y,1.0);\n        float angle = radians( rotate );\n        vec2 scale= vec2(scaleX,scaleY);\n        vec2 translate= vec2(posX,posY);\n\n        transform = mat3(   scale.x * cos( angle ), scale.x * sin( angle ), 0.0,\n            - scale.y * sin( angle ), scale.y * cos( angle ), 0.0,\n            - 0.5 * scale.x * cos( angle ) + 0.5 * scale.y * sin( angle ) - 0.5 * translate.x*2.0 + 0.5,  - 0.5 * scale.x * sin( angle ) - 0.5 * scale.y * cos( angle ) - 0.5 * translate.y*2.0 + 0.5, 1.0);\n   #endif\n\n   gl_Position = projMatrix * mvMatrix * vec4(vPosition,  1.0);\n}\n",};
var render=op.inTrigger('render');
var blendMode=CGL.TextureEffect.AddBlendSelect(op,"blendMode");
var amount=op.inValueSlider("amount",1);

var image=op.inTexture("image");
var removeAlphaSrc=op.inValueBool("removeAlphaSrc",false);

var imageAlpha=op.inTexture("imageAlpha");
var alphaSrc=op.inValueSelect("alphaSrc",['alpha channel','luminance','luminance inv']);
var invAlphaChannel=op.inValueBool("invert alpha channel");

const inAspect=op.inValueBool("Aspect Ratio",false);
const inAspectAxis=op.inValueSelect("Stretch Axis",['X','Y'],"X");
const inAspectPos=op.inValueSlider("Position",0.0);
const inAspectCrop=op.inValueBool("Crop",false);


var trigger=op.outTrigger('trigger');

blendMode.set('normal');
var cgl=op.patch.cgl;
var shader=new CGL.Shader(cgl,'drawimage');


imageAlpha.onLinkChanged=updateAlphaPorts;

op.setPortGroup("Mask",[imageAlpha,alphaSrc,invAlphaChannel]);
op.setPortGroup("Aspect Ratio",[inAspect,inAspectPos,inAspectCrop,inAspectAxis]);


removeAlphaSrc.onChange=updateRemoveAlphaSrc;

function updateAlphaPorts()
{
    if(imageAlpha.isLinked())
    {
        removeAlphaSrc.setUiAttribs({greyout:true});
        alphaSrc.setUiAttribs({greyout:false});
        invAlphaChannel.setUiAttribs({greyout:false});
    }
    else
    {
        removeAlphaSrc.setUiAttribs({greyout:false});
        alphaSrc.setUiAttribs({greyout:true});
        invAlphaChannel.setUiAttribs({greyout:true});
    }
}

op.toWorkPortsNeedToBeLinked(image);

shader.setSource(attachments.drawimage_vert,attachments.drawimage_frag);
var textureUniform=new CGL.Uniform(shader,'t','tex',0);
var textureImaghe=new CGL.Uniform(shader,'t','image',1);
var textureAlpha=new CGL.Uniform(shader,'t','imageAlpha',2);

const uniTexAspect=new CGL.Uniform(shader,'f','aspectTex',1);
const uniAspectPos=new CGL.Uniform(shader,'f','aspectPos',inAspectPos);

invAlphaChannel.onChange=function()
{
    if(invAlphaChannel.get()) shader.define('INVERT_ALPHA');
        else shader.removeDefine('INVERT_ALPHA');
};


inAspect.onChange=updateAspectRatio;
inAspectCrop.onChange=updateAspectRatio;
inAspectAxis.onChange=updateAspectRatio;
function updateAspectRatio()
{
    shader.removeDefine('ASPECT_AXIS_X');
    shader.removeDefine('ASPECT_AXIS_Y');

    if(inAspect.get())
    {
        shader.define('ASPECT_RATIO');

        if(inAspectCrop.get()) shader.define('ASPECT_CROP');
            else shader.removeDefine('ASPECT_CROP');

        if(inAspectAxis.get()=="X") shader.define('ASPECT_AXIS_X');
        if(inAspectAxis.get()=="Y") shader.define('ASPECT_AXIS_Y');


        inAspectPos.setUiAttribs({greyout:false});
        inAspectCrop.setUiAttribs({greyout:false});
        inAspectAxis.setUiAttribs({greyout:false});
    }
    else
    {
        shader.removeDefine('ASPECT_RATIO');
        if(inAspectCrop.get()) shader.define('ASPECT_CROP');
            else shader.removeDefine('ASPECT_CROP');

        if(inAspectAxis.get()=="X") shader.define('ASPECT_AXIS_X');
        if(inAspectAxis.get()=="Y") shader.define('ASPECT_AXIS_Y');

        inAspectPos.setUiAttribs({greyout:true});
        inAspectCrop.setUiAttribs({greyout:true});
        inAspectAxis.setUiAttribs({greyout:true});
    }
}




function updateRemoveAlphaSrc()
{
    if(removeAlphaSrc.get()) shader.define('REMOVE_ALPHA_SRC');
        else shader.removeDefine('REMOVE_ALPHA_SRC');
}


alphaSrc.onChange=function()
{
    shader.toggleDefine('ALPHA_FROM_LUMINANCE',alphaSrc.get()=='luminance');
    shader.toggleDefine('ALPHA_FROM_INV_UMINANCE',alphaSrc.get()=='luminance_inv');
};

alphaSrc.set("alpha channel");


{
    //
    // texture flip
    //
    var flipX=op.inValueBool("flip x");
    var flipY=op.inValueBool("flip y");

    flipX.onChange=function()
    {
        if(flipX.get()) shader.define('TEX_FLIP_X');
            else shader.removeDefine('TEX_FLIP_X');
    };

    flipY.onChange=function()
    {
        if(flipY.get()) shader.define('TEX_FLIP_Y');
            else shader.removeDefine('TEX_FLIP_Y');
    };
}

{
    //
    // texture transform
    //

    var doTransform=op.inValueBool("Transform");

    var scaleX=op.inValueSlider("Scale X",1);
    var scaleY=op.inValueSlider("Scale Y",1);

    var posX=op.inValue("Position X",0);
    var posY=op.inValue("Position Y",0);

    var rotate=op.inValue("Rotation",0);

    var inClipRepeat=op.inValueBool("Clip Repeat",false);

    inClipRepeat.onChange=updateClip;
    function updateClip()
    {
        if(inClipRepeat.get()) shader.define('CLIP_REPEAT');
            else shader.removeDefine('CLIP_REPEAT');
    }


    var uniScaleX=new CGL.Uniform(shader,'f','scaleX',scaleX);
    var uniScaleY=new CGL.Uniform(shader,'f','scaleY',scaleY);

    var uniPosX=new CGL.Uniform(shader,'f','posX',posX);
    var uniPosY=new CGL.Uniform(shader,'f','posY',posY);
    var uniRotate=new CGL.Uniform(shader,'f','rotate',rotate);

    doTransform.onChange=updateTransformPorts;
}

function updateTransformPorts()
{
    shader.toggleDefine('TEX_TRANSFORM',doTransform.get());
    if(doTransform.get())
    {
        // scaleX.setUiAttribs({hidePort:false});
        // scaleY.setUiAttribs({hidePort:false});
        // posX.setUiAttribs({hidePort:false});
        // posY.setUiAttribs({hidePort:false});
        // rotate.setUiAttribs({hidePort:false});

        scaleX.setUiAttribs({greyout:false});
        scaleY.setUiAttribs({greyout:false});
        posX.setUiAttribs({greyout:false});
        posY.setUiAttribs({greyout:false});
        rotate.setUiAttribs({greyout:false});
    }
    else
    {
        scaleX.setUiAttribs({greyout:true});
        scaleY.setUiAttribs({greyout:true});
        posX.setUiAttribs({greyout:true});
        posY.setUiAttribs({greyout:true});
        rotate.setUiAttribs({greyout:true});

        // scaleX.setUiAttribs({"hidePort":true});
        // scaleY.setUiAttribs({"hidePort":true});
        // posX.setUiAttribs({"hidePort":true});
        // posY.setUiAttribs({"hidePort":true});
        // rotate.setUiAttribs({"hidePort":true});


    }

    // op.refreshParams();
}

CGL.TextureEffect.setupBlending(op,shader,blendMode,amount);

var amountUniform=new CGL.Uniform(shader,'f','amount',amount);

imageAlpha.onChange=function()
{
    if(imageAlpha.get() && imageAlpha.get().tex)
    {
        shader.define('HAS_TEXTUREALPHA');
    }
    else
    {
        shader.removeDefine('HAS_TEXTUREALPHA');
    }
};

function doRender()
{
    if(!CGL.TextureEffect.checkOpInEffect(op)) return;

    var tex=image.get();
    if(tex && tex.tex && amount.get()>0.0)
    {
        cgl.pushShader(shader);
        cgl.currentTextureEffect.bind();

        const imgTex=cgl.currentTextureEffect.getCurrentSourceTexture();
        cgl.setTexture(0,imgTex.tex );

        uniTexAspect.setValue( 1/(tex.height/tex.width*imgTex.width/imgTex.height));



        cgl.setTexture(1, tex.tex );
        // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, image.get().tex );

        if(imageAlpha.get() && imageAlpha.get().tex)
        {
            cgl.setTexture(2, imageAlpha.get().tex );
            // cgl.gl.bindTexture(cgl.gl.TEXTURE_2D, imageAlpha.get().tex );
        }

        cgl.currentTextureEffect.finish();
        cgl.popShader();
    }

    trigger.trigger();
}

render.onTriggered=doRender;
updateTransformPorts();
updateRemoveAlphaSrc();
updateAlphaPorts();
updateAspectRatio();


};

Ops.Gl.TextureEffects.DrawImage_v2.prototype = new CABLES.Op();
CABLES.OPS["f94b5136-61fd-4558-8348-e7c8db5a6348"]={f:Ops.Gl.TextureEffects.DrawImage_v2,objName:"Ops.Gl.TextureEffects.DrawImage_v2"};




// **************************************************************
// 
// Ops.Math.Divide
// 
// **************************************************************

Ops.Math.Divide = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    number1 = op.inValueFloat("number1",1),
    number2 = op.inValueFloat("number2",2),
    result = op.outValue("result");

number1.onChange=number2.onChange=exec;
exec();

function exec()
{
    result.set( number1.get() / number2.get() );
}



};

Ops.Math.Divide.prototype = new CABLES.Op();
CABLES.OPS["86fcfd8c-038d-4b91-9820-a08114f6b7eb"]={f:Ops.Math.Divide,objName:"Ops.Math.Divide"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.LumaKey
// 
// **************************************************************

Ops.Gl.TextureEffects.LumaKey = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={lumakey_frag:"IN vec2 texCoord;\n// UNI sampler2D tex;\nUNI float threshhold;\nUNI sampler2D text;\n\nvoid main()\n{\n   vec4 col = texture(text, texCoord );\n\n   float gray = dot(vec3(0.2126,0.7152,0.0722), col.rgb );\n\n   #ifndef INVERT\n       if(gray < threshhold) col.r=col.g=col.b=col.a=0.0;\n       #ifdef BLACKWHITE\n           else col.r=col.g=col.b=col.a=1.0;\n       #endif\n   #endif\n\n   #ifdef INVERT\n       if(gray > threshhold) col.r=col.g=col.b=col.a=0.0;\n       #ifdef BLACKWHITE\n           else col.r=col.g=col.b=col.a=1.0;\n       #endif\n   #endif\n\n   outColor= col;\n}",};
const
    render=op.inTrigger('render'),
    trigger=op.outTrigger('trigger'),
    inInvert=op.inValueBool("Invert"),
    inBlackWhite=op.inValueBool("Black White"),
    threshold=op.inValueSlider("Threshold",0.5);

const cgl=op.patch.cgl;
const shader=new CGL.Shader(cgl,'lumakey');

shader.setSource(shader.getDefaultVertexShader(),attachments.lumakey_frag);
const textureUniform=new CGL.Uniform(shader,'t','tex',0);
const unThreshold=new CGL.Uniform(shader,'f','threshhold',threshold);

inBlackWhite.onChange=function()
{
    if(inBlackWhite.get()) shader.define('BLACKWHITE');
        else shader.removeDefine('BLACKWHITE');
};

inInvert.onChange=function()
{
    if(inInvert.get()) shader.define('INVERT');
        else shader.removeDefine('INVERT');
};

render.onTriggered=function()
{
    if(!CGL.TextureEffect.checkOpInEffect(op)) return;

    cgl.pushShader(shader);

    cgl.currentTextureEffect.bind();
    cgl.setTexture(0, cgl.currentTextureEffect.getCurrentSourceTexture().tex );

    cgl.currentTextureEffect.finish();

    cgl.popShader();
    trigger.trigger();
};


};

Ops.Gl.TextureEffects.LumaKey.prototype = new CABLES.Op();
CABLES.OPS["2175ae00-989c-4045-a52e-742d5c30bf4e"]={f:Ops.Gl.TextureEffects.LumaKey,objName:"Ops.Gl.TextureEffects.LumaKey"};




// **************************************************************
// 
// Ops.Ui.Comment
// 
// **************************************************************

Ops.Ui.Comment = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
op.inTitle=op.inString("title",' ');
op.text=op.inTextarea("text");

op.text.set(' ');
op.name=' ';

op.inTitle.set('new comment');

op.inTitle.onChange=update;
op.text.onChange=update;
op.onLoaded=update;


update();

function update()
{
    if(CABLES.UI)
    {
        op.uiAttr(
            {
                'comment_title':op.inTitle.get(),
                'comment_text':op.text.get()
            });

        op.name=op.inTitle.get();

    }
}




};

Ops.Ui.Comment.prototype = new CABLES.Op();
CABLES.OPS["9de0c04f-666b-47cd-9722-a8cf36ab4720"]={f:Ops.Ui.Comment,objName:"Ops.Ui.Comment"};




// **************************************************************
// 
// Ops.Ui.Comment_v2
// 
// **************************************************************

Ops.Ui.Comment_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    inTitle=op.inString("title",'New comment'),
    inText=op.inTextarea("text")
    ;

op.init=
    inTitle.onChange=
    inText.onChange=
    op.onLoaded=update;

update();

function update()
{
    if(CABLES.UI)
    {
        op.uiAttr(
            {
                'comment_title':inTitle.get(),
                'comment_text':inText.get()
            });

        op.name=inTitle.get();
    }
}




};

Ops.Ui.Comment_v2.prototype = new CABLES.Op();
CABLES.OPS["93492eeb-bf35-4a62-98f7-d85b0b79bfe5"]={f:Ops.Ui.Comment_v2,objName:"Ops.Ui.Comment_v2"};




// **************************************************************
// 
// Ops.Gl.TextureEffects.Color
// 
// **************************************************************

Ops.Gl.TextureEffects.Color = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={color_frag:"IN vec2 texCoord;\nUNI sampler2D tex;\nUNI float r;\nUNI float g;\nUNI float b;\nUNI float amount;\n\n#ifdef MASK\n    UNI sampler2D mask;\n#endif\n\n{{CGL.BLENDMODES}}\n\nvoid main()\n{\n    vec4 col=vec4(r,g,b,1.0);\n    vec4 base=texture(tex,texCoord);\n\n    float am=amount;\n    #ifdef MASK\n        float msk=texture(mask,texCoord).r;\n        #ifdef INVERTMASK\n            msk=1.0-msk;\n        #endif\n        am*=1.0-msk;\n    #endif\n\n    outColor= cgl_blend(base,col,am);\n    outColor.a*=base.a;\n\n}\n",};
const
    render = op.inTrigger("render"),
    blendMode = CGL.TextureEffect.AddBlendSelect(op, "Blend Mode", "normal"),
    amount = op.inValueSlider("Amount", 1),
    inMask = op.inTexture("Mask"),
    inMaskInvert = op.inValueBool("Mask Invert"),
    r = op.inValueSlider("r", Math.random()),
    g = op.inValueSlider("g", Math.random()),
    b = op.inValueSlider("b", Math.random()),
    trigger = op.outTrigger("trigger");

r.setUiAttribs({ "colorPick": true });

op.setPortGroup("Color", [r, g, b]);

const TEX_SLOT = 0;
const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, "textureeffect color");

const srcFrag = attachments.color_frag || "";

shader.setSource(shader.getDefaultVertexShader(), srcFrag);

const
    textureUniform = new CGL.Uniform(shader, "t", "tex", TEX_SLOT),
    makstextureUniform = new CGL.Uniform(shader, "t", "mask", 1),
    uniformR = new CGL.Uniform(shader, "f", "r", r),
    uniformG = new CGL.Uniform(shader, "f", "g", g),
    uniformB = new CGL.Uniform(shader, "f", "b", b),
    uniformAmount = new CGL.Uniform(shader, "f", "amount", amount);

inMask.onChange = function ()
{
    if (inMask.get())shader.define("MASK");
    else shader.removeDefine("MASK");
};

inMaskInvert.onChange = function ()
{
    if (inMaskInvert.get())shader.define("INVERTMASK");
    else shader.removeDefine("INVERTMASK");
};

CGL.TextureEffect.setupBlending(op, shader, blendMode, amount);

render.onTriggered = function ()
{
    if (!CGL.TextureEffect.checkOpInEffect(op)) return;

    cgl.pushShader(shader);
    cgl.currentTextureEffect.bind();

    cgl.setTexture(TEX_SLOT, cgl.currentTextureEffect.getCurrentSourceTexture().tex);
    if (inMask.get()) cgl.setTexture(1, inMask.get().tex);

    cgl.currentTextureEffect.finish();
    cgl.popShader();

    trigger.trigger();
};


};

Ops.Gl.TextureEffects.Color.prototype = new CABLES.Op();
CABLES.OPS["c0acfc80-16f9-4f17-978d-bad650f3ed1c"]={f:Ops.Gl.TextureEffects.Color,objName:"Ops.Gl.TextureEffects.Color"};


window.addEventListener('load', function(event) {
CABLES.jsLoaded=new Event('CABLES.jsLoaded');
document.dispatchEvent(CABLES.jsLoaded);
});
