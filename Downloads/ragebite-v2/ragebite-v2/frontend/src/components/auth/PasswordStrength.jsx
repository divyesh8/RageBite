const TESTS = [
  { label: '8+ chars',   test: v => v.length >= 8 },
  { label: 'Uppercase',  test: v => /[A-Z]/.test(v) },
  { label: 'Lowercase',  test: v => /[a-z]/.test(v) },
  { label: 'Number',     test: v => /[0-9]/.test(v) },
];
const LEVELS = [
  { label: '',       color: '#222' },
  { label: 'WEAK',   color: '#FF3C1A' },
  { label: 'FAIR',   color: '#FF8C00' },
  { label: 'GOOD',   color: '#FFB800' },
  { label: 'STRONG', color: '#00E676' },
];

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const score = TESTS.filter(t => t.test(password)).length;
  const { label, color } = LEVELS[score];

  return (
    <div className="mt-2 space-y-2 animate-slide-up">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-0.5 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= score ? color : '#1e1e1e' }} />
          ))}
        </div>
        <span className="font-mono text-[10px] w-12 text-right" style={{ color: score > 0 ? color : '#444' }}>
          {label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {TESTS.map((t, i) => {
          const pass = t.test(password);
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-[11px] transition-colors" style={{ color: pass ? '#00E676' : '#2a2a2a' }}>
                {pass ? '✓' : '○'}
              </span>
              <span className="font-mono text-[10px] transition-colors" style={{ color: pass ? '#666' : '#333' }}>
                {t.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
