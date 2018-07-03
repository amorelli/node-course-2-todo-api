// const MongoClient = require('mongodb').MongoClient;
const {MongoClient, ObjectID} = require('mongodb');

MongoClient.connect('mongodb://localhost:27017/TodoApp', (err, client) => {
	if (err) {
		return console.log('Could not connect to MongoDB server.');
	}
	console.log('Connected to MongoDB server.');
	const db = client.db('TodoApp');

	// Delete Many
	db.collection('Users').deleteMany({name: 'Adam'}).then((res) => {
		console.log(res);
	});

	// Delete One
	// db.collection('Todos').deleteOne({text: 'Eat Lunch'}).then((res) => {
	// 	console.log(res);
	// });

	// Find One And Delete
	db.collection('Users').findOneAndDelete({
		_id: new ObjectID('5b3aae7ed5414529b056b9c6')
	}).then((res) => {
		console.log(JSON.stringify(res, undefined, 2));
	});

	// client.close();
});