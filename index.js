const $ = (selector) => document.querySelector(selector)
const $$ = (selector) => document.querySelectorAll(selector)

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

// States
const context = $canvas.getContext('2d')
let isDrawing = false
let isShiftDown = false
let startX, startY
let lastX = 0
let lastY = 0
let mode = MODES.DRAW
let imageData

// EVENTS
$canvas.addEventListener('mousedown', startDrawing)
$canvas.addEventListener('mouseup', stopDrawing)
$canvas.addEventListener('mouseleave', stopDrawing)
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

document.addEventListener('keydown', handleKeyDown)
document.addEventListener('keyup', handleKeyUp)

// Handlers
function handleKeyUp(ev) {
    if (ev.key === 'Shift') isShiftDown = false
}

function handleKeyDown(ev) {
    isShiftDown = ev.key === 'Shift'
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
        clearCanvas()
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

    // Set initial coords
    [startX, startY] = [offsetX, offsetY];
    [lastX, lastY] = [offsetX, offsetY];

    imageData = context.getImageData(0, 0, $canvas.width, $canvas.height)
    $canvas.addEventListener('mousemove', draw)
}

function clearCanvas() {
    context.clearRect(0, 0, $canvas.width, $canvas.height)
}

function stopDrawing() {
    isDrawing = false
    $canvas.removeEventListener('mousemove', draw)
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

    // BREAK
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
        return
    }
}

function saveCanvas() {
    const imageData = context.getImageData(0, 0, $canvas.width, $canvas.height)

    const canvasSnapshot = document.createElement('canvas')
    canvasSnapshot.width = $canvas.width
    canvasSnapshot.height = $canvas.height
    const canvasSnapshotContext = canvasSnapshot.getContext('2d')

    canvasSnapshotContext.putImageData(imageData, 0, 0)

    const dataURL = canvasSnapshot.toDataURL('image/png')

    // Create a link element to trigger the download
    const downloadLink = document.createElement('a')
    downloadLink.href = dataURL
    downloadLink.download = 'my_masterpiece.png'
}

setMode(MODES.LINE)

if (typeof window.EyeDropper !== "undefined") {
    $pickerButton.style.display = 'block'
}