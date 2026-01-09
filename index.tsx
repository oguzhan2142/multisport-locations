import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import tesislerData from './tesisler.json';

// --- Types ---
interface Facility {
  id: string;
  name: string;
  city: string;
  district: string;
  type: string;
  cardTypes: string[];
  lat: number;
  lng: number;
  address: string;
  image?: string;
}

interface FacilityWithDistance extends Facility {
  distance?: number;
}

interface UserLocation {
  lat: number;
  lng: number;
}

// --- Data Transformation ---
const REAL_DATA: Facility[] = (tesislerData as any[]).map((item) => ({
  id: item.id,
  name: item.name,
  city: item.city,
  district: item.cityDistrict,
  type: item.activityGroups?.[0]?.name || 'Diğer',
  cardTypes: item.cards || [],
  lat: item.lat,
  lng: item.lng,
  address: item.address,
  image: item.thumbnail
}));

// --- Utilities ---
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// --- Components ---

const IconMapPin = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);

const IconNavigation = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
);

const IconFilter = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);

const IconCreditCard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
);

const App = () => {
  const [facilities, setFacilities] = useState<Facility[]>(REAL_DATA);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // Filter States
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCardType, setSelectedCardType] = useState<string>('');

  // Derived Data for Dropdowns
  const cities = useMemo(() => Array.from(new Set(facilities.map(f => f.city))).sort(), [facilities]);
  
  const districts = useMemo(() => {
    if (!selectedCity) return [];
    return Array.from(new Set(facilities.filter(f => f.city === selectedCity).map(f => f.district))).sort();
  }, [selectedCity, facilities]);

  const types = useMemo(() => Array.from(new Set(facilities.map(f => f.type))).sort(), [facilities]);
  
  const allCardTypes = useMemo(() => {
    const all = new Set<string>();
    facilities.forEach(f => f.cardTypes.forEach(c => all.add(c)));
    return Array.from(all).sort();
  }, [facilities]);

  // Handlers
  const handleGetLocation = () => {
    setLocationStatus('loading');
    if (!navigator.geolocation) {
      setLocationStatus('error');
      alert('Tarayıcınız konum servisini desteklemiyor.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationStatus('success');
      },
      (error) => {
        console.error(error);
        setLocationStatus('error');
        // Don't alert immediately, just set state
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleClearFilters = () => {
    setSelectedCity('');
    setSelectedDistrict('');
    setSelectedType('');
    setSelectedCardType('');
  };

  // Filter & Sort Logic
  const filteredAndSortedFacilities: FacilityWithDistance[] = useMemo(() => {
    let result: FacilityWithDistance[] = facilities.filter(item => {
      const matchCity = selectedCity ? item.city === selectedCity : true;
      const matchDistrict = selectedDistrict ? item.district === selectedDistrict : true;
      const matchType = selectedType ? item.type === selectedType : true;
      const matchCard = selectedCardType ? item.cardTypes.includes(selectedCardType) || item.cardTypes.includes("Tümü") : true;
      
      return matchCity && matchDistrict && matchType && matchCard;
    });

    if (userLocation) {
      result = result.map(item => ({
        ...item,
        distance: calculateDistance(userLocation.lat, userLocation.lng, item.lat, item.lng)
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else {
      // Default sort by name if no location
      result = result.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    }

    return result;
  }, [facilities, selectedCity, selectedDistrict, selectedType, selectedCardType, userLocation]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <IconMapPin />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">TesisBul</h1>
          </div>
          
          <button 
            onClick={handleGetLocation}
            disabled={locationStatus === 'loading'}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              locationStatus === 'success' 
                ? 'bg-green-100 text-green-700 ring-1 ring-green-600/20' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
            }`}
          >
            {locationStatus === 'loading' ? (
              <span className="animate-pulse">Konum Alınıyor...</span>
            ) : locationStatus === 'success' ? (
              <>
                <IconNavigation />
                Konuma Göre Sıralı ({filteredAndSortedFacilities.length})
              </>
            ) : (
              <>
                <IconNavigation />
                Konumumu Kullan
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Filter Bar */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
          <div className="flex items-center gap-2 mb-4 text-slate-500 text-sm font-medium uppercase tracking-wider">
            <IconFilter />
            Filtreler
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* City Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">İl</label>
              <select 
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedDistrict(''); // Reset district when city changes
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors hover:bg-slate-100 focus:bg-white"
              >
                <option value="">Tümü</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* District Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">İlçe</label>
              <select 
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={!selectedCity}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors hover:bg-slate-100 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{selectedCity ? 'Tümü' : 'Önce İl Seçiniz'}</option>
                {districts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Type Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">Tesis Tipi</label>
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors hover:bg-slate-100 focus:bg-white"
              >
                <option value="">Tümü</option>
                {types.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Card Type Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1">Kart Tipi</label>
              <select 
                value={selectedCardType}
                onChange={(e) => setSelectedCardType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors hover:bg-slate-100 focus:bg-white"
              >
                <option value="">Tümü</option>
                {allCardTypes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          
          {(selectedCity || selectedType || selectedCardType) && (
            <div className="mt-4 flex justify-end">
              <button 
                onClick={handleClearFilters}
                className="text-sm text-red-500 hover:text-red-700 font-medium underline decoration-red-200 hover:decoration-red-500 transition-all"
              >
                Filtreleri Temizle
              </button>
            </div>
          )}
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedFacilities.length > 0 ? (
            filteredAndSortedFacilities.slice(0, 100).map((facility) => (
              <div key={facility.id} className="group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                
                {/* Card Image Area */}
                <div className="relative h-48 overflow-hidden bg-slate-200">
                  <img 
                    src={facility.image || 'https://via.placeholder.com/500?text=No+Image'}
                    alt={facility.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/500?text=No+Image';
                    }}
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-800 shadow-sm">
                    {facility.type}
                  </div>
                  {facility.distance !== undefined && (
                    <div className="absolute bottom-3 right-3 bg-blue-600/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1">
                      <IconNavigation />
                      {facility.distance.toFixed(1)} km
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                        {facility.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {facility.district}, {facility.city}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 flex-1">
                    {/* Address */}
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <div className="mt-0.5 min-w-[16px] text-slate-400">
                        <IconMapPin />
                      </div>
                      <span className="line-clamp-2">{facility.address}</span>
                    </div>

                    {/* Card Types */}
                    <div className="flex items-start gap-2 text-sm">
                      <div className="mt-0.5 min-w-[16px] text-slate-400">
                        <IconCreditCard />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {facility.cardTypes.map(card => (
                          <span key={card} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {card}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 w-full block text-center bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 font-semibold py-2.5 rounded-xl transition-all text-sm"
                  >
                    Yol Tarifi Al
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="inline-block p-4 rounded-full bg-slate-100 mb-4 text-slate-400">
                <IconFilter />
              </div>
              <h3 className="text-lg font-medium text-slate-900">Sonuç Bulunamadı</h3>
              <p className="text-slate-500 mt-2">Seçtiğiniz kriterlere uygun tesis bulunmamaktadır. <br/>Filtreleri temizleyip tekrar deneyebilirsiniz.</p>
              <button 
                onClick={handleClearFilters}
                className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-full font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                Filtreleri Temizle
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
