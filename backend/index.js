import Danmu from './danmu.js'
import db from './db.js'
import fs from 'fs'
import { exec } from 'child_process'

const danmu = new Danmu(21402309)
// 关注真白花音喵 关注真白花音谢谢喵

danmu.connect()

danmu.on('disconnect', () => {
  console.log('* 从服务器断开连接，重连')
  danmu.connect() // 重连
})

danmu.on('ws', () => {
  console.log('* Websocket链接建立')
})

danmu.on('ready', () => {
  console.log('* 成功进入直播间')
})

danmu.on('danmu', (data) => {
  if (data.redbag !== 0) return
  db('danmu').insert(data)
})

danmu.on('sc', (data) => {
  wss(data)
  db('sc').insert(data)
})

danmu.on('liveOn', (data) => {
  db('live').insert({
    type: 1,
    time: data.time
  })
})

function calcCloud(danmu) {
  let dic = {}
  for (let i = 0; i < danmu.length; ++i) {
    const seg = nodejieba.extract(danmu[i].content, 999)
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
  return arr.slice(0, 100)
}

danmu.on('liveOff', async (data) => {
  await db('live').insert({
    type: 0,
    time: data.time
  })
  console.log('下播', data)

  liveData = await db('live').find({}, { sort: { time: -1 } })
  liveRes = []
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

  exec(`cd .. && git add . && git commit -m '${l}' && git push`)
})