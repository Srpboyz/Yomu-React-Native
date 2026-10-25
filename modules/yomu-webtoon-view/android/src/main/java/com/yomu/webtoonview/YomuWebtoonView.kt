package com.yomu.webtoonview

import android.content.Context
import android.os.SystemClock
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

class YomuWebtoonView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
    private val adapter = YomuRecyclerAdapter()
    private val recycler = YomuRecyclerView(context)
    private val layoutManager = LinearLayoutManager(context)

    private var currentIndex = RecyclerView.NO_POSITION
    private var endReachedSent = false

    private companion object {
        const val SCROLL_EVENT_THROTTLE_MS = 100L
    }

    // onScroll throttling: deltas are accumulated and emitted at most once per throttle window.
    private var lastScrollEventAt = 0L
    private var pendingScrollDy = 0

    private val onCurrentIndexChanged by EventDispatcher()
    private val onScroll by EventDispatcher()
    private val onEndReached by EventDispatcher()
    private val onSingleTap by EventDispatcher()
    private val onDoubleTap by EventDispatcher()

    init {
        recycler.singleTapListener = { onSingleTap(emptyMap()) }
        recycler.doubleTapListener = { onDoubleTap(emptyMap()) }
        recycler.layoutParams = ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT)
        recycler.layoutManager = layoutManager
        recycler.adapter = adapter
        recycler.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                // Also called with dy == 0 after layout changes (items added, images loaded),
                // which is exactly when the index / end-of-list state can change.
                emitScroll(dy)
                updateCurrentIndex()
                checkEndReached()
            }

            override fun onScrollStateChanged(recyclerView: RecyclerView, newState: Int) {
                if (newState == RecyclerView.SCROLL_STATE_IDLE) flushScroll()
            }
        })

        layoutParams = ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT)
        addView(recycler)
    }

    override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
        super.onLayout(changed, l, t, r, b)
        recycler.syncViewport()
    }

    // Props

    fun setUrls(urls: List<String>) {
        if (!adapter.setUrls(urls)) return
        endReachedSent = false
        if (urls.isEmpty()) currentIndex = RecyclerView.NO_POSITION
    }

    // React Native Ref Functions

    fun scrollToIndex(index: Int) {
        post {
            val count = adapter.itemCount
            if (count == 0) return@post
            layoutManager.scrollToPositionWithOffset(index.coerceIn(0, count - 1), 0)
        }
    }

    // React Native Events

    private fun emitScroll(dy: Int) {
        pendingScrollDy += dy
        if (pendingScrollDy == 0) return
        val now = SystemClock.uptimeMillis()
        if (now - lastScrollEventAt >= SCROLL_EVENT_THROTTLE_MS) flushScroll(now)
    }

    private fun flushScroll(now: Long = SystemClock.uptimeMillis()) {
        if (pendingScrollDy == 0) return
        val density = resources.displayMetrics.density
        val deltaYdp = pendingScrollDy / density
        pendingScrollDy = 0
        lastScrollEventAt = now
        onScroll(mapOf("deltaY" to deltaYdp))
    }

    private fun updateCurrentIndex() {
        val position = layoutManager.findFirstVisibleItemPosition()
        if (position == RecyclerView.NO_POSITION || position == currentIndex) return
        currentIndex = position
        onCurrentIndexChanged(mapOf("newIndex" to position))
    }

    private fun checkEndReached() {
        val count = adapter.itemCount
        if (count == 0) return

        val lastPosition = layoutManager.findLastVisibleItemPosition()
        val atEnd = lastPosition == count - 1 &&
            (layoutManager.findViewByPosition(lastPosition)?.let { it.bottom <= recycler.height }
                ?: false)

        if (!atEnd) {
            endReachedSent = false
        } else if (!endReachedSent) {
            endReachedSent = true
            onEndReached(emptyMap())
        }
    }
}