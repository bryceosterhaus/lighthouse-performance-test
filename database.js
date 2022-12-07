const fs = require('fs');
const path = require('path');

const databaseFilePath = path.join(__dirname, 'db.json');

let data = {
	build: {},
	lighthouse: {latest: {}, raw: {}},
};

if (!fs.existsSync(databaseFilePath)) {
	fs.writeFileSync(databaseFilePath, JSON.stringify(data));
}

const dataString = fs.readFileSync(databaseFilePath);

try {
	data = JSON.parse(dataString);
} catch (e) {
	console.log(e);
}

module.exports = {
	read() {
		const dataString = fs.readFileSync(databaseFilePath);

		try {
			data = JSON.parse(dataString);

			return data;
		} catch (e) {
			console.log(e);

			return data;
		}
	},
	write() {
		fs.writeFileSync(databaseFilePath, JSON.stringify(data));
	},
};
