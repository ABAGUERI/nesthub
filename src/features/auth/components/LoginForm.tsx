import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import './AuthForms.css';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation basique
    if (!formData.email || !formData.password) {
      setErrors({ submit: 'Veuillez remplir tous les champs' });
      return;
    }

    setIsLoading(true);
    try {
      await signIn(formData.email, formData.password);
      navigate('/dashboard');
    } catch (error: any) {
      setErrors({ submit: 'Email ou mot de passe incorrect' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (errors.submit) {
      setErrors({});
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Connexion</h1>
          <p className="auth-subtitle">
            Bon retour sur Hub Familial 2.0
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <Input
            label="Adresse courriel"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="ahmed@example.com"
            leftIcon={<span>📧</span>}
          />

          <Input
            label="Mot de passe"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            leftIcon={<span>🔒</span>}
          />

          {errors.submit && (
            <div className="error-message">{errors.submit}</div>
          )}

          <Button
            type="submit"
            fullWidth
            isLoading={isLoading}
            size="large"
          >
            Se connecter
          </Button>

          <div className="auth-footer">
            <p>
              Pas encore de compte?{' '}
              <a href="/signup" className="auth-link">
                Créer un compte
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
