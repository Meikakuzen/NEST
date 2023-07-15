# 10 NEST Autenticación

- En esta sección vamos a hacer decoradores personalizados
- Las rutas GET serán públicas, crear, actualizar y borrar si necesitarán autenticación de admin
- Vamos a hacer modificaciones en el SEED para crear usuarios automáticamente en la db y revalidar tokens (en realidad generar uno nuevo basado en el anterior)
- Van a haber varios endpoints nuevos como login, create user, check auth status
- También veremos encriptación de contraseñas
- Hay mucho concepto nuevo en esta sección
-----------

## Entidad de usuarios

- Voy a proteger rutas. Habrá rutas que solo las podrán ver usuarios con el rol de administrador, por ejemplo
- El objetivo de la entidad es tener una relación entre la db y la aplicación de Nest
- Corresponde a una tabla en la db
- La renombro a user.entity
- Le coloco el decorador **@Entity** de , le paso el nombre 'users'
- No se recomienda usar el mail de id, porque este puede cambiar y dar dolores de cabeza
- Para decirle que es un identificador único uso el decorador **@PrimaryGeneratedColumn**
  - Si no le coloco nada será un numero autoincremental, vamos a manejarlo con uuid
- El isActive servirá para un borrado suave, donde permaneceran los datos pero con el isActive en false
- En el rol le pongo user como valor por defecto
- user.entity

~~~js
import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity('users')
export class User{

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column('text',{
        unique: true
    })
    email: string

    
    @Column('text')
    password: string

    @Column('text')
    fullName: string

    @Column('bool',{
        default: true
    })
    isActive: boolean

    @Column('text',{
        array: true,
        default:['user']
    })
    roles: string[]
}
~~~

- Para usar la entidad debo especificar en el módulo en imports con **TypeOrmModule** y **forFeature** las entidades que quiero utilizar
- Lo exporto por si lo quiero usar en otro módulo
- En auth.module

~~~js
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [
    TypeOrmModule.forFeature([User])
  ],
  exports: [TypeOrmModule]
})
export class AuthModule {}
~~~
-----

## Crear Usuario

- Para crear el usuario voy a usar el endpoint register

> http://localhost:3000/api/auth/register

- Lo añado al controlador
- Borro los dtos y creo CreateUserDto (actualizo también el servicio borrando todo menos el create)

~~~js
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  create(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }
}
~~~

- En el dto necesito el email, password y fullName
- Usaré una expresión regular para validar el password

~~~js
import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator"
import { Unique } from "typeorm"

export class CreateUserDto{


    @IsEmail()
    email: string
    
    @IsString()
    @MinLength(1)
    fullName: string

    @IsString()
    @MinLength(6)
    @MaxLength(50)
    @Matches(
    /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'The password must have a Uppercase, lowercase letter and a number'
    })
    password: string;
}
~~~

- Falta implementar la lógica en el servicio
- Siempre en un try catch, async
- El create **no hace la inserción**

~~~js
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';


@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ){}

  async create(createUserDto: CreateUserDto) {
    
    try {
     const user=  this.userRepository.create(createUserDto)
      
     await this.userRepository.save(user)

     return user

    } catch (error) {
      console.log(error)
    }
  }
}
~~~

- Evidentemente falta encriptar el password
- Si vuelvo a enviar el mismo usuario salta un error en la terminal, código 23505
- Manejemos la excepción

~~~js
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';


@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ){}

  async create(createUserDto: CreateUserDto) {
    
    try {
     const user=  this.userRepository.create(createUserDto)
      
     await this.userRepository.save(user)

     return user

    } catch (error) {
      this.handleDBErrors(error)
    }

  }

  private handleDBErrors(error: any):void{    //jamás regresa un valor
    if(error.code === '23505'){
      throw new BadRequestException(error.detail)
    }
    console.log(error)

    throw new InternalServerErrorException("Check logs") //no hace falta poner el return

  }
}
~~~
------

## Encriptar contraseña

- No debio regresar la contraseña y por supuesto, debo guardarla encriptada
- Usaremos encriptación de una sola vía con bcrypt. Instalo los tipos

