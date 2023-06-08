import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Car } from './interfaces/car.interface';
import {v4 as uuid} from 'uuid';
import { CreateCarDto } from './dtos/create-car.dto';
import { UpdateCarDto } from './dtos/update-car.dto';

@Injectable()
export class CarsService {
    
    private cars: Car[] =[
        {
            id: uuid(), 
            brand: 'Toyota',
            model: 'Corola'
        },
        {
            id: uuid(), 
            brand: 'Suzuki',
            model: 'Vitara'
        },
        {
            id: uuid(), 
            brand: 'Honda',
            model: 'Civic'
        }
    ]
        
    findAll(){
        return this.cars
    }  
    
    findOneById(id: string){
        const car = this.cars.find(car => car.id === id)
        if(!car) throw new NotFoundException(`Car with id ${id} not found`)
        return car
    }

    createCar(createCarDto: CreateCarDto ){
        
        const car: Car = {
            id: uuid(),
            ...createCarDto
        }

        this.cars.push(car)

        return car
    }

    updateCar(id: string, updateCarDto: UpdateCarDto){
      let carDB = this.findOneById(id)

      if(updateCarDto.id && updateCarDto !== id){
        throw new BadRequestException('Car id is not valid inside body')
      }

      this.cars = this.cars.map(car=>{
            if(car.id === id){
                carDB={
                    ...carDB,
                    ...updateCarDto, 
                    id 
                }
                return carDB
            }
            return car 
      })

      return carDB
    }

    deleteCar(id: string){
        const car = this.findOneById(id)

        this.cars = this.cars.filter(car => car.id !== id)
    }  
}

