import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

const ROLE_MESSAGE = 'Rôle invalide.';

export class UpdateShelterProfileDto {
  @IsString({ message: 'Nom invalide.' })
  @Length(1, 255, { message: 'Le nom doit faire entre 1 et 255 caractères.' })
  name!: string;

  @IsOptional() @IsString() @Length(0, 2000, { message: 'Description trop longue.' })
  description?: string;

  @IsOptional() @IsString() @Length(0, 5000, { message: 'Texte de mission trop long.' })
  missionLong?: string;

  @IsOptional()
  @IsInt({ message: 'Année invalide.' })
  @Min(1800, { message: 'Année invalide.' })
  @Max(2100, { message: 'Année invalide.' })
  foundedYear?: number;

  @IsOptional() @IsString() @Length(0, 14, { message: 'SIRET invalide.' })
  siret?: string;

  @IsOptional() @IsString() @Length(0, 500, { message: 'Adresse trop longue.' })
  address?: string;

  @IsOptional() @IsString() @Length(0, 30, { message: 'Téléphone trop long.' })
  phone?: string;

  @IsOptional() @IsString() @Length(0, 255, { message: 'Email trop long.' })
  email?: string;

  @IsOptional() @IsString() @Length(0, 255, { message: 'Site web trop long.' })
  website?: string;

  @IsOptional() @IsString() @Length(0, 1000, { message: 'Horaires trop longs.' })
  visitHours?: string;

  @IsOptional() @IsString() @Length(0, 500, { message: 'Lien de don trop long.' })
  donationUrl?: string;

  @IsOptional() @IsString() @Length(0, 120, { message: 'Libellé de don trop long.' })
  donationLabel?: string;

  @IsOptional() @IsString() @Length(0, 500, { message: 'Description du don trop longue.' })
  donationDescription?: string;

  @IsOptional() @IsString() @Length(0, 500, { message: 'Lien du logo trop long.' })
  logoUrl?: string;

  @IsOptional() @IsString() @Length(0, 500, { message: 'Lien de couverture trop long.' })
  coverUrl?: string;
}

export class UpdateShelterSettingsDto {
  @IsBoolean({ message: 'Valeur invalide.' })
  acceptsFosterApplications!: boolean;
}

export class InviteMemberDto {
  @IsEmail({}, { message: 'Email invalide.' })
  email!: string;

  @IsIn(['owner', 'gestionnaire', 'benevole'], { message: ROLE_MESSAGE })
  role!: string;
}

export class UpdateMemberRoleDto {
  @IsIn(['owner', 'gestionnaire', 'benevole'], { message: ROLE_MESSAGE })
  role!: string;
}
