import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

/** Mise à jour du profil de l'utilisateur connecté (tous les champs optionnels). */
export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'Nom invalide.' })
  @Length(1, 255, { message: 'Le nom doit faire entre 1 et 255 caractères.' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Téléphone invalide.' })
  @Length(0, 20, { message: 'Téléphone trop long.' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Ville invalide.' })
  @Length(0, 255, { message: 'Ville trop longue.' })
  city?: string;

  @IsOptional()
  @IsString({ message: 'Biographie invalide.' })
  @Length(0, 2000, { message: 'Biographie trop longue.' })
  bio?: string;

  @IsOptional()
  @IsBoolean({ message: 'Valeur invalide.' })
  isPublic?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'Latitude invalide.' })
  @Min(-90, { message: 'Latitude invalide.' })
  @Max(90, { message: 'Latitude invalide.' })
  latitude?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Longitude invalide.' })
  @Min(-180, { message: 'Longitude invalide.' })
  @Max(180, { message: 'Longitude invalide.' })
  longitude?: number;

  @IsOptional()
  @IsInt({ message: 'Rayon invalide.' })
  @Min(1, { message: 'Le rayon doit être compris entre 1 et 200 km.' })
  @Max(200, { message: 'Le rayon doit être compris entre 1 et 200 km.' })
  notificationRadiusKm?: number;

  @IsOptional()
  @IsBoolean({ message: 'Valeur invalide.' })
  digestOptin?: boolean;
}
