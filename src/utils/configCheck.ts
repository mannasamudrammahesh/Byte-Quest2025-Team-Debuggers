// Configuration validation utility
export const checkConfiguration = () => {
  const config = {
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL,
      key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
    },
    locationiq: {
      key: import.meta.env.VITE_LOCATIONIQ_API_KEY,
    },
  };

  const issues: string[] = [];

  // Check Supabase configuration
  if (!config.supabase.url) {
    issues.push('VITE_SUPABASE_URL is not configured');
  }
  if (!config.supabase.key) {
    issues.push('VITE_SUPABASE_PUBLISHABLE_KEY is not configured');
  }
  if (!config.supabase.projectId) {
    issues.push('VITE_SUPABASE_PROJECT_ID is not configured');
  }

  // Check LocationIQ configuration
  if (!config.locationiq.key) {
    issues.push('VITE_LOCATIONIQ_API_KEY is not configured - location services will use fallback');
  }

  // Log configuration status
  if (issues.length === 0) {
    console.log('✅ All environment variables are configured');
  } else {
    console.warn('⚠️ Configuration issues found:');
    issues.forEach(issue => console.warn(`  - ${issue}`));
  }

  return {
    isValid: issues.length === 0,
    issues,
    config,
  };
};

// Auto-check configuration in development
if (import.meta.env.DEV) {
  checkConfiguration();
}