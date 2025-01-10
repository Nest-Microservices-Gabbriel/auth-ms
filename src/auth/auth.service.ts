import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { RegisterUserDto } from './dto';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('AuthService');

  async onModuleInit() {
    try {
      await this.$connect(); // Aseguramos que la conexión sea asincrónica
      this.logger.log('MongoDb connected');
    } catch (error) {
      this.logger.error('Error connecting to MongoDb', error);
      throw new RpcException({
        status: 500,
        message: 'Error connecting to database',
      });
    }
  }

  async registerUser(registerUserDto: RegisterUserDto) {
    const { email, name, password } = registerUserDto;
    try {
      const user = await this.user.findUnique({
        where: {
          email: email,
        },
      });

      if (user) {
        this.logger.warn(`User with email ${email} already exists`);
        throw new RpcException({
          status: 400,
          message: 'User already exists',
        });
      }

      const newUser = await this.user.create({
        data: {
          email: email,
          password: password, // TODO: encriptar / hash
          name: name,
        },
      });

      return {
        user: newUser,
        token: 'abc', // TODO: generar un token real
      };
    } catch (error) {
      this.logger.error('Error during user registration', error);
      throw new RpcException({
        status: 400,
        message: error.message,
      });
    }
  }
}
