package com.yomu.webtoonview

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class YomuWebtoonViewModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("YomuWebtoonView")

        View(YomuWebtoonView::class) {
            Prop("urls") { view: YomuWebtoonView, urls: List<String> -> view.setUrls(urls) }
            Events("onCurrentIndexChanged", "onScroll", "onEndReached", "onSingleTap", "onDoubleTap")
            AsyncFunction("scrollToIndex") { view: YomuWebtoonView, index: Int ->
                view.scrollToIndex(index)
            }
        }
    }
}
