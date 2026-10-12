/**
 * Curated Indian States, Union Territories, and primary Cities/Districts
 * Used for cascading dropdown selection in PETLY structured location flow.
 */

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export const STATE_CITIES_MAP = {
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool',
    'Rajahmundry', 'Tirupati', 'Kakinada', 'Kadapa', 'Anantapur',
    'Eluru', 'Vizianagaram', 'Ongole', 'Nandyal', 'Machilipatnam',
  ],
  'Arunachal Pradesh': [
    'Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Bomdila',
  ],
  'Assam': [
    'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon',
    'Tinsukia', 'Tezpur', 'Bongaigaon', 'Karimganj', 'Sivasagar',
  ],
  'Bihar': [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia',
    'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar',
  ],
  'Chhattisgarh': [
    'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Rajnandgaon',
    'Durg', 'Jagdalpur', 'Ambikapur', 'Raigarh',
  ],
  'Goa': [
    'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda',
  ],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar',
    'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Navsari',
    'Morbi', 'Bharuch', 'Porbandar', 'Mehsana', 'Vapi',
  ],
  'Haryana': [
    'Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar',
    'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula',
  ],
  'Himachal Pradesh': [
    'Shimla', 'Dharamshala', 'Mandi', 'Solan', 'Kullu', 'Manali', 'Hamirpur',
  ],
  'Jharkhand': [
    'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar',
    'Hazaribagh', 'Giridih', 'Ramgarh',
  ],
  'Karnataka': [
    'Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Dharwad',
    'Belagavi', 'Kalaburagi', 'Ballari', 'Vijayapura', 'Shivamogga',
    'Tumakuru', 'Davangere', 'Udupi', 'Bidar', 'Hassan',
  ],
  'Kerala': [
    'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kollam', 'Thrissur',
    'Kannur', 'Alappuzha', 'Kottayam', 'Palakkad', 'Malappuram',
  ],
  'Madhya Pradesh': [
    'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain',
    'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa',
  ],
  'Maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik',
    'Chhatrapati Sambhajinagar', 'Navi Mumbai', 'Solapur', 'Kolhapur', 'Amravati',
    'Nanded', 'Sangli', 'Jalgaon', 'Akola', 'Latur',
  ],
  'Manipur': [
    'Imphal', 'Churachandpur', 'Thoubal', 'Bishnupur',
  ],
  'Meghalaya': [
    'Shillong', 'Tura', 'Jowai', 'Nongpoh',
  ],
  'Mizoram': [
    'Aizawl', 'Lunglei', 'Champhai', 'Serchhip',
  ],
  'Nagaland': [
    'Kohima', 'Dimapur', 'Mokokchung', 'Tuensang',
  ],
  'Odisha': [
    'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur',
    'Puri', 'Balasore', 'Bhadrak', 'Baripada',
  ],
  'Punjab': [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda',
    'Mohali', 'Hoshiarpur', 'Batala', 'Pathankot', 'Moga',
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer',
    'Udaipur', 'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar',
  ],
  'Sikkim': [
    'Gangtok', 'Namchi', 'Gyalshing', 'Mangan',
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
    'Tirunelveli', 'Tiruppur', 'Ranipet', 'Nagercoil', 'Thanjavur',
    'Vellore', 'Kancheepuram', 'Erode', 'Dindigul', 'Cuddalore',
  ],
  'Telangana': [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar',
    'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Siddipet',
  ],
  'Tripura': [
    'Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar',
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi',
    'Meerut', 'Prayagraj', 'Noida', 'Bareilly', 'Aligarh',
    'Moradabad', 'Saharanpur', 'Gorakhpur', 'Ayodhya', 'Jhansi',
  ],
  'Uttarakhand': [
    'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh', 'Nainital',
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol',
    'Bardhaman', 'Malda', 'Kharagpur', 'Haldia', 'Darjeeling',
  ],
  // Union Territories
  'Andaman and Nicobar Islands': ['Port Blair', 'Diglipur', 'Mayabunder'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur'],
  'Ladakh': ['Leh', 'Kargil'],
  'Lakshadweep': ['Kavaratti', 'Agatti', 'Andrott'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
};

/**
 * Check if the selected state matches or is geographically compatible with the postal API state.
 */
export const isStateCompatible = (selectedState, postalState) => {
  if (!selectedState || !postalState) return false;
  const s1 = selectedState.toLowerCase().replace(/[^a-z]/g, '');
  const s2 = postalState.toLowerCase().replace(/[^a-z]/g, '');
  return s1 === s2 || s1.includes(s2) || s2.includes(s1);
};

/**
 * Check if the selected city is consistent with the postal information (District/Division/Circle/Name).
 */
export const isCityCompatible = (selectedCity, postalData) => {
  if (!selectedCity || !postalData) return false;
  const cleanCity = selectedCity.toLowerCase().replace(/[^a-z]/g, '');

  const district = (postalData.district || '').toLowerCase().replace(/[^a-z]/g, '');
  const division = (postalData.division || '').toLowerCase().replace(/[^a-z]/g, '');
  const region = (postalData.region || '').toLowerCase().replace(/[^a-z]/g, '');

  // Direct match or partial match on District/Division/Region
  if (district.includes(cleanCity) || cleanCity.includes(district)) return true;
  if (division.includes(cleanCity) || cleanCity.includes(division)) return true;
  if (region.includes(cleanCity) || cleanCity.includes(region)) return true;

  // Check against Post Office names
  if (Array.isArray(postalData.areas)) {
    const matchedArea = postalData.areas.some((area) => {
      const cleanArea = area.toLowerCase().replace(/[^a-z]/g, '');
      return cleanArea.includes(cleanCity) || cleanCity.includes(cleanArea);
    });
    if (matchedArea) return true;
  }

  // Common aliases (e.g., Bengaluru vs Bangalore, Mumbai vs Bombay, Chennai vs Madras, Kolkata vs Calcutta)
  const ALIASES = {
    bengaluru: ['bangalore'],
    bangalore: ['bengaluru'],
    mumbai: ['bombay'],
    bombay: ['mumbai'],
    chennai: ['madras'],
    madras: ['chennai'],
    kolkata: ['calcutta'],
    calcutta: ['kolkata'],
    gurugram: ['gurgaon'],
    gurgaon: ['gurugram'],
    prayagraj: ['allahabad'],
    allahabad: ['prayagraj'],
    ayodhya: ['faizabad'],
    faizabad: ['ayodhya'],
    chhatrapatisambhajinagar: ['aurangabad'],
    aurangabad: ['chhatrapatisambhajinagar'],
    mysuru: ['mysore'],
    mysore: ['mysuru'],
    mangaluru: ['mangalore'],
    mangalore: ['mangaluru'],
    belagavi: ['belgaum'],
    belgaum: ['belagavi'],
    hubballi: ['hubli'],
    hubli: ['hubballi'],
    kalaburagi: ['gulbarga'],
    gulbarga: ['kalaburagi'],
    vijayapura: ['bijapur'],
    bijapur: ['vijayapura'],
    shivamogga: ['shimoga'],
    shimoga: ['shivamogga'],
    puducherry: ['pondicherry'],
    pondicherry: ['puducherry'],
  };

  const aliases = ALIASES[cleanCity] || [];
  return aliases.some((alias) => district.includes(alias) || division.includes(alias) || region.includes(alias));
};
