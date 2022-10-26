import Danmu from './danmu.js'
import db from './db.js'
import fs from 'fs'
import { exec } from 'child_process'
import nodejieba from 'nodejieba'
import axios from 'axios'

function log(text) {
  console.log(`[${new Date().toLocaleString()}] ${text}`)
}

const danmu = new Danmu(21402309)
// 关注真白花音喵 关注真白花音谢谢喵

danmu.connect()
nodejieba.load()
nodejieba.insertWord('叉出去')
nodejieba.insertWord('かのん')
nodejieba.insertWord('需一千万')
nodejieba.insertWord('114514')
nodejieba.insertWord('1919810')
nodejieba.insertWord('哈哈哈')
nodejieba.insertWord('帕清姬')
nodejieba.insertWord('下次还敢')
nodejieba.insertWord('ttk')
nodejieba.insertWord('homo')

nodejieba.insertWord('88888888')
nodejieba.insertWord('www')
nodejieba.insertWord('AA')
nodejieba.insertWord('哈哈哈')
nodejieba.insertWord('啊啊啊')
const repeatDic = {
  'A': 'AA',
  '哈': '哈哈哈',
  '啊': '啊啊啊',
  '8': '88888888',
  'w': 'www'
}

danmu.on('disconnect', () => {
  log('* 从服务器断开连接，重连')
  danmu.connect() // 重连
})

danmu.on('ws', () => {
  log('* Websocket链接建立')
})

danmu.on('ready', () => {
  log('* 成功进入直播间')
})

danmu.on('danmu', (data) => {
  if (data.redbag !== 0) return
  db('danmu').insert(data)
})

danmu.on('sc', (data) => {
  db('sc').insert(data)
})

function calcCloud(danmu) {
  let dic = {}
  for (let i = 0; i < danmu.length; ++i) {
    let x = danmu[i].content
    if (x.length >= 3 && repeatDic[x[0]] && x === x[0].repeat(x.length)) {
	  x = repeatDic[x[0]]
    }
    const seg = nodejieba.extract(x, 999)
    for (let j of seg) {
      const w = j.word
      if (!dic[w]) dic[w] = j.weight
      else dic[w] += j.weight
    }
  }
  let arr = []
  for (let k in dic) {
    arr.push([k, dic[k]])
  }
  arr.sort((a, b) => b[1] - a[1])
  return arr.slice(0, 200)
}

const liveOff = async () => {
  await db('live').insert({
    type: 0,
    time: new Date().getTime()
  })

  const liveData = await db('live').find({}, { sort: { time: -1 } })
  let liveRes = []
  for (let i = 0; i < liveData.length; i += 2) {
    liveRes.push([liveData[i + 1].time, liveData[i].time])
  }
  fs.writeFileSync('../public/data/live.json', JSON.stringify(liveRes), { flag: 'w' })

  const l = liveData[1].time, r = liveData[0].time
  const danmuData = await db('danmu').find({ time: { $gt: l, $lt: r } }, { sort: { time: 1 }, projection: { _id: 0 } })
  const scData = await db('sc').find({ time: { $gt: l, $lt: r } }, { sort: { time: 1 }, projection: { _id: 0 } })
  const cloudData = calcCloud(danmuData)

  fs.writeFileSync(`../public/data/cloud/${l}.json`, JSON.stringify(cloudData), { flag: 'w' })
  fs.writeFileSync(`../public/data/danmu/${l}.json`, JSON.stringify(danmuData), { flag: 'w' })
  fs.writeFileSync(`../public/data/sc/${l}.json`, JSON.stringify(scData), { flag: 'w' })

  exec(`cd .. && git add --all . && git commit -m 'update ${l}' && git push`)
}

setInterval(async () => {
  const lstL = await db('live').raw().findOne({}, { sort: { time: -1 } })
  const { data } = await axios.get('https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id=21402309&protocol=0,1&format=0,1,2&codec=0,1&qn=0&platform=web&ptype=8&dolby=5&panorama=1')
  if (lstL.type) { // 数据库显示现在状态为直播中
    if (!data.data.live_status) { // 但是最新数据显示已经下播了
      log('下播')
      await liveOff()
    }
  } else { // 数据库显示现在状态是没开播
    if (data.data.live_status) { // 但是最新数据显示开播了
      log(`开播 ${data.data.live_time}`)
      await db('live').insert({ // 添加开播信息
        type: 1,
        time: data.data.live_time * 1000
      })
    }
  }
}, 1000 * 60 * 3)