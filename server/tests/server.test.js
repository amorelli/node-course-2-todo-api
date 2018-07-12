const expect = require('expect');
const request = require('supertest');
const {ObjectID} = require('mongodb');

const {app} = require('./../server');
const {Todo} = require('./../models/todo');
const {User} = require('./../models/user');
const {todos, populateTodos, users, populateUsers} = require('./seed/seed');

// Populate users and todos databases from seed.js
beforeEach(populateUsers);
beforeEach(populateTodos);

describe('POST /todos', () => {
	it('Should create a new Todo', (done) => {
		var text = 'Test todo text';

		request(app)
			.post('/todos')
			.send({text})
			.expect(200)
			.expect((res) => {
				expect(res.body.text).toBe(text);
			})
			.end((err, res) => {
				if (err) {
					return done(err);
				}

				Todo.find({text}).then((todos) => {
					expect(todos.length).toBe(1);
					expect(todos[0].text).toBe(text);
					done();
				}).catch((e) => done(e));
			});
	});

	it('Should not create todo with invalid body data', (done) => {
		request(app)
		.post('/todos')
		.send({})
		.expect(400)
		.end((err, res) => {
			if (err) {
				return done(err);
			}

			Todo.find().then((todos) => {
				expect(todos.length).toBe(2);
				done();
			}).catch((e) => done(e));
		});
	});
});

describe('GET /todos', () => {
	it('should get all todos', (done) => {
		request(app)
		.get('/todos')
		.expect(200)
		.expect((res) => {
			expect(res.body.todos.length).toBe(2);
		})
		.end(done);
	});
});

describe('GET /todos/:id', () => {
	it('should return todo doc', (done) => {
		request(app)
		.get(`/todos/${todos[0]._id.toHexString()}`)
		.expect(200)
		.expect((res) => {
			expect(res.body.todo.text).toBe(todos[0].text);
		})
		.end(done);
	});

	it('should return 404 if todo not found', (done) => {
		request(app)
		.get(`/todos/${new ObjectID().toHexString()}`)
		.expect(404)
		.end(done);
	});

	it('should return 404 for non-object IDs', (done) => {
		request(app)
		.get('/todos/123')
		.expect(404)
		.end(done);
	});
});

describe('DELETE /todos/:id', () => {
	it('should remove a todo', (done) => {
		var hexId = todos[1]._id.toHexString();

		request(app)
		.delete(`/todos/${hexId}`)
		.expect(200)
		.expect((res) => {
			expect(res.body.todo._id).toBe(hexId);
		})
		.end((err, res) => {
			if (err) {
				return done(err);
			}

			Todo.findById(hexId).then((todo) => {
				expect(todo).toBeFalsy();
				done();
			}).catch((e) => done(e));
		});
	});

	it('should return 404 if todo not found', (done) => {
		request(app)
		.delete(`/todos/${new ObjectID().toHexString()}`)
		.expect(404)
		.end(done);
	});

	it('should return 404 if object ID is invalid', (done) => {
		request(app)
		.delete('/todos/123')
		.expect(404)
		.end(done);
	});
});

describe('PATCH /todos/:id', () => {
	it('should update the todo', (done) => {
		var hexId = todos[0]._id.toHexString();
		var text = 'This should be the new text'
		
		request(app)
		.patch(`/todos/${hexId}`)
		.send({
			completed: true,
			text
		})
		.expect(200)
		.expect((res) => {
			expect(res.body.todo.text).toBe(text);
			expect(res.body.todo.completed).toBe(true);
			expect(typeof res.body.todo.completedAt).toBe('number');
		})
		.end(done);

	});

	it('should clear completedAt when todo is not completed', (done) => {
		var hexId = todos[1]._id.toHexString();
		var text = 'This should be the new text!!'
		
		request(app)
		.patch(`/todos/${hexId}`)
		.send({
			completed: false,
			text
		})
		.expect(200)
		.expect((res) => {
			expect(res.body.todo.text).toBe(text);
			expect(res.body.todo.completed).toBe(false);
			expect(res.body.todo.completedAt).toBeFalsy();
		})
		.end(done);
	});
});

