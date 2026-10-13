export default function FurnaceValve({ id }) {
  return <div className="furnace-valve"><svg viewBox="0 0 100 100">
    <defs>
      <linearGradient id={`${id}-valve-gold`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff4bb"/><stop offset=".22" stopColor="#e6b760"/><stop offset=".48" stopColor="#68421f"/><stop offset=".68" stopColor="#ffe3a0"/><stop offset="1" stopColor="#a46e32"/></linearGradient>
      <radialGradient id={`${id}-valve-seat`} cx=".38" cy=".3" r=".8"><stop stopColor="#ba8541"/><stop offset=".6" stopColor="#624023"/><stop offset="1" stopColor="#25180f"/></radialGradient>
      <linearGradient id={`${id}-valve-steel`} x2=".8" y2="1"><stop stopColor="#e0d2ad"/><stop offset=".45" stopColor="#776d58"/><stop offset="1" stopColor="#c5a979"/></linearGradient>
    </defs>
    <path d="M41 91V72h18v19" fill={`url(#${id}-valve-gold)`} stroke="#4e311b" strokeWidth="2"/>
    <circle cx="50" cy="50" r="46" fill={`url(#${id}-valve-seat)`} stroke="#382315" strokeWidth="2"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="#d8ab62" strokeWidth="1.2"/>
    <circle cx="50" cy="50" r="31" fill="#201710" stroke="#422d1b" strokeWidth="3"/>
    {[[20,20],[80,20],[80,80],[20,80]].map(([x,y]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="3.6" fill={`url(#${id}-valve-steel)`} stroke="#342518" strokeWidth="1"/><path d={`M${x-1.7} ${y+1.1}l3.4-2.2`} stroke="#493a27" strokeWidth="1"/></g>)}
    <g className="furnace-valve-wheel">
      <circle cx="50" cy="50" r="34" fill="none" stroke="#25170c" strokeWidth="12"/>
      <circle cx="50" cy="50" r="34" fill="none" stroke={`url(#${id}-valve-gold)`} strokeWidth="8"/>
      <circle cx="50" cy="50" r="37" fill="none" stroke="#ffe7a5" strokeWidth=".8" opacity=".7"/>
      {[0,60,120,180,240,300].map(angle => <path key={angle} d="M50 46Q43 34 50 19" transform={`rotate(${angle} 50 50)`} fill="none" stroke={`url(#${id}-valve-gold)`} strokeWidth="6" strokeLinecap="round"/>)}
      <circle cx="50" cy="50" r="12" fill={`url(#${id}-valve-gold)`} stroke="#513018" strokeWidth="2"/>
      <path d="M50 43l6 3.5v7L50 57l-6-3.5v-7Z" fill={`url(#${id}-valve-steel)`} stroke="#514530" strokeWidth="1"/>
      <path d="M24 29A34 34 0 0 1 64 18" fill="none" stroke="#fff4c5" strokeWidth="2" strokeLinecap="round" opacity=".65"/>
      <path d="M79 66A34 34 0 0 1 62 82" fill="none" stroke="#ef74c7" strokeWidth="1.4" opacity=".45"/>
    </g>
    <path d="M11 39A41 41 0 0 1 28 14" fill="none" stroke="#fff0b5" strokeWidth="1.3" opacity=".6"/>
    <path d="M86 35A42 42 0 0 1 88 61" fill="none" stroke="#79df96" strokeWidth="1.5" opacity=".35"/>
  </svg></div>;
}
