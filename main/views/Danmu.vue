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
      <a class="mdui-ripple" @click="selectTab(3)">SC统计</a>
      <a class="mdui-ripple" @click="selectTab(4)">弹幕统计(这里很卡 请耐心等待加载)</a>
    </div>
    <div v-show="selectedTab === 0">
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
      <p>同传srt可能有正负10s或以内的时间轴整体偏移，请在播放器中自行调整。</p>
      <p>回放也需要您自行调整延时。在右上角输入框内填入延时毫秒数，可为负值（即提前），并确认即可直接应用。</p>
      <p>回放仅支持PC端现代浏览器</p>
    </div>
    <div v-show="selectedTab === 1">
      <div id="danmu-chart" style="height: 400px;"></div>
    </div>
    <div class="mdui-row" v-show="selectedTab === 2">

      <div class="mdui-col-xs-3">
        <div class="mdui-textfield input">
          <label class="mdui-textfield-label">权值乘方</label>
          <input class="mdui-textfield-input" type="text" value="0.6" id="cloud-exp"/>
        </div>
        <div class="mdui-textfield input">
          <label class="mdui-textfield-label">缩放</label>
          <input class="mdui-textfield-input" type="text" value="0.4" id="cloud-ratio"/>
        </div>
        <div style="height: 600px; overflow-y: scroll;">
          <div class="mdui-list">
            <label class="mdui-list-item mdui-ripple" v-for="(v, i) in cloudList">
              <div class="mdui-checkbox">
                <input type="checkbox" v-model="cloudSelect[i]"/>
                <i class="mdui-checkbox-icon"></i>
              </div>
              <div class="mdui-list-item-content">{{ v[0] }} - {{ v[1].toFixed(2) }}</div>
            </label>
          </div>
        </div>

        <button class="mdui-btn mdui-color-theme-accent mdui-ripple button" @click="drawCloud">计算词云</button>
      </div>

      <div class="mdui-col-xs-9">
        <canvas width="1000" height="900" id="cloud-canvas"></canvas>
      </div>

      
    </div>

    <div class="mdui-row" v-show="selectedTab === 3">
      <div v-show="!showSCList">
        <p>按照SC总金额降序排序</p>
        <table class="mdui-table">
          <thead>
            <tr>
              <th>uid</th>
              <th>用户名</th>
              <th>SC总金额</th>
              <th>SC总数</th>
              <th>#</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>#</td>
              <td>所有用户</td>
              <td>{{ scList.reduce((tot, cur) => tot + cur.price, 0) }}</td>
              <td>{{ scList.length }}</td>
              <td><button class="mdui-btn mdui-color-theme-accent mdui-ripple" @click="displaySCList(0)">查看全部SC</button></td>
            </tr>
            <tr v-for="cur in scUsers">
              <td>{{ cur.uid }}</td>
              <td>{{ cur.name }}</td>
              <td>{{ cur.price }}</td>
              <td>{{ cur.count }}</td>
              <td><button class="mdui-btn mdui-color-theme-accent mdui-ripple" @click="displaySCList(cur.uid)">查看SC列表</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-show="showSCList">
        <button class="mdui-btn mdui-color-theme-accent mdui-ripple" @click="showSCList = false">
          <i class="mdui-icon material-icons">arrow_back</i>
          返回
        </button>
        <table class="mdui-table">
          <thead>
            <tr>
              <th>uid</th>
              <th>用户名</th>
              <th>金额</th>
              <th>时间</th>
              <th>内容</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="cur in scList">
              <tr v-if="currentSCUser === 0 || cur.user.uid === currentSCUser">
                <td>{{ cur.user.uid }}</td>
                <td>{{ cur.user.name }}</td>
                <td>{{ cur.price }}</td>
                <td>{{ (new Date(cur.time)).toLocaleString() }}</td>
                <td>{{ cur.content }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      
    </div>

    <div v-if="selectedTab === 4">
      <div v-if="!showDanmuList">
        <p>按照弹幕总数降序排序，过滤表情弹幕</p>
        <table class="mdui-table">
          <thead>
            <tr>
              <th>uid</th>
              <th>用户名</th>
              <th>弹幕总数</th>
              <th>#</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>#</td>
              <td>所有用户</td>
              <td>{{ danmuList.length }}</td>
              <td><button class="mdui-btn mdui-color-theme-accent mdui-ripple" @click="displayDanmuList(0)">查看全部弹幕</button></td>
            </tr>
            <tr v-for="cur in danmuUsers">
              <td>{{ cur.uid }}</td>
              <td>{{ cur.name }}</td>
              <td>{{ cur.count }}</td>
              <td><button class="mdui-btn mdui-color-theme-accent mdui-ripple" @click="displayDanmuList(cur.uid)">查看弹幕列表</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="showDanmuList">
        <button class="mdui-btn mdui-color-theme-accent mdui-ripple" @click="showDanmuList = false">
          <i class="mdui-icon material-icons">arrow_back</i>
          返回
        </button>
        <table class="mdui-table">
          <thead>
            <tr>
              <th>uid</th>
              <th>用户名</th>
              <th>时间</th>
              <th>内容</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="cur in danmuList">
              <tr v-if="cur.type === 0 && (currentDanmuUser === 0 || cur.user.uid === currentDanmuUser)">
                <td>{{ cur.user.uid }}</td>
                <td>{{ cur.user.name }}</td>
                <td>{{ (new Date(cur.time)).toLocaleString() }}</td>
                <td>{{ cur.content }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
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
let cloudList = ref([])
let cloudSelect = ref(new Array(200).fill(true, 0, 100).fill(false, 100, 200))

let loading = ref(true)
let tab
let selectedTab = ref(0)

const init = async () => {
  loading.value = true
  start.value = Number(route.params.start)
  end.value = Number(route.params.end)

  danmuList.value = (await axios.get(`/data/danmu/${start.value}.json`)).data
  scList.value = (await axios.get(`/data/sc/${start.value}.json`)).data
  cloudList.value = (await axios.get(`/data/cloud/${start.value}.json`)).data

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
  for (let i = 0, j = 0; i < 200 && j < 100; ++i) {
    if (cloudSelect.value[i]) {
      data.push([cloudList.value[i][0], Math.pow(cloudList.value[i][1], exp) * ratio])
      ++j
    }
  }
  WordCloud(document.getElementById('cloud-canvas'), { list: data, fontFamily: 'roboto' })
}

let scUsers = ref([])
let showSCList = ref(false)
let currentSCUser = ref(0)

let danmuUsers = ref([])
let showDanmuList = ref(false)
let currentDanmuUser = ref(0)

async function selectTab(index) {
  selectedTab.value = index
  tab.show(index)
  if (index === 1) { // 弹幕曲线
    await nextTick()
    drawDanmuChart()
  }
  if (index === 3) { // SC统计
    let dic = {}
    for (let cur of scList.value) {
      if (!dic[cur.user.uid]) {
        dic[cur.user.uid] = {
          uid: cur.user.uid,
          name: cur.user.name,
          count: 1,
          price: cur.price
        }
      } else {
        ++dic[cur.user.uid].count
        dic[cur.user.uid].price += cur.price
        dic[cur.user.uid].name = cur.user.name
      }
    }
    scUsers.value = []
    for (let k in dic) {
      scUsers.value.push(dic[k])
    }
    scUsers.value.sort((a, b) => b.price - a.price)
  }
  if (index === 4) { // 弹幕统计
    let dic = {}
    for (let cur of danmuList.value) {
      if (cur.type) continue // 跳过表情弹幕
      if (!dic[cur.user.uid]) {
        dic[cur.user.uid] = {
          uid: cur.user.uid,
          name: cur.user.name,
          count: 1,
        }
      } else {
        ++dic[cur.user.uid].count
        dic[cur.user.uid].name = cur.user.name
      }
    }
    danmuUsers.value = []
    for (let k in dic) {
      danmuUsers.value.push(dic[k])
    }
    danmuUsers.value.sort((a, b) => b.count - a.count)
  }
}

function displaySCList(uid) {
  currentSCUser.value = uid
  showSCList.value = true
}

function displayDanmuList(uid) {
  currentDanmuUser.value = uid
  showDanmuList.value = true
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