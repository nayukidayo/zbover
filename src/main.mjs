import net from 'node:net'
import { env } from 'node:process'
import { connect } from 'mqtt'
import { Packet, PS } from './parser.mjs'

const opts = {
  protocol: 'mqtt',
  host: env.MQTT_HOST,
  port: env.MQTT_PORT,
  username: env.MQTT_USERNAME,
  password: env.MQTT_PASSWORD,
}

const mqc = connect(opts)
mqc.on('error', console.log)

const server = net.createServer(c => {
  c.on('error', console.log)
  c.pipe(new Packet()).pipe(new PS({ mqc })).pipe(c)
})

server.on('error', console.log)
server.listen(51824, '0.0.0.0')
