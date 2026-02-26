import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface PagerDutyEvent {
  routing_key: string;
  event_action: 'trigger' | 'acknowledge' | 'resolve';
  payload: {
    summary: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    source: string;
    custom_details?: any;
  };
}

@Injectable()
export class PagerDutyService {
  private readonly apiUrl = 'https://events.pagerduty.com/v2/enqueue';
  private readonly routingKey = process.env.PAGERDUTY_ROUTING_KEY;

  async sendAlert(
    summary: string,
    severity: 'critical' | 'error' | 'warning' | 'info',
    details?: any,
  ) {
    if (!this.routingKey) {
      console.warn('PagerDuty routing key not configured');
      return;
    }

    const event: PagerDutyEvent = {
      routing_key: this.routingKey,
      event_action: 'trigger',
      payload: {
        summary,
        severity,
        source: 'tiptune-backend',
        custom_details: details,
      },
    };

    try {
      await axios.post(this.apiUrl, event);
    } catch (error) {
      console.error('Failed to send PagerDuty alert:', error.message);
    }
  }

  async resolveAlert(dedupKey: string) {
    if (!this.routingKey) return;

    try {
      await axios.post(this.apiUrl, {
        routing_key: this.routingKey,
        event_action: 'resolve',
        dedup_key: dedupKey,
      });
    } catch (error) {
      console.error('Failed to resolve PagerDuty alert:', error.message);
    }
  }
}
