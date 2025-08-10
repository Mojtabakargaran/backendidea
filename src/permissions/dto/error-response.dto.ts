import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponse {
  @ApiProperty({
    description: 'Error code following MessageKey format',
    example: 'permissions.PERMISSION_DENIED',
  })
  code: string;

  @ApiProperty({
    description: 'Localized error message',
    example: 'Permission denied. You do not have access to this resource.',
  })
  message: string;
}
