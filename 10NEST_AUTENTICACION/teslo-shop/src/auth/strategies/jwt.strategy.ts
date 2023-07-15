import {PassportStrategy} from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../entities/user.entity';
import { JwtPayloadInterface } from '../interfaces/jwt-payload.interface';
import { Repository} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {UnauthorizedException, Injectable} from '@nestjs/common'


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){


    constructor(
        
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,

        private readonly configService: ConfigService
    ){
        super({
            secretOrKey: configService.get('JWT_SECRET'),
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
        })
    }

    async validate(payload: JwtPayloadInterface): Promise<User>{

        const {id} = payload

         const user = await this.userRepository.findOneBy({id})

         if(!user) throw new UnauthorizedException('Token not valid')

         if(!user.isActive) throw new UnauthorizedException('User is inactive')

        return user
    }

}