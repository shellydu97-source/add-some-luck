import { aspectLabels, bodySymbols, zodiacSymbols } from '../calculation/astrology/format'
import type { PreciseAstrologyResult } from '../calculation/astrology/types'

const CENTER = 170

function point(longitude: number, radius: number) {
  const radians = (longitude - 90) * Math.PI / 180
  return { x: CENTER + Math.cos(radians) * radius, y: CENTER + Math.sin(radians) * radius }
}

export default function AstrologyWheel({ result }: { result: PreciseAstrologyResult }) {
  const planets = Object.fromEntries(result.planets.map((planet) => [planet.body, planet]))
  return <div className="astrology-wheel-wrap">
    <svg className="astrology-wheel" viewBox="0 0 340 340" role="img" aria-labelledby="astrology-wheel-title astrology-wheel-desc">
      <title id="astrology-wheel-title">本命盘圆盘</title>
      <desc id="astrology-wheel-desc">包含十二星座、十二宫、十颗星体和主要相位。</desc>
      <circle cx={CENTER} cy={CENTER} r="154" className="wheel-ring outer" />
      <circle cx={CENTER} cy={CENTER} r="130" className="wheel-ring" />
      <circle cx={CENTER} cy={CENTER} r="84" className="wheel-ring inner" />
      {Array.from({ length: 12 }, (_, index) => {
        const longitude = index * 30
        const inner = point(longitude, 130)
        const outer = point(longitude, 154)
        const label = point(longitude + 15, 142)
        const sign = Object.keys(zodiacSymbols)[index] as keyof typeof zodiacSymbols
        return <g key={`sign-${index}`}><line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} className="zodiac-line" /><text x={label.x} y={label.y} className="zodiac-symbol">{zodiacSymbols[sign]}</text></g>
      })}
      {result.houses.map((house, index) => {
        const inner = point(house.longitudeDeg, 42)
        const outer = point(house.longitudeDeg, 130)
        const next = result.houses[(index + 1) % 12]!
        const arc = ((next.longitudeDeg - house.longitudeDeg + 360) % 360) / 2
        const label = point(house.longitudeDeg + arc, 58)
        return <g key={`house-${house.house}`}><line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} className={`house-line ${house.house === 1 || house.house === 10 ? 'axis' : ''}`} /><text x={label.x} y={label.y} className="house-number">{house.house}</text></g>
      })}
      {result.aspects.map((aspect) => {
        const first = planets[aspect.first]
        const second = planets[aspect.second]
        if (!first || !second) return null
        const start = point(first.longitudeDeg, 78)
        const end = point(second.longitudeDeg, 78)
        return <line key={`${aspect.first}-${aspect.second}-${aspect.type}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={`aspect-line ${aspect.type}`} aria-label={`${aspectLabels[aspect.type]} ${aspect.orbDeg.toFixed(2)}度`} />
      })}
      {result.planets.map((planet, index) => {
        const position = point(planet.longitudeDeg, 104 + (index % 2) * 10)
        return <g key={planet.body} className="planet-mark"><circle cx={position.x} cy={position.y} r="10" /><text x={position.x} y={position.y}>{bodySymbols[planet.body]}</text>{planet.retrograde && <text x={position.x + 9} y={position.y - 8} className="retrograde-mark">R</text>}</g>
      })}
      <circle cx={CENTER} cy={CENTER} r="4" className="wheel-center" />
    </svg>
    <div className="wheel-legend"><span><i className="legend-axis" />ASC / MC 轴</span><span><i className="legend-aspect" />主要相位</span><span>R = 逆行</span></div>
  </div>
}
