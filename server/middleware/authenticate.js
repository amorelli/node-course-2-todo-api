var {User} = require('./../models/user');
/* It makes it private because it searches for a user in our database that matches the token sent in the request header. 
A user only receives a token once they've logged in, so if we find a token in our database that matches, 
we know the user is logged in and we can then proceed with sending them to the route handler. */
var authenticate = (req, res, next) => {
	var token = req.header('x-auth');

	User.findByToken(token).then((user) => {
		if (!user) {
			return Promise.reject();
		}
		//Store the user and their token
		req.user = user;
		req.token = token;
		next();
	}).catch((e) => {
		res.status(401).send();
	});
};

module.exports = {authenticate};