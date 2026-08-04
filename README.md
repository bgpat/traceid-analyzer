# Trace ID Analyzer

Parse and convert distributed tracing headers in the browser.

Supported formats:

- W3C Trace Context (`traceparent` / `tracestate`)
- B3 (single header)
- Jaeger (`uber-trace-id`)
- AWS X-Ray (`X-Amzn-Trace-Id`)
- Datadog (`x-datadog-*`)
- gRPC (`grpc-trace-bin` / `grpc-tags-bin`)

Editing a valid header updates the other formats.

## Development

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000

## Build

```sh
pnpm build
pnpm preview
```

## License

MIT
