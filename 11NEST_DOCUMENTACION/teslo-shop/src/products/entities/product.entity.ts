import {Entity, PrimaryGeneratedColumn, Column, BeforeInsert, BeforeUpdate, OneToMany, ManyToOne} from 'typeorm'
import { ProductImage } from './product-image.entity'
import { User } from 'src/auth/entities/user.entity'
import { ApiProperty } from '@nestjs/swagger'

@Entity({name: 'products'})
export class Product {

    @ApiProperty({
        example: '8da88a62-cd23-4662-a6ab-5a6c85e97bf6',
        description: 'Product ID',
        uniqueItems: true
    })
    @PrimaryGeneratedColumn('uuid')
    id: string

    @ApiProperty({
        example: "T-Shirt Teslo",
        description: "Product Title",
        uniqueItems: true
    })
    @Column('text', {
        unique: true
    })
    title: string

    @ApiProperty({
        example: 0,
        description: 'Product Price',
    })
    @Column('float',{
        default: 0
    })
    price: number

    @ApiProperty({
        example: "This is a very weird t-shirt with weird colors",
        description: 'Product description',
        default: null
    })
    @Column({
        type: 'text',
        nullable: true
    })
    description: string

    @ApiProperty({
        example: 't_shirt_teslo',
        description: 'slug for SEO',
        uniqueItems: true
    })
    @Column({
        type: 'text',
        unique: true
    })
    slug: string

    @ApiProperty({
        example: '10',
        description:'Product Stock',
        default: 0
    })
    @Column({
        type: 'int',
        default: 0
    })
    stock: number

    @ApiProperty({
        example: ['M', 'S', 'L', 'XL'],
        description: 'Product Size',      
    })
    @Column({
        type: 'text',
        array: true
    })
    sizes: string[]

    @ApiProperty({
        example: 'women',
        description: 'Product gender'
    })
    @Column({
        type: 'text',
    })
    gender: string

    @ApiProperty()
    @Column({
        type: 'text',
        array: true,
        default: []
    })
    tags: string[]


    @ApiProperty()
    @OneToMany(
        ()=> ProductImage,
        productImage=> productImage.product,
        {cascade:true, eager: true}
    )
    images?: ProductImage[]
    
    @ManyToOne(
        ()=>User,
        (user)=>user.product,
        {eager: true}
    )
    user: User

    @BeforeInsert()
    checkSlugInsert(){
        if(!this.slug){
            this.slug = this.title 
        }
            
        this.slug = this.slug
        .toLowerCase()
        .replaceAll(' ', '_')
        .replaceAll("'", "")    
    }

    @BeforeUpdate()
    checkSlugUpdate(){
        this.slug = this.slug
        .toLowerCase()
        .replaceAll(' ', '_')
        .replaceAll("'", "")  
    }

}
