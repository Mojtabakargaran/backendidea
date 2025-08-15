import { ApiProperty } from '@nestjs/swagger';
import { MessageKeys } from '../../common/message-keys';

export class GenerateSerialNumberResponseDto {
  @ApiProperty({
    description: 'Response code indicating the result of the generation',
    example: MessageKeys.SERIAL_NUMBER_GENERATED,
    enum: [
      MessageKeys.SERIAL_NUMBER_GENERATED,
      MessageKeys.SERIAL_NUMBER_GENERATION_FAILED,
    ],
  })
  code:
    | typeof MessageKeys.SERIAL_NUMBER_GENERATED
    | typeof MessageKeys.SERIAL_NUMBER_GENERATION_FAILED;

  @ApiProperty({
    description: 'Human-readable message in the requested language',
    example: 'Serial number generated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Generated serial number data',
    type: 'object',
    properties: {
      serialNumber: {
        type: 'string',
        description: 'The generated serial number',
        example: 'SN00000001',
      },
    },
  })
  data: {
    serialNumber: string;
  };
}
