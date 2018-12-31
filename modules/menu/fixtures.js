const Data = require('../../lib/data')

const Menus = new Data('menus')

const fixtures = [
  {
    id: '0',
    name: 'Pizza Margarita',
    price: 5
  },
  {
    id: '1',
    name: 'Pizza Funghi',
    price: 6
  },
  {
    id: '2',
    name: 'Pizza Gorgonzola',
    price: 6.5
  },
  {
    id: '3',
    name: 'Pizza Calabrese',
    price: 7
  },
  {
    id: '4',
    name: 'Pizza à la Chef',
    price: 8.5
  }
]

// TODO Should be sync in this case (server should wait to be started until all fixtures are written)
fixtures.forEach(async item => {
  try {
    // TODO If an id is changed or removed we won't cover that yet
    await Menus.update(item.id, item)
  } catch (err) {
    // TODO We should distinct between errors
    // For now we just assume that the file does not exist yet
    try {
      await Menus.create(item.id, item)
    } catch (err) {
      console.error('Could not create or update menu item')
    }
  }
})
