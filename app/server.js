const express = require('express');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const cron = require('node-cron');
const {spawn} = require('child_process');
const serveIndex = require('serve-index');

const port = 3000;
const app = express();
const dataDir = path.join(__dirname, '..', 'data');

app.use(
	'/files',
	express.static(path.join(__dirname, '..')),
	serveIndex(path.join(__dirname, '..'), {icons: true})
);

app.get('/', (req, res) => {
	const dataJson = require(path.join(dataDir, 'main.json'));

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

	run_script('sh', ['./run.sh']);

	// Runs every 12 hours, midnight and noon
	cron.schedule('0 */12 * * *', () => {
		run_script('sh', ['./run.sh']);
	});
});

function run_script(command, args, callback) {
	const child = spawn(command, args);

	child.stdout.setEncoding('utf8');
	child.stdout.on('data', function (data) {
		console.log(data);
	});

	child.stderr.setEncoding('utf8');
	child.stderr.on('data', function (data) {
		console.log(data);
	});

	child.on('close', function (data) {
		console.log('Exit Code: ' + data);
	});
}
