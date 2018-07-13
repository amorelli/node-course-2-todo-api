var env = process.env.NODE_ENV || 'development';

if (env === 'development' || env === 'test') {
	var config = require('./config.json');
	// When using a variable to access a property, must use bracket notation
	var envConfig = config[env];
	// Object.keys takes an object and returns the keys in an array
	// Using forEach we will have a function that gets called with a key of PORT and a key of MONGODB_URI
	Object.keys(envConfig).forEach((key) => {
		// Bracket notation will make this process.env.PORT = envConfig.PORT, or process.env.MONGODB_URI = envConfig.MONGODB_URI, etc...
		process.env[key] = envConfig[key]
	});
}

// if (env === 'development') {
// 	process.env.PORT = 3000;
// 	process.env.MONGODB_URI = 'mongodb://localhost:27017/TodoApp';
// } else if (env === 'test') {
// 	process.env.PORT = 3000;
// 	process.env.MONGODB_URI = 'mongodb://localhost:27017/TodoAppTest';
// }