> npm i bcrypt
> npm i -D @types/bcrypt

- Importo todo como bcrypt ( es una manera ligera de hacer el patrón adaptador)
- Uso la desestructuración para extraer el password
- hashSync me pide la data y el número de vueltas de encriptación, se lo paso en un objeto

~~~js
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt'


@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ){}

  async create(createUserDto: CreateUserDto) {

    try {
     
    const {password, ...userData} = createUserDto
    
    const user=  this.userRepository.create({
      ...userData, 
      password: bcrypt.hashSync(password, 12)
      })
      
     await this.userRepository.save(user)

     return user

    } catch (error) {
      this.handleDBErrors(error)
    }
  }

  private handleDBErrors(error: any):void{
    if(error.code === '23505'){
      throw new BadRequestException(error.detail)
    }
    console.log(error)

    throw new InternalServerErrorException("Check logs")
  }
}
~~~

- No debería regresar la contraseña
- Hay varias tecnicas
- Cuando ya se ha grabado el usuario extraigo el password
- Uso **delete**

~~~js
async create(createUserDto: CreateUserDto) {

try {
    
const {password, ...userData} = createUserDto

const user=  this.userRepository.create({
    ...userData, 
    password: bcrypt.hashSync(password, 12)
    })
    
    await this.userRepository.save(user)

    delete user.password

    return user
    //TODO: retornar JWT de acceso

} catch (error) {
    this.handleDBErrors(error)
    }
}
~~~

- Luego se mejorará este delete!
--------

## Login de usuario

- Creo el dto login-user.dto

~~~js
import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator"


export class LoginUserDto{

    @IsEmail()
    email: string

    @IsString()
    @MinLength(6)
    @MaxLength(50)
    @Matches(
    /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'The password must have a Uppercase, lowercase letter and a number'
    })
    password: string
}
~~~

- En el controlador creo el endpoint 'login'

~~~js
@Post('login')
loginUser(@Body() loginUserDto: LoginUserDto){
  return this.authService.loginUser(loginUserDto)
}
~~~

- Creo el servicio
- Si uso esto
```
 const user = await this.userRepository.findOneBy({email})
```
- Me devuelve el objeto completo, incluido el password y yo no quiero eso
- El problema es que cuando haga relaciones y mostremos la relación con el usuario también va a venir la contraseña y otras cosas
- Para evitarlo, voy a la entidad y en la propiedad contraseña le coloco select: false
- user.entity

~~~js
@Column('text',{
    select: false
})
password: string
~~~

- Cuando se haga un find no aparecerá, pero yo ahora necesito el password para validar, por lo que usaré el **where** con **findOne**
- Le paso el mail (solo puede haber 1 y está indexado)
- Le digo que seleccione los campos email y password

~~~js
async login(loginUserDto: LoginUserDto){

    const {email, password} = loginUserDto

    const user = await this.userRepository.findOne({
      where: {email},
      select: {email: true, password: true}
    })
    	
    return user
  }
~~~

- Hago la validación de si existe usuario y la comparación del password con bcrypt. Si no concuerda devuelvo un error

~~~js
async login(loginUserDto: LoginUserDto){

  const {email, password} = loginUserDto

  const user = await this.userRepository.findOne({
    where: {email},
    select: {email: true, password: true}
  })

  if(!user){
    throw new UnauthorizedException('Credenciales no válidas (email)')
  }

  if(!bcrypt.compareSync(password, user.password)){
    throw new UnauthorizedException('Password incorrect')
  }

  return user
  //TODO: retornar JWT
}
~~~
-----

## Nest Authentication - Passport


- Instalación necesaria

> npm i @nestjs/passport passport @nestjs/jwt passport-jwt
> npm i -D @types/passport-jwt

- Hay varias estrategias para autenticarse
- En authModule debo definir 2 cosas: 
  - **PassportModule**: debo decirle la estrategia que voy a usar. Empleo register (registerAsync es para modulos asíncronos)
    - registerAsync se suele usar para asegurarse que las variables de entorno estan previamente configuradas
    - También si mi configuracion del módulo depende de un servicio externo, un endpoint, etc
  - **JwtModule**: para la palabra secreta usaré una variable de entorno. Expirará en 2 horas

