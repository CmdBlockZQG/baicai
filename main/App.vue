<template>
  <div class="mdui-drawer mdui-shadow-6" id="left-drawer">
    <ul class="mdui-list">
      <li class="mdui-list-item mdui-ripple">
        <i class="mdui-list-item-icon mdui-icon material-icons">home</i>
        <div class="mdui-list-item-content" @click="router.push(`/`)">主页</div>
      </li>
      <li class="mdui-subheader">历史直播</li>
      <li v-for="(p, i) in ls" @click="router.push(`/${ls[i].start}/${ls[i].end}`)" class="mdui-list-item mdui-ripple">{{ p.text }}</li>
    </ul>
  </div>
  <div class="mdui-container" style="padding-top: 24px;">
    <router-view></router-view>
  </div>
</template>

<script setup>
import axios from 'axios'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

let ls = ref([])

function timeToText(time) {
  let t = new Date(time),
        m = t.getMonth() + 1,
        d = t.getDate(),
        h = t.getHours()
  return `${m}月${d}日${h}点场`
}

onMounted(async () => {
  const { data } = await axios.get('/data/live.json')
  for (let i of data) {
    ls.value.push({
      start: i[0],
      end: i[1],
      text: timeToText(i[0])
    })
  }
})

</script>

<style scoped>

</style>
