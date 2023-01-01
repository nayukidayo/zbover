import { Buffer } from 'node:buffer'
import { crc } from './check.mjs'

export default function modbus(buf) {
  if (crc(buf.subarray(0, -2)) !== buf.readUint16LE(buf.length - 2)) return
  try {
    switch (buf[1]) {
      case 0x2c:
        return parse2c(buf)
      case 0x3a:
        return parse3a(buf)
      case 0x3b:
        return parse3b(buf)
    }
  } catch (err) {
    console.log(err)
  }
}

function parse2c(buf) {
  const reply = Buffer.allocUnsafe(6)
  reply.set(buf.subarray(0, 4))
  reply.writeUint16LE(crc(reply.subarray(0, -2)), 4)
  const topic = 'telemetry'
  const msg = bufToObj(buf.subarray(4, -2))
  return { reply, pkt: { topic, msg: JSON.stringify(msg) } }
}

function parse3a(buf) {
  const reply = Buffer.allocUnsafe(12)
  reply.set(buf.subarray(0, 4))
  reply.set(getTime(), 4)
  reply.writeUint16LE(crc(reply.subarray(0, -2)), 10)
  const topic = 'history'
  const msg = []
  for (let i = 0; i < buf[2]; i++) {
    let offset = 4 + buf[3] * i
    const time = buf.subarray(offset, offset + 6).toString('hex')
    const obj = bufToObj(buf.subarray(offset + 6, offset + buf[3]))
    obj.time = time
    msg.push(obj)
  }
  return { reply, pkt: { topic, msg: JSON.stringify(msg) } }
}

function parse3b(buf) {
  const reply = Buffer.allocUnsafe(13)
  reply.set(buf.subarray(0, 5))
  reply.set(getTime(), 5)
  reply.writeUint16LE(crc(reply.subarray(0, -2)), 11)
  const topic = 'event'
  const msg = []
  for (let i = 0; i < buf[3]; i++) {
    let offset = 5 + buf[4] * i
    const time = buf.subarray(offset, offset + 6).toString('hex')
    const obj = bufToObj(buf.subarray(offset + 6, offset + buf[4]))
    obj.time = time
    msg.push(obj)
  }
  return { reply, pkt: { topic, msg: JSON.stringify(msg) } }
}

function getTime() {
  const buf = Buffer.allocUnsafe(6)
  const now = new Date()
  buf[0] = parseInt(now.getFullYear() - 2000, 16)
  buf[1] = parseInt(now.getMonth() + 1, 16)
  buf[2] = parseInt(now.getDate(), 16)
  buf[3] = parseInt(now.getHours(), 16)
  buf[4] = parseInt(now.getMinutes(), 16)
  buf[5] = parseInt(now.getSeconds(), 16)
  return buf
}

function bufToObj(buf) {
  let index = 0
  let arr = []
  const obj = {}

  for (let i = 0; i < addr1.length; i++) {
    const offset = index
    const len = addr1[i][1] * 2
    index = offset + len
    if (index > buf.length) break
    if (35020 <= addr1[i][0] && addr1[i][0] <= 35023) {
      arr.push(...buf.subarray(offset, index))
    } else {
      obj[addr1[i][0]] = addr1[i][2](buf, offset, len, addr1[i][3])
    }
  }

  arr = arr.flatMap(v => v.toString(2).padStart(8, '0').split('').reverse())
  for (let i = 0; i < addr2.length; i++) {
    if (i < arr.length) {
      obj[addr2[i]] = +arr[i]
    }
  }

  return obj
}

function round(number, precision = 3) {
  return Math.round(+number + 'e' + precision) / Math.pow(10, precision)
}
function uint(buf, offset, len, prec) {
  return round(buf.readUIntBE(offset, len) * Math.pow(10, -prec))
}
function int(buf, offset, len, prec) {
  return round(buf.readIntBE(offset, len) * Math.pow(10, -prec))
}
function dou(buf, offset, len, prec) {
  return round(buf.readDoubleBE(offset) * Math.pow(10, -prec))
}
function hex(buf, offset, len, prec) {
  return buf.subarray(offset, offset + len).toString('hex')
}

const addr1 = [
  [35001, 1, uint, 0],
  [35002, 2, uint, 4],
  [35004, 1, uint, 0],
  [35005, 1, uint, 0],
  [35006, 2, uint, 4],
  [35008, 1, uint, 0],
  [35009, 1, uint, 0],
  [35010, 1, uint, 3],
  [35011, 1, uint, 3],
  [35012, 1, uint, 1],
  [35013, 1, uint, 1],
  [35014, 2, uint, 0],
  [35016, 1, uint, 0],
  [35017, 1, uint, 3],
  [35018, 1, uint, 0],
  [35019, 1, int, 0],
  [35020, 1, uint, 0],
  [35021, 1, uint, 0],
  [35022, 1, uint, 0],
  [35023, 1, uint, 0],
  [35024, 1, uint, 0],
  [35025, 1, uint, 2],
  [35026, 4, dou, 0],
  [35030, 2, int, 2],
  [35032, 1, uint, 2],
  [35033, 2, uint, 3],
  [35035, 2, uint, 3],
  [35037, 1, uint, 3],
  [35038, 1, uint, 0],
  [35039, 1, uint, 3],
  [35040, 1, uint, 0],
  [35041, 1, uint, 0],
  [35042, 2, uint, 4],
  [35044, 1, uint, 0],
  [35045, 1, uint, 0],
  [35046, 2, uint, 4],
  [35048, 1, uint, 0],
  [35049, 1, hex, 0],
  [35050, 1, hex, 0],
  [35051, 1, hex, 0],
  [35052, 2, int, 2],
  [35054, 2, uint, 2],
]

const addr2 = [
  15001, 15002, 15003, 15004, 15005, 15006, 15007, 15008, 15009, 15010, 15011, 15012, 15013, 15014,
  15015, 15016, 15017, 15018,
]
