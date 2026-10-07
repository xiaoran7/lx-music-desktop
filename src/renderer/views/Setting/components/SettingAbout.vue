<template lang="pug">
dt#about {{ $t('setting__about') }}
dd
  .p.small
    strong 落雪音乐 (LX Music)
    | &nbsp;由原作者&nbsp;
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/lyswhut')") lyswhut (落雪无痕)
    | &nbsp;首创开发，官方文档：
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://lyswhut.github.io/lx-music-doc/desktop/faq')") 官方文档中心
    | 。在此致以最崇高的敬意！
  br
  .p.small
    strong 🎧 落雪全家桶 (LX Music Suite) 生态矩阵：
  .p.small(style="padding-left: 12px; line-height: 1.8;")
    | • 💻&nbsp;
    strong 桌面端 (LX Music Desktop)
    | ：Windows / macOS / Linux 客户端，集成听歌统计与私有云分享。
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/xiaoran7/lx-music-desktop')") [GitHub]
    br
    | • 📱&nbsp;
    strong 移动端 (LX Music Mobile)
    | ：Android 客户端，移动端背景保活与一键推送分享。
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/xiaoran7/lx-music-mobile')") [GitHub]
    br
    | • 🔄&nbsp;
    strong 多端同步服务 (LX Music Sync Server)
    | ：基于 WebSocket 协议的多端歌单与 CRDT 听歌统计双向实时同步。
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/xiaoran7/lx-music-sync-server')") [GitHub]
    br
    | • 🎵&nbsp;
    strong 私有分享服务 (LX Music Share)
    | ：单曲异步流存、1:1 原生沉浸单页、听友留言板与 TTL 自动清理。
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/xiaoran7/lx-music-share')") [GitHub]
  br
  .p.small
    | 本分支开源地址：
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/xiaoran7/lx-music-desktop')") https://github.com/xiaoran7/lx-music-desktop
  .p.small
    | 最新版下载发布页：
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/xiaoran7/lx-music-desktop/releases')") GitHub Releases
  .p.small
    | 软件遇到问题可转至 GitHub&nbsp;
    span.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/xiaoran7/lx-music-desktop/issues')") 提交 Issue
    | 。
  br
  .p.small
    strong 本软件完全免费、无客服、无商业化，开发的初衷仅用于个人技术学习与交流。
  .p.small
    | 目前本项目的原始发布地址
    strong 只有 GitHub
    | ，谨防任何所谓官方账号或第三方付费欺诈。
  .p.small
    | 你已签署本软件的
    base-btn(min @click="handleShowPact") 许可协议
    | ，协议的在线版本在
    strong.hover.underline(:aria-label="$t('setting__click_open')" @click="openUrl('https://github.com/xiaoran7/lx-music-desktop#%E9%A1%B9%E7%9B%AE%E5%8D%8F%E8%AE%AE')") 这里
    | 。
  br
  .p.small
    | 原作者:&nbsp;
    strong 落雪无痕
    | &nbsp;|&nbsp;全家桶维护:&nbsp;
    strong xiaoran7
</template>

<script>
// import { ref, onBeforeUnmount } from '@common/utils/vueTools'
import { isShowPact } from '@renderer/store'
import { openUrl, clipboardWriteText } from '@common/utils/electron'

export default {
  name: 'SettingAbout',
  setup() {
    const handleShowPact = () => {
      isShowPact.value = true
    }
    return {
      openUrl,
      clipboardWriteText,
      handleShowPact,
    }
  },
}
</script>