// Tests for valid and invalid auth tokens to ensure private route is private
describe('GET /users/me', () => {
	// asynchronous test, uses the (done) callback function
	it('should return user if authenticated', (done) => {
		// make request from application using supertest
		request(app)
		.get('/users/me')
		// Sets a header, using the token value inside of first user from seed.js
		.set('x-auth', users[0].tokens[0].token)
		.expect(200)
		.expect((res) => {
			// Expect the id and email equals the appropriate id and email for the first user from seed.js
			expect(res.body._id).toBe(users[0]._id.toHexString());
			expect(res.body.email).toBe(users[0].email);
		}).end(done);
	});

	// Expect 401 Unauthorized status code if no user token is provided, also expect the body to be an empty object
	it('should return a 401 if not authenticated', (done) => {
		request(app)
		.get('/users/me')
		.expect(401)
		.expect((res) => {
			expect(res.body).toEqual({});
		}).end(done);
	});
});

describe('POST /users', () => {
	// Tests passing valid data that is not in use
	it('should create a user', (done) => {
		var email = 'example@example.com';
		var password = '123mnb!';

		request(app)
		.post('/users')
		.send({email, password})
		.expect(200)
		.expect((res) => {
			// Expect to get our auth token
			expect(res.headers['x-auth']).toBeTruthy();
			expect(res.body._id).toBeTruthy();
			expect(res.body.email).toBe(email);
			// Query thr database to check for errors,
		}).end((err) => {
			if (err) {
				return done(err);
			}
			// If no error, query database for user, check if email in db equals the email we set above
			User.findOne({email}).then((user) => {
				// Check if the user exists
				expect(user).toBeTruthy();
				// Check if the password was hashed (does not equal the password we set above)
				expect(user.password).not.toBe(password);
				done();
			}).catch((e) => done(e));
		});
	});
	// Tests invalid email, or password < 6 chars
	it('should return validation errors if request invalid', (done) => {
		var email = 'adam';
		var password = '';

		request(app)
		.post('/users')
		.send({email, password})
		.expect(400)
		.end(done);
	});
	// Tests if email is in use
	it('should not create user if email in use', (done) => {
		var email = users[0].email;
		var password = 'password123'

		request(app)
		.post('/users')
		.send({email, password})
		.expect(400)
		.end(done);
	});
});
// Sends request to login user from seed data
describe('POST /users/login', () => {
	it('should login user and return auth token', (done) => {
		request(app)
		.post('/users/login')
		.send({
			email: users[1].email,
			password: users[1].password
		})
		.expect(200)
		// Verify x-auth token sent back as header
		.expect((res) => {
			expect(res.headers['x-auth']).toBeTruthy();
		})
		// Async function to query database. 
		.end((err, res) => {
			if (err) {
				return done(err);
			}
			// Find user that we created a token for. Make sure x-auth token from this user was added to the tokens array.
			// Make sure the tokens object has the properties access and res.headers
			User.findById(users[1]._id).then((user) => {
				expect(user.tokens[0]).toMatchObject({
					access: 'auth',
					token: res.headers['x-auth']
				});
				done();
				// Catch error from the async test if expect call above is not equal. Throws a useful error message.
			}).catch((e) => done(e));
		});
	});

	it('should reject invalid login', (done) => {
		request(app)
		.post('/users/login')
		.send({
			email: users[1].email,
			password: users[1].password + '1'
		})
		.expect(400)
		// Verify x-auth token sent back as header
		.expect((res) => {
			expect(res.headers['x-auth']).toBeFalsy();
		})
		// Async function to query database. 
		.end((err, res) => {
			if (err) {
				return done(err);
			}
			// Find user that we created a token for. Make sure x-auth token from this user was added to the tokens array.
			// Make sure the tokens object has the properties access and res.headers
			User.findById(users[1]._id).then((user) => {
				expect(user.tokens.length).toBe(0);
				done();
				// Catch error from the async test if expect call above is not equal. Throws a useful error message.
			}).catch((e) => done(e));
		});
	});
});

describe('DELETE /users/me/token', () => {
	it('should remove auth token on logout', (done) => {
		request(app)
		.delete('/users/me/token')
		// Sets x-auth equal to token value from seed.js
		.set('x-auth', users[0].tokens[0].token)
		.expect(200)
		.end((err, res) => {
			if (err) {
				return done(err);
			}

			User.findById(users[0]._id).then((user) => {
				expect(user.tokens.length).toBe(0);
				done();
			}).catch((e) => done(e));
		});

	});
});