import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose'
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { Model, isValidObjectId } from 'mongoose';
import { Pokemon } from './entities/pokemon.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {ConfigService} from '@nestjs/config'

@Injectable()
export class PokemonService {

  private defaultLimit: number

  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly configService: ConfigService
    ){

      this.defaultLimit= configService.get<number>('defaultLimit')
    }


  async create(createPokemonDto: CreatePokemonDto) {

    createPokemonDto.name = createPokemonDto.name.toLowerCase()

    try {
      const pokemon = await this.pokemonModel.create(createPokemonDto)
      return pokemon;
      
    } catch (error) {
      this.handleExceptions(error)
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const {limit=this.defaultLimit , offset=0}= paginationDto
    
    return await this.pokemonModel.find()
    .limit(limit)
    .skip(offset)
    .sort({
      no:1 
    }) ;
  }

  async findOne(id: string) {
    
    let pokemon:Pokemon

    if(!isNaN(+id)){
      pokemon = await this.pokemonModel.findOne({no:id})
    }

    if(!pokemon && isValidObjectId(id)){
      pokemon = await this.pokemonModel.findById(id)
    }

    if(!pokemon){
      pokemon = await this.pokemonModel.findOne({name: id.toLowerCase().trim()})
    }

    if(!pokemon) throw new NotFoundException("Pokemon not found")

    return pokemon
  }

  async update(id: string, updatePokemonDto: UpdatePokemonDto) {
        let pokemon = await this.findOne(id)

        if(updatePokemonDto.name){
          updatePokemonDto.name = updatePokemonDto.name.toLowerCase()
        }

        try {
          await pokemon.updateOne(updatePokemonDto)
          return {...pokemon.toJSON(), ...updatePokemonDto}     
          
        } catch (error) {
          this.handleExceptions(error)
        }
  }

  async remove(id: string) {

   const {deletedCount} = await this.pokemonModel.deleteOne({_id: id})

   if(deletedCount === 0){
    throw new BadRequestException(`Pokemon with id ${id} not found`)
   }

   return 
  }

  private handleExceptions(error: any){
    if(error.code === 11000){
      throw new BadRequestException(`Pokemon exists in db ${JSON.stringify(error.keyValue)}`)
    }
    console.log(error)
    throw new InternalServerErrorException("Can't update Pokemon. Check server logs")
  }
}
