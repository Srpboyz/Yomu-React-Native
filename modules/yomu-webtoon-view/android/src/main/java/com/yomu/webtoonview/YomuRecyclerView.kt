package com.yomu.webtoonview

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Matrix
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import androidx.recyclerview.widget.RecyclerView
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToInt


class YomuRecyclerView(context: Context) : RecyclerView(context) {
    private companion object {
        const val MIN_ZOOM_SCALE = 0.5f
        const val MAX_ZOOM_SCALE = 4f
        const val DOUBLE_TAP_ZOOM_SCALE = 2f
        const val ZOOM_ANIMATION_MS = 250L
    }

    private var layoutPosted = false
    private var zoomAnimator: ValueAnimator? = null

    private var zoomScale = 1f
    private var zoomTranslationX = 0f
    private var zoomTranslationY = 0f

    private var pinching = false
    private var pinchCancelSent = false
    private var ignoreTouchUntilNextDown = false
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private var touchStartX = 0f
    private var touchStartY = 0f
    private var disallowRequested = false
    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
    private val zoomToListMatrix = Matrix()

    var singleTapListener: (() -> Unit)? = null
    var doubleTapListener: (() -> Unit)? = null

    init {
        clipChildren = true
        clipToPadding = true
        // Rows change height as images load; the default animator makes that flicker.
        itemAnimator = null
    }

    private val doubleTapGestureDetector = GestureDetector(
        context,
        object : GestureDetector.SimpleOnGestureListener() {
            override fun onDown(event: MotionEvent): Boolean = true

            override fun onSingleTapConfirmed(event: MotionEvent): Boolean {
                if (pinching) return false
                singleTapListener?.invoke()
                return true
            }

            override fun onDoubleTap(event: MotionEvent): Boolean {
                ignoreTouchUntilNextDown = true

                // Zoomed in OR out -> back to normal. Normal -> zoom in.
                if (zoomScale != 1f) {
                    animateZoomTo(1f, event.x, event.y)
                } else {
                    animateZoomTo(DOUBLE_TAP_ZOOM_SCALE, event.x, event.y)
                }
                doubleTapListener?.invoke()
                return true
            }
        }
    )

