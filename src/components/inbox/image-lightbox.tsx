"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import {
  Download,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react"

interface ImageLightboxProps {
  src: string
  alt?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageLightbox({
  src,
  alt,
  open,
  onOpenChange,
}: ImageLightboxProps) {
  const [scale, setScale] = React.useState(1)
  const [translateX, setTranslateX] = React.useState(0)
  const [translateY, setTranslateY] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const dragOrigin = React.useRef({ x: 0, y: 0 })
  const translateOrigin = React.useRef({ x: 0, y: 0 })

  // Reset zoom/pan state when the dialog closes
  React.useEffect(() => {
    if (!open) {
      setScale(1)
      setTranslateX(0)
      setTranslateY(0)
      setIsDragging(false)
    }
  }, [open])

  const clampScale = (value: number) => Math.min(5, Math.max(1, value))

  const handleWheel = React.useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.2 : 0.2
      setScale((prev) => {
        const next = clampScale(prev + delta)
        // Reset translation when zooming back to 1
        if (next <= 1) {
          setTranslateX(0)
          setTranslateY(0)
        }
        return next
      })
    },
    []
  )

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (scale <= 1) return
      e.preventDefault()
      setIsDragging(true)
      dragOrigin.current = { x: e.clientX, y: e.clientY }
      translateOrigin.current = { x: translateX, y: translateY }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [scale, translateX, translateY]
  )

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      const dx = e.clientX - dragOrigin.current.x
      const dy = e.clientY - dragOrigin.current.y
      setTranslateX(translateOrigin.current.x + dx)
      setTranslateY(translateOrigin.current.y + dy)
    },
    [isDragging]
  )

  const handlePointerUp = React.useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleZoomIn = React.useCallback(() => {
    setScale((prev) => clampScale(prev + 0.5))
  }, [])

  const handleZoomOut = React.useCallback(() => {
    setScale((prev) => {
      const next = clampScale(prev - 0.5)
      if (next <= 1) {
        setTranslateX(0)
        setTranslateY(0)
      }
      return next
    })
  }, [])

  const handleReset = React.useCallback(() => {
    setScale(1)
    setTranslateX(0)
    setTranslateY(0)
  }, [])

  const handleDownload = React.useCallback(async () => {
    const filename = deriveFilename(src)

    if (src.startsWith("blob:")) {
      // The blob URL is owned by MediaImage — don't revoke it.
      // Just trigger the download directly.
      const a = document.createElement("a")
      a.href = src
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      return
    }

    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in new tab
      window.open(src, "_blank")
    }
  }, [src])

  const cursorClass =
    scale <= 1
      ? "cursor-zoom-in"
      : isDragging
        ? "cursor-grabbing"
        : "cursor-grab"

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-200"
        />
        <Dialog.Popup
          className="fixed inset-0 z-50 flex items-center justify-center outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-200"
        >
          {/* Close button — top right */}
          <Dialog.Close
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </Dialog.Close>

          {/* Image container */}
          <div
            className={`flex h-full w-full items-center justify-center overflow-hidden p-8 ${cursorClass}`}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt ?? ""}
              draggable={false}
              className={`max-h-full max-w-full select-none object-contain ${
                isDragging ? "" : "transition-transform duration-200 ease-out"
              }`}
              style={{
                transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
              }}
            />
          </div>

          {/* Toolbar — bottom center */}
          <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-2 py-1.5 backdrop-blur-md">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-40"
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 5}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-40"
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Reset zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Download image"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function deriveFilename(src: string): string {
  try {
    const url = new URL(src)
    const pathname = url.pathname
    const segments = pathname.split("/").filter(Boolean)
    const last = segments[segments.length - 1]
    if (last && /\.\w+$/.test(last)) {
      return decodeURIComponent(last)
    }
  } catch {
    // Not a valid URL, fall through
  }
  return "image.jpg"
}
