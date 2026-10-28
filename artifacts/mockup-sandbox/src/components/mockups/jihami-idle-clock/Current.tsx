import { useEffect, useState } from "react";
import "./_group.css";

const romanNumerals = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

function point(cx: number, cy: number, radiusX: number, radiusY: number, factor: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + Math.sin(radians) * radiusX * factor,
    y: cy - Math.cos(radians) * radiusY * factor,
  };
}

function handPoint(cx: number, cy: number, length: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + Math.sin(radians) * length,
    y: cy - Math.cos(radians) * length,
  };
}

function timeLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function Current() {
  const [now, setNow] = useState(() => new Date());
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth || 1280,
    height: window.innerHeight || 720,
  }));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const resize = () => setViewport({
      width: window.innerWidth || 1280,
      height: window.innerHeight || 720,
    });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  const radiusX = viewport.width * 0.495;
  const radiusY = viewport.height * 0.495;
  const minDimension = Math.min(viewport.width, viewport.height);
  const hourAngle = ((now.getHours() % 12) + now.getMinutes() / 60) * 30;
  const minuteAngle = (now.getMinutes() + now.getSeconds() / 60) * 6;
  const secondAngle = now.getSeconds() * 6;
  const hourEnd = handPoint(cx, cy, minDimension * 0.24, hourAngle);
  const minuteEnd = handPoint(cx, cy, minDimension * 0.36, minuteAngle);
  const secondEnd = handPoint(cx, cy, minDimension * 0.405, secondAngle);

  return (
    <main className="clock-roman-full">
      <time
        className="clock-roman-time"
        dateTime={now.toISOString()}
        role="img"
        aria-label={`Full-screen Roman-numeral wall clock showing ${timeLabel(now)}`}
      >
        <svg
          className="clock-roman-svg"
          viewBox={`0 0 ${viewport.width} ${viewport.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="romanDialGradient" cx="44%" cy="38%" r="80%">
              <stop offset="0%" stopColor="#fff9e9" />
              <stop offset="72%" stopColor="#f0e7d1" />
              <stop offset="100%" stopColor="#d9caa8" />
            </radialGradient>
            <linearGradient id="romanCaseGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ead89c" />
              <stop offset="45%" stopColor="#a98c4d" />
              <stop offset="100%" stopColor="#6e5930" />
            </linearGradient>
          </defs>
          <ellipse className="roman-clock-case" cx={cx} cy={cy} rx={radiusX} ry={radiusY} />
          <ellipse className="roman-clock-bezel" cx={cx} cy={cy} rx={viewport.width * 0.482} ry={viewport.height * 0.482} />
          <ellipse className="roman-clock-dial" cx={cx} cy={cy} rx={viewport.width * 0.468} ry={viewport.height * 0.468} />
          <ellipse className="roman-clock-inner-ring" cx={cx} cy={cy} rx={viewport.width * 0.405} ry={viewport.height * 0.405} />
          {Array.from({ length: 60 }, (_, tick) => {
            const hourMark = tick % 5 === 0;
            const angle = tick * 6;
            const outer = point(cx, cy, radiusX, radiusY, 0.936, angle);
            const inner = point(cx, cy, radiusX, radiusY, hourMark ? 0.885 : 0.91, angle);
              return (
                <line
                  key={`tick-${tick}`}
                  className={hourMark ? "roman-clock-hour-mark" : "roman-clock-minute-mark"}
                  x1={outer.x}
                  y1={outer.y}
                  x2={inner.x}
                  y2={inner.y}
                />
              );
          })}
          {romanNumerals.map((numeral, index) => {
              const angle = index * 30;
              const label = point(cx, cy, radiusX, radiusY, 0.68, angle);
              return (
                <text
                  key={numeral}
                  className="roman-clock-numeral"
                  x={label.x}
                  y={label.y}
                  fontSize={Math.max(26, Math.min(72, minDimension * 0.092))}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {numeral}
                </text>
              );
            })}
          <line className="roman-clock-hand roman-hour-hand" x1={cx} y1={cy} x2={hourEnd.x} y2={hourEnd.y} />
          <line className="roman-clock-hand roman-minute-hand" x1={cx} y1={cy} x2={minuteEnd.x} y2={minuteEnd.y} />
          <line className="roman-clock-hand roman-second-hand" x1={cx} y1={cy} x2={secondEnd.x} y2={secondEnd.y} />
          <circle className="roman-clock-hub" cx={cx} cy={cy} r={Math.max(9, minDimension * 0.022)} />
        </svg>
      </time>
    </main>
  );
}
