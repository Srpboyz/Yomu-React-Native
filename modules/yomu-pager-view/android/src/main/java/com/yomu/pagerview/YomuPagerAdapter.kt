package com.yomu.pagerview

import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.PorterDuff
import android.graphics.drawable.Drawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.bumptech.glide.load.DataSource
import com.bumptech.glide.load.DecodeFormat
import com.bumptech.glide.load.engine.GlideException
import com.bumptech.glide.load.resource.bitmap.DownsampleStrategy
import com.bumptech.glide.request.RequestListener
import com.bumptech.glide.request.RequestOptions
import com.bumptech.glide.request.target.Target
import kotlin.math.roundToInt

class YomuPagerAdapter : RecyclerView.Adapter<YomuPagerAdapter.PageHolder>() {
    private companion object {
        /** Decode at up to this multiple of the page size so zooming in stays reasonably sharp. */
        const val DECODE_SIZE_FACTOR = 2

        /** Hard cap on decoded bitmap size (GPU texture limits / memory). */
        const val MAX_DECODE_PX = 8192

        const val SPINNER_SIZE_DP = 36
        const val ERROR_PADDING_DP = 24
    }

    private var urls: List<String> = emptyList()

    /** Size of the pager, set by the view; used to pick a decode size. */
    var viewWidth = 0
    var viewHeight = 0

    /** Single tap on a page that loaded fine. */
    var onSingleTap: (() -> Unit)? = null

    /**
     * true: pages are shown in reverse order (page 0 in the last position), so with a normal
     * left-to-right pager page 0 sits on the right and the next page is to the left.
     */
    var inverted = false
        set(value) {
            if (field == value) return
            field = value
            notifyDataSetChanged()
        }

    /** Maps between a page index and a pager position. (Its own inverse.) */
    fun mirror(value: Int): Int = if (inverted) urls.size - 1 - value else value

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PageHolder {
        val context = parent.context
        val density = parent.resources.displayMetrics.density

        val zoom = YomuZoomLayout(context).apply {
            // ViewPager2 requires its pages to be MATCH_PARENT.
            layoutParams = RecyclerView.LayoutParams(MATCH_PARENT, MATCH_PARENT)
        }

        val spinnerSize = (SPINNER_SIZE_DP * density).roundToInt()
        val spinner = ProgressBar(context).apply {
            layoutParams = FrameLayout.LayoutParams(spinnerSize, spinnerSize, Gravity.CENTER)
            isIndeterminate = true
            indeterminateTintList = ColorStateList.valueOf(Color.WHITE)
            indeterminateTintMode = PorterDuff.Mode.SRC_IN
        }

        val errorLabel = TextView(context).apply {
            layoutParams = FrameLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT, Gravity.CENTER)
            text = "Couldn't load image\nTap to retry"
            gravity = Gravity.CENTER
            textSize = 14f
            setTextColor(0xFFAAAAAA.toInt())
            val pad = (ERROR_PADDING_DP * density).roundToInt()
            setPadding(pad, pad, pad, pad)
            visibility = View.GONE
        }

        zoom.addView(spinner)
        zoom.addView(errorLabel)

        val holder = PageHolder(zoom, zoom.imageView, spinner, errorLabel)
        // Not clickable children: the zoom layout owns all touches. A tap on a failed page retries.
        zoom.singleTapListener = {
            val url = holder.boundUrl
            if (holder.failed && url != null) load(holder, url) else onSingleTap?.invoke()
        }
        return holder
    }

    override fun onBindViewHolder(holder: PageHolder, position: Int) {
        val url = urls[mirror(position)]
        holder.boundUrl = url
        holder.zoom.resetZoom()
        load(holder, url)
    }

    override fun onViewRecycled(holder: PageHolder) {
        holder.boundUrl = null
        holder.zoom.resetZoom()
        // Guarded because Glide throws if the Activity is already destroyed (RN teardown).
        runCatching { Glide.with(holder.imageView).clear(holder.imageView) }
    }

    private fun load(holder: PageHolder, url: String) {
        holder.failed = false
        holder.spinner.visibility = View.VISIBLE
        holder.errorLabel.visibility = View.GONE

        val width = if (viewWidth > 0) viewWidth * DECODE_SIZE_FACTOR else Target.SIZE_ORIGINAL
        val height =
            if (viewHeight > 0) minOf(viewHeight * DECODE_SIZE_FACTOR, MAX_DECODE_PX) else MAX_DECODE_PX

        val options = RequestOptions()
            .format(DecodeFormat.PREFER_ARGB_8888)
            .override(width, height)
            // Only ever downsample (fitCenter would upscale small images).
            .downsample(DownsampleStrategy.CENTER_INSIDE)
            .dontTransform()

        Glide.with(holder.imageView)
            .load(url)
            .apply(options)
            .listener(object : RequestListener<Drawable> {
                override fun onLoadFailed(
                    e: GlideException?,
                    model: Any?,
                    target: Target<Drawable>,
                    isFirstResource: Boolean
                ): Boolean {
                    if (holder.boundUrl != url) return false
                    holder.failed = true
                    holder.spinner.visibility = View.GONE
                    holder.errorLabel.visibility = View.VISIBLE
                    return false
                }

                override fun onResourceReady(
                    resource: Drawable,
                    model: Any,
                    target: Target<Drawable>,
                    dataSource: DataSource,
                    isFirstResource: Boolean
                ): Boolean {
                    if (holder.boundUrl != url) return false
                    holder.failed = false
                    holder.spinner.visibility = View.GONE
                    holder.errorLabel.visibility = View.GONE
                    return false
                }
            })
            .into(holder.imageView)
    }

    override fun getItemCount(): Int = urls.size

    /** Diffed update, so unchanged pages aren't reloaded. Returns true if the list changed. */
    fun setUrls(newUrls: List<String>): Boolean {
        val old = urls
        val new = newUrls.toList()
        if (old == new) return false

        if (inverted) {
            // Positions are mirrored, so a diff of the raw lists wouldn't match them.
            urls = new
            notifyDataSetChanged()
            return true
        }

        val diff = DiffUtil.calculateDiff(object : DiffUtil.Callback() {
            override fun getOldListSize() = old.size
            override fun getNewListSize() = new.size
            override fun areItemsTheSame(oldItemPosition: Int, newItemPosition: Int) =
                old[oldItemPosition] == new[newItemPosition]

            override fun areContentsTheSame(oldItemPosition: Int, newItemPosition: Int) = true
        }, false)

        urls = new
        diff.dispatchUpdatesTo(this)
        return true
    }

    class PageHolder(
        val zoom: YomuZoomLayout,
        val imageView: ImageView,
        val spinner: ProgressBar,
        val errorLabel: TextView
    ) : RecyclerView.ViewHolder(zoom) {
        var boundUrl: String? = null
        var failed = false
    }
}