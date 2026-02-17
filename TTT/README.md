# Trace The Truth - 2026 Edition

A modern cybersecurity themed web application built with React and Tailwind CSS.

## Features

### Scoreboard Page (Active View)
- Premium podium display for top 3 teams with special visual effects
- Gold winner card with enhanced glow effect and crown badge
- Silver and bronze cards for 2nd and 3rd place
- Live countdown timer for event end
- Live rankings table with team avatars and stats
- Search functionality for finding teams
- Pagination for browsing all teams
- Real-time score updates
- Fully responsive podium layout

### Challenges Page
- Full CTF challenges dashboard with grid layout
- Top navbar with navigation, score display, and rank
- Challenge cards with difficulty indicators (Easy/Medium/Hard)
- Special states for solved challenges and highlighted difficult tasks
- Search functionality for filtering challenges
- Responsive 3-column grid (desktop) to 1-column (mobile)
- Load more pagination button
- **Interactive challenge detail modal** with:
  - Full challenge description and intel notes
  - Evidence file download section
  - Challenge statistics (solves, first blood, solve rate)
  - Hint unlock functionality
  - Flag submission form with live server status

### Dashboard (Landing Page)
- Clean hero section with "Initialize Operation" interface
- Two-card layout for creating or joining teams
- Agent profile navbar with notification system
- System status indicators and version info
- Glassmorphism design with neon blue accents

### Login Page
- "Join Existing Squad" authentication interface
- Secure access key input with visual effects
- Grid pattern overlay with radial glows
- System status footer with encryption details

### Registration Page
- "Initialize Sequence" new user registration
- Split layout with hero section and form
- Event details log box with monospace styling
- Full credential collection form

### Design Features
- Dark navy gradient backgrounds with radial blue glows
- Glassmorphism cards with blur effects
- Neon blue glowing elements and shadows
- Fully responsive design
- Smooth hover and focus animations
- Modern sans-serif and monospace typography
- Corner accent borders on cards

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The application will open at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- PostCSS
