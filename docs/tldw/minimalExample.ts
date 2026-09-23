import readPermalink from 'read-permalink'

const state = readPermalink('?tab=details&data=eyJzZXR0aW5ncyI6eyJ0aGVtZSI6ImRhcmsifX0')

// {tab: 'details', settings: {theme: 'dark'}}
console.log(state)
