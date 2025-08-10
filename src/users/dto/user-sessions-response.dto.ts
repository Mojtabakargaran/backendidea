import { ApiProperty } from '@nestjs/swagger';

/**
 * User Session Info DTO
 * Represents session information for display
 */
export class UserSessionInfoDto {
  @ApiProperty({
    description: 'Session unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'IP address where session was created',
    example: '192.168.1.100',
  })
  ipAddress: string;

  @ApiProperty({
    description: 'Browser user agent string',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    required: false,
  })
  userAgent?: string;

  @ApiProperty({
    description: 'Device fingerprint for identification',
    example: 'fp_d4f5g6h7j8k9',
    required: false,
  })
  deviceFingerprint?: string;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  lastActivityAt: string;

  @ApiProperty({
    description: 'Session expiration timestamp',
    example: '2025-01-15T18:30:00Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Whether this is the current session',
    example: true,
  })
  isCurrent: boolean;
}

/**
 * User Sessions Response DTO
 * Contains list of active sessions for current user
 */
export class UserSessionsResponseDto {
  @ApiProperty({
    description: 'Current session identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  currentSessionId: string;

  @ApiProperty({
    description: 'List of active sessions',
    type: [UserSessionInfoDto],
  })
  sessions: UserSessionInfoDto[];

  @ApiProperty({
    description: 'Total number of active sessions',
    example: 3,
  })
  totalSessions: number;
}

/**
 * User Sessions API Response DTO
 * Standard API response wrapper for sessions list
 */
export class UserSessionsApiResponseDto {
  @ApiProperty({
    description: 'Response code for localization',
    example: 'users.SESSIONS_RETRIEVED',
  })
  code: string;

  @ApiProperty({
    description: 'Localized response message',
    example: 'Active sessions retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Sessions data',
    type: UserSessionsResponseDto,
  })
  data: UserSessionsResponseDto;
}

/**
 * Terminate Session Response DTO
 * Contains information about session termination
 */
export class TerminateSessionResponseDto {
  @ApiProperty({
    description: 'Terminated session identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Timestamp when session was terminated',
    example: '2025-01-15T10:30:00Z',
  })
  terminatedAt: string;
}

/**
 * Terminate Session API Response DTO
 * Standard API response wrapper for session termination
 */
export class TerminateSessionApiResponseDto {
  @ApiProperty({
    description: 'Response code for localization',
    example: 'users.SESSION_TERMINATED',
  })
  code: string;

  @ApiProperty({
    description: 'Localized response message',
    example: 'Session terminated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Session termination result data',
    type: TerminateSessionResponseDto,
  })
  data: TerminateSessionResponseDto;
}
