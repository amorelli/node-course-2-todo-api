const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

var UserSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true,
		trim: true,
		minlength: 1,
		unique: true,
		validate: {
			validator: validator.isEmail,
			message: '{VALUE} is not a valid email.'
		}
	},
	password: {
		type: String,
		required: true,
		minlength: 6
	},
	tokens: [{
		access: {
			type: String,
			required: true
		},
		token: {
			type: String,
			required: true
		}
	}]
});

UserSchema.methods.toJSON = function () {
	var user = this;
	var userObject = user.toObject();

	return _.pick(userObject, ['_id', 'email']);
};

UserSchema.methods.generateAuthToken = function () {
	var user = this;
	var access = 'auth';
	var token = jwt.sign({_id: user._id.toHexString(), access}, process.env.JWT_SECRET).toString();

	user.tokens = user.tokens.concat([{access, token}]);

	return user.save().then(() => {
		return token;
	});
};

//Instance method
UserSchema.methods.removeToken = function (token) {
	var user = this;
	// $pull is a MongoDB operator, remove items from an array that match criteria
	// Pass in $pull as the user.update object. No user query required because we already have the user we are updating.
	// Pull from tokens array, any object that has a token property equal to the token argument passed in to the function
	// Entire token object is removed
	return user.update({
		$pull: {
			tokens: {token}
		}
	});
};
// Find user by token
UserSchema.statics.findByToken = function (token) {
	var User = this;
	var decoded;

	try {
		decoded = jwt.verify(token, process.env.JWT_SECRET);
	} catch (e) {
		//Breaks out of the function
		return Promise.reject();
	}

	return User.findOne({
		'_id': decoded._id,
		'tokens.token': token,
		'tokens.access': 'auth'
	});
};

UserSchema.pre('save', function (next) {
	var user = this;

	if (user.isModified('password')) {
		bcrypt.genSalt(10, (err, salt) => {
			bcrypt.hash(user.password, salt, (err, hash) => {
				user.password = hash;
				next();
			});
		});
	} else {
		next();
	}
});
// Model method, takes email and password, returning a Promise with user, or error if user didn't exist.
// Find user where email == email passed in.
UserSchema.statics.findByCredentials = function (email, password) {
	var User = this;
	// Find user with email property == to email variable
	// return to chain the promise, since there is a .then call and a .catch call in server.js POST /users/login
	return User.findOne({email}).then((user) => {
		// If no user, return rejected Promise
		if (!user) {
			return Promise.reject();
		}

		return new Promise((resolve, reject) => {
			bcrypt.compare(password, user.password, (err, res) => {
				if (res) {
					resolve(user);
				} else {
					reject();
				};
			});
		});
	});
};

// Mongoose User Model
var User = mongoose.model('User', UserSchema);

module.exports = {User};