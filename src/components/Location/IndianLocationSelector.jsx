import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle2, AlertCircle, Loader2, Navigation } from 'lucide-react';
import { INDIAN_STATES, STATE_CITIES_MAP, isStateCompatible, isCityCompatible } from '../../data/indianStatesCities';
import { locationAPI } from '../../services/api';

/**
 * Reusable Indian Location Selector Component
 * Cascading flow: State -> City -> PIN Code -> Area / Post Office
 * With live Postal API verification and geographic consistency checks.
 */
const IndianLocationSelector = ({
  value = { state: '', city: '', pincode: '', area: '' },
  onChange,
  disabled = false,
  error: parentError = '',
}) => {
  const [state, setState] = useState(value?.state || '');
  const [city, setCity] = useState(value?.city || '');
  const [pincode, setPincode] = useState(value?.pincode || '');
  const [area, setArea] = useState(value?.area || '');

  const [availableAreas, setAvailableAreas] = useState(value?.area ? [value.area] : []);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(Boolean(value?.pincode && value?.area && value?.city && value?.state));
  const [localError, setLocalError] = useState('');

  // Synchronize incoming value changes
  useEffect(() => {
    if (value) {
      if (value.state !== undefined && value.state !== state) setState(value.state || '');
      if (value.city !== undefined && value.city !== city) setCity(value.city || '');
      if (value.pincode !== undefined && value.pincode !== pincode) setPincode(value.pincode || '');
      if (value.area !== undefined && value.area !== area) {
        setArea(value.area || '');
        if (value.area && !availableAreas.includes(value.area)) {
          setAvailableAreas((prev) => [value.area, ...prev]);
        }
      }
      if (value.pincode && value.state && value.city && value.area) {
        setIsVerified(true);
      }
    }
  }, [value]);

  const citiesForState = state ? (STATE_CITIES_MAP[state] || []) : [];

  const notifyChange = (updatedState, updatedCity, updatedPin, updatedArea, verifiedStatus) => {
    if (onChange) {
      onChange(
        {
          state: updatedState,
          city: updatedCity,
          pincode: updatedPin,
          area: updatedArea,
        },
        verifiedStatus
      );
    }
  };

  // State Change
  const handleStateChange = (e) => {
    const newState = e.target.value;
    setState(newState);
    setCity('');
    setPincode('');
    setArea('');
    setAvailableAreas([]);
    setIsVerified(false);
    setLocalError('');
    notifyChange(newState, '', '', '', false);
  };

  // City Change
  const handleCityChange = (e) => {
    const newCity = e.target.value;
    setCity(newCity);
    setPincode('');
    setArea('');
    setAvailableAreas([]);
    setIsVerified(false);
    setLocalError('');
    notifyChange(state, newCity, '', '', false);
  };

  // Verify PIN Code with Backend Postal Directory Proxy
  const verifyPin = async (pinToVerify, currentState, currentCity) => {
    if (!currentState) {
      setLocalError('Please select a State first.');
      setIsVerified(false);
      return;
    }
    if (!currentCity) {
      setLocalError('Please select a City first.');
      setIsVerified(false);
      return;
    }
    if (pinToVerify.length !== 6) {
      return;
    }

    setIsVerifying(true);
    setLocalError('');
    try {
      const response = await locationAPI.lookupPincode(pinToVerify);
      if (response && response.success) {
        // 1. Check State compatibility
        if (!isStateCompatible(currentState, response.state)) {
          setLocalError(`PIN code ${pinToVerify} belongs to ${response.state}, not ${currentState}.`);
          setIsVerified(false);
          setAvailableAreas([]);
          setArea('');
          notifyChange(currentState, currentCity, pinToVerify, '', false);
          return;
        }

        // 2. Check City / District consistency
        if (!isCityCompatible(currentCity, response)) {
          const districtInfo = response.district || response.division || 'another district';
          setLocalError(`PIN code ${pinToVerify} belongs to ${districtInfo}, which does not match ${currentCity}.`);
          setIsVerified(false);
          setAvailableAreas([]);
          setArea('');
          notifyChange(currentState, currentCity, pinToVerify, '', false);
          return;
        }

        // 3. Populate Areas / Post Offices
        const fetchedAreas = response.areas || [];
        if (fetchedAreas.length === 0) {
          setLocalError('No post offices found for this PIN code.');
          setIsVerified(false);
          return;
        }

        setAvailableAreas(fetchedAreas);
        const autoSelectedArea = fetchedAreas[0];
        setArea(autoSelectedArea);
        setIsVerified(true);
        setLocalError('');
        notifyChange(currentState, currentCity, pinToVerify, autoSelectedArea, true);
      } else {
        setLocalError(response?.message || 'Unable to verify this PIN code. Please check and try again.');
        setIsVerified(false);
        setAvailableAreas([]);
        setArea('');
        notifyChange(currentState, currentCity, pinToVerify, '', false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to verify this PIN code. Please check and try again.';
      setLocalError(msg);
      setIsVerified(false);
      setAvailableAreas([]);
      setArea('');
      notifyChange(currentState, currentCity, pinToVerify, '', false);
    } finally {
      setIsVerifying(false);
    }
  };

  // PIN Code input
  const handlePincodeChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(rawVal);
    setIsVerified(false);
    setLocalError('');
    setArea('');
    setAvailableAreas([]);
    notifyChange(state, city, rawVal, '', false);

    if (rawVal.length === 6) {
      verifyPin(rawVal, state, city);
    }
  };

  // Area select
  const handleAreaChange = (e) => {
    const newArea = e.target.value;
    setArea(newArea);
    const valid = Boolean(state && city && pincode.length === 6 && newArea && isVerified);
    notifyChange(state, city, pincode, newArea, valid);
  };

  const displayedError = localError || parentError;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. State Dropdown */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-3 block">
            State / UT <span className="text-orange-400">*</span>
          </label>
          <select
            value={state}
            onChange={handleStateChange}
            disabled={disabled}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all cursor-pointer"
          >
            <option value="" disabled className="bg-neutral-900 text-white/40">
              Select State
            </option>
            {INDIAN_STATES.map((st) => (
              <option key={st} value={st} className="bg-neutral-900 text-white">
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* 2. City Dropdown */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-3 block">
            City / District <span className="text-orange-400">*</span>
          </label>
          <select
            value={city}
            onChange={handleCityChange}
            disabled={disabled || !state}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="" disabled className="bg-neutral-900 text-white/40">
              {state ? 'Select City' : 'Choose State first'}
            </option>
            {citiesForState.map((ct) => (
              <option key={ct} value={ct} className="bg-neutral-900 text-white">
                {ct}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 3. PIN Code Input with Verification Feedback */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-3">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">
              PIN Code <span className="text-orange-400">*</span>
            </label>
            {isVerifying && (
              <span className="text-[10px] font-bold text-orange-400 flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" /> Verifying PIN...
              </span>
            )}
            {isVerified && !isVerifying && (
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={11} /> Verified PIN
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={handlePincodeChange}
              disabled={disabled || !city}
              placeholder={city ? '6-digit PIN (e.g. 560001)' : 'Select City first'}
              className={`w-full bg-white/5 border rounded-2xl py-3.5 px-4 text-sm font-bold text-white tracking-widest outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                isVerified ? 'border-emerald-500/50' : displayedError ? 'border-red-500/50' : 'border-white/10 focus:border-orange-500/50'
              }`}
            />
          </div>
        </div>

        {/* 4. Area / Post Office Selection */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-3 block">
            Area / Post Office <span className="text-orange-400">*</span>
          </label>
          <select
            value={area}
            onChange={handleAreaChange}
            disabled={disabled || !isVerified || availableAreas.length === 0}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-sm font-medium text-white outline-none focus:border-orange-500/50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="" disabled className="bg-neutral-900 text-white/40">
              {isVerified ? 'Select Area / Post Office' : 'Verified by PIN code'}
            </option>
            {availableAreas.map((ar) => (
              <option key={ar} value={ar} className="bg-neutral-900 text-white">
                {ar}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {displayedError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{displayedError}</span>
        </div>
      )}

      {/* Verified Location Summary Pill */}
      {isVerified && area && city && state && pincode && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs font-semibold text-emerald-400">
          <div className="flex items-center gap-2">
            <Navigation size={14} className="text-emerald-400" />
            <span>{area}, {city}, {state}</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-black tracking-wider">
            {pincode}
          </span>
        </div>
      )}
    </div>
  );
};

export default IndianLocationSelector;
