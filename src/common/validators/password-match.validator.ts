import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validation decorator to check if password and confirmPassword match
 * Implements Alternative Flow 3c: Password Confirmation Mismatch
 */
export function IsPasswordMatch(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPasswordMatch',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string, args: ValidationArguments) {
          const relatedValue = (args.object as Record<string, unknown>)[
            'password'
          ];
          return value === relatedValue;
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Passwords do not match';
        },
      },
    });
  };
}
