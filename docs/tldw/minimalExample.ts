import optis from 'optis'
import readPermalink, {parseNumber} from 'read-permalink'

const schema = optis({
  defaults: {page: 1},
  normalizations: {page: parseNumber},
})
const state = await readPermalink('?page=3', {schema})

// Inferred as {page: number}, with a number at runtime too.
console.log(state)
// {page: 3}
