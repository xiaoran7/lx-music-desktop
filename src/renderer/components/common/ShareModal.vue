<template>
  <Modal :show="visible" :bg-close="true" :teleport="teleport" max-width="480px" min-width="360px" @close="handleClose" @after-leave="afterLeave">
    <main :class="$style.main">
      <h2 :class="$style.modalTitle">{{ t('share_modal_title') }}</h2>

      <!-- 歌曲信息摘要 -->
      <div v-if="musicInfo" :class="$style.metaBox">
        <div :class="$style.songTitle">{{ musicInfo.name }}</div>
        <div :class="$style.singer">{{ musicInfo.singer }}{{ musicInfo.meta?.albumName ? ` · ${musicInfo.meta.albumName}` : '' }}</div>
      </div>

      <!-- 有效期选择 -->
      <div :class="$style.section">
        <label :class="$style.sectionLabel">{{ t('share_modal_expire_label') }}：</label>
        <div :class="$style.expireRow">
          <Checkbox
            v-for="item in expireList"
            :id="`share_modal_expire_${item.days}`"
            :key="item.days"
            :model-value="ttlDays"
            :value="item.days"
            :label="item.name"
            :class="$style.checkbox"
            name="share_modal_expire"
            need
            @update:model-value="handleExpireChange"
          />
        </div>
      </div>

      <!-- 结果卡片展示 -->
      <div v-if="shareUrl" :class="$style.resultBox">
        <div :class="$style.urlLabel">{{ t('share_modal_link_label') }}</div>
        <div :class="$style.urlCard" @click="handleCopy">
          <input :class="$style.urlInput" :value="shareUrl" readonly @click="$event.target.select()">
        </div>
        <div v-if="copiedTip" :class="$style.tipText">{{ copiedTip }}</div>
      </div>

      <div v-if="errorMsg" :class="$style.errorText">{{ errorMsg }}</div>
    </main>

    <footer :class="$style.footer">
      <template v-if="shareUrl">
        <Btn :class="[$style.btn, $style.primaryBtn]" @click="handleCopy">{{ t('share_modal_copy_btn') }}</Btn>
        <Btn :class="[$style.btn, $style.actionBtn]" @click="handleOpenBrowser">{{ t('share_modal_open_browser') }}</Btn>
        <Btn :class="$style.btn" @click="handleClose">{{ t('share_modal_close_btn') }}</Btn>
      </template>
      <template v-else>
        <Btn :class="[$style.btn, $style.primaryBtn]" :disabled="loading" @click="handleGenerate">
          {{ loading ? t('share_modal_generating') : t('share_modal_generate_btn') }}
        </Btn>
        <Btn :class="$style.btn" :disabled="loading" @click="handleClose">{{ t('share_modal_close_btn') }}</Btn>
      </template>
    </footer>
  </Modal>
</template>

<script>
import Modal from '@renderer/components/material/Modal.vue'
import Btn from '@renderer/components/base/Btn.vue'
import Checkbox from '@renderer/components/base/Checkbox.vue'
import { appSetting } from '@renderer/store/setting'
import { clipboardWriteText, openUrl } from '@common/utils/electron'
import { getMusicUrl, getPicPath, getLyricInfo } from '@renderer/core/music'
import { useI18n } from '@renderer/plugins/i18n'

