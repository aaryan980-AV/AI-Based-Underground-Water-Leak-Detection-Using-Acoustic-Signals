/**
 * BMC Mumbai Water Distribution Network - Arterial Pipeline Topology (Graph)
 * Represents the primary water transmission mains connecting reservoirs,
 * treatment facilities, and distribution hubs across Mumbai.
 */

export const MUMBAI_PIPELINE_GRAPH = [
  {
    id: 'PIPE-01',
    name: 'Bhandup-Powai Twin 2400mm Steel Aqueduct',
    from: 'S-01', // Bhandup Treatment Complex
    to: 'S-02',   // Powai Lake Conduit
    coords: [
      [19.1438, 72.9372],
      [19.1350, 72.9220],
      [19.1250, 72.9050]
    ],
    diameterMm: 2400,
    material: 'Mild Steel (MS)',
    flowMld: 450,
    nominalPressureBar: 5.2
  },
  {
    id: 'PIPE-02',
    name: 'Powai-Ghatkopar High Pressure Conduit',
    from: 'S-02', // Powai Lake Conduit
    to: 'S-11',   // Ghatkopar Reservoir Feeder
    coords: [
      [19.1250, 72.9050],
      [19.1050, 72.9110],
      [19.0880, 72.9150]
    ],
    diameterMm: 1800,
    material: 'Pre-Stressed Concrete (PSC)',
    flowMld: 280,
    nominalPressureBar: 4.8
  },
  {
    id: 'PIPE-03',
    name: 'Powai-Kurla Central Transmission Main',
    from: 'S-02', // Powai Lake Conduit
    to: 'S-09',   // Kurla West - LBS Marg Feeder
    coords: [
      [19.1250, 72.9050],
      [19.0980, 72.8920],
      [19.0710, 72.8800]
    ],
    diameterMm: 1800,
    material: 'Ductile Iron (DI)',
    flowMld: 320,
    nominalPressureBar: 4.5
  },
  {
    id: 'PIPE-04',
    name: 'Kurla-BKC Hydro Interconnect Trunk',
    from: 'S-09', // Kurla West
    to: 'S-03',   // BKC Hydro Hub
    coords: [
      [19.0710, 72.8800],
      [19.0680, 72.8730],
      [19.0660, 72.8685]
    ],
    diameterMm: 1500,
    material: 'Mild Steel (MS)',
    flowMld: 210,
    nominalPressureBar: 4.2
  },
  {
    id: 'PIPE-05',
    name: 'Powai-Andheri Western Arterial Express Loop',
    from: 'S-02', // Powai Lake Conduit
    to: 'S-07',   // Andheri West Link Road
    coords: [
      [19.1250, 72.9050],
      [19.1290, 72.8650],
      [19.1360, 72.8290]
    ],
    diameterMm: 1500,
    material: 'Mild Steel (MS)',
    flowMld: 240,
    nominalPressureBar: 4.1
  },
  {
    id: 'PIPE-06',
    name: 'Andheri-BKC Coastal Distribution Loop',
    from: 'S-07', // Andheri West
    to: 'S-03',   // BKC Hydro Hub
    coords: [
      [19.1360, 72.8290],
      [19.0950, 72.8390],
      [19.0660, 72.8685]
    ],
    diameterMm: 1200,
    material: 'Ductile Iron (DI)',
    flowMld: 180,
    nominalPressureBar: 3.9
  },
  {
    id: 'PIPE-07',
    name: 'BKC-Dharavi Mithi Crossing Sub-Surface Trunk',
    from: 'S-03', // BKC Hydro Hub
    to: 'S-08',   // Dharavi 90-Feet Road
    coords: [
      [19.0660, 72.8685],
      [19.0540, 72.8610],
      [19.0430, 72.8550]
    ],
    diameterMm: 1800,
    material: 'Sub-Aqueous Mild Steel',
    flowMld: 350,
    nominalPressureBar: 4.0
  },
  {
    id: 'PIPE-08',
    name: 'Dharavi-Dadar TT City Arterial Main',
    from: 'S-08', // Dharavi
    to: 'S-04',   // Dadar TT Circle
    coords: [
      [19.0430, 72.8550],
      [19.0300, 72.8510],
      [19.0178, 72.8478]
    ],
    diameterMm: 1800,
    material: 'Mild Steel (MS)',
    flowMld: 310,
    nominalPressureBar: 3.8
  },
  {
    id: 'PIPE-09',
    name: 'Dadar-Worli Sea Face Coastal Branch',
    from: 'S-04', // Dadar TT
    to: 'S-06',   // Worli Sea Face Main Valve
    coords: [
      [19.0178, 72.8478],
      [19.0150, 72.8280],
      [19.0125, 72.8150]
    ],
    diameterMm: 1200,
    material: 'Ductile Iron (DI)',
    flowMld: 150,
    nominalPressureBar: 3.6
  },
  {
    id: 'PIPE-10',
    name: 'Dadar-Malabar Hill South Ridge Aqueduct',
    from: 'S-04', // Dadar TT
    to: 'S-10',   // Malabar Hill Reservoir
    coords: [
      [19.0178, 72.8478],
      [18.9850, 72.8220],
      [18.9540, 72.8050]
    ],
    diameterMm: 1500,
    material: 'Reinforced Concrete / Steel',
    flowMld: 260,
    nominalPressureBar: 4.4
  },
  {
    id: 'PIPE-11',
    name: 'Malabar Hill-Marine Drive Gravity Feeder',
    from: 'S-10', // Malabar Hill Reservoir
    to: 'S-05',   // Marine Drive Coastal Feeder
    coords: [
      [18.9540, 72.8050],
      [18.9480, 72.8160],
      [18.9430, 72.8235]
    ],
    diameterMm: 1000,
    material: 'Cast Iron (CI) / DI',
    flowMld: 140,
    nominalPressureBar: 3.4
  },
  {
    id: 'PIPE-12',
    name: 'Marine Drive-Colaba Causeway Terminal Feeder',
    from: 'S-05', // Marine Drive Coastal Feeder
    to: 'S-12',   // Colaba Causeway Terminal
    coords: [
      [18.9430, 72.8235],
      [18.9250, 72.8270],
      [18.9100, 72.8250]
    ],
    diameterMm: 900,
    material: 'Ductile Iron (DI)',
    flowMld: 110,
    nominalPressureBar: 3.2
  }
];
