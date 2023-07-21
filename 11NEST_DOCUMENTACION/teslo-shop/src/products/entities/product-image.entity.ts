import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Product } from "./product.entity";

@Entity({name:'product_images'})
export class ProductImage{

    @PrimaryGeneratedColumn() //va a tener un número autoincremental como id
    id: number

    @Column('text')
    url: string

    @ManyToOne(
        ()=> Product,
        product => product.images,
        {onDelete: 'CASCADE'}
    )
    product: Product
}