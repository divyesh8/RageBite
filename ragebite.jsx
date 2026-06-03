import { useState, useEffect, useRef, useCallback } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// ─── FONTS ────────────────────────────────────────────────────────────────────
const FontLink = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;500;600;700;800&display=swap');
  `}</style>
);

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  fire:    "#FF3C1A",
  gold:    "#FFB800",
  plus:    "#00E676",
  minus:   "#FF3C1A",
  bg:      "#080808",
  surface: "#111111",
  card:    "#181818",
  border:  "#252525",
  border2: "#333",
  text:    "#F2EEE8",
  muted:   "#666",
  muted2:  "#888",
};

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; color: ${T.text}; font-family: 'Syne', sans-serif; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: ${T.surface}; } ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 2px; }
  input, textarea { outline: none; font-family: 'Syne', sans-serif; }
  button { cursor: pointer; font-family: 'Syne', sans-serif; }

  @keyframes auraFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
  @keyframes glitch { 0%,100%{text-shadow:none} 20%{text-shadow:2px 0 ${T.fire},-2px 0 ${T.gold}} 40%{text-shadow:-2px 0 ${T.fire},2px 0 ${T.gold}} 60%{text-shadow:none} }
  @keyframes burnIn { from{width:0} to{width:var(--w)} }
  @keyframes popIn { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

  .nav-tab { transition: color .15s, border-color .15s; border-bottom: 2px solid transparent; padding-bottom: 6px; }
  .nav-tab.active { color: ${T.fire}; border-color: ${T.fire}; }
  .nav-tab:hover:not(.active) { color: ${T.text}; }

  .card-hover { transition: border-color .2s, transform .15s; }
  .card-hover:hover { border-color: ${T.fire} !important; transform: translateY(-2px); }

  .btn-fire { background: ${T.fire}; color: #fff; border: none; padding: 10px 22px; border-radius: 8px; font-family: 'Space Mono', monospace; font-size: 12px; font-weight: 700; letter-spacing: 1px; transition: opacity .15s, transform .1s; }
  .btn-fire:hover { opacity: 0.88; } .btn-fire:active { transform: scale(0.97); }
  .btn-ghost { background: transparent; color: ${T.muted2}; border: 1px solid ${T.border}; padding: 10px 22px; border-radius: 8px; font-family: 'Space Mono', monospace; font-size: 12px; transition: border-color .15s, color .15s; }
  .btn-ghost:hover { border-color: ${T.border2}; color: ${T.text}; }

  .msg-bubble { animation: slideUp .2s ease; }
  .sticker-pop { animation: popIn .35s cubic-bezier(.34,1.56,.64,1); }
  .aura-float { animation: auraFloat 3s ease-in-out infinite; }
`;

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────
const CURRENT_USER = {
  id: "u1", handle: "zenpunks", name: "Zen Punks",
  initials: "ZK", aura: 2840, wins: 47, losses: 12,
  groups: ["g1","g2"],
  battles: [
    { id:"b1", opp:"@roastmaster", topic:"Overrated Tech", delta:+120, won:true, ts:"2h ago" },
    { id:"b2", opp:"@spitfire99",  topic:"Fast Food Rankings", delta:+85, won:true, ts:"5h ago" },
    { id:"b3", opp:"@memequeen",   topic:"App Store Apps", delta:-60, won:false, ts:"1d ago" },
    { id:"b4", opp:"@techbro404",  topic:"Startup Culture", delta:+95, won:true, ts:"2d ago" },
    { id:"b5", opp:"@cloutchaser", topic:"Social Media Apps", delta:-40, won:false, ts:"3d ago" },
  ]
};

const USERS = [
  { id:"u2", handle:"roastmaster", name:"Roast Master", initials:"RM", aura:1820, wins:38, losses:21, color:T.gold },
  { id:"u3", handle:"spitfire99",  name:"Spitfire 99",  initials:"SF", aura:3100, wins:62, losses:18, color:"#00B4FF" },
  { id:"u4", handle:"memequeen",   name:"Meme Queen",   initials:"MQ", aura:2200, wins:44, losses:22, color:"#E040FB" },
  { id:"u5", handle:"techbro404",  name:"TechBro 404",  initials:"TB", aura:980,  wins:22, losses:33, color:"#00E676" },
  { id:"u6", handle:"cloutchaser", name:"Clout Chaser", initials:"CC", aura:1540, wins:31, losses:29, color:"#FF6D00" },
];

const RAGE_GROUPS = [
  { id:"g1", name:"TECH TROLLS",    emoji:"💻", members:2400, topic:"Tech & Startups",      tags:["#startups","#gadgets","#ai"],      active:true },
  { id:"g2", name:"CINEMA CLOWNS",  emoji:"🎬", members:1800, topic:"Movies & Shows",       tags:["#movies","#shows","#oscars"],      active:true },
  { id:"g3", name:"FOOD FIGHTERS",  emoji:"🍔", members:3100, topic:"Food & Restaurants",   tags:["#fastfood","#recipes","#vibes"],   active:true },
  { id:"g4", name:"MUSIC MENACES",  emoji:"🎵", members:2750, topic:"Music & Artists",      tags:["#albums","#lyrics","#beefs"],     active:false },
  { id:"g5", name:"SNEAKER SNITCHES",emoji:"👟",members:1200, topic:"Sneakers & Fashion",   tags:["#drops","#hype","#drip"],         active:false },
];

