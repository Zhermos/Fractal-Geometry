/**
 * GIS and Geospatial Mapping Engine for Gulf of Thailand.
 * Converts Canvas Pixel Coordinates (X, Y) to True Geographic WGS84 (Lat, Lon),
 * and Performs Geodesic Nearest-Neighbor Lookup for 17 Thai Coastal Provinces & Landmarks.
 */

const GISLookup = (() => {
  // Preset GIS Bounding Boxes (WGS84 Coordinates: LatMin, LatMax, LonMin, LonMax)
  const PRESET_BOUNDS = {
    whole_gulf: {
      latMin: 6.20,
      latMax: 14.05,
      lonMin: 99.10,
      lonMax: 103.10,
      name: 'อ่าวไทยทั้งอ่าว (Entire Gulf of Thailand)'
    },
    upper_gulf: {
      latMin: 12.95,
      latMax: 13.65,
      lonMin: 99.85,
      lonMax: 101.05,
      name: 'อ่าวไทยตอนบน (Upper Gulf / Bight of Bangkok)'
    },
    eastern_gulf: {
      latMin: 11.45,
      latMax: 13.45,
      lonMin: 100.75,
      lonMax: 102.95,
      name: 'อ่าวไทยฝั่งตะวันออก (Eastern Gulf)'
    },
    western_gulf: {
      latMin: 10.90,
      latMax: 13.30,
      lonMin: 99.30,
      lonMax: 100.35,
      name: 'อ่าวไทยฝั่งตะวันตก (Western Gulf)'
    },
    southern_gulf: {
      latMin: 6.35,
      latMax: 9.60,
      lonMin: 99.55,
      lonMax: 102.25,
      name: 'อ่าวไทยฝั่งใต้ (Southern Gulf)'
    },
    chao_phraya: {
      latMin: 13.42,
      latMax: 13.62,
      lonMin: 100.48,
      lonMax: 100.68,
      name: 'ปากแม่น้ำเจ้าพระยา (Chao Phraya Estuary)'
    },
    samut_prakan: {
      latMin: 13.44,
      latMax: 13.60,
      lonMin: 100.52,
      lonMax: 100.74,
      name: 'สมุทรปราการ (Samut Prakan Coast)'
    },
    synthetic_cantor: {
      latMin: 12.50,
      latMax: 13.50,
      lonMin: 100.00,
      lonMax: 101.00,
      name: 'Synthetic Fractal Baseline'
    }
  };

  // 17 Thai Coastal Provinces & 30 Key Maritime Landmarks Database
  const COASTAL_PROVINCES = [
    {
      province: 'สมุทรปราการ',
      provinceEn: 'Samut Prakan',
      lat: 13.5350,
      lon: 100.5850,
      landmark: 'ป้อมพระจุลจอมเกล้า - ปากน้ำเจ้าพระยา',
      landmarkEn: 'Phra Chulachomklao Fort / Chao Phraya Mouth',
      region: 'อ่าวไทยตอนบน',
      dmcrRisk: 'รุนแรงมาก (> 5.0 ม./ปี)'
    },
    {
      province: 'กรุงเทพมหานคร',
      provinceEn: 'Bangkok (Bang Khun Thian)',
      lat: 13.5280,
      lon: 100.4320,
      landmark: 'ชายทะเลบางขุนเทียน - เสาโทรเลขกลางทะเล',
      landmarkEn: 'Bang Khun Thian Coastline',
      region: 'อ่าวไทยตอนบน',
      dmcrRisk: 'วิกฤตสูงสุด (3.0 - 5.5 ม./ปี)'
    },
    {
      province: 'สมุทรสาคร',
      provinceEn: 'Samut Sakhon',
      lat: 13.5180,
      lon: 100.2720,
      landmark: 'อ่าวมหาชัย - ปากน้ำท่าจีน',
      landmarkEn: 'Mahachai Bay / Tha Chin Mouth',
      region: 'อ่าวไทยตอนบน',
      dmcrRisk: 'รุนแรงมาก (4.0 - 8.0 ม./ปี)'
    },
    {
      province: 'สมุทรสงคราม',
      provinceEn: 'Samut Songkhram',
      lat: 13.3850,
      lon: 100.0050,
      landmark: 'ดอนหอยหลอด - ปากน้ำแม่กลอง',
      landmarkEn: 'Don Hoi Lot / Mae Klong Estuary',
      region: 'อ่าวไทยตอนบน',
      dmcrRisk: 'ปานกลางถึงสูง (2.0 - 4.0 ม./ปี)'
    },
    {
      province: 'ฉะเชิงเทรา',
      provinceEn: 'Chachoengsao',
      lat: 13.4820,
      lon: 100.9520,
      landmark: 'ปากน้ำบางปะกง',
      landmarkEn: 'Bang Pakong Estuary',
      region: 'อ่าวไทยตอนบน',
      dmcrRisk: 'รุนแรง (3.0 - 6.0 ม./ปี)'
    },
    {
      province: 'ชลบุรี',
      provinceEn: 'Chonburi',
      lat: 13.2920,
      lon: 100.9200,
      landmark: 'อ่างศิลา / หาดบางแสน / แหลมฉบัง',
      landmarkEn: 'Bang Saen Beach / Laem Chabang',
      region: 'อ่าวไทยฝั่งตะวันออก',
      dmcrRisk: 'ปานกลาง (1.0 - 2.5 ม./ปี)'
    },
    {
      province: 'ระยอง',
      provinceEn: 'Rayong',
      lat: 12.6720,
      lon: 101.2780,
      landmark: 'หาดแม่รำพึง / เกาะเสม็ด / แหลมแม่พิมพ์',
      landmarkEn: 'Mae Ramphueng / Ko Samet',
      region: 'อ่าวไทยฝั่งตะวันออก',
      dmcrRisk: 'ปานกลาง (1.5 - 3.0 ม./ปี)'
    },
    {
      province: 'จันทบุรี',
      provinceEn: 'Chanthaburi',
      lat: 12.5020,
      lon: 102.0520,
      landmark: 'อ่าวคุ้งกระเบน / ปากน้ำแหลมสิงห์',
      landmarkEn: 'Kung Krabaen Bay / Laem Sing',
      region: 'อ่าวไทยฝั่งตะวันออก',
      dmcrRisk: 'ต่ำถึงปานกลาง (0.8 - 2.0 ม./ปี)'
    },
    {
      province: 'ตราด',
      provinceEn: 'Trat',
      lat: 12.0120,
      lon: 102.4550,
      landmark: 'แหลมงอบ / เกาะช้าง / เกาะกูด',
      landmarkEn: 'Laem Ngop / Ko Chang / Ko Kut',
      region: 'อ่าวไทยฝั่งตะวันออก',
      dmcrRisk: 'ต่ำ (0.5 - 1.5 ม./ปี)'
    },
    {
      province: 'เพชรบุรี',
      provinceEn: 'Phetchaburi',
      lat: 13.0520,
      lon: 100.0520,
      landmark: 'แหลมผักเบี้ย / หาดเจ้าสำราญ / ชะอำ',
      landmarkEn: 'Laem Phak Bia Spit / Cha-am Beach',
      region: 'อ่าวไทยฝั่งตะวันตก',
      dmcrRisk: 'รุนแรงตามแนวสันดอน (2.0 - 4.5 ม./ปี)'
    },
    {
      province: 'ประจวบคีรีขันธ์',
      provinceEn: 'Prachuap Khiri Khan',
      lat: 11.8020,
      lon: 99.8050,
      landmark: 'หาดหัวหิน / อ่าวมะนาว / ปากน้ำปราณ',
      landmarkEn: 'Hua Hin / Ao Manao / Pranburi Mouth',
      region: 'อ่าวไทยฝั่งตะวันตก',
      dmcrRisk: 'ปานกลาง (1.0 - 2.5 ม./ปี)'
    },
    {
      province: 'ชุมพร',
      provinceEn: 'Chumphon',
      lat: 10.4520,
      lon: 99.2520,
      landmark: 'หาดทรายรี / อ่าวทุ่งวัวแล่น / ปากน้ำชุมพร',
      landmarkEn: 'Hat Sai Ri / Thung Wua Laen Bay',
      region: 'อ่าวไทยฝั่งใต้',
      dmcrRisk: 'ปานกลาง (1.0 - 2.0 ม./ปี)'
    },
    {
      province: 'สุราษฎร์ธานี',
      provinceEn: 'Surat Thani',
      lat: 9.3520,
      lon: 99.3520,
      landmark: 'อ่าวบ้านดอน / เกาะสมุย / เกาะพะงัน / ดอนสัก',
      landmarkEn: 'Bandon Bay / Ko Samui / Don Sak',
      region: 'อ่าวไทยฝั่งใต้',
      dmcrRisk: 'ปานกลางถึงสูง (2.0 - 3.5 ม./ปี)'
    },
    {
      province: 'นครศรีธรรมราช',
      provinceEn: 'Nakhon Si Thammarat',
      lat: 8.5020,
      lon: 100.1520,
      landmark: 'แหลมตะลุมพุก / อ่าวปากพนัง / ขนอม',
      landmarkEn: 'Laem Talumphuk Spit / Pak Phanang',
      region: 'อ่าวไทยฝั่งใต้',
      dmcrRisk: 'รุนแรงมากตามแนวแหลม (3.5 - 6.0 ม./ปี)'
    },
    {
      province: 'สงขลา',
      provinceEn: 'Songkhla',
      lat: 7.2020,
      lon: 100.6020,
      landmark: 'หาดสมิหลา / ปากทะเลสาบสงขลา / เก้าเส้ง',
      landmarkEn: 'Samila Beach / Songkhla Lake Mouth',
      region: 'อ่าวไทยฝั่งใต้',
      dmcrRisk: 'รุนแรง (2.5 - 4.5 ม./ปี)'
    },
    {
      province: 'ปัตตานี',
      provinceEn: 'Pattani',
      lat: 6.8820,
      lon: 101.2820,
      landmark: 'แหลมตาชี / อ่าวปัตตานี / ยะหริ่ง',
      landmarkEn: 'Laem Tachi Spit / Pattani Bay',
      region: 'อ่าวไทยฝั่งใต้',
      dmcrRisk: 'รุนแรงมาก (3.0 - 5.5 ม./ปี)'
    },
    {
      province: 'นราธิวาส',
      provinceEn: 'Narathiwat',
      lat: 6.4320,
      lon: 101.8220,
      landmark: 'หาดนราทัศน์ / ปากน้ำบางนรา / ตากใบ',
      landmarkEn: 'Narathat Beach / Tak Bai Estuary',
      region: 'อ่าวไทยฝั่งใต้',
      dmcrRisk: 'ปานกลาง (1.5 - 3.0 ม./ปี)'
    }
  ];

  // Helper: Decimal Degrees to Degrees-Minutes-Seconds (DMS)
  function toDMS(deg, isLat = true) {
    const absolute = Math.abs(deg);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);
    const direction = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
    return `${degrees}°${minutes}'${seconds}" ${direction}`;
  }

  // Helper: Haversine Great-Circle Distance (in Kilometers)
  function haversineDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371.0; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  return {
    getBounds(presetId) {
      return PRESET_BOUNDS[presetId] || PRESET_BOUNDS.whole_gulf;
    },

    /**
     * Map Canvas Pixel (px, py) to Geographic Coordinates (Lat, Lon)
     */
    pixelToGeo(px, py, width, height, presetId = 'whole_gulf') {
      const bounds = this.getBounds(presetId);
      const clampedX = Math.max(0, Math.min(width, px));
      const clampedY = Math.max(0, Math.min(height, py));

      const u = clampedX / width;
      const v = clampedY / height;

      // In map imagery, Y=0 is North (latMax), Y=height is South (latMin)
      const lat = bounds.latMax - v * (bounds.latMax - bounds.latMin);
      // X=0 is West (lonMin), X=width is East (lonMax)
      const lon = bounds.lonMin + u * (bounds.lonMax - bounds.lonMin);

      return {
        lat: Number(lat.toFixed(5)),
        lon: Number(lon.toFixed(5)),
        latDMS: toDMS(lat, true),
        lonDMS: toDMS(lon, false),
        bounds
      };
    },

    /**
     * Find the Nearest Thai Coastal Province and Maritime Landmark
     */
    findNearestProvince(lat, lon) {
      let nearest = null;
      let minDistance = Infinity;

      COASTAL_PROVINCES.forEach(p => {
        const dist = haversineDistanceKm(lat, lon, p.lat, p.lon);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = { ...p, distanceKm: Number(dist.toFixed(1)) };
        }
      });

      return nearest;
    },

    COASTAL_PROVINCES
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GISLookup;
}
