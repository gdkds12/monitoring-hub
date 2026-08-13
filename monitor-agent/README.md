# 📡 Monitor Node Agent

Cloudflare Workers + Durable Objects 관제 허브(Master Hub)에 연결하여 텔레메트리 데이터를 실시간 송신하고 도커/포트 제어 명령을 수행하는 경량 에이전트 데몬입니다.

## 🛠️ 기능

1. **자동 연결 & 재연결 (Auto-reconnect)**: Cloudflare DO Master Hub로 WSS 연결 수립 및 끊김 시 자동 재연결
2. **실시간 텔레메트리 송신**: 2초 주기로 CPU(4코어), RAM(24GB), 디스크, 네트워크 Rx/Tx, 도커 상태, 포트 매핑 송신
3. **원격 RPC 제어**: Hub로부터 전달된 도커 시작/중지/재시작 및 실시간 tail 로그 요청 처리

## 💻 실행 방법

```bash
cd ~/.openclaw/workspace/monitor-agent
npm start
```