~~~js
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({defaultStrategy: 'jwt'}),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions:{
        expiresIn: '2h'
      }
    })
  ],
  exports: [TypeOrmModule]
})
export class AuthModule {}
~~~

- Sería mejor usar la manera asíncrona de carga del módulo para asegurarme de que la variable de entorno estará cargada
---------

## Modulos asíncronos

- En registerAsync tengo opciones como useClass y useExisting muy utiles en la parte del testing
- Voy a usar useFactory, es la función que voy a llamar cuando se intente registrar de manera asincrona el módulo
  - En el return envío el objeto con las opciones del jwt

~~~js
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({defaultStrategy: 'jwt'}),
    JwtModule.registerAsync({
        imports: [],
        inject: [],
        useFactory: ()=>{

          return {
            secret: process.env.JWT_SECRET,
            signOptions:{
              expiresIn: '2h'
            }
          }
        }
    })
  ],
  exports: [TypeOrmModule]
})
export class AuthModule {}
~~~

- Puedo inyectar el configService como hice anteriormente para trabajar con las variables de entorno
- Para ello importo el módulo **ConfigModule** e inyecto el servicio en **injects**
- Hago la inyección del servicio igual que lo haría en cualquier clase solo que aqui estoy en una funcion
- ConfigService me da la posibilidad de recibir el dato que yo espero, poder evaluarlo, establecer valores por defecto, etc

~~~js
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({defaultStrategy: 'jwt'}),
    
    JwtModule.registerAsync({

        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService)=>{

          return {
            secret: configService.get('JWT_SECRET'),
            signOptions:{
              expiresIn: '2h'
            }
          }
        }
    })
  ],
  exports: [TypeOrmModule]
})
export class AuthModule {}
~~~

- Falta saber qué información voy a guardar en el jwt, como validarlo y a qué usuario de la db le corresponde
------

## JwtStrategy

- Es recomendable guardar en el jwt algun campo que esté indexado patra que identifique rapidamente al usuario
- Añadir también en qué momento fue creado y la fecha de expiración
- Nunca guardar info sensible: cadenas de conexión, tarjetas de crédito, passwords, etc
- La firma encriptada asegura que el valor no haya sido modificado y que haga match
- Me interesa saber que el usuario esté activo, el rol y el id a través de su correo
- **Solo guardaré el correo en el jwt**
- Vamos a emplear una estrategia personalizada
- En auth creo un nuevo directorio llamado strategies con jwt.strategy.ts
- Esta clase extiende de PassportStrategy (@nestjs/passport) y le paso la estrategia de passport-jwt

~~~js
import {PassportStrategy} from '@nestjs/passport'
import { Strategy } from 'passport-jwt';


export class JwtStrategy extends PassportStrategy(Strategy){


}
~~~

- Quiero implementar una forma de expandir la validación de jwt
- El passportStrategy va a revisar el jwt basado en la secret_key, tambien si ha expirado o no y la Strategy me va a decir si el token es válido, pero hasta ahí
- Si yo necesito saber si el usuario está activo y todo lo demás, lo haré en base a un método (lo llamaré validate)
- El payload momentaneamente lo pondré de tipo any (lo cambiaré más adelante)
- Devuelve una promesa que va a devolverme una instancia de Usuario de mi db
- Si el jwt es válido y no ha expirado, voy a recibir este payload y puedo validarlo como yo quiera

~~~js
import {PassportStrategy} from '@nestjs/passport'
import { Strategy } from 'passport-jwt';
import { User } from '../entities/user.entity';


export class JwtStrategy extends PassportStrategy(Strategy){

    async validate(payload: any): Promise<User>{

        return
    }
}
~~~

- Creo el directorio interfaces en /auth para hacer la interfaz del payload
- No voy a incluir la fecha de creación ni expiración

~~~js
export interface JwtPayloadInterface{

    email: string
    //TODO: añadir todo lo que se quiera grabar
}
~~~

- Se procura que el jwt no lleve mucha info porque viaja de aquí para allá, que sea liviano
- Ahora puedo desestructurar el email del payload
------

