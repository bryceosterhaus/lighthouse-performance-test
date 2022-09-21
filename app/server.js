const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const fs = require('fs');
let ejs = require('ejs');

app.get('/', (req, res) => {
	const dataJson = require(path.join(__dirname, '/data/main.json'));

	fs.readFile(__dirname + '/index.ejs', 'utf-8', (err, html) => {
		res.send(
			ejs.render(html, {
				data: JSON.stringify(dataJson.raw),
				desktopScore: dataJson.latest.desktop,
				mobileScore: dataJson.latest.mobile,
			})
		);
	});
});

app.listen(port, () => {
	console.log(`App listening on port ${port}`);
});
