import db from './db.js'
import fs from 'fs'
import { exec } from 'child_process'
import nodejieba from 'nodejieba'

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



(async () => {
  // await db('live').insert({
  //   type: 0,
  //   time: 1661532817452
  // })

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
  console.log('ok')
})()
