// ================================================================
// WEB UI GENERATION INTELLIGENCE — paste into autonomousCoding.ts
// Place this BEFORE the getIDEScriptPrompt function or near the
// top of the file after your imports/constants section.
// ================================================================

// --- DETECTOR ---------------------------------------------------
function detectWebUIRequest(message: string): boolean {
  const patterns = [
    /\b(create|build|make|generate|design|write)\b.{0,50}\b(ui|page|website|web\s*app|landing|dashboard|component|layout|screen|interface)\b/i,
    /\b(improve|enhance|redesign|update|restyle|refresh)\b.{0,40}\b(ui|design|look|style|layout|appearance|visual)\b/i,
    /\b(hero|navbar|header|footer|card|grid|section|banner|sidebar)\b/i,
    /\b(animat|transition|effect|motion|scroll)\b/i,
    /\b(dark\s*mode|light\s*mode|theme|color\s*scheme|gradient)\b/i,
    /more\s+(beautiful|modern|professional|clean|elegant|impressive|attractive)/i,
    /\b(react|tsx|component|jsx)\b.{0,30}\b(page|ui|screen|layout)\b/i,
  ];
  return patterns.some(p => p.test(message));
}

// --- WEB UI SYSTEM PROMPT ---------------------------------------
const WEB_UI_GENERATION_PROMPT = `
╔══════════════════════════════════════════════════════════════╗
║              WEB UI GENERATION MODE — ACTIVE                 ║
╚══════════════════════════════════════════════════════════════╝

You are generating a COMPLETE, VISUALLY WORKING web UI.
The user will see the live preview immediately. These rules are MANDATORY.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 1: ALWAYS GENERATE ALL 6 FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use ide_create_file for each:
  1. src/App.tsx              — root, imports all components
  2. src/components/Header.tsx — dark sticky navbar
  3. src/components/Hero.tsx   — full-viewport hero section  
  4. src/components/Features.tsx — features/services grid
  5. src/components/Footer.tsx — dark footer
  6. src/App.css               — global + component styles

Also patch src/index.css to ensure dark background.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 2: EVERY COMPONENT MUST BE SELF-VISIBLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Every section needs its own background-color/gradient
• NEVER leave background transparent or rely on parent for color
• Use explicit inline styles for critical layout + color
• Dark theme palette: #0a0a0a | #111827 | #1a1a2e | #16213e
• Accent colors: #6366f1 | #8b5cf6 | #06b6d4 | #f59e0b
• Text: #ffffff | #e2e8f0 | #94a3b8

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 3: MANDATORY FILE TEMPLATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### src/App.tsx
\`\`\`tsx
import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Footer from './components/Footer';
import './App.css';

const App: React.FC = () => (
  <div style={{ margin: 0, padding: 0, backgroundColor: '#0a0a0a', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
    <Header />
    <main>
      <Hero />
      <Features />
    </main>
    <Footer />
  </div>
);

export default App;
\`\`\`

### src/components/Header.tsx
\`\`\`tsx
import React, { useState, useEffect } from 'react';

const Header: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      padding: '0 2rem', height: '64px', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      background: scrolled ? 'rgba(10,10,10,0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(99,102,241,0.3)' : 'none',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff',
        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        BrandName
      </div>
      <nav style={{ display: 'flex', gap: '2rem' }}>
        {['Home','Features','About','Contact'].map(item => (
          <a key={item} href={\`#\${item.toLowerCase()}\`} style={{
            color: '#94a3b8', textDecoration: 'none', fontSize: '0.95rem',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
            {item}
          </a>
        ))}
      </nav>
      <button style={{
        padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#fff', fontWeight: 600, fontSize: '0.9rem',
      }}>
        Get Started
      </button>
    </header>
  );
};
export default Header;
\`\`\`

### src/components/Hero.tsx
\`\`\`tsx
import React, { useEffect, useState } from 'react';

const Hero: React.FC = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);
  return (
    <section id="home" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0f0c29 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '100px 2rem 60px', textAlign: 'center', position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow orbs */}
      <div style={{ position: 'absolute', top: '20%', left: '15%', width: '300px', height: '300px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '30%', right: '15%', width: '250px', height: '250px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '800px', transform: visible ? 'translateY(0)' : 'translateY(30px)',
        opacity: visible ? 1 : 0, transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px',
          borderRadius: '20px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
          color: '#a5b4fc', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          ✨ New Release Available
        </div>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.1,
          marginBottom: '1.5rem', color: '#fff' }}>
          Build Something{' '}
          <span style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Extraordinary
          </span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
          A powerful platform that helps you create stunning digital experiences
          with ease. Fast, beautiful, and built for the modern web.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={{ padding: '14px 36px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
            fontSize: '1rem', fontWeight: 700, boxShadow: '0 0 30px rgba(99,102,241,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(99,102,241,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(99,102,241,0.4)'; }}>
            Get Started Free →
          </button>
          <button style={{ padding: '14px 36px', borderRadius: '10px', cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '1rem', fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
            transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
            View Demo
          </button>
        </div>
      </div>
    </section>
  );
};
export default Hero;
\`\`\`

### src/components/Features.tsx
\`\`\`tsx
import React from 'react';

const features = [
  { icon: '⚡', title: 'Lightning Fast', desc: 'Built with performance in mind. Zero compromise on speed.', color: '#f59e0b' },
  { icon: '🎨', title: 'Beautiful Design', desc: 'Crafted with attention to detail and modern aesthetics.', color: '#8b5cf6' },
  { icon: '🔒', title: 'Secure by Default', desc: 'Enterprise-grade security built into every layer.', color: '#06b6d4' },
  { icon: '🚀', title: 'Easy to Scale', desc: 'Grows with your needs from startup to enterprise.', color: '#6366f1' },
  { icon: '🌐', title: 'Global CDN', desc: 'Serve your users from 200+ edge locations worldwide.', color: '#ec4899' },
  { icon: '📊', title: 'Analytics Built-in', desc: 'Real-time insights and actionable data at your fingertips.', color: '#10b981' },
];

const Features: React.FC = () => (
  <section id="features" style={{
    padding: '100px 2rem',
    background: 'linear-gradient(180deg, #0f0c29 0%, #111827 100%)',
  }}>
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>
          Everything You Need
        </h2>
        <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '500px', margin: '0 auto' }}>
          All the tools and features to build, launch, and scale your product.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {features.map((f, i) => (
          <div key={i} style={{
            padding: '2rem', borderRadius: '16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            transition: 'transform 0.3s, border-color 0.3s, box-shadow 0.3s',
            cursor: 'default',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.borderColor = \`\${f.color}40\`;
            e.currentTarget.style.boxShadow = \`0 20px 40px rgba(0,0,0,0.3), 0 0 30px \${f.color}15\`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{f.icon}</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.75rem' }}>{f.title}</h3>
            <p style={{ color: '#64748b', lineHeight: 1.6, fontSize: '0.95rem' }}>{f.desc}</p>
            <div style={{ marginTop: '1.5rem', height: '2px', width: '40px',
              background: \`linear-gradient(90deg, \${f.color}, transparent)\`, borderRadius: '2px' }} />
          </div>
        ))}
      </div>
    </div>
  </section>
);
export default Features;
\`\`\`

### src/components/Footer.tsx
\`\`\`tsx
import React from 'react';

const Footer: React.FC = () => (
  <footer style={{
    background: '#050505', borderTop: '1px solid rgba(255,255,255,0.06)',
    padding: '60px 2rem 30px',
  }}>
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', justifyContent: 'space-between', marginBottom: '3rem' }}>
        <div style={{ maxWidth: '300px' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BrandName</div>
          <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.9rem' }}>
            Building the future of digital experiences, one pixel at a time.
          </p>
        </div>
        {[
          { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
          { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
        ].map(col => (
          <div key={col.title}>
            <h4 style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '1rem', fontSize: '0.95rem' }}>{col.title}</h4>
            {col.links.map(link => (
              <div key={link} style={{ marginBottom: '0.6rem' }}>
                <a href="#" style={{ color: '#475569', textDecoration: 'none', fontSize: '0.9rem',
                  transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                  onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                  {link}
                </a>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <p style={{ color: '#334155', fontSize: '0.85rem' }}>© 2024 BrandName. All rights reserved.</p>
        <p style={{ color: '#334155', fontSize: '0.85rem' }}>Built with React & TypeScript</p>
      </div>
    </div>
  </footer>
);
export default Footer;
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 4: index.css MUST reset defaults
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Always patch index.css with:
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { background: #0a0a0a; color: #fff; font-family: Inter, system-ui, -apple-system, sans-serif; overflow-x: hidden; }
a { text-decoration: none; }
button { cursor: pointer; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #0a0a0a; }
::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 5: ADAPT to what the user asks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• If user says "portfolio" → adapt Hero to show name/role/skills
• If user says "SaaS" → adapt Features to show pricing/tiers
• If user says "e-commerce" → adapt Features to show product cards
• If user says "restaurant" → use warm amber/orange palette
• If user says "medical" → use clean blue/white palette
• ALWAYS adapt content to match the domain, never use generic placeholder text
• READ the user's description carefully and match the industry/tone

END OF WEB UI GENERATION RULES
`;

// ================================================================
// INJECTION POINT — add this inside your message-building function
// Find where "IDE Script prompt injected" fires and add:
// ================================================================
/*
  // INSIDE your getIDEScriptContext() or buildSystemPrompt() function:
  
  const userMsg = message || '';
  
  if (detectWebUIRequest(userMsg)) {
    systemParts.push(WEB_UI_GENERATION_PROMPT);
    console.log('🎨 [WebUI Mode] UI generation rules injected');
  }
*/

// ================================================================
// BONUS: File relevance boost for UI mode
// Find your file relevance scoring function and add:
// ================================================================
/*
  // INSIDE your relevance scoring (findRelated / scoreFile):
  
  if (detectWebUIRequest(currentUserMessage)) {
    const uiFiles = ['App.tsx','App.css','index.css','Header.tsx','Hero.tsx','Features.tsx','Footer.tsx'];
    if (uiFiles.some(f => filePath.endsWith(f))) {
      score += 100; // Always read these in UI mode
    }
    if (filePath.includes('components/')) {
      score += 50;
    }
  }
*/
