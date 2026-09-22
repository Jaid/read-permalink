import readPermalink from 'read-permalink'

const state = await readPermalink('?tab=details&data=eyJlbmFibGVkIjp0cnVlfQ')

// {tab: 'details', enabled: true}
console.log(state)
