import { useRef, useState } from "react";
import "./welcome-center.css";

// The route follows the destination entrances on the PittzStop homepage.
const destinations = [
  { sign: "01", x: 108, y: 326, title: "My Pittz", prompt: "Find your collection", description: "Connect your wallet to see and manage the Pittz you own.", href: "/my-pittz/" },
  { sign: "02", x: 254, y: 326, title: "Financial District", prompt: "Explore BONEZ tools", description: "Find token swaps, BONEZ staking, and liquidity tools.", href: "/financial-district/" },
  { sign: "03", x: 377, y: 246, title: "Dawg Pound", prompt: "Find a Pittz to buy", description: "See which Pittz are for sale and browse offers from the marketplaces.", href: "/dawg-pound/" },
  { sign: "04", x: 566, y: 246, title: "Explorer", prompt: "Meet the Pittz", description: "Browse Original and Vice Pittz and discover the traits that make each one unique.", href: "/explorer/" },
  { sign: "05", x: 629, y: 137, title: "Pittensor", prompt: "See the burn pile", description: "Explore the furnace and check the monthly BONEZ burn history.", href: "/pittensor/" },
  { sign: "06", x: 449, y: 87, title: "Playground", prompt: "Play a game", description: "Drop into the arcade for Pittz Memory, Pinball, and more.", href: "/playground/#/playground" },
  { sign: "07", x: 227, y: 114, title: "Flea Market", prompt: "Visit the booths", description: "Walk the merchant booths and see what the community has in stock.", href: "/flea-market/" },
];

const entrance = { x: 30, y: 381 };
const road = [entrance, ...destinations, { x: 65, y: 64 }]
  .map(({ x, y }) => `${x},${y}`).join(" ");

function TownMap({ step, animateRide, onStop }) {
  const position = destinations[step] ?? entrance;
  return (
    <div className="welcome-town">
      <svg viewBox="0 0 720 420" aria-hidden="true">
        <defs>
          <pattern id="welcome-town-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="#81c5cf" strokeOpacity=".13" />
          </pattern>
        </defs>
        <path fill="#162831" d="M0 0h720v420H0z" />
        <path fill="url(#welcome-town-grid)" d="M0 0h720v420H0z" />
        <path fill="#12424c" d="M0 0h74c52 52 8 101 37 141s13 74-42 110C28 278 7 318 0 353z" />
        <path fill="none" stroke="#57b5bb" strokeOpacity=".38" strokeWidth="3" d="M74 0c52 52 8 101 37 141s13 74-42 110C28 278 7 318 0 353" />
        <g className="welcome-town-blocks">
          <path d="M142 23h105v48l-67 9-38-14zM279 22h119v39l-119 16zM473 26h118v41l-118-17zM626 23h75v57l-75-19z" />
          <path d="M152 154l89 12v78h-89zM270 153l113-15v58l-113 49zM413 130l132 31-18 44H413zM650 172h48v79h-92z" />
          <path d="M111 271h103v23H97zM332 350l67-55h102v44l-67 40h-102zM544 285h157v99H544zM108 374h139v27H108z" />
        </g>
        <g className="welcome-town-streets">
          <path d="M133 98l77-2m41 41v116m149-135v84m185-64-33 75m43 77h105M518 284v111M274 350v54" />
          <path d="M151 183h90m-90 29h90m171-47h99m-89 156h64m80-15h117m-117 24h117m-117 24h117" />
        </g>
        <polyline className="welcome-road-edge" points={road} />
        <polyline className="welcome-road" points={road} />
        <polyline className="welcome-road-stripe" points={road} />
        <g className={animateRide ? "welcome-ride is-moving" : "welcome-ride"} style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
          <circle r="16" />
          <path d="M-10 3v-5l4-5H4l5 5v5z" />
          <path d="M-5-5H3l3 3H-7z" />
          <path d="M-7 3v3m13-3v3" />
        </g>
      </svg>
      {destinations.map(({ sign, title, x, y }, index) => (
        <button key={sign} type="button" className="welcome-town-pin"
          style={{ left: `${x / 7.2}%`, top: `${y / 4.2}%` }}
          aria-label={`Stop ${index + 1}, ${title}`}
          aria-current={step === index ? "step" : undefined}
          onClick={() => onStop(index)}>
          {sign}
          <span className="welcome-town-label" aria-hidden="true">{title}</span>
        </button>
      ))}
    </div>
  );
}

export default function WelcomeCenter() {
  const [step, setStep] = useState(null);
  const [animateRide, setAnimateRide] = useState(false);
  const tourHeading = useRef(null);
  const mapHeading = useRef(null);
  const startButton = useRef(null);
  const stop = destinations[step];

  function showStop(nextStep, animate = true) {
    setAnimateRide(animate);
    setStep(nextStep);
  }

  function closeTour(destination) {
    showStop(null, false);
    destination.current.focus();
  }

  return (
    <main className="welcome-center">
      <a className="welcome-home" href="/">← PittzStop home</a>
      <header className="welcome-hero">
        <div className="welcome-hero-copy">
          <p className="welcome-marker">● You are here</p>
          <h1>PittzStop <span>Welcome Center</span></h1>
          <p>First time at the PittzStop? Pull in. We’ll show you around.</p>
          <div className="welcome-actions">
            <button className="welcome-primary" type="button" ref={startButton} onClick={() => { showStop(0); tourHeading.current.focus(); }}>Take the tour</button>
            <a href="#town-map">Browse the map ↓</a>
          </div>
        </div>
      </header>

      <section id="town-map" className="welcome-tour" aria-labelledby="tour-heading">
        <p className="welcome-marker">PittzStop town map</p>
        <h2 id="tour-heading" tabIndex={-1} ref={tourHeading}>Ride through town</h2>
        <p>Follow the road one stop at a time or tap a numbered pin to jump there.</p>
        <TownMap step={step} animateRide={animateRide} onStop={index => showStop(index, false)} />
        {stop && <>
          <p className="welcome-marker" aria-live="polite">Stop {step + 1} of {destinations.length} · {stop.title}</p>
          <p>{stop.description}</p>
          <div className="welcome-actions">
            <a className="welcome-primary" href={stop.href}>Visit {stop.title} <span aria-hidden="true">↗</span></a>
            {step < destinations.length - 1
              ? <button type="button" onClick={() => showStop(step + 1)}>Drive to next stop →</button>
              : <button type="button" onClick={() => closeTour(mapHeading)}>Finish tour →</button>}
            {step > 0 && <button type="button" onClick={() => showStop(step - 1)}>← Previous stop</button>}
            <button type="button" onClick={() => closeTour(startButton)}>Exit tour</button>
          </div>
        </>}
      </section>

      <section id="destination-map" aria-labelledby="destination-heading">
        <p className="welcome-marker">PittzStop directory</p>
        <h2 id="destination-heading" tabIndex={-1} ref={mapHeading}>Where are you headed?</h2>
        <ul className="welcome-map">
          {destinations.map(({ sign, title, prompt, description, href }) => (
            <li key={href}>
              <a href={href} aria-label={`${title} · ${prompt}`}>
                <span className="welcome-map-sign" aria-hidden="true">{sign} <span>↗</span></span>
                <span className="welcome-destination">{title}</span>
                <strong>{prompt}</strong>
                <span className="welcome-description">{description}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
