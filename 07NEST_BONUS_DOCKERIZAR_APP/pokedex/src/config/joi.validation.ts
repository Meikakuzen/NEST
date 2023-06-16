import * as Joi from 'joi'


export const joiValidationSchema = Joi.object({
    MONGODB: Joi.required(), 
    PORT: Joi.number().default(3005), //le establezco el puerto 3005 por defecto
    DEFAULT_LIMIT: Joi.number().default(5)
})