import { IsOptional, IsPositive, Min, IsNumber } from "class-validator"

export class PaginationDto{

    @IsPositive()
    @IsOptional()
    @Min(1)
    @IsNumber()
    limit: number

    @IsPositive()
    @IsOptional()
    @IsNumber()
    offset: number
}