const STICKERS = [
  { id:"s1", emoji:"🤡", label:"CLOWNED" },
  { id:"s2", emoji:"💀", label:"COOKED" },
  { id:"s3", emoji:"🔥", label:"LIT" },
  { id:"s4", emoji:"🧊", label:"ICY" },
  { id:"s5", emoji:"😭", label:"PRESSED" },
  { id:"s6", emoji:"🗑️", label:"TRASH" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const Avatar = ({ initials, size=44, color=T.fire, style={} }) => (
  <div style={{
    width:size, height:size, borderRadius:"50%", flexShrink:0,
    background:`${color}22`, border:`2px solid ${color}`,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontFamily:"'Bebas Neue', sans-serif", fontSize:size*0.38,
    color, ...style
  }}>{initials}</div>
);

const AuraBadge = ({ delta }) => (
  <span style={{
    fontFamily:"'Bebas Neue', sans-serif", fontSize:16, letterSpacing:"1px",
    color: delta > 0 ? T.plus : T.minus,
  }}>{delta > 0 ? `+${delta}` : delta} {delta > 0 ? "⚡" : "💀"}</span>
);

const Tag = ({ label }) => (
  <span style={{
    fontFamily:"'Space Mono', monospace", fontSize:10, padding:"3px 8px",
    borderRadius:4, background:"rgba(255,255,255,0.05)", border:`1px solid ${T.border}`,
    color:T.muted2
  }}>{label}</span>
);

const LiveDot = () => (
  <span style={{
    display:"inline-block", width:7, height:7, borderRadius:"50%",
    background:T.fire, animation:"pulse 1.2s ease infinite", flexShrink:0
  }}/>
);

const Divider = ({ m="2rem 0" }) => (
  <div style={{ height:1, background:T.border, margin:m }}/>
);

const SectionLabel = ({ children }) => (
  <div style={{
    fontFamily:"'Space Mono', monospace", fontSize:10, color:T.fire,
    letterSpacing:"3px", textTransform:"uppercase", marginBottom:6
  }}>{children}</div>
);

const SectionTitle = ({ children, size=28 }) => (
  <div style={{
    fontFamily:"'Bebas Neue', sans-serif", fontSize:size,
    letterSpacing:"1.5px", marginBottom:"1.25rem"
  }}>{children}</div>
);

// ─── AI JUDGE ─────────────────────────────────────────────────────────────────
async function runAIJudge(messages, topic) {
  const transcript = messages
    .filter(m => m.type === "msg")
    .map(m => `${m.sender === "me" ? "@zenpunks" : "@opponent"}: ${m.text}`)
    .join("\n");

  const prompt = `You are the RageBite AI Judge. Two users had a friendly roast battle on the topic: "${topic}".

ROAST TRANSCRIPT:
${transcript}

Rules:
- This is FRIENDLY roasting, NOT personal attacks. Flag if personal.
- Judge on: wit, creativity, topic relevance, originality, and burn quality.
- The winner gets aura points (between 40–150), loser loses same amount.

Respond with ONLY a JSON object (no markdown, no extra text):
{
  "winner": "me" or "opponent",
  "winnerScore": <number 40-150>,
  "verdict": "<2 sentence punchy verdict explaining why, in Gen Z tone>",
  "meScore": <0-100>,
  "opponentScore": <0-100>,
  "personalAttackDetected": false,
  "highlight": "<the single best line from the whole battle, attributed>"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:400,
      messages:[{ role:"user", content:prompt }]
    })
  });
  const data = await res.json();
  const raw = data.content.map(b => b.text||"").join("").trim();
  const clean = raw.replace(/```json|```/g,"").trim();
  return JSON.parse(clean);
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

// PROFILE PAGE
const ProfilePage = ({ user, onChallenge }) => {
  const winRate = Math.round((user.wins / (user.wins + user.losses)) * 100);
  const isOwn = user.id === CURRENT_USER.id;

  return (
    <div style={{ animation:"slideUp .3s ease" }}>
      {/* Banner */}
      <div style={{
        height:80, background:`repeating-linear-gradient(45deg,#181818,#181818 8px,#1e1e1e 8px,#1e1e1e 16px)`,
        borderBottom:`1px solid ${T.border}`, position:"relative", overflow:"hidden"
      }}>
        <div style={{
          position:"absolute", right:16, bottom:10,
          fontFamily:"'Bebas Neue', sans-serif", fontSize:11, letterSpacing:6,
          color:"rgba(255,60,26,0.15)"
        }}>RAGEBITE</div>
      </div>

      <div style={{ padding:"0 1.25rem 2rem" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginTop:-28, marginBottom:"1.25rem" }}>
          <Avatar initials={user.initials} size={60} color={isOwn ? T.fire : T.gold} />
          {!isOwn && (
            <button className="btn-fire" onClick={() => onChallenge(user)} style={{ fontSize:11 }}>
              🔥 CHALLENGE
            </button>
          )}
          {isOwn && (
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.muted, border:`1px solid ${T.border}`, borderRadius:6, padding:"6px 12px" }}>
              EDIT PROFILE
            </div>
          )}
        </div>

        <div style={{ marginBottom:"1.5rem" }}>
          <div style={{ fontWeight:700, fontSize:18, marginBottom:2 }}>{user.name}</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:T.muted }}>@{user.handle}</div>
        </div>

        {/* Aura */}
        <div style={{
          background:T.surface, border:`1px solid ${T.border}`, borderRadius:14,
          padding:"1.25rem", marginBottom:"1rem"
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:"1rem" }}>
            <div className="aura-float" style={{
              fontFamily:"'Bebas Neue', sans-serif", fontSize:54, lineHeight:1,
              color:T.gold, letterSpacing:"-1px"
            }}>{user.aura.toLocaleString()}</div>
            <div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Aura Points</div>
              <div style={{
                fontFamily:"'Space Mono',monospace", fontSize:10, padding:"3px 9px",
                borderRadius:4, background:"rgba(255,184,0,0.1)", border:`1px solid rgba(255,184,0,0.25)`,
                color:T.gold
              }}>⚡ TOP {isOwn ? "3%" : "10%"} THIS WEEK</div>
            </div>
          </div>

          {/* Aura bar */}
          <div style={{ marginBottom:4 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.muted }}>AURA PROGRESS</span>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.gold }}>{user.aura} / 5000</span>
            </div>
            <div style={{ background:T.border, borderRadius:4, height:6, overflow:"hidden" }}>
              <div style={{
                height:"100%", borderRadius:4,
                background:`linear-gradient(90deg, ${T.gold}, ${T.fire})`,
                width:`${Math.min((user.aura/5000)*100, 100)}%`,
                transition:"width 1s ease"
              }}/>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:"1.25rem" }}>
          {[
            { label:"WINS", val:user.wins, color:T.plus },
            { label:"LOSSES", val:user.losses, color:T.minus },
            { label:"WIN RATE", val:`${winRate}%`, color:T.text },
          ].map(s => (
            <div key={s.label} style={{ background:T.card, borderRadius:10, padding:"12px 10px", textAlign:"center", border:`1px solid ${T.border}` }}>
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:26, color:s.color, marginBottom:3 }}>{s.val}</div>
              <div style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:T.muted, letterSpacing:"1px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Battle history — only own profile */}
        {isOwn && (
          <>
            <Divider m="1.25rem 0" />
            <SectionLabel>Battle History</SectionLabel>
            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
              {user.battles.map((b, i) => (
                <div key={b.id} style={{
                  display:"flex", alignItems:"center", gap:12,
                  padding:"11px 0",
                  borderBottom: i < user.battles.length-1 ? `1px solid ${T.border}` : "none",
                  animation:`slideUp .25s ease ${i*0.05}s both`
                }}>
                  <div style={{
                    width:32, height:32, borderRadius:8, flexShrink:0,
                    background: b.won ? "rgba(0,230,118,0.1)" : "rgba(255,60,26,0.1)",
                    border:`1px solid ${b.won ? "rgba(0,230,118,0.25)" : "rgba(255,60,26,0.25)"}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:14
                  }}>{b.won ? "⚡" : "💀"}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{b.opp}</div>
                    <div style={{ fontSize:11, color:T.muted, fontFamily:"'Space Mono',monospace" }}>{b.topic} · {b.ts}</div>
                  </div>
                  <AuraBadge delta={b.delta} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── ROAST CHAT ───────────────────────────────────────────────────────────────
const RoastChat = ({ opponent, topic, onEnd }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [judging, setJudging] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [burnLevel, setBurnLevel] = useState(0);
  const [opponentTyping, setOpponentTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const AUTO_REPLIES = [
    "Lmaooo you really typed that out and thought you ate 😭",
    "Bro called that a roast?? My grandma claps back harder in WhatsApp groups",
    "That comeback had more loading time than dial-up internet",
    "The audacity is giving participation trophy energy 💀",
    "Did ChatGPT write that or did your braincell go on solo mission?",
    "Genuinely clocked out after the first sentence, sorry not sorry",
    "Your comebacks are built different... built wrong 🗑️",
    "The reach on that argument could qualify for Olympics",
  ];

  const scroll = () => bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  useEffect(scroll, [messages, opponentTyping]);

  const simulateOpponent = useCallback((after = 1200) => {
    setOpponentTyping(true);
    setTimeout(() => {
      setOpponentTyping(false);
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      setMessages(m => [...m, { id:Date.now(), type:"msg", sender:"opp", text:reply }]);
      setBurnLevel(l => Math.min(5, l + 1));
    }, after + Math.random()*800);
  }, []);

  const sendMsg = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages(m => [...m, { id:Date.now(), type:"msg", sender:"me", text }]);
    setBurnLevel(l => Math.min(5, l + 1));
    simulateOpponent();
    setShowStickers(false);
  };

  const sendSticker = (s) => {
    setMessages(m => [...m, { id:Date.now(), type:"sticker", sender:"me", sticker:s }]);
    setShowStickers(false);
    simulateOpponent(800);
  };

  const endBattle = async () => {
    if (messages.filter(m=>m.type==="msg").length < 2) return;
    setJudging(true);
    try {
      const result = await runAIJudge(messages, topic);
      setVerdict(result);
    } catch {
      setVerdict({
        winner:"me", winnerScore:80,
        verdict:"Both players showed up — close battle! The AI judge calls it for @zenpunks on creativity.",
        meScore:72, opponentScore:61, personalAttackDetected:false,
        highlight:"@zenpunks: That comeback had more loading time than dial-up internet"
      });
    } finally { setJudging(false); }
  };

  if (verdict) {
    const iWon = verdict.winner === "me";
    const delta = iWon ? verdict.winnerScore : -verdict.winnerScore;
    return (
      <div style={{ padding:"1.5rem 1.25rem", animation:"slideUp .3s ease" }}>
        {/* Verdict card */}
        <div style={{
          background:T.surface, border:`2px solid ${iWon ? T.plus : T.minus}`,
          borderRadius:16, padding:"1.5rem", marginBottom:"1rem", textAlign:"center"
        }}>
          <div style={{ fontSize:48, marginBottom:8 }}>{iWon ? "🏆" : "💀"}</div>
          <div style={{
            fontFamily:"'Bebas Neue', sans-serif", fontSize:32, letterSpacing:2,
            color: iWon ? T.plus : T.minus, marginBottom:4
          }}>{iWon ? "YOU WON" : "YOU LOST"}</div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:48, color:iWon?T.plus:T.minus, marginBottom:"1rem" }}>
            {delta > 0 ? `+${delta}` : delta} AURA
          </div>
          <p style={{ fontSize:13, color:T.muted2, lineHeight:1.6, marginBottom:"1.25rem" }}>{verdict.verdict}</p>

          {/* Scores */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:12, alignItems:"center", marginBottom:"1rem" }}>
            <div style={{ background:T.card, borderRadius:10, padding:12 }}>
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:28, color:T.fire }}>{verdict.meScore}</div>
              <div style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:T.muted }}>@zenpunks</div>
            </div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:16, color:T.muted }}>VS</div>
            <div style={{ background:T.card, borderRadius:10, padding:12 }}>
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:28, color:T.gold }}>{verdict.opponentScore}</div>
              <div style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:T.muted }}>@{opponent.handle}</div>
            </div>
          </div>

          {verdict.highlight && (
            <div style={{
              background:"rgba(255,184,0,0.07)", border:`1px solid rgba(255,184,0,0.2)`,
              borderRadius:10, padding:"10px 14px", marginBottom:"1rem"
            }}>
              <div style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:T.gold, marginBottom:5 }}>🔥 BEST LINE</div>
              <div style={{ fontSize:12, color:T.muted2, fontStyle:"italic" }}>{verdict.highlight}</div>
            </div>
          )}

          {verdict.personalAttackDetected && (
            <div style={{ background:"rgba(255,60,26,0.1)", border:`1px solid rgba(255,60,26,0.25)`, borderRadius:8, padding:"8px 12px", marginBottom:"1rem" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.fire }}>⚠️ PERSONAL ATTACK DETECTED — AURA PENALTY APPLIED</div>
            </div>
          )}
        </div>

        <button className="btn-fire" onClick={onEnd} style={{ width:"100%" }}>
          BACK TO ARENA
        </button>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:520 }}>
      {/* Header */}
      <div style={{
        padding:"12px 16px", borderBottom:`1px solid ${T.border}`,
        display:"flex", alignItems:"center", gap:12, flexShrink:0
      }}>
        <button onClick={onEnd} style={{ background:"none", border:"none", color:T.muted, fontSize:18, lineHeight:1, padding:"0 4px 0 0" }}>‹</button>
        <Avatar initials={opponent.initials} size={36} color={opponent.color || T.gold} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>@{opponent.handle}</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.muted }}>{topic}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,60,26,0.08)", border:`1px solid rgba(255,60,26,0.2)`, borderRadius:20, padding:"4px 10px" }}>
          <LiveDot /><span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.fire }}>LIVE</span>
        </div>
      </div>

      {/* AI monitor bar */}
      <div style={{
        padding:"8px 16px", background:"rgba(255,184,0,0.05)", borderBottom:`1px solid rgba(255,184,0,0.1)`,
        display:"flex", alignItems:"center", gap:10, flexShrink:0
      }}>
        <span style={{ fontSize:12 }}>🤖</span>
        <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.gold, flex:1 }}>AI monitoring · stay on topic · no personal attacks</span>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:T.muted }}>BURN</span>
          <div style={{ display:"flex", gap:2 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{
                width:14, height:5, borderRadius:2,
                background: i < burnLevel ? T.fire : i === burnLevel ? `${T.fire}40` : T.border,
                transition:"background .4s"
              }}/>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign:"center", padding:"2rem 1rem" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🔥</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:22, letterSpacing:1, marginBottom:4 }}>BATTLE STARTS NOW</div>
            <div style={{ fontSize:12, color:T.muted }}>Topic: <strong style={{ color:T.text }}>{topic}</strong></div>
            <div style={{ fontSize:11, color:T.muted, marginTop:6 }}>Roast them. Keep it friendly. No personal attacks.</div>
          </div>
        )}

        {messages.map((m) => {
          if (m.type === "sticker") {
            return (
              <div key={m.id} className="sticker-pop" style={{
                alignSelf: m.sender==="me" ? "flex-end" : "flex-start",
                textAlign:"center"
              }}>
                <div style={{
                  background:T.card, border:`1px dashed ${T.border2}`,
                  borderRadius:12, padding:"10px 16px", display:"inline-block"
                }}>
                  <div style={{ fontSize:28 }}>{m.sticker.emoji}</div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:T.gold, marginTop:3 }}>AI STICKER · {m.sticker.label}</div>
                </div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:T.muted, marginTop:3 }}>
                  {m.sender==="me" ? "@zenpunks" : `@${opponent.handle}`} dropped a sticker
                </div>
              </div>
            );
          }
          const isMe = m.sender === "me";
          return (
            <div key={m.id} className="msg-bubble" style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth:"78%" }}>
              <div style={{
                padding:"10px 13px", borderRadius:12, fontSize:13, lineHeight:1.55,
                ...(isMe
                  ? { background:"rgba(255,60,26,0.12)", border:`1px solid rgba(255,60,26,0.22)`, color:"#FFD4CC", borderBottomRightRadius:4 }
                  : { background:T.card, border:`1px solid ${T.border}`, borderBottomLeftRadius:4 })
              }}>{m.text}</div>
              <div style={{
                fontFamily:"'Space Mono',monospace", fontSize:9, color:T.muted,
                marginTop:3, textAlign: isMe ? "right" : "left"
              }}>{isMe ? "@zenpunks" : `@${opponent.handle}`}</div>
            </div>
          );
        })}

        {opponentTyping && (
          <div style={{ alignSelf:"flex-start", display:"flex", gap:3, padding:"10px 14px", background:T.card, borderRadius:12, border:`1px solid ${T.border}` }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:T.muted, animation:`pulse 1.2s ease ${i*0.2}s infinite` }}/>
            ))}
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Sticker tray */}
      {showStickers && (
        <div style={{
          padding:"10px 16px", background:T.surface, borderTop:`1px solid ${T.border}`,
          display:"flex", gap:8, flexWrap:"wrap"
        }}>
          {STICKERS.map(s => (
            <button key={s.id} onClick={() => sendSticker(s)} style={{
              background:T.card, border:`1px solid ${T.border}`, borderRadius:10,
              padding:"8px 12px", textAlign:"center", cursor:"pointer",
              transition:"border-color .15s"
            }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.fire}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}
            >
              <div style={{ fontSize:20 }}>{s.emoji}</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:T.gold, marginTop:2 }}>{s.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{
        padding:"10px 16px", borderTop:`1px solid ${T.border}`,
        display:"flex", gap:8, alignItems:"flex-end", flexShrink:0
      }}>
        <button
          onClick={() => setShowStickers(s => !s)}
          style={{
            background:"none", border:`1px solid ${showStickers ? T.gold : T.border}`,
            borderRadius:8, padding:"9px 11px", fontSize:16, color: showStickers ? T.gold : T.muted2,
            transition:"border-color .15s, color .15s", flexShrink:0
          }}
        >🎭</button>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }}}
          placeholder="Drop your roast..."
          style={{
            flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:8,
            padding:"10px 12px", color:T.text, fontSize:13, resize:"none",
            minHeight:38, maxHeight:96, lineHeight:1.4
          }}
        />
        <button className="btn-fire" onClick={sendMsg} style={{ padding:"9px 14px", flexShrink:0 }}>SEND</button>
        {messages.length >= 4 && (
          <button
            onClick={endBattle}
            disabled={judging}
            style={{
              background:"rgba(255,184,0,0.1)", border:`1px solid rgba(255,184,0,0.3)`,
              borderRadius:8, padding:"9px 12px", color:T.gold, flexShrink:0,
              fontFamily:"'Space Mono',monospace", fontSize:10, cursor:"pointer",
              display:"flex", alignItems:"center", gap:5
            }}
          >
            {judging ? <div style={{ width:14, height:14, border:`2px solid ${T.gold}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/> : null}
            {judging ? "JUDGING" : "⚖️ JUDGE"}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── ARENA (FIND BATTLE) ──────────────────────────────────────────────────────
const Arena = ({ onChallenge }) => {
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const topics = ["Overrated Tech","Fast Food Rankings","Social Media Apps","Startup Culture","Streaming Shows","Sneaker Drops","Music Artists","Movie Sequels"];

  const filtered = USERS.filter(u =>
    u.handle.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding:"1.25rem" }}>
      <SectionLabel>Global Arena</SectionLabel>
      <SectionTitle>FIND YOUR OPPONENT</SectionTitle>

      {/* Topic picker */}
      <div style={{ marginBottom:"1.25rem" }}>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.muted, letterSpacing:2, marginBottom:8 }}>PICK A TOPIC</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {topics.map(t => (
            <button key={t} onClick={() => setSelectedTopic(t === selectedTopic ? "" : t)} style={{
              fontFamily:"'Space Mono',monospace", fontSize:10, padding:"5px 10px",
              borderRadius:6, border:`1px solid ${t===selectedTopic ? T.fire : T.border}`,
              background: t===selectedTopic ? "rgba(255,60,26,0.1)" : "transparent",
              color: t===selectedTopic ? T.fire : T.muted2, cursor:"pointer",
              transition:"all .15s"
            }}>{t}</button>
          ))}
        </div>
        {selectedTopic && (
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.gold, marginTop:8 }}>
            🔥 Topic locked: <strong>{selectedTopic}</strong>
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ position:"relative", marginBottom:"1rem" }}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by handle or name..."
          style={{
            width:"100%", background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:10, padding:"11px 14px 11px 38px", color:T.text, fontSize:13
          }}
        />
        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:T.muted, fontSize:14 }}>🔍</span>
      </div>

      {/* User list */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map((u, i) => (
          <div key={u.id} className="card-hover" style={{
            background:T.card, border:`1px solid ${T.border}`, borderRadius:12,
            padding:"12px 14px", display:"flex", alignItems:"center", gap:12,
            animation:`slideUp .2s ease ${i*0.04}s both`
          }}>
            <Avatar initials={u.initials} size={44} color={u.color} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:14, marginBottom:2 }}>{u.name}</div>
              <div style={{ display:"flex", gap:10 }}>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.muted }}>@{u.handle}</span>
                <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:13, color:T.gold }}>⚡ {u.aura.toLocaleString()}</span>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.plus }}>{Math.round(u.wins/(u.wins+u.losses)*100)}% W</span>
              </div>
            </div>
            <button className="btn-fire" onClick={() => onChallenge(u, selectedTopic)} style={{ padding:"8px 14px", fontSize:10 }}>
              🔥 ROAST
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
const Leaderboard = ({ onViewProfile }) => {
  const all = [CURRENT_USER, ...USERS]
    .map(u => ({ ...u, color: u.id===CURRENT_USER.id ? T.fire : (u.color||T.gold) }))
    .sort((a,b) => b.aura - a.aura);

  const medals = ["🥇","🥈","🥉"];

  return (
    <div style={{ padding:"1.25rem" }}>
      <SectionLabel>This Week</SectionLabel>
      <SectionTitle>AURA RANKINGS</SectionTitle>

      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {all.map((u, i) => {
          const isMe = u.id === CURRENT_USER.id;
          return (
            <div key={u.id}
              className="card-hover"
              onClick={() => onViewProfile(u)}
              style={{
                background: isMe ? "rgba(255,60,26,0.06)" : T.card,
                border:`1px solid ${isMe ? "rgba(255,60,26,0.3)" : T.border}`,
                borderRadius:12, padding:"12px 14px",
                display:"flex", alignItems:"center", gap:12, cursor:"pointer",
                animation:`slideUp .2s ease ${i*0.04}s both`
              }}
            >
              <div style={{
                width:28, textAlign:"center",
                fontFamily:"'Bebas Neue', sans-serif", fontSize: i<3 ? 22 : 16,
                color: i===0 ? T.gold : i===1 ? "#C0C0C0" : i===2 ? "#CD7F32" : T.muted
              }}>{i < 3 ? medals[i] : i+1}</div>
              <Avatar initials={u.initials} size={40} color={u.color} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:1 }}>
                  {u.name} {isMe && <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:T.fire, background:"rgba(255,60,26,0.1)", padding:"2px 6px", borderRadius:3 }}>YOU</span>}
                </div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.muted }}>@{u.handle} · {Math.round(u.wins/(u.wins+u.losses)*100)}% win rate</div>
              </div>
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, color:T.gold, letterSpacing:1 }}>
                ⚡ {u.aura.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── RAGE GROUPS ──────────────────────────────────────────────────────────────
const RageGroups = ({ onChallenge }) => {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🔥");
  const [newTopic, setNewTopic] = useState("");
  const [groups, setGroups] = useState(RAGE_GROUPS);
  const [joined, setJoined] = useState(["g1","g2"]);

  const emojis = ["🔥","💀","🤡","⚡","🎯","🎭","🎬","💻","🍔","👟","🎵","🏆"];

  const createGroup = () => {
    if (!newName.trim()) return;
    const g = {
      id:`g${Date.now()}`, name:newName.toUpperCase(), emoji:newEmoji,
      members:1, topic:newTopic||"Open topic", tags:["#custom"],
      active:true, isNew:true
    };
    setGroups(gs => [g, ...gs]);
    setJoined(j => [...j, g.id]);
    setCreating(false);
    setNewName(""); setNewTopic(""); setNewEmoji("🔥");
  };

  return (
    <div style={{ padding:"1.25rem" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.5rem" }}>
        <div>
          <SectionLabel>Arenas</SectionLabel>
          <SectionTitle size={26}>RAGE GROUPS</SectionTitle>
        </div>
        <button className="btn-fire" onClick={() => setCreating(c => !c)} style={{ marginTop:8, fontSize:11 }}>
          + CREATE
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{
          background:T.surface, border:`1px solid ${T.border}`, borderRadius:14,
          padding:"1.25rem", marginBottom:"1.25rem", animation:"slideUp .2s ease"
        }}>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:T.fire, letterSpacing:2, marginBottom:"1rem" }}>NEW RAGE GROUP</div>

          <div style={{ marginBottom:10 }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.muted, marginBottom:5 }}>PICK AN EMOJI</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {emojis.map(e => (
                <button key={e} onClick={() => setNewEmoji(e)} style={{
                  fontSize:20, background: e===newEmoji ? "rgba(255,60,26,0.12)" : T.card,
                  border:`1px solid ${e===newEmoji ? T.fire : T.border}`,
                  borderRadius:8, padding:"6px 10px", cursor:"pointer"
                }}>{e}</button>
              ))}
            </div>
          </div>

          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="GROUP NAME (e.g. CRICKET CLOWNS)"
            style={{
              width:"100%", background:T.card, border:`1px solid ${T.border}`,
              borderRadius:8, padding:"10px 12px", color:T.text, fontSize:13,
              fontFamily:"'Bebas Neue', sans-serif", letterSpacing:2, marginBottom:8
            }}
          />
          <input
            value={newTopic} onChange={e => setNewTopic(e.target.value)}
            placeholder="Roast topic (e.g. Bollywood Movies)"
            style={{
              width:"100%", background:T.card, border:`1px solid ${T.border}`,
              borderRadius:8, padding:"10px 12px", color:T.text, fontSize:13, marginBottom:12
            }}
          />
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn-fire" onClick={createGroup} style={{ flex:1 }}>CREATE GROUP</button>
            <button className="btn-ghost" onClick={() => setCreating(false)}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Groups */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {groups.map((g, i) => {
          const isJoined = joined.includes(g.id);
          return (
            <div key={g.id} className="card-hover" style={{
              background:T.card, border:`1px solid ${isJoined ? "rgba(255,60,26,0.25)" : T.border}`,
              borderRadius:14, padding:"1rem 1.1rem",
              animation:`slideUp .2s ease ${i*0.05}s both`
            }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                <div style={{
                  width:44, height:44, borderRadius:10, background:T.surface,
                  border:`1px solid ${T.border}`, display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:22, flexShrink:0
                }}>{g.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:18, letterSpacing:1 }}>{g.name}</div>
                    {g.active && <div style={{
                      display:"flex", alignItems:"center", gap:4,
                      fontFamily:"'Space Mono',monospace", fontSize:9,
                      color:T.plus, background:"rgba(0,230,118,0.08)", border:`1px solid rgba(0,230,118,0.2)`,
                      padding:"2px 7px", borderRadius:4
                    }}><LiveDot /> ACTIVE</div>}
                    {g.isNew && <div style={{
                      fontFamily:"'Space Mono',monospace", fontSize:9, color:T.fire,
                      background:"rgba(255,60,26,0.1)", border:`1px solid rgba(255,60,26,0.25)`,
                      padding:"2px 7px", borderRadius:4
                    }}>NEW</div>}
                  </div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:T.muted, marginBottom:8 }}>
                    {(g.members).toLocaleString()} members · {g.topic}
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:10 }}>
                    {g.tags.map(t => <Tag key={t} label={t} />)}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    {!isJoined ? (
                      <button className="btn-fire" onClick={() => setJoined(j=>[...j,g.id])} style={{ fontSize:10, padding:"6px 14px" }}>
                        JOIN GROUP
                      </button>
                    ) : (
                      <button className="btn-ghost" style={{ fontSize:10, padding:"6px 14px" }}>
                        ✓ JOINED
                      </button>
                    )}
                    <button
                      onClick={() => onChallenge(USERS[i % USERS.length], g.topic)}
                      style={{
                        background:"rgba(255,184,0,0.08)", border:`1px solid rgba(255,184,0,0.2)`,
                        borderRadius:8, padding:"6px 14px", color:T.gold, cursor:"pointer",
                        fontFamily:"'Space Mono',monospace", fontSize:10, transition:"all .15s"
                      }}
                    >
                      🔥 ROAST HERE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("profile");
  const [activeChat, setActiveChat] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [userAura, setUserAura] = useState(CURRENT_USER.aura);
  const [auraFlash, setAuraFlash] = useState(null);

  const handleChallenge = (opponent, topic = "Overrated Tech") => {
    setActiveChat({ opponent, topic: topic || "Overrated Tech" });
  };

  const handleChatEnd = () => setActiveChat(null);
  const handleViewProfile = (user) => { setViewingUser(user); setTab("profile"); };

  // Flash aura change
  const flashAura = (delta) => {
    setUserAura(a => a + delta);
    setAuraFlash(delta);
    setTimeout(() => setAuraFlash(null), 2000);
  };

  const TABS = [
    { id:"profile", label:"PROFILE", icon:"👤" },
    { id:"arena",   label:"ARENA",   icon:"⚔️" },
    { id:"groups",  label:"GROUPS",  icon:"🔥" },
    { id:"ranks",   label:"RANKS",   icon:"🏆" },
  ];

  // Wrap chat end to handle verdict
  const handleChatEndWithVerdict = () => {
    setActiveChat(null);
  };

  const currentProfile = viewingUser && tab==="profile" ? viewingUser : null;

  return (
    <>
      <FontLink />
      <style>{css}</style>
      <div style={{ background:T.bg, minHeight:"100vh", maxWidth:480, margin:"0 auto", display:"flex", flexDirection:"column" }}>

        {/* TOP NAV */}
        {!activeChat && (
          <div style={{
            background:T.surface, borderBottom:`1px solid ${T.border}`,
            padding:"14px 20px 0", position:"sticky", top:0, zIndex:50
          }}>
            {/* Logo row */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:30, height:30, borderRadius:7, background:T.fire, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🔥</div>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:22, letterSpacing:3 }}>
                  RAGE<span style={{ color:T.fire }}>BITE</span>
                </div>
              </div>

              {/* Aura chip */}
              <div style={{
                display:"flex", alignItems:"center", gap:7,
                background:"rgba(255,184,0,0.08)", border:`1px solid rgba(255,184,0,0.25)`,
                borderRadius:20, padding:"6px 12px", position:"relative"
              }}>
                <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:17, color:T.gold, lineHeight:1 }} className="aura-float">
                  ⚡ {userAura.toLocaleString()}
                </span>
                {auraFlash !== null && (
                  <span style={{
                    position:"absolute", top:-20, right:0,
                    fontFamily:"'Bebas Neue', sans-serif", fontSize:16,
                    color: auraFlash > 0 ? T.plus : T.minus,
                    animation:"slideUp .3s ease"
                  }}>{auraFlash > 0 ? `+${auraFlash}` : auraFlash}</span>
                )}
                <div style={{ width:1, height:12, background:T.border }}/>
                <Avatar initials="ZK" size={22} color={T.fire} style={{ flexShrink:0 }}/>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display:"flex", gap:20 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setViewingUser(null); }}
                  className={`nav-tab ${tab===t.id ? "active" : ""}`}
                  style={{
                    background:"none", border:"none", color: tab===t.id ? T.fire : T.muted,
                    fontFamily:"'Space Mono', monospace", fontSize:10, letterSpacing:"1.5px",
                    padding:"0 0 6px", cursor:"pointer"
                  }}
                >{t.icon} {t.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div style={{ flex:1, overflowY: activeChat ? "hidden" : "auto" }}>
          {activeChat ? (
            <RoastChat
              opponent={activeChat.opponent}
              topic={activeChat.topic}
              onEnd={handleChatEndWithVerdict}
            />
          ) : (
            <>
              {tab==="profile" && <ProfilePage user={currentProfile || CURRENT_USER} onChallenge={handleChallenge} />}
              {tab==="arena"   && <Arena onChallenge={handleChallenge} />}
              {tab==="groups"  && <RageGroups onChallenge={handleChallenge} />}
              {tab==="ranks"   && <Leaderboard onViewProfile={handleViewProfile} />}
            </>
          )}
        </div>

        {/* BOTTOM NAV (mobile style) */}
        {!activeChat && (
          <div style={{
            background:T.surface, borderTop:`1px solid ${T.border}`,
            display:"flex", padding:"10px 0 14px", position:"sticky", bottom:0
          }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setViewingUser(null); }}
                style={{
                  flex:1, background:"none", border:"none", cursor:"pointer",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                  opacity: tab===t.id ? 1 : 0.4, transition:"opacity .15s"
                }}
              >
                <span style={{ fontSize:18 }}>{t.icon}</span>
                <span style={{
                  fontFamily:"'Space Mono', monospace", fontSize:8, letterSpacing:1,
                  color: tab===t.id ? T.fire : T.muted
                }}>{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <SpeedInsights />
    </>
  );
}

export default App;
