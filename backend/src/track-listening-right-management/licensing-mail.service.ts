import { Injectable, Logger } from '@nestjs/common';
import { LicenseRequest, LicenseRequestStatus } from './entities/license-request.entity';

export interface MailPayload {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class LicensingMailService {
  private readonly logger = new Logger(LicensingMailService.name);

  /**
   * Override this method (or swap with a real mailer like @nestjs-modules/mailer)
   * to send actual emails. The method is intentionally thin so it can be mocked.
   */
  protected async sendMail(payload: MailPayload): Promise<void> {
    // In production, inject MailerService here and send the email.
    this.logger.log(`[MOCK MAIL] To: ${payload.to} | ${payload.subject}`);
  }

  async notifyArtistOfNewRequest(request: LicenseRequest): Promise<void> {
    // In a real implementation you'd resolve the artist's email via UserService/TrackService.
    await this.sendMail({
      to: `artist+${request.trackId}@platform.local`,
      subject: 'New License Request for Your Track',
      body: `
        You have received a new license request.
        Track ID  : ${request.trackId}
        Requester : ${request.requesterId}
        Intended use: ${request.intendedUse}
        
        Log in to review and respond.
      `,
    });
  }

  async notifyRequesterOfResponse(request: LicenseRequest): Promise<void> {
    const statusLabel =
      request.status === LicenseRequestStatus.APPROVED ? 'approved ✅' : 'rejected ❌';

    await this.sendMail({
      to: `user+${request.requesterId}@platform.local`,
      subject: `Your License Request Has Been ${request.status === LicenseRequestStatus.APPROVED ? 'Approved' : 'Rejected'}`,
      body: `
        Your license request (ID: ${request.id}) has been ${statusLabel}.
        ${request.responseMessage ? `\nMessage from artist: ${request.responseMessage}` : ''}
        
        Track ID: ${request.trackId}
      `,
    });
  }
}
