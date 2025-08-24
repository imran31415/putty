import React, { useEffect } from 'react';
import MainLayout from './src/components/Layout/MainLayout';
import { usePuttStore } from './src/store/puttStore';
import { analytics } from './src/services/analytics';

export default function App() {
  const { puttData, setPuttData } = usePuttStore();

  // Initialize analytics on app start
  useEffect(() => {
    analytics.initialize();
  }, []);

  return (
    <MainLayout 
      puttData={puttData} 
      onPuttDataChange={setPuttData}
    />
  );
}
