import { SetMetadata } from '@nestjs/common';
import { JwtPayload } from 'src/types/jwt';

export const USER_TYPE = 'user_type';

export type UserTypeValidator = (user: JwtPayload) => boolean;

interface UserTypeValidatorMap {
  onlyVisitor: UserTypeValidator;
  beyondVisitor: UserTypeValidator;
  onlyAuthedUser: UserTypeValidator;
  onlyAdmin: UserTypeValidator;
}

const validators: UserTypeValidatorMap = {
  onlyVisitor: (user: JwtPayload) => user.userType === 0,
  beyondVisitor: (user: JwtPayload) => user.userType > 0,
  onlyAuthedUser: (user: JwtPayload) => user.userType === 1,
  onlyAdmin: (user: JwtPayload) => user.userType === 2,
};

export const UserType = (validator: UserTypeValidator | keyof UserTypeValidatorMap) => {
  if (typeof validator === 'string') {
    return SetMetadata(USER_TYPE, validators[validator]);
  }
  return SetMetadata(USER_TYPE, validator);
};
