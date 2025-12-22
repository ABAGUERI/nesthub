import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import './AuthForms.css';

export const SignupForm: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    city: '',
    postalCode: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Le nom est requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'La ville est requise';
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Le code postal est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await signUp(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        city: formData.city,
        postalCode: formData.postalCode,
      });
      
      // Rediriger vers la page de vérification email
      navigate('/verify-email');
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Effacer l'erreur du champ modifié
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: '',
      });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Créer un compte</h1>
          <p className="auth-subtitle">
            Bienvenue sur Hub Familial 2.0
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <Input
              label="Prénom"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              error={errors.firstName}
              placeholder="Ahmed"
            />

            <Input
              label="Nom"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              error={errors.lastName}
              placeholder="Dubois"
            />
          </div>

          <Input
            label="Adresse courriel"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="ahmed@example.com"
            leftIcon={<span>📧</span>}
          />

          <div className="form-row">
            <Input
              label="Ville"
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              error={errors.city}
              placeholder="Montréal"
            />

            <Input
              label="Code postal"
              name="postalCode"
              type="text"
              value={formData.postalCode}
              onChange={handleChange}
              error={errors.postalCode}
              placeholder="H2X 1Y4"
            />
          </div>

          <Input
            label="Mot de passe"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            placeholder="••••••••"
            leftIcon={<span>🔒</span>}
          />

          <Input
            label="Confirmer le mot de passe"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
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
            Créer mon compte
          </Button>

          <div className="auth-footer">
            <p>
              Vous avez déjà un compte?{' '}
              <a href="/login" className="auth-link">
                Se connecter
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
