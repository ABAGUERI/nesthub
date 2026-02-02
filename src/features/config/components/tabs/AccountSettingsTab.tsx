import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { supabase } from '@/shared/utils/supabase';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  postal_code: string | null;
  has_children: boolean | null;
  trial_ends_at: string | null;
  subscription_status: string | null;
  onboarding_completed: boolean | null;
  created_at: string;
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

interface ProfileForm {
  first_name: string;
  last_name: string;
  city: string;
  postal_code: string;
  has_children: boolean;
}

export const AccountSettingsTab: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [googleConnection, setGoogleConnection] = useState<GoogleConnection | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    first_name: '',
    last_name: '',
    city: '',
    postal_code: '',
    has_children: false,
  });

  const [initialForm, setInitialForm] = useState<ProfileForm>({
    first_name: '',
    last_name: '',
    city: '',
    postal_code: '',
    has_children: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Utilisateur non connecté');

      setUserId(user.id);
      setUserEmail(user.email || null);

      // Load profile
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // If profile doesn't exist, create minimal one
      if (!profileData) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user.id, created_at: new Date().toISOString() })
          .select()
          .single();

        if (insertError) throw insertError;
        profileData = newProfile;
      }

      setProfile(profileData);

      const formData: ProfileForm = {
        first_name: profileData?.first_name || '',
        last_name: profileData?.last_name || '',
        city: profileData?.city || '',
        postal_code: profileData?.postal_code || '',
        has_children: profileData?.has_children || false,
      };
      setForm(formData);
      setInitialForm(formData);

      // Load Google connection
      const { data: googleData, error: googleError } = await supabase
        .from('google_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (googleError) throw googleError;
      setGoogleConnection(googleData);

    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInputChange = (field: keyof ProfileForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSuccess(null);
  };

  const handleSaveProfile = async () => {
    if (!userId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          first_name: form.first_name || null,
          last_name: form.last_name || null,
          city: form.city || null,
          postal_code: form.postal_code || null,
          has_children: form.has_children,
        }, { onConflict: 'id' });

      if (upsertError) throw upsertError;

      setInitialForm(form);
      setSuccess('Profil mis à jour avec succès');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogle = () => {
    // Redirect to existing Google OAuth route
    window.location.href = '/auth/google/start';
  };

  const handleDisconnectGoogle = async () => {
    if (!userId) return;

    setDisconnecting(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('google_connections')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

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
        <div className="config-placeholder">Chargement de votre compte...</div>
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
            Gérez vos informations de profil et votre connexion Google.
          </p>
        </div>
        <Button variant="secondary" onClick={loadData} isLoading={loading}>
          Rafraîchir
        </Button>
      </div>

      {error && <div className="config-alert error">{error}</div>}
      {success && <div className="config-alert success">{success}</div>}

      <div className="account-columns">
        {/* Profile Card */}
        <div className="config-card">
          <div className="config-card-header">
            <div>
              <h3>Profil</h3>
              <p>Vos informations personnelles et préférences.</p>
            </div>
          </div>

          <div className="account-info-row">
            <span className="account-label">Email</span>
            <span className="account-value">{userEmail || 'Non renseigné'}</span>
          </div>

          <div className="profile-form">
            <div className="profile-form-row">
              <Input
                label="Prénom"
                value={form.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="Votre prénom"
              />
              <Input
                label="Nom"
                value={form.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Votre nom"
              />
            </div>

            <div className="profile-form-row">
              <Input
                label="Ville"
                value={form.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Votre ville"
              />
              <Input
                label="Code postal"
                value={form.postal_code}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                placeholder="ex: 75001"
              />
            </div>

            <div className="checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.has_children}
                  onChange={(e) => handleInputChange('has_children', e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-text">J'ai des enfants</span>
              </label>
            </div>
          </div>

          <div className="config-actions">
            <Button
              onClick={handleSaveProfile}
              isLoading={saving}
              disabled={!isDirty || saving}
              fullWidth
              size="large"
            >
              {saving ? 'Enregistrement...' : isDirty ? 'Enregistrer les modifications' : 'Aucune modification'}
            </Button>
          </div>

          {profile?.subscription_status && (
            <div className="subscription-badge">
              <div className="subscription-dot"></div>
              <span>Abonnement : {profile.subscription_status}</span>
            </div>
          )}
        </div>

        {/* Google Card */}
        <div className="config-card">
          <div className="config-card-header">
            <div>
              <h3>Connexion Google</h3>
              <p>Synchronisez votre agenda et vos listes Google Tasks.</p>
            </div>
          </div>

          <div className="google-connection">
            <div className="google-row">
              <span className="google-label">Statut</span>
              <span className={`google-status ${googleConnection ? 'connected' : 'disconnected'}`}>
                {googleConnection ? 'Connecté' : 'Non connecté'}
              </span>
            </div>

            {googleConnection && (
              <>
                <div className="google-row">
                  <span className="google-label">Adresse Gmail</span>
                  <span className="google-value">{googleConnection.gmail_address || 'Non renseigné'}</span>
                </div>
                <div className="google-row">
                  <span className="google-label">Calendrier</span>
                  <span className="google-value">{googleConnection.selected_calendar_name || 'Non sélectionné'}</span>
                </div>
                <div className="google-row">
                  <span className="google-label">Liste épicerie</span>
                  <span className="google-value">{googleConnection.grocery_list_name || 'Non configurée'}</span>
                </div>
              </>
            )}
          </div>

          <div className="config-actions google-actions">
            <Button onClick={handleConnectGoogle} fullWidth size="large">
              {googleConnection ? 'Reconnecter Google' : 'Connecter Google'}
            </Button>
            {googleConnection && (
              <Button
                variant="danger"
                onClick={handleDisconnectGoogle}
                isLoading={disconnecting}
                fullWidth
                size="large"
              >
                Déconnecter
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
