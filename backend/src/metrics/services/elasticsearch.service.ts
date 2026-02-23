import { Injectable } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class ElasticsearchService {
  private client: Client;

  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_AUTH ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
      } : undefined,
    });
  }

  async indexLog(log: any) {
    try {
      await this.client.index({
        index: 'tiptune-logs',
        document: {
          ...log,
          '@timestamp': new Date(),
        },
      });
    } catch (error) {
      // Silently fail - Elasticsearch is optional
    }
  }

  async search(query: string, from = 0, size = 100) {
    return this.client.search({
      index: 'tiptune-logs',
      from,
      size,
      query: {
        multi_match: {
          query,
          fields: ['message', 'context', 'error'],
        },
      },
      sort: [{ '@timestamp': 'desc' }],
    });
  }

  async getLogsByLevel(level: string, from = 0, size = 100) {
    return this.client.search({
      index: 'tiptune-logs',
      from,
      size,
      query: { match: { level } },
      sort: [{ '@timestamp': 'desc' }],
    });
  }

  async getLogsByTimeRange(startTime: Date, endTime: Date) {
    return this.client.search({
      index: 'tiptune-logs',
      query: {
        range: {
          '@timestamp': {
            gte: startTime.toISOString(),
            lte: endTime.toISOString(),
          },
        },
      },
      sort: [{ '@timestamp': 'desc' }],
    });
  }
}
