<template>
  <template v-if="loading">
    <div class="mdui-progress">
      <div class="mdui-progress-indeterminate"></div>
    </div>
    <p>下载弹幕数据中，请耐心等待</p>
  </template>
  <template v-else>
    <div class="mdui-tab" mdui-tab id="nav-tab">
      <a class="mdui-ripple" @click="selectTab(0)">直播</a>
      <a class="mdui-ripple" @click="selectTab(1)">弹幕曲线</a>
      <a class="mdui-ripple" @click="selectTab(2)">弹幕词云</a>
    </div>
    <div v-if="selectedTab === 0">
      <div class="mdui-table-fluid">
        <table class="mdui-table">
          <tbody>
            <tr>
              <td>开始时间</td>
              <td>{{ (new Date(start)).toLocaleString() }}</td>
            </tr>
            <tr>
              <td>结束时间</td>
              <td>{{ (new Date(end)).toLocaleString() }}</td>
            </tr>
            <tr>
              <td>弹幕总数</td>
              <td>{{ danmuList.length }}</td>
            </tr>
            <tr>
              <td>SC总数</td>
              <td>{{ scList.length }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button class="mdui-btn mdui-color-theme-accent mdui-ripple button" @click="selectVideo">播放回放(选择本地视频文件)</button>
      <button class="mdui-btn mdui-color-theme-accent mdui-ripple button" @click="srt">下载同传srt</button>
      <input type="file" accept="video/*" id="video-upload" name="video-upload" @change="replay" v-show="false"/>
    </div>
    <div v-if="selectedTab === 1">
      <div id="danmu-chart" style="height: 400px;"></div>
    </div>
    <div v-if="selectedTab === 2">
      <div class="mdui-textfield input">
        <label class="mdui-textfield-label">权值乘方</label>
        <input class="mdui-textfield-input" type="text" value="0.6" id="cloud-exp"/>
      </div>
      <div class="mdui-textfield input">
        <label class="mdui-textfield-label">缩放</label>
        <input class="mdui-textfield-input" type="text" value="0.4" id="cloud-ratio"/>
      </div>
      <button class="mdui-btn mdui-color-theme-accent mdui-ripple button" @click="drawCloud">计算词云</button>
      <canvas width="1200" height="900" id="cloud-canvas"></canvas>
    </div>
  </template>
</template>

<script setup>
import axios from 'axios'
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { saveAs } from 'file-saver'

const route = useRoute()

let start = ref(0)
let end = ref(0)

let danmuList = ref([])
let scList = ref([])
let cloudRaw

let loading = ref(true)
let tab
let selectedTab = ref(0)

const init = async () => {
  loading.value = true
  start.value = Number(route.params.start)
  end.value = Number(route.params.end)

  danmuList.value = (await axios.get(`/data/danmu/${start.value}.json`)).data
  scList.value = (await axios.get(`/data/sc/${start.value}.json`)).data
  cloudRaw = (await axios.get(`/data/cloud/${start.value}.json`)).data

  loading.value = false
  await nextTick()
  tab = new mdui.Tab('#nav-tab')
  selectTab(0)
}

onMounted(init)
watch(() => route.params.start, init)
watch(() => route.params.end, init)

async function replay() {
  let input = document.getElementById('video-upload')
  let file = input.files[0]
  if (!file) return
  let win = window.open(
    '/win/#/play', 
    `replay${Date.now()}`,
    // 'height=450,width=960,esizable'
  )
  win.replayData = {
    videoURL: URL.createObjectURL(file),
    danmu: danmuList.value,
    sc: scList.value,
    start: start.value,
    end: end.value
  }
  input.value = ''
}

function srt() {
  mdui.alert('正在生成srt字幕文件，请勿关闭页面。<br>也请耐心等待，生成完成后将自动下载')
  const formatTime = (t) => {
    let x = t - start.value
    const h = Math.floor(x / (3600 * 1000)).toString().padStart(2, '0')
    x %= 3600 * 1000
    const m = Math.floor(x / (60 * 1000)).toString().padStart(2, '0')
    x %= 60 * 1000
    const s = Math.floor(x / 1000).toString().padStart(2, '0')
    x %= 1000
    return `${h}:${m}:${s},${x}`
  }

  let res = ''
  let p = 0
  let last = null
  for (let i of danmuList.value) {
    const l = i.content.indexOf('【'),
          r = i.content.indexOf('】')
    if (l === -1 || r === -1 || l + 1 === r) continue
    if (!last) {
      last = i
      continue
    }
    const endTime = Math.min(last.time + 5000, i.time - 1)
    res += `${++p}\r\n${formatTime(last.time)} --> ${formatTime(endTime)}\r\n${last.content}\r\n\r\n`
    last = i
  }
  if (last) res += `${++p}\r\n${formatTime(last.time)} --> ${formatTime(last.time + 5000)}\r\n${last.content}\r\n\r\n`
  const blob = new Blob([res], {
    type: 'text/plain;charset=utf-8'
  })
  saveAs(blob, `${start.value}.srt`)
}

function drawDanmuChart() {
  const sl = 30
  let danmuChart = echarts.init(document.getElementById('danmu-chart'))
  let data = []
  let p = 0;
  for (let rt = 0; start.value + rt <= end.value + sl * 1000 ; rt += sl * 1000) {
    let res = 0
    const t = start.value + rt
    for (;; ++p) {
      if (!danmuList.value[p] || danmuList.value[p].time > t) break
      ++res;
    }
    data.push([t, res])
  }
  danmuChart.setOption({
    tooltip: {
      trigger: 'axis',
      position: function (pt) {
        return [pt[0], '10%'];
      }
    },
    toolbox: {
      feature: {
        dataZoom: {
          yAxisIndex: 'none'
        },
        restore: {},
        saveAsImage: {}
      }
    },
    xAxis: {
      type: 'time',
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      boundaryGap: [0, '100%'],
      max: 'dataMax'
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        start: 0,
        end: 100
      }
    ],
    series: [
      {
        name: '弹幕数',
        type: 'line',
        smooth: true,
        symbol: 'none',
        areaStyle: {},
        data: data
      }
    ]
  })
}

function drawCloud() {
  const exp = Number(document.getElementById('cloud-exp').value)
  const ratio = Number(document.getElementById('cloud-ratio').value)
  let data = []
  for (let i = 0; i < 100; ++i) {
    data.push([cloudRaw[i][0], Math.pow(cloudRaw[i][1], exp) * ratio])
  }
  WordCloud(document.getElementById('cloud-canvas'), { list: data })
}

async function selectTab(index) {
  selectedTab.value = index
  tab.show(index)
  if (index === 1) { // 弹幕曲线
    await nextTick()
    drawDanmuChart()
  }
}

function selectVideo() {
  let input = document.getElementById('video-upload')
  input.click()
}

</script>

<style scoped>
.button {
  margin-top: 8px;
  margin-right: 16px;
}

.input {
  display: inline-block;
  width: 96px;
  margin-top: 8px;
  margin-right: 16px;
}
</style>