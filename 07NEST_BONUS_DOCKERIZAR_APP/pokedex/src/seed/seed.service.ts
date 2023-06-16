import { Injectable } from '@nestjs/common';

import { PokeResponse } from './interfaces/poke-response.interface';
import { Model } from 'mongoose';
import { Pokemon } from 'src/pokemon/entities/pokemon.entity';
import { InjectModel } from '@nestjs/mongoose';
import { AxiosAdapter } from 'src/common/adapters/axios.adapter';


@Injectable()
export class SeedService {

  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly http: AxiosAdapter
    ){}

  

  async executeSEED() {

   await this.pokemonModel.deleteMany({})
    
   const data = await this.http.get<PokeResponse>("https://pokeapi.co/api/v2/pokemon?limit=500")

   const pokemonToInsert: {name: string, no:number}[] = []

   data.results.forEach(async ({name, url})=>{
      const segments = url.split('/')
      const no: number = +segments[segments.length -2] 
      
    pokemonToInsert.push({name, no})
   })

   await this.pokemonModel.insertMany(pokemonToInsert)

    return 'Seed Executed';
  }
}
