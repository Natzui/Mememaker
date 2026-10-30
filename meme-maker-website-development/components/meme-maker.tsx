"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ChangeEvent, CSSProperties, DragEvent } from "react"
import {
  ArrowDownToLine,
  Check,
  FileImage,
  ImagePlus,
  LockKeyhole,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  Sparkles,
  Type,
  Upload,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const MAX_FILE_SIZE = 25 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 4096
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const lines: string[] = []
  let currentLine = ""

  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    if (context.measureText(word).width > maxWidth) {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = ""
      }

      let fragment = ""
      for (const character of Array.from(word)) {
        const candidate = fragment + character
        if (fragment && context.measureText(candidate).width > maxWidth) {
          lines.push(fragment)
          fragment = character
        } else {
          fragment = candidate
        }
      }
      currentLine = fragment
      continue
    }

    const candidate = currentLine ? `${currentLine} ${word}` : word
    if (currentLine && context.measureText(candidate).width > maxWidth) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = candidate
    }
  }

  if (currentLine) lines.push(currentLine)
  return lines
}

function drawTextBlock(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  baseFontSize: number,
  position: "top" | "bottom",
) {
  const maxWidth = width * 0.9
  const availableHeight = height * 0.34
  let fontSize = baseFontSize
  let lines: string[] = []

  const setFont = () => {
    context.font = `900 ${fontSize}px Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif`
    lines = wrapText(context, text, maxWidth)
  }

  setFont()
  while (
    lines.length > 1 &&
    lines.length * fontSize * 1.08 > availableHeight &&
    fontSize > 14
  ) {
    fontSize = Math.max(14, fontSize * 0.88)
    setFont()
  }

  const lineHeight = fontSize * 1.08
  const margin = Math.max(fontSize * 0.48, height * 0.035)
  const startY =
    position === "top"
      ? margin
      : height - margin - lines.length * lineHeight

  context.font = `900 ${fontSize}px Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif`
  context.textAlign = "center"
  context.textBaseline = "top"
  context.lineJoin = "round"
  context.lineCap = "round"
  context.lineWidth = Math.max(2, fontSize * 0.1)
  context.strokeStyle = "rgba(14, 13, 12, 0.96)"
  context.fillStyle = "#ffffff"

  lines.forEach((line, index) => {
    const y = startY + index * lineHeight
    context.strokeText(line, width / 2, y, maxWidth)
    context.fillText(line, width / 2, y, maxWidth)
  })
}

