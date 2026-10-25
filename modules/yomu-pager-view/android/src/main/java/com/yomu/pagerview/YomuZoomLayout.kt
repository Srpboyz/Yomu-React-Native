package com.yomu.pagerview

import android.animation.ValueAnimator
import android.content.Context
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * One page of the pager: an image that can be pinch-zoomed (1x - 4x), double-tap zoomed (animated)
 * and panned. Other children (spinner, error label) can be added to this layout; they are not
 * scaled, only [imageView] is.
 *
 * Zoom is applied to [imageView] as view properties (scale + translation around its centre).
 *
 * Swiping between pages: while the page is zoomed in it asks the parent not to intercept touches
 * (so panning works), and gives them back as soon as the image is at its left/right edge and the
 * finger keeps pushing outwards, so the pager can swipe to the next page.
 *
 * Note: requestDisallowInterceptTouchEvent is only called once a pan/pinch really starts, never on
 * a plain tap, because react-native-gesture-handler cancels all of its gestures when it is called.
 */
class YomuZoomLayout(context: Context) : FrameLayout(context) {
    private companion object {
        const val MAX_ZOOM_SCALE = 4f
        const val DOUBLE_TAP_ZOOM_SCALE = 2f
        const val ZOOM_ANIMATION_MS = 250L
        const val EDGE_EPSILON = 0.5f
    }

