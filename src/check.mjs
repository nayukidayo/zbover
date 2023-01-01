export function xor(buf) {
  let check = 0
  for (let i = 0; i < buf.length; i++) {
    check ^= buf[i]
  }
  return check
}

export function crc(buf) {
  let odd
  let crc = 0xffff
  for (let i = 0; i < buf.length; i++) {
    crc = crc ^ buf[i]
    for (let j = 0; j < 8; j++) {
      odd = crc & 0x0001
      crc = crc >> 1
      if (odd) {
        crc = crc ^ 0xa001
      }
    }
  }
  return crc
}
