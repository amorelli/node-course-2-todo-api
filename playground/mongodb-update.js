// const MongoClient = require('mongodb').MongoClient;
const {MongoClient, ObjectID} = require('mongodb');

MongoClient.connect('mongodb://localhost:27017/TodoApp', (err, client) => {
	if (err) {
		return console.log('Could not connect to MongoDB server.');
	}
	console.log('Connected to MongoDB server.');
	const db = client.db('TodoApp');

	// Finds User by ID and updates name and increments age by 1
	db.collection('Users')
	.findOneAndUpdate(
	{ _id: new ObjectID('5b3a83ec6cc26f10cc1558b7') }, 
	{ $set:{ name: 'Adam'}, $inc:{ 'age': 1 } }, 
	{ returnOriginal: false })
	.then((res) => {
		console.log(res);
	});



	// client.close();
});