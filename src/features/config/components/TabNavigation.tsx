interface TabNavigationProps<T extends string> {
  tabs: Array<{ id: T; label: string; description?: string; icon?: string }>;
  activeTab: T;
  onTabChange: (tab: T) => void;
}

export const TabNavigation = <T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: TabNavigationProps<T>) => {
  return (
    <div className="config-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`config-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <div className="tab-icon">{tab.icon}</div>
          <div>
            <div className="tab-label">{tab.label}</div>
            {tab.description && <div className="tab-description">{tab.description}</div>}
          </div>
        </button>
      ))}
    </div>
  );
};