export function MemeMaker() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const sourceUrlRef = useRef<string | null>(null)
  const loadSequenceRef = useRef(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [filename, setFilename] = useState("")
  const [imageDimensions, setImageDimensions] = useState("")
  const [topText, setTopText] = useState("")
  const [bottomText, setBottomText] = useState("")
  const [fontSize, setFontSize] = useState(64)
  const [uppercase, setUppercase] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const [isDarkMode, setIsDarkMode] = useState(false)

  const clearEditor = useCallback((notice = "") => {
    loadSequenceRef.current += 1
    if (sourceUrlRef.current) {
      URL.revokeObjectURL(sourceUrlRef.current)
      sourceUrlRef.current = null
    }
    imageRef.current = null
    setPreviewUrl(null)
    setFilename("")
    setImageDimensions("")
    setTopText("")
    setBottomText("")
    setFontSize(64)
    setUppercase(true)
    setIsDragging(false)
    setIsLoading(false)
    setIsDownloading(false)
    setError("")
    setStatus(notice)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  useEffect(
    () => () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
    },
    [],
  )

  useEffect(() => {
    const image = imageRef.current
    const canvas = canvasRef.current
    if (!image || !canvas) return

    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
    )
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) return

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = "high"
    context.drawImage(image, 0, 0, width, height)

    const scaledFontSize = Math.max(18, fontSize * (width / 1000))
    const renderText = (value: string, position: "top" | "bottom") => {
      const text = uppercase ? value.toLocaleUpperCase() : value
      if (text.trim()) {
        drawTextBlock(context, text, width, height, scaledFontSize, position)
      }
    }

    renderText(topText, "top")
    renderText(bottomText, "bottom")
  }, [previewUrl, topText, bottomText, fontSize, uppercase])

  const loadImage = useCallback((file: File) => {
    const requestId = ++loadSequenceRef.current
    setError("")
    setStatus("")

    if (!ACCEPTED_TYPES.has(file.type)) {
      setIsLoading(false)
      setError("Choose a PNG, JPG, or WebP image to get started.")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setIsLoading(false)
      setError("That image is larger than 25 MB. Choose a smaller file.")
      return
    }

    setIsLoading(true)
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.decoding = "async"

    image.onload = () => {
      if (requestId !== loadSequenceRef.current) {
        URL.revokeObjectURL(objectUrl)
        return
      }

      const previousUrl = sourceUrlRef.current
      sourceUrlRef.current = objectUrl
      imageRef.current = image
      setPreviewUrl(objectUrl)
      setFilename(file.name)
      setImageDimensions(`${image.naturalWidth} × ${image.naturalHeight}`)
      setIsLoading(false)
      if (previousUrl) URL.revokeObjectURL(previousUrl)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      if (requestId !== loadSequenceRef.current) return
      setIsLoading(false)
      setError("This image could not be opened. Try another PNG, JPG, or WebP.")
    }

    image.src = objectUrl
  }, [])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) loadImage(file)
    event.target.value = ""
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (isDownloading) return
    const file = event.dataTransfer.files?.[0]
    if (file) loadImage(file)
  }

  const handleDownload = async () => {
    const canvas = canvasRef.current
    if (!canvas || !previewUrl || isDownloading) return

    setIsDownloading(true)
    setError("")

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result)
          else reject(new Error("The meme could not be generated."))
        }, "image/png")
      })

      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      const safeName = filename
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase()
      anchor.href = downloadUrl
      anchor.download = `${safeName || "meme"}.png`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500)

      clearEditor("Your meme is downloaded. The editor has cleared its working copy.")
    } catch {
      setIsDownloading(false)
      setError("Could not generate the download. Please try again.")
    }
  }

  const openFilePicker = () => fileInputRef.current?.click()
  const sliderStyle = {
    "--slider-progress": `${((fontSize - 36) / (88 - 36)) * 100}%`,
  } as CSSProperties

  return (
    <div className={isDarkMode ? "maker-shell theme-dark" : "maker-shell"}>
      <div className="header-border">
        <header className="site-header">
          <a className="brand" href="/" aria-label="FastMeme home">
            <span className="brand-mark" aria-hidden="true">
              <Sparkles />
            </span>
            <span className="brand-wordmark">
              Fast<span>Meme</span>
            </span>
          </a>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="theme-toggle"
            aria-pressed={isDarkMode}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setIsDarkMode((current) => !current)}
          >
            {isDarkMode ? (
              <Sun data-icon="inline-start" aria-hidden="true" />
            ) : (
              <Moon data-icon="inline-start" aria-hidden="true" />
            )}
            <span>{isDarkMode ? "Light mode" : "Dark mode"}</span>
          </Button>
        </header>
      </div>

      <main className="maker-main">
        <section className="intro-section" aria-labelledby="page-title">
          <div className="intro-copy">
            <h1 id="page-title">
              Make a little <span>meme magic.</span>
            </h1>
            <p>Your photo. Your punchline.</p>
          </div>

        </section>

        <div className="maker-grid">
          <aside className="controls-panel" aria-label="Meme editor controls">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">WORKSPACE</span>
                <h2>Make it yours</h2>
              </div>
              <span className="live-pill"><span /> LIVE</span>
            </div>

            <div className="panel-content">
              <section className="editor-section" aria-labelledby="image-step-title">
                <div className="section-title-row">
                  <div>
                    <h3 id="image-step-title">Choose your image</h3>
                    <p>Start with a photo from your device</p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  className="visually-hidden"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  aria-label="Choose a PNG, JPG, or WebP image"
                  disabled={isDownloading}
                />

                {previewUrl ? (
                  <div className="selected-file">
                    <span className="selected-file-icon"><FileImage aria-hidden="true" /></span>
                    <span className="selected-file-copy">
                      <strong title={filename}>{filename}</strong>
                      <span>{imageDimensions} px</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="replace-button"
                      type="button"
                      onClick={openFilePicker}
                      disabled={isDownloading}
                    >
                      Replace
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="clear-button"
                      type="button"
                      aria-label="Remove image and clear editor"
                      onClick={() => clearEditor()}
                      disabled={isDownloading}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className={`upload-zone${isDragging ? " is-dragging" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault()
                      if (!isDownloading) setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <span className="upload-illustration" aria-hidden="true">
                      {isLoading ? <RefreshCw className="spin-icon" /> : <ImagePlus />}
                    </span>
                    <strong>{isLoading ? "Opening your image…" : "Drop it like it’s hot"}</strong>
                    <span className="upload-caption">
                      {isLoading ? "Getting your canvas ready" : "or pick a photo from your device"}
                    </span>
                    <Button
                      type="button"
                      className="choose-button"
                      onClick={openFilePicker}
                      disabled={isLoading || isDownloading}
                    >
                      <Upload data-icon="inline-start" aria-hidden="true" />
                      Choose an image
                    </Button>
                    <span className="file-limit">PNG, JPG, WebP <span>·</span> up to 25 MB</span>
                  </div>
                )}
              </section>

              <div className="section-rule" />

              <section className="editor-section text-editor" aria-labelledby="text-step-title">
                <div className="section-title-row">
                  <div>
                    <h3 id="text-step-title">Add your punchline</h3>
                    <p>Keep it short. Make it count.</p>
                  </div>
                </div>

                <label className="field-label" htmlFor="top-text">
                  <span>TOP TEXT</span>
                  <span className="character-count">{topText.length}/120</span>
                </label>
                <input
                  id="top-text"
                  className="text-input"
                  type="text"
                  maxLength={120}
                  placeholder="WHEN THE COFFEE HITS…"
                  value={topText}
                  onChange={(event) => setTopText(event.target.value)}
                  disabled={!previewUrl || isDownloading}
                />

                <label className="field-label bottom-label" htmlFor="bottom-text">
                  <span>BOTTOM TEXT</span>
                  <span className="character-count">{bottomText.length}/120</span>
                </label>
                <input
                  id="bottom-text"
                  className="text-input"
                  type="text"
                  maxLength={120}
                  placeholder="…AND THE GROUP CHAT KNOWS"
                  value={bottomText}
                  onChange={(event) => setBottomText(event.target.value)}
                  disabled={!previewUrl || isDownloading}
                />

                <div className="type-controls">
                  <label className="size-label" htmlFor="text-size">
                    <span className="type-label"><Type aria-hidden="true" /> TEXT SIZE</span>
                    <span className="size-value">{fontSize}px</span>
                  </label>
                  <input
                    id="text-size"
                    className="size-slider"
                    style={sliderStyle}
                    type="range"
                    min="36"
                    max="88"
                    step="2"
                    value={fontSize}
                    onChange={(event) => setFontSize(Number(event.target.value))}
                    disabled={!previewUrl || isDownloading}
                    aria-label="Meme text size"
                  />
                  <label className="uppercase-toggle">
                    <input
                      type="checkbox"
                      checked={uppercase}
                      onChange={(event) => setUppercase(event.target.checked)}
                      disabled={!previewUrl || isDownloading}
                    />
                    <span className="custom-checkbox" aria-hidden="true">
                      <Check />
                    </span>
                    <span>Classic uppercase</span>
                  </label>
                </div>
              </section>

              {error && <div className="error-message" role="alert">{error}</div>}
              {status && (
                <div className="success-message" role="status">
                  <Check aria-hidden="true" />
                  <span>{status}</span>
                </div>
              )}

              <Button
                type="button"
                size="lg"
                className="download-button"
                onClick={handleDownload}
                disabled={!previewUrl || isDownloading}
              >
                {isDownloading ? "Preparing your meme…" : "Download your meme"}
                <ArrowDownToLine data-icon="inline-end" aria-hidden="true" />
              </Button>
              <p className="no-watermark"><Sparkles aria-hidden="true" /> No watermark. Just good taste.</p>

              <div className="privacy-card">
                <span className="privacy-card-icon"><ShieldCheck aria-hidden="true" /></span>
                <div>
                  <strong>Your photo stays yours</strong>
                  <p>
                    It never leaves this browser. After download, the editor clears its working copy automatically.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <section className="preview-panel" aria-labelledby="preview-title">
            <div className="preview-heading">
              <div>
                <h2 id="preview-title">Live preview</h2>
              </div>
              <span className={`preview-status${previewUrl ? " is-ready" : ""}`}>
                <span /> {previewUrl ? "AUTO-GENERATED" : "WAITING FOR IMAGE"}
              </span>
            </div>

            <div
              className={`preview-stage${isDragging ? " is-dragging" : ""}${previewUrl ? " has-image" : ""}`}
              onDragOver={(event) => {
                event.preventDefault()
                if (!isDownloading) setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {previewUrl ? (
                <div className="canvas-frame">
                  <canvas
                    ref={canvasRef}
                    className="meme-canvas"
                    role="img"
                    aria-label={`Meme preview. Top text: ${topText || "none"}. Bottom text: ${bottomText || "none"}.`}
                  />
                </div>
              ) : (
                <div className="empty-preview">
                  <div className="empty-art" aria-hidden="true">
                    <span className="art-sparkle sparkle-one"><Sparkles /></span>
                    <span className="art-sparkle sparkle-two"><Sparkles /></span>
                    <span className="art-image-icon"><ImagePlus /></span>
                    <span className="art-caption">YOUR IMAGE GOES HERE</span>
                  </div>
                  <h3>Your canvas is calling</h3>
                  <p>Upload a photo and your meme will appear right here.</p>
                  <Button type="button" variant="outline" size="sm" onClick={openFilePicker} disabled={isLoading || isDownloading}>
                    <Upload data-icon="inline-start" aria-hidden="true" />
                    Pick an image
                  </Button>
                  <span className="drop-tip">Or drag and drop a photo anywhere on this canvas</span>
                </div>
              )}
            </div>

            <div className="preview-footer">
              <span><span className="footer-dot" /> {previewUrl ? "Your changes appear instantly" : "PNG, JPG, or WebP · up to 25 MB"}</span>
              <span>{previewUrl ? `${imageDimensions} px` : "No account. No upload. No fuss."}</span>
            </div>
          </section>
        </div>

        <footer className="site-footer">
          <span><LockKeyhole aria-hidden="true" /> Your image never touches a server.</span>
        </footer>
      </main>
    </div>
  )
}
