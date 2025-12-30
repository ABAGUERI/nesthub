// Types globaux de l'application

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  city: string;
  postalCode: string;
  hasChildren: boolean;
  trialEndsAt: string;
  subscriptionStatus: 'trial' | 'active' | 'expired';
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface Child {
  id: string;
  userId: string;
  firstName: string;
  icon: 'bee' | 'ladybug' | 'butterfly' | 'caterpillar';
  role?: 'child' | 'adult';
  createdAt: string;
}

export interface ChildProgress {
  id: string;
  childId: string;
  totalPoints: number;
  currentLevel: number;
  moneyBalance: number;
  badgesEarned: string[];
  totalTasksCompleted: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientConfig {
  userId: string;
  
  // Modules activés
  moduleCalendar: boolean;
  moduleTasks: boolean;
  moduleWeather: boolean;
  moduleStocks: boolean;
  moduleVehicle: boolean;
  modulePhotos: boolean;
  moduleChildrenRewards: boolean;
  moduleScreenTime: boolean;
  
  // Config météo
  weatherCity: string;
  weatherPostalCode: string;
  
  // Config rotation des tâches
  rotationResetDay: number; // 0=Dimanche, 1=Lundi, 2=Mardi, etc.
  
  // Config récompenses
  rewardSystem: 'points' | 'money' | 'hybrid' | 'none';
  rewardPointsToMoneyRate: number;
  rewardEnableLevels: boolean;
  rewardEnableBadges: boolean;
  rewardLevelsEnabled: boolean;
  rewardAutoConvertPoints: boolean;
  
  // Config temps d'écran
  screenTimeMode: 'manual' | 'semi-auto' | 'disabled';
  screenTimeDefaultAllowance: number;
  screenTimeUseLives: boolean;
  
  // Config ticker boursier
  stockSymbols: string[];
  stockRefreshInterval: number;
  
  // Config véhicule
  vehicleBrand: string | null;
  vehicleApiConfigured: boolean;
  
  // Config galerie photos
  photosSlideshowInterval: number;
  photosFolderId: string | null;
  
  // Config Google
  googleCalendarId: string | null;
  googleCalendarName: string | null;
  googleGroceryListId: string | null;
  googleGroceryListName: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface RewardLevel {
  id: string;
  userId: string;
  levelNumber: number;
  levelName: string;
  pointsMin: number;
  pointsMax: number;
  badgeIcon: 'bronze' | 'silver' | 'gold' | 'diamond';
  moneyReward: number;
  badgeColor: string;
  sortOrder: number;
  createdAt: string;
}

export interface AvailableTask {
  id: string;
  userId: string;
  name: string;
  points: number;
  moneyValue: number;
  icon: string;
  category: 'daily' | 'weekly' | 'special';
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface CompletedTask {
  id: string;
  childId: string;
  taskId: string;
  taskName: string;
  pointsEarned: number;
  moneyEarned: number;
  completedAt: string;
}

export interface ScreenTimeConfig {
  id: string;
  childId: string;
  dailyAllowance: number;
  livesEnabled: boolean;
  maxLives: number;
  minutesPerLife: number;
  penaltyOnExceed: boolean;
  createdAt: string;
}

export interface ScreenTimeSession {
  id: string;
  childId: string;
  startTime: string;
  endTime: string | null;
  minutesUsed: number;
  livesUsed: number;
  isActive: boolean;
}

export interface GoogleConnection {
  id: string;
  userId: string;
  gmailAddress: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  selectedCalendarId: string | null;
  selectedCalendarName: string | null;
  groceryListId: string | null;
  groceryListName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskList {
  id: string;
  userId: string;
  googleTaskListId: string;
  name: string;
  type: 'grocery' | 'custom';
  createdAt: string;
}

export interface OnboardingData {
  // Step 1-2: Auth (déjà dans Supabase)
  email: string;
  password: string;
  
  // Step 3-4: Profil
  firstName: string;
  lastName: string;
  city: string;
  postalCode: string;
  
  // Step 5-6: Famille
  hasChildren: boolean;
  children: Array<{ firstName: string; icon: 'bee' | 'ladybug' | 'butterfly' | 'caterpillar' }>;
  
  // Step 7: Google
  gmailAddress: string;
  selectedCalendar: { id: string; name: string } | null;
  groceryListName: string;
  customTaskLists: Array<{ name: string }>;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  color?: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: 'needsAction' | 'completed';
  parent?: string;
}

export interface WeatherData {
  temp: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

export interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdate: string;
}

export interface VehicleData {
  brand: 'tesla' | 'byd' | 'generic';
  batteryLevel: number | null;
  interiorTemp: number | null;
  exteriorTemp: number | null;
  range: number | null;
  isCharging: boolean;
  isConnected: boolean;
}