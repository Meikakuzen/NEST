import { IsString, MinLength } from "class-validator"

export class CreateCarDto{

    @IsString({message: 'I can change the message!'})
    readonly brand: string
    
    @IsString()
    @MinLength(3)
    readonly model: string

}