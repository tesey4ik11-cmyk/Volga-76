export type ServiceCategory = 'house' | 'pool' | 'deck' | 'pile' | 'net' | 'finish';

export interface EstimateRow {
  name: string;
  note: string;
  cost: number;
  kind: 'w' | 'm' | 'h'; // w: работы, m: материалы, h: заголовок группы
}

export interface EstimateCalculation {
  title: string;
  subtitle: string;
  totalCost: number;
  workCost: number;
  materialCost: number;
  rows: EstimateRow[];
}

export type EstimateResult = EstimateCalculation;

export interface ConfiguratorState {
  category: ServiceCategory;
  // House
  houseArea: number;
  houseKit: 'frame' | 'turnkey'; // 16000 vs 24000
  houseMaterial: 'wood' | 'metal'; // 1.0 vs 1.15
  houseFund: boolean;
  houseCrane: boolean;
  houseMatInclude: boolean;

  // Pool
  poolPavilion: 'none' | 'poly' | 'slide'; // 0, 180000, 320000
  poolPipe: boolean;
  poolTech: boolean;
  poolDeck: boolean;

  // Deck
  deckArea: number;
  deckLayout: 'straight' | 'diag'; // 1000 vs 1300
  deckSteps: number;
  deckPiles: boolean;
  deckRail: boolean;

  // Piles
  pileCount: number;
  pileDia: '76' | '89' | '108' | '133'; // 1100, 1350, 1600, 2100
  pileRostverk: boolean;
  pileFill: boolean;

  // Nets
  netLength: number;
  netType: 'both' | 'k1' | 'water' | 'heating' | 'storm';
  netDeep: boolean; // 1.7m vs 1.2m
  netWells: number;
  netHasWells: boolean;
  netWellsCount: number;
  netHeating: boolean;
  netHeatingLength: number;
  netHeatingChambers: boolean;
  netHeatingChambersCount: number;
  netStorm: boolean;
  netStormLength: number;
  netStormInlets: boolean;
  netStormInletsCount: number;

  // Finish
  finishArea: number;
  finishLevel: 'base' | 'full'; // 4500 vs 9000
  finishFloor: boolean;
  finishWarm: boolean;
  finishElectric: boolean;
}

export interface ProjectPassport {
  id: string;
  code: string; // e.g. VGS-026
  title: string;
  region: string;
  district: string;
  type: string;
  area: string;
  foundation: string;
  materials: string;
  duration: string;
  year: number;
  status: 'ЗАВЕРШЁН' | 'В РАБОТЕ';
  mainImage: string;
  gallery: string[];
  specs: { label: string; value: string }[];
  description: string;
}

export interface LiveConstructionItem {
  id: string;
  code: string;
  title: string;
  location: string;
  progress: number;
  currentStage: string;
  stages: { name: string; completed: boolean; current?: boolean }[];
  images: { url: string; caption: string; date: string }[];
  lastUpdate: string;
  nextStep: string;
  specsSummary: string;
}

export interface YaroslavlPoint {
  id: string;
  name: string;
  x: number; // percentage on map
  y: number;
  projectsCount: number;
  recentProjects: string[];
  featuredProjectCode?: string;
}

export interface ReviewItem {
  name: string;
  place: string;
  service: string;
  rating: number;
  text: string;
  created_at: string;
}
