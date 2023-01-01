## 中北镇智慧井盖

compose.yaml
```yaml
services:
  zbcover:
    restart: always
    image: nayukidayo/zbcover:0.1
    logging:
      driver: local
    ports:
      - "51824:51824"
    environment:
      - MQTT_HOST=emqx
      - MQTT_PORT=1883
      - MQTT_USERNAME=iot
      - MQTT_PASSWORD=iot!1231qaz
networks:
  default:
    name: app_blade_net
    external: true

```
