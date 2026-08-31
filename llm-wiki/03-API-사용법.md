# API 사용법

## 아키텍처 개요

Claude API 호출은 전부 `POST /v1/messages` 엔드포인트 하나를 통해 이루어집니다. 도구 사용(tool use)이나 구조화된 출력도 이 엔드포인트의 옵션일 뿐, 별도 API가 아닙니다.

## 인증

- 공식 SDK(`anthropic`, `@anthropic-ai/sdk` 등)를 사용하면 `ANTHROPIC_API_KEY` 환경 변수를 읽어 자동으로 인증합니다.
- 환경 변수가 없다고 해서 인증 정보가 없는 것은 아닙니다 — `ant auth login`으로 로그인한 세션이 있으면 SDK가 자동으로 해당 프로필을 사용합니다.
- API 키가 필요한지 확인하려면 먼저 `ant auth status`로 활성 인증 상태를 확인하세요.

## 기본 요청 예시 (Python)

```python
import anthropic

client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 또는 ant 프로필 자동 인식

response = client.messages.create(
    model="claude-opus-5",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    messages=[
        {"role": "user", "content": "여기에 질문을 작성"}
    ],
)

print(response.content)
```

## 기본 요청 예시 (cURL)

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-opus-5",
    "max_tokens": 16000,
    "messages": [{"role": "user", "content": "여기에 질문을 작성"}]
  }'
```

## 스트리밍

- 응답이 길어질 수 있거나 `max_tokens`를 크게 잡는 경우(특히 128K에 가까운 출력) HTTP 타임아웃을 피하려면 스트리밍을 사용합니다.
- SDK의 `stream.get_final_message()` (Python) / `.finalMessage()` (TypeScript)를 쓰면 개별 이벤트를 직접 처리하지 않고도 완성된 응답을 받을 수 있습니다.

```python
with client.messages.stream(
    model="claude-opus-5",
    max_tokens=64000,
    messages=[{"role": "user", "content": "..."}],
) as stream:
    response = stream.get_final_message()
```

## `max_tokens` 기본값 가이드

- 비스트리밍 요청: 약 16000 (SDK HTTP 타임아웃 안쪽으로 유지)
- 스트리밍 요청: 약 64000
- 단순 분류 등 짧은 출력만 필요하면 더 낮게 설정 가능 (예: 256)

## 도구 사용(Tool Use)이 필요한 경우

- 직접 만든 함수를 Claude가 호출하게 하려면 tool 정의 + 에이전트 루프가 필요합니다.
- SDK의 Tool Runner(`client.beta.messages.tool_runner`, TypeScript는 `toolRunner`)를 쓰면 루프를 직접 작성하지 않아도 됩니다.
- 병렬 도구 호출 결과는 반드시 하나의 사용자 메시지에 모두 담아 반환해야 합니다 — 여러 메시지로 나누면 이후 병렬 호출 품질이 떨어집니다.

## 언어별 상세 문서

Python, TypeScript, Java, Go, Ruby, C#, PHP 등 언어별 SDK 사용법(설치, 인증, 스트리밍, 배치, 파일 API 등)은 필요할 때 Claude Code의 `claude-api` 스킬을 통해 최신 예제를 확인하는 것을 권장합니다. 이 문서는 팀 내부 개요용이며, 실제 구현 시에는 공식 SDK 문서를 기준으로 검증하세요.
