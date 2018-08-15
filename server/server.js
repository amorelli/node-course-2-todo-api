// C:\Program Files\MongoDB\Server\4.0\bin mongod.exe --dbpath C:\Users\Adam\mongo-data
var config = require('./config/config');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');

var {mongoose} = require('./db/mongoose');
var {Todo} = require('./models/todo');
var {User} = require('./models/user');
var {authenticate} = require('./middleware/authenticate');

var app = express();
const port = process.env.PORT;

app.use(bodyParser.json());

app.post('/todos', authenticate, (req, res) => {
	// Post a todo with the creator property, making the todo private
	var todo = new Todo({
		text: req.body.text,
		_creator: req.user._id
	});

	todo.save().then((doc) => {
		res.send(doc);
	}, (e) => {
		res.status(400).send(e);
	});
});

app.get('/todos', authenticate, (req, res) => {
	// Find all todos for the logged in user
	Todo.find({
		_creator: req.user._id
	}).then((todos) => {
		res.send({todos});
	}, (e) => {
		res.status(400).send(e);
	});
});

app.get('/todos/:id', authenticate, (req, res) => {
	var id = req.params.id;
	if (!ObjectID.isValid(id)) {
		return res.status(404).send();
	}

	Todo.findOne({
		_id: id, 
		_creator: req.user._id
	}).then((todo) => {
		if (!todo) {
			return res.status(404).send();
		}

		res.send({todo});
	}).catch((e) => res.status(400).send());
});

app.delete('/todos/:id', authenticate, async (req, res) => {
	const id = req.params.id;
	if (!ObjectID.isValid(id)) {
		return res.status(404).send();
	}
	try {
		const todo = await Todo.findOneAndRemove({
			_id: id,
			_creator: req.user._id
		});
		
		if (!todo) {
			return res.status(404).send();
		}

		res.send({todo});
	} catch (e) {
		res.status(400).send()
	}

});

app.patch('/todos/:id', authenticate, (req, res) => {
	var id = req.params.id;
	const body = _.pick(req.body, ['text', 'completed']);

	if (!ObjectID.isValid(id)) {
		return res.status(404).send();
	}

	if (_.isBoolean(body.completed) && body.completed) {
		body.completedAt = new Date().getTime();
	} else {
		body.completed = false;
		body.completedAt = null;
	}

	Todo.findOneAndUpdate({
		_id: id,
		_creator: req.user._id
	}, {$set: body}, {new: true}).then((todo) => {
		if (!todo) {
			return res.status(404).send();
		}

		res.send({todo});
			}).catch((e) => {
		res.status(400).send();
	});
});

app.post('/users', async (req, res) => {
	try {
		const body = _.pick(req.body, ['email', 'password']);
		const user = new User(body);
		await user.save();
		const token = await user.generateAuthToken();
		res.header('x-auth', token).send(user);
	} catch (e) {
		res.status(400).send(e);
	}
});

// Verify that a token is valid and linked to a user
app.get('/users/me', authenticate, (req, res) => {
	res.send(req.user);
});

app.post('/users/login', async (req, res) => {
	try {
		// Finds user based on email and password, if not, catches error.
		// Generate new auth token for user
		const body = _.pick(req.body, ['email', 'password']);
		const user = await User.findByCredentials(body.email, body.password);
		const token = await user.generateAuthToken();
		res.header('x-auth', token).send(user);
	} catch (e) {
		res.status(400).send();
	}
});

//Log out a user, requires authentication, remove token from tokens array
app.delete('/users/me/token', authenticate, async (req, res) => {
	try {
		// Instance method
		await req.user.removeToken(req.token);
		res.status(200).send();
	} catch (e) {
		res.status(400).send();
	}

});

app.listen(port, () => {
	console.log(`Started on port ${port}`);
});

module.exports = {app};