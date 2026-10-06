import { clipboardWriteText } from '@common/utils/electron'
import { toOldMusicInfo } from '@common/utils/tools'
import { dialog } from '@renderer/plugins/Dialog'
import { appSetting } from '@renderer/store/setting'
import { formatMusicName } from '@renderer/utils/index'
import musicSdk from '@renderer/utils/musicSdk'
import { getMusicUrl, getPicPath, getLyricInfo } from '@renderer/core/music'

export const shareToCustomServer = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  const t = window.i18n.t
  const serverUrl = (appSetting['common.shareServerUrl'] || 'https://music.tannerlab.cn').trim().replace(/\/+$/, '')
  const token = (appSetting['common.shareServerToken'] || '').trim()
  const ttlDays = appSetting['common.shareExpireDays'] ?? 7

  let audioUrl = ''
  try {
    audioUrl = await getMusicUrl({ musicInfo, isRefresh: true })
  } catch (e) {
    console.warn('获取音频直链失败', e)
  }

  let picUrl = ''
  try {
    picUrl = await getPicPath({ musicInfo })
  } catch (e) {
    console.warn('获取封面失败', e)
  }

  let lrc = ''
  try {
    const lyricInfo = await getLyricInfo({ musicInfo })
    lrc = lyricInfo.lyric || ''
  } catch (e) {
    console.warn('获取歌词失败', e)
  }

  const payload = {
    token,
    title: musicInfo.name,
    singer: musicInfo.singer,
    album: (musicInfo as any).meta?.albumName || '',
    duration: 0,
    source: musicInfo.source,
    songmid: (musicInfo as any).songmid || (musicInfo as any).id || '',
    audioUrl: audioUrl || null,
    picUrl: picUrl || null,
    lrc: lrc || null,
    ttl_days: ttlDays,
  }

  try {
    const res = await fetch(`${serverUrl}/api/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-Share-Token': token } : {}),
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => null)
      throw new Error(errJson?.detail || `HTTP ${res.status}`)
    }

    const data = await res.json()
    if (data.code === 0 && data.data?.shareUrl) {
      clipboardWriteText(data.data.shareUrl)
      const tip = ttlDays > 0
        ? t('share_custom_server_success_ttl', { days: ttlDays })
        : t('share_custom_server_success')
      await dialog({
        message: `${tip}\n\n${data.data.shareUrl}`,
        confirmButtonText: t('confirm_button_text'),
      })
    } else {
      throw new Error(data.msg || '未知错误')
    }
  } catch (err: any) {
    console.error('自建分享失败', err)
    await dialog({
      message: t('share_custom_server_fail', { msg: err.message || String(err) }),
      confirmButtonText: t('confirm_button_text'),
    })
  }
}

export const shareMusic = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  const shareType = appSetting['common.shareType'] || 'clipboard'
  const t = window.i18n.t

  if (shareType === 'custom_server') {
    void shareToCustomServer(musicInfo)
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
