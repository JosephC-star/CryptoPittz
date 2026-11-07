import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import "./welcome-center.css";

const destinations = [
  { sign: "01", title: "Explorer", prompt: "Meet the Pittz", description: "Browse Original and Vice Pittz and discover the traits that make each one unique.", href: "/explorer/" },
  { sign: "02", title: "Dawg Pound", prompt: "Find a Pittz to buy", description: "See which Pittz are for sale and browse offers from the marketplaces.", href: "/dawg-pound/" },
  { sign: "03", title: "Playground", prompt: "Play a game", description: "Drop into the arcade for Pittz Memory, Pinball, and more.", href: "/playground/#/playground" },
  { sign: "04", title: "Flea Market", prompt: "Visit the shops", description: "Walk the merchant booths and see what the community has in stock.", href: "/flea-market/" },
  { sign: "05", title: "My Pittz", prompt: "Find your collection", description: "Connect your wallet to see and manage the Pittz you own.", href: "/my-pittz/" },
  { sign: "06", title: "Financial District", prompt: "Explore BONEZ tools", description: "Find token swaps, BONEZ staking, and liquidity tools.", href: "/financial-district/" },
  { sign: "07", title: "Pittensor", prompt: "See the burn pile", description: "Explore the furnace and check the monthly BONEZ burn history.", href: "/pittensor/" },
];

const tour = destinations.slice(0, 4);

export default function WelcomeCenter() {
  const [step, setStep] = useState(null);
  const tourHeading = useRef(null);
  const mapHeading = useRef(null);
  const startButton = useRef(null);
  const stop = tour[step];

  function showStop(nextStep) {
    flushSync(() => setStep(nextStep));
    tourHeading.current.focus();
  }

  function closeTour(destination) {
    setStep(null);
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
            <button className="welcome-primary" type="button" ref={startButton} onClick={() => showStop(0)}>Take the tour</button>
            <a href="#destination-map">Browse the map ↓</a>
          </div>
        </div>
      </header>

      <section className="welcome-tour" aria-labelledby="tour-heading" hidden={!stop}>
        <h2 id="tour-heading" tabIndex={-1} ref={tourHeading}>Guided tour</h2>
        {stop && <>
          <p className="welcome-marker" aria-live="polite">Stop {step + 1} of {tour.length} · {stop.title}</p>
          <p>{stop.description}</p>
          <div className="welcome-actions">
            <a className="welcome-primary" href={stop.href}>Go inside <span aria-hidden="true">↗</span></a>
            {step < tour.length - 1
              ? <button type="button" onClick={() => showStop(step + 1)}>Next stop →</button>
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
