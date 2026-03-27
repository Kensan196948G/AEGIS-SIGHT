import { describe, it, expect } from 'vitest';

describe('Chart Components', () => {
  describe('LineChart', () => {
    it('should export LineChart component', async () => {
      const mod = await import('../components/charts/line-chart');
      expect(mod).toBeDefined();
    });
  });

  describe('PieChart', () => {
    it('should export PieChart component', async () => {
      const mod = await import('../components/charts/pie-chart');
      expect(mod).toBeDefined();
    });
  });

  describe('AreaChart', () => {
    it('should export AreaChart component', async () => {
      const mod = await import('../components/charts/area-chart');
      expect(mod).toBeDefined();
    });
  });

  describe('Sparkline', () => {
    it('should export Sparkline component', async () => {
      const mod = await import('../components/charts/sparkline');
      expect(mod).toBeDefined();
    });
  });
});

describe('Widget Components', () => {
  describe('DeviceStatusWidget', () => {
    it('should export DeviceStatusWidget', async () => {
      const mod = await import('../components/widgets/device-status-widget');
      expect(mod).toBeDefined();
    });
  });

  describe('LicenseComplianceWidget', () => {
    it('should export LicenseComplianceWidget', async () => {
      const mod = await import('../components/widgets/license-compliance-widget');
      expect(mod).toBeDefined();
    });
  });

  describe('SecurityScoreWidget', () => {
    it('should export SecurityScoreWidget', async () => {
      const mod = await import('../components/widgets/security-score-widget');
      expect(mod).toBeDefined();
    });
  });

  describe('ActivityFeedWidget', () => {
    it('should export ActivityFeedWidget', async () => {
      const mod = await import('../components/widgets/activity-feed-widget');
      expect(mod).toBeDefined();
    });
  });

  describe('ProcurementSummaryWidget', () => {
    it('should export ProcurementSummaryWidget', async () => {
      const mod = await import('../components/widgets/procurement-summary-widget');
      expect(mod).toBeDefined();
    });
  });
});
