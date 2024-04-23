const express = require('express')
const {open} = require('sqlite')
const {format} = require('date-fns')
const sqlite3 = require('sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'todoApplication.db')

const app = express()
app.use(express.json())

let db = null
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`Db error:${e.message}`)
  }
}

initializeDbAndServer()

const convertTodoObjectToResponseObject = dbObject => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  }
}

const hasPriorityAndStatusProperties = requestQuery => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  )
}

const hasPriorityProperty = requestQuery => {
  return requestQuery.priority !== undefined
}

const hasStatusProperty = requestQuery => {
  return requestQuery.status !== undefined
}

const hasCategoryProperty = requestQuery => {
  return requestQuery.category !== undefined
}

//API1
app.get('/todos/', async (request, response) => {
  let data = null
  let getTodosQuery = ''
  const {search_q = '', priority, status, category} = request.query

  switch (true) {
    case hasPriorityAndStatusProperties(request.query): //if this is true then below query is taken in the code
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`
      break
    case hasPriorityProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`
      break
    case hasStatusProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`
      break
    case hasCategoryProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}';`
      break
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`
  }

  data = await db.all(getTodosQuery)
  response.send(
    data.map(eachObject => convertTodoObjectToResponseObject(eachObject)),
  )
})

//API2
app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const getParticularTodoQuery = `
  select * from todo where id = ${todoId};`
  const todoItem = await db.get(getParticularTodoQuery)
  response.send(convertTodoObjectToResponseObject(todoItem))
})

//API3
app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  const dateQuery = `
  select * from todo where due_date = '${date}'`
  const result = await db.all(dateQuery)
  response.send(
    result.map(eachTodo => convertTodoObjectToResponseObject(eachTodo)),
  )
})

//API4
app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body
  const putQuery = `
  insert into todo(id,todo,priority,status,category,due_date)
  values(${id},'${todo}','${priority}','${status}','${category}','${dueDate}');`

  await db.run(putQuery)
  response.send('Todo Successfully Added')
})

//API5
app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  let updateColumn = ''
  const requestBody = request.body
  switch (true) {
    // examines the data sent in the request body to figure out which aspect of the todo item needs to be updated: its status, priority, or the todo itself.
    case requestBody.status !== undefined:
      updateColumn = 'Status'
      break
    case requestBody.priority !== undefined:
      updateColumn = 'Priority'
      break
    case requestBody.todo !== undefined:
      updateColumn = 'Todo'
      break
    case requestBody.category !== undefined:
      updateColumn = 'Category'
      break
    case requestBody.dueDate !== undefined:
      updateColumn = 'Due Date'
      break
  }
  const previousTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`
  const previousTodo = await db.get(previousTodoQuery)
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body

  const updateTodoQuery = `UPDATE todo SET todo='${todo}', priority='${priority}', status='${status}',category = '${category}', due_date = '${dueDate}' WHERE id = ${todoId};`
  await db.run(updateTodoQuery)
  response.send(`${updateColumn} Updated`)
})

//API6
app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteQuery = `
  delete from todo where id = ${todoId};`
  await db.run(deleteQuery)
  response.send('Todo Deleted')
})

module.exports = app
