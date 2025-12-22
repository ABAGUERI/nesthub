import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/shared/utils/supabase';
import { ClientConfig } from '@/shared/types';
import { useAuth } from './useAuth';

interface ClientConfigContextType {
  config: ClientConfig | null;
  loading: boolean;
  updateConfig: (updates: Partial<ClientConfig>) => Promise<void>;
  refreshConfig: () => Promise<void>;
}

const ClientConfigContext = createContext<ClientConfigContextType | undefined>(undefined);

export const ClientConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadConfig();
    } else {
      setConfig(null);
      setLoading(false);
    }
  }, [user]);

  const loadConfig = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('client_config')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setConfig(transformConfig(data));
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<ClientConfig>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('client_config')
        .update(transformToDb(updates))
        .eq('user_id', user.id);

      if (error) throw error;

      await loadConfig();
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  };

  const refreshConfig = async () => {
    await loadConfig();
  };

  // Transformer les noms snake_case de la DB en camelCase
  const transformConfig = (data: any): ClientConfig => {
    return {
      userId: data.user_id,
      moduleCalendar: data.module_calendar,
      moduleTasks: data.module_tasks,
      moduleWeather: data.module_weather,
      moduleStocks: data.module_stocks,
      moduleVehicle: data.module_vehicle,
      modulePhotos: data.module_photos,
      moduleChildrenRewards: data.module_children_rewards,
      moduleScreenTime: data.module_screen_time,
      weatherCity: data.weather_city,
      weatherPostalCode: data.weather_postal_code,
      rewardSystem: data.reward_system,
      rewardPointsToMoneyRate: data.reward_points_to_money_rate,
      rewardEnableLevels: data.reward_enable_levels,
      rewardEnableBadges: data.reward_enable_badges,
      rewardLevelsEnabled: data.reward_levels_enabled,
      rewardAutoConvertPoints: data.reward_auto_convert_points,
      screenTimeMode: data.screen_time_mode,
      screenTimeDefaultAllowance: data.screen_time_default_allowance,
      screenTimeUseLives: data.screen_time_use_lives,
      stockSymbols: data.stock_symbols || [],
      stockRefreshInterval: data.stock_refresh_interval,
      vehicleBrand: data.vehicle_brand,
      vehicleApiConfigured: data.vehicle_api_configured,
      photosSlideshowInterval: data.photos_slideshow_interval,
      photosFolderId: data.photos_folder_id,
      googleCalendarId: data.google_calendar_id,
      googleCalendarName: data.google_calendar_name,
      googleGroceryListId: data.google_grocery_list_id,
      googleGroceryListName: data.google_grocery_list_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  };

  // Transformer camelCase en snake_case pour la DB
  const transformToDb = (data: Partial<ClientConfig>): any => {
    const dbData: any = {};
    
    if (data.moduleCalendar !== undefined) dbData.module_calendar = data.moduleCalendar;
    if (data.moduleTasks !== undefined) dbData.module_tasks = data.moduleTasks;
    if (data.moduleWeather !== undefined) dbData.module_weather = data.moduleWeather;
    if (data.moduleStocks !== undefined) dbData.module_stocks = data.moduleStocks;
    if (data.moduleVehicle !== undefined) dbData.module_vehicle = data.moduleVehicle;
    if (data.modulePhotos !== undefined) dbData.module_photos = data.modulePhotos;
    if (data.moduleChildrenRewards !== undefined) dbData.module_children_rewards = data.moduleChildrenRewards;
    if (data.moduleScreenTime !== undefined) dbData.module_screen_time = data.moduleScreenTime;
    if (data.weatherCity !== undefined) dbData.weather_city = data.weatherCity;
    if (data.weatherPostalCode !== undefined) dbData.weather_postal_code = data.weatherPostalCode;
    if (data.rewardSystem !== undefined) dbData.reward_system = data.rewardSystem;
    if (data.rewardPointsToMoneyRate !== undefined) dbData.reward_points_to_money_rate = data.rewardPointsToMoneyRate;
    if (data.rewardEnableLevels !== undefined) dbData.reward_enable_levels = data.rewardEnableLevels;
    if (data.rewardEnableBadges !== undefined) dbData.reward_enable_badges = data.rewardEnableBadges;
    if (data.rewardLevelsEnabled !== undefined) dbData.reward_levels_enabled = data.rewardLevelsEnabled;
    if (data.rewardAutoConvertPoints !== undefined) dbData.reward_auto_convert_points = data.rewardAutoConvertPoints;
    if (data.screenTimeMode !== undefined) dbData.screen_time_mode = data.screenTimeMode;
    if (data.screenTimeDefaultAllowance !== undefined) dbData.screen_time_default_allowance = data.screenTimeDefaultAllowance;
    if (data.screenTimeUseLives !== undefined) dbData.screen_time_use_lives = data.screenTimeUseLives;
    if (data.stockSymbols !== undefined) dbData.stock_symbols = data.stockSymbols;
    if (data.stockRefreshInterval !== undefined) dbData.stock_refresh_interval = data.stockRefreshInterval;
    if (data.vehicleBrand !== undefined) dbData.vehicle_brand = data.vehicleBrand;
    if (data.vehicleApiConfigured !== undefined) dbData.vehicle_api_configured = data.vehicleApiConfigured;
    if (data.photosSlideshowInterval !== undefined) dbData.photos_slideshow_interval = data.photosSlideshowInterval;
    if (data.photosFolderId !== undefined) dbData.photos_folder_id = data.photosFolderId;
    if (data.googleCalendarId !== undefined) dbData.google_calendar_id = data.googleCalendarId;
    if (data.googleCalendarName !== undefined) dbData.google_calendar_name = data.googleCalendarName;
    if (data.googleGroceryListId !== undefined) dbData.google_grocery_list_id = data.googleGroceryListId;
    if (data.googleGroceryListName !== undefined) dbData.google_grocery_list_name = data.googleGroceryListName;

    return dbData;
  };

  return (
    <ClientConfigContext.Provider
      value={{
        config,
        loading,
        updateConfig,
        refreshConfig,
      }}
    >
      {children}
    </ClientConfigContext.Provider>
  );
};

export const useClientConfig = () => {
  const context = useContext(ClientConfigContext);
  if (context === undefined) {
    throw new Error('useClientConfig must be used within a ClientConfigProvider');
  }
  return context;
};
