import { Link } from 'react-router-dom';

export default function AuthLayout({ children, title, subtitle, tag }) {
  return (
    <div className="min-h-screen bg-rb-bg relative overflow-hidden flex flex-col" style={{
      backgroundImage: 'linear-gradient(rgba(255,60,26,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,60,26,.04) 1px, transparent 1px)',
      backgroundSize: '48px 48px',
    }}>
      {/* Glow orbs */}
      <div className="absolute pointer-events-none" style={{ top:'-15%', right:'-5%', width:500, height:500, background:'radial-gradient(circle,rgba(255,60,26,.08),transparent 70%)' }} />
      <div className="absolute pointer-events-none" style={{ bottom:'-10%', left:'-8%', width:400, height:400, background:'radial-gradient(circle,rgba(255,184,0,.06),transparent 70%)' }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-rb-fire rounded-lg flex items-center justify-center text-lg">🔥</div>
          <span className="font-display text-2xl tracking-widest">RAGE<span className="text-rb-fire">BITE</span></span>
        </Link>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-rb-border bg-rb-surface/50">
          <div className="w-1.5 h-1.5 rounded-full bg-rb-plus animate-pulse" />
          <span className="font-mono text-[10px] text-rb-muted tracking-widest">SERVERS LIVE</span>
        </div>
      </nav>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md animate-slide-up">
          {(tag || title) && (
            <div className="text-center mb-7">
              {tag    && <p className="font-mono text-[11px] text-rb-fire tracking-widest uppercase mb-2">{tag}</p>}
              {title  && <h1 className="font-display text-5xl tracking-wide leading-none mb-2">{title}</h1>}
              {subtitle && <p className="text-rb-muted text-sm">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </main>

      <footer className="relative z-10 text-center py-5 font-mono text-[10px] text-rb-muted tracking-widest">
        © {new Date().getFullYear()} RAGEBITE · ROAST RESPONSIBLY
      </footer>
    </div>
  );
}