## JwtStrategy II

- Añado la lógica para validar el payload
- El método validate **solo se va a llamar si el jwt es válido (la firma hace match) y no ha expirado**
- Necesito ir a la tabla de usuarios y buscar el correo
- Ya tengo importado el módulo user en auth.module por lo que solo debo inyectar el repositorio de usuario
- PassportStrategy me pide invocar el **constructor padre**
- Como tengo que pasarle la secret_key como variable de entorno al constructor padre inyecto el **ConfigService**
- Importo el **ConfigModule en auth.module**
- Le debo indicar también al constructor padre en qué posición voy a esperar que me manden el jwt
  - Lo puedo mandar en los headers, o como un **header de autenticación** de tipo **Bearer Token**

~~~js
import {PassportStrategy} from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../entities/user.entity';
import { JwtPayloadInterface } from '../interfaces/jwt-payload.interface';
import { Repository} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

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

        const {email} = payload

         const user = await this.userRepository.findOneBy({email})

        return
    }
}
~~~

- **Debo importar ConfigModule en imports del auth.module** (no solo en el JwtModule) ya que lo uso en este módulo
- Ahora ya puedo implementar la lógica, validar el usuario, etc
- No tengo el password. Si el token existe significa que el usuario se autenticó en su momento
- Retorno el usuario. Cuando la validación lo que yo retorne se va a añadir en la Request
  - Pasa por interceptores, por los servicios, controladores, **todo lugar donde tenga acceso a la Request**
  - Después se usarán decoradores personalizados para extraer info de la Request y hacer lo que hago en los controladores
- Todavía no he implementado el JwtStrategy, es un archivo flotando en mi app

~~~ts
async validate(payload: JwtPayloadInterface): Promise<User>{

      const {email} = payload

        const user = await this.userRepository.findOneBy({email})

        if(!user) throw new UnauthorizedException('Token not valid')

        if(!user.isActive) throw new UnauthorizedException('User is inactive')

      return user
  }
~~~

- Todas las estrategias son **providers**. Le añado el decorador **@Injectable** 
- Como es un provider, debo indicarlo en **el módulo auth.module dónde providers**
- También lo exporto por si quiero usarlo en otro lugar. Exporto los otros módulos
- Después lo vamos a mejorar para que todo sea automático

~~~js
@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    PassportModule.register({defaultStrategy: 'jwt'}),
    
    JwtModule.registerAsync({

        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService)=>{

          return {
            secret: configService.get('JWT_SECRET'),
            signOptions:{
              expiresIn: '2h'
            }
          }
        }
    })
  ],
  exports: [TypeOrmModule, JwtStrategy, PassportModule, JwtModule]
})
export class AuthModule {}
~~~
------

## Generar un JWT

- Como voy a crear un jwt en varios lugares voya crear un método en auth.service.ts
- Debo recibir **el payload** con la **info** que quiero en el jwt del tipo **JetPayloadInterface**
- Para generar el token necesito usar el servicio de jwt de nest, hago la inyección de dependencias
- Este servicio lo proporciona el JwtModule
- Uso el servicio con el método sign. Aquí podría pasarkle parámetros pero si no queda por defecto como definí en el módulo
- Esparzo con el spread mi user en el return, y añado el token
  - Si coloco directamente donde el payload user.email se me queja porque un string no cumple con el objeto de jwtPayloadInterface, así que lo meto como un objeto *{token: user.email}*
  - Hago lo mismo en el login
