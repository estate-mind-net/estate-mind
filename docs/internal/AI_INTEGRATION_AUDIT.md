# AI Integration Audit

Date: 2026-06-03
Repository: EstateMind (estatemind)

## Executive Conclusion

OpenAI is not directly integrated as a first-party SDK/API client in the current source runtime.

What exists today:
- AI service implementations are present in source and use Spark LLM APIs (spark.llm), not the OpenAI SDK directly.
- Deal Analyzer UI currently runs mock/local analysis flow.
- No first-party backend API routes were found in source that call OpenAI.

## 1) OPENAI_API_KEY Usage

### Findings
- .env.local contains OPENAI_API_KEY:
  - [.env.local](.env.local#L4)
- Runtime config expects VITE_OPENAI_API_KEY (frontend env), not OPENAI_API_KEY:
  - [src/services/config.ts](src/services/config.ts#L7)
  - [src/services/config.ts](src/services/config.ts#L24)
- Documentation and migration notes reference OpenAI usage and keys, but these are docs/examples:
  - [src/services/README.md](src/services/README.md#L36)
  - [MIGRATION_NOTES.md](MIGRATION_NOTES.md#L1041)

### Interpretation
- OPENAI_API_KEY in .env.local is not consumed by the current frontend config path.
- The active config gate for AI is hasAIConfig() based on VITE_OPENAI_API_KEY, not OPENAI_API_KEY.

## 2) AI Service Implementations

### Present in source
- [src/services/ai/analysis.service.ts](src/services/ai/analysis.service.ts)
- [src/services/ai/document.service.ts](src/services/ai/document.service.ts)
- [src/services/ai/index.ts](src/services/ai/index.ts)

### Behavior
- AIService uses spark.llm and spark.llmPrompt for analysis/insights/location/market summary:
  - [src/services/ai/analysis.service.ts](src/services/ai/analysis.service.ts#L40)
  - [src/services/ai/analysis.service.ts](src/services/ai/analysis.service.ts#L118)
- DocumentAIService uses spark.llm for document analysis, extraction, and checklist generation:
  - [src/services/ai/document.service.ts](src/services/ai/document.service.ts#L43)
  - [src/services/ai/document.service.ts](src/services/ai/document.service.ts#L84)
  - [src/services/ai/document.service.ts](src/services/ai/document.service.ts#L128)
- Both services fall back to mock outputs when hasAIConfig() is false.

### Runtime wiring status
- No UI/component usage of aiService or documentAIService was found outside docs/examples.
- References in [src/services/README.md](src/services/README.md) are example usage only.

## 3) API Routes that Call OpenAI

### Source tree
- No first-party API route files were found in source (no app/api, server routes, or backend handlers in src calling OpenAI).
- No OpenAI SDK client construction found in source runtime files.

### Build artifact observation
- Generated build artifacts include Spark proxy endpoints (for Spark runtime), e.g. /_spark/llm in dist proxy bundle:
  - [dist/proxy.js](dist/proxy.js#L66747)
- This indicates Spark-managed LLM routing in built output, not explicit application-owned OpenAI route code in source.

### Conclusion
- No repository-owned API endpoint in source currently calls OpenAI directly.

## 4) Deal Analyzer Functionality

### UI flow
- Deal Analyzer screen exists:
  - [src/components/DealAnalyzer.tsx](src/components/DealAnalyzer.tsx)
- Submission builds a property object and simulates processing with setTimeout before returning results:
  - [src/components/DealAnalyzer.tsx](src/components/DealAnalyzer.tsx#L58)

### Analysis execution path
- App routes analyzer output through generateMockAnalysis():
  - [src/App.tsx](src/App.tsx#L11)
  - [src/App.tsx](src/App.tsx#L31)
- Mock engine implementation:
  - [src/lib/analyzerEngine.ts](src/lib/analyzerEngine.ts#L3)

### Conclusion
- Deal Analyzer currently uses mock/local analysis logic, not AI service calls or OpenAI API calls.

## 5) Overall Integration Status

Current OpenAI integration status in this repository:
- OpenAI key presence: yes (in .env.local), but key name mismatch for active frontend config path.
- OpenAI SDK integration in source runtime: not found.
- AI service layer: implemented (Spark-based), not integrated into active Deal Analyzer UI flow.
- API routes calling OpenAI (source): not found.
- Deal Analyzer behavior: mock/local generation path active.

## Security Note

Sensitive keys are present in [.env.local](.env.local). This is risky if leaked or committed.
- Prefer server-side secret handling for provider keys.
- Rotate exposed keys if there is any possibility of prior exposure.
