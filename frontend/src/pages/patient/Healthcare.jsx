import FacilityCard from '../../components/FacilityCard'
import { SCREENS } from '../../utils/constants'

const SAMPLE_FACILITIES = [
  {
    id: 'phc-shirpur',
    name: 'Shirpur Primary Health Centre (PHC)',
    type: 'PHC',
    distance: '1.8 km',
    address: 'Near Gram Panchayat Office, Shirpur',
    doctorAvailable: true,
    timings: '8:00 AM - 2:00 PM',
  },
  {
    id: 'chc-taluka',
    name: 'Taluka Community Health Centre (CHC)',
    type: 'CHC',
    distance: '12.4 km',
    address: 'Hospital Road, Sub-Division HQ',
    doctorAvailable: true,
    timings: '24x7 Emergency / OPD 9 AM - 4 PM',
  },
  {
    id: 'subcentre-wada',
    name: 'Wada Sub-Health Centre (HWC)',
    type: 'Sub-Centre',
    distance: '0.6 km',
    address: 'Wada Basti, Ward 2',
    doctorAvailable: false,
    timings: 'CHO / ANM duty 9:00 AM - 1:00 PM',
  },
]

export default function Healthcare({ onNavigate }) {
  return (
    <div className="page-container healthcare-page">
      <div className="search-filter-bar">
        <input
          type="search"
          className="search-input"
          placeholder="Search by facility name, village, or service..."
        />
        <div className="filter-tags">
          <button type="button" className="filter-pill active">All (3)</button>
          <button type="button" className="filter-pill">PHC</button>
          <button type="button" className="filter-pill">CHC</button>
          <button type="button" className="filter-pill">Sub-Centre</button>
        </div>
      </div>

      <div className="facility-list">
        {SAMPLE_FACILITIES.map((fac) => (
          <FacilityCard
            key={fac.id}
            name={fac.name}
            type={fac.type}
            distance={fac.distance}
            address={fac.address}
            doctorAvailable={fac.doctorAvailable}
            timings={fac.timings}
            onSelect={() => onNavigate(SCREENS.FACILITY_DETAILS)}
          />
        ))}
      </div>
    </div>
  )
}
