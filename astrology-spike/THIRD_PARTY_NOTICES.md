# Third-party notices

## Runtime dependency

### Astronomy Engine 2.1.19

- Project: <https://github.com/cosinekitty/astronomy>
- Package: `astronomy-engine@2.1.19`（精确锁定）
- License: MIT
- Use: project spike runtime calculation for geocentric apparent planetary positions.

## Offline coordinate source

### GeoNames China country dump

- Source: <https://download.geonames.org/export/dump/CN.zip>
- Documentation: <https://download.geonames.org/export/dump/readme.txt>
- Snapshot download date: 2026-07-14
- SHA-256: `7B90B81D1B61AF90A38D93A97958E1A4DEBEFF9BD1B21A558785D16353D8B96A`
- License: Creative Commons Attribution 4.0
- Attribution: geographical data supplied by GeoNames (<https://www.geonames.org/>).

## External validation only — not bundled and not runtime dependencies

### Swiss Ephemeris `swetest` 2.10.03

Only the external executable was used to create QA text output, forced to Moshier mode. No Swiss source code, executable, WASM, or ephemeris files are present in this project. Swiss Ephemeris has AGPL/commercial dual-licensing implications and must not be added to the product until a separate licensing decision is approved.

### Astrolog 8.00

Used outside the project in independent Matrix mode (`-bm`) to cross-check angles and Placidus cusps. The executable and source are not bundled. Astrolog is distributed under GPL terms; its Matrix output is retained only as QA evidence.

### NASA/JPL Horizons API

Public API output using DE441 and observer quantity 31 is retained as independent planetary-position QA evidence. See <https://ssd-api.jpl.nasa.gov/doc/horizons.html>.
