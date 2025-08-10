import { ApiProperty } from '@nestjs/swagger';
import { UserStatus, RoleName } from '@/common/enums';

export class UserListItemDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User full name',
    example: 'محمد حسینی',
  })
  fullName: string;

  @ApiProperty({
    description: 'User email address',
    example: 'mohammad@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+971501234567',
    nullable: true,
  })
  phoneNumber: string | null;

  @ApiProperty({
    description: 'User account status',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiProperty({
    description: 'User role name',
    enum: RoleName,
    example: RoleName.MANAGER,
    nullable: true,
  })
  roleName: RoleName | null;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2025-01-20T10:30:00.000Z',
    nullable: true,
  })
  lastLoginAt: string | null;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2025-01-15T09:00:00.000Z',
  })
  createdAt: string;
}

export class PaginationDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 25,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of users',
    example: 156,
  })
  totalUsers: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 7,
  })
  totalPages: number;
}

export class ListUsersDataDto {
  @ApiProperty({
    description: 'List of users',
    type: [UserListItemDto],
  })
  users: UserListItemDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}

export class ListUsersResponseDto {
  @ApiProperty({
    description: 'Response code',
    example: 'users.USERS_LIST_SUCCESS',
  })
  code: string;

  @ApiProperty({
    description: 'Localized response message',
    example: 'Users list retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response data',
    type: ListUsersDataDto,
  })
  data: ListUsersDataDto;
}
