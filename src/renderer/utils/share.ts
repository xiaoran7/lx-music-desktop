import { createApp } from 'vue'
import { clipboardWriteText } from '@common/utils/electron'
import { toOldMusicInfo } from '@common/utils/tools'
import { dialog } from '@renderer/plugins/Dialog'
import { appSetting } from '@renderer/store/setting'
import { formatMusicName } from '@renderer/utils/index'
import musicSdk from '@renderer/utils/musicSdk'
import { i18nPlugin } from '@renderer/plugins/i18n'
import ShareModal from '@renderer/components/common/ShareModal.vue'

/**
 * 唤起桌面端专属分享弹窗（支持选择有效期、手动复制、浏览器试听）
 */
export const openShareModal = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): Promise<boolean> => {
  return new Promise((resolve) => {
    let app: any = createApp(ShareModal, {
      musicInfo,
      afterLeave() {
        app?.unmount()
        app = null
        resolve(true)
      },
    })
    app.use(i18nPlugin)

    const instance: any = app.mount(document.createElement('div'))
    instance.visible = true

    const container = document.getElementById('container') || document.body
    container.appendChild(instance.$el)
  })
}

export const shareMusic = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  const shareType = appSetting['common.shareType'] || 'custom_server'
  const t = window.i18n.t

  if (shareType === 'custom_server') {
    void openShareModal(musicInfo)
  } else {
    const name = musicInfo.name
    const singer = musicInfo.singer
    const detailUrl = musicInfo.source == 'local' ? '' : musicSdk[musicInfo.source]?.getMusicDetailPageUrl(toOldMusicInfo(musicInfo as any)) ?? ''
    const musicTitle = formatMusicName(appSetting['download.fileName'], name, singer)
    const text = `${musicTitle}${detailUrl ? '\n' + detailUrl : ''}`
    clipboardWriteText(text)
    void dialog({
      message: `${t('share_custom_server_success')}\n\n${text}`,
      confirmButtonText: t('confirm_button_text'),
    })
  }
}
