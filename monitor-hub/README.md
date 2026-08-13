# 🌐 Monitor Hub (Cloudflare Workers + Durable Objects)

분산된 여러 서버 인스턴스(`monitor-agent`)로부터 텔레메트리 데이터를 실시간 수집하고, 원격 RPC 제어 및 종합 관제를 제공하는 Cloudflare Edge 중앙 마스터 허브입니다.

## 🏗️ 아키텍처

- **Cloudflare Worker**: Edge HTTP 요청 처리 및 마이크로서비스 게이트웨이
- **Durable Objects (`ServerRegistry`)**: 
  - 각 분산 서버 에이전트와의 지속적 WebSocket (`wss://`) 커넥션 유지
  - 다중 노드 실시간 메트릭 모니터링 & 상태 동기화
  - 대시보드 UI로부터 전송된 도커 시작/중지/재시작 및 로그 조회 요청을 해당 노드로 전달 (RPC)
- **Vite React UI**: 다중 인스턴스 선택기 (Multi-Node Selector) 및 텔레메트리/도커/포트 토폴로지 관제 UI

## 🚀 배포 방법 (Deploy to Cloudflare)

```bash
cd ~/.openclaw/workspace/monitor-hub
npm run build
npx wrangler deploy
```