~~~js
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt'
import { LoginUserDto } from './dto/login-user.dto';
import { NotFoundError } from 'rxjs';
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
      token: this.getJwt({email: user.email})
    }

    } catch (error) {
      this.handleDBErrors(error)
    }
  }

  async login(loginUserDto: LoginUserDto){

    const {email, password} = loginUserDto

    const user = await this.userRepository.findOne({
      where: {email},
      select: {email: true, password: true}
    })

    if(!user){
      throw new UnauthorizedException('Credenciales no válidas (email)')
    }

    if(!bcrypt.compareSync(password, user.password)){
      throw new UnauthorizedException('Password incorrect')
    }

       return {
      ...user,
      token: this.getJwt({email: user.email})
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
~~~

- Voy al login y coloco usuario y contraseña correctos, en consola me devuelve email, password y el token!
- Quiero guardar todo en minúsculas
- Lo hago en la entidad directamente con **@BeforeInsert**
- Como en el **@BeforeUpdate** es el mismo código llamo al método anterior

~~~js
import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity('users')
export class User{

    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column('text',{
        unique: true
    })
    email: string

    
    @Column('text',{
        select: false
    })
    password: string

    @Column('text')
    fullName: string

    @Column('bool',{
        default: true
    })
    isActive: boolean

    @Column('text',{
        array: true,
        default:['user']
    })
    roles: string[]

    @BeforeInsert()
    checkFieldsBeforeInsert(){
        this.email = this.email.toLowerCase().trim()
    }

    @BeforeUpdate()
    checkFieldsBeforeUpdate(){
        this.checkFieldsBeforeInsert()
    }
}
~~~
-------

## Priovate Route - General

- Creo mi primera ruta privada que su único objetivo va a asegurar de que hay un jwt, que el usuario esté activo y el token no haya expirado (más adelante se evaluará tambien el rol)
- Voy a usar Get y la llamaré testingPrivateRoute
- auth.controller

~~~js
  @Get('private')
  testingPrivateRoute(){
    return {
      ok: true
    }
  }
~~~

- Los **Guards** son usados para permitir o prevenir el acceso a una ruta
- **Es dónde se debe de autorizar una solicitud**
- Autenticación y autorización **no son lo mismo**
- Autenticado es cuando el usuario está validado y autorizado es que tiene permiso para acceder
- Para usar el **guard** uso el decorador **@UseGuards** de @nestjs/common (por el momento, se hará un guard personalizado)
- Uso AuthGuard de @nestjs/passport, que usa la estrategia que yo definí por defecto, la configuración que definí, etc 
- Para probarlo en Postman/ThunderClient debo añadir el token proporcionado en el login en Auth donde dice Bearer
- Si le cambio el isActive a **FALSE** y le paso el token adecuado, me devuelve un error controlado diciendo que no estoy autorizado porque mi usuario está inactivo
- **Pero de dónde sale eso?**
- Recuerda que en la estrategia, en el validate hago la verificación
- Es la estrategia que está usando por defecto el **Guard**

~~~js
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

        const {email} = payload

         const user = await this.userRepository.findOneBy({email})

         if(!user) throw new UnauthorizedException('Token not valid')

         if(!user.isActive) throw new UnauthorizedException('User is inactive')

        return user
    }
}
~~~

- Si cambio la secret_key de la variable de entorno, el mismo token va a dar un error de autenticación "Unauthorized"
- Esto esta bien que sea asi
-----

## Cambiar el email por el id en el payload

- El email puede cambiar, por lo que conviene usar el uuid
- En el payload del jwt en lugar del email debe ir el uuid. Va a haber que actualizar la estrategia
- Primero, cuando hago el user de retorno en el login debo pedir también el id
- Cambio el email por el id en la generación del token en el return
  - Me marca error porque la interfaz me pide el email. Cambio la interfaz

~~~js
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
~~~