    val imageView = ImageView(context).apply {
        layoutParams = FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)
        scaleType = ImageView.ScaleType.FIT_CENTER
    }

    /** Confirmed single tap (not the first half of a double tap). */
    var singleTapListener: (() -> Unit)? = null

    private var zoomScale = 1f
    private var translationXValue = 0f
    private var translationYValue = 0f
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private var ignoreUntilNextDown = false
    private var zoomAnimator: ValueAnimator? = null

    private val gestureDetector = GestureDetector(
        context,
        object : GestureDetector.SimpleOnGestureListener() {
            override fun onDown(event: MotionEvent): Boolean = true

            override fun onSingleTapConfirmed(event: MotionEvent): Boolean {
                singleTapListener?.invoke()
                return true
            }

            override fun onDoubleTap(event: MotionEvent): Boolean {
                // Don't let the rest of this touch pan the page while the zoom animates.
                ignoreUntilNextDown = true
                if (zoomScale > 1f) {
                    animateZoomTo(1f, event.x, event.y)
                } else {
                    animateZoomTo(DOUBLE_TAP_ZOOM_SCALE, event.x, event.y)
                }
                return true
            }
        }
    )

    private val scaleDetector = ScaleGestureDetector(
        context,
        object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScaleBegin(detector: ScaleGestureDetector): Boolean {
                cancelZoomAnimation()
                parent?.requestDisallowInterceptTouchEvent(true)
                return true
            }

            override fun onScale(detector: ScaleGestureDetector): Boolean {
                val newScale = (zoomScale * detector.scaleFactor).coerceIn(1f, MAX_ZOOM_SCALE)
                if (newScale != zoomScale) zoomAt(newScale, detector.focusX, detector.focusY)
                return true
            }
        }
    ).apply {
        isQuickScaleEnabled = false
    }

    init {
        addView(imageView)
    }

    // ---------------------------------------------------------------- zoom state

    fun resetZoom() {
        cancelZoomAnimation()
        zoomScale = 1f
        translationXValue = 0f
        translationYValue = 0f
        applyTransform()
    }

    private fun applyTransform() {
        imageView.scaleX = zoomScale
        imageView.scaleY = zoomScale
        imageView.translationX = translationXValue
        imageView.translationY = translationYValue
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        imageView.pivotX = w / 2f
        imageView.pivotY = h / 2f
        if (zoomScale == 1f) return
        if (oldw != 0 && w != oldw) {
            // Width changed (rotation / split-screen): the stored zoom no longer makes sense.
            resetZoom()
        } else {
            // Only the height changed, e.g. the status/navigation bar was shown or hidden when the
            // reader overlay toggled on a tap. Keep the zoom, just keep the pan within bounds.
            clampTranslation()
            applyTransform()
        }
    }

    /** Size of the picture as actually displayed (FIT_CENTER inside this layout), unscaled. */
    private fun displayedWidth(): Float = displayedSize().first
    private fun displayedHeight(): Float = displayedSize().second

    private fun displayedSize(): Pair<Float, Float> {
        val vw = width.toFloat()
        val vh = height.toFloat()
        val d = imageView.drawable
        val iw = d?.intrinsicWidth ?: 0
        val ih = d?.intrinsicHeight ?: 0
        if (iw <= 0 || ih <= 0) return vw to vh
        val fit = min(vw / iw, vh / ih)
        return (iw * fit) to (ih * fit)
    }

    /** How far the image may be panned at [scale] before its edge would leave the screen edge. */
    private fun maxPanX(scale: Float) = max(0f, (displayedWidth() * scale - width) / 2f)
    private fun maxPanY(scale: Float) = max(0f, (displayedHeight() * scale - height) / 2f)

    private fun clampTranslation() {
        val maxX = maxPanX(zoomScale)
        val maxY = maxPanY(zoomScale)
        translationXValue = translationXValue.coerceIn(-maxX, maxX)
        translationYValue = translationYValue.coerceIn(-maxY, maxY)
    }

    /** Zoom to [newScale] keeping the point under ([focusX], [focusY]) fixed on screen. */
    private fun zoomAt(newScale: Float, focusX: Float, focusY: Float) {
        val cx = width / 2f
        val cy = height / 2f
        val ratio = newScale / zoomScale
        translationXValue = focusX - cx - (focusX - cx - translationXValue) * ratio
        translationYValue = focusY - cy - (focusY - cy - translationYValue) * ratio
        zoomScale = newScale
        clampTranslation()
        applyTransform()
    }

    private fun animateZoomTo(target: Float, focusX: Float, focusY: Float) {
        cancelZoomAnimation()

        val startScale = zoomScale
        val startTx = translationXValue
        val startTy = translationYValue

        val endScale = if (target <= 1f) 1f else target
        var endTx = 0f
        var endTy = 0f
        if (endScale > 1f) {
            val cx = width / 2f
            val cy = height / 2f
            val ratio = endScale / startScale
            endTx = (focusX - cx - (focusX - cx - startTx) * ratio)
                .coerceIn(-maxPanX(endScale), maxPanX(endScale))
            endTy = (focusY - cy - (focusY - cy - startTy) * ratio)
                .coerceIn(-maxPanY(endScale), maxPanY(endScale))
        }

        zoomAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = ZOOM_ANIMATION_MS
            interpolator = DecelerateInterpolator()
            addUpdateListener { animator ->
                val p = animator.animatedValue as Float
                zoomScale = if (p >= 1f) endScale else startScale + (endScale - startScale) * p
                translationXValue = startTx + (endTx - startTx) * p
                translationYValue = startTy + (endTy - startTy) * p
                applyTransform()
            }
            start()
        }
    }

    private fun cancelZoomAnimation() {
        zoomAnimator?.cancel()
        zoomAnimator = null
    }

    override fun onDetachedFromWindow() {
        cancelZoomAnimation()
        super.onDetachedFromWindow()
    }

    // ---------------------------------------------------------------- touch

    override fun onTouchEvent(event: MotionEvent): Boolean {
        // Must happen BEFORE the detectors see this event: on the second tap of a double tap the
        // detector starts the zoom animation (and sets ignoreUntilNextDown) during this very DOWN.
        // Doing this afterwards would cancel the animation the moment it starts.
        if (event.actionMasked == MotionEvent.ACTION_DOWN) {
            ignoreUntilNextDown = false
            cancelZoomAnimation()
        }

        scaleDetector.onTouchEvent(event)
        gestureDetector.onTouchEvent(event)

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastTouchX = event.x
                lastTouchY = event.y
                // Zoomed in: we need the MOVEs to pan. (Not at 1x: the pager must be free to swipe.)
                if (zoomScale > 1f) parent?.requestDisallowInterceptTouchEvent(true)
            }

            MotionEvent.ACTION_POINTER_DOWN -> {
                parent?.requestDisallowInterceptTouchEvent(true)
            }

            MotionEvent.ACTION_POINTER_UP -> {
                // Carry on panning with the finger that's left, without a jump.
                val remaining = if (event.actionIndex == 0) 1 else 0
                lastTouchX = event.getX(remaining)
                lastTouchY = event.getY(remaining)
            }

            MotionEvent.ACTION_MOVE -> {
                if (scaleDetector.isInProgress || event.pointerCount > 1) {
                    lastTouchX = event.x
                    lastTouchY = event.y
                } else {
                    if (zoomScale > 1f && !ignoreUntilNextDown) pan(event)
                    lastTouchX = event.x
                    lastTouchY = event.y
                }
            }
        }
        return true
    }

    private fun pan(event: MotionEvent) {
        val dx = event.x - lastTouchX
        val dy = event.y - lastTouchY
        val maxX = maxPanX(zoomScale)

        val atLeftEdge = translationXValue >= maxX - EDGE_EPSILON
        val atRightEdge = translationXValue <= -maxX + EDGE_EPSILON
        val pushingOut = (dx > 0 && atLeftEdge) || (dx < 0 && atRightEdge)

        if (pushingOut && abs(dx) > abs(dy)) {
            // At the image's edge and the finger keeps going sideways: let the pager swipe.
            parent?.requestDisallowInterceptTouchEvent(false)
            return
        }

        parent?.requestDisallowInterceptTouchEvent(true)
        if (!pushingOut) translationXValue += dx
        translationYValue += dy
        clampTranslation()
        applyTransform()
    }
}