export default {
  name: 'ShareModal',
  components: {
    Modal,
    Btn,
    Checkbox,
  },
  props: {
    musicInfo: {
      type: Object,
      required: true,
    },
    afterLeave: {
      type: Function,
      default: () => {},
    },
    teleport: {
      type: String,
      default: '#root',
    },
  },
  setup() {
    const t = useI18n()
    return {
      t,
    }
  },
  data() {
    return {
      visible: false,
      loading: false,
      ttlDays: appSetting['common.shareExpireDays'] ?? 7,
      shareUrl: '',
      copiedTip: '',
      errorMsg: '',
    }
  },
  computed: {
    expireList() {
      return [
        { days: 1, name: this.t('setting__basic_share_expire_day_1') || '1天' },
        { days: 3, name: this.t('setting__basic_share_expire_day_3') || '3天' },
        { days: 7, name: this.t('setting__basic_share_expire_day_7') || '7天' },
        { days: 30, name: this.t('setting__basic_share_expire_day_30') || '30天' },
        { days: 0, name: this.t('setting__basic_share_expire_day_0') || '永久' },
      ]
    },
  },
  methods: {
    handleExpireChange(val) {
      this.ttlDays = val
      if (this.shareUrl) {
        this.shareUrl = ''
        this.copiedTip = ''
      }
    },
    handleClose() {
      this.visible = false
    },
    async handleGenerate() {
      if (this.loading || !this.musicInfo) return
      this.loading = true
      this.errorMsg = ''
      this.copiedTip = ''

      const serverUrl = (appSetting['common.shareServerUrl'] || '').trim().replace(/\/+$/, '')
      if (!serverUrl) {
        this.errorMsg = this.t('share_custom_server_no_url') || '请先前往【设置 - 基本设置 - 私有分享服务】配置服务端地址'
        this.loading = false
        return
      }
      const token = (appSetting['common.shareServerToken'] || '').trim()

      let audioUrl = ''
      try {
        audioUrl = await getMusicUrl({ musicInfo: this.musicInfo, isRefresh: true })
      } catch (e) {
        console.warn('获取音频直链失败', e)
      }

      if (!audioUrl) {
        this.errorMsg = this.t('share_custom_server_no_audio')
        this.loading = false
        return
      }

      let picUrl = ''
      try {
        picUrl = await getPicPath({ musicInfo: this.musicInfo })
      } catch (e) {
        console.warn('获取封面失败', e)
      }

      let lrc = ''
      try {
        const lyricInfo = await getLyricInfo({ musicInfo: this.musicInfo })
        lrc = lyricInfo.lyric || ''
      } catch (e) {
        console.warn('获取歌词失败', e)
      }

      const payload = {
        token,
        title: this.musicInfo.name,
        singer: this.musicInfo.singer,
        album: this.musicInfo.meta?.albumName || '',
        duration: 0,
        source: this.musicInfo.source,
        songmid: this.musicInfo.songmid || this.musicInfo.id || '',
        audioUrl: audioUrl || null,
        picUrl: picUrl || null,
        lrc: lrc || null,
        ttl_days: this.ttlDays,
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
          this.shareUrl = data.data.shareUrl
        } else {
          throw new Error(data.msg || '未知错误')
        }
      } catch (err) {
        this.errorMsg = this.t('share_custom_server_fail', { msg: err.message || String(err) })
      } finally {
        this.loading = false
      }
    },
    handleCopy() {
      if (!this.shareUrl) return
      clipboardWriteText(this.shareUrl)
      this.copiedTip = this.ttlDays > 0
        ? this.t('share_custom_server_success_ttl', { days: this.ttlDays })
        : this.t('share_custom_server_success')
    },
    handleOpenBrowser() {
      if (!this.shareUrl) return
      void openUrl(this.shareUrl)
    },
  },
}
</script>

<style lang="less" module>
.main {
  flex: auto;
  padding: 16px 20px 8px;
  line-height: 1.5;
}

.modalTitle {
  font-size: 16px;
  font-weight: bold;
  color: var(--color-font);
  margin-bottom: 12px;
}

.metaBox {
  padding-bottom: 10px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--color-primary-alpha-800);
}

.songTitle {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 4px;
}

.singer {
  font-size: 12px;
  color: var(--color-font-label);
}

.section {
  margin-bottom: 14px;
}

.sectionLabel {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-font-label);
  display: block;
  margin-bottom: 6px;
}

.expireRow {
  display: flex;
  flex-flow: row wrap;
  gap: 12px;
}

.checkbox {
  margin-right: 4px;
}

.resultBox {
  margin-top: 10px;
}

.urlLabel {
  font-size: 12px;
  color: var(--color-font-label);
  margin-bottom: 4px;
}

.urlCard {
  background: var(--color-primary-alpha-900);
  border: 1px solid var(--color-primary-alpha-600);
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  transition: border-color 0.2s;
  &:hover {
    border-color: var(--color-primary);
  }
}

.urlInput {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
}

.tipText {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-primary);
  font-weight: 500;
}

.errorText {
  margin-top: 8px;
  font-size: 12px;
  color: #ef4444;
}

.footer {
  flex: none;
  padding: 12px 20px 16px;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  min-width: 72px;
  font-size: 13px;
}

.primaryBtn {
  background-color: var(--color-primary) !important;
  color: #ffffff !important;
  font-weight: bold;
}

.actionBtn {
  background-color: #3b82f6 !important;
  color: #ffffff !important;
  font-weight: 500;
}
</style>
