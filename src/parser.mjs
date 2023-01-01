import { Transform } from 'node:stream'
import { Buffer } from 'node:buffer'
import { xor } from './check.mjs'
import modbus from './modbus.mjs'

export class Packet extends Transform {
  constructor(opts = {}) {
    super()

    this.opts = {
      delimiter: Buffer.from('123456', 'hex'),
      lengthOffset: 3,
      lengthBytes: 2,
      minLen: 13,
      ...opts,
    }

    this.buf = Buffer.alloc(0)
  }

  _transform(chunk, _, cb) {
    let data = Buffer.concat([this.buf, chunk])

    if (data.length < this.opts.minLen) {
      this.buf = data
      return cb()
    }

    let pos = data.indexOf(this.opts.delimiter)

    while (pos !== -1) {
      if (data.length < pos + this.opts.lengthOffset + this.opts.lengthBytes) {
        this.buf = data.subarray(pos)
        return cb()
      }

      const len = data.readUIntBE(pos + this.opts.lengthOffset, this.opts.lengthBytes)

      if (data.length < pos + len) {
        this.buf = data.subarray(pos)
        return cb()
      }

      this.push(data.subarray(pos, pos + len))
      data = data.subarray(pos + len)

      pos = data.indexOf(this.opts.delimiter)
    }

    this.buf = data
    cb()
  }
}

export class PS extends Transform {
  constructor(opts = {}) {
    super()

    this.opts = {
      ftIdx: 6, // 帧类型索引
      topic: 'zbcover',
      ...opts,
    }
  }

  _transform(chunk, _, cb) {
    if (xor(chunk.subarray(0, -1)) !== chunk[chunk.length - 1]) {
      return cb()
    }

    const obj = this.#bufToObj(chunk)

    if (chunk[this.opts.ftIdx] === 0x06) {
      const reply = Buffer.from([0x55])
      this.push(this.#objToBuf(obj, reply))
      return cb()
    }

    if (chunk[this.opts.ftIdx] === 0x01) {
      const { reply, pkt } = modbus(obj.data) ?? {}
      this.#publish(obj, pkt)
      if (!reply) return cb()
      this.push(this.#objToBuf(obj, reply))
    }

    cb()
  }

  #bufToObj(buf) {
    const obj = {}
    let i = this.opts.ftIdx + 1
    obj.head = buf.subarray(0, i)
    obj.bjLen = buf.subarray(i, ++i)
    let j = i + Math.floor((obj.bjLen[0] + 1) / 2)
    obj.bj = buf.subarray(i, j)
    obj.zxLen = buf.subarray(j, ++j)
    let k = j + Math.floor((obj.zxLen[0] + 1) / 2)
    obj.zx = buf.subarray(j, k)
    obj.data = buf.subarray(k, -1)
    obj.check = buf.subarray(-1)
    return obj
  }

  #objToBuf(obj, reply) {
    const arr = [obj.head, obj.zxLen, obj.zx, obj.bjLen, obj.bj, reply, obj.check]
    const buf = Buffer.concat(arr)
    buf.writeUint16BE(buf.length, this.opts.ftIdx - 3)
    buf.writeUint8(xor(buf.subarray(0, -1)), buf.length - 1)
    return buf
  }

  #publish(obj, pkt) {
    if (!pkt) return
    const topic = `${this.opts.topic}/${obj.bj.toString('hex')}/${pkt.topic}`
    this.opts.mqc?.publish(topic, pkt.msg)
  }
}
