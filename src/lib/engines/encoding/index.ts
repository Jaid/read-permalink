import Base64Engine from './Base64Engine.ts'

export const defaultEncodingEngine = new Base64Engine
export const encodingEngines = [defaultEncodingEngine]

export default encodingEngines