    private val scaleGestureDetector = ScaleGestureDetector(
        context,
        object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScale(detector: ScaleGestureDetector): Boolean {
                val newScale =
                    (zoomScale * detector.scaleFactor).coerceIn(MIN_ZOOM_SCALE, MAX_ZOOM_SCALE)
                if (newScale != zoomScale) {
                    setZoomScale(newScale, detector.focusX, detector.focusY)
                }
                return true
            }

            override fun onScaleBegin(detector: ScaleGestureDetector): Boolean = true
        }
    ).apply {
        // Double-tap is handled by doubleTapGestureDetector; quick-scale would fight with it.
        isQuickScaleEnabled = false
    }

    // Zoom Handler

    private fun viewportHeight(): Int = (parent as? View)?.height ?: height

    private fun pivotY(): Float = if (zoomScale < 1f) 0f else height / 2f

    private fun animateZoomTo(targetScale: Float, focusX: Float, focusY: Float) {
        cancelZoomAnimation()

        val startScale = zoomScale
        val startTx = zoomTranslationX
        val startTy = zoomTranslationY

        val endScale: Float
        var endTx = 0f
        var endTy = 0f
        if (targetScale <= 1f) {
            endScale = 1f
        } else {
            endScale = targetScale
            val centerX = width / 2f
            val centerY = height / 2f
            val ratio = targetScale / max(startScale, 1f)
            endTx = focusX - centerX - (focusX - centerX - startTx) * ratio
            endTy = focusY - centerY - (focusY - centerY - startTy) * ratio
            val maxX = width * (endScale - 1f) / 2f
            val maxY = height * (endScale - 1f) / 2f
            endTx = endTx.coerceIn(-maxX, maxX)
            endTy = endTy.coerceIn(-maxY, maxY)
        }

        zoomAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = ZOOM_ANIMATION_MS
            interpolator = DecelerateInterpolator()
            addUpdateListener { animator ->
                val p = animator.animatedValue as Float
                zoomScale = if (p >= 1f) endScale else startScale + (endScale - startScale) * p
                zoomTranslationX = startTx + (endTx - startTx) * p
                zoomTranslationY = startTy + (endTy - startTy) * p
                updateViewport()
                invalidate()
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

    private fun keepFocusWhileZoomedOut(oldScale: Float, newScale: Float, focusY: Float) {
        val a = minOf(oldScale, 1f)
        val b = minOf(newScale, 1f)
        if (a == b) return
        val dy = focusY * (1f / a - 1f / b)
        scrollBy(0, dy.roundToInt())
    }

    private fun setZoomScale(scale: Float, focusX: Float, focusY: Float) {
        cancelZoomAnimation()
        val oldScale = zoomScale
        if (scale == 1f) {
            resetZoom()
            keepFocusWhileZoomedOut(oldScale, 1f, focusY)
            return
        }

        zoomScale = scale

        if (scale < 1f) {
            // Zoomed out: no panning, content is centred horizontally and pinned to the top.
            zoomTranslationX = 0f
            zoomTranslationY = 0f
            updateViewport()
        } else {
            // Make sure we're back at the normal viewport size before doing the maths.
            updateViewport()
            // Keep the point under the fingers fixed on screen while scaling.
            val centerX = width / 2f
            val centerY = height / 2f
            val scaleRatio = scale / max(oldScale, 1f)
            zoomTranslationX =
                focusX - centerX - (focusX - centerX - zoomTranslationX) * scaleRatio
            zoomTranslationY =
                focusY - centerY - (focusY - centerY - zoomTranslationY) * scaleRatio
            clampTranslation()
        }
        keepFocusWhileZoomedOut(oldScale, scale, focusY)
        invalidate()
    }

    private fun clampTranslation() {
        if (zoomScale <= 1f) {
            zoomTranslationX = 0f
            zoomTranslationY = 0f
            return
        }
        val maxX = width * (zoomScale - 1f) / 2f
        val maxY = height * (zoomScale - 1f) / 2f
        zoomTranslationX = zoomTranslationX.coerceIn(-maxX, maxX)
        zoomTranslationY = zoomTranslationY.coerceIn(-maxY, maxY)
    }

    private fun resetZoom(syncViewport: Boolean = true) {
        cancelZoomAnimation()
        zoomScale = 1f
        zoomTranslationX = 0f
        zoomTranslationY = 0f
        if (syncViewport) updateViewport()
        invalidate()
    }

    private fun updateViewport() {
        val base = viewportHeight()
        if (base <= 0 || width <= 0) return
        val target = if (zoomScale < 1f) (base / zoomScale).roundToInt() else base

        layoutParams?.let { lp ->
            val desired = if (zoomScale < 1f) target else ViewGroup.LayoutParams.MATCH_PARENT
            if (lp.height != desired) lp.height = desired
        }

        if (height == target) return
        measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(target, MeasureSpec.EXACTLY)
        )
        layout(left, top, right, top + target)
    }

    fun syncViewport() = updateViewport()

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (zoomScale == 1f) return
        if (oldw != 0 && w != oldw) {
            resetZoom(syncViewport = false)
            requestLayout()
        } else if (zoomScale > 1f) {
            clampTranslation()
            invalidate()
        }
    }

    override fun dispatchDraw(canvas: Canvas) {
        val pivotY = pivotY()
        val saveCount = canvas.save()
        canvas.translate(width / 2f + zoomTranslationX, pivotY + zoomTranslationY)
        canvas.scale(zoomScale, zoomScale)
        canvas.translate(-width / 2f, -pivotY)
        super.dispatchDraw(canvas)
        canvas.restoreToCount(saveCount)
    }

    override fun requestLayout() {
        super.requestLayout()
        if (!layoutPosted) {
            layoutPosted = true
            post {
                layoutPosted = false
                measure(
                    MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                    MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
                )
                layout(left, top, right, bottom)
            }
        }
    }

    // Touch Handler

    override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
        if (pinching || scaleGestureDetector.isInProgress || event.pointerCount > 1) return true
        if (zoomScale != 1f) return true
        return super.onInterceptTouchEvent(event)
    }

    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        if (event.actionMasked == MotionEvent.ACTION_DOWN) {
            pinching = false
            pinchCancelSent = false
            ignoreTouchUntilNextDown = false
            cancelZoomAnimation()
        } else if (event.actionMasked == MotionEvent.ACTION_POINTER_DOWN) {
            pinching = true
        }

        scaleGestureDetector.onTouchEvent(event)
        doubleTapGestureDetector.onTouchEvent(event)

        if (pinching) {
            parent?.requestDisallowInterceptTouchEvent(true)
        }

        val handled = super.dispatchTouchEvent(event)

        if (
            event.actionMasked == MotionEvent.ACTION_UP ||
            event.actionMasked == MotionEvent.ACTION_CANCEL
        ) {
            pinching = false
        }

        return handled
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (ignoreTouchUntilNextDown) return true

        if (pinching) {
            if (!pinchCancelSent) {
                pinchCancelSent = true
                val cancel = MotionEvent.obtain(event)
                cancel.action = MotionEvent.ACTION_CANCEL
                super.onTouchEvent(cancel)
                cancel.recycle()
            }
            return true
        }

        if (zoomScale == 1f) return super.onTouchEvent(event)
        return onZoomedTouchEvent(event)
    }

    private fun onZoomedTouchEvent(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastTouchX = event.x
                lastTouchY = event.y
                touchStartX = event.x
                touchStartY = event.y
                disallowRequested = false
            }

            MotionEvent.ACTION_MOVE -> {
                val dx = event.x - lastTouchX
                val dy = event.y - lastTouchY
                lastTouchX = event.x
                lastTouchY = event.y

                if (!disallowRequested &&
                    (abs(event.x - touchStartX) > touchSlop ||
                        abs(event.y - touchStartY) > touchSlop)
                ) {
                    disallowRequested = true
                    parent?.requestDisallowInterceptTouchEvent(true)
                }

                if (zoomScale > 1f) {
                    // Horizontal: pan the zoomed content.
                    zoomTranslationX += dx

                    if (dy != 0f) {
                        val listDirection = if (dy > 0f) -1 else 1
                        if (!canScrollVertically(listDirection)) zoomTranslationY += dy
                    }

                    clampTranslation()
                    invalidate()
                }
                // Zoomed out: nothing to pan; the list simply scrolls.
            }
        }

        val centerX = width / 2f
        val pivotY = pivotY()
        zoomToListMatrix.reset()
        zoomToListMatrix.postTranslate(-(centerX + zoomTranslationX), -(pivotY + zoomTranslationY))
        zoomToListMatrix.postScale(1f / zoomScale, 1f / zoomScale)
        zoomToListMatrix.postTranslate(centerX, pivotY)

        val mapped = MotionEvent.obtain(event)
        mapped.transform(zoomToListMatrix)
        super.onTouchEvent(mapped)
        mapped.recycle()
        return true
    }
}