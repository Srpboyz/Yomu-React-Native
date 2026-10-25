package com.yomu.webtoonview

import android.content.Context
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


class WebtoonRowLayout(context: Context) : FrameLayout(context) {
    var aspectRatio: Float = 0f
        set(value) {
            if (field != value) {
                field = value
                requestLayout()
            }
        }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        val height = if (aspectRatio > 0f) {
            (width * aspectRatio).roundToInt().coerceAtLeast(1)
        } else {
            MeasureSpec.getSize(heightMeasureSpec)
        }
        super.onMeasure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
        )
    }
}

class YomuRecyclerAdapter : RecyclerView.Adapter<YomuRecyclerAdapter.WebtoonViewHolder>() {
    private companion object {
        const val DECODE_WIDTH_FACTOR = 2
        const val MAX_DECODE_HEIGHT_PX = 8192
        const val SPINNER_SIZE_DP = 36
        const val ERROR_PADDING_DP = 24
    }

    private var urls: List<String> = emptyList()
    private val aspectRatios = HashMap<String, Float>()
    private var recyclerView: RecyclerView? = null

    override fun onAttachedToRecyclerView(recyclerView: RecyclerView) {
        this.recyclerView = recyclerView
    }

    override fun onDetachedFromRecyclerView(recyclerView: RecyclerView) {
        if (this.recyclerView === recyclerView) this.recyclerView = null
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): WebtoonViewHolder {
        val context = parent.context
        val density = parent.resources.displayMetrics.density

        val container = WebtoonRowLayout(context).apply {
            layoutParams = RecyclerView.LayoutParams(MATCH_PARENT, MATCH_PARENT)
        }

        val imageView = ImageView(context).apply {
            layoutParams = FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)
            scaleType = ImageView.ScaleType.FIT_CENTER
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

        container.addView(imageView)
        container.addView(spinner)
        container.addView(errorLabel)

        val holder = WebtoonViewHolder(container, imageView, spinner, errorLabel)
        errorLabel.setOnClickListener {
            holder.boundUrl?.let { url -> load(holder, url) }
        }
        return holder
    }

    override fun onBindViewHolder(holder: WebtoonViewHolder, position: Int) {
        val url = urls[position]
        holder.boundUrl = url
        holder.container.aspectRatio = aspectRatios[url] ?: 0f
        load(holder, url)
    }

    override fun onViewRecycled(holder: WebtoonViewHolder) {
        holder.boundUrl = null
        // Cancels any in-flight request and releases the bitmap.
        // Guarded because Glide throws if the hosting Activity 
        // has already been destroyed (can happen during RN teardown).
        runCatching { Glide.with(holder.imageView).clear(holder.imageView) }
    }

    private fun load(holder: WebtoonViewHolder, url: String) {
        holder.spinner.visibility = View.VISIBLE
        holder.errorLabel.visibility = View.GONE

        val viewWidth = recyclerView?.width ?: 0
        val targetWidth =
            if (viewWidth > 0) viewWidth * DECODE_WIDTH_FACTOR else Target.SIZE_ORIGINAL

        val options = RequestOptions()
            .format(DecodeFormat.PREFER_ARGB_8888)
            .override(targetWidth, MAX_DECODE_HEIGHT_PX)
            // Only ever downsample. (fitCenter would also *upscale* small images to the override.)
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
                    holder.spinner.visibility = View.GONE
                    holder.errorLabel.visibility = View.GONE

                    val w = resource.intrinsicWidth
                    val h = resource.intrinsicHeight
                    if (w > 0 && h > 0) {
                        val ratio = h.toFloat() / w.toFloat()
                        aspectRatios[url] = ratio
                        holder.container.aspectRatio = ratio
                    }
                    return false
                }
            })
            .into(holder.imageView)
    }

    override fun getItemCount(): Int = urls.size

    fun setUrls(newUrls: List<String>): Boolean {
        val old = urls
        val new = newUrls.toList()
        if (old == new) return false

        val diff = DiffUtil.calculateDiff(object : DiffUtil.Callback() {
            override fun getOldListSize() = old.size
            override fun getNewListSize() = new.size
            override fun areItemsTheSame(oldItemPosition: Int, newItemPosition: Int) =
                old[oldItemPosition] == new[newItemPosition]

            // Same url => same content.
            override fun areContentsTheSame(oldItemPosition: Int, newItemPosition: Int) = true
        }, false)

        urls = new
        diff.dispatchUpdatesTo(this)
        return true
    }

    class WebtoonViewHolder(
        val container: WebtoonRowLayout,
        val imageView: ImageView,
        val spinner: ProgressBar,
        val errorLabel: TextView
    ) : RecyclerView.ViewHolder(container) {
        /** The url this holder is currently showing; used to ignore stale Glide callbacks. */
        var boundUrl: String? = null
    }
}