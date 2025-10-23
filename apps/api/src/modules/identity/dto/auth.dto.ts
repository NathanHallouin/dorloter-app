import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email invalide.' })
  @MaxLength(255, { message: 'Email trop long.' })
  email!: string;

  @IsString({ message: 'Nom invalide.' })
  @Length(1, 255, { message: 'Le nom est requis (255 caractères maximum).' })
  name!: string;

  @IsString({ message: 'Mot de passe invalide.' })
  @Length(8, 128, { message: '8 caractères minimum.' })
  password!: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email invalide.' })
  email!: string;

  @IsString({ message: 'Mot de passe invalide.' })
  @Length(1, 512, { message: 'Mot de passe requis.' })
  password!: string;
}

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token invalide.' })
  @Length(1, 512, { message: 'Refresh token requis.' })
  refreshToken!: string;
}
