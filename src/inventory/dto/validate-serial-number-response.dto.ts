import { ApiProperty } from '@nestjs/swagger';
import { MessageKeys } from '../../common/message-keys';

export class ValidateSerialNumberResponseDto {
  @ApiProperty({
    description: 'Response code indicating the result of the validation',
    example: MessageKeys.SERIAL_NUMBER_VALIDATION_RESULT,
    enum: [MessageKeys.SERIAL_NUMBER_VALIDATION_RESULT],
  })
  code: typeof MessageKeys.SERIAL_NUMBER_VALIDATION_RESULT;

  @ApiProperty({
    description: 'Human-readable message in the requested language',
    example: 'Serial number validation completed',
  })
  message: string;

  @ApiProperty({
    description: 'Validation result data',
    type: 'object',
    properties: {
      isUnique: {
        type: 'boolean',
        description: 'Whether the serial number is unique within the tenant',
        example: true,
      },
      serialNumber: {
        type: 'string',
        description: 'The validated serial number',
        example: 'SN12345678',
      },
    },
  })
  data: {
    isUnique: boolean;
    serialNumber: string;
  };
}
