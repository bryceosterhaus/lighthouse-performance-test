const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const cron = require('node-cron');
const {exec} = require('child_process');

app.get('/', (req, res) => {
	const dataJson = require(path.join(__dirname, '..', '/data/main.json'));

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

	// Runs every hour
	cron.schedule('0 * * * *', () => {
		exec(
			'sh ' + path.join(__dirname, '../run.sh'),
			(error, stdout, stderr) => {
				console.log(stdout);
				console.log(stderr);
				if (error !== null) {
					console.log(`exec error: ${error}`);
				}
			}
		);
	});
});
