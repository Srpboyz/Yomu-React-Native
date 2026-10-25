package com.yomu.pagerview

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class YomuPagerViewModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("YomuPagerView")

        View(YomuPagerView::class) {
            Prop("urls") { view: YomuPagerView, urls: List<String> -> view.setUrls(urls) }
            // true = page 0 on the right, next page to the left (same as FlatList `inverted`).
            Prop("inverted") { view: YomuPagerView, inverted: Boolean -> view.setInverted(inverted) }
            Events("onCurrentIndexChanged", "onScroll", "onEndReached", "onSingleTap")
            AsyncFunction("scrollToIndex") { view: YomuPagerView, index: Int ->
                view.scrollToIndex(index)
            }
        }
    }
}