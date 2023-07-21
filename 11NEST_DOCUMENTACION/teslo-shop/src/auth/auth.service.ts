import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt'
import { LoginUserDto } from './dto/login-user.dto';
import { JwtPayloadInterface } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly jwtService: JwtService
  ){}

  async create(createUserDto: CreateUserDto) {

    try {
     
    const {password, ...userData} = createUserDto
    
    const user=  this.userRepository.create({
      ...userData, 
      password: bcrypt.hashSync(password, 12)
      })
      
     await this.userRepository.save(user)
    
     delete user.password

     return {
      ...user,
      token: this.getJwt({id: user.id})
    }

    } catch (error) {
      this.handleDBErrors(error)
    }
  }

  async login(loginUserDto: LoginUserDto){

    const {email, password} = loginUserDto

    const user = await this.userRepository.findOne({
      where: {email},
      select: {email: true, password: true, id: true}
    })

    if(!user){
      throw new UnauthorizedException('Credenciales no válidas (email)')
    }

    if(!bcrypt.compareSync(password, user.password)){
      throw new UnauthorizedException('Password incorrect')
    }

    return {
      ...user,
      token: this.getJwt({id: user.id})
    }
    
  }

  async checkAuthStatus(user: User){
    return {
      ...user,
      token: this.getJwt({id: user.id})
    }
  }

  //generar JWT
  private getJwt(payload: JwtPayloadInterface){
      const token = this.jwtService.sign(payload)
      return token
  }


  private handleDBErrors(error: any):void{
    if(error.code === '23505'){
      throw new BadRequestException(error.detail)
    }
    console.log(error)

    throw new InternalServerErrorException("Check logs")

  }
}


