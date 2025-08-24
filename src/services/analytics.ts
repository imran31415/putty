import { Platform } from 'react-native';
import Plausible from 'plausible-tracker';

// Initialize Plausible tracker
const plausible = Plausible({
  domain: 'putty.scalebase.io',
  trackLocalhost: false, // Set to true for local development testing
  apiHost: 'https://plausible.io',
});

// Analytics service
export class AnalyticsService {
  private static instance: AnalyticsService;
  private isInitialized = false;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  initialize() {
    if (this.isInitialized) return;

    // Only initialize on web platform for now
    if (Platform.OS === 'web') {
      try {
        // Enable auto page views
        plausible.enableAutoPageviews();
        this.isInitialized = true;
        console.log('Plausible Analytics initialized');
      } catch (error) {
        console.warn('Failed to initialize Plausible Analytics:', error);
      }
    }
  }

  // Track page views
  trackPageView(pageName?: string, props?: Record<string, any>) {
    if (!this.isInitialized || Platform.OS !== 'web') return;

    try {
      plausible.trackPageview({
        url: pageName ? `/${pageName}` : undefined,
        ...props,
      });
    } catch (error) {
      console.warn('Failed to track page view:', error);
    }
  }

  // Track custom events
  trackEvent(eventName: string, props?: Record<string, any>) {
    if (!this.isInitialized || Platform.OS !== 'web') return;

    try {
      plausible.trackEvent(eventName, { props });
    } catch (error) {
      console.warn('Failed to track event:', error);
    }
  }

  // Specific events for the putting app
  trackPuttAttempt(data: {
    distance: number;
    breakPercent: number;
    slope: number;
    power: number;
    success: boolean;
  }) {
    this.trackEvent('Putt Attempt', {
      distance: data.distance.toString(),
      break_percent: data.breakPercent.toString(),
      slope: data.slope.toString(),
      power: data.power.toFixed(1),
      success: data.success.toString(),
      distance_range: this.getDistanceRange(data.distance),
    });
  }

  trackControlAdjustment(control: string, value: string | number) {
    this.trackEvent('Control Adjustment', {
      control,
      value: value.toString(),
    });
  }

  trackBallInteraction(action: 'select' | 'drag' | 'deselect') {
    this.trackEvent('Ball Interaction', {
      action,
    });
  }

  trackCameraMovement() {
    this.trackEvent('Camera Movement');
  }

  track3DInteraction(type: 'zoom' | 'rotate' | 'pan') {
    this.trackEvent('3D Interaction', {
      type,
    });
  }

  // Helper methods
  private getDistanceRange(distance: number): string {
    if (distance <= 5) return '0-5ft';
    if (distance <= 10) return '6-10ft';
    if (distance <= 15) return '11-15ft';
    if (distance <= 20) return '16-20ft';
    if (distance <= 25) return '21-25ft';
    return '25ft+';
  }
}

// Export singleton instance
export const analytics = AnalyticsService.getInstance();