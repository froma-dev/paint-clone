const $ = (selector) => document.querySelector(selector)

const MODES = {
    DRAW: 'draw',
    ERASE: 'erase',
    RECTANGLE: 'rectangle',
    RECTANGLE_FILL: 'rectangleFill',
    ELLIPSE: 'ellipse',
    ELLIPSE_FILL: 'ellipseFill',
    PICKER: 'picker',
    CLEAR: 'clear',
    LINE: 'line',
}

// Elements
const $canvas = $('#canvas')
const $colorPicker = $('#color-picker')
const $drawButton = $('#draw-btn')
const $rectangleButton = $('#rectangle-btn')
const $rectangleFillButton = $('#rectangle-fill-btn')
const $ellipseButton = $('#ellipse-btn')
const $ellipseFillButton = $('#ellipse-fill-btn')
const $eraseButton = $('#erase-btn')
const $pickerButton = $('#picker-btn')
const $clearButton = $('#clear-btn')
const $lineButton = $('#line-btn')
const $coords = $('#coords')
const $undoButton = $('#ctrl-z')
const $redoButton = $('#ctrl-y')
const $saveButton = $('#save')

// States
const context = $canvas.getContext('2d')
let isDrawing = false
let isShiftDown = false
let isControlDown = false
let startX, startY
let lastX = 0
let lastY = 0
let mode = MODES.DRAW
let imageData
const controlZValues = []
const controlYValues = []

// EVENTS
$canvas.addEventListener('mousedown', startDrawingCursor)
$canvas.addEventListener('mouseup', stopDrawing)
$canvas.addEventListener('touchstart', startDrawingTouch)
$canvas.addEventListener('touchend', stopDrawing)
$canvas.addEventListener('mouseleave', stopDrawing)
$canvas.addEventListener('touchcancel', stopDrawing)
$canvas.addEventListener('mousemove', updateCoords)
$canvas.addEventListener('touchmove', updateCoordsTouch)
$canvas.addEventListener('mouseleave', clearCoords)
$colorPicker.addEventListener('change', changeColor)

$rectangleButton.addEventListener('click', () => setMode(MODES.RECTANGLE))
$rectangleFillButton.addEventListener('click', () => setMode(MODES.RECTANGLE_FILL))
$ellipseButton.addEventListener('click', () => setMode(MODES.ELLIPSE))
$ellipseFillButton.addEventListener('click', () => setMode(MODES.ELLIPSE_FILL))
$drawButton.addEventListener('click', () => setMode(MODES.DRAW))
$eraseButton.addEventListener('click', () => setMode(MODES.ERASE))
$pickerButton.addEventListener('click', () => setMode(MODES.PICKER))
$clearButton.addEventListener('click', () => setMode(MODES.CLEAR))
$lineButton.addEventListener('click', () => setMode(MODES.LINE))

// MENU
$undoButton.addEventListener('click', controlZ)
$redoButton.addEventListener('click', controlY)
$saveButton.addEventListener('click', saveCanvas)

document.addEventListener('keydown', handleKeyDown)
document.addEventListener('keyup', handleKeyUp)

// Handlers
function updateCoordsTouch(ev) {
    const coords = getTouchCoords(ev.touches[0])
    updateCoords(coords)
}

function getTouchCoords(touch) {
    let startX = touch.clientX - $canvas.offsetLeft + window.scrollX;
    let startY = touch.clientY - $canvas.offsetTop + window.scrollY;

    return {
        offsetX: Math.round(startX),
        offsetY: Math.round(startY),
    }
}

function updateCoords(ev) {
    let {offsetX, offsetY} = ev
    if (offsetX < 0) offsetX = 0
    if (offsetY < 0) offsetY = 0

    $coords.innerText = `${offsetX},${offsetY}`
}

function clearCoords(ev) {
    $coords.innerText = ''
}

function handleKeyUp(ev) {
    if (ev.key === 'Shift') isShiftDown = false
    if (ev.key === 'Control' || ev.key === 'Meta') isControlDown = false
}

function controlZ() {
    if (controlZValues.length > 0) {
        controlYValues.push(getCurrentImageData())
        context.putImageData(controlZValues.pop(), 0, 0)
    }
}

function controlY() {
    if (controlYValues.length > 0) {
        controlZValues.push(getCurrentImageData())
        context.putImageData(controlYValues.pop(), 0, 0)
    }
}

function handleKeyDown(ev) {
    isShiftDown = ev.key === 'Shift'

    if (!isControlDown) {
        isControlDown = ev.key === 'Control' || ev.key === 'Meta'
    } else {
        if (ev.key === 'z') controlZ()
        else if (ev.key === 'y') controlY()
    }
}

