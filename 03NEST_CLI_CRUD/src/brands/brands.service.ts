import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Brand } from './entities/brand.entity';
import { v4 as uuid } from 'uuid';

@Injectable()
export class BrandsService {

  private brands: Brand[] = [
   /* {
      id: uuid(),
      name: "Volvo",
      createdAt: new Date().getTime() //debo añadirle getTime para que no choque con la validación tipo number
    }*/

  ]

  create(createBrandDto: CreateBrandDto) {
    //lo uso como una interfaz. En la vida real, con una DB, va a ser usado como una instancia
    const brand: Brand = {
      id: uuid(),
      name: createBrandDto.name.toLowerCase(), //uso toLowerCase porque los quiero almacenar así
      createdAt: new Date().getTime()
    }

    this.brands.push(brand)

    return brand
  }

  findAll() {
    return this.brands;
  }

  findOne(id: string) {
    const brand = this.brands.find(brand=> brand.id === id)
    if(!brand) throw new NotFoundException(`Brand with id ${id} not found`)
    return brand
  }

  update(id: string, updateBrandDto: UpdateBrandDto) {
    let brandDB = this.findOne(id)
    this.brands = this.brands.map(brand=>{
              if(brand.id === id){
                brandDB={
                  ...brandDB,
                  ...updateBrandDto,
                }
                brandDB.updatedAt = new Date().getTime()
                return brandDB
              }
              return brand
    })

    return brandDB
  }

  remove(id: string) {
    this.brands = this.brands.filter(brand => brand.id !== id)
  }

  fillBrandsWithSeedData(brands: Brand[]){
    this.brands = brands
}
}
