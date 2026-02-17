function Dashboard() {
  const stats = [
    {
      title: 'TOTAL CHALLENGES',
      value: '14',
      suffix: '/ 25',
      accent: 'blue',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4h10l6 6v10H4z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 4v6h6" />
        </svg>
      )
    },
    {
      title: 'POSITION',
      value: '#12',
      suffix: 'TOP 5%',
      accent: 'orange',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 21h8" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5l3 4h-6l3-4z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 9h12v4a6 6 0 01-12 0V9z" />
        </svg>
      )
    },
    {
      title: 'TOTAL SCORE',
      value: '2,450',
      suffix: 'PTS',
      accent: 'purple',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v18" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 7h12" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 17h12" />
        </svg>
      )
    }
  ]

  const members = [
    { initials: 'AH', name: 'Alex Hunt', score: '1,850' },
    { initials: 'PH', name: 'Phantom', score: '1,200' },
    { initials: 'CI', name: 'Cipher', score: '850' },
    { initials: 'ZE', name: 'Zero', score: '350' }
  ]

  const feedItems = [
    { icon: '🔎', title: 'Network Traffic Analysis', tag: 'FORENSICS', agent: 'Phantom', points: '+200 POINTS' },
    { icon: '🧩', title: 'Steganography Basics', tag: 'CRYPTO', agent: 'Alex', points: '+100 POINTS' },
    { icon: '🧠', title: 'Memory Dump 01', tag: 'FORENSICS', agent: 'Cipher', points: '+350 POINTS' },
    { icon: '🌐', title: 'Web SQL Injection II', tag: 'WEB', agent: 'Alex', points: '+150 POINTS' },
    { icon: '💾', title: 'Buffer Overflow 101', tag: 'BINARY', agent: 'Phantom', points: '+500 POINTS' }
  ]

  return (
    <div className="ttt-dashboard">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&display=swap');

        :root {
          --bg-1: #071421;
          --bg-2: #0b1e2d;
          --panel: rgba(12, 22, 34, 0.78);
          --border: rgba(95, 145, 205, 0.28);
          --text: #eef6ff;
          --muted: rgba(180, 200, 230, 0.68);
          --blue: #2aa3ff;
          --green: #3cf28a;
          --orange: #ff9c3a;
          --purple: #a07bff;
          --radius-sm: 10px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --shadow-1: 0 6px 16px rgba(3, 10, 20, 0.35);
          --shadow-2: 0 12px 24px rgba(8, 24, 44, 0.4);
          --shadow-3: 0 16px 34px rgba(10, 35, 60, 0.45);
          --transition: 200ms ease-in-out;
          --space-1: 8px;
          --space-2: 12px;
          --space-3: 16px;
          --space-4: 20px;
          --space-5: 24px;
          --space-6: 32px;
        }

        .ttt-dashboard {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(30, 90, 150, 0.2), transparent 45%),
            linear-gradient(180deg, var(--bg-1) 0%, var(--bg-2) 100%);
          color: var(--text);
          position: relative;
          overflow: hidden;
          font-family: 'Orbitron', sans-serif;
        }

        .ttt-stars {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(120, 160, 220, 0.25) 1px, transparent 1px);
          background-size: 60px 60px;
          opacity: 0.12;
          pointer-events: none;
        }

        .ttt-content {
          position: relative;
          z-index: 1;
          max-width: 1440px;
          margin: 0 auto;
          padding: var(--space-6);
        }

        .ttt-header {
          margin-bottom: var(--space-6);
        }

        .ttt-badges {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: var(--space-2);
        }

        .ttt-pill {
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(35, 60, 90, 0.6);
          border: 1px solid rgba(90, 140, 200, 0.35);
          font-size: 11px;
          letter-spacing: 0.14em;
          color: var(--muted);
        }

        .ttt-pill.active {
          color: #052312;
          background: rgba(60, 242, 138, 0.9);
          box-shadow: 0 0 12px rgba(60, 242, 138, 0.35);
          border: none;
        }

        .ttt-team-name {
          font-size: clamp(30px, 5vw, 44px);
          letter-spacing: 0.1em;
          font-weight: 700;
        }

        .ttt-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(220px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        .ttt-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          backdrop-filter: blur(12px);
          box-shadow: var(--shadow-1);
          transition: transform var(--transition), box-shadow var(--transition), border var(--transition);
        }

        .ttt-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-2);
          border-color: rgba(110, 170, 240, 0.45);
        }

        .ttt-card--stat {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .ttt-card--stat .title {
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.16em;
        }

        .ttt-card--stat .value {
          font-size: 30px;
          font-weight: 700;
          display: flex;
          align-items: baseline;
          gap: var(--space-2);
        }

        .ttt-card--stat .value span {
          font-size: 12px;
          color: var(--muted);
          letter-spacing: 0.08em;
        }

        .ttt-icon {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-md);
          display: grid;
          place-items: center;
          margin-left: auto;
        }

        .ttt-icon.blue { background: rgba(42, 163, 255, 0.16); color: var(--blue); }
        .ttt-icon.orange { background: rgba(255, 156, 58, 0.16); color: var(--orange); }
        .ttt-icon.purple { background: rgba(160, 123, 255, 0.18); color: var(--purple); }

        .ttt-main {
          display: grid;
          grid-template-columns: minmax(260px, 1fr) 2.2fr;
          gap: var(--space-4);
        }

        .ttt-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-3);
        }

        .ttt-section-header .label {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: 13px;
          letter-spacing: 0.16em;
        }

        .ttt-badge {
          font-size: 10px;
          color: var(--muted);
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(90, 140, 200, 0.35);
          background: rgba(35, 60, 90, 0.4);
        }

        .ttt-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .ttt-table th {
          text-align: left;
          color: var(--muted);
          font-size: 10px;
          letter-spacing: 0.14em;
          padding-bottom: var(--space-2);
          border-bottom: 1px solid rgba(80, 120, 170, 0.2);
        }

        .ttt-table td {
          padding: var(--space-2) 0;
          border-bottom: 1px solid rgba(80, 120, 170, 0.15);
        }

        .ttt-table tr:hover {
          background: rgba(30, 80, 140, 0.08);
        }

        .ttt-agent {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .ttt-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 12px;
          background: rgba(42, 163, 255, 0.2);
          color: #cfe9ff;
          border: 1px solid rgba(42, 163, 255, 0.5);
        }

        .ttt-score {
          text-align: right;
          color: var(--blue);
          font-weight: 600;
        }

        .ttt-feed-controls {
          display: flex;
          gap: var(--space-2);
        }

        .ttt-select {
          background: rgba(12, 22, 34, 0.7);
          border: 1px solid rgba(90, 140, 200, 0.3);
          color: var(--muted);
          border-radius: var(--radius-sm);
          padding: 6px 10px;
          font-size: 11px;
          letter-spacing: 0.08em;
          transition: border var(--transition), box-shadow var(--transition);
        }

        .ttt-select:focus-visible {
          outline: none;
          border-color: rgba(110, 190, 255, 0.7);
          box-shadow: 0 0 0 2px rgba(110, 190, 255, 0.2);
        }

        .ttt-feed-item {
          display: grid;
          grid-template-columns: 36px 1fr auto;
          gap: var(--space-2);
          padding: var(--space-2) 0;
          border-bottom: 1px solid rgba(80, 120, 170, 0.15);
          align-items: center;
          transition: background var(--transition);
        }

        .ttt-feed-item:hover {
          background: rgba(30, 80, 140, 0.08);
        }

        .ttt-feed-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          display: grid;
          place-items: center;
          background: rgba(42, 163, 255, 0.18);
          color: var(--blue);
        }

        .ttt-feed-title {
          font-size: 13px;
          font-weight: 600;
        }

        .ttt-tag {
          display: inline-block;
          margin-left: var(--space-1);
          font-size: 9px;
          letter-spacing: 0.14em;
          color: var(--muted);
          border: 1px solid rgba(90, 140, 200, 0.3);
          border-radius: 999px;
          padding: 2px 6px;
        }

        .ttt-feed-meta {
          color: var(--muted);
          font-size: 10px;
          margin-top: 4px;
        }

        .ttt-points {
          color: var(--blue);
          font-size: 12px;
          letter-spacing: 0.1em;
        }

        @media (max-width: 1100px) {
          .ttt-stat-grid {
            grid-template-columns: repeat(2, minmax(220px, 1fr));
          }
        }

        @media (max-width: 980px) {
          .ttt-main {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .ttt-content {
            padding: var(--space-5);
          }

          .ttt-stat-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (min-width: 1600px) {
          .ttt-content {
            max-width: 1600px;
          }
        }
      `}</style>

      <div className="ttt-stars"></div>

      <div className="ttt-content">
        <header className="ttt-header">
          <div className="ttt-badges">
            <span className="ttt-pill">SQUAD ID: #8821</span>
            <span className="ttt-pill active">ACTIVE</span>
          </div>
          <div className="ttt-team-name">CYBER_VANGUARD</div>
        </header>

        <section className="ttt-stat-grid">
          {stats.map((stat) => (
            <div className="ttt-card ttt-card--stat" key={stat.title}>
              <div className="title">{stat.title}</div>
              <div className="value">
                {stat.value} <span>{stat.suffix}</span>
                <div className={`ttt-icon ${stat.accent}`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="ttt-main">
          <div className="ttt-card">
            <div className="ttt-section-header">
              <div className="label">TEAM MEMBERS</div>
              <span className="ttt-badge">4 AGENTS</span>
            </div>
            <table className="ttt-table">
              <thead>
                <tr>
                  <th>AGENT</th>
                  <th style={{ textAlign: 'right' }}>SCORE</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.initials}>
                    <td>
                      <div className="ttt-agent">
                        <div className="ttt-avatar">{member.initials}</div>
                        <div>{member.name}</div>
                      </div>
                    </td>
                    <td className="ttt-score">{member.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ttt-card">
            <div className="ttt-section-header">
              <div className="label">FEED</div>
              <div className="ttt-feed-controls">
                <select className="ttt-select" aria-label="Filter feed">
                  <option>Filter: All</option>
                </select>
                <select className="ttt-select" aria-label="Sort feed">
                  <option>Sort: Recent</option>
                </select>
              </div>
            </div>

            {feedItems.map((item, index) => (
              <div
                className="ttt-feed-item"
                key={`${item.title}-${item.points}`}
                style={index === feedItems.length - 1 ? { borderBottom: 'none' } : undefined}
              >
                <div className="ttt-feed-icon">
                  <span>{item.icon}</span>
                </div>
                <div>
                  <div className="ttt-feed-title">
                    {item.title} <span className="ttt-tag">{item.tag}</span>
                  </div>
                  <div className="ttt-feed-meta">Solved by {item.agent}</div>
                </div>
                <div className="ttt-points">{item.points}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Dashboard