async function setMode(newMode) {
    let previousMode = mode
    mode = newMode
    $('button.active')?.classList.remove('active')

    if (mode === MODES.DRAW) {
        $drawButton.classList.add('active')
        $canvas.style.cursor = 'crosshair'
        context.lineWidth = 2
        context.globalCompositeOperation = 'source-over'
        return
    }

    if (mode === MODES.RECTANGLE) {
        $rectangleButton.classList.add('active')
        $canvas.style.cursor = 'nw-resize'
        context.lineWidth = 2
        context.globalCompositeOperation = 'source-over'
        return
    }

    if (mode === MODES.ELLIPSE) {
        $ellipseButton.classList.add('active')
        $canvas.style.cursor = 'nw-resize'
        context.lineWidth = 2
        context.globalCompositeOperation = 'source-over'
        return
    }

    if (mode === MODES.ELLIPSE_FILL) {
        const {value} = $colorPicker
        context.fillStyle = value
        $ellipseFillButton.classList.add('active')
        $canvas.style.cursor = 'nw-resize'
        context.lineWidth = 2
        context.globalCompositeOperation = 'source-over'
        return
    }

    if (mode === MODES.LINE) {
        context.lineWidth = 2
        $lineButton.classList.add('active')
        return
    }

    if (mode === MODES.ERASE) {
        $eraseButton.classList.add('active')
        context.lineWidth = 6
        context.globalCompositeOperation = 'destination-out'
        return
    }

    if (mode === MODES.RECTANGLE_FILL) {
        const {value} = $colorPicker
        $rectangleFillButton.classList.add('active')
        $canvas.style.cursor = 'nw-resize'
        context.lineWidth = 2
        context.fillStyle = value
        context.globalCompositeOperation = 'source-over'
        return
    }

    if (mode === MODES.PICKER) {
        $pickerButton.classList.add('active')
        const eyeDropper = new window.EyeDropper()

        try {
            const result = await eyeDropper.open()
            const {sRGBHex} = result

            context.strokeStyle = sRGBHex
            $colorPicker.value = sRGBHex
            setMode(previousMode)
        } catch (e) {

        }
        return
    }

    if (mode === MODES.CLEAR) {
        if (controlZValues.length > 0) clearCanvas()
        setMode(MODES.DRAW)
    }
}

function changeColor(ev) {
    const {value} = $colorPicker
    context.strokeStyle = context.fillStyle = value
}

function startDrawing(ev) {
    isDrawing = true
    const {offsetX, offsetY} = ev;

    [startX, startY] = [offsetX, offsetY];
    [lastX, lastY] = [offsetX, offsetY];

    imageData = getCurrentImageData()
    controlZValues.push(imageData)
}

function startDrawingCursor(ev) {
    startDrawing(ev)
    $canvas.addEventListener('mousemove', draw)
}

function startDrawingTouch(ev) {
    const coords = getTouchCoords(ev.touches[0])
    startDrawing(coords)
    $canvas.addEventListener('touchmove', drawTouch)
    ev.preventDefault()
}

function clearCanvas() {
    controlZValues.push(getCurrentImageData())
    context.clearRect(0, 0, $canvas.width, $canvas.height)
}

function stopDrawing() {
    isDrawing = false
    $canvas.removeEventListener('mousemove', draw)
    $canvas.removeEventListener('touchmove', drawTouch)
}

function drawTouch(ev) {
    const coords = getTouchCoords(ev.touches[0])
    ev.preventDefault()
    draw(coords)
}

function draw(ev) {
    if (!isDrawing) return
    const {offsetX, offsetY} = ev

    if (mode === MODES.DRAW || mode === MODES.ERASE) {
        context.beginPath()
        context.moveTo(lastX, lastY)
        context.lineTo(offsetX, offsetY)
        context.stroke()

        ;[lastX, lastY] = [offsetX, offsetY]
        return
    }

    if (mode === MODES.LINE) {
        context.putImageData(imageData, 0, 0)
        context.beginPath()
        context.moveTo(startX, startY)
        context.lineTo(offsetX, offsetY)
        context.stroke()

        ;[lastX, lastY] = [offsetX, offsetY]
        return
    }

    if (mode === MODES.RECTANGLE || mode === MODES.ELLIPSE || mode === MODES.RECTANGLE_FILL || mode === MODES.ELLIPSE_FILL) {
        context.putImageData(imageData, 0, 0)
        let width = offsetX - startX
        let height = offsetY - startY
        let startAngle = 0
        let endAngle = 2 * Math.PI

        if (isShiftDown) {
            const sideLength = Math.min(
                Math.abs(width),
                Math.abs(height)
            )

            width = width > 0 ? sideLength : -sideLength
            height = height > 0 ? sideLength : -sideLength
        }

        context.beginPath()
        if (mode === MODES.RECTANGLE)
            context.strokeRect(startX, startY, width, height)
        else if (mode === MODES.ELLIPSE) {
            context.ellipse(startX, startY, Math.abs(width), Math.abs(height), 0, startAngle, endAngle)
            context.stroke()
        } else if (mode === MODES.RECTANGLE_FILL) {
            context.fillRect(startX, startY, width, height)
        } else if (mode === MODES.ELLIPSE_FILL) {
            context.ellipse(startX, startY, Math.abs(width), Math.abs(height), 0, startAngle, endAngle)
            context.fill()
        }
    }
}

function getCurrentImageData() {
    return context.getImageData(0, 0, $canvas.width, $canvas.height)
}

function saveCanvas() {
    $canvas.toBlob((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        const downloadLink = document.createElement('a')

        downloadLink.href = blobUrl
        downloadLink.download = 'masterpiece.webp'
        downloadLink.click()

        URL.revokeObjectURL(blobUrl)
    }, 'image/webp')
}

setMode(MODES.DRAW)

if (typeof window.EyeDropper === "undefined") {
    $pickerButton.setAttribute('disabled', 'true')
}