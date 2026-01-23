import React from 'react';
import { Button } from '@/shared/components/Button';
import { initiateGoogleOAuth } from '@/features/google/google.service';
import './GoogleConnectPanel.css';

type GoogleConnectPanelProps = {
  title: string;
  description?: string;
  ctaLabel?: string;
};

export const GoogleConnectPanel: React.FC<GoogleConnectPanelProps> = ({
  title,
  description,
  ctaLabel = 'Connecter Google',
}) => {
  return (
    <div className="google-connect-panel" role="status">
      <div className="google-connect-content">
        <div className="google-connect-title">{title}</div>
        {description && <p className="google-connect-description">{description}</p>}
      </div>
      <Button onClick={initiateGoogleOAuth} size="large">
        {ctaLabel}
      </Button>
    </div>
  );
};