- Hago lo mismo en el método create(en lugar del {mail: user.email},{id: user.id}

- Cambio la interfaz

~~~js
export interface JwtPayloadInterface{

    id: string
}
~~~

- Falta cambiar la estrategia, ya que desestructuro el email y ya no lo tengo
- Cambio email por id

~~~js
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
~~~
- Vuelvo a generar un token, lo pruebo y debería ver la respuesta
- Cuando me autentique en una ruta siempre va a pasar por el JwtStrategy. Ahi ya tengo el usuario, puedo hacer un console.log
- Ahora, si cambia el correo no tengo problema
- Veamos cómo puedo obtener el usuario en los controladores y dónde necesite
------

## Custom Property Decorator - GetUser

- Puedo extraer el usuario del **Guard**
- Si se me olvidara que tengo implementado el Guard y quisiera extraer el usuario, debería lanzar un error propio.
  - Es un problema que yo como desarrollador del backend debo resolver
- Hay varias formas. Puedo escribir nest -h para ver la ayuda y usar el CLI

> nest g d nombre_decorador

- Pero este decorador funciona de manera global, por clase y por controlador
- No funciona para propiedad
- **Para extraer el usuario** usaré **@Request** de @nestjs/common
- Si hago un console.log de la request me manda un montón de info en consola

~~~js
  @Get('private')
  @UseGuards( AuthGuard())
  testingPrivateRoute(
    @Request() request: Express.Request
  ){
    return {
      ok: true
    }
  }
~~~

- **request.user** me devuelve el usuario
- Esto así funcionaría pero no es muy bonito
- Además necesito pasar por el Guard, por lo que habría que hacer un par de validaciones también
- Mejor creemos un **Custom Property Decorator**
- auth/decorators/get-user.decorator.ts
- El createParamDecorator es una función que usa un callback que debe retornar algo

~~~js
import { createParamDecorator } from "@nestjs/common";

export const GetUser = createParamDecorator(
    ()=>{

        return 'Hola mundo'
    }
)
~~~

- En el controller

~~~js
  @Get('private')
  @UseGuards( AuthGuard())
  testingPrivateRoute(
        @GetUser() user: User
  ){
    console.log({user})  //imprime en consola Hola mundo
    
    return {
      ok: true
    }
  }
~~~

- Lo que sea que retorne createParamDecorator es lo que voy a poder extraer
- En el callback de createParamDecorator dispongo de la data y el context (lo importo de @nestjs/common)
 
~~~js
import { ExecutionContext, createParamDecorator } from "@nestjs/common";

export const GetUser = createParamDecorator(
    (data, ctx: ExecutionContext)=>{
        console.log({data})
        
    }
)
~~~

- La consola me devuelve data: undefined. 
- Si voy al controlador y escribo 'email' en el decorador **@GetUser('email)** la consola me devuelve data: 'email'
- Puedo pasarle todos los argumentos que quiera en un arreglo

~~~js
  @Get('private')
  @UseGuards( AuthGuard())
  testingPrivateRoute(
        @GetUser(['email', 'role', 'fullName']) user: User
  ){
    console.log({user})
    return {
      ok: true,
      user
    }
  }
~~~

- El **ExecutionContext** es el contexto en el que se está ejecutando la función en la app
- Tengo, entre otras cosas, **la Request** (tambien la Response)
- Uso **switchToHttp.getRequest** para extraer la Request. Usaría getResponse para la Response
- Lanzo un error 500 si no está el usuario porque es un error mío ya que debería haber pasado por el Guard

~~~js
import { ExecutionContext, InternalServerErrorException, createParamDecorator } from "@nestjs/common";

export const GetUser = createParamDecorator(
    (data, ctx: ExecutionContext)=>{
        
        const req = ctx.switchToHttp().getRequest()

        const user = req.user

        if(!user) throw new InternalServerErrorException('User not found')

        return user   
    }
)
~~~
-------

## Tarea Custom Decorators

- Quiero usar el @GetUser dos veces en el mismo endpoint en el controller
- Una sin pasarle ningún argumento que me devuelva el User completo
- Otra pasándole solo el email como parámetro a @GetUser para que me devuelva el email 
- Podría usar los Pipes para validar/transformar la data pertfectamente, pero no es el caso

~~~js
  @Get('private')
  @UseGuards( AuthGuard())
  testingPrivateRoute(
        @GetUser() user: User,
        @GetUser('email') email: string
  ){
    console.log({user})
    return {
      ok: true,
      user
    }
  }
~~~

- Uso un ternario para devolver si no hay data el user, y si la hay user[propiedad_computada]
- get-user.decorator.ts

~~~js
import { ExecutionContext, InternalServerErrorException, createParamDecorator } from "@nestjs/common";

export const GetUser = createParamDecorator(
    (data, ctx: ExecutionContext)=>{
        
        const req = ctx.switchToHttp().getRequest()

        const user = req.user

        if(!user) throw new InternalServerErrorException('User not found')

        return (!data) ? user : user[data]   
    }
)
~~~

- Si hago un console.log de la Request usando el decorador @Request y lo imprimo en consola, puedo crear un decorador que me devuelva lo que yo quiera de ella, por ejemplo los rawHeaders
- Aunque es un decorador que iría más bien en el módulo common, lo pondré junto al otro decorador por tenerlos agrupados
- get-rawheaders.decorator.ts

~~~js
import { ExecutionContext, createParamDecorator } from "@nestjs/common";


export const GetRawHeaders = createParamDecorator(
    (data, ctx: ExecutionContext)=>{

        const req = ctx.switchToHttp().getRequest()

        
        return  req.rawHeaders
    }
)
~~~

- auth.controller

~~~js
  @Get('private')
  @UseGuards( AuthGuard())
  testingPrivateRoute(
        @GetUser() user: User,
        @GetUser('email') email: string,
        @GetRawHeaders() rawHeaders: string[]
  ){
    return {
      ok: true,
      user,
      email,
      rawHeaders
    }
  }
~~~

- Nest ya tiene su propio decorador **@Headers** para los headers (de @nestjs/common)
- El tipo de headers es IncomingHttpHeaders (importar de http)
--------


## Custom Guard y Custom Decorator

- En este momento, si yo quisiera validar el rol podría hacerlo en el controlador con user.roles.includes('admin), por ejemplo
- Pero voy a crear un Guard y un Custom Decorator para esta tarea
- Creo otro Get en el auth.controller

~~~js
@Get('private2')
@UseGuards(AuthGuard())
privateRoute2(
  @GetUser() user: User,
){
  return{
    ok: true,
    user
  }
}
~~~

- Este Get necesita tener ciertos roles, y quiero crear un decorador que los valide
- Puedo usar **@SetMetaData**

~~~js
@Get('private2')
@UseGuards(AuthGuard())
@SetMetadata('roles', ['admin'])
privateRoute2(
  @GetUser() user: User,
){
  return{
    ok: true,
    user
  }
}
~~~

- Con esto no es suficiente, debo crear un Guard para que lo evalue
- Puedo hacerlo con el CLI usando gu

> nest g gu auth/guards/userRole --no-spec

- Esto genera por mi

~~~js
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class UserRoleGuard implements CanActivate {
  
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {

    console.log('UserGuard')

    return true;
  }
}
~~~

- Para que un Guard sea válid tiene que implementar canActivate
- Tiene que retornar un boolean o una Promesa que sea un boolean, si es true lo deja pasar si no no
- También puede devolver un Observable que emita un boolean
- Los Guards por defecto son async
- Coloco el userRoleGuard en el controlador

~~~js
@Get('private2')
@UseGuards(AuthGuard(), UserRoleGuard)
@SetMetadata('roles', ['admin'])
privateRoute2(
  @GetUser() user: User,
){
  return{
    ok: true,
    user
  }
}
~~~

- Porqué no lleva paréntesis?
- Podría generar una nueva instancia con new
- **AuthGuard ya devuelve la instancia**, por lo que los Guards personalizados no llevan paréntesis, **para usar la misma instancia**
- Se puede hacer usando el new pero eso lo que haría es generar una nueva instancia, y lo que queremos es usar la misma
- Si ejecuto el endpoint private2 con el token en consola imprime el console.log, con lo que ha pasado por el Guard
- Los Guards se encuentran dentro del ciclo de vida de Nest
  - Están dentro de la **Exception Zone**
  - Significa que si devolviera un error en lugar del true va a ser controlado por Nest (BadRequestException o lo que fuera)
- Este Guard se va a encargar de verificar los roles.
- Para ello primero debo extraer la metadata del decorador **@SetMetadata**
- Aquí **no se pone fácil la cosa**. **Tirando de documentación**
- Inyecto Reflector en el constructor
- Lo uso para guardar en la variable roles con el .get('roles') (lo que pone en **@SetMetadata**) y el target es context.getHandler()

~~~js
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class UserRoleGuard implements CanActivate {

  constructor(
    private readonly reflector: Reflector
  ){}


  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {

    const validRoles: string[] = this.reflector.get('roles', context.getHandler() )

    console.log({validRoles}) //para testear que los haya extraído bien

    return true;
  }
}
~~~

- Ahora lo que debo hacer es comparar si existen en el arreglo de roles de mi entidad
- Si no existe niguno voy a devolver un error
--------

## Verificar Rol del usuario

- Para obtener el usuario es el mismo código de **ctx.switchToHttp().getrequest()**
- Tipo el usuario con **as User** así obtengo el completado también
- Verifico que venga el usuario para asegurarme de que se usa el Guard de autenticación
- Uso un ciclo for para recorrer el array y verificar el rol
- Si no es un role valido lanzaré un ForbiddenException

~~~js
import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class UserRoleGuard implements CanActivate {

  constructor(
    private readonly reflector: Reflector
  ){}


  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {

    const validRoles: string[] = this.reflector.get('roles', context.getHandler() )

    const req = context.switchToHttp().getRequest()
    const user = req.user as User

    if(!user) throw new BadRequestException('User not found')

    for(const role of user.roles){
      if(validRoles.includes(role)){
        return true
      }
    }
    throw new ForbiddenException(`User ${user.fullName} needs a valid role`)
  }
}
~~~

- Para que lo deje pasar añado en TablePlus el role de admin al usuario
- Para usar esta lógica que estoy implementando tengo que memorizar muchas cosas. Establecer el SetMetadata, etc
- Si me olvidara del SetMetadata, al extraer los validRoles mi app reventaría. Debería validarlo
- También es muy volatil el arreglo de roles, me puedo equivocar. El SetMetadata se usa muy poco como decorador directamente
- Mejor crear un **Custom Decorator**
-----

## Custom Decorator RoleProtected

- Si no son decoradores de propiedades, perfectamente puedo usar el CLI
- ¿El decorador que voy a crear esta fuertemente ligado al módulo auth o es algo general que podría ir en common?
  - Me va aservir para establecer los roles que el usuario ha de tener para poder ingresar a la ruta
  - Por lo que SI está amarrado al módulo de auth

> nest g d auth/decorators/roleProtected --no-spec

- Esto me genera este código

~~~js
import { SetMetadata } from '@nestjs/common';

export const RoleProtected = (...args: string[]) => SetMetadata('role-protected', args);
~~~

- Cambio 'role-protected' en el SetMetadata por 'roles'
- Defino el string con una variable para tenerla en un solo lugar, por si hubiera cambios
- Importo META_ROLES en el UserRoleGuard para añadirlo en el this.reflector.get

~~~js
import { SetMetadata } from '@nestjs/common';

export const META_ROLES= 'roles'

export const RoleProtected = (...args: string[]) =>{
    
    SetMetadata(META_ROLES, args);
} 
~~~

- Creo una enum en la carpeta de interfaces para especificar los roles que voy a permitir
- Tienen que ser strings, Typescript les asigna un número 0,1,2

~~~js
export enum ValidRoles{

    admin= 'admin', 
    superUser= 'super-user',
    user= 'user'    
}
~~~

- Le paso el enum como tipo  como parámetro del decoradorrole-protected

~~~js
import { SetMetadata } from '@nestjs/common';
import { ValidRoles } from '../interfaces/valid-roles';

export const META_ROLES= 'roles'

export const RoleProtected = (...args: ValidRoles[]) =>{
    
   return  SetMetadata(META_ROLES, args);
} 
~~~

- Uso el **@RoleProtected** en el controller
- Si lo pusiera sin parámetros, cualquier usuario tendría acceso a la ruta
- Uso el **enum**

~~~js
@Get('private2')
@UseGuards(AuthGuard(), UserRoleGuard)
@RoleProtected(ValidRoles.admin)
privateRoute2(
  @GetUser() user: User,
){
  return{
    ok: true,
    user
  }
}
~~~

- Puedo pasarle varios valores separados por comas, **@RoleProtected(ValidRoles.admin, ValidRoles.user)**
- Es fácil que me olvide de implementar el AuthGuard (autenticación), o el RoleProtected(autorización)
- Podemos crear un único decorador que lo haga todo
-------

## Composición de decoradores

- 
