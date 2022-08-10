import db from './db.js'
import fs from 'fs'
import { exec } from 'child_process'
import nodejieba from 'nodejieba'

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

(async (data) => {
  let liveData = await db('live').find({}, { sort: { time: -1 } })
  liveData = liveData.slice(1)
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
})()