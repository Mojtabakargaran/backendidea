import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * Logout Response DTO
 * Success response for user logout
 * Implements ? - User Logout
 */
export class LogoutResponseDto {
  @ApiProperty({
    description: 'Success message code',
    example: 'auth.LOGOUT_SUCCESS',
    enum: ['auth.LOGOUT_SUCCESS'],
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Localized success message',
    example: 'Logout successful',
  })
  @IsString()
  message: string;
}
