import { BOTTOM_NAV_ITEMS } from '../utils/constants'

export default function BottomNav({ activeScreen, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Main Navigation">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive = activeScreen === item.id
        return (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
