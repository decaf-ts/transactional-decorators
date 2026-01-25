# Dependencies

## Dependency tree
```sh
npm warn Expanding --prod to --production. This will stop working in the next major version of npm.
npm warn config production Use `--omit=dev` instead.
@decaf-ts/transactional-decorators@0.3.5 /home/tvenceslau/local-workspace/decaf-ts/transactional-decorators
├─┬ @decaf-ts/db-decorators@0.8.16
│ ├── @decaf-ts/decoration@0.8.6 deduped
│ ├── @decaf-ts/decorator-validation@1.11.13 deduped
│ ├── @decaf-ts/injectable-decorators@1.9.9 deduped
│ └─┬ @decaf-ts/logging@0.10.8
│   ├─┬ pino@10.1.0
│   │ ├── @pinojs/redact@0.4.0
│   │ ├── atomic-sleep@1.0.0
│   │ ├── on-exit-leak-free@2.1.2
│   │ ├─┬ pino-abstract-transport@2.0.0
│   │ │ └── split2@4.2.0
│   │ ├── pino-std-serializers@7.0.0
│   │ ├── process-warning@5.0.0
│   │ ├── quick-format-unescaped@4.0.4
│   │ ├── real-require@0.2.0
│   │ ├── safe-stable-stringify@2.5.0
│   │ ├─┬ sonic-boom@4.2.0
│   │ │ └── atomic-sleep@1.0.0 deduped
│   │ └─┬ thread-stream@3.1.0
│   │   └── real-require@0.2.0 deduped
│   ├── styled-string-builder@1.5.1
│   ├── typed-object-accumulator@0.1.5
│   └─┬ winston@3.18.3
│     ├── @colors/colors@1.6.0
│     ├─┬ @dabh/diagnostics@2.0.8
│     │ ├─┬ @so-ric/colorspace@1.1.6
│     │ │ ├─┬ color@5.0.2
│     │ │ │ ├─┬ color-convert@3.1.2
│     │ │ │ │ └── color-name@2.0.2
│     │ │ │ └─┬ color-string@2.1.2
│     │ │ │   └── color-name@2.0.2
│     │ │ └── text-hex@1.0.0
│     │ ├── enabled@2.0.0
│     │ └── kuler@2.0.0
│     ├── async@3.2.6
│     ├── is-stream@2.0.1
│     ├─┬ logform@2.7.0
│     │ ├── @colors/colors@1.6.0 deduped
│     │ ├── @types/triple-beam@1.3.5
│     │ ├── fecha@4.2.3
│     │ ├── ms@2.1.3
│     │ ├── safe-stable-stringify@2.5.0 deduped
│     │ └── triple-beam@1.4.1 deduped
│     ├─┬ one-time@1.0.0
│     │ └── fn.name@1.1.0
│     ├─┬ readable-stream@3.6.2
│     │ ├── inherits@2.0.4
│     │ ├─┬ string_decoder@1.3.0
│     │ │ └── safe-buffer@5.2.1
│     │ └── util-deprecate@1.0.2
│     ├── safe-stable-stringify@2.5.0 deduped
│     ├── stack-trace@0.0.10
│     ├── triple-beam@1.4.1
│     └─┬ winston-transport@4.9.0
│       ├── logform@2.7.0 deduped
│       ├── readable-stream@3.6.2 deduped
│       └── triple-beam@1.4.1 deduped
├─┬ @decaf-ts/decoration@0.8.6
│ └── reflect-metadata@0.2.2
├─┬ @decaf-ts/decorator-validation@1.11.13
│ └── @decaf-ts/decoration@0.8.6 deduped
└─┬ @decaf-ts/injectable-decorators@1.9.9
  └── @decaf-ts/decoration@0.8.6 deduped
```
## Audit report
```sh
npm audit --production
npm warn config production Use `--omit=dev` instead.
found 0 vulnerabilities
```
