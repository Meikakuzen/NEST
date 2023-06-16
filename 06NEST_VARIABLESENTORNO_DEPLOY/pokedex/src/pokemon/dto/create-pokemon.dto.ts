import { IsPositive, IsInt, IsString, Min, MinLength } from "class-validator"

export class CreatePokemonDto {

    @IsInt()
    @IsPositive()
    @Min(1)
    no: number

    @IsString()
    @MinLength(3)
    name: string

}
