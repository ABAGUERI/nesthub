import React, { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { useClientConfig } from '@/shared/hooks/useClientConfig';

export const WeatherTab: React.FC = () => {
  const { config, updateConfig, loading } = useClientConfig();
  const [postalCode, setPostalCode] = useState(config?.weatherPostalCode || '');
  const [city, setCity] = useState(config?.weatherCity || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    setPostalCode(config?.weatherPostalCode || '');
    setCity(config?.weatherCity || '');
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateConfig({
        weatherPostalCode: postalCode.trim(),
        weatherCity: city.trim(),
      });
      setSuccess('Préférences météo enregistrées.');
    } catch (err: any) {
      setError(err.message || 'Impossible de sauvegarder les préférences météo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="config-tab-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Météo</p>
          <h2>Localisation</h2>
          <p className="panel-subtitle">Ajustez le code postal et la ville utilisés par le widget météo.</p>
        </div>
      </div>

      {error && <div className="config-alert error">{error}</div>}
      {success && <div className="config-alert success">{success}</div>}

      <div className="config-card">
        <div className="config-card-header">
          <div>
            <h3>Code postal & ville</h3>
            <p>Conserve la palette sombre et neon du dashboard.</p>
          </div>
        </div>

        <div className="weather-form">
          <Input
            label="Code postal"
            placeholder="Ex: H2X 1Y4"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            disabled={loading}
          />
          <Input
            label="Ville"
            placeholder="Ex: Montréal"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="config-actions">
          <Button
            onClick={handleSave}
            isLoading={saving}
            disabled={saving || loading || (!postalCode.trim() && !city.trim())}
            fullWidth
            size="large"
          >
            Mettre à jour la météo
          </Button>
        </div>
      </div>
    </div>
  );
};
