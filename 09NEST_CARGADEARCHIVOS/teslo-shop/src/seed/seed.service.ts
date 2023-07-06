import { Injectable } from '@nestjs/common';
import { ProductsService } from 'src/products/products.service';
import { initialData } from './data/seed-data';


@Injectable()
export class SeedService {

  constructor(
    private readonly productsService: ProductsService
  ){}

  async runSeed() {

    this.insertNewProducts()

    const products = initialData.products

    const insertPromises = []

    products.forEach(product=>{
      insertPromises.push(this.productsService.create(product))      
    })

    await Promise.all(insertPromises)

    return `SEED EXECUTED`;
  }

  private async insertNewProducts(){
   await  this.productsService.deleteAllProducts()


  }

}
