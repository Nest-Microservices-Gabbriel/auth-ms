import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { LoginUserDto, RegisterUserDto } from './dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { verify } from '../../node_modules/@types/jsonwebtoken/index.d';
import { envs } from 'src/config/envs';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('AuthService');

  constructor(private readonly jwtService: JwtService) {
    super();
  }

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

  async signJWT(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  async verifyToken(token: string) {
    try {
      const { sub, iat, exp, ...user } = this.jwtService.verify(token, {
        secret: envs.jwtSecret,
      });

      return {
        user: user,
        token: await this.signJWT(user),
      };
    } catch (error) {
      console.log(error);
      throw new RpcException({
        status: 401,
        message: 'Invalid token',
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
          password: bcrypt.hashSync(password, 10), // TODO: encriptar / hash
          name: name,
        },
      });

      const { password: ___, ...rest } = newUser;

      return {
        user: rest,
        token: await this.signJWT(rest), // TODO: generar un token real
      };
    } catch (error) {
      this.logger.error('Error during user registration', error);
      throw new RpcException({
        status: 400,
        message: error.message,
      });
    }
  }

  async loginUser(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    try {
      const user = await this.user.findUnique({
        where: {
          email: email,
        },
      });

      if (!user) {
        throw new RpcException({
          status: 400,
          message: 'Invalid credentials',
        });
      }

      const isPasswordValid = bcrypt.compareSync(password, user.password);

      if (!isPasswordValid) {
        throw new RpcException({
          status: 400,
          message: 'Invalid credentials',
        });
      }

      const { password: ___, ...rest } = user;

      return {
        user: rest,
        token: await this.signJWT(rest), // TODO: generar un token real
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
