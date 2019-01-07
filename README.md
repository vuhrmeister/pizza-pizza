# Pizza Pizza - API for pizza-delivery

You want pizza? You get pizza!

This is a demo application exposing an API for ordering pizza.

We don't use external libraries, just native node modules.
Therefore we simply use the file system for storing our data.

## Open Endpoints

Open endpoints require no Authentication.

* Register user: `POST /users`
* Login: `POST /login`

## Endpoints that require Authentication

Closed endpoints require a valid Token (`auth-token`) to be included in
the header of the request. A Token can be acquired from the login endpoint above.

### User

* Logout: `DELETE /logout`
* Show user data: `GET /users`
* Update user data: `PUT /users`
* Delete user: `DELETE /users`

### Menus

* List menus: `GET /menus`

### Cart

* Fill cart: `PUT /cart`

### Orders

* Place order: `POST /orders`

## Open TODOs

- Make URIs more RESTful: e.g. make the id (or email for the user) part of the url (`GET /users/my@email.de`) instead of using a query param.
- More extensive documentation
