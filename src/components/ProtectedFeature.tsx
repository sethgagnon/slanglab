import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Zap, Lock } from 'lucide-react';
import { useAccessControl, AccessControlConfig } from '@/hooks/useAccessControl';

interface ProtectedFeatureProps {
  children: React.ReactNode;
  config: AccessControlConfig;
  fallbackRoute?: string;
  showCard?: boolean;
}

export const ProtectedFeature: React.FC<ProtectedFeatureProps> = ({
  children,
  config,
  fallbackRoute = '/',
  showCard = true
}) => {
  const navigate = useNavigate();
  const { hasAccess, isLoading, denialReason } = useAccessControl(config);

  // Show loading state while checking access
  if (isLoading) {
    return showCard ? (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <Skeleton className="h-8 w-8 mx-auto mb-4 rounded" />
          <Skeleton className="h-6 w-32 mx-auto mb-2" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </CardContent>
      </Card>
    ) : (
      <div className="flex items-center justify-center p-8">
        <Skeleton className="h-32 w-full max-w-md" />
      </div>
    );
  }

  // Grant access
  if (hasAccess) {
    return <>{children}</>;
  }

  // Deny access with appropriate message
  const getAccessDenialContent = () => {
    switch (denialReason) {
      case 'authentication_required':
        return {
          icon: Lock,
          title: 'Sign In Required',
          description: 'Please sign in to access this feature.',
          actionText: 'Sign In',
          actionRoute: '/auth'
        };
      case 'labpro_required':
        return {
          icon: Zap,
          title: 'LabPro Required',
          description: 'This feature requires a LabPro subscription.',
          actionText: 'Upgrade to LabPro',
          actionRoute: '/account'
        };
      case 'admin_required':
        return {
          icon: Shield,
          title: 'Admin Access Required',
          description: 'You need administrator privileges to access this feature.',
          actionText: 'Return Home',
          actionRoute: fallbackRoute
        };
      default:
        return {
          icon: Lock,
          title: 'Access Denied',
          description: 'You do not have permission to access this feature.',
          actionText: 'Return Home',
          actionRoute: fallbackRoute
        };
    }
  };

  const { icon: Icon, title, description, actionText, actionRoute } = getAccessDenialContent();

  const content = (
    <div className="text-center p-6">
      <Icon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">{description}</p>
      <Button onClick={() => navigate(actionRoute)}>
        {actionText}
      </Button>
    </div>
  );

  return showCard ? (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-0">
        {content}
      </CardContent>
    </Card>
  ) : (
    <div className="flex items-center justify-center min-h-[400px]">
      {content}
    </div>
  );
};