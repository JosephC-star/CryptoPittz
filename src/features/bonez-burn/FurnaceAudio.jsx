import { useEffect, useRef, useState } from 'react';

function createAmbience(Context, volume, firing) {
  const context = new Context();
  const master = context.createGain(), limiter = context.createDynamicsCompressor();
  master.gain.value = volume * .24;
  limiter.threshold.value = -22; limiter.ratio.value = 4;
  master.connect(limiter); limiter.connect(context.destination);
  const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const fire = context.createBufferSource(), low = context.createBiquadFilter(), roar = context.createGain();
  fire.buffer = buffer; fire.loop = true; low.type = 'lowpass'; low.frequency.value = 650;
  roar.gain.value = firing ? .8 : .38; fire.connect(low); low.connect(roar); roar.connect(master); fire.start();
  const motor = context.createOscillator(), motorGain = context.createGain();
  motor.type = 'sine'; motor.frequency.value = 48; motorGain.gain.value = .18;
  motor.connect(motorGain); motorGain.connect(master); motor.start();
  function puff(steam = false) {
    if (context.state !== 'running') return;
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = steam ? 1700 : 1300 + Math.random() * 1800; filter.Q.value = steam ? .6 : 2;
    const time = context.currentTime, duration = steam ? .65 : .035;
    gain.gain.setValueAtTime(.001, time); gain.gain.linearRampToValueAtTime(steam ? .22 : .05, time + (steam ? .08 : .004));
    gain.gain.exponentialRampToValueAtTime(.001, time + duration);
    source.connect(filter); filter.connect(gain); gain.connect(master);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(time, Math.random() * 2); source.stop(time + duration + .01);
  }
  const crackle = setInterval(() => { if (Math.random() < .55) puff(); }, 180);
  const steam = setInterval(() => puff(true), 6800);
  const visibility = () => {
    if (document.hidden) void context.suspend().catch(() => {});
    else void context.resume().catch(() => {});
  };
  document.addEventListener('visibilitychange', visibility);
  return {
    context,
    volume(value) { master.gain.setTargetAtTime(value * .24, context.currentTime, .1); },
    fire(value) { roar.gain.setTargetAtTime(value ? .8 : .38, context.currentTime, .4); motor.frequency.setTargetAtTime(value ? 58 : 48, context.currentTime, .4); if (value) puff(true); },
    close() { clearInterval(crackle); clearInterval(steam); document.removeEventListener('visibilitychange', visibility); void context.close().catch(() => {}); }
  };
}
export default function FurnaceAudio({ firing }) {
  const graph = useRef(null), mounted = useRef(true), busy = useRef(false);
  const [enabled, setEnabled] = useState(false), [volume, setVolume] = useState(.22), [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; graph.current?.close(); graph.current = null; }; }, []);
  useEffect(() => { graph.current?.fire(firing); }, [firing]);
  async function toggle() {
    if (busy.current) return;
    if (graph.current) { graph.current.close(); graph.current = null; setEnabled(false); return; }
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) { setError('Furnace sound is unavailable in this browser.'); return; }
    busy.current = true; setPending(true); setError('');
    try {
      graph.current = createAmbience(Context, volume, firing);
      // Resume synchronously from this button gesture; never start audio on page load.
      await graph.current.context.resume();
      if (mounted.current && graph.current?.context.state === 'running') setEnabled(true);
      else { graph.current?.close(); graph.current = null; }
    } catch { graph.current?.close(); graph.current = null; if (mounted.current) setError('Sound could not start. Try turning it on again.'); }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  }
  return <div className="furnace-audio-control"><button type="button" aria-pressed={enabled} onClick={toggle} disabled={pending}>{pending ? 'Starting sound…' : `Furnace sound: ${enabled ? 'On' : 'Off'}`}</button>{enabled && <label>Volume<input aria-label="Furnace sound volume" type="range" min="0" max="1" step=".01" value={volume} onChange={e => { const next = Number(e.target.value); setVolume(next); graph.current?.volume(next); }} /></label>}{error && <span role="status">{error}</span>}</div>;
}
