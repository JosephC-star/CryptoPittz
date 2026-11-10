import { useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import "./welcome-center.css";

// The route follows the destination entrances on the PittzStop homepage.
const destinations = [
  { sign: "01", x: 106, y: 342, title: "My Pittz", prompt: "Find your collection", description: "Connect your wallet to see and manage the Pittz you own.", href: "/my-pittz/", highlights: ["Browse the Original and Vice Pittz in your connected wallet.", "See your listings and offers, and manage a Pittz you own.", "Start a sale or send a Pittz to another wallet."] },
  { sign: "02", x: 254, y: 332, title: "Financial District", prompt: "Explore BONEZ tools", description: "Find token swaps, BONEZ staking, and liquidity tools.", href: "/financial-district/", highlights: ["Get a live quote before swapping supported tokens.", "See your BONEZ staking position and available actions.", "Check your liquidity position and manage your share of the pool."] },
  { sign: "03", x: 378, y: 252, title: "Dawg Pound", prompt: "Find a Pittz to buy", description: "See which Pittz are for sale and browse offers from the marketplaces.", href: "/dawg-pound/", highlights: ["Browse Original and Vice Pittz currently listed for sale.", "Compare prices and see which marketplace has the listing.", "Explore collection-wide and trait-specific offers."] },
  { sign: "04", x: 567, y: 251, title: "Explorer", prompt: "Meet the Pittz", description: "Browse Original and Vice Pittz and discover the traits that make each one unique.", href: "/explorer/", highlights: ["Browse Original and Vice Pittz side by side.", "Filter by traits to find a look you like.", "Compare rarity ranks and open a Pittz card for a closer look."] },
  { sign: "05", x: 633, y: 145, title: "Pittensor", prompt: "See the burn pile", description: "Explore the furnace and check the monthly BONEZ burn history.", href: "/pittensor/", highlights: ["See how much BONEZ is in the current burn pile.", "Browse past months to see what was burned.", "Connect your wallet if you want to contribute BONEZ to the pile."] },
  { sign: "06", x: 452, y: 121, title: "Playground", prompt: "Play a game", description: "Drop into the arcade for Pittz Memory, Pinball, and more.", href: "/playground/#/playground", highlights: ["Match pairs in Pittz Memory or aim for a high score in Pinball.", "Try a different cabinet, like Plinko or Pittz 21.", "Connect your wallet to bring one of your Pittz into supported games."] },
  { sign: "07", x: 226, y: 141, title: "Flea Market", prompt: "Visit the booths", description: "Walk the merchant booths and see what the community has in stock.", href: "/flea-market/", highlights: ["Browse merchant booths and see what’s in stock.", "Contact a merchant about an item or leave a booth review.", "Check out the Meta Key Booth or visit the Back Booths."] },
];

const entrance = { x: 43, y: 344 };
// Waypoints keep the ride on the illustrated streets between landmarks.
const bends = [
  [],
  [{ x: 161, y: 334 }, { x: 205, y: 332 }],
  [{ x: 345, y: 333 }, { x: 349, y: 266 }],
  [{ x: 472, y: 249 }],
  [{ x: 516, y: 249 }, { x: 473, y: 231 }, { x: 477, y: 179 }, { x: 501, y: 137 }, { x: 545, y: 141 }],
  [{ x: 550, y: 143 }, { x: 506, y: 134 }, { x: 475, y: 122 }],
  [{ x: 366, y: 121 }, { x: 298, y: 130 }],
];
const carTransform = ({ x, y }) => `translate(${x}px, ${y}px)`;

function TownMap({ step, ride, facesLeft, onStop }) {
  const position = destinations[step] ?? entrance;
  const car = useRef(null);
  const [arrivedRide, setArrivedRide] = useState(null);

  useLayoutEffect(() => {
    if (!ride) return;
    if (!car.current?.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setArrivedRide(ride));
      return () => cancelAnimationFrame(frame);
    }
    const { from, to } = ride;
    const start = destinations[from] ?? entrance;
    const turns = bends[Math.max(from, to)];
    const points = [start, ...(from < to ? turns : [...turns].reverse()), position];
    const animation = car.current.animate(points.map(point => ({ transform: carTransform(point) })), {
      duration: 650 + turns.length * 85,
      easing: "ease-in-out",
    });
    animation.onfinish = () => setArrivedRide(ride);
    return () => {
      animation.onfinish = null;
      animation.cancel();
    };
  }, [ride, position]);

  return (
    <div className="welcome-town">
      <svg viewBox="0 0 720 420" aria-hidden="true">
        <image href="/images/welcome-town-map.webp" width="720" height="420" preserveAspectRatio="none" />
        <g ref={car} className="welcome-ride" style={{ transform: carTransform(position) }}>
          <image href="/images/welcome-tour-convertible.webp" x="-41" y="-25" width="82" height="30"
            transform={facesLeft ? "scale(-1 1)" : undefined} />
        </g>
      </svg>
      {destinations.map(({ sign, title, x, y }, index) => (
        <button key={sign} type="button" className="welcome-town-pin"
          style={{ left: `${x / 7.2}%`, top: `${y / 4.2}%` }}
          aria-label={`Stop ${index + 1}, ${title}`}
          aria-current={step === index ? "step" : undefined}
          onClick={() => onStop(index)}>
          {sign}
          {step === index && (!ride || arrivedRide === ride) && (
            <span className="welcome-town-label" aria-hidden="true">{title}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default function WelcomeCenter() {
  const [step, setStep] = useState(null);
  const [ride, setRide] = useState(null);
  const [facesLeft, setFacesLeft] = useState(false);
  const tourHeading = useRef(null);
  const [tourComplete, setTourComplete] = useState(false);
  const finishHeading = useRef(null);
  const startButton = useRef(null);
  const brochure = useRef(null);
  const [brochureStop, setBrochureStop] = useState(null);
  const stop = destinations[step];

  useLayoutEffect(() => {
    if (tourComplete) finishHeading.current.focus();
  }, [tourComplete]);

  function showStop(nextStep, animate = true) {
    setTourComplete(false);
    const from = destinations[step] ?? entrance;
    const to = destinations[nextStep] ?? entrance;
    if (from.x !== to.x) setFacesLeft(to.x < from.x);
    const currentIndex = step ?? -1;
    setRide(animate && Math.abs(nextStep - currentIndex) === 1 && nextStep !== null
      ? { from: currentIndex, to: nextStep }
      : null);
    setStep(nextStep);
  }

  function openBrochure(destination) {
    flushSync(() => setBrochureStop(destination));
    brochure.current.showModal();
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
        <div className="welcome-tour-heading">
          <div>
            <p className="welcome-marker">PittzStop town map</p>
            <h2 id="tour-heading" tabIndex={-1} ref={tourHeading}>Ride through town</h2>
            <p>Follow the road one stop at a time or tap a numbered pin to jump there.</p>
          </div>
          {stop && (
            <button className="welcome-brochure-button" type="button" aria-haspopup="dialog"
              aria-label={`Open ${stop.title} brochure`}
              onClick={() => openBrochure(stop)}>
              <span className="welcome-brochure-icon" aria-hidden="true">{stop.sign}</span>
              <span>Brochure</span>
            </button>
          )}
        </div>
        <TownMap step={step} ride={ride} facesLeft={facesLeft} onStop={index => showStop(index, false)} />
        <span className="welcome-tour-announcement" role="status">
          {stop && `Stop ${step + 1} of ${destinations.length}, ${stop.title}`}
        </span>
        {stop && <>
          <div className="welcome-actions">
            <a className="welcome-primary" href={stop.href}>Visit {stop.title} <span aria-hidden="true">↗</span></a>
            {step < destinations.length - 1
              ? <button type="button" onClick={() => showStop(step + 1)}>Drive to next stop →</button>
              : <button type="button" onClick={() => { showStop(null, false); setTourComplete(true); }}>Finish tour →</button>}
            {step > 0 && <button type="button" onClick={() => showStop(step - 1)}>← Previous stop</button>}
            <button type="button" onClick={() => closeTour(startButton)}>Exit tour</button>
          </div>
        </>}
      </section>

      {tourComplete && (
        <section className="welcome-tour welcome-finish" aria-labelledby="tour-finish-heading">
          <p className="welcome-marker">Tour complete</p>
          <h2 id="tour-finish-heading" tabIndex={-1} ref={finishHeading}>Ready to roll?</h2>
          <div className="welcome-wallet-strip welcome-actions">
            <span className="welcome-wallet-icon" aria-hidden="true">📱</span>
            <div>
              <h3>Need a wallet?</h3>
              <p>Set up your MultiversX wallet with xPortal.</p>
            </div>
            <a className="welcome-primary" href="https://xportal.app.link/referral?code=xdsu8lsipv"
              target="_blank" rel="noreferrer">Get xPortal ↗</a>
          </div>
          <div className="welcome-actions">
            <a href="/#join">Explore the CryptoPittz Ecosystem →</a>
          </div>
        </section>
      )}

      <section id="destination-map" aria-labelledby="destination-heading">
        <p className="welcome-marker">PittzStop directory</p>
        <h2 id="destination-heading">Where are you headed?</h2>
        <ul className="welcome-map">
          {destinations.map(destination => {
            const { sign, title, prompt, description, href } = destination;
            return (
              <li key={href}>
                <button type="button" aria-haspopup="dialog" aria-label={`Open ${title} brochure`} onClick={() => openBrochure(destination)}>
                  <span className="welcome-map-sign" aria-hidden="true">{sign} <span>＋</span></span>
                  <span className="welcome-destination">{title}</span>
                  <strong>{prompt}</strong>
                  <span className="welcome-description">{description}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      {brochureStop && (
        <dialog className="welcome-brochure-dialog" ref={brochure} aria-labelledby="welcome-flyer-title">
          <button className="welcome-brochure-close" type="button" aria-label="Close brochure"
            autoFocus onClick={() => brochure.current.close()}>×</button>
          <article className="welcome-flyer">
            <div className="welcome-flyer-cover">
              <p className="welcome-flyer-stamp">Stop {Number(brochureStop.sign)} of {destinations.length}</p>
              <h3 id="welcome-flyer-title">{brochureStop.title}</h3>
              <p>{brochureStop.description}</p>
            </div>
            <div className="welcome-flyer-guide">
              <h4>What you can do here</h4>
              <ul>
                {brochureStop.highlights.map(activity => <li key={activity}>{activity}</li>)}
              </ul>
              <div className="welcome-actions">
                <a className="welcome-primary" href={brochureStop.href}>Visit {brochureStop.title} <span aria-hidden="true">↗</span></a>
              </div>
            </div>
          </article>
        </dialog>
      )}
    </main>
  );
}
