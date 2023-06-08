import { Car } from "src/cars/interfaces/car.interface";
import { v4 as uuid } from "uuid";


export const CARS_SEED: Car[] = [
    {
        id: uuid(),
        brand: "Toyota",
        model: "Corolla"
        
    },
    {
        id: uuid(),
        brand: "Suzuki",
        model: "Vitara"
        
    },  
    {
        id: uuid(),
        brand: "Opel",
        model: "Astra"
        
    }  
]