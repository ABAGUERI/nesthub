import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { supabase } from '@/shared/utils/supabase';
import './AccountSettingsTab.css';

interface Profile {
  id: string;
  client_number: number | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  postal_code: string | null;
  has_children: boolean | null;
  trial_ends_at: string | null;
  subscription_status: string | null;
  onboarding_completed: boolean | null;
  created_at: string | null;
}

interface GoogleConnection {
  user_id: string;
  gmail_address: string | null;
  selected_calendar_id: string | null;
  selected_calendar_name: string | null;
  grocery_list_id: string | null;
  grocery_list_name: string | null;
  updated_at: string | null;
}

interface FormData {
  first_name: string;
  last_name: string;
  city: string;
  postal_code: string;
  has_children: boolean;
}

const formatClientNumber = (num: number | null): string => {
  if (num === null || num === undefined) return '—';
  return `NH-${String(num).padStart(6, '0')}`;
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const formatSubscriptionStatus = (status: string | null): string => {
  if (!status) return '—';
  const statusMap: Record<string, string> = {
    trial: 'Essai',
    active: 'Actif',
    expired: 'Expiré',
  };
  return statusMap[status] || status;
};

export const AccountSettingsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [googleConnection, setGoogleConnection] = useState<GoogleConnection | null>(null);
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    city: '',
    postal_code: '',
    has_children: false,
  });
  const [initialFormData, setInitialFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    city: '',
    postal_code: '',
    has_children: false,
  });
  const [disconnecting, setDisconnecting] = useState(false);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error('Impossible de récupérer l\'utilisateur');
      if (!user) throw new Error('Utilisateur non connecté');

      // Load profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw new Error('Erreur lors du chargement du profil');

      // If profile doesn't exist, create a minimal one
      if (!profileData) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user.id, created_at: new Date().toISOString() });

        if (insertError) throw new Error('Impossible de créer le profil');

        // Reload the profile
        const { data: newProfileData, error: reloadError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (reloadError) throw new Error('Erreur lors du rechargement du profil');
        profileData = newProfileData;
      }

      setProfile(profileData);

      // Set form data from profile
      const newFormData: FormData = {
        first_name: profileData?.first_name || '',
        last_name: profileData?.last_name || '',
        city: profileData?.city || '',
        postal_code: profileData?.postal_code || '',
        has_children: profileData?.has_children || false,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);

      // Load Google connection
      const { data: googleData, error: googleError } = await supabase
        .from('google_connections')
        .select('user_id, gmail_address, selected_calendar_id, selected_calendar_name, grocery_list_id, grocery_list_name, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (googleError && googleError.code !== 'PGRST116') {
        console.warn('Erreur lors du chargement de la connexion Google:', googleError);
      }

      setGoogleConnection(googleData || null);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: profile.id,
            first_name: formData.first_name || null,
            last_name: formData.last_name || null,
            city: formData.city || null,
            postal_code: formData.postal_code || null,
            has_children: formData.has_children,
          },
          { onConflict: 'id' }
        );

      if (updateError) throw new Error('Erreur lors de la sauvegarde');

      setInitialFormData(formData);
      setSuccess('Profil mis à jour avec succès');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleGoogleConnect = () => {
    window.location.href = '/auth/google/start';
  };

  const handleGoogleDisconnect = async () => {
    if (!profile) return;

    setDisconnecting(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('google_connections')
        .delete()
        .eq('user_id', profile.id);

      if (deleteError) throw new Error('Erreur lors de la déconnexion');

      setGoogleConnection(null);
      setSuccess('Compte Google déconnecté');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la déconnexion');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="config-tab-panel">
        <div className="account-loading">
          <div className="account-spinner" />
          <span>Chargement du compte...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="config-tab-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Compte</p>
          <h2>Informations personnelles</h2>
          <p className="panel-subtitle">
            Gérez votre profil et votre connexion Google.
          </p>
        </div>
        <Button variant="secondary" onClick={loadData} isLoading={loading}>
          Rafraîchir
        </Button>
      </div>

      {error && <div className="config-alert error">{error}</div>}
      {success && <div className="config-alert success">{success}</div>}

      <div className="account-grid">
        {/* Left Column: Profile */}
        <div className="account-column">
          <div className="config-card">
            <div className="config-card-header">
              <h3>Profil</h3>
              <p>Vos informations personnelles</p>
            </div>

            {/* Client Number - Read Only */}
            <div className="account-field-group">
              <label className="account-field-label">Numéro client</label>
              <div className="account-readonly-value account-client-number">
                {formatClientNumber(profile?.client_number ?? null)}
              </div>
            </div>

            {/* Editable Fields */}
            <div className="account-form-grid">
              <Input
                label="Prénom"
                value={formData.first_name}
                onChange={e => handleInputChange('first_name', e.target.value)}
                placeholder="Votre prénom"
              />
              <Input
                label="Nom"
                value={formData.last_name}
                onChange={e => handleInputChange('last_name', e.target.value)}
                placeholder="Votre nom"
              />
              <Input
                label="Ville"
                value={formData.city}
                onChange={e => handleInputChange('city', e.target.value)}
                placeholder="Votre ville"
              />
              <Input
                label="Code postal"
                value={formData.postal_code}
                onChange={e => handleInputChange('postal_code', e.target.value)}
                placeholder="00000"
              />
            </div>

            <div className="account-checkbox-field">
              <label className="account-checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.has_children}
                  onChange={e => handleInputChange('has_children', e.target.checked)}
                  className="account-checkbox"
                />
                <span className="account-checkbox-text">J'ai des enfants</span>
              </label>
            </div>

            <Button
              onClick={handleSave}
              disabled={!isDirty}
              isLoading={saving}
              fullWidth
            >
              Enregistrer
            </Button>
          </div>

          {/* Read-only Status Info */}
          <div className="config-card">
            <div className="config-card-header">
              <h3>Abonnement</h3>
              <p>Statut de votre compte</p>
            </div>

            <div className="account-status-grid">
              <div className="account-status-item">
                <span className="account-status-label">Statut</span>
                <span className={`account-status-value account-status-${profile?.subscription_status || 'unknown'}`}>
                  {formatSubscriptionStatus(profile?.subscription_status ?? null)}
                </span>
              </div>
              <div className="account-status-item">
                <span className="account-status-label">Fin de l'essai</span>
                <span className="account-status-value">
                  {formatDate(profile?.trial_ends_at ?? null)}
                </span>
              </div>
              <div className="account-status-item">
                <span className="account-status-label">Onboarding</span>
                <span className={`account-status-value ${profile?.onboarding_completed ? 'account-status-active' : ''}`}>
                  {profile?.onboarding_completed ? 'Terminé' : 'En cours'}
                </span>
              </div>
              <div className="account-status-item">
                <span className="account-status-label">Membre depuis</span>
                <span className="account-status-value">
                  {formatDate(profile?.created_at ?? null)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Google */}
        <div className="account-column">
          <div className="config-card">
            <div className="config-card-header">
              <h3>Connexion Google</h3>
              <p>Synchronisez votre agenda et vos tâches</p>
            </div>

            <div className="account-google-status">
              <div className="account-google-indicator">
                <div className={`account-google-dot ${googleConnection ? 'connected' : 'disconnected'}`} />
                <span className="account-google-status-text">
                  {googleConnection ? 'Connecté' : 'Non connecté'}
                </span>
              </div>
            </div>

            {googleConnection ? (
              <>
                <div className="google-connection">
                  <div className="google-row">
                    <span className="google-label">Adresse Gmail</span>
                    <span className="google-value">
                      {googleConnection.gmail_address || '—'}
                    </span>
                  </div>
                  <div className="google-row">
                    <span className="google-label">Calendrier</span>
                    <span className="google-value">
                      {googleConnection.selected_calendar_name || googleConnection.selected_calendar_id || 'Non sélectionné'}
                    </span>
                  </div>
                  <div className="google-row">
                    <span className="google-label">Liste d'épicerie</span>
                    <span className="google-value">
                      {googleConnection.grocery_list_name || googleConnection.grocery_list_id || 'Non configurée'}
                    </span>
                  </div>
                  {googleConnection.updated_at && (
                    <div className="google-row">
                      <span className="google-label">Dernière mise à jour</span>
                      <span className="google-value account-google-date">
                        {formatDate(googleConnection.updated_at)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="account-google-actions">
                  <Button onClick={handleGoogleConnect} variant="secondary" fullWidth>
                    Reconnecter
                  </Button>
                  <Button
                    onClick={handleGoogleDisconnect}
                    variant="danger"
                    isLoading={disconnecting}
                    fullWidth
                  >
                    Déconnecter
                  </Button>
                </div>
              </>
            ) : (
              <div className="account-google-empty">
                <p className="account-google-empty-text">
                  Connectez votre compte Google pour synchroniser votre agenda familial et vos listes de tâches.
                </p>
                <Button onClick={handleGoogleConnect} fullWidth size="large">
                  Connecter Google
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
