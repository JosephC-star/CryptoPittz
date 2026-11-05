import './meta-keyz-entrance.css';

function CoatKey({ x, y, color }) {
  return <g transform={`translate(${x} ${y})`} stroke={color} strokeWidth="3" fill="none" strokeLinecap="round">
    <path d="M0-10v6m0 16v18h6m-6-6h4" />
    <circle cy="4" r="7" />
  </g>;
}

export default function MetaKeyzEntrance() {
  return (
    <a className="meta-keyz-entrance" href="/meta-keyz/">
      <svg viewBox="0 0 320 200" aria-hidden="true" className="meta-keyz-dealer">
        <defs>
          <radialGradient id="keyz-alley-glow">
            <stop stopColor="#ce4c8d" stopOpacity=".5" />
            <stop offset="1" stopColor="#241226" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="keyz-coat" x2="1" y2="1">
            <stop stopColor="#473349" />
            <stop offset="1" stopColor="#17131d" />
          </linearGradient>
        </defs>
        <ellipse cx="160" cy="107" rx="150" ry="98" fill="url(#keyz-alley-glow)" />
        <path d="M19 181h282M25 28v149m270-149v149M31 57h49m161 0h47" stroke="#f292b2" strokeOpacity=".2" fill="none" />
        <ellipse cx="160" cy="186" rx="106" ry="10" fill="#0d0911" opacity=".8" />
        <path d="M105 176l4-74 24-17h54l24 17 4 74z" fill="#221625" stroke="#9c5e81" strokeWidth="2" />
        <path d="M98 111l-26 66h176l-26-66-27-15h-70z" fill="#341d2c" stroke="#b07a83" strokeWidth="2" />
        <path d="M105 116h110" stroke="#c39067" strokeWidth="2" />
        <CoatKey x={113} y={128} color="#ffd392" />
        <CoatKey x={137} y={132} color="#eab5ff" />
        <CoatKey x={183} y={132} color="#94eaf5" />
        <CoatKey x={207} y={128} color="#ffd392" />
        <g className="meta-keyz-lapel left">
          <path d="M126 93l-23 7-25 74 81 9-4-68z" fill="url(#keyz-coat)" stroke="#a57b99" strokeWidth="2" />
          <path d="M127 96l-15 28 23 5 17 43" fill="none" stroke="#a57b99" />
        </g>
        <g className="meta-keyz-lapel right">
          <path d="M194 93l23 7 25 74-81 9 4-68z" fill="url(#keyz-coat)" stroke="#a57b99" strokeWidth="2" />
          <path d="M193 96l15 28-23 5-17 43" fill="none" stroke="#a57b99" />
        </g>
        <path d="M123 61l-9-29 23 10 47-1 23-9-8 28-4 18-18 18h-34l-18-18z" fill="#8a6b91" stroke="#e0a6ce" strokeWidth="2" />
        <path d="M134 80q26-20 52 0l-7 12h-38z" fill="#be9eb2" />
        <path d="M151 78h18l-9 8z" fill="#221526" />
        <path d="M132 63l17 3m22 0l17-3" stroke="#ffd692" strokeWidth="3" strokeLinecap="round" />
        <path d="M105 53q54-15 110 0l-8 8q-46 7-94 0zm25-4 7-24 20-4 24 4 8 24" fill="#211526" stroke="#c790b4" strokeWidth="2" strokeLinejoin="round" />
        <path d="M134 43q26 4 52 0" stroke="#efb48f" strokeWidth="3" fill="none" />
      </svg>
      <div>
        <span className="meta-keyz-whisper">Psst… looking for a key?</span>
        <h2>The Letter Key Shop</h2>
        <p>Follow the Pitt in the trench coat to the Meta Keyz listings.</p>
        <strong>See what’s in the coat <span aria-hidden="true">↗</span></strong>
      </div>
    </a>
  );
}
