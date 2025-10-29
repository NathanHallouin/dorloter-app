/**
 * Back-office refuge : communication (campagnes email / newsletter) vers une
 * audience du refuge, avec historique. Permissions `Communications*`.
 */

import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { IsString, Length } from 'class-validator';

import { DB, type Db } from '../../infra/database/database.module';
import { EmailService } from '../../infra/email/email.service';
import { Auth, CurrentUser, type CurrentUserInfo } from '../../infra/security/auth.guard';
import { ok, type ApiResponse } from '../../shared/api-response';
import { AppError } from '../../shared/app-error';
import { CAMPAIGN_AUDIENCE, ensureValue } from '../../shared/db-enum';
import { toIso, toIsoOrNull } from '../../shared/format';
import { UserDirectory } from '../identity/identity.directory';
import { ShelterMembershipService } from './shelter-membership.service';

export class SendCampaignDto {
  @IsString({ message: 'Objet invalide.' })
  @Length(1, 255, { message: "L'objet est requis (255 caractères maximum)." })
  subject!: string;

  @IsString({ message: 'Message invalide.' })
  @Length(1, 200000, { message: 'Le message est requis.' })
  body!: string;

  @IsString({ message: 'Audience invalide.' })
  audience!: string;
}

interface EmailCampaignDto {
  id: string;
  subject: string;
  body: string;
  audience: string;
  recipientCount: number;
  sentAt: string | null;
  createdAt: string;
}

const CAMPAIGN_COLUMNS = [
  'id',
  'subject',
  'body',
  'audience',
  'recipient_count',
  'sent_at',
  'created_at',
] as const;

/** Destinataire résolu d'une campagne. */
interface Recipient {
  email: string;
  name: string | null;
}

@Controller('api/v1/shelter/communications')
export class ShelterCommunicationsController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly membership: ShelterMembershipService,
    private readonly users: UserDirectory,
    private readonly email: EmailService,
  ) {}

  @Get()
  @Auth()
  async list(@CurrentUser() current: CurrentUserInfo): Promise<ApiResponse<EmailCampaignDto[]>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'communications:read');
    const rows = await this.db
      .selectFrom('email_campaigns')
      .select(CAMPAIGN_COLUMNS)
      .where('shelter_id', '=', shelterId)
      .orderBy('created_at', 'desc')
      .limit(100)
      .execute();
    return ok(rows.map(toDto));
  }

  @Get('audiences')
  @Auth()
  async audiences(
    @CurrentUser() current: CurrentUserInfo,
  ): Promise<ApiResponse<{ benevoles: number; abonnes: number; tous: number }>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'communications:read');
    const [benevoles, abonnes, tous] = await Promise.all([
      this.recipients(shelterId, 'benevoles'),
      this.recipients(shelterId, 'abonnes'),
      this.recipients(shelterId, 'tous'),
    ]);
    return ok({ benevoles: benevoles.length, abonnes: abonnes.length, tous: tous.length });
  }

  @Post()
  @Auth()
  async send(
    @CurrentUser() current: CurrentUserInfo,
    @Body() dto: SendCampaignDto,
  ): Promise<ApiResponse<EmailCampaignDto>> {
    const shelterId = await this.membership.requireAccess(current.userId, 'communications:write');
    if (dto.subject.trim() === '') throw AppError.unprocessable("L'objet est requis.");
    if (dto.body.trim() === '') throw AppError.unprocessable('Le message est requis.');
    const audience = ensureValue(dto.audience, CAMPAIGN_AUDIENCE, 'audience');

    const recipients = await this.recipients(shelterId, audience);
    if (recipients.length === 0) {
      throw AppError.unprocessable('Aucun destinataire joignable pour cette audience.');
    }

    const shelter = await this.db
      .selectFrom('shelters')
      .select('name')
      .where('id', '=', shelterId)
      .executeTakeFirst();
    const html = render(shelter?.name ?? 'Le refuge', dto.body.trim());

    // Envoi tolérant : l'émetteur ne lève jamais (no-op loggé si SMTP non configuré).
    for (const recipient of recipients) {
      await this.email.send(recipient.email, recipient.name ?? '', dto.subject.trim(), html);
    }

    const campaign = await this.db
      .insertInto('email_campaigns')
      .values({
        shelter_id: shelterId,
        subject: dto.subject.trim(),
        body: dto.body.trim(),
        audience,
        recipient_count: recipients.length,
        sent_at: new Date(),
      })
      .returning(CAMPAIGN_COLUMNS)
      .executeTakeFirstOrThrow();
    return ok(toDto(campaign));
  }

  /** Liste dédupliquée (par email) des destinataires d'une audience. */
  private async recipients(shelterId: string, audience: string): Promise<Recipient[]> {
    const byEmail = new Map<string, Recipient>();

    if (audience === 'benevoles' || audience === 'tous') {
      const rows = await this.db
        .selectFrom('volunteers')
        .select(['email', 'name'])
        .where('shelter_id', '=', shelterId)
        .where('status', '=', 'active')
        .where('email', 'is not', null)
        .where('email', '<>', '')
        .execute();
      for (const row of rows) {
        if (row.email === null) continue;
        byEmail.set(row.email.toLowerCase(), { email: row.email, name: row.name });
      }
    }

    if (audience === 'abonnes' || audience === 'tous') {
      const followers = await this.db
        .selectFrom('shelter_follows')
        .select('user_id')
        .where('shelter_id', '=', shelterId)
        .execute();
      const refs = await this.users.findRefs(followers.map((f) => f.user_id));
      for (const ref of refs) {
        if (ref.email.trim() === '') continue;
        byEmail.set(ref.email.toLowerCase(), { email: ref.email, name: ref.name });
      }
    }

    return [...byEmail.values()];
  }
}

function toDto(row: {
  id: string;
  subject: string;
  body: string;
  audience: string;
  recipient_count: number;
  sent_at: Date | null;
  created_at: Date;
}): EmailCampaignDto {
  return {
    id: row.id,
    subject: row.subject,
    body: row.body,
    audience: row.audience,
    recipientCount: row.recipient_count,
    sentAt: toIsoOrNull(row.sent_at),
    createdAt: toIso(row.created_at),
  };
}

/** Enveloppe le message (texte du refuge) dans un email HTML simple et sûr. */
function render(shelterName: string, body: string): string {
  const safe = htmlEscape(body).replaceAll('\n', '<br>');
  const name = htmlEscape(shelterName);
  return (
    '<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1c1917;line-height:1.6">' +
    `<p style="font-size:13px;color:#78716c;margin:0 0 16px">${name} · via Dorloter</p>` +
    `<div style="font-size:15px">${safe}</div>` +
    '<hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0">' +
    `<p style="font-size:12px;color:#a8a29e">Vous recevez cet email car vous suivez ${name} ou êtes bénévole. dorloter.fr</p></div>`
  );
}

function htmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
