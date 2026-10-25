package com.yomu.pagerview

import android.content.Context
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import androidx.viewpager2.widget.ViewPager2
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/**
 * Paged reader: one zoomable image per page, swipe left/right between pages.
 * [setInverted] mirrors the order (page 0 on the right, next page to the left).
 */
class YomuPagerView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
    private val adapter = YomuPagerAdapter()
    private val pager = ViewPager2(context)

    private var reportedIndex = -1
    private var endReachedSent = false
    private var layoutPosted = false

    private val onCurrentIndexChanged by EventDispatcher()
    private val onScroll by EventDispatcher()
    private val onEndReached by EventDispatcher()
    private val onSingleTap by EventDispatcher()

    init {
        pager.layoutParams = ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT)
        pager.adapter = adapter
        pager.offscreenPageLimit = 1
        pager.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                reportPage(position)
            }

            override fun onPageScrollStateChanged(state: Int) {
                // The user started swiping: lets JS hide its overlay.
                if (state == ViewPager2.SCROLL_STATE_DRAGGING) onScroll(emptyMap())
            }
        })
        adapter.onSingleTap = { onSingleTap(emptyMap()) }

        layoutParams = ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT)
        addView(pager)
    }

    // ---------------------------------------------------------------- props

    fun setUrls(urls: List<String>) {
        if (!adapter.setUrls(urls)) return
        endReachedSent = false
        if (urls.isEmpty()) reportedIndex = -1
        // Once laid out: go to the page we were on (page 0 for a new chapter; when inverted that
        // is the LAST position), then report it.
        pager.post { showPage(if (reportedIndex >= 0) reportedIndex else 0) }
    }

    /**
     * true: page 0 on the right and the next page to the left (like FlatList's `inverted`).
     * Done by reversing the page order in the adapter, so it doesn't depend on the app's RTL
     * support or the view's layout direction.
     */
    fun setInverted(inverted: Boolean) {
        if (adapter.inverted == inverted) return
        val index = if (reportedIndex >= 0) reportedIndex else 0
        adapter.inverted = inverted
        pager.post { showPage(index) }
    }

    /** Moves the pager to page [index] (not position) and reports it. */
    private fun showPage(index: Int) {
        val count = adapter.itemCount
        if (count == 0) return
        val position = adapter.mirror(index.coerceIn(0, count - 1))
        if (pager.currentItem != position) pager.setCurrentItem(position, false)
        reportPage(position)
    }

    // ---------------------------------------------------------------- functions

    fun scrollToIndex(index: Int) {
        // Always touch the pager on the UI thread.
        post { showPage(index) }
    }

    // ---------------------------------------------------------------- events

    /** [position] is a pager position; it is converted to a page index (mirrored when inverted). */
    private fun reportPage(position: Int) {
        val count = adapter.itemCount
        if (count == 0 || position < 0) return
        val index = adapter.mirror(position)

        if (index != reportedIndex) {
            reportedIndex = index
            onCurrentIndexChanged(mapOf("newIndex" to index))
        }

        if (index == count - 1) {
            if (!endReachedSent) {
                endReachedSent = true
                onEndReached(emptyMap())
            }
        } else {
            endReachedSent = false
        }
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        adapter.viewWidth = w
        adapter.viewHeight = h
    }

    /**
     * React Native lays out its own view tree and never calls measure/layout on the children a
     * native view adds to itself, so requestLayout() from the pager (page changes, image loads)
     * would never actually produce a layout pass. Post one ourselves.
     */
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
}